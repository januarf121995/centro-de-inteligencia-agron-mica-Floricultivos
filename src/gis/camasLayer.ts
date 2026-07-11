/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fábrica de la capa GIS de camas. Es el ÚNICO módulo con dependencias
 * directas de @arcgis/core. Todo lo específico de ArcGIS (geometría,
 * renderers, popups, cláusulas WHERE) vive aquí, resolviendo nombres de
 * campo a través de `config.fieldMap` para que funcione igual contra el
 * servicio real cuando lo conectes.
 */

import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import UniqueValueRenderer from '@arcgis/core/renderers/UniqueValueRenderer';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';
import PopupTemplate from '@arcgis/core/PopupTemplate';

import { Bloque, GisConfig, VisualLayer } from '../types';
import { camaToAttributes } from '../data';

/** Paleta alineada con los colores Tailwind usados en la UI original. */
const COLORS = {
  rose500: '#f43f5e',
  rose600: '#e11d48',
  amber500: '#f59e0b',
  emerald500: '#10b981',
  red600: '#dc2626',
  orange500: '#f97316',
  yellow400: '#facc15',
  slate300: '#cbd5e1',
  teal500: '#14b8a6',
  sky400: '#38bdf8',
  indigo600: '#4f46e5',
  blue500: '#3b82f6',
  white: '#ffffff',
};

/** Símbolo de relleno con contorno blanco (aspecto de "celda" de cama). */
function fill(color: string): SimpleFillSymbol {
  return new SimpleFillSymbol({
    color,
    outline: { color: COLORS.white, width: 1 },
  });
}

/**
 * Distribución espacial sintética: 4 bloques en una rejilla 2x2 alrededor
 * de `config.center`, cada bloque con sus camas en filas de 5 columnas.
 * Es determinista (misma cama → misma celda) y sólo se usa mientras no haya
 * geometría real; al conectar el Feature Service, la geometría vendrá de él.
 */
const CELL = 0.00018; // tamaño de celda en grados (~20 m)
const GAP = 0.00006; // separación entre celdas
const BLOCK_GAP = 0.0006; // separación entre bloques
const COLS = 5; // columnas de camas por bloque

function bedPolygon(
  center: [number, number],
  blockIndex: number,
  bedIndex: number
): Polygon {
  const [lon0, lat0] = center;

  // Origen de cada bloque en la rejilla 2x2 (col/fila del bloque).
  const bCol = blockIndex % 2;
  const bRow = Math.floor(blockIndex / 2);
  const blockOriginLon = lon0 + bCol * (COLS * (CELL + GAP) + BLOCK_GAP);
  const blockOriginLat = lat0 - bRow * (3 * (CELL + GAP) + BLOCK_GAP);

  // Posición de la cama dentro del bloque.
  const cCol = bedIndex % COLS;
  const cRow = Math.floor(bedIndex / COLS);
  const minLon = blockOriginLon + cCol * (CELL + GAP);
  const maxLat = blockOriginLat - cRow * (CELL + GAP);
  const maxLon = minLon + CELL;
  const minLat = maxLat - CELL;

  return new Polygon({
    rings: [
      [
        [minLon, minLat],
        [minLon, maxLat],
        [maxLon, maxLat],
        [maxLon, minLat],
        [minLon, minLat],
      ],
    ],
    spatialReference: { wkid: 4326 },
  });
}

/** Genera una Graphic (geometría + atributos) por cada cama. */
export function buildCamasGraphics(bloques: Bloque[], config: GisConfig): Graphic[] {
  const graphics: Graphic[] = [];
  let oid = 1;

  bloques.forEach((bloque, blockIndex) => {
    bloque.camas.forEach((cama, bedIndex) => {
      const attributes = camaToAttributes(cama, bloque, oid, config);
      graphics.push(
        new Graphic({
          geometry: bedPolygon(config.center, blockIndex, bedIndex),
          attributes,
        })
      );
      oid++;
    });
  });

  return graphics;
}

