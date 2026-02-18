import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { RoboticArm, PhysicsState, SimulationControl } from '../components/RoboticArm';

type Policy = 'pg' | 'ppo';
type EpisodeResult = 'goal' | 'miss';
type RewardPoint = { reward: number; result: EpisodeResult };
type StepRecord = {
  state: number[];
  action: [number, number];
  logProb: number;
  reward: number;
};

const policyCopy: Record<Policy, { title: string; detail: string }> = {
  pg: {
    title: 'Policy Gradient (Noisy)',
    detail: 'Higher variance updates with exploratory noise. Learning is unstable but can find solutions.',
  },
  ppo: {
    title: 'Proximal Policy Optimization',
    detail: 'Clipped updates for stability. Learns smoother behavior with fewer catastrophic jumps.',
  },
};

const STATE_SIZE = 8;
const HIDDEN_SIZE = 16;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const normalSample = (std: number) => {
  const u = Math.max(Math.random(), 1e-6);
  const v = Math.max(Math.random(), 1e-6);
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std;
};

const dot = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0);

const createWeights = () => ({
  w1: Array.from({ length: HIDDEN_SIZE * STATE_SIZE }, () => (Math.random() - 0.5) * 0.1),
  b1: new Float32Array(HIDDEN_SIZE).fill(0),
  w2: Array.from({ length: 2 * HIDDEN_SIZE }, () => (Math.random() - 0.5) * 0.1),
  b2: new Float32Array(2).fill(0),
});

