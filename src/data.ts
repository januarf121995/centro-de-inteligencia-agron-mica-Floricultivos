/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Bloque,
  Cama,
  PriorityAction,
  MipeData,
  MirfeData,
  ProduccionData,
  GisConfig,
  GisFieldMap,
  GisMetricsMap,
  GisThresholds,
  CamaFeatureAttributes,
} from './types';

/* ================================================================== *
 * 1. CONFIGURACIÓN GIS CENTRALIZADA (única fuente de verdad)         *
 *                                                                    *
 * Para conectar tu servicio real más adelante, edita SOLO este       *
 * objeto: define `webMapId` o `featureServiceUrl`, tu `apiKey`, y     *
 * ajusta los valores de `fieldMap` a los nombres de campo reales.     *
 * Ningún componente contiene URLs ni nombres de campo codificados.    *
 * ================================================================== */

/**
 * Mapa de atributos lógicos → nombres de campo físicos.
 * Ajustado al servicio real: capa 1 "Camas" de Demo_Floricultura_WFL1.
 * Campos reales: OBJECTID, CAMAS_ID, BLOQUE_ID, VARIEDAD, EDAD, PRODUCCION,
 * PRODUCCIONREAL, PLAGA_PPAL, AREA_M2, SEVERIDAD, PH, CE, DRENAJE, RIESGO, ESTADO.
 *
 * Los tres marcados como FALLBACK no tienen un campo dedicado en la capa;
 * apuntan a un campo real existente para que la consulta no falle. Ajústalos
 * si añades esos campos al servicio:
 *   - blockName: la capa "Camas" no trae nombre de bloque (está en la capa 2
 *     "Bloques"); usamos BLOQUE_ID como etiqueta.
 *   - bedNumber: no hay número de cama numérico; usamos OBJECTID.
 *   - incidence: no hay % de incidencia; usamos RIESGO como proxy numérico.
 *   - lastUpdated: no hay fecha; usamos ESTADO (texto).
 */
export const DEFAULT_FIELD_MAP: GisFieldMap = {
  bedId: 'CAMAS_ID',
  blockId: 'BLOQUE_ID',
  blockName: 'BLOQUE_ID', // FALLBACK (sin campo de nombre en la capa Camas)
  bedNumber: 'OBJECTID', // FALLBACK (sin número de cama dedicado)
  variety: 'VARIEDAD',
  pest: 'PLAGA_PPAL',
  severity: 'SEVERIDAD',
  incidence: 'RIESGO', // FALLBACK (sin % de incidencia; RIESGO como proxy)
  ph: 'PH',
  ce: 'CE',
  drainage: 'DRENAJE',
  productionTarget: 'PRODUCCION',
  productionActual: 'PRODUCCIONREAL',
  lastUpdated: 'ESTADO', // FALLBACK (sin campo de fecha)
};

/** Métricas del tablero mapeadas a campos genéricos + agregación. */
export const DEFAULT_METRICS_MAP: GisMetricsMap = {
  productionCompliance: { field: 'productionActual', aggregation: 'sum', label: 'Cumplimiento Producción' },
  avgPh: { field: 'ph', aggregation: 'avg', label: 'pH Promedio del Suelo' },
  avgCe: { field: 'ce', aggregation: 'avg', label: 'CE Promedio (dS/m)' },
  dominantPest: { field: 'pest', aggregation: 'mode', label: 'Plaga de Mayor Presencia' },
  riskIndex: { field: 'bedId', aggregation: 'count', label: 'Índice de Riesgo Agrícola' },
};

