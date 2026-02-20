// import React, { useEffect, useRef } from 'react';

// export type PhysicsState = {
//   ball: { x: number; y: number; vx: number; vy: number; radius: number };
//   effector: { x: number; y: number };
//   goal: { x: number; y: number; width: number; height: number };
//   viewport: { width: number; height: number };
// };

// export type SimulationControl = {
//   reset: () => void;
// };

// interface RoboticArmProps {
//   isDark: boolean;
//   isRunning: boolean;
//   simulationSpeed: number;
//   onGetAction: (state: PhysicsState) => { dx: number; dy: number };
//   onEpisodeEnd: (result: 'goal' | 'miss') => void;
//   controlRef: React.MutableRefObject<SimulationControl | null>;
// }

// export const RoboticArm: React.FC<RoboticArmProps> = ({
//   isDark,
//   isRunning,
//   simulationSpeed,
//   onGetAction,
//   onEpisodeEnd,
//   controlRef,
// }) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   const phys = useRef({
//     l1: 280,
//     l2: 260,
//     theta1: Math.PI / 2,
//     theta2: Math.PI / 4,
//     targetX: 0,
//     targetY: 0,
//     ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 28, active: false },
//     goal: { x: 0, y: 40, width: 200, height: 50 },
//     width: 0,
//     height: 0,
//   });

//   const resetEpisode = () => {
//     const p = phys.current;
//     p.ball.x = p.width / 2 + 140 + (Math.random() * 120 - 60);
//     p.ball.y = Math.min(p.height / 2 - 40, 260);
//     p.ball.vx = (Math.random() - 0.5) * 6;
//     p.ball.vy = (Math.random() - 0.5) * 4;
//     p.ball.active = true;
//     p.targetX = p.width / 2;
//     p.targetY = p.height / 2;
//   };

//   useEffect(() => {
//     controlRef.current = {
//       reset: () => resetEpisode(),
//     };
//   }, [controlRef]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
//     if (!ctx) return;

//     ctx.imageSmoothingEnabled = true;
//     ctx.imageSmoothingQuality = 'high';

//     const resize = () => {
//       const dpr = window.devicePixelRatio || 1;
//       const width = window.innerWidth;
//       const height = window.innerHeight;
//       phys.current.width = width;
//       phys.current.height = height;
//       phys.current.goal.x = width / 2 - phys.current.goal.width / 2;

//       canvas.width = Math.floor(width * dpr);
//       canvas.height = Math.floor(height * dpr);
//       canvas.style.width = `${width}px`;
//       canvas.style.height = `${height}px`;
//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//     };

//     resize();
//     window.addEventListener('resize', resize);

//     const solveIK = (tx: number, ty: number) => {
//       const p = phys.current;
//       const bx = p.width / 2;
//       const by = p.height;
//       let dx = tx - bx;
//       let dy = ty - by;
//       let dist = Math.sqrt(dx * dx + dy * dy);
//       const maxReach = p.l1 + p.l2 - 2;

//       if (dist > maxReach) {
//         const ratio = maxReach / dist;
//         dx *= ratio;
//         dy *= ratio;
//         dist = maxReach;
//       }

//       const alpha = Math.atan2(dy, dx);
//       const cosBeta = (dist * dist + p.l1 * p.l1 - p.l2 * p.l2) / (2 * dist * p.l1);
//       const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));

//       const cosGamma = (p.l1 * p.l1 + p.l2 * p.l2 - dist * dist) / (2 * p.l1 * p.l2);
//       const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));

//       return { t1: alpha - beta, t2: Math.PI - gamma };
//     };

//     const updatePhysics = () => {
//       const p = phys.current;

//       const bx = p.width / 2;
//       const by = p.height;
//       const j1x = bx + Math.cos(p.theta1) * p.l1;
//       const j1y = by + Math.sin(p.theta1) * p.l1;
//       const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
//       const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

//       if (isRunning && p.ball.active) {
//         const action = onGetAction({
//           ball: { ...p.ball },
//           effector: { x: ex, y: ey },
//           goal: { ...p.goal },
//           viewport: { width: p.width, height: p.height },
//         });
//         p.targetX = Math.max(0, Math.min(p.width, p.targetX + action.dx));
//         p.targetY = Math.max(0, Math.min(p.height, p.targetY + action.dy));
//       }

