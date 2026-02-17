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
        
        <div className="space-y-8 text-center mt-32">
          <p className="text-4xl md:text-5xl text-zinc-800 dark:text-zinc-200 font-medium">
            Coming soon ......
          </p>
          <p className="text-xl text-zinc-600 dark:text-zinc-500 italic">
            procrastination is so real
          </p>
        </div>
      </motion.div>
    </div>
  );
};