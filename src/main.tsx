import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Registrar los custom elements de ArcGIS que usa la app (self-registering).
import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';
import {setupArcgis} from './gis/setup';
import App from './App.tsx';
import './index.css';

// Configura credenciales/portal del SDK antes de renderizar.
setupArcgis();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
