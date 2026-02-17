import { Project } from '../types';

export const PROJECTS: Project[] = [
  {
    id: 'clinical-risk',
    title: 'Clinical Trial Protocol Risk Copilot',
    category: 'Healthcare NLP',
    description: 'Reducing protocol amendments by 14% via hybrid RAG architecture.',
    longDescription: [
      'Problem: Protocol amendments cost pharma $2B/yr due to avoidable eligibility conflicts.',
      'Constraint: Must run on-prem (HIPAA) with interpretable citation chains.',
      'Decision: Hybrid RAG architecture + rule-based constraints engine over pure LLM.',
      'Outcome: Reduced protocol amendments by 14% in pilot phase.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3',
    tech: ['Python', 'LangChain', 'PostgreSQL', 'React'],
    links: { github: '#', demo: '#' }
  },
  {
    id: 'hazard-prediction',
    title: 'Future-aware Hazard Prediction',
    category: 'World Models',
    description: 'Lightweight state-space model for autonomous forklift trajectory forecasting.',
    longDescription: [
      'Problem: Autonomous forklifts freeze in complex warehouses, lowering throughput.',
      'Constraint: <50ms latency inference budget on edge hardware.',
      'Decision: Distilled Transformer into lightweight state-space model for trajectory forecasting.',
      'Outcome: 3x reduction in "ghost braking" events; deployed to 400+ units.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3',
    tech: ['PyTorch', 'C++', 'CUDA', 'ROS 2'],
    links: { github: '#', writeup: '#' }
  },
  {
    id: 'b2b-platform',
    title: 'Multi-tenant B2B Data Platform',
    category: 'Infrastructure',
    description: 'Scaling to 50M daily events with zero-downtime migration.',
    longDescription: [
      'Problem: Legacy system collapsed under high-frequency writes from IoT sensors.',
      'Constraint: Zero downtime migration required for enterprise SLAs.',
      'Decision: Vertical partitioning strategy with Supabase + Next.js Edge handling ingestion.',
      'Outcome: Scaled to 50M daily events with 99.99% uptime.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef526b0042a0?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3',
    tech: ['Next.js', 'Supabase', 'Redis', 'FastAPI'],
    links: { demo: '#' }
  },
  {
    id: 'sim-to-real',
    title: 'Sim-to-real Stress Testing Suite',
    category: 'Robotics',
    description: 'Increasing zero-shot transfer success from 60% to 88%.',
    longDescription: [
      'Problem: Simulation success rates correlated poorly with real-world grasping.',
      'Constraint: Limited physical hardware access for verification.',
      'Decision: Built domain-randomization pipeline focused on lighting and texture noise.',
      'Outcome: Increased zero-shot transfer success from 60% to 88%.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3',
    tech: ['Isaac Sim', 'Python', 'Docker', 'AWS'],
    links: { github: '#', writeup: '#' }
  },
  {
    id: 'quant-automation',
    title: 'Options Strategy Automation',
    category: 'Finance',
    description: 'Deterministic state machine for volatility arbitrage execution.',
    longDescription: [
      'Problem: Manual execution of volatility arbitrage was too slow for market shifts.',
      'Constraint: Absolute correctness required; no "hallucination" allowed in orders.',
      'Decision: Deterministic state machine core with ML only used for signal generation.',
      'Outcome: Automated 95% of trade execution flow with 0 errors.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1611974765270-ca12586343bb?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3',
    tech: ['Rust', 'Python', 'gRPC', 'TimescaleDB'],
    links: { github: '#' }
  }
];