import React, { useEffect, useRef } from 'react';

// --- Types ---
export type PhysicsState = {
  ball: { x: number; y: number; vx: number; vy: number };
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
  controlRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Persistent Physics State (Mutable)
  const phys = useRef({
    l1: 200, l2: 180,
    theta1: Math.PI / 2, theta2: Math.PI / 4,
    targetX: 0, targetY: 0, // IK Targets
    ball: { x: 400, y: 300, vx: 0, vy: 0, radius: 25, active: false },
    goal: { x: 0, y: 50, width: 200, height: 10 },
    width: 800, height: 600,
    episodeTimer: 0
  });

  // Expose Reset
  useEffect(() => {
    controlRef.current = {
      reset: () => resetEpisode()
    };
  }, []);

  const resetEpisode = () => {
    const p = phys.current;
    p.ball.x = p.width / 2 + (Math.random() * 200 - 100);
    p.ball.y = 200;
    p.ball.vx = (Math.random() - 0.5) * 10;
    p.ball.vy = (Math.random() - 0.5) * 10;
    p.ball.active = true;
    p.episodeTimer = 0;
    
    // Reset Arm partially
    p.targetX = p.width / 2;
    p.targetY = p.height / 2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const dt = 1 / 60; // Fixed physics step

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
        dx *= ratio; dy *= ratio; dist = maxReach;
      }

      const cosBeta = (dist**2 + p.l1**2 - p.l2**2) / (2 * dist * p.l1);
      const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
      const alpha = Math.atan2(dy, dx);
      const theta1 = alpha - beta;

      const cosGamma = (p.l1**2 + p.l2**2 - dist**2) / (2 * p.l1 * p.l2);
      const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));
      const theta2 = Math.PI - gamma;

      return { t1: theta1, t2: theta2 };
    };

    const updatePhysics = () => {
      const p = phys.current;

      // 1. Get Action from Brain (Synchronous!)
      if (isRunning && p.ball.active) {
        // Calculate Effector Pos
        const bx = p.width/2; 
        const by = p.height;
        const j1x = bx + Math.cos(p.theta1) * p.l1;
        const j1y = by + Math.sin(p.theta1) * p.l1;
        const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
        const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

        const action = onGetAction({
          ball: { ...p.ball },
          effector: { x: ex, y: ey },
          goal: { ...p.goal },
          viewport: { width: p.width, height: p.height }
        });

        // Apply Action to Target
        p.targetX = Math.max(0, Math.min(p.width, p.targetX + action.dx));
        p.targetY = Math.max(0, Math.min(p.height, p.targetY + action.dy));
      }

      // 2. Move Arm (IK + Smoothing)
      const { t1, t2 } = solveIK(p.targetX, p.targetY);
      p.theta1 += (t1 - p.theta1) * 0.1;
      p.theta2 += (t2 - p.theta2) * 0.1;

      // 3. Move Ball
      if (p.ball.active) {
        p.ball.vy += 0.5; // Gravity
        p.ball.x += p.ball.vx;
        p.ball.y += p.ball.vy;

        // Effector Collision (Simplified)
        const bx = p.width/2; const by = p.height;
        const j1x = bx + Math.cos(p.theta1) * p.l1;
        const j1y = by + Math.sin(p.theta1) * p.l1;
        const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
        const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

        const dx = p.ball.x - ex;
        const dy = p.ball.y - ey;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < p.ball.radius + 15) {
          // Hit!
          const nx = dx/dist; const ny = dy/dist;
          const vRel = (p.ball.vx * nx + p.ball.vy * ny);
          if (vRel < 0) {
             p.ball.vx -= 2 * vRel * nx; 
             p.ball.vy -= 2 * vRel * ny;
             // Add some "Push" from arm
             p.ball.vx += (Math.random()-0.5)*5;
             p.ball.vy -= 10; // Pop up
          }
        }

        // Walls
        if (p.ball.x < 0 || p.ball.x > p.width) p.ball.vx *= -0.8;
        if (p.ball.y > p.height) {
            onEpisodeEnd('miss');
            resetEpisode();
        }

        // Goal
        if (p.ball.y < p.goal.y + p.goal.height && 
            p.ball.x > p.goal.x && p.ball.x < p.goal.x + p.goal.width) {
            onEpisodeEnd('goal');
            resetEpisode();
        }
      }
    };

    const loop = () => {
      // Handle Resize
      if (canvas.width !== window.innerWidth) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        phys.current.width = canvas.width;
        phys.current.height = canvas.height;
        phys.current.goal.x = canvas.width / 2 - 100;
      }

      // --- CRITICAL: Fast Forward Loop ---
      const loops = isRunning ? simulationSpeed : 1;
      for (let i = 0; i < loops; i++) {
        updatePhysics();
      }

      // Render (Once per frame)
      const p = phys.current;
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw Goal
      ctx.fillStyle = isDark ? '#22c55e' : '#16a34a';
      ctx.fillRect(p.goal.x, p.goal.y, p.goal.width, p.goal.height);

      // Draw Arm
      const bx = width/2; const by = height;
      const j1x = bx + Math.cos(p.theta1) * p.l1;
      const j1y = by + Math.sin(p.theta1) * p.l1;
      const ex = j1x + Math.cos(p.theta1 + p.theta2) * p.l2;
      const ey = j1y + Math.sin(p.theta1 + p.theta2) * p.l2;

      ctx.strokeStyle = isDark ? '#a1a1aa' : '#52525b';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(j1x, j1y); ctx.lineTo(ex, ey);
      ctx.stroke();

      // Draw Ball
      if (p.ball.active) {
        ctx.fillStyle = isDark ? '#f472b6' : '#db2777';
        ctx.beginPath();
        ctx.arc(p.ball.x, p.ball.y, p.ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isRunning, simulationSpeed, isDark]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};