import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { RoboticArm, PhysicsState, SimulationControl } from '../components/RoboticArm';
import { Point } from '../types';

type Policy = 'pg' | 'ppo';
type EpisodeResult = 'goal' | 'miss';
type RewardPoint = { reward: number; result: EpisodeResult };

// Helper Math
const dot = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const STATE_SIZE = 8; // [ballX, ballY, ballVX, ballVY, goalX, goalY, effX, effY]
const HIDDEN_SIZE = 16; 

// Simple 1-hidden layer generic weights
const createWeights = () => ({
  w1: Array.from({ length: HIDDEN_SIZE * STATE_SIZE }, () => (Math.random() - 0.5) * 0.1),
  b1: new Float32Array(HIDDEN_SIZE).fill(0),
  w2: Array.from({ length: 2 * HIDDEN_SIZE }, () => (Math.random() - 0.5) * 0.1),
  b2: new Float32Array(2).fill(0),
});

type StepRecord = {
  state: number[];
  action: [number, number];
  logProb: number;
  reward: number;
  value: number; // For baseline
};

export const Experiments: React.FC = () => {
  const { isDark } = useOutletContext<{ isDark: boolean }>();
  const [policy, setPolicy] = useState<Policy>('ppo');
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x to 50x
  
  // Stats
  const [episodes, setEpisodes] = useState(0);
  const [goals, setGoals] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<RewardPoint[]>([]);

  // Agent State
  const weightsRef = useRef(createWeights());
  const trajectoryRef = useRef<StepRecord[]>([]);
  const baselineRef = useRef(0); // Simple moving average baseline
  const stdRef = useRef(0.4); // Action standard deviation

  // Control Ref to talk to Physics Engine
  const simControlRef = useRef<SimulationControl | null>(null);

  const startTraining = () => {
    weightsRef.current = createWeights();
    trajectoryRef.current = [];
    setEpisodes(0);
    setGoals(0);
    setRewardHistory([]);
    setIsRunning(true);
    simControlRef.current?.reset();
  };

  // --- The Brain ---
  
  const forward = (state: number[], weights: any) => {
    // Layer 1 (Tanh)
    const h = new Float32Array(HIDDEN_SIZE);
    for (let i = 0; i < HIDDEN_SIZE; i++) {
      let sum = weights.b1[i];
      for (let j = 0; j < STATE_SIZE; j++) {
        sum += state[j] * weights.w1[i * STATE_SIZE + j];
      }
      h[i] = Math.tanh(sum);
    }

    // Layer 2 (Linear Output for Mean)
    const out = [0, 0];
    for (let i = 0; i < 2; i++) {
      let sum = weights.b2[i];
      for (let j = 0; j < HIDDEN_SIZE; j++) {
        sum += h[j] * weights.w2[i * HIDDEN_SIZE + j];
      }
      out[i] = sum;
    }
    return { mean: out, hidden: h }; // Return hidden if we wanted a critic later
  };

  const getAction = (physState: PhysicsState): { dx: number; dy: number } => {
    // 1. Build State (Normalize!)
    const { width, height } = physState.viewport;
    const s = [
      (physState.ball.x - width/2) / width,
      (physState.ball.y - height/2) / height,
      physState.ball.vx / 20,
      physState.ball.vy / 20,
      (physState.goal.x + physState.goal.width/2 - width/2) / width,
      (physState.goal.y + physState.goal.height/2 - height/2) / height,
      (physState.effector.x - width/2) / width,
      (physState.effector.y - height/2) / height
    ];

    // 2. Forward Pass
    const { mean } = forward(s, weightsRef.current);

    // 3. Sample
    const std = stdRef.current;
    const noise = [normalSample(), normalSample()];
    const action = [
      mean[0] + noise[0] * std,
      mean[1] + noise[1] * std
    ] as [number, number];

    // 4. Calc LogProb
    const logProb = -0.5 * (
      Math.pow((action[0] - mean[0]) / std, 2) + 
      Math.pow((action[1] - mean[1]) / std, 2)
    ) - Math.log(2 * Math.PI * std * std);

    // 5. Calculate Shaping Reward (Dense)
    // Reward for effector getting closer to ball
    const dx = physState.ball.x - physState.effector.x;
    const dy = physState.ball.y - physState.effector.y;
    const distToBall = Math.sqrt(dx*dx + dy*dy);
    const reachReward = -distToBall / width; // Penalty for being far

    // Reward for ball being near goal (only if hit)
    const goalCx = physState.goal.x + physState.goal.width/2;
    const goalCy = physState.goal.y + physState.goal.height/2;
    const distToGoal = Math.sqrt(Math.pow(physState.ball.x - goalCx, 2) + Math.pow(physState.ball.y - goalCy, 2));
    const goalReward = -distToGoal / width;

    // Combine
    const stepReward = (reachReward * 0.1) + (goalReward * 0.05);

    // Store step
    trajectoryRef.current.push({
      state: s,
      action: action,
      logProb,
      reward: stepReward, // Will add terminal reward later
      value: 0
    });

    // Scale output to actual movement pixels
    return { dx: Math.tanh(action[0]) * 15, dy: Math.tanh(action[1]) * 15 };
  };

  const onEpisodeEnd = (result: EpisodeResult) => {
    if (!isRunning) return;

    // 1. Terminal Reward
    const finalReward = result === 'goal' ? 2.0 : -1.0;
    const traj = trajectoryRef.current;
    if (traj.length > 0) {
      traj[traj.length - 1].reward += finalReward;
    }

    // 2. Update Stats
    setEpisodes(p => p + 1);
    if (result === 'goal') setGoals(p => p + 1);
    setRewardHistory(prev => [...prev.slice(-49), { reward: finalReward, result }]);

    // 3. Train
    trainAgent();
    
    // 4. Decay exploration noise
    stdRef.current = Math.max(0.05, stdRef.current * 0.995);
  };

  const trainAgent = () => {
    const traj = trajectoryRef.current;
    const weights = weightsRef.current;
    const gamma = 0.99;
    
    // Compute Returns (Monte Carlo)
    const returns = new Array(traj.length).fill(0);
    let G = 0;
    for (let i = traj.length - 1; i >= 0; i--) {
      G = traj[i].reward + gamma * G;
      returns[i] = G;
    }

    // Update Baseline (Moving Average)
    const epReturn = returns[0] || 0;
    baselineRef.current = 0.95 * baselineRef.current + 0.05 * epReturn;

    // Advantages
    const advantages = returns.map(ret => ret - baselineRef.current); // Simple baseline subtraction
    
    // PPO Hyperparams
    const epochs = 4;
    const lr = 0.005;
    const clip = 0.2;

    for (let e = 0; e < epochs; e++) {
      for (let t = 0; t < traj.length; t++) {
        const { state, action, logProb: oldLogProb } = traj[t];
        const adv = advantages[t];

        // Re-run forward
        const { mean, hidden } = forward(state, weights);
        const std = stdRef.current;
        
        // New LogProb
        const newLogProb = -0.5 * (
            Math.pow((action[0] - mean[0]) / std, 2) + 
            Math.pow((action[1] - mean[1]) / std, 2)
        ) - Math.log(2 * Math.PI * std * std);

        const ratio = Math.exp(newLogProb - oldLogProb);
        
        // PPO Loss Gradient approximation
        const surr1 = ratio * adv;
        const surr2 = clamp(ratio, 1 - clip, 1 + clip) * adv;
        
        // If surr1 is limiting, we take gradient of ratio. If surr2 is limiting (clipped), grad is 0.
        // Simplified gradient descent (Backprop):
        if (policy === 'pg' || surr1 < surr2) { // PG or PPO unclipped region
          const gradMult = lr * adv * ratio; // (Standard PG gradient scaled)
          
          // Backprop Output Layer
          const dMean = [
             gradMult * (action[0] - mean[0]) / (std*std),
             gradMult * (action[1] - mean[1]) / (std*std)
          ];

          for (let i = 0; i < 2; i++) {
             weights.b2[i] += dMean[i];
             for (let j = 0; j < HIDDEN_SIZE; j++) {
               weights.w2[i * HIDDEN_SIZE + j] += dMean[i] * hidden[j];
               // Backprop Hidden
               const dHidden = dMean[i] * weights.w2[i * HIDDEN_SIZE + j] * (1 - hidden[j] * hidden[j]);
               weights.b1[j] += dHidden;
               for (let k = 0; k < STATE_SIZE; k++) {
                 weights.w1[j * STATE_SIZE + k] += dHidden * state[k];
               }
             }
          }
        }
      }
    }

    trajectoryRef.current = [];
  };

  const normalSample = () => {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  return (
    <div className="relative w-full h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <div className="absolute top-4 left-4 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl w-80">
        <h1 className="font-bold text-zinc-800 dark:text-zinc-100 mb-2">RL Training Rig</h1>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => isRunning ? setIsRunning(false) : startTraining()}
              className={`flex-1 py-2 px-4 rounded text-sm font-bold ${isRunning ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}
            >
              {isRunning ? 'Stop' : 'Start Training'}
            </button>
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-mono block mb-1">SIMULATION SPEED: {speed}x</label>
            <input 
              type="range" min="1" max="50" step="1" 
              value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
              <div className="text-zinc-500">EPISODES</div>
              <div className="text-lg">{episodes}</div>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
              <div className="text-zinc-500">GOAL RATE</div>
              <div className="text-lg">{episodes > 0 ? Math.round((goals/episodes)*100) : 0}%</div>
            </div>
          </div>
          
          <div className="h-12 flex items-end gap-[1px]">
            {rewardHistory.map((h, i) => (
               <div key={i} className={`flex-1 ${h.result === 'goal' ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ height: h.result === 'goal' ? '100%' : '20%' }} />
            ))}
          </div>
        </div>
      </div>

      <RoboticArm 
        isDark={isDark}
        isRunning={isRunning}
        simulationSpeed={speed}
        onGetAction={getAction}
        onEpisodeEnd={onEpisodeEnd}
        controlRef={simControlRef}
      />
    </div>
  );
};