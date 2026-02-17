import React, { useRef, useEffect } from 'react';
import { Point } from '../types';

interface RoboticArmProps {
  target: Point;
  isActive: boolean;
  isDark: boolean;
}

export const RoboticArm: React.FC<RoboticArmProps> = ({ target, isActive, isDark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(isDark);

  // Sync ref for animation loop
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // Physics state refs
  const state = useRef({
    l1: 160,
    l2: 140,
    theta1: Math.PI / 2,
    theta2: Math.PI - 0.5,
    targetTheta1: Math.PI / 2,
    targetTheta2: Math.PI - 0.5,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const solveIK = (x: number, y: number) => {
      const bx = canvas.width / 2;
      const by = canvas.height;
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
      const cosBeta = (dist * dist + state.current.l1 * state.current.l1 - state.current.l2 * state.current.l2) / (2 * dist * state.current.l1);
      const clampedCosBeta = Math.max(-1, Math.min(1, cosBeta));
      const beta = Math.acos(clampedCosBeta);
      
      let t1 = alpha - beta; 

      const cosGamma = (state.current.l1 * state.current.l1 + state.current.l2 * state.current.l2 - dist * dist) / (2 * state.current.l1 * state.current.l2);
      const clampedCosGamma = Math.max(-1, Math.min(1, cosGamma));
      const gamma = Math.acos(clampedCosGamma);
      
      let t2 = Math.PI - gamma; 

      return { theta1: t1, theta2: t2 };
    };

    const render = () => {
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const speed = 0.08; 
      
      if (!isActive) {
         const rest = solveIK(canvas.width / 2, canvas.height + 100);
         state.current.targetTheta1 = rest.theta1;
         state.current.targetTheta2 = rest.theta2;
      } else {
         const solution = solveIK(target.x, target.y);
         state.current.targetTheta1 = solution.theta1;
         state.current.targetTheta2 = solution.theta2;
      }

      state.current.theta1 += (state.current.targetTheta1 - state.current.theta1) * speed;
      state.current.theta2 += (state.current.targetTheta2 - state.current.theta2) * speed;

      const bx = canvas.width / 2;
      const by = canvas.height;
      const j1x = bx + Math.cos(state.current.theta1) * state.current.l1;
      const j1y = by + Math.sin(state.current.theta1) * state.current.l1;
      const eex = j1x + Math.cos(state.current.theta1 + state.current.theta2) * state.current.l2;
      const eey = j1y + Math.sin(state.current.theta1 + state.current.theta2) * state.current.l2;

      // COLORS BASED ON THEME
      const theme = isDarkRef.current ? {
        stroke: '#525252',
        jointFill: '#18181b',
        jointStroke: '#71717a',
        accent: '#f59e0b'
      } : {
        stroke: '#a1a1aa',
        jointFill: '#f4f4f5',
        jointStroke: '#52525b',
        accent: '#d97706'
      };

      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Base
      ctx.beginPath();
      ctx.arc(bx, by, 6, Math.PI, 0);
      ctx.stroke();

      // Arm Segment 1
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(j1x, j1y);
      ctx.stroke();

      // Joint 1
      ctx.beginPath();
      ctx.fillStyle = theme.jointFill;
      ctx.strokeStyle = theme.jointStroke;
      ctx.lineWidth = 1;
      ctx.arc(j1x, j1y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Arm Segment 2
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.stroke;
      ctx.moveTo(j1x, j1y);
      ctx.lineTo(eex, eey);
      ctx.stroke();

      // End Effector
      const globalAngle = state.current.theta1 + state.current.theta2;
      const gripLen = 15;
      
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.moveTo(eex, eey);
      ctx.lineTo(eex + Math.cos(globalAngle) * gripLen, eey + Math.sin(globalAngle) * gripLen);
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(eex + Math.cos(globalAngle) * gripLen, eey + Math.sin(globalAngle) * gripLen, 3, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, isActive]); // isDark is handled via ref

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-multiply dark:mix-blend-screen"
    />
  );
};