/** Rangos óptimos / umbrales aceptables para validación agronómica. */
export const DEFAULT_THRESHOLDS: GisThresholds = {
  mirfe: {
    ph: { min: 5.5, max: 6.5, descripcion: 'pH óptimo para absorción de nutrientes: 5.5 a 6.5' },
    ce: { min: 1.2, max: 1.8, descripcion: 'Conductividad Eléctrica óptima: 1.2 a 1.8 dS/m' },
    drenaje: { min: 20, max: 35, descripcion: 'Rango de drenaje óptimo: 20% a 35%' },
  },
  mipe: {
    incidenciaMaximaAceptable: 10, // Más de 10% de incidencia ya es alerta
  },
  produccion: {
    eficienciaMinimaAceptable: 90, // Menos de 90% del objetivo es alerta
  },
};

// Web Map oficial de ArcGIS Online ("Mapa Floricolas"): trae basemap,
// geometrías reales y las capas Camas (FeatureServer/1) y Bloques
// (FeatureServer/2). Con webMapId definido, la app opera en modo 'webmap':
// el <arcgis-map> carga el Web Map nativamente y la app consulta la capa
// "Camas" ya cargada como fuente única de verdad del tablero.
const WEB_MAP_ID = 'e8b44defaf834ebea3fc1cc2bd76b38f'; // ArcGIS Online Web Map
// URL/id de capa del servicio subyacente (respaldo para modo 'feature-service'
// y para localizar la capa por URL si el título cambiara).
const FEATURE_SERVICE_URL = 'https://services7.arcgis.com/pkwYm4SSxH1Qhdpb/arcgis/rest/services/Demo_Floricultura_WFL1/FeatureServer';

/** Deriva el modo de datos a partir de qué placeholder esté configurado. */
function resolveMode(webMapId: string, featureServiceUrl: string): GisConfig['mode'] {
  if (webMapId) return 'webmap';
  if (featureServiceUrl) return 'feature-service';
  return 'mock';
}

// La API key puede venir de una variable de entorno (Vite) o quedar vacía.
const API_KEY = (import.meta.env.VITE_ARCGIS_API_KEY as string | undefined) ?? '';

export const GIS_CONFIG: GisConfig = {
  mode: resolveMode(WEB_MAP_ID, FEATURE_SERVICE_URL),
  portalUrl: 'https://www.arcgis.com',
  webMapId: WEB_MAP_ID,
  featureServiceUrl: FEATURE_SERVICE_URL,
  layerId: 1, // Capa "Camas" del servicio (la capa 2 es "Bloques"); no existe la 0.
  layerTitle: 'Camas', // Capa operacional a enlazar dentro del Web Map.
  apiKey: API_KEY,
  // topo-vector requiere apiKey; sin ella usamos OpenStreetMap (sin credencial).
  basemap: API_KEY ? 'topo-vector' : 'osm',
  // Coordenadas aproximadas de una finca florícola (Cayambe, Ecuador). Ajustables.
  center: [-78.145, 0.04],
  zoom: 17,
  fieldMap: DEFAULT_FIELD_MAP,
  metrics: DEFAULT_METRICS_MAP,
  thresholds: DEFAULT_THRESHOLDS,
};

/**
 * Alias retrocompatible: los componentes existentes (FarmMap, BedDetail)
 * importan `RANGOS_OPTISMOS`. Ahora apunta a los umbrales configurables.
 */
export const RANGOS_OPTISMOS = GIS_CONFIG.thresholds;

/* ================================================================== *
 * 2. LÓGICA AGRONÓMICA (sin cambios de comportamiento)               *
 * ================================================================== */

/**
 * Calcula el puntaje de riesgo para una cama basándose en MIPE, MIRFE y Producción.
 * Retorna:
 * - 'critico' (Rojo) si el score acumulado es >= 5
 * - 'medio' (Amarillo) si el score acumulado está entre 3 y 4
 * - 'normal' (Verde) si el score es <= 2
 */
