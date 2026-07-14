/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/* ------------------------------------------------------------------ *
 * DOMAIN TYPES (template) — unchanged. Consumed across every panel.  *
 * ------------------------------------------------------------------ */

export type SeverityType = 'ninguna' | 'baja' | 'media' | 'alta';

export interface MipeData {
  plagaPrincipal: 'Arañita Roja' | 'Botrytis' | 'Mildiu Polvoso' | 'Trips' | 'Pulgón' | 'Ninguna';
  severidad: SeverityType;
  incidencia: number; // Porcentaje de plantas afectadas (0 - 100)
}

export interface MirfeData {
  ph: number; // Óptimo: 5.5 - 6.5
  ce: number; // Conductividad Eléctrica, Óptimo: 1.2 - 1.8 dS/m
  drenaje: number; // Porcentaje de drenaje, Óptimo: 20% - 35%
}

export interface ProduccionData {
  variedad: string; // Ej: Freedom, Explorer, Pink Floyd, Mondial
  meta: number; // Tallos semanales esperados
  real: number; // Tallos semanales cosechados
}

export interface HistoricoRegistro {
  semana: string; // Ej: "Sem 24", "Sem 25"
  ph: number;
  ce: number;
  incidencia: number;
  produccionReal: number;
}

export interface Cama {
  id: string; // Ej: "A-12"
  bloqueId: string; // Ej: "A"
  numero: number; // Ej: 12
  mipe: MipeData;
  mirfe: MirfeData;
  produccion: ProduccionData;
  historico: HistoricoRegistro[];
  ultimaActualizacion: string; // Fecha en formato ISO
}

export interface Bloque {
  id: string; // Ej: "A", "B", "C", "D"
  nombre: string; // Ej: "Bloque A (Rosas Rojas)"
  camas: Cama[];
}

export type VisualLayer = 'riesgo' | 'mipe' | 'mirfe' | 'produccion';

export interface PriorityAction {
  id: string;
  /** Identificador de negocio real de la cama (Cama.id / CAMAS_ID), p. ej. 'B-16-001'. */
  camaId: string;
  bloqueId: string;
  camaNumero: number;
  categoria: 'mipe' | 'mirfe' | 'produccion' | 'mixto';
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  fechaGeneracion: string;
}

/* ------------------------------------------------------------------ *
 * GIS ABSTRACTION LAYER (ArcGIS-agnostic)                            *
 *                                                                    *
 * These types make the app source-agnostic. Nothing below hardcodes  *
 * an ArcGIS Feature Layer URL or a field schema: the app talks to    *
 * generic keys (bedId, ph, ce, …) and the `GisFieldMap` translates   *
 * them to whatever field names your future Feature Service exposes.   *
 * ------------------------------------------------------------------ */

/**
 * Where the spatial/attribute data comes from.
 * - 'mock'            → in-memory seed data (BLOQUES_INICIALES) + localStorage.
 * - 'feature-service' → query a hosted ArcGIS Feature Service layer.
 * - 'webmap'          → load an ArcGIS Online Web Map by id.
 */
export type DataMode = 'mock' | 'feature-service' | 'webmap';

/**
 * Logical attribute → physical field-name mapping.
 * Keys are the fixed vocabulary the app consumes; values are the exact
 * field names in your Feature Service. Defaults (see GIS_CONFIG) use
 * generic internal names for the mock client-side layer. When you plug
 * in a real service you only change the *values* here.
 */
export interface GisFieldMap {
  bedId: string; // Ej: "A-3"  (identificador único de cama)
  blockId: string; // Ej: "A"
  blockName: string; // Ej: "Bloque A (Rosas Rojas - Freedom)"
  bedNumber: string; // Ej: 3
  variety: string; // Ej: "Freedom"
  pest: string; // MIPE - plaga principal
  severity: string; // MIPE - severidad
  incidence: string; // MIPE - incidencia (%)
  ph: string; // MIRFE - pH
  ce: string; // MIRFE - conductividad eléctrica
  drainage: string; // MIRFE - drenaje (%)
  productionTarget: string; // Producción - meta
  productionActual: string; // Producción - real
  lastUpdated: string; // Fecha de última actualización
}

