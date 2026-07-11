/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PriorityAction } from '../types';
import { 
  AlertTriangle, 
  MapPin, 
  Droplet, 
  Leaf, 
  TrendingUp, 
  Search, 
  Flame, 
  CheckSquare,
  Wrench
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full" id="priority-field-actions">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Tareas Prioritarias de Campo
          </h2>
          <p className="text-sm text-slate-500">
            Filtra y prioriza las hileras de camas que requieren corrección física inmediata.
          </p>
        </div>

        {/* Micro indicador */}
        <div className="flex items-center gap-2">
          <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full font-semibold border border-rose-100 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            {highPriorityCount} Críticas
          </span>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-mono font-medium">
            {actionCount} Totales
          </span>
        </div>
      </div>

      {/* Tabs de Filtro de Categoría */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'mipe', label: 'Sanidad (MIPE)' },
          { key: 'mirfe', label: 'Fertirriego (MIRFE)' },
          { key: 'produccion', label: 'Producción' },
          { key: 'mixto', label: 'Mixtos' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFiltroCategoria(tab.key)}
            className={`
              px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer
              ${filtroCategoria === tab.key 
                ? 'bg-slate-900 border-slate-900 text-white font-semibold' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Acciones */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[500px]">
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <CheckSquare className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Sin alertas para este filtro</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Todo se encuentra operando dentro de los rangos ideales.</p>
          </div>
        ) : (
          filteredActions.map((accion) => (
            <div
              key={accion.id}
              className={`
                p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3
                ${accion.prioridad === 'alta' 
                  ? 'bg-gradient-to-br from-rose-50/40 to-white border-rose-200 hover:border-rose-300' 
                  : 'bg-white border-slate-100 hover:border-slate-200'
                }
              `}
              id={`action-item-${accion.id}`}
            >
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
                  <button
                    onClick={() => onSelectCama(accion.camaId)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-medium py-1 px-3 rounded-lg text-xs border border-slate-200 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Ver en Mapa
                  </button>

                  {/* Botón de completar */}
                  <button
                    onClick={() => onCompletarAccion(accion.id)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold py-1 px-3 rounded-lg text-xs border border-emerald-100 hover:border-emerald-200 cursor-pointer transition-colors"
                    title="Marcar tarea como resuelta tras corrección"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Resuelto
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