export function calcularRiesgoCama(
  cama: Omit<Cama, 'id' | 'bloqueId' | 'numero' | 'historico' | 'ultimaActualizacion'>
): 'critico' | 'medio' | 'normal' {
  let score = 0;

  // 1. Evaluación de MIPE (Sanidad)
  if (cama.mipe.severidad === 'alta') score += 3;
  else if (cama.mipe.severidad === 'media') score += 2;
  else if (cama.mipe.severidad === 'baja') score += 1;

  if (cama.mipe.incidencia > GIS_CONFIG.thresholds.mipe.incidenciaMaximaAceptable) {
    score += cama.mipe.incidencia > 25 ? 2 : 1;
  }

  // 2. Evaluación de MIRFE (Fertirriego)
  const { ph, ce, drenaje } = cama.mirfe;
  // Evaluación de pH
  if (ph < 5.0 || ph > 7.0) score += 2;
  else if (ph < 5.5 || ph > 6.5) score += 1;

  // Evaluación de CE
  if (ce < 0.8 || ce > 2.2) score += 2;
  else if (ce < 1.2 || ce > 1.8) score += 1;

  // Evaluación de Drenaje
  if (drenaje < 15 || drenaje > 40) score += 2;
  else if (drenaje < 20 || drenaje > 35) score += 1;

  // 3. Evaluación de Producción
  const porcentajeMeta = (cama.produccion.real / cama.produccion.meta) * 100;
  if (porcentajeMeta < 75) score += 2;
  else if (porcentajeMeta < GIS_CONFIG.thresholds.produccion.eficienciaMinimaAceptable) score += 1;

  if (score >= 5) return 'critico';
  if (score >= 3) return 'medio';
  return 'normal';
}

/** Nº de parámetros MIRFE fuera de rango óptimo (0-3). Usado por la simbología. */
export function contarFallasMirfe(mirfe: MirfeData, thresholds: GisThresholds = GIS_CONFIG.thresholds): number {
  const { ph, ce, drenaje } = mirfe;
  const phOut = ph < thresholds.mirfe.ph.min || ph > thresholds.mirfe.ph.max;
  const ceOut = ce < thresholds.mirfe.ce.min || ce > thresholds.mirfe.ce.max;
  const drenajeOut = drenaje < thresholds.mirfe.drenaje.min || drenaje > thresholds.mirfe.drenaje.max;
  return (phOut ? 1 : 0) + (ceOut ? 1 : 0) + (drenajeOut ? 1 : 0);
}

/* ================================================================== *
 * 3. DATOS SEMILLA (mock) — usados en modo 'mock'                     *
 * ================================================================== */

// Historial genérico para simular gráficos
const generarHistoricoDefecto = (phBase: number, ceBase: number, incBase: number, prodBase: number) => [
  { semana: 'Sem 24', ph: phBase - 0.2, ce: ceBase + 0.1, incidencia: incBase + 5, produccionReal: Math.round(prodBase * 0.85) },
  { semana: 'Sem 25', ph: phBase + 0.1, ce: ceBase - 0.1, incidencia: incBase + 2, produccionReal: Math.round(prodBase * 0.9) },
  { semana: 'Sem 26', ph: phBase - 0.1, ce: ceBase + 0.2, incidencia: incBase - 1, produccionReal: Math.round(prodBase * 0.93) },
  { semana: 'Sem 27', ph: phBase, ce: ceBase, incidencia: incBase, produccionReal: prodBase },
];

