import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  value: number;
};

const policyCopy: Record<Policy, { title: string; detail: string }> = {
  pg: {
    title: 'Policy Gradient (Noisy)',
    detail: 'Higher variance updates with exploratory noise. Learning is unstable but can find solutions.',
  },
  ppo: {
    title: 'Proximal Policy Optimization',
    detail: 'Clipped updates for stability. Learns smoother behaviour with fewer catastrophic jumps.',
  },
};

// ─── Network architecture: 8 → 64 → 64 → 2 ───────────────────────────────────
const STATE_SIZE = 8;
const HIDDEN1 = 64;
const HIDDEN2 = 64;
const OUTPUT_SIZE = 2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const normalSample = (std: number) => {
  const u = Math.max(Math.random(), 1e-10);
  const v = Math.max(Math.random(), 1e-10);
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std;
};

// Xavier init (better default for tanh)
const xavierInit = (fanIn: number, size: number): number[] =>
  Array.from({ length: size }, () => (Math.random() - 0.5) * Math.sqrt(6 / fanIn));

const createWeights = () => ({
  w1: xavierInit(STATE_SIZE, HIDDEN1 * STATE_SIZE), // 8  → 64
  b1: new Float32Array(HIDDEN1).fill(0),
  w2: xavierInit(HIDDEN1, HIDDEN2 * HIDDEN1), // 64 → 64
  b2: new Float32Array(HIDDEN2).fill(0),
  w3: xavierInit(HIDDEN2, OUTPUT_SIZE * HIDDEN2), // 64 → 2
  b3: new Float32Array(OUTPUT_SIZE).fill(0),
});

// ─── Adam state — mirrors every weight array, all zeros ───────────────────────
const createAdamState = () => ({
  mw1: new Float32Array(HIDDEN1 * STATE_SIZE).fill(0),
  mb1: new Float32Array(HIDDEN1).fill(0),
  mw2: new Float32Array(HIDDEN2 * HIDDEN1).fill(0),
  mb2: new Float32Array(HIDDEN2).fill(0),
  mw3: new Float32Array(OUTPUT_SIZE * HIDDEN2).fill(0),
  mb3: new Float32Array(OUTPUT_SIZE).fill(0),
  vw1: new Float32Array(HIDDEN1 * STATE_SIZE).fill(0),
  vb1: new Float32Array(HIDDEN1).fill(0),
  vw2: new Float32Array(HIDDEN2 * HIDDEN1).fill(0),
  vb2: new Float32Array(HIDDEN2).fill(0),
  vw3: new Float32Array(OUTPUT_SIZE * HIDDEN2).fill(0),
  vb3: new Float32Array(OUTPUT_SIZE).fill(0),
  t: 0,
});

const BETA1 = 0.9;
const BETA2 = 0.999;
const EPS = 1e-8;

