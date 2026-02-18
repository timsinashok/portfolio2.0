import React from 'react';
import { motion } from 'framer-motion';

export const Writing: React.FC = () => {
  return (
    <div className="pt-40 pb-24 px-6 md:px-12 max-w-5xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-medium text-zinc-900 dark:text-zinc-100 mb-16">Writing</h2>
        
        <div className="space-y-8 text-center mt-24">
          <p className="text-4xl md:text-5xl text-zinc-800 dark:text-zinc-200 font-medium">
            Writing in progress.
          </p>
          <p className="text-xl text-zinc-600 dark:text-zinc-500">
            Notes on autonomy, safety, and the practical edges of applied ML.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Failure modes in real-world robotics', status: 'Drafting' },
            { title: 'How I evaluate model robustness', status: 'Outlining' },
            { title: 'Systems notes from field deployments', status: 'Collecting' },
          ].map(item => (
            <div
              key={item.title}
              className="border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-sm p-6 text-left"
            >
              <div className="text-sm font-mono text-zinc-500 mb-3">{item.status}</div>
              <div className="text-lg text-zinc-900 dark:text-zinc-100 font-medium leading-snug">{item.title}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