// Generar camas por bloque con casos de estudio realistas
const inicializarCamasBloque = (bloqueId: string, variedad: string, count = 15): Cama[] => {
  const camas: Cama[] = [];
  const fechaHoy = new Date().toISOString().split('T')[0];

  for (let i = 1; i <= count; i++) {
    // Parámetros por defecto estables
    let mipe: Cama['mipe'] = { plagaPrincipal: 'Ninguna', severidad: 'ninguna', incidencia: 0 };
    let mirfe: Cama['mirfe'] = { ph: 5.9, ce: 1.4, drenaje: 26 };
    let produccion: Cama['produccion'] = { variedad, meta: 3500, real: 3420 };

    // Bloque A - Foco de problemas MIPE (Plagas)
    if (bloqueId === 'A') {
      if (i === 3) {
        mipe = { plagaPrincipal: 'Arañita Roja', severidad: 'alta', incidencia: 28 };
        produccion = { variedad, meta: 3500, real: 2450 }; // Cae producción por daño foliáceo
      } else if (i === 4) {
        mipe = { plagaPrincipal: 'Arañita Roja', severidad: 'media', incidencia: 14 };
      } else if (i === 12) {
        mipe = { plagaPrincipal: 'Mildiu Polvoso', severidad: 'media', incidencia: 18 };
        mirfe = { ph: 6.2, ce: 1.5, drenaje: 18 }; // Drenaje bajo aumenta humedad
      }
    }

    // Bloque B - Foco de problemas MIRFE (Fertirriego)
    else if (bloqueId === 'B') {
      if (i === 7) {
        // pH sumamente ácido
        mirfe = { ph: 4.7, ce: 1.3, drenaje: 28 };
        produccion = { variedad, meta: 4000, real: 3600 };
      } else if (i === 8) {
        // CE por las nubes (toxicidad de sales) y drenaje saturado
        mirfe = { ph: 5.8, ce: 2.6, drenaje: 42 };
        produccion = { variedad, meta: 4000, real: 2800 }; // Pérdida de productividad
      } else if (i === 9) {
        // CE deficiente (pobreza de fertilizante)
        mirfe = { ph: 6.7, ce: 0.7, drenaje: 15 };
      }
    }

    // Bloque C - Foco de problemas de Producción Directa y Calidad
    else if (bloqueId === 'C') {
      if (i === 2) {
        // Cama envejecida o con brote de botrytis severo
        mipe = { plagaPrincipal: 'Botrytis', severidad: 'alta', incidencia: 35 };
        produccion = { variedad, meta: 3200, real: 1900 }; // Desempeño crítico
      } else if (i === 10) {
        produccion = { variedad, meta: 3200, real: 2200 }; // Sin plaga crítica pero rendimiento pobre
        mirfe = { ph: 5.4, ce: 1.1, drenaje: 21 }; // Ligeramente bajo nutrición
      }
    }

    // Bloque D - Caso mixto (Sinergia de problemas)
    else if (bloqueId === 'D') {
      if (i === 5) {
        // El peor caso: Trips altos + Fertirriego desbalanceado
        mipe = { plagaPrincipal: 'Trips', severidad: 'alta', incidencia: 24 };
        mirfe = { ph: 7.1, ce: 2.3, drenaje: 12 }; // pH alcalino frena asimilación + poca hidratación
        produccion = { variedad, meta: 3800, real: 2100 };
      } else if (i === 11) {
        mipe = { plagaPrincipal: 'Pulgón', severidad: 'media', incidencia: 12 };
        mirfe = { ph: 5.3, ce: 1.5, drenaje: 38 }; // Exceso de humedad favorece pulgones
      }
    }

    camas.push({
      id: `${bloqueId}-${i}`,
      bloqueId,
      numero: i,
      mipe,
      mirfe,
      produccion,
      historico: generarHistoricoDefecto(mirfe.ph, mirfe.ce, mipe.incidencia, produccion.real),
      ultimaActualizacion: fechaHoy,
    });
  }

  return camas;
};

// Cargar Bloques Iniciales
export const BLOQUES_INICIALES: Bloque[] = [
  {
    id: 'A',
    nombre: 'Bloque A (Rosas Rojas - Freedom)',
    camas: inicializarCamasBloque('A', 'Freedom', 15),
  },
  {
    id: 'B',
    nombre: 'Bloque B (Rosas Rosadas - Explorer)',
    camas: inicializarCamasBloque('B', 'Explorer', 15),
  },
  {
    id: 'C',
    nombre: 'Bloque C (Rosas Blancas - Mondial)',
    camas: inicializarCamasBloque('C', 'Mondial', 15),
  },
  {
    id: 'D',
    nombre: 'Bloque D (Variedades Especiales - Pink Floyd)',
    camas: inicializarCamasBloque('D', 'Pink Floyd', 15),
  },
];

