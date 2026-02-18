import React, { useEffect, useRef } from 'react';

export type PhysicsState = {
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  effector: { x: number; y: number };
  goal: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
};

export type SimulationControl = {
  reset: () => void;
};

interface RoboticArmProps {
  isDark: boolean;
  isRunning: boolean;
  simulationSpeed: number;
  onGetAction: (state: PhysicsState) => { dx: number; dy: number };
  onEpisodeEnd: (result: 'goal' | 'miss') => void;
  controlRef: React.MutableRefObject<SimulationControl | null>;
}

export const RoboticArm: React.FC<RoboticArmProps> = ({
  isDark,
  isRunning,
  simulationSpeed,
  onGetAction,
  onEpisodeEnd,
  controlRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const phys = useRef({
    l1: 280,
    l2: 260,
    theta1: Math.PI / 2,
    theta2: Math.PI / 4,
    targetX: 0,
    targetY: 0,
    ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 28, active: false },
    goal: { x: 0, y: 40, width: 200, height: 50 },
    width: 0,
    height: 0,
  });

  const resetEpisode = () => {
    const p = phys.current;
    p.ball.x = p.width / 2 + (Math.random() * 180 - 90);
    p.ball.y = Math.min(p.height / 2 - 40, 260);
    p.ball.vx = (Math.random() - 0.5) * 6;
    p.ball.vy = (Math.random() - 0.5) * 4;
    p.ball.active = true;
    p.targetX = p.width / 2;
    p.targetY = p.height / 2;
  };

  useEffect(() => {
    controlRef.current = {
      reset: () => resetEpisode(),
    };
  }, [controlRef]);

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
      phys.current.width = width;
      phys.current.height = height;
      phys.current.goal.x = width / 2 - phys.current.goal.width / 2;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const solveIK = (tx: number, ty: number) => {
      const p = phys.current;
      const bx = p.width / 2;
      const by = p.height;
      let dx = tx - bx;
      let dy = ty - by;
      let dist = Math.sqrt(dx * dx + dy * dy);
      const maxReach = p.l1 + p.l2 - 2;

      if (dist > maxReach) {
        const ratio = maxReach / dist;
        dx *= ratio;
        dy *= ratio;
        dist = maxReach;
      }

      const alpha = Math.atan2(dy, dx);
      const cosBeta = (dist * dist + p.l1 * p.l1 - p.l2 * p.l2) / (2 * dist * p.l1);
      const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));

      const cosGamma = (p.l1 * p.l1 + p.l2 * p.l2 - dist * dist) / (2 * p.l1 * p.l2);
      const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));

      return { t1: alpha - beta, t2: Math.PI - gamma };
    };

    const updatePhysics = () => {
      const p = phys.current;

      const bx = p.width / 2;
      const by = p.height;
      const j1x = bx + Math.cos(p.theta1) * p.l1;
      const j1y = by + Math.sin(p.theta1) * p.l1;
      const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
      const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

      if (isRunning && p.ball.active) {
        const action = onGetAction({
          ball: { ...p.ball },
          effector: { x: ex, y: ey },
          goal: { ...p.goal },
          viewport: { width: p.width, height: p.height },
        });
        p.targetX = Math.max(0, Math.min(p.width, p.targetX + action.dx));
        p.targetY = Math.max(0, Math.min(p.height, p.targetY + action.dy));
      }

      const { t1, t2 } = solveIK(p.targetX, p.targetY);
      p.theta1 += (t1 - p.theta1) * 0.12;
      p.theta2 += (t2 - p.theta2) * 0.12;

      if (p.ball.active) {
        p.ball.vy += 0.38;
        p.ball.x += p.ball.vx;
        p.ball.y += p.ball.vy;

        const collideSegment = (ax: number, ay: number, bx2: number, by2: number, radius: number) => {
          const abx = bx2 - ax;
          const aby = by2 - ay;
          const apx = p.ball.x - ax;
          const apy = p.ball.y - ay;
          const abLenSq = abx * abx + aby * aby || 1;
          const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
          const cx = ax + abx * t;
          const cy = ay + aby * t;
          const dx = p.ball.x - cx;
          const dy = p.ball.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= radius) return false;
          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? -1 : dy / dist;
          p.ball.x = cx + nx * (radius + 0.5);
          p.ball.y = cy + ny * (radius + 0.5);
          const vRel = p.ball.vx * nx + p.ball.vy * ny;
          if (vRel < 0) {
            p.ball.vx -= 2 * vRel * nx;
            p.ball.vy -= 2 * vRel * ny;
            p.ball.vx += (Math.random() - 0.5) * 3;
            p.ball.vy -= 6;
          }
          return true;
        };

        const armRadius = p.ball.radius + 14;
        collideSegment(bx, by, j1x, j1y, armRadius);
        collideSegment(j1x, j1y, ex, ey, armRadius);

        if (p.ball.x - p.ball.radius < 0 || p.ball.x + p.ball.radius > p.width) {
          p.ball.vx *= -0.85;
        }

        if (p.ball.y + p.ball.radius > p.height) {
          onEpisodeEnd('miss');
          resetEpisode();
        }

        if (
          p.ball.y - p.ball.radius < p.goal.y + p.goal.height &&
          p.ball.x > p.goal.x &&
          p.ball.x < p.goal.x + p.goal.width
        ) {
          onEpisodeEnd('goal');
          resetEpisode();
        }
      }
    };

    let rafId: number;
    const loop = () => {
      const loops = isRunning ? Math.max(1, Math.floor(simulationSpeed)) : 1;
      for (let i = 0; i < loops; i += 1) {
        updatePhysics();
      }

      const p = phys.current;
      ctx.clearRect(0, 0, p.width, p.height);

      const theme = isDark
        ? { stroke: '#f59e0b', jointFill: '#18181b', jointStroke: '#f59e0b', accent: '#f59e0b' }
        : { stroke: '#d97706', jointFill: '#f4f4f5', jointStroke: '#d97706', accent: '#d97706' };

      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.goal.x, p.goal.y + p.goal.height);
      ctx.lineTo(p.goal.x, p.goal.y);
      ctx.lineTo(p.goal.x + p.goal.width, p.goal.y);
      ctx.lineTo(p.goal.x + p.goal.width, p.goal.y + p.goal.height);
      ctx.stroke();

      const bx = p.width / 2;
      const by = p.height;
      const j1x = bx + Math.cos(p.theta1) * p.l1;
      const j1y = by + Math.sin(p.theta1) * p.l1;
      const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
      const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(j1x, j1y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.fillStyle = theme.jointFill;
      ctx.strokeStyle = theme.jointStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(j1x, j1y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();

      if (p.ball.active) {
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(p.ball.x, p.ball.y, p.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#fbbf24' : '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [isRunning, simulationSpeed, isDark, onEpisodeEnd, onGetAction]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};