/** One Adam step on a single parameter array. Mutates weights in-place. */
const adamStep = (
  weights: number[] | Float32Array,
  grads: Float32Array,
  m: Float32Array,
  v: Float32Array,
  lr: number,
  t: number
) => {
  const bc1 = 1 - Math.pow(BETA1, t);
  const bc2 = 1 - Math.pow(BETA2, t);
  for (let i = 0; i < weights.length; i++) {
    m[i] = BETA1 * m[i] + (1 - BETA1) * grads[i];
    v[i] = BETA2 * v[i] + (1 - BETA2) * grads[i] * grads[i];
    // works for both number[] and Float32Array
    (weights as any)[i] += lr * (m[i] / bc1) / (Math.sqrt(v[i] / bc2) + EPS);
  }
};

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
  const batchTrajRef = useRef<StepRecord[][]>([]);
  const weightsRef = useRef(createWeights());
  const adamRef = useRef(createAdamState());
  const stdRef = useRef(0.6);
  const baselineRef = useRef(0);
  const batchEpisodesRef = useRef(0);

  // Ref-mirror of policy state to avoid stale closures inside finishEpisode
  const policyRef = useRef<Policy>(policy);
  useEffect(() => {
    policyRef.current = policy;
  }, [policy]);

  const policyMeta = useMemo(() => policyCopy[policy], [policy]);
  const successRate = episodes > 0 ? Math.round((goals / episodes) * 100) : 0;
  const maxHistory = 24;

  // ── Reset everything and begin ─────────────────────────────────────────────
  const startTraining = useCallback(() => {
    setEpisodes(0);
    setGoals(0);
    setMisses(0);
    setRewardHistory([]);
    trajectoryRef.current = [];
    batchTrajRef.current = [];
    weightsRef.current = createWeights();
    adamRef.current = createAdamState();
    baselineRef.current = 0;
    stdRef.current = 0.6;
    batchEpisodesRef.current = 0;
    setIsRunning(true);
    simControlRef.current?.reset();
  }, []);

  // ── Flush buffers when the user switches policy mid-run ────────────────────
  const handlePolicySwitch = useCallback(
    (next: Policy) => {
      if (next === policyRef.current) return;
      setPolicy(next);
      if (isRunning) {
        trajectoryRef.current = [];
        batchTrajRef.current = [];
        batchEpisodesRef.current = 0;
        baselineRef.current = 0;
      }
    },
    [isRunning]
  );

  // ── State featurisation ────────────────────────────────────────────────────
  const buildState = (frame: PhysicsState): number[] => {
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

  // ── Dense shaping reward ──────────────────────────────────────────────────
  const computeStepReward = (frame: PhysicsState): number => {
    const dx = frame.ball.x - frame.effector.x;
    const dy = frame.ball.y - frame.effector.y;
    const gcx = frame.goal.x + frame.goal.width / 2;
    const gcy = frame.goal.y + frame.goal.height / 2;
    const distToBall = Math.sqrt(dx * dx + dy * dy);
    const distToGoal = Math.sqrt((frame.ball.x - gcx) ** 2 + (frame.ball.y - gcy) ** 2);
    return (-distToBall / frame.viewport.width) * 0.1 + (-distToGoal / frame.viewport.width) * 0.05;
  };

  // ── Forward pass: 8 → 64 → 64 → 2 ────────────────────────────────────────
  const forward = (state: number[]) => {
    const W = weightsRef.current;

    const h1 = new Float32Array(HIDDEN1);
    for (let i = 0; i < HIDDEN1; i++) {
      let s = W.b1[i];
      for (let j = 0; j < STATE_SIZE; j++) s += state[j] * W.w1[i * STATE_SIZE + j];
      h1[i] = Math.tanh(s);
    }

    const h2 = new Float32Array(HIDDEN2);
    for (let i = 0; i < HIDDEN2; i++) {
      let s = W.b2[i];
      for (let j = 0; j < HIDDEN1; j++) s += h1[j] * W.w2[i * HIDDEN1 + j];
      h2[i] = Math.tanh(s);
    }

    const mean: [number, number] = [0, 0];
    for (let i = 0; i < OUTPUT_SIZE; i++) {
      let s = W.b3[i];
      for (let j = 0; j < HIDDEN2; j++) s += h2[j] * W.w3[i * HIDDEN2 + j];
      mean[i] = s;
    }

    return { h1, h2, mean };
  };

  // ── Gaussian helpers ──────────────────────────────────────────────────────
  const gaussianLogProb = (action: [number, number], mean: [number, number], std: number): number => {
    const inv2v = 1 / (2 * std * std);
    const dx = action[0] - mean[0];
    const dy = action[1] - mean[1];
    return -(dx * dx + dy * dy) * inv2v - Math.log(std * std * 2 * Math.PI);
  };

  // ── Sample an action ─────────────────────────────────────────────────────
  const sampleAction = (state: number[]) => {
    const { h1, h2, mean } = forward(state);
    const std = stdRef.current;
    const ax = mean[0] + normalSample(std);
    const ay = mean[1] + normalSample(std);
    const logProb = gaussianLogProb([ax, ay], [mean[0], mean[1]], std);
    return { action: [ax, ay] as [number, number], logProb, h1, h2 };
  };

  // ── Main training update ──────────────────────────────────────────────────
  const finishEpisode = useCallback(
    (result: EpisodeResult) => {
      const traj = trajectoryRef.current;
      if (traj.length === 0) return;

      // terminal reward bump
      traj[traj.length - 1].reward += result === 'goal' ? 1 : -1;

      batchTrajRef.current.push(traj);
      trajectoryRef.current = [];
      batchEpisodesRef.current += 1;

      const currentPolicy = policyRef.current;

      // PPO waits for a full mini-batch of 4 episodes
      if (currentPolicy === 'ppo' && batchEpisodesRef.current < 4) return;

      const trainBatch = currentPolicy === 'ppo' ? batchTrajRef.current : [traj];
      const gamma = 0.99;

      // ── Discounted returns ───────────────────────────────────────────────
      const returnsPerTraj: number[][] = [];
      const allReturns: number[] = [];

      for (const t of trainBatch) {
        const returns: number[] = new Array(t.length);
        let G = 0;
        for (let i = t.length - 1; i >= 0; i--) {
          G = t[i].reward + gamma * G;
          returns[i] = G;
        }
        returnsPerTraj.push(returns);
        allReturns.push(...returns);
      }

      // ── Update running baseline ─────────────────────────────────────────
      const batchMean = allReturns.reduce((a, b) => a + b, 0) / Math.max(1, allReturns.length);
      baselineRef.current = 0.95 * baselineRef.current + 0.05 * batchMean;

      // ── Advantage normalisation ─────────────────────────────────────────
      const rawAdvs = allReturns.map(r => r - baselineRef.current);
      const advMu = rawAdvs.reduce((a, b) => a + b, 0) / Math.max(1, rawAdvs.length);
      const advSig =
        Math.sqrt(rawAdvs.reduce((a, b) => a + (b - advMu) ** 2, 0) / Math.max(1, rawAdvs.length)) + 1e-8;

      let advPtr = 0;
      const normAdvsPerTraj: number[][] = returnsPerTraj.map(returns =>
        returns.map(() => (rawAdvs[advPtr++] - advMu) / advSig)
      );

      // ── Hypers ─────────────────────────────────────────────────────────
      const lr = 3e-4;
      const clip = 0.2;
      const epochs = currentPolicy === 'ppo' ? 4 : 1;
      const std = stdRef.current;
      const invVar = 1 / (std * std);

      const W = weightsRef.current;
      const opt = adamRef.current;

      for (let epoch = 0; epoch < epochs; epoch++) {
        // Accumulate gradients over the full batch before the Adam step
        const gw1 = new Float32Array(HIDDEN1 * STATE_SIZE);
        const gb1 = new Float32Array(HIDDEN1);
        const gw2 = new Float32Array(HIDDEN2 * HIDDEN1);
        const gb2 = new Float32Array(HIDDEN2);
        const gw3 = new Float32Array(OUTPUT_SIZE * HIDDEN2);
        const gb3 = new Float32Array(OUTPUT_SIZE);

        for (let tIdx = 0; tIdx < trainBatch.length; tIdx++) {
          const steps = trainBatch[tIdx];
          const normAdvs = normAdvsPerTraj[tIdx];

          for (let i = 0; i < steps.length; i++) {
            const adv = normAdvs[i];
            const state = steps[i].state;
            const action = steps[i].action;
            const oldLogP = steps[i].logProb;

            const { h1, h2, mean } = forward(state);

            const newLogP = gaussianLogProb(action, [mean[0], mean[1]], std);
            const ratio = Math.exp(newLogP - oldLogP);

            // ── Correct PG vs PPO scaling ────────────────────────────────
            let gradScale: number;
            if (currentPolicy === 'ppo') {
              const clippedRatio = clamp(ratio, 1 - clip, 1 + clip);

              // correct handling for negative advantages
              const useUnclipped = adv >= 0 ? ratio <= clippedRatio : ratio >= clippedRatio;

              if (!useUnclipped) {
                // when ratio is outside the clip range, clippedRatio is constant => zero grad
                if (ratio < 1 - clip || ratio > 1 + clip) continue;
              }
              gradScale = ratio;
            } else {
              // Plain REINFORCE (on-policy)
              gradScale = 1;
            }

            // ── Gradient on output means (fixed-std Gaussian) ─────────────
            const dMean: [number, number] = [
              gradScale * adv * (action[0] - mean[0]) * invVar,
              gradScale * adv * (action[1] - mean[1]) * invVar,
            ];

            // ── Backprop: output layer ──────────────────────────────────
            for (let out = 0; out < OUTPUT_SIZE; out++) {
              gb3[out] += dMean[out];
              for (let j = 0; j < HIDDEN2; j++) {
                gw3[out * HIDDEN2 + j] += dMean[out] * h2[j];
              }
            }

            // ── Backprop: hidden layer 2 ─────────────────────────────────
            for (let j = 0; j < HIDDEN2; j++) {
              let dh2 = 0;
              for (let out = 0; out < OUTPUT_SIZE; out++) {
                dh2 += dMean[out] * W.w3[out * HIDDEN2 + j];
              }
              dh2 *= 1 - h2[j] * h2[j]; // tanh'

              gb2[j] += dh2;
              for (let k = 0; k < HIDDEN1; k++) {
                gw2[j * HIDDEN1 + k] += dh2 * h1[k];
              }

              // ── Backprop: hidden layer 1 ───────────────────────────────
              for (let k = 0; k < HIDDEN1; k++) {
                const dh1 = dh2 * W.w2[j * HIDDEN1 + k] * (1 - h1[k] * h1[k]); // tanh'
                gb1[k] += dh1;
                for (let s = 0; s < STATE_SIZE; s++) {
                  gw1[k * STATE_SIZE + s] += dh1 * state[s];
                }
              }
            }
          }
        }

        // ── Apply Adam update ───────────────────────────────────────────
        opt.t += 1;
        adamStep(W.w1, gw1, opt.mw1, opt.vw1, lr, opt.t);
        adamStep(W.b1, gb1, opt.mb1, opt.vb1, lr, opt.t);
        adamStep(W.w2, gw2, opt.mw2, opt.vw2, lr, opt.t);
        adamStep(W.b2, gb2, opt.mb2, opt.vb2, lr, opt.t);
        adamStep(W.w3, gw3, opt.mw3, opt.vw3, lr, opt.t);
        adamStep(W.b3, gb3, opt.mb3, opt.vb3, lr, opt.t);
      }

      batchTrajRef.current = [];
      batchEpisodesRef.current = 0;

      // exploration decay
      stdRef.current = Math.max(0.08, stdRef.current * (currentPolicy === 'ppo' ? 0.9995 : 0.998));
    },
    []
  );

  const handleEpisodeEnd = useCallback(
    (result: EpisodeResult) => {
      if (!isRunning) return;
      const reward = result === 'goal' ? 1 : -1;

      setEpisodes(prev => prev + 1);
      setGoals(prev => (result === 'goal' ? prev + 1 : prev));
      setMisses(prev => (result === 'miss' ? prev + 1 : prev));
      setRewardHistory(prev => [...prev, { reward, result }].slice(-maxHistory));

      finishEpisode(result);
    },
    [finishEpisode, isRunning]
  );

  const onGetAction = useCallback(
    (frame: PhysicsState) => {
      const rlState = buildState(frame);
      const { action, logProb } = sampleAction(rlState);
      const stepReward = computeStepReward(frame);

      trajectoryRef.current.push({
        state: rlState,
        action,
        logProb,
        reward: stepReward,
        value: 0,
      });

      // scale and squash to keep stable
      return { dx: Math.tanh(action[0]) * 15, dy: Math.tanh(action[1]) * 15 };
    },
    // forward() depends on weightsRef/stdRef but those are refs; no deps needed
    []
  );

  // ─── Render ───────────────────────────────────────────────────────────────
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
            Switch between Policy Gradient and PPO. The controllers are tuned to demonstrate stability differences and
            learning variance in a compact continuous-control environment.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {(['pg', 'ppo'] as Policy[]).map(item => (
              <button
                key={item}
                onClick={() => handlePolicySwitch(item)}
                className={`px-4 py-2 text-sm font-mono border transition-colors ${
                  policy === item
                    ? 'border-accent-500 text-accent-600 dark:text-accent-500'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {item === 'pg' ? 'Policy Gradient' : 'PPO'}
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
            <div className="text-xs text-zinc-500">{policyMeta.title}</div>
          </div>

          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{policyMeta.detail}</div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-xs font-mono text-zinc-500">
            <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              Goals:{' '}
              <span className="text-zinc-900 dark:text-zinc-100">{goals.toString().padStart(2, '0')}</span>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              Misses:{' '}
              <span className="text-zinc-900 dark:text-zinc-100">{misses.toString().padStart(2, '0')}</span>
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
              onChange={e => setSpeed(Number(e.target.value))}
              className="w-full accent-accent-500"
            />
          </div>
        </motion.div>
      </div>

      <RoboticArm
        isDark={isDark}
        isRunning={isRunning}
        simulationSpeed={speed}
        onGetAction={onGetAction}
        onEpisodeEnd={handleEpisodeEnd}
        controlRef={simControlRef}
      />
    </div>
  );
};




// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { motion } from 'framer-motion';
// import { useOutletContext } from 'react-router-dom';
// import { RoboticArm, PhysicsState, SimulationControl } from '../components/RoboticArm';

// type Policy = 'pg' | 'ppo';
// type EpisodeResult = 'goal' | 'miss';
// type RewardPoint = { reward: number; result: EpisodeResult };
// type StepRecord = {
//   state: number[];
//   action: [number, number];
//   logProb: number;
//   reward: number;
//   value: number;
// };

// const policyCopy: Record<Policy, { title: string; detail: string }> = {
//   pg: {
//     title: 'Policy Gradient (Noisy)',
//     detail: 'Higher variance updates with exploratory noise. Learning is unstable but can find solutions.',
//   },
//   ppo: {
//     title: 'Proximal Policy Optimization',
//     detail: 'Clipped updates + entropy bonus for stability. Learns smoother behaviour with fewer catastrophic jumps.',
//   },
// };

// // ─── Network architecture: 8 → 64 → 64 → 2 ───────────────────────────────────
// const STATE_SIZE  = 8;
// const HIDDEN1     = 64;
// const HIDDEN2     = 64;
// const OUTPUT_SIZE = 2;

// const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// const normalSample = (std: number) => {
//   const u = Math.max(Math.random(), 1e-10);
//   const v = Math.max(Math.random(), 1e-10);
//   return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std;
// };

// // He initialisation — better for tanh layers than uniform ±0.1
// const heInit = (fanIn: number, size: number): number[] =>
//   Array.from({ length: size }, () => (Math.random() - 0.5) * Math.sqrt(2 / fanIn));

// const createWeights = () => ({
//   w1: heInit(STATE_SIZE, HIDDEN1 * STATE_SIZE),  // 8  → 64
//   b1: new Float32Array(HIDDEN1).fill(0),
//   w2: heInit(HIDDEN1,    HIDDEN2 * HIDDEN1),     // 64 → 64
//   b2: new Float32Array(HIDDEN2).fill(0),
//   w3: heInit(HIDDEN2,    OUTPUT_SIZE * HIDDEN2), // 64 → 2
//   b3: new Float32Array(OUTPUT_SIZE).fill(0),
// });

// // ─── Adam state — mirrors every weight array, all zeros ───────────────────────
// const createAdamState = () => ({
//   mw1: new Float32Array(HIDDEN1 * STATE_SIZE).fill(0),
//   mb1: new Float32Array(HIDDEN1).fill(0),
//   mw2: new Float32Array(HIDDEN2 * HIDDEN1).fill(0),
//   mb2: new Float32Array(HIDDEN2).fill(0),
//   mw3: new Float32Array(OUTPUT_SIZE * HIDDEN2).fill(0),
//   mb3: new Float32Array(OUTPUT_SIZE).fill(0),
//   vw1: new Float32Array(HIDDEN1 * STATE_SIZE).fill(0),
//   vb1: new Float32Array(HIDDEN1).fill(0),
//   vw2: new Float32Array(HIDDEN2 * HIDDEN1).fill(0),
//   vb2: new Float32Array(HIDDEN2).fill(0),
//   vw3: new Float32Array(OUTPUT_SIZE * HIDDEN2).fill(0),
//   vb3: new Float32Array(OUTPUT_SIZE).fill(0),
//   t: 0,
// });

// const BETA1 = 0.9;
// const BETA2 = 0.999;
// const EPS   = 1e-8;

// /** One Adam step on a single parameter array. Mutates weights in-place. */
// const adamStep = (
//   weights: number[] | Float32Array,
//   grads:   Float32Array,
//   m:       Float32Array,
//   v:       Float32Array,
//   lr:      number,
//   t:       number,
// ) => {
//   const bc1 = 1 - Math.pow(BETA1, t);
//   const bc2 = 1 - Math.pow(BETA2, t);
//   for (let i = 0; i < weights.length; i++) {
//     m[i] = BETA1 * m[i] + (1 - BETA1) * grads[i];
//     v[i] = BETA2 * v[i] + (1 - BETA2) * grads[i] * grads[i];
//     (weights as number[])[i] += lr * (m[i] / bc1) / (Math.sqrt(v[i] / bc2) + EPS);
//   }
// };

// // ─────────────────────────────────────────────────────────────────────────────

// export const Experiments: React.FC = () => {
//   const { isDark } = useOutletContext<{ isDark: boolean }>();
//   const [policy,        setPolicy       ] = useState<Policy>('pg');
//   const [isRunning,     setIsRunning    ] = useState(false);
//   const [episodes,      setEpisodes     ] = useState(0);
//   const [goals,         setGoals        ] = useState(0);
//   const [misses,        setMisses       ] = useState(0);
//   const [rewardHistory, setRewardHistory] = useState<RewardPoint[]>([]);
//   const [speed,         setSpeed        ] = useState(1);

//   const simControlRef    = useRef<SimulationControl | null>(null);
//   const trajectoryRef    = useRef<StepRecord[]>([]);
//   const batchTrajRef     = useRef<StepRecord[][]>([]);
//   const weightsRef       = useRef(createWeights());
//   const adamRef          = useRef(createAdamState());
//   const stdRef           = useRef(0.6);
//   const baselineRef      = useRef(0);
//   const batchEpisodesRef = useRef(0);

//   // Ref-mirror of policy state to avoid stale closures inside finishEpisode
//   const policyRef = useRef<Policy>(policy);
//   useEffect(() => { policyRef.current = policy; }, [policy]);

//   const policyMeta  = useMemo(() => policyCopy[policy], [policy]);
//   const successRate = episodes > 0 ? Math.round((goals / episodes) * 100) : 0;
//   const maxHistory  = 24;

//   // ── Reset everything and begin ─────────────────────────────────────────────
//   const startTraining = () => {
//     setEpisodes(0);
//     setGoals(0);
//     setMisses(0);
//     setRewardHistory([]);
//     trajectoryRef.current    = [];
//     batchTrajRef.current     = [];
//     weightsRef.current       = createWeights();
//     adamRef.current          = createAdamState();
//     baselineRef.current      = 0;
//     stdRef.current           = 0.6;
//     batchEpisodesRef.current = 0;
//     setIsRunning(true);
//     simControlRef.current?.reset();
//   };

//   // ── Flush buffers when the user switches policy mid-run ────────────────────
//   const handlePolicySwitch = (next: Policy) => {
//     if (next === policy) return;
//     setPolicy(next);
//     if (isRunning) {
//       trajectoryRef.current    = [];
//       batchTrajRef.current     = [];
//       batchEpisodesRef.current = 0;
//       baselineRef.current      = 0;
//     }
//   };

//   const handleEpisodeEnd = (result: EpisodeResult) => {
//     if (!isRunning) return;
//     const reward = result === 'goal' ? 1 : -1;
//     setEpisodes(prev => prev + 1);
//     setGoals(prev  => (result === 'goal' ? prev + 1 : prev));
//     setMisses(prev => (result === 'miss' ? prev + 1 : prev));
//     setRewardHistory(prev => [...prev, { reward, result }].slice(-maxHistory));
//     finishEpisode(result);
//   };

//   // ── State featurisation ────────────────────────────────────────────────────
//   const buildState = (frame: PhysicsState): number[] => {
//     const { width, height } = frame.viewport;
//     return [
//       (frame.ball.x - width  / 2) / width,
//       (frame.ball.y - height / 2) / height,
//       frame.ball.vx / 20,
//       frame.ball.vy / 20,
//       (frame.goal.x + frame.goal.width  / 2 - width  / 2) / width,
//       (frame.goal.y + frame.goal.height / 2 - height / 2) / height,
//       (frame.effector.x - width  / 2) / width,
//       (frame.effector.y - height / 2) / height,
//     ];
//   };

//   // ── Dense shaping reward ──────────────────────────────────────────────────
//   const computeStepReward = (frame: PhysicsState): number => {
//     const dx = frame.ball.x - frame.effector.x;
//     const dy = frame.ball.y - frame.effector.y;
//     const gcx = frame.goal.x + frame.goal.width  / 2;
//     const gcy = frame.goal.y + frame.goal.height / 2;
//     const distToBall = Math.sqrt(dx * dx + dy * dy);
//     const distToGoal = Math.sqrt((frame.ball.x - gcx) ** 2 + (frame.ball.y - gcy) ** 2);
//     return -distToBall / frame.viewport.width * 0.1
//          + -distToGoal / frame.viewport.width * 0.05;
//   };

//   // ── Forward pass: 8 → 64 → 64 → 2 ────────────────────────────────────────
//   const forward = (state: number[]) => {
//     const W = weightsRef.current;

//     const h1 = new Float32Array(HIDDEN1);
//     for (let i = 0; i < HIDDEN1; i++) {
//       let s = W.b1[i];
//       for (let j = 0; j < STATE_SIZE; j++) s += state[j] * W.w1[i * STATE_SIZE + j];
//       h1[i] = Math.tanh(s);
//     }

//     const h2 = new Float32Array(HIDDEN2);
//     for (let i = 0; i < HIDDEN2; i++) {
//       let s = W.b2[i];
//       for (let j = 0; j < HIDDEN1; j++) s += h1[j] * W.w2[i * HIDDEN1 + j];
//       h2[i] = Math.tanh(s);
//     }

//     const mean = [0, 0];
//     for (let i = 0; i < OUTPUT_SIZE; i++) {
//       let s = W.b3[i];
//       for (let j = 0; j < HIDDEN2; j++) s += h2[j] * W.w3[i * HIDDEN2 + j];
//       mean[i] = s;
//     }

//     return { h1, h2, mean };
//   };

//   // ── Gaussian helpers ──────────────────────────────────────────────────────
//   const gaussianLogProb = (
//     action: [number, number],
//     mean:   [number, number],
//     std:    number,
//   ): number => {
//     const inv2v = 1 / (2 * std * std);
//     const dx = action[0] - mean[0];
//     const dy = action[1] - mean[1];
//     return -(dx * dx + dy * dy) * inv2v - Math.log(std * std * 2 * Math.PI);
//   };

//   // ── Sample an action ─────────────────────────────────────────────────────
//   const sampleAction = (state: number[]) => {
//     const { h1, h2, mean } = forward(state);
//     const std = stdRef.current;
//     const ax  = mean[0] + normalSample(std);
//     const ay  = mean[1] + normalSample(std);
//     const logProb = gaussianLogProb([ax, ay], [mean[0], mean[1]], std);
//     return { action: [ax, ay] as [number, number], logProb, h1, h2 };
//   };

//   // ── Main training update ──────────────────────────────────────────────────
//   const finishEpisode = (result: EpisodeResult) => {
//     const traj = trajectoryRef.current;
//     if (traj.length === 0) return;

//     traj[traj.length - 1].reward += result === 'goal' ? 1 : -1;

//     batchTrajRef.current.push(traj);
//     trajectoryRef.current    = [];
//     batchEpisodesRef.current += 1;

//     const currentPolicy = policyRef.current;

//     // PPO waits for a full mini-batch of 4 episodes
//     if (currentPolicy === 'ppo' && batchEpisodesRef.current < 4) return;

//     const trainBatch = currentPolicy === 'ppo' ? batchTrajRef.current : [traj];
//     const gamma      = 0.99;

//     // ── Discounted returns ─────────────────────────────────────────────────
//     const returnsPerTraj: number[][] = [];
//     const allReturns:     number[]   = [];

//     for (const t of trainBatch) {
//       const returns: number[] = new Array(t.length);
//       let G = 0;
//       for (let i = t.length - 1; i >= 0; i--) {
//         G = t[i].reward + gamma * G;
//         returns[i] = G;
//       }
//       returnsPerTraj.push(returns);
//       allReturns.push(...returns);
//     }

//     // ── Update running baseline ────────────────────────────────────────────
//     const batchMean  = allReturns.reduce((a, b) => a + b, 0) / Math.max(1, allReturns.length);
//     baselineRef.current = 0.95 * baselineRef.current + 0.05 * batchMean;

//     // ── Advantage normalisation (zero-mean, unit-std across the whole batch) ─
//     const rawAdvs = allReturns.map(r => r - baselineRef.current);
//     const advMu   = rawAdvs.reduce((a, b) => a + b, 0) / Math.max(1, rawAdvs.length);
//     const advSig  = Math.sqrt(
//       rawAdvs.reduce((a, b) => a + (b - advMu) ** 2, 0) / Math.max(1, rawAdvs.length)
//     ) + 1e-8;

//     let advPtr = 0;
//     const normAdvsPerTraj: number[][] = returnsPerTraj.map(returns =>
//       returns.map(() => (rawAdvs[advPtr++] - advMu) / advSig)
//     );

//     // ── Hypers ────────────────────────────────────────────────────────────
//     const lr          = 3e-4;
//     const clip        = 0.2;
//     const epochs      = currentPolicy === 'ppo' ? 4 : 1;
//     const entropyCoef = currentPolicy === 'ppo' ? 0.01 : 0.0;
//     const std         = stdRef.current;
//     const invVar      = 1 / (std * std);

//     const W   = weightsRef.current;
//     const opt = adamRef.current;

//     for (let epoch = 0; epoch < epochs; epoch++) {

//       // Accumulate gradients over the full batch before the Adam step
//       const gw1 = new Float32Array(HIDDEN1 * STATE_SIZE);
//       const gb1 = new Float32Array(HIDDEN1);
//       const gw2 = new Float32Array(HIDDEN2 * HIDDEN1);
//       const gb2 = new Float32Array(HIDDEN2);
//       const gw3 = new Float32Array(OUTPUT_SIZE * HIDDEN2);
//       const gb3 = new Float32Array(OUTPUT_SIZE);

//       for (let tIdx = 0; tIdx < trainBatch.length; tIdx++) {
//         const steps    = trainBatch[tIdx];
//         const normAdvs = normAdvsPerTraj[tIdx];

//         for (let i = 0; i < steps.length; i++) {
//           const adv     = normAdvs[i];
//           const state   = steps[i].state;
//           const action  = steps[i].action;
//           const oldLogP = steps[i].logProb;

//           const { h1, h2, mean } = forward(state);

//           const newLogP = gaussianLogProb(action, [mean[0], mean[1]], std);
//           const ratio   = Math.exp(newLogP - oldLogP);

//           // ── PPO clipped policy gradient ────────────────────────────────
//           let gradScale: number;
//           if (currentPolicy === 'ppo') {
//             const clippedRatio = clamp(ratio, 1 - clip, 1 + clip);
//             const unclipped    = ratio        * adv;
//             const clippedVal   = clippedRatio * adv;
//             if (unclipped <= clippedVal) {
//               gradScale = ratio;                  // unclipped side active
//             } else {
//               if (ratio < 1 - clip || ratio > 1 + clip) continue; // zero gradient
//               gradScale = ratio;
//             }
//           } else {
//             gradScale = ratio;                    // plain PG — no clip
//           }

//           // ── Gradient on output means ───────────────────────────────────
//           // policy gradient term + entropy bonus term (entropy bonus
//           // encourages the mean to stay uncertain; gradient is same form)
//           const dMean = [
//             (gradScale * adv + entropyCoef) * (action[0] - mean[0]) * invVar,
//             (gradScale * adv + entropyCoef) * (action[1] - mean[1]) * invVar,
//           ];

//           // ── Backprop: output layer ─────────────────────────────────────
//           for (let out = 0; out < OUTPUT_SIZE; out++) {
//             gb3[out] += dMean[out];
//             for (let j = 0; j < HIDDEN2; j++) {
//               gw3[out * HIDDEN2 + j] += dMean[out] * h2[j];
//             }
//           }

//           // ── Backprop: hidden layer 2 ───────────────────────────────────
//           for (let j = 0; j < HIDDEN2; j++) {
//             let dh2 = 0;
//             for (let out = 0; out < OUTPUT_SIZE; out++) {
//               dh2 += dMean[out] * W.w3[out * HIDDEN2 + j];
//             }
//             dh2 *= (1 - h2[j] * h2[j]);   // tanh'

//             gb2[j] += dh2;
//             for (let k = 0; k < HIDDEN1; k++) {
//               gw2[j * HIDDEN1 + k] += dh2 * h1[k];
//             }

//             // ── Backprop: hidden layer 1 ─────────────────────────────────
//             for (let k = 0; k < HIDDEN1; k++) {
//               let dh1 = dh2 * W.w2[j * HIDDEN1 + k] * (1 - h1[k] * h1[k]); // tanh'
//               gb1[k] += dh1;
//               for (let s = 0; s < STATE_SIZE; s++) {
//                 gw1[k * STATE_SIZE + s] += dh1 * state[s];
//               }
//             }
//           }
//         }
//       }

//       // ── Apply Adam update ──────────────────────────────────────────────
//       opt.t += 1;
//       adamStep(W.w1, gw1, opt.mw1, opt.vw1, lr, opt.t);
//       adamStep(W.b1, gb1, opt.mb1, opt.vb1, lr, opt.t);
//       adamStep(W.w2, gw2, opt.mw2, opt.vw2, lr, opt.t);
//       adamStep(W.b2, gb2, opt.mb2, opt.vb2, lr, opt.t);
//       adamStep(W.w3, gw3, opt.mw3, opt.vw3, lr, opt.t);
//       adamStep(W.b3, gb3, opt.mb3, opt.vb3, lr, opt.t);
//     }

//     batchTrajRef.current     = [];
//     batchEpisodesRef.current = 0;

//     // PPO decays std more slowly — entropy bonus sustains exploration longer
//     stdRef.current = Math.max(0.08, stdRef.current * (currentPolicy === 'ppo' ? 0.9995 : 0.998));
//   };

//   // ─── Render ───────────────────────────────────────────────────────────────
//   return (
//     <div className="relative w-full h-screen overflow-hidden" tabIndex={0}>
//       <div className="absolute top-24 left-6 md:left-12 z-30 w-[min(520px,calc(100%-3rem))]">
//         <motion.div
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="border border-zinc-200 dark:border-zinc-800 bg-white/75 dark:bg-zinc-900/70 backdrop-blur-sm p-6 md:p-8 shadow-sm"
//         >
//           <div className="flex items-center justify-between gap-6">
//             <div>
//               <div className="text-sm font-mono text-zinc-500">Playground</div>
//               <h1 className="text-2xl md:text-3xl font-medium text-zinc-900 dark:text-zinc-100">
//                 RL Policy Sandbox
//               </h1>
//             </div>
//             <div className="text-sm font-mono text-zinc-500">
//               Episodes: {episodes.toString().padStart(3, '0')}
//             </div>
//           </div>

//           <p className="mt-4 text-zinc-600 dark:text-zinc-400">
//             Switch between Policy Gradient and PPO. The controllers are tuned to demonstrate stability
//             differences and learning variance in a compact continuous-control environment.
//           </p>

//           <div className="mt-6 flex flex-wrap gap-2">
//             {(['pg', 'ppo'] as Policy[]).map(item => (
//               <button
//                 key={item}
//                 onClick={() => handlePolicySwitch(item)}
//                 className={`px-4 py-2 text-sm font-mono border transition-colors ${
//                   policy === item
//                     ? 'border-accent-500 text-accent-600 dark:text-accent-500'
//                     : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
//                 }`}
//               >
//                 {item === 'pg' ? 'Policy Gradient' : 'PPO'}
//               </button>
//             ))}
//           </div>

//           <div className="mt-5 flex items-center gap-3">
//             <button
//               onClick={() => (isRunning ? setIsRunning(false) : startTraining())}
//               className={`px-4 py-2 text-sm font-mono border transition-colors ${
//                 isRunning
//                   ? 'border-accent-500 text-accent-600 dark:text-accent-500'
//                   : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
//               }`}
//             >
//               {isRunning ? 'Stop Policy' : 'Start Policy'}
//             </button>
//             <div className="text-xs text-zinc-500">{policyMeta.title}</div>
//           </div>

//           <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{policyMeta.detail}</div>

//           <div className="mt-6 grid grid-cols-3 gap-4 text-xs font-mono text-zinc-500">
//             <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
//               Goals:{' '}
//               <span className="text-zinc-900 dark:text-zinc-100">{goals.toString().padStart(2, '0')}</span>
//             </div>
//             <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
//               Misses:{' '}
//               <span className="text-zinc-900 dark:text-zinc-100">{misses.toString().padStart(2, '0')}</span>
//             </div>
//             <div className="border border-zinc-200 dark:border-zinc-800 px-3 py-2">
//               Success:{' '}
//               <span className="text-zinc-900 dark:text-zinc-100">{successRate}%</span>
//             </div>
//           </div>

//           <div className="mt-4">
//             <div className="text-xs font-mono text-zinc-500 mb-2">Episode Rewards</div>
//             <div className="grid grid-cols-12 gap-1 items-end h-16">
//               {Array.from({ length: maxHistory }).map((_, index) => {
//                 const point  = rewardHistory[index];
//                 const isGoal = point?.result === 'goal';
//                 const height = point ? (isGoal ? '100%' : '35%') : '15%';
//                 const color  = point
//                   ? isGoal ? 'bg-accent-500' : 'bg-zinc-400 dark:bg-zinc-600'
//                   : 'bg-zinc-200 dark:bg-zinc-800';
//                 return <div key={index} className={`w-full ${color}`} style={{ height }} />;
//               })}
//             </div>
//           </div>

//           <div className="mt-5">
//             <div className="text-xs font-mono text-zinc-500 mb-2">Simulation Speed: {speed}x</div>
//             <input
//               type="range" min="1" max="40" step="1" value={speed}
//               onChange={e => setSpeed(Number(e.target.value))}
//               className="w-full accent-accent-500"
//             />
//           </div>
//         </motion.div>
//       </div>

//       <RoboticArm
//         isDark={isDark}
//         isRunning={isRunning}
//         simulationSpeed={speed}
//         onGetAction={frame => {
//           const rlState    = buildState(frame);
//           const { action, logProb } = sampleAction(rlState);
//           const stepReward = computeStepReward(frame);
//           trajectoryRef.current.push({ state: rlState, action, logProb, reward: stepReward, value: 0 });
//           return { dx: Math.tanh(action[0]) * 15, dy: Math.tanh(action[1]) * 15 };
//         }}
//         onEpisodeEnd={handleEpisodeEnd}
//         controlRef={simControlRef}
//       />
//     </div>
//   );
// };