/* ================================================================== *
 * 4. MAPEO ATRIBUTOS ↔ DOMINIO (único lugar que resuelve nombres)    *
 *                                                                    *
 * camaToAttributes / attributesToCama son la frontera entre el       *
 * modelo de dominio de la app y el esquema físico del servicio GIS.  *
 * Cambia GisFieldMap y todo el pipeline (capa, renderers, popup,     *
 * búsqueda, providers) sigue funcionando sin tocar componentes.       *
 * ================================================================== */

/** Convierte una Cama del dominio a un registro de atributos plano para la capa. */
export function camaToAttributes(
  cama: Cama,
  bloque: Bloque,
  objectId: number,
  config: GisConfig = GIS_CONFIG
): CamaFeatureAttributes {
  const f = config.fieldMap;
  const prodPct = (cama.produccion.real / cama.produccion.meta) * 100;

  const attrs: CamaFeatureAttributes = {
    OBJECTID: objectId,
    [f.bedId]: cama.id,
    [f.blockId]: cama.bloqueId,
    [f.blockName]: bloque.nombre,
    [f.bedNumber]: cama.numero,
    [f.variety]: cama.produccion.variedad,
    [f.pest]: cama.mipe.plagaPrincipal,
    [f.severity]: cama.mipe.severidad,
    [f.incidence]: cama.mipe.incidencia,
    [f.ph]: cama.mirfe.ph,
    [f.ce]: cama.mirfe.ce,
    [f.drainage]: cama.mirfe.drenaje,
    [f.productionTarget]: cama.produccion.meta,
    [f.productionActual]: cama.produccion.real,
    [f.lastUpdated]: cama.ultimaActualizacion,
    // Campos precomputados de simbología (esquema estable para renderers)
    RISK_LEVEL: calcularRiesgoCama(cama),
    MIRFE_FAILURES: contarFallasMirfe(cama.mirfe, config.thresholds),
    PROD_PCT: Math.round(prodPct),
  };

  // Garantizar un OBJECTID único: si el fieldMap mapea algún atributo a
  // 'OBJECTID' (p. ej. bedNumber → OBJECTID como fallback), no debe pisar el
  // id único de la feature en la capa sintética.
  attrs.OBJECTID = objectId;
  return attrs;
}

/**
 * Agrupa una lista de registros de atributos (features de una capa) en la
 * estructura de dominio Bloque[]. Es la vía por la que tanto el Feature
 * Service como la capa del Web Map alimentan el tablero: misma salida,
 * resolviendo nombres de campo con el fieldMap.
 */
