/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bloque } from '../types';
import { calcularRiesgoCama } from '../data';
import { ShieldAlert, CheckCircle, TrendingUp, HelpCircle, Activity, Sparkles, Droplet, Leaf } from 'lucide-react';

interface FarmStatsProps {
  bloques: Bloque[];
}

export default function FarmStats({ bloques }: FarmStatsProps) {
  // Inicializar acumuladores
  let totalCamas = 0;
  let camasCriticas = 0;
  let camasMedias = 0;
  let camasEstables = 0;

  let totalMetaTallos = 0;
  let totalRealTallos = 0;

  let sumaPh = 0;
  let sumaCe = 0;
  let totalMedicionesRiego = 0;

  // Mapa de conteo de plagas
  const conteoPlagas: Record<string, number> = {};

  bloques.forEach((bloque) => {
    bloque.camas.forEach((cama) => {
      totalCamas++;
      const riesgo = calcularRiesgoCama(cama);
      if (riesgo === 'critico') camasCriticas++;
      else if (riesgo === 'medio') camasMedias++;
      else camasEstables++;

      totalMetaTallos += cama.produccion.meta;
      totalRealTallos += cama.produccion.real;

      sumaPh += cama.mirfe.ph;
      sumaCe += cama.mirfe.ce;
      totalMedicionesRiego++;

      if (cama.mipe.plagaPrincipal !== 'Ninguna') {
        conteoPlagas[cama.mipe.plagaPrincipal] = (conteoPlagas[cama.mipe.plagaPrincipal] || 0) + 1;
      }
    });
  });

  const promedioPh = totalMedicionesRiego > 0 ? sumaPh / totalMedicionesRiego : 0;
  const promedioCe = totalMedicionesRiego > 0 ? sumaCe / totalMedicionesRiego : 0;
  const cumplimientoProduccion = totalMetaTallos > 0 ? (totalRealTallos / totalMetaTallos) * 100 : 0;

  // Encontrar la plaga más recurrente
  let plagaMasFrecuente = 'Ninguna';
  let maxPlagaConteo = 0;
  Object.entries(conteoPlagas).forEach(([plaga, conteo]) => {
    if (conteo > maxPlagaConteo) {
      maxPlagaConteo = conteo;
      plagaMasFrecuente = plaga;
    }
  });

  // Porcentaje de camas críticas
  const pctCriticas = totalCamas > 0 ? (camasCriticas / totalCamas) * 100 : 0;
  const pctMedias = totalCamas > 0 ? (camasMedias / totalCamas) * 100 : 0;
  const pctEstables = totalCamas > 0 ? (camasEstables / totalCamas) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="farm-kpis-container">
      {/* KPI 1: Estado Operativo General */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Índice de Riesgo Agrícola
          </p>
          <p className="text-2xl font-semibold text-slate-800 font-display">
            {camasCriticas > 0 ? `${camasCriticas} Alertas` : 'Estable'}
          </p>
          <div className="flex gap-1.5 pt-2">
            <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-semibold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              {camasCriticas} Críticas
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              {camasMedias} Medias
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${camasCriticas > 2 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
          {camasCriticas > 2 ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
        </div>
      </div>

      {/* KPI 2: Eficiencia de Producción */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-start justify-between">
        <div className="space-y-1 w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cumplimiento Producción
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-slate-800 font-display">
              {cumplimientoProduccion.toFixed(1)}%
            </p>
            <span className="text-xs text-slate-400 font-mono">de la meta</span>
          </div>
          {/* Barra de progreso */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${cumplimientoProduccion >= 90 ? 'bg-emerald-500' : cumplimientoProduccion >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(cumplimientoProduccion, 100)}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 font-mono">
            {totalRealTallos.toLocaleString()} / {totalMetaTallos.toLocaleString()} Tallos semanales
          </p>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl flex-shrink-0">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>

      {/* KPI 3: Estado Fertirriego */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Suelo Promedio (pH & CE)
          </p>
          <p className="text-2xl font-semibold text-slate-800 font-display">
            pH {promedioPh.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-sky-500" />
            CE Prom: {promedioCe.toFixed(2)} dS/m
          </p>
          <p className="text-[10px] text-emerald-600 font-mono bg-emerald-50/50 px-2 py-0.5 rounded-md mt-1.5 inline-block">
            Química óptima general
          </p>
        </div>
        <div className="p-3 bg-sky-50 text-sky-500 rounded-xl">
          <Droplet className="w-6 h-6" />
        </div>
      </div>

      {/* KPI 4: Fitosanidad Crítica */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Plaga de Mayor Presencia
          </p>
          <p className="text-2xl font-semibold text-rose-800 font-display truncate max-w-[180px]">
            {plagaMasFrecuente}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Reportado en <strong className="text-slate-700">{maxPlagaConteo}</strong> camas activas
          </p>
          <p className="text-[10px] text-rose-600 font-mono bg-rose-50 px-2 py-0.5 rounded-md mt-1.5 inline-block">
            Aplicar barrera de contención
          </p>
        </div>
        <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
          <Leaf className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