//       const { t1, t2 } = solveIK(p.targetX, p.targetY);
//       p.theta1 += (t1 - p.theta1) * 0.12;
//       p.theta2 += (t2 - p.theta2) * 0.12;

//       if (p.ball.active) {
//         p.ball.vy += 0.38;
//         p.ball.x += p.ball.vx;
//         p.ball.y += p.ball.vy;

//         const collideSegment = (ax: number, ay: number, bx2: number, by2: number, radius: number) => {
//           const abx = bx2 - ax;
//           const aby = by2 - ay;
//           const apx = p.ball.x - ax;
//           const apy = p.ball.y - ay;
//           const abLenSq = abx * abx + aby * aby || 1;
//           const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
//           const cx = ax + abx * t;
//           const cy = ay + aby * t;
//           const dx = p.ball.x - cx;
//           const dy = p.ball.y - cy;
//           const dist = Math.sqrt(dx * dx + dy * dy);
//           if (dist >= radius) return false;
//           const nx = dist === 0 ? 0 : dx / dist;
//           const ny = dist === 0 ? -1 : dy / dist;
//           p.ball.x = cx + nx * (radius + 0.5);
//           p.ball.y = cy + ny * (radius + 0.5);
//           const vRel = p.ball.vx * nx + p.ball.vy * ny;
//           if (vRel < 0) {
//             p.ball.vx -= 2 * vRel * nx;
//             p.ball.vy -= 2 * vRel * ny;
//             p.ball.vx += (Math.random() - 0.5) * 3;
//             p.ball.vy -= 6;
//           }
//           return true;
//         };

//         const armRadius = p.ball.radius + 14;
//         collideSegment(bx, by, j1x, j1y, armRadius);
//         collideSegment(j1x, j1y, ex, ey, armRadius);

//         if (p.ball.x - p.ball.radius < 0 || p.ball.x + p.ball.radius > p.width) {
//           p.ball.vx *= -0.85;
//         }

//         if (p.ball.y + p.ball.radius > p.height) {
//           onEpisodeEnd('miss');
//           resetEpisode();
//         }

//         if (
//           p.ball.y - p.ball.radius < p.goal.y + p.goal.height &&
//           p.ball.x > p.goal.x &&
//           p.ball.x < p.goal.x + p.goal.width
//         ) {
//           onEpisodeEnd('goal');
//           resetEpisode();
//         }
//       }
//     };

//     let rafId: number;
//     const loop = () => {
//       const loops = isRunning ? Math.max(1, Math.floor(simulationSpeed)) : 1;
//       for (let i = 0; i < loops; i += 1) {
//         updatePhysics();
//       }

//       const p = phys.current;
//       ctx.clearRect(0, 0, p.width, p.height);

//       const theme = isDark
//         ? { stroke: '#f59e0b', jointFill: '#18181b', jointStroke: '#f59e0b', accent: '#f59e0b' }
//         : { stroke: '#d97706', jointFill: '#f4f4f5', jointStroke: '#d97706', accent: '#d97706' };

//       ctx.strokeStyle = theme.accent;
//       ctx.lineWidth = 4;
//       ctx.beginPath();
//       ctx.moveTo(p.goal.x, p.goal.y + p.goal.height);
//       ctx.lineTo(p.goal.x, p.goal.y);
//       ctx.lineTo(p.goal.x + p.goal.width, p.goal.y);
//       ctx.lineTo(p.goal.x + p.goal.width, p.goal.y + p.goal.height);
//       ctx.stroke();

//       const bx = p.width / 2;
//       const by = p.height;
//       const j1x = bx + Math.cos(p.theta1) * p.l1;
//       const j1y = by + Math.sin(p.theta1) * p.l1;
//       const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
//       const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

//       ctx.strokeStyle = theme.stroke;
//       ctx.lineWidth = 3;
//       ctx.lineCap = 'round';
//       ctx.beginPath();
//       ctx.moveTo(bx, by);
//       ctx.lineTo(j1x, j1y);
//       ctx.lineTo(ex, ey);
//       ctx.stroke();