export function attributesListToBloques(
  attrsList: Record<string, unknown>[],
  config: GisConfig = GIS_CONFIG
): Bloque[] {
  const f = config.fieldMap;
  const bloquesMap = new Map<string, Bloque>();

  for (const attrs of attrsList) {
    const cama = attributesToCama(attrs, config);
    const bId = cama.bloqueId;
    if (!bloquesMap.has(bId)) {
      bloquesMap.set(bId, {
        id: bId,
        nombre: String(attrs[f.blockName] ?? `Bloque ${bId}`),
        camas: [],
      });
    }
    bloquesMap.get(bId)!.camas.push(cama);
  }

  return [...bloquesMap.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((bloque) => ({
      ...bloque,
      camas: bloque.camas.sort((a, b) => a.numero - b.numero),
    }));
}

/** Convierte un registro de atributos (p. ej. de un Feature Service) a Cama. */
export function attributesToCama(attrs: Record<string, unknown>, config: GisConfig = GIS_CONFIG): Cama {
  const f = config.fieldMap;
  const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));
  const num = (v: unknown, fallback = 0): number => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : fallback;
  };

  const bloqueId = str(attrs[f.blockId], 'A');
  const numero = num(attrs[f.bedNumber]);

  // Normalizar la severidad a las claves en minúscula del dominio ('Alta' →
  // 'alta'). El servicio real usa valores capitalizados; sin normalizar, ni el
  // cálculo de riesgo ni la simbología MIPE los reconocerían.
  const severidadRaw = str(attrs[f.severity], 'ninguna').toLowerCase();
  const severidadesValidas: MipeData['severidad'][] = ['ninguna', 'baja', 'media', 'alta'];
  const severidad = (severidadesValidas as string[]).includes(severidadRaw)
    ? (severidadRaw as MipeData['severidad'])
    : 'ninguna';

  return {
    id: str(attrs[f.bedId], `${bloqueId}-${numero}`),
    bloqueId,
    numero,
    mipe: {
      plagaPrincipal: str(attrs[f.pest], 'Ninguna') as MipeData['plagaPrincipal'],
      severidad,
      incidencia: num(attrs[f.incidence]),
    },
    mirfe: {
      ph: num(attrs[f.ph]),
      ce: num(attrs[f.ce]),
      drenaje: num(attrs[f.drainage]),
    },
    produccion: {
      variedad: str(attrs[f.variety]),
      meta: num(attrs[f.productionTarget], 1),
      real: num(attrs[f.productionActual]),
    },
    historico: [], // El histórico vive en una tabla relacionada; se hidrata aparte.
    ultimaActualizacion: str(attrs[f.lastUpdated], new Date().toISOString().split('T')[0]),
  };
}

/* ================================================================== *
 * 5. CAPA DE ACCESO A DATOS (provider abstracto)                     *
 *                                                                    *
 * La app pide bloques y guarda monitoreos a través de esta interfaz. *
 * En 'mock' usa memoria + localStorage; en 'feature-service' consulta *
 * tu servicio ArcGIS. Cambiar de uno a otro no toca la UI.            *
 * ================================================================== */

const LOCALSTORAGE_KEY = 'cia_bloques_data';

export interface GisDataProvider {
  readonly mode: GisConfig['mode'];
  loadBloques(): Promise<Bloque[]>;
  saveMonitoring(
    camaId: string,
    mipe: MipeData,
    mirfe: MirfeData,
    produccion: ProduccionData
  ): Promise<void>;
}

/** Provider por defecto: datos semilla + persistencia en localStorage. */
class MockDataProvider implements GisDataProvider {
  readonly mode = 'mock' as const;

  async loadBloques(): Promise<Bloque[]> {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved) as Bloque[];
        } catch (e) {
          console.error('Error parseando localStorage, cargando por defecto', e);
        }
      }
    }
    return BLOQUES_INICIALES;
  }

  // En modo mock App.tsx ya persiste el estado completo en localStorage;
  // este método existe para paridad de interfaz con el provider real.
  async saveMonitoring(): Promise<void> {
    /* no-op: la persistencia mock la maneja el efecto de localStorage en App */
  }
}

/**
 * Provider para un ArcGIS Feature Service. Consulta real implementada;
 * la escritura queda como stub documentado (requiere applyEdits + auth).
 * Importa @arcgis/core de forma dinámica para no cargarlo en modo mock.
 */
class FeatureServiceProvider implements GisDataProvider {
  readonly mode = 'feature-service' as const;

  constructor(private config: GisConfig) {}

  async loadBloques(): Promise<Bloque[]> {
    const { default: FeatureLayer } = await import('@arcgis/core/layers/FeatureLayer');
    const f = this.config.fieldMap;

    const layer = new FeatureLayer({
      url: this.config.featureServiceUrl,
      layerId: this.config.layerId,
    });

    const result = await layer.queryFeatures({
      where: '1=1',
      outFields: [...new Set(Object.values(f))],
      returnGeometry: false,
    });

    return attributesListToBloques(
      result.features.map((feat) => feat.attributes as Record<string, unknown>),
      this.config
    );
  }

