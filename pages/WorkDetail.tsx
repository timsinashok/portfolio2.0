import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Github, Globe } from 'lucide-react';

export const WorkDetail: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="pt-40 pb-24 px-6 md:px-12 max-w-6xl mx-auto w-full">
      <Link to="/work" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 mb-12 text-base group transition-colors">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Index
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="font-mono text-accent-600 dark:text-accent-500 text-base mb-4 block">Case Study: {id}</span>
        <h1 className="text-5xl md:text-7xl font-medium text-zinc-900 dark:text-zinc-100 mb-6">
          System Architecture & Failure Modes
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-xl max-w-3xl">
          A field-tested autonomy stack designed for safe operation under uncertainty with clear, measurable failure boundaries.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-20">
          <div className="md:col-span-2 space-y-8 text-zinc-700 dark:text-zinc-400 leading-relaxed text-xl">
            <p>
              <strong className="text-zinc-900 dark:text-zinc-200">Overview:</strong> This project explored the intersection of deterministic safety guarantees and probabilistic model outputs. The core challenge was ensuring the system fails gracefully when the model encounters out-of-distribution inputs.
            </p>
            <p>
              We moved away from end-to-end learning approaches, opting instead for a modular architecture where the AI component acts as a "proposer" and a classical control stack acts as a "verifier". This allows us to bound the operational envelope mathematically.
            </p>
            
            <h3 className="text-zinc-900 dark:text-zinc-200 font-medium text-2xl mt-16 mb-6">Key Tradeoffs</h3>
            <ul className="list-disc list-outside ml-6 space-y-4 marker:text-zinc-400">
              <li>Sacrificed 5% peak throughput for verifiable safety bounds.</li>
              <li>Chose TypeScript/Rust hybrid over pure Python to enforce type safety at the API boundary.</li>
              <li>Implemented "human-in-the-loop" escalation for uncertainty scores {'>'}  0.8.</li>
            </ul>

             <h3 className="text-zinc-900 dark:text-zinc-200 font-medium text-2xl mt-16 mb-6">Robustness Analysis</h3>
             <ul className="list-disc list-outside ml-6 space-y-4 marker:text-zinc-400">
              <li>Tested against adversarial noise injection (Gaussian, Salt & Pepper).</li>
              <li>Simulated network partition scenarios to ensure local cache consistency.</li>
            </ul>
          </div>

          <div className="space-y-10">
             <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-sm">
               <h4 className="text-zinc-900 dark:text-zinc-200 font-medium mb-6 text-base">Artifacts</h4>
               <div className="space-y-4">
                 <a href="#" className="flex items-center gap-3 text-base text-zinc-600 dark:text-zinc-500 hover:text-accent-600 dark:hover:text-accent-500 transition-colors">
                   <Github className="w-5 h-5" />
                   Source (Partial)
                 </a>
                 <a href="#" className="flex items-center gap-3 text-base text-zinc-600 dark:text-zinc-500 hover:text-accent-600 dark:hover:text-accent-500 transition-colors">
                   <Globe className="w-5 h-5" />
                   Live Demo
                 </a>
               </div>
             </div>

             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-sm">
               <h4 className="text-zinc-900 dark:text-zinc-200 font-medium mb-6 text-base">Snapshot</h4>
               <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                 <li>Role: Systems Engineer</li>
                 <li>Focus: Safe motion planning</li>
                 <li>Timeline: 2023–2024</li>
               </ul>
             </div>

             <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500 dark:text-zinc-700 font-mono text-sm">Architecture Diagram</span>
             </div>
             <div className="aspect-video bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500 dark:text-zinc-700 font-mono text-sm">Performance Graph</span>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