//       ctx.fillStyle = theme.jointFill;
//       ctx.strokeStyle = theme.jointStroke;
//       ctx.lineWidth = 1;
//       ctx.beginPath();
//       ctx.arc(j1x, j1y, 4, 0, Math.PI * 2);
//       ctx.fill();
//       ctx.stroke();

//       ctx.fillStyle = theme.accent;
//       ctx.beginPath();
//       ctx.arc(ex, ey, 3, 0, Math.PI * 2);
//       ctx.fill();

//       if (p.ball.active) {
//         ctx.fillStyle = theme.accent;
//         ctx.beginPath();
//         ctx.arc(p.ball.x, p.ball.y, p.ball.radius, 0, Math.PI * 2);
//         ctx.fill();
//         ctx.strokeStyle = isDark ? '#fbbf24' : '#b45309';
//         ctx.lineWidth = 2;
//         ctx.stroke();
//       }

//       rafId = requestAnimationFrame(loop);
//     };

//     rafId = requestAnimationFrame(loop);
//     return () => {
//       cancelAnimationFrame(rafId);
//       window.removeEventListener('resize', resize);
//     };
//   }, [isRunning, simulationSpeed, isDark, onEpisodeEnd, onGetAction]);

//   return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
// };


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

  // Keep callbacks stable so the RAF loop effect doesn't restart every render
  const onGetActionRef = useRef(onGetAction);
  const onEpisodeEndRef = useRef(onEpisodeEnd);
  useEffect(() => {
    onGetActionRef.current = onGetAction;
  }, [onGetAction]);
  useEffect(() => {
    onEpisodeEndRef.current = onEpisodeEnd;
  }, [onEpisodeEnd]);

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
    // If we haven't sized yet, just no-op
    if (p.width <= 0 || p.height <= 0) return;

    p.ball.x = p.width / 2 + 140 + (Math.random() * 120 - 60);
    p.ball.y = Math.min(p.height / 2 - 40, 260);
    p.ball.vx = (Math.random() - 0.5) * 6;
    p.ball.vy = (Math.random() - 0.5) * 4;
    p.ball.active = true;

    p.targetX = p.width / 2;
    p.targetY = p.height / 2;
  };

  useEffect(() => {
    controlRef.current = { reset: () => resetEpisode() };
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

      const p = phys.current;
      p.width = width;
      p.height = height;
      p.goal.x = width / 2 - p.goal.width / 2;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Important: reset so ball/targets match new coordinates
      resetEpisode();
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
      dist = Math.max(dist, 1e-6); // guard divide-by-zero

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

    // Fixed-timestep physics
    const FIXED_DT = 1 / 60;     // 60 Hz simulation
    const MAX_STEPS_PER_FRAME = 10;
    const GRAVITY_PER_SEC = 22.8; // tuned to feel similar to your old 0.38 @ ~60fps (0.38*60 ≈ 22.8)
    const RESTITUTION = 0.55;
    const FRICTION_TANGENTIAL = 0.98;

    const updatePhysics = (dt: number) => {
      const p = phys.current;

      const bx = p.width / 2;
      const by = p.height;

      const j1x = bx + Math.cos(p.theta1) * p.l1;
      const j1y = by + Math.sin(p.theta1) * p.l1;
      const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
      const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

      // Action update (scaled to dt so control feels consistent)
      if (isRunning && p.ball.active) {
        const action = onGetActionRef.current({
          ball: { x: p.ball.x, y: p.ball.y, vx: p.ball.vx, vy: p.ball.vy, radius: p.ball.radius },
          effector: { x: ex, y: ey },
          goal: { x: p.goal.x, y: p.goal.y, width: p.goal.width, height: p.goal.height },
          viewport: { width: p.width, height: p.height },
        });

        // Your actions are “per frame-ish”; scale to dt relative to 60Hz
        const frameScale = dt / FIXED_DT;

        p.targetX = Math.max(0, Math.min(p.width, p.targetX + action.dx * frameScale));
        p.targetY = Math.max(0, Math.min(p.height, p.targetY + action.dy * frameScale));
      }

      // IK smoothing: also scale to dt (so it doesn't change with FPS)
      const { t1, t2 } = solveIK(p.targetX, p.targetY);
      const ikAlpha = 1 - Math.pow(1 - 0.12, dt / FIXED_DT);
      p.theta1 += (t1 - p.theta1) * ikAlpha;
      p.theta2 += (t2 - p.theta2) * ikAlpha;

      if (!p.ball.active) return;

      // Integrate ball with dt
      p.ball.vy += GRAVITY_PER_SEC * dt;
      p.ball.x += p.ball.vx * dt * 60; // keep similar feel to your old "per-step" velocities
      p.ball.y += p.ball.vy * dt * 60;

      const collideSegment = (
        ax: number,
        ay: number,
        bx2: number,
        by2: number,
        radius: number
      ) => {
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

        // Push out of penetration
        const pushOut = radius - dist + 0.5;
        p.ball.x += nx * pushOut;
        p.ball.y += ny * pushOut;

        // Reflect velocity along normal with restitution, damp tangential a bit
        const vN = p.ball.vx * nx + p.ball.vy * ny;
        if (vN < 0) {
          p.ball.vx -= (1 + RESTITUTION) * vN * nx;
          p.ball.vy -= (1 + RESTITUTION) * vN * ny;

          // tangential friction
          const tx = -ny;
          const ty = nx;
          const vT = p.ball.vx * tx + p.ball.vy * ty;
          p.ball.vx -= (1 - FRICTION_TANGENTIAL) * vT * tx;
          p.ball.vy -= (1 - FRICTION_TANGENTIAL) * vT * ty;
        }

        return true;
      };

      const armRadius = p.ball.radius + 14;
      collideSegment(bx, by, j1x, j1y, armRadius);
      collideSegment(j1x, j1y, ex, ey, armRadius);

      // Wall collision with penetration correction (prevents buzzing)
      const r = p.ball.radius;
      if (p.ball.x - r < 0) {
        p.ball.x = r;
        if (p.ball.vx < 0) p.ball.vx *= -0.85;
      }
      if (p.ball.x + r > p.width) {
        p.ball.x = p.width - r;
        if (p.ball.vx > 0) p.ball.vx *= -0.85;
      }

      // Episode termination
      if (p.ball.y + r > p.height) {
        onEpisodeEndRef.current('miss');
        resetEpisode();
        return;
      }

      // Goal: simple circle-rectangle overlap check
      const gx = p.goal.x;
      const gy = p.goal.y;
      const gw = p.goal.width;
      const gh = p.goal.height;

      const closestX = Math.max(gx, Math.min(p.ball.x, gx + gw));
      const closestY = Math.max(gy, Math.min(p.ball.y, gy + gh));
      const ddx = p.ball.x - closestX;
      const ddy = p.ball.y - closestY;

      if (ddx * ddx + ddy * ddy <= r * r) {
        onEpisodeEndRef.current('goal');
        resetEpisode();
        return;
      }
    };

    let rafId = 0;
    let lastT = performance.now();
    let acc = 0;

    const loop = (t: number) => {
      const p = phys.current;

      // Cap large frame gaps (tab switch etc.)
      const dtReal = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      // simulationSpeed scales time progression (1x..40x)
      const speedScale = isRunning ? Math.max(1, simulationSpeed) : 1;
      acc += dtReal * speedScale;

      // Step fixed dt
      let steps = 0;
      while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        updatePhysics(FIXED_DT);
        acc -= FIXED_DT;
        steps += 1;
      }
      // If we fell behind too far, drop the remainder to avoid spiral of death
      if (steps >= MAX_STEPS_PER_FRAME) acc = 0;

      // Render
      ctx.clearRect(0, 0, p.width, p.height);

      const theme = isDark
        ? { stroke: '#f59e0b', jointFill: '#18181b', jointStroke: '#f59e0b', accent: '#f59e0b' }
        : { stroke: '#d97706', jointFill: '#f4f4f5', jointStroke: '#d97706', accent: '#d97706' };

      // Goal
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

      // Arm
      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(j1x, j1y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Joint
      ctx.fillStyle = theme.jointFill;
      ctx.strokeStyle = theme.jointStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(j1x, j1y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Effector
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();

      // Ball
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
  }, [isDark, isRunning, simulationSpeed, controlRef]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};