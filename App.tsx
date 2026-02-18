import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Work } from './pages/Work';
import { WorkDetail } from './pages/WorkDetail';
import { Writing } from './pages/Writing';
import { Experiments } from './pages/Experiments';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="work/:id" element={<WorkDetail />} />
          <Route path="writing" element={<Writing />} />
          <Route path="experiments" element={<Experiments />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
