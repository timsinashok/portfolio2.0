import React from 'react';
import { motion } from 'framer-motion';

const posts = [
  {
    title: 'The Unreasonable Effectiveness of Simple Control Loops',
    date: 'Oct 2023',
    readTime: '4 min',
    excerpt: 'Why we keep trying to replace PID controllers with neural networks, and why we should stop.'
  },
  {
    title: 'Safety is a System Property, Not a Component',
    date: 'Aug 2023',
    readTime: '6 min',
    excerpt: 'You cannot buy a safe AI model. You can only build a safe system that contains an AI model.'
  },
  {
    title: 'Notes on Real-World Robotics Deployment',
    date: 'May 2023',
    readTime: '5 min',
    excerpt: 'What breaks when your beautifully simulated robot touches actual dirt.'
  }
];

export const Writing: React.FC = () => {
  return (
    <div className="pt-40 pb-24 px-6 md:px-12 max-w-5xl mx-auto w-full">
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-medium text-zinc-900 dark:text-zinc-100 mb-16">Writing</h2>
        
        <div className="space-y-16">
          {posts.map((post, i) => (
            <motion.article 
              key={i} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="flex items-baseline justify-between text-sm font-mono text-zinc-500 mb-3">
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
              <h3 className="text-2xl md:text-4xl text-zinc-800 dark:text-zinc-200 group-hover:text-accent-600 dark:group-hover:text-accent-500 transition-colors font-medium mb-4">
                {post.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-500 text-xl leading-relaxed max-w-3xl">
                {post.excerpt}
              </p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </div>
  );
};