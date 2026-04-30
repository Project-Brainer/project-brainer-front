import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/canvas.css';
import './styles/inspector.css';
import './styles/validation.css';
import './styles/simulation.css';
import './styles/prompt.css';
import './styles/branches.css';

import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