/** Definición de campos de la capa cliente, derivada del fieldMap. */
function buildFields(config: GisConfig) {
  const f = config.fieldMap;
  return [
    { name: 'OBJECTID', alias: 'OBJECTID', type: 'oid' as const },
    { name: f.bedId, alias: 'Cama', type: 'string' as const },
    { name: f.blockId, alias: 'Bloque', type: 'string' as const },
    { name: f.blockName, alias: 'Nombre Bloque', type: 'string' as const },
    { name: f.bedNumber, alias: 'Número', type: 'integer' as const },
    { name: f.variety, alias: 'Variedad', type: 'string' as const },
    { name: f.pest, alias: 'Plaga', type: 'string' as const },
    { name: f.severity, alias: 'Severidad', type: 'string' as const },
    { name: f.incidence, alias: 'Incidencia', type: 'double' as const },
    { name: f.ph, alias: 'pH', type: 'double' as const },
    { name: f.ce, alias: 'CE', type: 'double' as const },
    { name: f.drainage, alias: 'Drenaje', type: 'double' as const },
    { name: f.productionTarget, alias: 'Meta', type: 'integer' as const },
    { name: f.productionActual, alias: 'Real', type: 'integer' as const },
    { name: f.lastUpdated, alias: 'Actualizado', type: 'string' as const },
    { name: 'RISK_LEVEL', alias: 'Nivel de Riesgo', type: 'string' as const },
    { name: 'MIRFE_FAILURES', alias: 'Fallas MIRFE', type: 'integer' as const },
    { name: 'PROD_PCT', alias: '% Producción', type: 'double' as const },
  ];
}

/**
 * Construye la FeatureLayer del lado cliente a partir de los bloques.
 * (Cuando conectes el servicio real, este mismo pipeline de renderers /
 * popup / búsqueda se aplica sobre la capa remota sin cambios de UI.)
 */
export function buildCamasLayer(bloques: Bloque[], config: GisConfig): FeatureLayer {
  const graphics = buildCamasGraphics(bloques, config);

  return new FeatureLayer({
    id: 'camas-layer',
    title: 'Camas del Cultivo',
    source: graphics,
    objectIdField: 'OBJECTID',
    geometryType: 'polygon',
    spatialReference: { wkid: 4326 },
    fields: buildFields(config),
    renderer: getRendererForLayer('riesgo', config),
    popupTemplate: buildPopupTemplate(config),
  });
}

/* ------------------------------------------------------------------ *
 * Expresiones Arcade                                                  *
 *                                                                    *
 * Los renderers computan el color a partir de los CAMPOS REALES de la *
 * capa (PH, CE, DRENAJE, SEVERIDAD, PRODUCCION…) mediante Arcade, en   *
 * vez de depender de campos precalculados. Así funcionan igual sobre  *
 * la capa del Web Map que sobre la capa sintética, y replican la      *
 * lógica de calcularRiesgoCama / contarFallasMirfe / % de producción. *
 * ------------------------------------------------------------------ */

/** `$feature['NAME']` seguro para nombres de campo dinámicos. */
const feat = (name: string) => `$feature['${name}']`;

/** Arcade: nivel de riesgo integrado → 'critico' | 'medio' | 'normal'. */
function riskArcade(config: GisConfig): string {
  const f = config.fieldMap;
  const t = config.thresholds;
  return `
    var sev = Lower(DefaultValue(${feat(f.severity)}, 'ninguna'));
    var score = 0;
    if (sev == 'alta') { score += 3; }
    else if (sev == 'media') { score += 2; }
    else if (sev == 'baja') { score += 1; }
    var inc = ${feat(f.incidence)};
    if (!IsEmpty(inc) && inc > ${t.mipe.incidenciaMaximaAceptable}) { score += IIf(inc > 25, 2, 1); }
    var ph = ${feat(f.ph)};
    if (ph < 5.0 || ph > 7.0) { score += 2; } else if (ph < 5.5 || ph > 6.5) { score += 1; }
    var ce = ${feat(f.ce)};
    if (ce < 0.8 || ce > 2.2) { score += 2; } else if (ce < 1.2 || ce > 1.8) { score += 1; }
    var dr = ${feat(f.drainage)};
    if (dr < 15 || dr > 40) { score += 2; } else if (dr < 20 || dr > 35) { score += 1; }
    var meta = ${feat(f.productionTarget)};
    var real = ${feat(f.productionActual)};
    var pct = IIf(!IsEmpty(meta) && meta > 0, real / meta * 100, 100);
    if (pct < 75) { score += 2; } else if (pct < ${t.produccion.eficienciaMinimaAceptable}) { score += 1; }
    return IIf(score >= 5, 'critico', IIf(score >= 3, 'medio', 'normal'));
  `;
}

