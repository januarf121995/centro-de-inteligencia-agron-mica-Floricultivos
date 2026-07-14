/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type FeatureLayerView from '@arcgis/core/views/layers/FeatureLayerView';
import { Bloque, VisualLayer, GisConfig, ArcgisMapElement, MapViewClickEvent } from '../types';
import { GIS_CONFIG, attributesListToBloques } from '../data';
import {
  buildCamasLayer,
  getRendererForLayer,
  buildSearchWhere,
  buildPopupTemplate,
  findCamasLayer,
} from '../gis/camasLayer';

interface FarmMapProps {
  bloques: Bloque[];
  activeLayer: VisualLayer;
  selectedCamaId: string | null;
  onSelectCama: (camaId: string) => void;
  searchQuery: string;
  /** Ref al elemento <arcgis-map>. App lo usa como fuente de consultas espaciales. */
  mapRef?: React.Ref<ArcgisMapElement>;
  /**
   * En modo Web Map, se invoca con los bloques leídos de la capa "Camas" del
   * mapa cargado, para que App los use como fuente única de verdad del tablero.
   */
  onFeaturesLoaded?: (bloques: Bloque[]) => void;
  /** Configuración GIS (por defecto GIS_CONFIG). */
  config?: GisConfig;
}

export default function FarmMap({
  bloques,
  activeLayer,
  selectedCamaId,
  onSelectCama,
  searchQuery,
  mapRef,
  onFeaturesLoaded,
  config = GIS_CONFIG,
}: FarmMapProps) {
  // Si hay un Web Map de ArcGIS Online configurado, el mapa se inicializa con
  // `itemId` en vez de con basemap/center/zoom.
  const useWebMap = Boolean(config.webMapId);

  // Elemento <arcgis-map> propio (fusionado con la ref externa si la hay).
  const localMapRef = React.useRef<ArcgisMapElement | null>(null);
  const setMapNode = React.useCallback(
    (node: ArcgisMapElement | null) => {
      localMapRef.current = node;
      if (typeof mapRef === 'function') mapRef(node);
      else if (mapRef) (mapRef as React.MutableRefObject<ArcgisMapElement | null>).current = node;
    },
    [mapRef]
  );

  // Referencias a la capa de camas y su LayerView activa.
  const layerRef = React.useRef<FeatureLayer | null>(null);
  const layerViewRef = React.useRef<FeatureLayerView | null>(null);
  const [viewReady, setViewReady] = React.useState(false);

  // Mantener el último valor de búsqueda en un ref para reaplicar tras rebuilds.
  const searchRef = React.useRef(searchQuery);
  searchRef.current = searchQuery;

  /* ----- MODO WEB MAP: enlazar la capa "Camas" real ya cargada ----- */
  React.useEffect(() => {
    if (!useWebMap) return;
    const mapEl = localMapRef.current;
    if (!mapEl || !viewReady) return;
    const view = mapEl.view as MapView;
    let cancelled = false;

    (async () => {
      // Asegurar que las capas del Web Map (incl. las de grupos) estén cargadas.
      const webmap = view.map as WebMap;
      if (typeof webmap.loadAll === 'function') {
        await webmap.loadAll().catch(() => {});
      }
      if (cancelled) return;

      const layer = findCamasLayer(view.map, config);
      if (!layer) {
        console.error(`No se encontró la capa "${config.layerTitle}" en el Web Map.`);
        return;
      }

      // Aplicar simbología y popup del template sobre la capa real.
      layer.renderer = getRendererForLayer(activeLayer, config);
      layer.popupTemplate = buildPopupTemplate(config);
      // Traer todos los campos para que el hitTest del clic incluya el id de
      // negocio (CAMAS_ID) y no sólo OBJECTID + campos de simbología.
      layer.outFields = ['*'];
      layerRef.current = layer;

      // Consultar los atributos de la capa cargada → fuente única del tablero.
      if (onFeaturesLoaded) {
        try {
          const outFields = [...new Set(Object.values(config.fieldMap))];
          const res = await layer.queryFeatures({ where: '1=1', outFields, returnGeometry: false });
          if (!cancelled) {
            onFeaturesLoaded(
              attributesListToBloques(
                res.features.map((ft) => ft.attributes as Record<string, unknown>),
                config
              )
            );
          }
        } catch (e) {
          console.error('Error consultando la capa del Web Map', e);
        }
      }

      const lv = await view.whenLayerView(layer).catch(() => null);
      if (cancelled || !lv) return;
      layerViewRef.current = lv as FeatureLayerView;
      applySearch(searchRef.current);
      applySelection(selectedCamaId);
    })();

    return () => {
      cancelled = true;
    };
    // Sólo se enlaza una vez cuando la vista está lista (los datos provienen
    // de la propia capa; no depende de `bloques` para evitar recargas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewReady, config, useWebMap]);

  /* ----- MODO SINTÉTICO (mock / feature-service): construir capa cliente ----- */
  React.useEffect(() => {
    if (useWebMap) return;
    const mapEl = localMapRef.current;
    if (!mapEl || !viewReady) return;
    const view = mapEl.view as MapView;

    // Quitar la capa previa antes de reconstruir con los datos nuevos.
    if (layerRef.current) {
      view.map.remove(layerRef.current);
      layerRef.current = null;
      layerViewRef.current = null;
    }

    const layer = buildCamasLayer(bloques, config);
    layer.renderer = getRendererForLayer(activeLayer, config);
    view.map.add(layer);
    layerRef.current = layer;

    let cancelled = false;
    view
      .whenLayerView(layer)
      .then((lv) => {
        if (cancelled) return;
        layerViewRef.current = lv as FeatureLayerView;
        applySearch(searchRef.current);
        applySelection(selectedCamaId);
      })
      .catch(() => {
        /* la capa pudo haberse removido durante un rebuild */
      });

    return () => {
      cancelled = true;
    };
    // Reconstruimos sólo ante cambios de datos/vista; capa/selección/búsqueda
    // se sincronizan en sus propios efectos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloques, viewReady, config, useWebMap]);

  /* ----- Cambiar simbología al cambiar la capa temática activa ----- */
  React.useEffect(() => {
    if (layerRef.current) {
      layerRef.current.renderer = getRendererForLayer(activeLayer, config);
    }
  }, [activeLayer, config]);

  /* ----- Filtro de búsqueda: atenúa las camas que no coinciden ----- */
  const applySearch = React.useCallback(
    (query: string) => {
      const lv = layerViewRef.current;
      if (!lv) return;
      const where = buildSearchWhere(query, config);
      lv.featureEffect =
        where === '1=1'
          ? null
          : { filter: { where }, excludedEffect: 'opacity(25%)' };
    },
    [config]
  );

  React.useEffect(() => {
    applySearch(searchQuery);
  }, [searchQuery, applySearch]);

  /* ----- Resaltar y encuadrar la cama seleccionada ----- */
  const highlightHandleRef = React.useRef<__esri.Handle | null>(null);
  const applySelection = React.useCallback(
    async (camaId: string | null) => {
      const mapEl = localMapRef.current;
      const lv = layerViewRef.current;
      const layer = layerRef.current;
      if (!mapEl || !lv || !layer) return;

      // Limpiar resaltado previo.
      highlightHandleRef.current?.remove();
      highlightHandleRef.current = null;
      if (!camaId) return;

      const where = `${config.fieldMap.bedId} = '${camaId.replace(/'/g, "''")}'`;
      try {
        // Traer geometría para poder resaltar Y encuadrar la cama en el mapa.
        const result = await layer.queryFeatures({
          where,
          outFields: ['OBJECTID'],
          returnGeometry: true,
        });
        if (result.features.length === 0) return;

        const oids = result.features.map((feat) => feat.attributes.OBJECTID as number);
        highlightHandleRef.current = lv.highlight(oids);

        // Llevar la cama al centro de la vista (equivale a "Ver en Mapa"). Se
        // usa la extensión del feature con algo de margen para dar contexto.
        const geom = result.features[0].geometry;
        const target = geom?.extent ? geom.extent.clone().expand(3) : geom;
        if (target) {
          (mapEl.view as MapView).goTo(target).catch(() => {
            /* goTo puede rechazar si la vista se está animando/desmontando */
          });
        }
      } catch {
        /* ignorar: la capa pudo cambiar */
      }
    },
    [config]
  );

  React.useEffect(() => {
    applySelection(selectedCamaId);
  }, [selectedCamaId, applySelection]);

  /* ----- Click en el mapa → seleccionar cama (hitTest sobre la capa) ----- */
  const handleViewClick = React.useCallback(
    async (event: MapViewClickEvent) => {
      const mapEl = localMapRef.current;
      const layer = layerRef.current;
      if (!mapEl || !layer) return;

      const response = await mapEl.hitTest(
        { x: event.detail.x, y: event.detail.y },
        { include: [layer] }
      );
      const hit = response.results.find((r) => r.type === 'graphic') as
        | __esri.GraphicHit
        | undefined;
      if (!hit) return;

      const bedIdField = config.fieldMap.bedId;
      const attrs = hit.graphic.attributes ?? {};

      // Extraer el id de negocio (string), NO el OBJECTID numérico.
      let camaId: unknown = attrs[bedIdField];

      // Respaldo: si el grafo del hitTest no trajo el campo id, consultarlo por
      // OBJECTID directamente en la capa (garantiza el string real).
      if (camaId == null || camaId === '') {
        const oid = attrs[layer.objectIdField ?? 'OBJECTID'] ?? attrs.OBJECTID;
        if (oid != null) {
          try {
            const res = await layer.queryFeatures({
              objectIds: [Number(oid)],
              outFields: [bedIdField],
              returnGeometry: false,
            });
            camaId = res.features[0]?.attributes?.[bedIdField];
          } catch {
            /* ignorar: la capa pudo cambiar */
          }
        }
      }

      if (camaId != null && String(camaId) !== '') {
        onSelectCama(String(camaId));
      }
    },
    [config, onSelectCama]
  );

  // Etiqueta legible de la capa temática activa (para el chip del panel).
  const activeLayerLabel =
    activeLayer === 'riesgo'
      ? 'Riesgo Integrado'
      : activeLayer === 'mipe'
        ? 'Fitosanitario (MIPE)'
        : activeLayer === 'mirfe'
          ? 'Fertirriego (MIRFE)'
          : 'Productividad Semanal';

  return (
    <calcite-panel
      heading="Mapa Físico de Camas por Bloque"
      description="Vista espacial integrada. Haz clic en cualquier cama para analizar sus variables agronómicas correlacionadas."
      id="agricultural-spatial-map"
    >
      {/* Indicador de Capa */}
      <calcite-chip slot="header-actions-end" icon="layers" scale="s" label={`Capa: ${activeLayerLabel}`}>
        {activeLayerLabel}
      </calcite-chip>

      <div className="p-4 flex flex-col h-full">

      {/*
        Contenedor del mapa con ALTURA CONCRETA (no sólo min-height): el
        elemento <arcgis-map> se dimensiona con height:100%, así que necesita
        un padre con altura resuelta o queda colapsado (pantalla en blanco).
        Los 580px replican el alto del área de mapa del template original.
      */}
      <div className="flex-1 h-[580px] min-h-[480px] rounded-xl overflow-hidden border border-slate-100 relative">
        {/*
          Si hay un Web Map configurado (GIS_CONFIG.webMapId), el mapa se
          inicializa ESTRICTAMENTE con `itemId`, renderizando TU Web Map de
          ArcGIS Online (basemap, capas y extensión definidos en el portal).
          En ese modo NO se pasan basemap/center/zoom (irían en conflicto y
          sobreescribirían la definición del Web Map). En React 19 la prop
          camelCase `itemId` se enlaza a la propiedad del custom element, que
          Lumina refleja al atributo `item-id`.
        */}
        <arcgis-map
          ref={setMapNode}
          {...(useWebMap
            ? { itemId: config.webMapId }
            : { basemap: config.basemap, center: config.center, zoom: config.zoom })}
          onarcgisViewReadyChange={() => setViewReady(Boolean(localMapRef.current?.ready))}
          onarcgisViewClick={handleViewClick}
          style={{ width: '100%', height: '100%' }}
        >
          <arcgis-zoom position="top-left"></arcgis-zoom>
        </arcgis-map>
      </div>

      {/* Leyenda Inteligente */}
      <div className="border-t border-slate-100 pt-4 mt-6">
        <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
          Leyenda e Interpretación de Datos ({activeLayer === 'riesgo' ? 'Riesgo Integrado' : activeLayer.toUpperCase()})
        </h4>

        {activeLayer === 'riesgo' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-rose-900">Riesgo Crítico (Severidad alta/Múltiples fallas)</p>
                <p className="text-[10px] text-rose-600">Requiere intervención agronómica antes de 24 horas.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-amber-900">Riesgo Medio (Fallas leves o plaga controlable)</p>
                <p className="text-[10px] text-amber-600">Monitorear estrechamente en el siguiente recorrido.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-emerald-900">Estado Estable (Bajo control)</p>
                <p className="text-[10px] text-emerald-600">Rendimiento óptimo y fitosanitarios estables.</p>
              </div>
            </div>
          </div>
        )}

        {activeLayer === 'mipe' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg text-xs border border-red-100 text-red-800">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              <span>Severidad Alta (&gt;15% Incidencia)</span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg text-xs border border-orange-100 text-orange-800">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span>Severidad Media</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded-lg text-xs border border-yellow-100 text-yellow-800">
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <span>Severidad Baja</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs border border-slate-200 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-slate-300"></span>
              <span>Sin Presencia Detectada</span>
            </div>
          </div>
        )}

        {activeLayer === 'mirfe' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-indigo-900">Parámetros Críticos (Anomalía Múltiple)</p>
                <p className="text-[10px] text-indigo-600">pH / CE o Drenaje completamente desviados de la receta.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-sky-50 p-2 rounded-lg border border-sky-100">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-sky-900">Alerta Menor (Un parámetro desviado)</p>
                <p className="text-[10px] text-sky-600">Ajuste recomendado en la dosificación semanal.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-teal-50 p-2 rounded-lg border border-teal-100">
              <span className="w-3.5 h-3.5 rounded-full bg-teal-500 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-teal-900">Nutrición Óptima (Suelo balanceado)</p>
                <p className="text-[10px] text-teal-600">pH [5.5-6.5], CE [1.2-1.8] dS/m, Drenaje [20-35%].</p>
              </div>
            </div>
          </div>
        )}

        {activeLayer === 'produccion' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 bg-rose-50 p-2 rounded-lg border border-rose-100">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-600 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-rose-950">Desempeño Crítico (&lt; 75% de Meta)</p>
                <p className="text-[10px] text-rose-700">Peligro en la proyección de corte para exportación.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-amber-50 p-2 rounded-lg border border-amber-100">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-amber-950">Bajo Meta Fisiológica (75% - 89%)</p>
                <p className="text-[10px] text-amber-700">Sección en rezago por retraso de brotes o fertilidad.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-blue-50 p-2 rounded-lg border border-blue-100">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex-shrink-0"></span>
              <div>
                <p className="text-xs font-semibold text-blue-950">Eficiencia Excelente (&ge; 90% de Meta)</p>
                <p className="text-[10px] text-blue-700">Satisface plenamente los contratos logísticos.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </calcite-panel>
  );
}
