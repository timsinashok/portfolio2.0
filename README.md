# Ashok Timsina - Portfolio

A high-end, minimalist portfolio showcasing applied AI and robotics engineering work. Built with React, TypeScript, and Framer Motion, featuring **interactive inverse kinematics** and a clean, systems-focused design.

## ✨ Features

- **Interactive Robotic Arm** - Real-time inverse kinematics simulation on the home page that follows your cursor
- **Project Showcase** - Detailed case studies of AI/ML and robotics systems work
- **Experiments Page** - Interactive demos and technical explorations
- **Writing Section** - Technical blog posts and essays
- **Dark/Light Mode** - Seamless theme switching with persistent preferences
- **Smooth Animations** - Polished interactions powered by Framer Motion
- **Responsive Design** - Optimized for all screen sizes

## 🛠️ Tech Stack

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v7
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Styling:** Modern CSS with CSS variables for theming

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The optimized production build will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
portfolio/
├── components/          # Reusable React components
│   ├── Layout.tsx      # Main layout wrapper with navigation
│   ├── RoboticArm.tsx  # Static robotic arm visualization
│   └── RoboticArmInteractive.tsx  # Interactive IK simulation
├── pages/              # Route pages
│   ├── Home.tsx        # Landing page with interactive arm
│   ├── Work.tsx        # Project gallery
│   ├── WorkDetail.tsx  # Individual project case studies
│   ├── Writing.tsx     # Blog posts and essays
│   └── Experiments.tsx # Interactive demos
├── lib/
│   └── data.ts         # Project data and content
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main app component with routing
└── index.tsx           # Application entry point
```

## 🎯 Key Projects Featured

- **Clinical Trial Protocol Risk Copilot** - Healthcare NLP system reducing protocol amendments by 14%
- **Future-aware Hazard Prediction** - Lightweight world model for autonomous forklift trajectory forecasting
- **Multi-tenant B2B Data Platform** - Scalable infrastructure handling 50M daily events
- **Sim-to-real Stress Testing Suite** - Robotics simulation pipeline with 88% zero-shot transfer
- **Options Strategy Automation** - Deterministic state machine for volatility arbitrage

## 🎨 Customization

### Updating Projects

Edit the `PROJECTS` array in [lib/data.ts](lib/data.ts) to add or modify project showcases.

### Theming

Colors and styling variables are managed through CSS custom properties. Update theme values in your global styles or component-specific CSS.

### Adding New Pages

1. Create a new component in the `pages/` directory
2. Add the route in [App.tsx](App.tsx)
3. Update navigation in [components/Layout.tsx](components/Layout.tsx)

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contact

Built by **Ashok Timsina** - Applied AI & Robotics Engineer

- GitHub: [@ashoktimsina](https://github.com/ashoktimsina)
- LinkedIn: [linkedin.com/in/ashoktimsina](https://linkedin.com/in/ashoktimsina)
- Twitter: [@ashoktimsina](https://twitter.com/ashoktimsina)

---

<div align="center">
  <sub>Built with ❤️ using React, TypeScript, and Vite</sub>
</div>