/** Arcade: nº de parámetros MIRFE fuera de rango (0-3). */
function mirfeFailuresArcade(config: GisConfig): string {
  const f = config.fieldMap;
  const m = config.thresholds.mirfe;
  return `
    var n = 0;
    var ph = ${feat(f.ph)}; if (ph < ${m.ph.min} || ph > ${m.ph.max}) { n += 1; }
    var ce = ${feat(f.ce)}; if (ce < ${m.ce.min} || ce > ${m.ce.max}) { n += 1; }
    var dr = ${feat(f.drainage)}; if (dr < ${m.drenaje.min} || dr > ${m.drenaje.max}) { n += 1; }
    return n;
  `;
}

/** Arcade: severidad MIPE normalizada a minúsculas. */
function severityArcade(config: GisConfig): string {
  return `return Lower(DefaultValue(${feat(config.fieldMap.severity)}, 'ninguna'));`;
}

/** Arcade: % de cumplimiento de producción. */
function prodPctArcade(config: GisConfig): string {
  const f = config.fieldMap;
  return `
    var meta = ${feat(f.productionTarget)};
    var real = ${feat(f.productionActual)};
    return IIf(!IsEmpty(meta) && meta > 0, real / meta * 100, 100);
  `;
}

/**
 * Devuelve el renderer que replica la semántica de color de la UI original
 * para cada capa temática (riesgo / MIPE / MIRFE / producción), computando
 * los valores con Arcade sobre los campos reales de la capa.
 */
export function getRendererForLayer(
  activeLayer: VisualLayer,
  config: GisConfig
): UniqueValueRenderer | ClassBreaksRenderer {
  switch (activeLayer) {
    case 'riesgo':
      return new UniqueValueRenderer({
        valueExpression: riskArcade(config),
        valueExpressionTitle: 'Riesgo Integrado',
        defaultSymbol: fill(COLORS.emerald500),
        uniqueValueInfos: [
          { value: 'critico', label: 'Riesgo Crítico', symbol: fill(COLORS.rose500) },
          { value: 'medio', label: 'Riesgo Medio', symbol: fill(COLORS.amber500) },
          { value: 'normal', label: 'Estable', symbol: fill(COLORS.emerald500) },
        ],
      });

    case 'mipe':
      return new UniqueValueRenderer({
        valueExpression: severityArcade(config),
        valueExpressionTitle: 'Severidad (MIPE)',
        defaultSymbol: fill(COLORS.slate300),
        uniqueValueInfos: [
          { value: 'alta', label: 'Severidad Alta', symbol: fill(COLORS.red600) },
          { value: 'media', label: 'Severidad Media', symbol: fill(COLORS.orange500) },
          { value: 'baja', label: 'Severidad Baja', symbol: fill(COLORS.yellow400) },
          { value: 'ninguna', label: 'Sin Presencia', symbol: fill(COLORS.slate300) },
        ],
      });

    case 'mirfe':
      // 0 óptimo (teal), 1 alerta (sky), 2-3 crítico (indigo).
      return new ClassBreaksRenderer({
        valueExpression: mirfeFailuresArcade(config),
        valueExpressionTitle: 'Parámetros MIRFE fuera de rango',
        defaultSymbol: fill(COLORS.teal500),
        classBreakInfos: [
          { minValue: 0, maxValue: 0, label: 'Óptimo', symbol: fill(COLORS.teal500) },
          { minValue: 1, maxValue: 1, label: 'Alerta (1 parámetro)', symbol: fill(COLORS.sky400) },
          { minValue: 2, maxValue: 3, label: 'Crítico (múltiple)', symbol: fill(COLORS.indigo600) },
        ],
      });

    case 'produccion':
      // <75 crítico (rose), 75-89 regular (amber), >=90 óptimo (blue).
      return new ClassBreaksRenderer({
        valueExpression: prodPctArcade(config),
        valueExpressionTitle: '% de cumplimiento de producción',
        defaultSymbol: fill(COLORS.blue500),
        classBreakInfos: [
          { minValue: -Infinity, maxValue: 74.999, label: 'Crítica (<75%)', symbol: fill(COLORS.rose600) },
          { minValue: 75, maxValue: 89.999, label: 'Regular (75-89%)', symbol: fill(COLORS.amber500) },
          { minValue: 90, maxValue: Infinity, label: 'Óptima (>=90%)', symbol: fill(COLORS.blue500) },
        ],
      });
  }
}

