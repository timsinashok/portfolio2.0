import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PROJECTS } from '../lib/data';
import { Project } from '../types';

export const Work: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggleProject = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
  };

  return (
    <div className="min-h-screen w-full pt-40 pb-24 px-6 md:px-20 max-w-7xl mx-auto">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-18 grid grid-cols-1 md:grid-cols-12 gap-12"
      >
        {/* Intro Paragraph */}
        <div className="md:col-span-12 mb-6">
           <h1 className="text-4xl md:text-5xl font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
             I think robots will win the world in 2 years.
           </h1>
        </div>

        {/* Columns: Building / Interests */}
        <div className="md:col-span-5 space-y-4">
           <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Currently Building</h3>
           <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 font-light text-base">
             <li className="flex items-center gap-4">
                <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
                Teleoperation Latency Solver
             </li>
             <li>Rust-based Vision Pipeline</li>
             <li>Multi-agent RL Environment</li>
           </ul>
        </div>

        <div className="md:col-span-5 space-y-4">
           <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest">Current Interests</h3>
           <ul className="space-y-2 text-zinc-600 dark:text-zinc-400 font-light text-base">
             <li>Sim2Real Transfer</li>
             <li>Neuromorphic Computing</li>
             <li>Industrial Automation</li>
           </ul>
        </div>

        {/* New Section: Current Involvement */}
        <div className="md:col-span-12 mt-9 pt-9 border-t border-zinc-200 dark:border-zinc-800">
           <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Current Involvement</h3>
           <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 rounded-md relative overflow-hidden group hover:border-accent-500/20 transition-colors shadow-sm">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500 opacity-80" />
              <h4 className="text-lg md:text-xl text-zinc-900 dark:text-zinc-100 font-medium mb-4">
                 Principal Systems Engineer at <span className="text-zinc-500">Stealth Robotics Co.</span>
              </h4>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-300 font-light max-w-4xl leading-relaxed">
                 Leading the autonomous navigation stack for warehouse logistics. Specifically focused on solving the 'frozen robot' problem in high-density human environments using predictive world models and lightweight edge inference.
              </p>
           </div>
        </div>
      </motion.div>

      {/* Projects Title */}
      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.2 }}
         className="mb-16 flex items-center gap-6"
      >
        <h2 className="text-2xl md:text-3xl font-medium text-zinc-900 dark:text-zinc-100">Selected Projects</h2>
        <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800 mt-2"></div>
      </motion.div>

      {/* Projects List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-20"
      >
        {PROJECTS.map((project) => (
          <ProjectItem 
            key={project.id} 
            project={project} 
            isOpen={selectedId === project.id}
            onClick={() => toggleProject(project.id)}
          />
        ))}
      </motion.div>
    </div>
  );
};

const ProjectItem: React.FC<{ project: Project; isOpen: boolean; onClick: () => void }> = ({ project, isOpen, onClick }) => {
  return (
    <div className="group border-b border-zinc-200 dark:border-zinc-800 pb-16 last:border-0">
      <div 
        onClick={onClick}
        className="cursor-pointer block md:flex gap-12 items-start transition-opacity duration-300 hover:opacity-100 opacity-90"
      >
        {/* Visual Anchor / Image */}
        <div className="w-full md:w-80 h-48 bg-zinc-200 dark:bg-zinc-900 mb-8 md:mb-0 overflow-hidden relative border border-zinc-300 dark:border-zinc-800 rounded-sm shrink-0 shadow-sm">
          <img 
            src={project.imageUrl} 
            alt={project.title} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out opacity-80 group-hover:opacity-100"
          />
          {/* Overlay for "systems" feel */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-zinc-950/80 to-transparent opacity-40 pointer-events-none" />
        </div>

        {/* Content */}
        <div className="flex-1 w-full">
          <div className="flex justify-between items-baseline mb-4">
             <h2 className="text-2xl md:text-3xl font-medium text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-accent-600 dark:group-hover:text-accent-500 transition-colors">
               {project.title}
             </h2>
             <span className="text-accent-600 dark:text-accent-500 text-2xl transform transition-transform duration-300 font-light select-none">
               {isOpen ? '−' : '+'}
             </span>
          </div>
          
          <p className="text-zinc-600 dark:text-zinc-400 text-base font-light tracking-wide mb-6 max-w-3xl leading-relaxed">
            {project.description}
          </p>

          <div className="flex gap-6 mb-6">
            {project.links.github && (
              <a href={project.links.github} className="text-sm font-mono text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-2" onClick={e => e.stopPropagation()}>
                 GITHUB
              </a>
            )}
            {project.links.demo && (
              <a href={project.links.demo} className="text-sm font-mono text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-2" onClick={e => e.stopPropagation()}>
                 DEMO
              </a>
            )}
            {project.links.writeup && (
              <a href={project.links.writeup} className="text-sm font-mono text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-2" onClick={e => e.stopPropagation()}>
                 CASE STUDY
              </a>
            )}
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800/50 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <ul className="space-y-4">
                        {project.longDescription.map((desc, i) => (
                          <li key={i} className="text-base text-zinc-700 dark:text-zinc-400 font-light pl-6 relative before:content-[''] before:absolute before:left-0 before:top-2.5 before:w-1.5 before:h-1.5 before:bg-accent-500/50 before:rounded-full leading-relaxed">
                            {desc}
                          </li>
                        ))}
                      </ul>
                      
                      <div>
                        <span className="text-sm font-mono text-zinc-500 uppercase tracking-widest block mb-4">Technology Stack</span>
                        <div className="flex flex-wrap gap-3">
                            {project.tech.map(t => (
                            <span key={t} className="text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 rounded bg-zinc-100 dark:bg-zinc-900/50">
                                {t}
                            </span>
                            ))}
                        </div>
                      </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};