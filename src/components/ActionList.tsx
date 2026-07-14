/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PriorityAction } from '../types';
import {
  MapPin,
  Droplet,
  Leaf,
  TrendingUp,
  Flame
} from 'lucide-react';

interface ActionListProps {
  acciones: PriorityAction[];
  onSelectCama: (camaId: string) => void;
  onCompletarAccion: (id: string) => void;
}

export default function ActionList({
  acciones,
  onSelectCama,
  onCompletarAccion,
}: ActionListProps) {
  const [filtroCategoria, setFiltroCategoria] = React.useState<string>('todos');

  const actionCount = acciones.length;
  const highPriorityCount = acciones.filter(a => a.prioridad === 'alta').length;

  const getIconCategoria = (cat: PriorityAction['categoria']) => {
    switch (cat) {
      case 'mipe':
        return <Leaf className="w-4.5 h-4.5 text-rose-500" />;
      case 'mirfe':
        return <Droplet className="w-4.5 h-4.5 text-sky-500" />;
      case 'produccion':
        return <TrendingUp className="w-4.5 h-4.5 text-blue-500" />;
      case 'mixto':
        return <Flame className="w-4.5 h-4.5 text-amber-500 animate-pulse" />;
    }
  };

  const getBadgeCategoria = (cat: PriorityAction['categoria']) => {
    switch (cat) {
      case 'mipe':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-rose-100">Fitosanitario (MIPE)</span>;
      case 'mirfe':
        return <span className="bg-sky-50 text-sky-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-sky-100">Fertirriego (MIRFE)</span>;
      case 'produccion':
        return <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-100">Producción</span>;
      case 'mixto':
        return <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">Sinergia Crítica (Mixto)</span>;
    }
  };

  const filteredActions = acciones.filter(accion => {
    if (filtroCategoria === 'todos') return true;
    return accion.categoria === filtroCategoria;
  });

  return (
    <calcite-panel
      heading="Tareas Prioritarias de Campo"
      description="Filtra y prioriza las hileras de camas que requieren corrección física inmediata."
      id="priority-field-actions"
    >
      {/* Micro indicadores en la cabecera del panel */}
      <div slot="header-actions-end" className="flex items-center gap-1.5 px-2">
        <calcite-chip scale="s" icon="exclamation-mark-triangle" label={`${highPriorityCount} críticas`}>
          {highPriorityCount} Críticas
        </calcite-chip>
        <calcite-chip scale="s" appearance="outline" label={`${actionCount} totales`}>
          {actionCount} Totales
        </calcite-chip>
      </div>

      <div className="p-4 flex flex-col h-full">

      {/* Filtro de Categoría */}
      <calcite-segmented-control
        scale="s"
        width="full"
        value={filtroCategoria}
        oncalciteSegmentedControlChange={(e) => setFiltroCategoria(e.currentTarget.value)}
      >
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'mipe', label: 'Sanidad (MIPE)' },
          { key: 'mirfe', label: 'Fertirriego (MIRFE)' },
          { key: 'produccion', label: 'Producción' },
          { key: 'mixto', label: 'Mixtos' }
        ].map(tab => (
          <calcite-segmented-control-item
            key={tab.key}
            value={tab.key}
            checked={filtroCategoria === tab.key}
          >
            {tab.label}
          </calcite-segmented-control-item>
        ))}
      </calcite-segmented-control>

      {/* Lista de Acciones */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[500px] mt-4">
        {filteredActions.length === 0 ? (
          <calcite-notice open icon="check-square" kind="success" width="full">
            <div slot="title">Sin alertas para este filtro</div>
            <div slot="message">Todo se encuentra operando dentro de los rangos ideales.</div>
          </calcite-notice>
        ) : (
          filteredActions.map((accion) => (
            <calcite-card key={accion.id} id={`action-item-${accion.id}`}>
            <div className="flex flex-col justify-between gap-3">
              {/* Header de la Tarjeta */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${accion.prioridad === 'alta' ? 'bg-rose-100/70 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                    {getIconCategoria(accion.categoria)}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 text-sm leading-snug">
                      {accion.titulo}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Bloque {accion.bloqueId} • Cama {accion.camaNumero}
                    </p>
                  </div>
                </div>

                {/* Badge de Prioridad */}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono
                  ${accion.prioridad === 'alta' ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-800'}`}
                >
                  {accion.prioridad}
                </span>
              </div>

              {/* Contenido / Descripción */}
              <p className="text-xs text-slate-600 leading-relaxed pl-10.5">
                {accion.descripcion}
              </p>

              {/* Badges de Categoría y Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100/80 mt-1 pl-10.5">
                <div>
                  {getBadgeCategoria(accion.categoria)}
                </div>

                <div className="flex items-center gap-2">
                  {/* Botón de localizador */}
                  <calcite-button
                    appearance="outline"
                    scale="s"
                    icon-start="pin"
                    onClick={() => onSelectCama(accion.camaId)}
                  >
                    Ver en Mapa
                  </calcite-button>

                  {/* Botón de completar */}
                  <calcite-button
                    scale="s"
                    icon-start="check-square"
                    title="Marcar tarea como resuelta tras corrección"
                    onClick={() => onCompletarAccion(accion.id)}
                  >
                    Resuelto
                  </calcite-button>
                </div>
              </div>
            </div>
            </calcite-card>
          ))
        )}
      </div>
      </div>
    </calcite-panel>
  );
}