/** How a dashboard metric is derived from a mapped field. */
export interface MetricDefinition {
  field: keyof GisFieldMap;
  aggregation: 'sum' | 'avg' | 'count' | 'mode';
  label: string;
}

/**
 * Maps each dashboard metric to a generic field + aggregation.
 * This is the `config.metrics.totalSalesField`-style indirection: point
 * a metric at a different mapped field without touching component code.
 */
export interface GisMetricsMap {
  productionCompliance: MetricDefinition; // % cumplimiento de producción
  avgPh: MetricDefinition; // pH promedio del cultivo
  avgCe: MetricDefinition; // CE promedio
  dominantPest: MetricDefinition; // plaga de mayor presencia
  riskIndex: MetricDefinition; // conteo de camas en riesgo
}

/** Optimal ranges + acceptable thresholds (typed shape of RANGOS_OPTISMOS). */
export interface GisThresholds {
  mirfe: {
    ph: { min: number; max: number; descripcion: string };
    ce: { min: number; max: number; descripcion: string };
    drenaje: { min: number; max: number; descripcion: string };
  };
  mipe: {
    incidenciaMaximaAceptable: number;
  };
  produccion: {
    eficienciaMinimaAceptable: number;
  };
}

/**
 * Single source of GIS configuration. Swap these placeholders for your
 * ArcGIS Online Web Map id or hosted Feature Service URL when ready.
 */
export interface GisConfig {
  mode: DataMode;
  portalUrl: string;
  webMapId: string;
  featureServiceUrl: string;
  layerId: number;
  /**
   * Título de la capa operacional a enlazar dentro del Web Map (modo 'webmap').
   * Se usa para localizar la capa de camas entre las capas del mapa cargado.
   */
  layerTitle: string;
  /**
   * URL del formulario Survey123 para registrar bitácoras de monitoreo.
   * Se abre en una pestaña nueva desde el dossier de cama.
   */
  survey123Url: string;
  apiKey: string;
  basemap: string;
  center: [number, number]; // [lon, lat]
  zoom: number;
  fieldMap: GisFieldMap;
  metrics: GisMetricsMap;
  thresholds: GisThresholds;
}

/**
 * Flat attribute record for a bed feature. Field *names* are resolved at
 * runtime through GisFieldMap, so this is indexed by string. The upper-case
 * keys are precomputed symbology helpers written by the layer factory
 * (they let renderers stay simple and match against a stable schema).
 */
export interface CamaFeatureAttributes {
  [field: string]: string | number;
  OBJECTID: number;
  RISK_LEVEL: 'critico' | 'medio' | 'normal';
  MIRFE_FAILURES: number; // # de parámetros MIRFE fuera de rango (0-3)
  PROD_PCT: number; // % de cumplimiento de producción
}

/* ------------------------------------------------------------------ *
 * ArcGIS Web Component typing aliases                                 *
 *                                                                    *
 * `@arcgis/map-components` ships the global element interfaces and     *
 * augments React 19's JSX.IntrinsicElements (see src/vite-env.d.ts).  *
 * These aliases give us readable ref/event types in the components.    *
 * ------------------------------------------------------------------ */

/** DOM element type behind <arcgis-map ref={...} />. */
export type ArcgisMapElement = HTMLArcgisMapElement;

/**
 * Full event passed to the <arcgis-map onarcgisViewClick={...} /> handler.
 * It's a Lumina TargetedEvent whose `.detail` is the core ViewClick payload
 * (`.detail.x` / `.detail.y` screen coords, `.detail.mapPoint`, …).
 */
export type MapViewClickEvent = HTMLArcgisMapElement['arcgisViewClick'];

/** Full event passed when the underlying MapView ready state changes. */
export type MapViewReadyEvent = HTMLArcgisMapElement['arcgisViewReadyChange'];