/**
 * Popup que replica el tooltip enriquecido original (Cama, variedad, MIPE,
 * pH/CE, drenaje, rendimiento). Los campos se resuelven vía fieldMap.
 */
export function buildPopupTemplate(config: GisConfig): PopupTemplate {
  const f = config.fieldMap;
  return new PopupTemplate({
    title: `Cama {${f.bedId}} — {${f.variety}}`,
    // El % de rendimiento se calcula con Arcade (la capa real no trae PROD_PCT).
    expressionInfos: [
      {
        name: 'prodPct',
        title: 'Rendimiento (% meta)',
        expression: `
          var meta = ${feat(f.productionTarget)};
          var real = ${feat(f.productionActual)};
          return Round(IIf(!IsEmpty(meta) && meta > 0, real / meta * 100, 100));
        `,
      },
    ],
    content: [
      {
        type: 'fields',
        fieldInfos: [
          { fieldName: f.pest, label: 'Plaga Principal' },
          { fieldName: f.severity, label: 'Severidad' },
          { fieldName: f.ph, label: 'pH del Suelo' },
          { fieldName: f.ce, label: 'CE (dS/m)' },
          { fieldName: f.drainage, label: 'Drenaje (%)' },
          { fieldName: 'expression/prodPct', label: 'Rendimiento (% meta)' },
        ],
      },
    ],
  });
}

/**
 * Localiza la capa de camas dentro de un mapa ya cargado (Web Map). Busca
 * primero por título (config.layerTitle) y, como respaldo, por la URL del
 * servicio + layerId. `allLayers` aplana también las capas de grupos.
 */
export function findCamasLayer(map: __esri.Map, config: GisConfig): FeatureLayer | null {
  const isFeature = (l: __esri.Layer): l is FeatureLayer => l.type === 'feature';

  const byTitle = map.allLayers.find((l) => isFeature(l) && l.title === config.layerTitle);
  if (byTitle) return byTitle as FeatureLayer;

  const byUrl = map.allLayers.find(
    (l) => isFeature(l) && l.url === config.featureServiceUrl && l.layerId === config.layerId
  );
  return (byUrl as FeatureLayer) ?? null;
}

/**
 * Cláusula WHERE para el filtro de búsqueda (cama, variedad o plaga),
 * equivalente al filtrado por texto del mapa original.
 */
export function buildSearchWhere(searchQuery: string, config: GisConfig): string {
  const q = searchQuery.trim();
  if (!q) return '1=1';

  const f = config.fieldMap;
  const safe = q.replace(/'/g, "''").toUpperCase();
  const like = (field: string) => `UPPER(${field}) LIKE '%${safe}%'`;

  return [like(f.bedId), like(f.variety), like(f.pest)].join(' OR ');
}
