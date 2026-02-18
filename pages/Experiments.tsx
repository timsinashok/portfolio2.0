import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { RoboticArm } from '../components/RoboticArm';
import { Point } from '../types';

type Policy = 'pg' | 'ppo';
type EpisodeResult = 'goal' | 'miss';
type RewardPoint = { reward: number; result: EpisodeResult };
type FrameState = {
  ball: { x: number; y: number; vx: number; vy: number };
  effector: { x: number; y: number };
  goal: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
};
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
const ACTION_SCALE = 160;
const STEP_PENALTY = -0.003;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const normalSample = (std: number) => {
  const u = Math.max(Math.random(), 1e-6);
  const v = Math.max(Math.random(), 1e-6);
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std;
};

const dot = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0);

const createWeights = () => ({
  w1: Array.from({ length: STATE_SIZE }, () => (Math.random() - 0.5) * 0.02),
  w2: Array.from({ length: STATE_SIZE }, () => (Math.random() - 0.5) * 0.02),
  b1: 0,
  b2: 0,
});

export const Experiments: React.FC = () => {
  const { isDark } = useOutletContext<{ isDark: boolean }>();
  const [policy, setPolicy] = useState<Policy>('pg');
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [episodes, setEpisodes] = useState(0);
  const [goals, setGoals] = useState(0);
  const [misses, setMisses] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<RewardPoint[]>([]);
  const [target, setTarget] = useState<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const frameStateRef = useRef<FrameState | null>(null);
  const currentTargetRef = useRef<Point>(target);
  const rafRef = useRef<number | null>(null);
  const resetTokenRef = useRef(0);
  const trajectoryRef = useRef<StepRecord[]>([]);
  const weightsRef = useRef(createWeights());
  const stdRef = useRef({ pg: 60, ppo: 30 });
  const policyStepRef = useRef(0);

  useEffect(() => {
    currentTargetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = () => {
      const frame = frameStateRef.current;
      if (frame) {
        const { width, height } = frame.viewport;
        const state = buildState(frame);
        const { action, logProb } = sampleAction(state, policy);

        const next = {
          x: clamp(currentTargetRef.current.x + action[0], 0, width),
          y: clamp(currentTargetRef.current.y + action[1], 0, height),
        };
        currentTargetRef.current = next;
        setTarget(next);

        const shapedReward = computeStepReward(frame) + STEP_PENALTY;
        trajectoryRef.current.push({
          state,
          action,
          logProb,
          reward: shapedReward,
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning, policy]);

  const policyMeta = useMemo(() => policyCopy[policy], [policy]);
  const successRate = episodes > 0 ? Math.round((goals / episodes) * 100) : 0;
  const maxHistory = 24;

  const startTraining = () => {
    resetTokenRef.current += 1;
    setScore(0);
    setEpisodes(0);
    setGoals(0);
    setMisses(0);
    setRewardHistory([]);
    trajectoryRef.current = [];
    weightsRef.current = createWeights();
    policyStepRef.current = 0;
    setIsRunning(true);
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

  const buildState = (frame: FrameState) => {
    const { width, height } = frame.viewport;
    const goalCenterX = frame.goal.x + frame.goal.width / 2;
    const goalCenterY = frame.goal.y + frame.goal.height / 2;
    const bx = (frame.ball.x - width / 2) / width;
    const by = (frame.ball.y - height / 2) / height;
    const bvx = frame.ball.vx / 20;
    const bvy = frame.ball.vy / 20;
    const gx = (goalCenterX - frame.ball.x) / width;
    const gy = (goalCenterY - frame.ball.y) / height;
    const ex = (frame.effector.x - frame.ball.x) / width;
    const ey = (frame.effector.y - frame.ball.y) / height;
    return [bx, by, bvx, bvy, gx, gy, ex, ey];
  };

  const computeStepReward = (frame: FrameState) => {
    const goalCenterX = frame.goal.x + frame.goal.width / 2;
    const goalCenterY = frame.goal.y + frame.goal.height / 2;
    const dx = frame.ball.x - goalCenterX;
    const dy = frame.ball.y - goalCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const closeness = 1 / (1 + dist / 200);
    return closeness * 0.02;
  };

  const sampleAction = (state: number[], mode: Policy) => {
    const weights = weightsRef.current;
    const meanX = dot(weights.w1, state) + weights.b1;
    const meanY = dot(weights.w2, state) + weights.b2;
    const std = stdRef.current[mode];
    const ax = meanX + normalSample(std);
    const ay = meanY + normalSample(std);
    const action: [number, number] = [Math.tanh(ax) * ACTION_SCALE, Math.tanh(ay) * ACTION_SCALE];
    const logProb = gaussianLogProb([ax, ay], [meanX, meanY], std);
    return { action, logProb };
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
    const gamma = 0.98;
    for (let i = traj.length - 1; i >= 0; i -= 1) {
      G = traj[i].reward + gamma * G;
      returns[i] = G;
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance) || 1;

    const weights = weightsRef.current;
    const lr = policy === 'pg' ? 0.0025 : 0.0015;
    const clip = 0.2;

    for (let i = 0; i < traj.length; i += 1) {
      const adv = (returns[i] - mean) / std;
      const state = traj[i].state;
      const action = traj[i].action;
      const oldLogProb = traj[i].logProb;

      const meanX = dot(weights.w1, state) + weights.b1;
      const meanY = dot(weights.w2, state) + weights.b2;
      const stdAction = stdRef.current[policy];
      const newLogProb = gaussianLogProb(action, [meanX, meanY], stdAction);
      const ratio = Math.exp(newLogProb - oldLogProb);
      const clipped = clamp(ratio, 1 - clip, 1 + clip);
      const weight = policy === 'ppo' ? Math.min(ratio, clipped) : ratio;

      const gradScale = lr * adv * weight;
      const invVar = 1 / (stdAction * stdAction);
      const dx = (action[0] - meanX) * invVar;
      const dy = (action[1] - meanY) * invVar;

      for (let j = 0; j < STATE_SIZE; j += 1) {
        weights.w1[j] += gradScale * dx * state[j];
        weights.w2[j] += gradScale * dy * state[j];
      }
      weights.b1 += gradScale * dx;
      weights.b2 += gradScale * dy;
    }

    trajectoryRef.current = [];
    policyStepRef.current += 1;
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      tabIndex={0}
    >
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
        </motion.div>
      </div>

      <RoboticArm
        isActive={isRunning}
        target={target}
        isDark={isDark}
        onScoreUpdate={setScore}
        onFrameState={state => {
          frameStateRef.current = state;
        }}
        onEpisodeEnd={handleEpisodeEnd}
        autoStart={isRunning}
        showStartButton={false}
        resetScoreToken={resetTokenRef.current}
      />
    </div>
  );
};
