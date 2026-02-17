import React, { useRef, useEffect, useState } from 'react';
import { Point } from '../types';

interface RoboticArmProps {
  target: Point;
  isActive: boolean;
  isDark: boolean;
  onScoreUpdate?: (score: number) => void;
}

export const RoboticArm: React.FC<RoboticArmProps> = ({ target, isActive, isDark, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(isDark);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'ended'>('waiting');
  const [score, setScore] = useState(0);
  const [ballStartPos, setBallStartPos] = useState({ x: 0, y: 250 });

  // Sync ref for animation loop
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // Physics state refs
  const state = useRef({
    l1: 280,
    l2: 260,
    theta1: Math.PI / 2,
    theta2: Math.PI - 0.5,
    targetTheta1: Math.PI / 2,
    targetTheta2: Math.PI - 0.5,
  });

  // Ball physics state
  const ball = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 15,
    startX: 0,
    startY: 0,
    prevEEx: 0,
    prevEEy: 0,
  });

  const goal = useRef({
    x: 0,
    y: 40,
    width: 120,
    height: 50,
  });

  const startGame = () => {
    setGameState('playing');
    ball.current.vx = 0;
    ball.current.vy = 0;
  };

  const resetBall = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ball.current.x = ball.current.startX;
    ball.current.y = ball.current.startY;
    ball.current.vx = 0;
    ball.current.vy = 0;
    setGameState('waiting');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize ball position (right of center, near profile picture)
    const startX = canvas.width / 2 + 200;
    const startY = 250;
    ball.current.startX = startX;
    ball.current.startY = startY;
    ball.current.x = startX;
    ball.current.y = startY;
    setBallStartPos({ x: startX, y: startY });

    // Initialize goal position
    goal.current.x = canvas.width / 2 - goal.current.width / 2;

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
        // Reposition ball and goal on resize
        const startX = canvas.width / 2 + 200;
        const startY = 250;
        ball.current.startX = startX;
        ball.current.startY = startY;
        setBallStartPos({ x: startX, y: startY });
        if (gameState === 'waiting') {
          ball.current.x = startX;
          ball.current.y = startY;
        }
        goal.current.x = canvas.width / 2 - goal.current.width / 2;
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

      // Ball physics
      if (gameState === 'playing') {
        const gravity = 0.4;
        const damping = 0.98;
        
        ball.current.vy += gravity;
        ball.current.vx *= damping;
        ball.current.vy *= 0.995;
        
        ball.current.x += ball.current.vx;
        ball.current.y += ball.current.vy;

        // Collision with arm end effector
        const dist = Math.sqrt(
          (ball.current.x - eex) ** 2 + (ball.current.y - eey) ** 2
        );
        
        if (dist < ball.current.radius + 8) {
          const eeVx = eex - ball.current.prevEEx;
          const eeVy = eey - ball.current.prevEEy;
          
          const angle = Math.atan2(ball.current.y - eey, ball.current.x - eex);
          const force = Math.sqrt(eeVx ** 2 + eeVy ** 2) * 0.5;
          
          ball.current.vx += Math.cos(angle) * force + eeVx * 0.8;
          ball.current.vy += Math.sin(angle) * force + eeVy * 0.8;
          
          // Push ball away from collision
          const overlap = ball.current.radius + 8 - dist;
          ball.current.x += Math.cos(angle) * overlap;
          ball.current.y += Math.sin(angle) * overlap;
        }

        // Bounce off edges
        if (ball.current.x - ball.current.radius < 0) {
          ball.current.x = ball.current.radius;
          ball.current.vx *= -0.7;
        }
        if (ball.current.x + ball.current.radius > canvas.width) {
          ball.current.x = canvas.width - ball.current.radius;
          ball.current.vx *= -0.7;
        }
        if (ball.current.y - ball.current.radius < 0) {
          ball.current.y = ball.current.radius;
          ball.current.vy *= -0.7;
        }

        // Game over if ball touches bottom
        if (ball.current.y + ball.current.radius > canvas.height) {
          setGameState('ended');
          resetBall();
        }

        // Goal detection
        if (
          ball.current.x > goal.current.x &&
          ball.current.x < goal.current.x + goal.current.width &&
          ball.current.y - ball.current.radius < goal.current.y + goal.current.height &&
          ball.current.y + ball.current.radius > goal.current.y
        ) {
          setScore(prev => {
            const newScore = prev + 1;
            onScoreUpdate?.(newScore);
            return newScore;
          });
          resetBall();
        }
      }

      ball.current.prevEEx = eex;
      ball.current.prevEEy = eey;

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

      // Draw goal post
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(goal.current.x, goal.current.y, goal.current.width, goal.current.height);
      ctx.stroke();

      // Draw score
      ctx.fillStyle = theme.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`GOALS: ${score}`, canvas.width / 2, 25);

      // Draw ball
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball outline
      ctx.strokeStyle = isDarkRef.current ? '#fbbf24' : '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, isActive, gameState, score]); // isDark is handled via ref

  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-multiply dark:mix-blend-screen"
      />
      
      {/* Start button overlay on ball */}
      {gameState === 'waiting' && ballStartPos.x > 0 && (
        <button
          onClick={startGame}
          className="absolute z-10 pointer-events-auto"
          style={{
            left: `${ballStartPos.x}px`,
            top: `${ballStartPos.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="bg-accent-600 hover:bg-accent-500 dark:bg-accent-500 dark:hover:bg-accent-400 text-white font-mono text-sm px-4 py-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white dark:border-zinc-900">
            START
          </div>
        </button>
      )}
    </>
  );
};