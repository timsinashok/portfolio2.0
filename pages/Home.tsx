import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Github, Linkedin, Twitter } from 'lucide-react';
import { RoboticArm } from '../components/RoboticArm';
import { Point } from '../types';

export const Home: React.FC = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [target, setTarget] = useState<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  const handleInteraction = (e: React.PointerEvent) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    setTarget({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden flex flex-col justify-center items-center"
      onPointerMove={handleInteraction}
      onPointerDown={handleInteraction}
      tabIndex={0}
    >
      {/* Content Layer */}
      <div className="z-20 text-center max-w-5xl px-6 relative pointer-events-none">
        
        {/* Portrait Placeholder */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-40 h-40 mx-auto mb-7 pointer-events-auto group cursor-pointer"
        >
          <div className="w-full h-full rounded-full border-2 border-zinc-400 dark:border-zinc-600 group-hover:border-accent-500 group-hover:border-4 transition-all duration-300 p-1.5 bg-transparent">
            <div className="w-full h-full rounded-full overflow-hidden relative">
              <img src="/profile.jpeg" alt="Profile" className="w-full h-full object-cover transition-all duration-300" />
              <div className="absolute inset-0 bg-accent-500/0 group-hover:bg-accent-500/30 rounded-full transition-all duration-300 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        <motion.h1 
          className="text-4xl md:text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 mb-6 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Innovating Intelligent systems that <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500">learn, reason and adapt</span> the world.
        </motion.h1>

        <motion.p 
          className="text-zinc-600 dark:text-zinc-400 text-lg md:text-2xl mb-9 font-light max-w-3xl mx-auto leading-normal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          Applied intelligence across healthcare, robotics, and infrastructure. <br className="hidden md:block"/>
        </motion.p>

        {/* CTA reveals on interaction */}
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: hasInteracted ? 1 : 0, y: hasInteracted ? 0 : 10 }}
           transition={{ duration: 0.6, delay: 0.2 }}
           className="pointer-events-auto flex flex-col items-center gap-8"
        >
          <Link 
            to="/work" 
            className="group inline-flex items-center gap-3 text-base font-medium text-accent-600 dark:text-accent-500 hover:text-accent-700 dark:hover:text-accent-600 transition-colors py-3 px-8 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm hover:border-accent-500/30 shadow-md"
          >
            <span>View selected work</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Social Links */}
          <div className="flex items-center gap-8 text-zinc-400 dark:text-zinc-500">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              <Github className="w-6 h-6" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              <Linkedin className="w-6 h-6" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              <Twitter className="w-6 h-6" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Interaction Hint (Fades out) */}
      <motion.div
        animate={{ opacity: hasInteracted ? 0 : 0.6 }}
        transition={{ duration: 1 }}
        className="absolute bottom-32 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-600 font-mono pointer-events-none z-20"
      >
        Interact to explore
      </motion.div>

      {/* Robotic Arm Layer */}
      <RoboticArm isActive={hasInteracted} target={target} isDark={isDark} />
      
    </div>
  );
};