  async saveMonitoring(
    _camaId: string,
    _mipe: MipeData,
    _mirfe: MirfeData,
    _produccion: ProduccionData
  ): Promise<void> {
    // TODO: aplicar edición al Feature Service cuando conectes el servicio real:
    //   const { default: FeatureLayer } = await import('@arcgis/core/layers/FeatureLayer');
    //   const layer = new FeatureLayer({ url, layerId });
    //   await layer.applyEdits({ updateFeatures: [{ attributes: camaToAttributes(...) }] });
    // Requiere autenticación con permisos de edición sobre la capa.
    console.warn('[FeatureServiceProvider] saveMonitoring aún no implementado (stub).');
  }
}

/** Fábrica: devuelve el provider adecuado según el modo configurado. */
export function getDataProvider(config: GisConfig = GIS_CONFIG): GisDataProvider {
  switch (config.mode) {
    case 'feature-service':
      return new FeatureServiceProvider(config);
    case 'webmap':
      // Un Web Map se carga en el mapa directamente; los atributos de camas
      // se leen de sus capas operacionales. Hasta definir esa capa, usamos mock.
      return new MockDataProvider();
    case 'mock':
    default:
      return new MockDataProvider();
  }
}

/* ================================================================== *
 * 6. GENERACIÓN DE TAREAS PRIORITARIAS (sin cambios de comportamiento)*
 * ================================================================== */

/**
 * Genera de forma inteligente la lista de tareas de intervención prioritarias
 * cruzando los datos fitosanitarios, de fertirriego y producción de todas las camas.
 */
