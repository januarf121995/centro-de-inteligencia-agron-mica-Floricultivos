/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cama } from '../types';
import { RANGOS_OPTISMOS, calcularRiesgoCama } from '../data';
import {
  Leaf,
  Droplet,
  TrendingUp,
  Calendar,
  ClipboardCheck
} from 'lucide-react';

interface BedDetailProps {
  cama: Cama | null;
  onClose: () => void;
  onOpenMonitoringForm: (camaId: string) => void;
}

export default function BedDetail({ cama, onClose, onOpenMonitoringForm }: BedDetailProps) {
  if (!cama) {
    return (
      <calcite-panel heading="Dossier de Cama">
        <div className="p-4 flex items-center justify-center h-full min-h-[400px]">
          <calcite-notice open icon="information" kind="info" width="full">
            <div slot="title">Ninguna Cama Seleccionada</div>
            <div slot="message">
              Haz clic en cualquier cama en el mapa espacial para desplegar su expediente agronómico completo.
            </div>
          </calcite-notice>
        </div>
      </calcite-panel>
    );
  }

  const riesgo = calcularRiesgoCama(cama);
  const pctCumplimiento = (cama.produccion.real / cama.produccion.meta) * 100;

  // Opción A: la capa real no trae un campo de incidencia, así que se deriva
  // del texto de SEVERIDAD (normalizado a minúsculas) a un % fijo.
  const incidenciaDerivada = (() => {
    switch (cama.mipe.severidad?.toLowerCase()) {
      case 'alta':
        return 85;
      case 'media':
        return 50;
      case 'baja':
        return 15;
      default:
        return 0;
    }
  })();

  // Umbral de daño económico (aspersión). Por encima → intervención química.
  const umbralIncidencia = RANGOS_OPTISMOS.mipe.incidenciaMaximaAceptable;
  const umbralSuperado = incidenciaDerivada > umbralIncidencia;

  // Analizador dinámico de recomendaciones de corrección
  const obtenerRecomendaciones = (): string[] => {
    const recs: string[] = [];

    // Validar MIPE
    if (cama.mipe.severidad === 'alta') {
      recs.push(`🚨 PRIORITARIO: Aplicación curativa inmediata contra ${cama.mipe.plagaPrincipal}. Suspender rebrotes manuales en esta hilera.`);
    } else if (cama.mipe.severidad === 'media') {
      recs.push(`⚠️ CONTROL: Programar aspersión focalizada y colocar trampas cromáticas para ${cama.mipe.plagaPrincipal}.`);
    }

    // Validar MIRFE - pH
    if (cama.mirfe.ph < RANGOS_OPTISMOS.mirfe.ph.min) {
      recs.push(`🧪 SUELO ÁCIDO: El pH de ${cama.mirfe.ph} limita la absorción de Fósforo (P) y Potasio (K). Elevar pH aplicando carbonato de calcio o ajustando nitrato en el riego.`);
    } else if (cama.mirfe.ph > RANGOS_OPTISMOS.mirfe.ph.max) {
      recs.push(`🧪 SUELO ALCALINO: El pH de ${cama.mirfe.ph} bloquea el Hierro y Zinc. Acidificar el agua de riego mediante inyección controlada de Ácido Nítrico/Fosfórico.`);
    }

    // Validar MIRFE - CE
    if (cama.mirfe.ce < RANGOS_OPTISMOS.mirfe.ce.min) {
      recs.push(`⚡ BAJA SALINIDAD (CE: ${cama.mirfe.ce}): Nutrición deficiente. Aumentar dosis de microelementos y balance N-P-K en la receta de inyección.`);
    } else if (cama.mirfe.ce > RANGOS_OPTISMOS.mirfe.ce.max) {
      recs.push(`⚡ EXCESO DE SALES (CE: ${cama.mirfe.ce}): Riesgo de quemado radicular. Ejecutar lavado de sales (lixiviación) con pulso de agua pura (sin abono) en el siguiente turno.`);
    }

    // Validar MIRFE - Drenaje
    if (cama.mirfe.drenaje < RANGOS_OPTISMOS.mirfe.drenaje.min) {
      recs.push(`💧 DRENAJE BAJO (${cama.mirfe.drenaje}%): Suelo reteniendo demasiada humedad o compactado. Reducir la frecuencia de riego e inspeccionar la aireación física de la cama.`);
    } else if (cama.mirfe.drenaje > RANGOS_OPTISMOS.mirfe.drenaje.max) {
      recs.push(`💧 DRENAJE EXCESIVO (${cama.mirfe.drenaje}%): Pérdida de fertilizantes por escorrentía rápida. Reducir el tiempo de pulso de riego y revisar goteros.`);
    }

    // Validar Producción
    if (pctCumplimiento < 75) {
      recs.push(`🌹 BAJA PRODUCTIVIDAD (${Math.round(pctCumplimiento)}%): Cosecha afectada. Realizar desbrote fino y auditar si hay daños históricos en corona o tallos ciegos.`);
    }

    if (recs.length === 0) {
      recs.push(`✅ ESTADO ÓPTIMO: Continuar con el plan de fertilización estándar y monitoreo fitosanitario preventivo bisemanal.`);
    }

    return recs;
  };

  // Determinar badges de riesgo
  const getBadgeRiesgo = () => {
    if (riesgo === 'critico') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-600"></span>
          Riesgo Crítico
        </span>
      );
    }
    if (riesgo === 'medio') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Riesgo Moderado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        Estable
      </span>
    );
  };

  return (
    <calcite-panel
      heading={`Cama ${cama.id}`}
      description={`Bloque ${cama.bloqueId} • Variedad: ${cama.produccion.variedad}`}
      id="bed-expediente-panel"
    >
      {/* Estado de riesgo + última modificación en la cabecera del panel */}
      <div slot="header-actions-end" className="flex flex-col items-end gap-1 px-2">
        {getBadgeRiesgo()}
        <span className="text-[10px] text-slate-400 font-mono">
          Modificado: {cama.ultimaActualizacion}
        </span>
      </div>

      <div className="p-4 flex flex-col h-full overflow-y-auto">

      {/* Botón de actualizar monitoreo */}
      <calcite-button
        width="full"
        icon-start="clipboard"
        id="btn-actualizar-monitoreo"
        onClick={() => onOpenMonitoringForm(cama.id)}
      >
        Registrar Nuevo Monitoreo
      </calcite-button>

      <div className="space-y-6 mt-5">
        {/* Sección MIPE */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Leaf className="w-4.5 h-4.5 text-emerald-500" />
            Monitoreo Sanitario (MIPE)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 font-mono uppercase">Plaga Principal</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {cama.mipe.plagaPrincipal}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono uppercase">Severidad</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-1 capitalize
                ${cama.mipe.severidad === 'alta' ? 'bg-red-100 text-red-800' : 
                  cama.mipe.severidad === 'media' ? 'bg-orange-100 text-orange-800' : 
                  cama.mipe.severidad === 'baja' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-slate-100 text-slate-700'}`}
              >
                {cama.mipe.severidad}
              </span>
            </div>
          </div>
          {/* Barra de incidencia (derivada de la severidad — Opción A) */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-mono">Incidencia Fitosanitaria</span>
              <span className={`font-semibold font-mono ${umbralSuperado ? 'text-rose-600' : 'text-slate-800'}`}>
                {incidenciaDerivada}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  incidenciaDerivada > 50
                    ? 'bg-red-500'
                    : umbralSuperado
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${incidenciaDerivada}%` }}
              ></div>
            </div>
            <p className={`text-[10px] mt-1 font-mono ${umbralSuperado ? 'text-rose-600 font-medium' : 'text-slate-400'}`}>
              {umbralSuperado
                ? `⚠ Umbral de ${umbralIncidencia}% superado — requiere aspersión / intervención química`
                : `Umbral máximo aceptable: ${umbralIncidencia}% de aspersión`}
            </p>
          </div>
        </div>

        {/* Sección MIRFE */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <Droplet className="w-4.5 h-4.5 text-sky-500" />
            Fertirriego & Nutrición (MIRFE)
          </h3>
          <div className="space-y-4">
            {/* Medidor pH */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-mono">pH del Suelo</span>
                <span className={`font-semibold font-mono ${(cama.mirfe.ph < 5.5 || cama.mirfe.ph > 6.5) ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {cama.mirfe.ph.toFixed(2)}
                </span>
              </div>
              {/* Slider de rango */}
              <div className="relative w-full bg-slate-200 rounded-full h-2.5">
                {/* Zona Óptima */}
                <div className="absolute left-[33%] right-[33%] bg-emerald-200/80 h-2.5 rounded-none border-x border-emerald-400"></div>
                {/* Indicador del pH actual */}
                {/* Mapeo del pH 4.0 - 8.0 al 0% - 100% */}
                {(() => {
                  const percent = Math.min(Math.max(((cama.mirfe.ph - 4) / 4) * 100, 0), 100);
                  return (
                    <div 
                      className="absolute w-3 h-3 bg-slate-800 border border-white rounded-full -top-0.5 -translate-x-1/2 transition-all shadow-md"
                      style={{ left: `${percent}%` }}
                    ></div>
                  );
                })()}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>pH 4.0 (Ácido)</span>
                <span className="text-emerald-600 font-medium">Óptimo: 5.5 - 6.5</span>
                <span>pH 8.0 (Alcalino)</span>
              </div>
            </div>

            {/* Medidor CE */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-mono">Conductividad Eléctrica (CE)</span>
                <span className={`font-semibold font-mono ${(cama.mirfe.ce < 1.2 || cama.mirfe.ce > 1.8) ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {cama.mirfe.ce.toFixed(2)} dS/m
                </span>
              </div>
              <div className="relative w-full bg-slate-200 rounded-full h-2.5">
                {/* Zona Óptima: 1.2 - 1.8 (mapeando de 0.0 - 3.0 dS/m) */}
                <div className="absolute left-[40%] right-[40%] bg-emerald-200/80 h-2.5 rounded-none border-x border-emerald-400"></div>
                {/* Indicador de CE */}
                {(() => {
                  const percent = Math.min(Math.max((cama.mirfe.ce / 3) * 100, 0), 100);
                  return (
                    <div 
                      className="absolute w-3 h-3 bg-slate-800 border border-white rounded-full -top-0.5 -translate-x-1/2 transition-all shadow-md"
                      style={{ left: `${percent}%` }}
                    ></div>
                  );
                })()}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>0.0 dS/m</span>
                <span className="text-emerald-600 font-medium">Óptimo: 1.2 - 1.8 dS/m</span>
                <span>3.0 dS/m</span>
              </div>
            </div>

            {/* Medidor Drenaje */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-mono">Porcentaje de Drenaje</span>
                <span className={`font-semibold font-mono ${(cama.mirfe.drenaje < 20 || cama.mirfe.drenaje > 35) ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {cama.mirfe.drenaje}%
                </span>
              </div>
              <div className="relative w-full bg-slate-200 rounded-full h-2.5">
                {/* Zona Óptima: 20% - 35% (mapeando de 0% - 50%) */}
                <div className="absolute left-[40%] right-[30%] bg-emerald-200/80 h-2.5 rounded-none border-x border-emerald-400"></div>
                {/* Indicador de Drenaje */}
                {(() => {
                  const percent = Math.min(Math.max((cama.mirfe.drenaje / 50) * 100, 0), 100);
                  return (
                    <div 
                      className="absolute w-3 h-3 bg-slate-800 border border-white rounded-full -top-0.5 -translate-x-1/2 transition-all shadow-md"
                      style={{ left: `${percent}%` }}
                    ></div>
                  );
                })()}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                <span>0% de drenaje</span>
                <span className="text-emerald-600 font-medium">Óptimo: 20% - 35%</span>
                <span>50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección Rendimiento Productivo */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4.5 h-4.5 text-blue-500" />
            Rendimiento Productivo Semanal
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-slate-400 font-mono uppercase">Cosecha Real</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {cama.produccion.real.toLocaleString()} tallos
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono uppercase">Meta Semanal</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {cama.produccion.meta.toLocaleString()} tallos
              </p>
            </div>
          </div>
          {/* Barra de meta */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-mono">Eficiencia de Producción</span>
              <span className={`font-semibold font-mono ${pctCumplimiento >= 90 ? 'text-emerald-600' : pctCumplimiento >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                {pctCumplimiento.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${pctCumplimiento >= 90 ? 'bg-emerald-500' : pctCumplimiento >= 75 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${Math.min(pctCumplimiento, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Historial de la Cama (Sparklines/Evolución) */}
        {cama.historico && cama.historico.length > 0 && (
          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Calendar className="w-4.5 h-4.5 text-indigo-500" />
              Tendencia Agronómica (Últimas Semanas)
            </h3>
            <div className="space-y-3 font-mono text-[11px] text-slate-600">
              <div className="grid grid-cols-5 text-slate-400 font-semibold border-b border-slate-200 pb-1.5 uppercase">
                <span>Semana</span>
                <span className="text-center">pH</span>
                <span className="text-center">CE</span>
                <span className="text-center">Incid.</span>
                <span className="text-right">Tallos</span>
              </div>
              {cama.historico.map((h, idx) => (
                <div key={idx} className="grid grid-cols-5 py-0.5 hover:bg-slate-100/50 rounded px-1 transition-colors">
                  <span className="font-medium text-slate-800">{h.semana}</span>
                  <span className="text-center">{h.ph.toFixed(1)}</span>
                  <span className="text-center">{h.ce.toFixed(1)}</span>
                  <span className={`text-center ${h.incidencia > 10 ? 'text-rose-600 font-medium' : ''}`}>
                    {h.incidencia}%
                  </span>
                  <span className="text-right text-slate-800">{h.produccionReal.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnóstico Agronómico Inteligente */}
        <div className="border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-4.5 h-4.5 text-emerald-600" />
            Plan de Acción Correctiva
          </h3>
          <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-xl p-4 space-y-2">
            {obtenerRecomendaciones().map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                <span className="text-emerald-600 mt-0.5 flex-shrink-0">•</span>
                <p>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </calcite-panel>
  );
}
