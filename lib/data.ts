import { Project } from '../types';

export const PROJECTS: Project[] = [
  {
    id: 'sentinel-ai',
    title: 'Sentinel AI',
    category: 'World Models',
    description: 'Real-time accident prediction from CCTV using world models, with an NVIDIA model optimized 1800x for deployment speed.',
    longDescription: [
      'Optimized NVIDIA Cosmos 2.5 Predict by 1800x, cutting inference from 30 minutes to under 1 second.',
      'Re-engineered the model to operate in latent space, reaching 80% accuracy with only 1,500 videos.',
      'Delivered the end-to-end system in 36 hours for real-time CCTV risk forecasting.'
    ],
    imageUrl: '/images/sentinel.avif',
    tech: ['PyTorch', 'CUDA', 'World Models', 'CCTV'],
    links: { github: 'https://github.com/timsinashok/Sentinel-AI' }
  },
  {
    id: 'deepmesh',
    title: 'Deepmesh (MeshAI)',
    category: 'Market Research',
    description: 'Survey-as-software that automates design, targeting, and real-time insight generation; won a Y Combinator hackathon.',
    longDescription: [
      'Built an AI-powered market research platform that turns business objectives into research-grade surveys in minutes.',
      'Integrated a WhatsApp-based survey agent and orchestrated multi-turn conversations across text and voice.',
      'Extracted structured insights from responses to reduce time-to-insight from weeks to minutes.'
    ],
    imageUrl: '/images/mesh.avif',
    tech: ['FastAPI', 'LLMs', 'WhatsApp', 'PostgreSQL'],
    links: { github: 'https://github.com/timsinashok' }
  },
  {
    id: 'medbud',
    title: 'MedBud',
    category: 'Health Tech',
    description: 'Mobile app for interactive symptom tracking and insight generation.',
    longDescription: [
      'Built the backend with FastAPI and MongoDB for user symptom logs and analytics.',
      'Implemented Google OAuth with Firebase and deployed the service on Render.'
    ],
    imageUrl: '/images/medbud.jpg',
    tech: ['FastAPI', 'MongoDB', 'React Native', 'Firebase'],
    links: { github: 'https://github.com/timsinashok/medBud' }
  },
  {
    id: 'spexy',
    title: 'Spexy',
    category: 'Computer Vision',
    description: 'Glasses recommendation based on your face shape.',
    longDescription: [
      'Developed a full-stack app with React, FastAPI, and MongoDB.',
      'Integrated a YOLOv5-based face shape detector achieving 86% accuracy and deployed with Docker on GCP.'
    ],
    imageUrl: '/images/spexy.avif',
    tech: ['React', 'FastAPI', 'MongoDB', 'YOLOv5'],
    links: { github: 'https://github.com/timsinashok/spexy' }
  },
  {
    id: 'assignmeant',
    title: 'assignMeant',
    category: 'EdTech',
    description: 'Personalized assignment platform with LLM-powered grading.',
    longDescription: [
      'Prototyped a full-stack platform with a Flask backend and Llama-3-8B integration.',
      'Built an auto-grader using a fine-tuned LLM that reached 95% accuracy on grade-level math.'
    ],
    imageUrl: '/images/assignmeant.avif',
    tech: ['Flask', 'Llama-3-8B', 'Python', 'LLMs'],
    links: { github: 'https://github.com/timsinashok/assignmeant-mvp' }
  }
];
