import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/componentes.css';
import App from './App';

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('No se encontró el nodo #root');

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
