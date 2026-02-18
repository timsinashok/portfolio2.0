import React, { useEffect, useRef, useState } from 'react';
import { Point } from '../types';

interface RoboticArmInteractiveProps {
  target: Point;
  isActive: boolean;
  isDark: boolean;
  onScoreUpdate?: (score: number) => void;
}

type GameState = 'waiting' | 'playing' | 'ended';

type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

const FRAME_MS = 1000 / 60;

export const RoboticArmInteractive: React.FC<RoboticArmInteractiveProps> = ({
  target,
  isActive,
  isDark,
  onScoreUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(isDark);
  const targetRef = useRef<Point>(target);
  const isActiveRef = useRef(isActive);
  const gameStateRef = useRef<GameState>('waiting');
  const scoreRef = useRef(0);
  const viewportRef = useRef<Viewport>({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
    dpr: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  });

  const [gameState, setGameState] = useState<GameState>('waiting');
  const [ballStartPos, setBallStartPos] = useState({ x: 0, y: 250 });

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const state = useRef({
    l1: 280,
    l2: 260,
    theta1: Math.PI / 2,
    theta2: Math.PI / 4,
    targetTheta1: Math.PI / 2,
    targetTheta2: Math.PI / 4,
  });

  const ball = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 30,
    startX: 0,
    startY: 0,
    prevEEx: 0,
    prevEEy: 0,
    lastHitTime: 0,
  });

  const goal = useRef({
    x: 0,
    y: 40,
    width: 200,
    height: 60,
  });

  const startGame = () => {
    gameStateRef.current = 'playing';
    setGameState('playing');
    ball.current.vx = 0;
    ball.current.vy = 0;
  };

  const resetBall = () => {
    ball.current.x = ball.current.startX;
    ball.current.y = ball.current.startY;
    ball.current.vx = 0;
    ball.current.vy = 0;
    gameStateRef.current = 'waiting';
    setGameState('waiting');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      viewportRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const startX = width / 2 + 250;
      const startY = Math.min(height / 2 - 50, 300);
      ball.current.startX = startX;
      ball.current.startY = startY;
      setBallStartPos({ x: startX, y: startY });

      if (gameStateRef.current === 'waiting') {
        ball.current.x = startX;
        ball.current.y = startY;
      }

      goal.current.x = width / 2 - goal.current.width / 2;
    };

    resize();
    window.addEventListener('resize', resize);

    const solveIK = (x: number, y: number) => {
      const { width, height } = viewportRef.current;
      const bx = width / 2;
      const by = height;
      let dx = x - bx;
      let dy = y - by;
      let dist = Math.sqrt(dx * dx + dy * dy);
      const maxReach = state.current.l1 + state.current.l2 - 2;

      if (dist > maxReach) {
        const ratio = maxReach / dist;
        dx *= ratio;
        dy *= ratio;
        dist = maxReach;
      }

      const alpha = Math.atan2(dy, dx);
      const cosBeta =
        (dist * dist + state.current.l1 * state.current.l1 - state.current.l2 * state.current.l2) /
        (2 * dist * state.current.l1);
      const clampedCosBeta = Math.max(-1, Math.min(1, cosBeta));
      const beta = Math.acos(clampedCosBeta);

      const cosGamma =
        (state.current.l1 * state.current.l1 + state.current.l2 * state.current.l2 - dist * dist) /
        (2 * state.current.l1 * state.current.l2);
      const clampedCosGamma = Math.max(-1, Math.min(1, cosGamma));
      const gamma = Math.acos(clampedCosGamma);

      return { theta1: alpha - beta, theta2: Math.PI - gamma };
    };

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(2, (time - lastTime) / FRAME_MS);
      const dtSafe = Math.max(0.001, dt);
      lastTime = time;

      const { width, height } = viewportRef.current;
      ctx.clearRect(0, 0, width, height);

      const response = 1 - Math.pow(1 - 0.12, dt);

      if (!isActiveRef.current) {
        state.current.targetTheta1 = Math.PI / 2;
        state.current.targetTheta2 = Math.PI / 4;
      } else {
        const solution = solveIK(targetRef.current.x, targetRef.current.y);
        state.current.targetTheta1 = solution.theta1;
        state.current.targetTheta2 = solution.theta2;
      }

      state.current.theta1 += (state.current.targetTheta1 - state.current.theta1) * response;
      state.current.theta2 += (state.current.targetTheta2 - state.current.theta2) * response;

      const bx = width / 2;
      const by = height;
      const j1x = bx + Math.cos(state.current.theta1) * state.current.l1;
      const j1y = by + Math.sin(state.current.theta1) * state.current.l1;
      const eex = j1x + Math.cos(state.current.theta1 + state.current.theta2) * state.current.l2;
      const eey = j1y + Math.sin(state.current.theta1 + state.current.theta2) * state.current.l2;

      if (gameStateRef.current === 'playing') {
        const gravity = 0.22;
        const airResistance = Math.pow(0.994, dt);
        const bounceRestitution = 0.72;

        ball.current.vy += gravity * dt;
        ball.current.vx *= airResistance;
        ball.current.vy *= airResistance;

        ball.current.x += ball.current.vx * dt;
        ball.current.y += ball.current.vy * dt;

        const collideSegment = (
          ax: number,
          ay: number,
          bx: number,
          by: number,
          radius: number,
          now: number
        ) => {
          if (now - ball.current.lastHitTime < 60) {
            return false;
          }
          const abx = bx - ax;
          const aby = by - ay;
          const apx = ball.current.x - ax;
          const apy = ball.current.y - ay;
          const abLenSq = abx * abx + aby * aby || 1;
          const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
          const cx = ax + abx * t;
          const cy = ay + aby * t;
          const dx = ball.current.x - cx;
          const dy = ball.current.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= radius) return false;

          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? -1 : dy / dist;

          ball.current.x = cx + nx * (radius + 0.5);
          ball.current.y = cy + ny * (radius + 0.5);

          const eeVx = (eex - ball.current.prevEEx) / dtSafe;
          const eeVy = (eey - ball.current.prevEEy) / dtSafe;
          const relVx = ball.current.vx - eeVx;
          const relVy = ball.current.vy - eeVy;
          const relNormal = relVx * nx + relVy * ny;

          if (relNormal < 0) {
            const bounce = -relNormal * 1.05;
            ball.current.vx += nx * bounce + eeVx * 0.35;
            ball.current.vy += ny * bounce + eeVy * 0.35;
          } else {
            ball.current.vx += eeVx * 0.15;
            ball.current.vy += eeVy * 0.15;
          }

          ball.current.lastHitTime = now;
          return true;
        };

        const armRadius = ball.current.radius + 14;
        const hitUpper = collideSegment(bx, by, j1x, j1y, armRadius, time);
        const hitLower = collideSegment(j1x, j1y, eex, eey, armRadius, time);

        if (hitUpper || hitLower) {
          ball.current.vx *= 0.98;
          ball.current.vy *= 0.98;
        }

        if (ball.current.x - ball.current.radius < 0) {
          ball.current.x = ball.current.radius;
          ball.current.vx *= -bounceRestitution;
        }
        if (ball.current.x + ball.current.radius > width) {
          ball.current.x = width - ball.current.radius;
          ball.current.vx *= -bounceRestitution;
        }
        if (ball.current.y - ball.current.radius < 0) {
          ball.current.y = ball.current.radius;
          ball.current.vy *= -bounceRestitution;
        }

        if (ball.current.y + ball.current.radius > height) {
          gameStateRef.current = 'ended';
          setGameState('ended');
          resetBall();
        }

        if (
          ball.current.x > goal.current.x &&
          ball.current.x < goal.current.x + goal.current.width &&
          ball.current.y - ball.current.radius < goal.current.y + goal.current.height &&
          ball.current.y + ball.current.radius > goal.current.y
        ) {
          scoreRef.current += 1;
          onScoreUpdate?.(scoreRef.current);
          resetBall();
        }
      }

      ball.current.prevEEx = eex;
      ball.current.prevEEy = eey;

      const theme = isDarkRef.current
        ? {
            stroke: '#f59e0b',
            jointFill: '#18181b',
            jointStroke: '#f59e0b',
            accent: '#f59e0b',
          }
        : {
            stroke: '#d97706',
            jointFill: '#f4f4f5',
            jointStroke: '#d97706',
            accent: '#d97706',
          };

      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.arc(bx, by, 6, Math.PI, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(j1x, j1y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = theme.jointFill;
      ctx.strokeStyle = theme.jointStroke;
      ctx.lineWidth = 1;
      ctx.arc(j1x, j1y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = theme.stroke;
      ctx.moveTo(j1x, j1y);
      ctx.lineTo(eex, eey);
      ctx.stroke();

      const globalAngle = state.current.theta1 + state.current.theta2;
      const gripLen = 15;

      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.moveTo(eex, eey);
      ctx.lineTo(eex + Math.cos(globalAngle) * gripLen, eey + Math.sin(globalAngle) * gripLen);
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(
        eex + Math.cos(globalAngle) * gripLen,
        eey + Math.sin(globalAngle) * gripLen,
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(goal.current.x, goal.current.y + goal.current.height);
      ctx.lineTo(goal.current.x, goal.current.y);
      ctx.lineTo(goal.current.x + goal.current.width, goal.current.y);
      ctx.lineTo(goal.current.x + goal.current.width, goal.current.y + goal.current.height);
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`GOALS: ${scoreRef.current}`, width / 2, 25);

      const currentGameState = gameStateRef.current;
      const ballOpacity = currentGameState === 'waiting' ? 1.0 : 0.7;
      ctx.globalAlpha = ballOpacity;
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDarkRef.current ? '#fbbf24' : '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [onScoreUpdate]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-multiply dark:mix-blend-screen"
        style={{ willChange: 'transform' }}
      />

      {gameState === 'waiting' && ballStartPos.x > 0 && (
        <button
          onClick={startGame}
          className="absolute z-10 pointer-events-auto group"
          style={{
            left: `${ballStartPos.x}px`,
            top: `${ballStartPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          aria-label="Start juggling"
        >
          <div className="relative">
            <div className="w-[60px] h-[60px] rounded-full bg-accent-600 dark:bg-accent-500 border-2 border-accent-700 dark:border-accent-600 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl flex items-center justify-center">
              <span className="text-white font-mono text-xs font-bold tracking-tight">START</span>
            </div>
          </div>
        </button>
      )}
    </>
  );
};
