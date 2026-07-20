import { initSentry } from "./sentry";
initSentry();
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import 'leaflet/dist/leaflet.css';
import './styles/fonts.css';
import './styles/theme.css';
import './styles/tailwind.css';
import './styles/index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(

  <App />

);