export function generarAccionesPrioritarias(bloques: Bloque[]): PriorityAction[] {
  const acciones: PriorityAction[] = [];
  const fechaHoy = new Date().toISOString().split('T')[0];

  bloques.forEach((bloque) => {
    bloque.camas.forEach((cama) => {
      const riesgo = calcularRiesgoCama(cama);
      if (riesgo === 'normal') return; // Sin alertas urgentes

      const pctProd = (cama.produccion.real / cama.produccion.meta) * 100;

      // 1. Caso Sinergia Extrema (Múltiples causas graves)
      if (cama.mipe.severidad === 'alta' && (cama.mirfe.ph < 5.0 || cama.mirfe.ph > 7.0 || cama.mirfe.ce > 2.2)) {
        acciones.push({
          id: `act-${cama.id}-mixto`,
          bloqueId: bloque.id,
          camaId: cama.id,
          camaNumero: cama.numero,
          categoria: 'mixto',
          titulo: `Intervención Crítica de Suelo y Sanidad`,
          descripcion: `Cama con infestación alta de ${cama.mipe.plagaPrincipal} (${cama.mipe.incidencia}% inc.) combinada con desbalance severo en fertirriego (pH: ${cama.mirfe.ph}, CE: ${cama.mirfe.ce}). El rendimiento ha caído un ${Math.round(100 - pctProd)}% de la meta.`,
          prioridad: 'alta',
          fechaGeneracion: fechaHoy,
        });
        return;
      }

      // 2. Alerta MIPE Grave
      if (cama.mipe.severidad === 'alta') {
        acciones.push({
          id: `act-${cama.id}-mipe`,
          bloqueId: bloque.id,
          camaId: cama.id,
          camaNumero: cama.numero,
          categoria: 'mipe',
          titulo: `Control Fitosanitario de Choque - ${cama.mipe.plagaPrincipal}`,
          descripcion: `Presencia severa de ${cama.mipe.plagaPrincipal} con incidencia de ${cama.mipe.incidencia}%. Se requiere aplicación dirigida inmediata de fitosanitario de choque y aislamiento para evitar propagación en el Bloque ${bloque.id}.`,
          prioridad: 'alta',
          fechaGeneracion: fechaHoy,
        });
      }

      // 3. Alerta de Fertirriego Grave (CE ó pH críticos)
      else if (cama.mirfe.ce > 2.2 || cama.mirfe.ph < 5.0 || cama.mirfe.ph > 7.0) {
        let detalle = '';
        if (cama.mirfe.ce > 2.2) detalle = 'Exceso severo de sales (CE de ' + cama.mirfe.ce + ' dS/m) que causa estrés osmótico.';
        if (cama.mirfe.ph < 5.0) detalle = 'Acidez crítica de suelo (pH: ' + cama.mirfe.ph + '), bloqueando absorción de fósforo y calcio.';
        if (cama.mirfe.ph > 7.0) detalle = 'Alcalinidad crítica (pH: ' + cama.mirfe.ph + '), induciendo deficiencia severa de microelementos (Hierro).';

        acciones.push({
          id: `act-${cama.id}-mirfe-grave`,
          bloqueId: bloque.id,
          camaId: cama.id,
          camaNumero: cama.numero,
          categoria: 'mirfe',
          titulo: `Lavado o Corrección Química de Fertirriego`,
          descripcion: `${detalle} Drenaje reportado en ${cama.mirfe.drenaje}%. Aplicar pulso de agua pura para lixiviación o ajustar dosificación de ácidos/bases en cabezal de riego.`,
          prioridad: 'alta',
          fechaGeneracion: fechaHoy,
        });
      }

      // 4. Desempeño Productivo Crítico sin causas físicas extremas
      else if (pctProd < 75) {
        acciones.push({
          id: `act-${cama.id}-prod`,
          bloqueId: bloque.id,
          camaId: cama.id,
          camaNumero: cama.numero,
          categoria: 'produccion',
          titulo: `Auditoría Fisiológica de Cama`,
          descripcion: `La producción real (${cama.produccion.real} tallos) está muy por debajo de la meta semanal (${cama.produccion.meta} tallos). Aunque las variables físicas actuales se muestran moderadas, es urgente revisar vigor de portainjertos y rebrotes.`,
          prioridad: 'media',
          fechaGeneracion: fechaHoy,
        });
      }

      // 5. Alertas Moderadas (MIPE o MIRFE fuera de rango intermedio)
      else if (
        cama.mipe.severidad === 'media' ||
        cama.mirfe.ph < 5.5 ||
        cama.mirfe.ph > 6.5 ||
        cama.mirfe.ce < 1.2 ||
        cama.mirfe.ce > 1.8 ||
        cama.mirfe.drenaje < 20 ||
        cama.mirfe.drenaje > 35
      ) {
        let motivo = '';
        let cat: PriorityAction['categoria'] = 'mirfe';

        if (cama.mipe.severidad === 'media') {
          motivo = `Presencia moderada de ${cama.mipe.plagaPrincipal} (${cama.mipe.incidencia}% inc.). Monitorear diariamente.`;
          cat = 'mipe';
        } else {
          motivo = `Fertirriego en desvío leve. pH: ${cama.mirfe.ph} o CE: ${cama.mirfe.ce} dS/m, con drenaje del ${cama.mirfe.drenaje}%.`;
        }

        acciones.push({
          id: `act-${cama.id}-alerta-media`,
          bloqueId: bloque.id,
          camaId: cama.id,
          camaNumero: cama.numero,
          categoria: cat,
          titulo: `Monitoreo Preventivo y Ajustes Menores`,
          descripcion: `${motivo} Programar revisión por inspector y corregir receta nutricional en la siguiente fertilización semanal.`,
          prioridad: 'media',
          fechaGeneracion: fechaHoy,
        });
      }
    });
  });

  // Ordenar por prioridad: alta primero, luego media
  return acciones.sort((a, b) => {
    const prioridades = { alta: 3, media: 2, baja: 1 };
    return prioridades[b.prioridad] - prioridades[a.prioridad];
  });
}
