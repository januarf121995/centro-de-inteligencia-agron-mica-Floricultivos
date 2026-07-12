import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Registrar los custom elements de ArcGIS que usa la app (self-registering).
import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';
// Registrar los componentes de Calcite Design System (estructura + controles).
import '@esri/calcite-components/components/calcite-shell';
import '@esri/calcite-components/components/calcite-panel';
import '@esri/calcite-components/components/calcite-card';
import '@esri/calcite-components/components/calcite-segmented-control';
import '@esri/calcite-components/components/calcite-segmented-control-item';
import '@esri/calcite-components/components/calcite-chip';
import '@esri/calcite-components/components/calcite-button';
import '@esri/calcite-components/components/calcite-dialog';
import '@esri/calcite-components/components/calcite-alert';
import '@esri/calcite-components/components/calcite-input';
import '@esri/calcite-components/components/calcite-input-number';
import '@esri/calcite-components/components/calcite-select';
import '@esri/calcite-components/components/calcite-option';
import '@esri/calcite-components/components/calcite-label';
import '@esri/calcite-components/components/calcite-icon';
import '@esri/calcite-components/components/calcite-notice';
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
