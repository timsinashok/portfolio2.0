import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
             I build scalable, AI-powered systems that solve meaningful problems and optimize human experiences.
           </h1>
        </div>

        {/* Columns: Building / Interests */}
        <div className="md:col-span-12">
          <div className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-950/90 dark:to-zinc-900/80 px-6 py-6 md:px-8 md:py-7 shadow-sm">
            <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_top,_#38bdf8_0,_transparent_55%),radial-gradient(circle_at_bottom,_#a855f7_0,_transparent_55%)]" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              <div className="space-y-3">
                <h3 className="text-xs md:text-sm font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.22em]">
                  Currently Building
                </h3>
                <ul className="space-y-2.5 text-zinc-800 dark:text-zinc-200 font-light text-sm md:text-base">
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500 shadow-[0_0_0_4px_rgba(59,130,246,0.18)]" />
                    <span>Sample-efficient offline RL algorithms</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Trace Robotics: evaluation infrastructure for robot foundation models</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Confyde AI: AI-powered saas for clinical trials</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Vibe coder&apos;s keyboard</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs md:text-sm font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.22em]">
                  Current Interests
                </h3>
                <ul className="space-y-2.5 text-zinc-700 dark:text-zinc-300 font-light text-sm md:text-base">
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Planning using state-only data</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Data-collection pipelines for robotics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Evaluation frameworks for foundation robot policies</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500/80" />
                    <span>Applied AI solutions for real-world problem solving</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* New Section: Current Involvement */}
        <div className="md:col-span-12 mt-9 pt-9 border-t border-zinc-200 dark:border-zinc-800">
           <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Current Involvement</h3>
           <div className="flex flex-col gap-6">
              <a
                href="https://tracerobotics.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-md relative overflow-hidden group hover:border-accent-500/20 transition-colors shadow-sm"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500 opacity-80" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg md:text-xl text-zinc-900 dark:text-zinc-100 font-medium mb-3">
                      Trace Robotics <span className="text-zinc-500">• Founder</span>
                    </h4>
                    <p className="text-base text-zinc-600 dark:text-zinc-300 font-light leading-relaxed">
                      Developing diagnostic and robustness evaluation tools for robot policies, stress-testing real-world deployment conditions.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mt-1 group-hover:translate-x-1 group-hover:text-accent-500 transition-all" />
                </div>
              </a>

              <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-md relative overflow-hidden group hover:border-accent-500/20 transition-colors shadow-sm">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500 opacity-80" />
                <h4 className="text-lg md:text-xl text-zinc-900 dark:text-zinc-100 font-medium mb-3">
                  NYUAD Deep Learning Lab <span className="text-zinc-500">• Deep Learning Researcher</span>
                </h4>
                <p className="text-base text-zinc-600 dark:text-zinc-300 font-light leading-relaxed">
                  Researching learning from state-only data and building sample-efficient offline RL and world-model pipelines for robot learning.
                </p>
              </div>

              <a
                href="https://confyde.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 rounded-md relative overflow-hidden group hover:border-accent-500/20 transition-colors shadow-sm"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500 opacity-80" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg md:text-xl text-zinc-900 dark:text-zinc-100 font-medium mb-3">
                      Confyde.ai <span className="text-zinc-500">• Founding Engineer, Backend & AI</span>
                    </h4>
                    <p className="text-base text-zinc-600 dark:text-zinc-300 font-light leading-relaxed">
                      Building scalable AI backends and agent orchestration for pharma market research, from data pipelines to deployed services.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mt-1 group-hover:translate-x-1 group-hover:text-accent-500 transition-all" />
                </div>
              </a>
           </div>
        </div>
      </motion.div>

      <div className="mt-14 mb-16 border-t border-zinc-200 dark:border-zinc-800" />

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