export const Experiments: React.FC = () => {
  const { isDark } = useOutletContext<{ isDark: boolean }>();
  const [policy, setPolicy] = useState<Policy>('pg');
  const [isRunning, setIsRunning] = useState(false);
  const [episodes, setEpisodes] = useState(0);
  const [goals, setGoals] = useState(0);
  const [misses, setMisses] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<RewardPoint[]>([]);
  const [speed, setSpeed] = useState(1);
  const simControlRef = useRef<SimulationControl | null>(null);
  const trajectoryRef = useRef<StepRecord[]>([]);
  const weightsRef = useRef(createWeights());
  const stdRef = useRef(0.4);
  const baselineRef = useRef(0);

  const policyMeta = useMemo(() => policyCopy[policy], [policy]);
  const successRate = episodes > 0 ? Math.round((goals / episodes) * 100) : 0;
  const maxHistory = 24;

  const startTraining = () => {
    setEpisodes(0);
    setGoals(0);
    setMisses(0);
    setRewardHistory([]);
    trajectoryRef.current = [];
    weightsRef.current = createWeights();
    baselineRef.current = 0;
    setIsRunning(true);
    simControlRef.current?.reset();
  };

  const handleEpisodeEnd = (result: EpisodeResult) => {
    if (!isRunning) return;
    const reward = result === 'goal' ? 1 : -1;
    setEpisodes(prev => prev + 1);
    setGoals(prev => (result === 'goal' ? prev + 1 : prev));
    setMisses(prev => (result === 'miss' ? prev + 1 : prev));
    setRewardHistory(prev => {
      const next = [...prev, { reward, result }];
      return next.slice(-maxHistory);
    });
    finishEpisode(result);
  };

  const buildState = (frame: PhysicsState) => {
    const { width, height } = frame.viewport;
    return [
      (frame.ball.x - width / 2) / width,
      (frame.ball.y - height / 2) / height,
      frame.ball.vx / 20,
      frame.ball.vy / 20,
      (frame.goal.x + frame.goal.width / 2 - width / 2) / width,
      (frame.goal.y + frame.goal.height / 2 - height / 2) / height,
      (frame.effector.x - width / 2) / width,
      (frame.effector.y - height / 2) / height,
    ];
  };

  const computeStepReward = (frame: PhysicsState) => {
    const dx = frame.ball.x - frame.effector.x;
    const dy = frame.ball.y - frame.effector.y;
    const distToBall = Math.sqrt(dx * dx + dy * dy);
    const goalCenterX = frame.goal.x + frame.goal.width / 2;
    const goalCenterY = frame.goal.y + frame.goal.height / 2;
    const distToGoal = Math.sqrt((frame.ball.x - goalCenterX) ** 2 + (frame.ball.y - goalCenterY) ** 2);
    const reachReward = -distToBall / frame.viewport.width;
    const goalReward = -distToGoal / frame.viewport.width;
    return reachReward * 0.1 + goalReward * 0.05;
  };

  const sampleAction = (state: number[], mode: Policy) => {
    const weights = weightsRef.current;
    const hidden = new Float32Array(HIDDEN_SIZE);
    for (let i = 0; i < HIDDEN_SIZE; i += 1) {
      let sum = weights.b1[i];
      for (let j = 0; j < STATE_SIZE; j += 1) {
        sum += state[j] * weights.w1[i * STATE_SIZE + j];
      }
      hidden[i] = Math.tanh(sum);
    }

    const mean = [0, 0];
    for (let i = 0; i < 2; i += 1) {
      let sum = weights.b2[i];
      for (let j = 0; j < HIDDEN_SIZE; j += 1) {
        sum += hidden[j] * weights.w2[i * HIDDEN_SIZE + j];
      }
      mean[i] = sum;
    }

    const std = stdRef.current;
    const ax = mean[0] + normalSample(std);
    const ay = mean[1] + normalSample(std);
    const logProb = gaussianLogProb([ax, ay], [mean[0], mean[1]], std);
    return { action: [ax, ay] as [number, number], logProb, hidden };
  };

  const gaussianLogProb = (action: [number, number], mean: [number, number], std: number) => {
    const var2 = std * std * 2;
    const dx = action[0] - mean[0];
    const dy = action[1] - mean[1];
    return -((dx * dx + dy * dy) / var2) - Math.log(std * std * 2 * Math.PI);
  };

  const finishEpisode = (result: EpisodeResult) => {
    const traj = trajectoryRef.current;
    if (traj.length === 0) return;
    const finalReward = result === 'goal' ? 1 : -1;
    traj[traj.length - 1].reward += finalReward;

    const returns: number[] = [];
    let G = 0;
    const gamma = 0.99;
    for (let i = traj.length - 1; i >= 0; i -= 1) {
      G = traj[i].reward + gamma * G;
      returns[i] = G;
    }

    const episodeReturn = returns[0] || 0;
    baselineRef.current = 0.95 * baselineRef.current + 0.05 * episodeReturn;
    const advantages = returns.map(ret => ret - baselineRef.current);

    const weights = weightsRef.current;
    const lr = 0.005;
    const clip = 0.2;
    const epochs = policy === 'ppo' ? 4 : 1;

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      for (let i = 0; i < traj.length; i += 1) {
        const adv = advantages[i];
        const state = traj[i].state;
        const action = traj[i].action;
        const oldLogProb = traj[i].logProb;

        const hidden = new Float32Array(HIDDEN_SIZE);
        for (let h = 0; h < HIDDEN_SIZE; h += 1) {
          let sum = weights.b1[h];
          for (let j = 0; j < STATE_SIZE; j += 1) {
            sum += state[j] * weights.w1[h * STATE_SIZE + j];
          }
          hidden[h] = Math.tanh(sum);
        }

        const mean = [0, 0];
        for (let out = 0; out < 2; out += 1) {
          let sum = weights.b2[out];
          for (let j = 0; j < HIDDEN_SIZE; j += 1) {
            sum += hidden[j] * weights.w2[out * HIDDEN_SIZE + j];
          }
          mean[out] = sum;
        }

        const stdAction = stdRef.current;
        const newLogProb = gaussianLogProb(action, [mean[0], mean[1]], stdAction);
        const ratio = Math.exp(newLogProb - oldLogProb);
        const clipped = clamp(ratio, 1 - clip, 1 + clip);
        const useUpdate = policy === 'pg' || ratio * adv < clipped * adv;
        if (!useUpdate) continue;

        const gradMult = lr * adv * ratio;
        const invVar = 1 / (stdAction * stdAction);
        const dMean = [
          gradMult * (action[0] - mean[0]) * invVar,
          gradMult * (action[1] - mean[1]) * invVar,
        ];

        for (let out = 0; out < 2; out += 1) {
          weights.b2[out] += dMean[out];
          for (let j = 0; j < HIDDEN_SIZE; j += 1) {
            const idx = out * HIDDEN_SIZE + j;
            weights.w2[idx] += dMean[out] * hidden[j];
            const dHidden = dMean[out] * weights.w2[idx] * (1 - hidden[j] * hidden[j]);
            weights.b1[j] += dHidden;
            for (let k = 0; k < STATE_SIZE; k += 1) {
              weights.w1[j * STATE_SIZE + k] += dHidden * state[k];
            }
          }
        }
      }
    }

    trajectoryRef.current = [];
    stdRef.current = Math.max(0.05, stdRef.current * 0.995);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" tabIndex={0}>
      <div className="absolute top-24 left-6 md:left-12 z-30 w-[min(520px,calc(100%-3rem))]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-200 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/70 backdrop-blur-sm p-6 md:p-8 shadow-sm"
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-sm font-mono text-zinc-500">Playground</div>
              <h1 className="text-2xl md:text-3xl font-medium text-zinc-900 dark:text-zinc-100">
                RL Policy Sandbox
              </h1>
            </div>
            <div className="text-sm font-mono text-zinc-500">Episodes: {episodes.toString().padStart(3, '0')}</div>
          </div>

          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Switch between Policy Gradient and PPO. The controllers are tuned to demonstrate stability differences
            and learning variance in a compact continuous-control environment.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {(['pg', 'ppo'] as Policy[]).map(item => (
              <button
                key={item}
                onClick={() => setPolicy(item)}
                className={`px-4 py-2 text-sm font-mono border transition-colors ${
                  policy === item
                    ? 'border-accent-500 text-accent-600 dark:text-accent-500'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {item === 'human' ? 'Human' : item === 'pg' ? 'Policy Gradient' : 'PPO'}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => (isRunning ? setIsRunning(false) : startTraining())}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                isRunning
                  ? 'border-accent-500 text-accent-600 dark:text-accent-500'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {isRunning ? 'Stop Policy' : 'Start Policy'}
            </button>
            <div className="text-xs text-zinc-500">
              {policyMeta.title}
            </div>
          </div>

          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{policyMeta.detail}</div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-xs font-mono text-zinc-500">
            <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              Goals: <span className="text-zinc-900 dark:text-zinc-100">{goals.toString().padStart(2, '0')}</span>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              Misses: <span className="text-zinc-900 dark:text-zinc-100">{misses.toString().padStart(2, '0')}</span>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              Success: <span className="text-zinc-900 dark:text-zinc-100">{successRate}%</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-mono text-zinc-500 mb-2">Episode Rewards</div>
            <div className="grid grid-cols-12 gap-1 items-end h-16">
              {Array.from({ length: maxHistory }).map((_, index) => {
                const point = rewardHistory[index];
                const isGoal = point?.result === 'goal';
                const height = point ? (isGoal ? '100%' : '35%') : '15%';
                const color = point
                  ? isGoal
                    ? 'bg-accent-500'
                    : 'bg-zinc-400 dark:bg-zinc-600'
                  : 'bg-zinc-200 dark:bg-zinc-800';
                return <div key={index} className={`w-full ${color}`} style={{ height }} />;
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-mono text-zinc-500 mb-2">Simulation Speed: {speed}x</div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={speed}
              onChange={event => setSpeed(Number(event.target.value))}
              className="w-full accent-accent-500"
            />
          </div>
        </motion.div>
      </div>

      <RoboticArm
        isDark={isDark}
        isRunning={isRunning}
        simulationSpeed={speed}
        onGetAction={state => {
          const rlState = buildState(state);
          const { action, logProb } = sampleAction(rlState, policy);
          const stepReward = computeStepReward(state);
          trajectoryRef.current.push({
            state: rlState,
            action,
            logProb,
            reward: stepReward,
            value: 0,
          });
          return { dx: Math.tanh(action[0]) * 15, dy: Math.tanh(action[1]) * 15 };
        }}
        onEpisodeEnd={handleEpisodeEnd}
        controlRef={simControlRef}
      />
    </div>
  );
};
