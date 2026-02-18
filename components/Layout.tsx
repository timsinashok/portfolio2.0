import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Mail, Plus, Sun, Moon } from 'lucide-react';

export const Layout: React.FC = () => {
  const location = useLocation();
  const isPlayground = location.pathname === '/experiments';
  const [contactOpen, setContactOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Toggle Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/work', label: 'Work' },
    { path: '/writing', label: 'Writing' },
    { path: '/experiments', label: 'Experiments' },
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-accent-500/30 selection:text-accent-500 relative bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500">
      
      {/* Global Texture & Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay"></div>
        
        {/* Enhanced Gradient Blobs for "Pop" */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-zinc-200/40 dark:bg-zinc-900/40 blur-[100px] transition-colors duration-700 mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-accent-500/5 dark:bg-accent-500/5 blur-[120px] transition-colors duration-700 mix-blend-normal" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-zinc-300/30 dark:bg-zinc-800/20 blur-[100px] transition-colors duration-700" />
      </div>

      {!isPlayground && (
        <header className="fixed top-0 left-0 w-full z-50 px-6 py-6 md:px-12 md:py-10 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-8">
            <NavLink to="/" className="block group">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-accent-500 transition-colors">
                Ashok Timsina
              </h1>
              <span className="text-sm text-zinc-500 font-mono">Systems / Robotics</span>
            </NavLink>
          </div>

          <div className="flex items-center gap-8 pointer-events-auto">
            <nav className="flex gap-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `text-lg font-medium transition-colors ${
                      isActive ? 'text-accent-500' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            
            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-accent-500 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow flex flex-col relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} 
            className="flex-grow flex flex-col"
          >
            <Outlet context={{ isDark }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {!isPlayground && (
        <div className="fixed bottom-0 w-full p-6 md:p-12 flex justify-between items-end pointer-events-none z-50">
          {/* Dynamic Counters */}
          <div className="font-mono text-xs md:text-sm text-zinc-600 dark:text-zinc-500 space-y-1">
             <Counter label="humans" initialValue={1421} updateInterval={null} />
             <Counter label="agents" initialValue={37} updateInterval={5000} />
          </div>

          {/* Contact Trigger */}
          <div className="pointer-events-auto relative">
             <AnimatePresence>
               {contactOpen && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 10 }}
                   className="absolute bottom-16 right-0 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl rounded-sm"
                 >
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">Leave a signal.</span>
                      <button onClick={() => setContactOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200">
                        <Plus className="rotate-45 w-5 h-5" />
                      </button>
                   </div>
                   <div className="space-y-4">
                     <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm">
                       <code className="text-sm text-zinc-600 dark:text-zinc-300">at5282@nyu.edu</code>
                       <button 
                         onClick={() => navigator.clipboard.writeText('at5282@nyu.edu')}
                         className="text-zinc-400 hover:text-accent-500 transition-colors"
                         aria-label="Copy email"
                       >
                         <Copy className="w-4 h-4" />
                       </button>
                     </div>
                     <a 
                       href="mailto:at5282@nyu.edu" 
                       className="block w-full text-center text-sm bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 py-3 font-medium hover:bg-accent-500 dark:hover:bg-accent-500 hover:text-white dark:hover:text-white transition-colors rounded-sm"
                     >
                       Open Mail Client
                     </a>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <button 
               onClick={() => setContactOpen(!contactOpen)}
               className={`w-14 h-14 flex items-center justify-center rounded-full border transition-all duration-300 ${
                 contactOpen 
                 ? 'border-accent-500 text-accent-500 bg-accent-500/10' 
                 : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-950'
               }`}
               aria-label="Contact"
             >
               {contactOpen ? <Mail className="w-5 h-5" /> : <span className="font-mono text-xl leading-none mb-2">...</span>}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Counter: React.FC<{ label: string; initialValue: number; updateInterval: number | null }> = ({ label, initialValue, updateInterval }) => {
  const [count, setCount] = React.useState(initialValue);

  React.useEffect(() => {
    if (!updateInterval) return;
    const interval = setInterval(() => {
       setCount(c => c + 1);
    }, updateInterval);
    return () => clearInterval(interval);
  }, [updateInterval]);

  return (
    <div className="flex items-center gap-6">
      <span className="opacity-50 text-xs md:text-sm">{label}</span>
      <span className="text-sm md:text-base">{count.toString().padStart(4, '0')}</span>
    </div>
  );
}
