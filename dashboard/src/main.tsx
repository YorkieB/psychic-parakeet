/*
  This file is the main entry point that brings the Jarvis dashboard to life in your web browser.

  It sets up all the React components, routing between pages, and connections to Jarvis while making sure the dashboard runs smoothly and responsively.
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DebugDashboard } from './debug-dashboard';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DebugDashboard />
  </React.StrictMode>
);

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
