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
    theta1: Math.PI / 2,  // 90 degrees
    theta2: Math.PI / 4,  // 45 degrees
    targetTheta1: Math.PI / 2,
    targetTheta2: Math.PI / 4,
  });

  // Ball physics state
  const ball = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 30,  // Doubled from 15
    startX: 0,
    startY: 0,
    prevEEx: 0,
    prevEEy: 0,
  });

  const goal = useRef({
    x: 0,
    y: 40,
    width: 200,
    height: 60,
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
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;
    
    // Optimize canvas rendering for smoother animation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Initialize ball position (right of profile picture, vertically centered)
    const startX = canvas.width / 2 + 250;
    const startY = Math.min(canvas.height / 2, canvas.height/2 - 0.15*canvas.height ); // Match profile vertical center
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
        const startX = canvas.width / 2 + 250;
        const startY = Math.min(canvas.height / 2 - 50, 300);
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
      
      const speed = 0.12;  // Slightly faster for smoother response
      
      if (!isActive) {
         // Keep arm visible at default position (90° and 45°)
         state.current.targetTheta1 = Math.PI / 2;
         state.current.targetTheta2 = Math.PI / 4;
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
        const gravity = 0.22;  // Adjusted for larger ball
        const airResistance = 0.994;  // Smoother movement
        const bounceRestitution = 0.72;  // Better bounce for larger ball
        
        // Apply physics
        ball.current.vy += gravity;
        ball.current.vx *= airResistance;
        ball.current.vy *= airResistance;
        
        ball.current.x += ball.current.vx;
        ball.current.y += ball.current.vy;

        // Collision with arm end effector (adjusted for larger ball)
        const dist = Math.sqrt(
          (ball.current.x - eex) ** 2 + (ball.current.y - eey) ** 2
        );
        
        if (dist < ball.current.radius + 10) {
          // Calculate arm velocity
          const eeVx = eex - ball.current.prevEEx;
          const eeVy = eey - ball.current.prevEEy;
          const eeSpeed = Math.sqrt(eeVx ** 2 + eeVy ** 2);
          
          // Collision normal
          const angle = Math.atan2(ball.current.y - eey, ball.current.x - eex);
          
          // Velocity transfer for juggling
          const transferFactor = 1.3;
          ball.current.vx = Math.cos(angle) * eeSpeed * transferFactor + eeVx * 0.65;
          ball.current.vy = Math.sin(angle) * eeSpeed * transferFactor + eeVy * 0.65;
          
          // Push ball away from collision smoothly
          const overlap = ball.current.radius + 10 - dist;
          ball.current.x += Math.cos(angle) * (overlap + 2);
          ball.current.y += Math.sin(angle) * (overlap + 2);
        }

        // Bounce off edges with better energy preservation
        if (ball.current.x - ball.current.radius < 0) {
          ball.current.x = ball.current.radius;
          ball.current.vx *= -bounceRestitution;
        }
        if (ball.current.x + ball.current.radius > canvas.width) {
          ball.current.x = canvas.width - ball.current.radius;
          ball.current.vx *= -bounceRestitution;
        }
        if (ball.current.y - ball.current.radius < 0) {
          ball.current.y = ball.current.radius;
          ball.current.vy *= -bounceRestitution;
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
        stroke: '#f59e0b',  // Orange in dark mode
        jointFill: '#18181b',
        jointStroke: '#f59e0b',  // Orange joints
        accent: '#f59e0b'
      } : {
        stroke: '#d97706',  // Orange in light mode
        jointFill: '#f4f4f5',
        jointStroke: '#d97706',  // Orange joints
        accent: '#d97706'
      };

      ctx.strokeStyle = theme.stroke;
      ctx.lineWidth = 3;  // Slightly thicker for visibility
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
      ctx.lineWidth = 3;
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
      // Left vertical line
      ctx.moveTo(goal.current.x, goal.current.y + goal.current.height);
      ctx.lineTo(goal.current.x, goal.current.y);
      // Top horizontal line
      ctx.lineTo(goal.current.x + goal.current.width, goal.current.y);
      // Right vertical line
      ctx.lineTo(goal.current.x + goal.current.width, goal.current.y + goal.current.height);
      ctx.stroke();

      // Draw score
      ctx.fillStyle = theme.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`GOALS: ${score}`, canvas.width / 2, 25);

      // Draw ball (with different opacity based on game state)
      const ballOpacity = gameState === 'waiting' ? 1.0 : 0.7;
      ctx.globalAlpha = ballOpacity;
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Ball outline
      ctx.strokeStyle = isDarkRef.current ? '#fbbf24' : '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1.0; // Reset alpha

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
        style={{ willChange: 'transform' }}
      />
      
      {/* Start button overlay on ball */}
      {gameState === 'waiting' && ballStartPos.x > 0 && (
        <button
          onClick={startGame}
          className="absolute z-10 pointer-events-auto group"
          style={{
            left: `${ballStartPos.x}px`,
            top: `${ballStartPos.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="relative">
            {/* Ball circle */}
            <div className="w-[60px] h-[60px] rounded-full bg-accent-600 dark:bg-accent-500 border-2 border-accent-700 dark:border-accent-600 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl flex items-center justify-center">
              <span className="text-white font-mono text-xs font-bold tracking-tight">START</span>
            </div>
          </div>
        </button>
      )}
    </>
  );
};