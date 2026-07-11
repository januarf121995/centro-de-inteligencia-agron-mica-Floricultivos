/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bloque, Cama, MipeData, MirfeData, ProduccionData } from '../types';
import { X, ClipboardCheck, AlertCircle, Info } from 'lucide-react';

interface MonitoringFormProps {
  bloques: Bloque[];
  prefilledCamaId: string | null;
  onClose: () => void;
  onSubmit: (camaId: string, mipe: MipeData, mirfe: MirfeData, produccion: ProduccionData) => void;
}

export default function MonitoringForm({
  bloques,
  prefilledCamaId,
  onClose,
  onSubmit,
}: MonitoringFormProps) {
  // Encontrar la cama pre-llenada para inicializar valores
  let initialBloqueId = bloques[0]?.id || 'A';
  let initialCamaNumero = 1;

  if (prefilledCamaId) {
    const parts = prefilledCamaId.split('-');
    if (parts.length === 2) {
      initialBloqueId = parts[0];
      initialCamaNumero = parseInt(parts[1], 10);
    }
  }

  const [bloqueId, setBloqueId] = React.useState(initialBloqueId);
  const [camaNumero, setCamaNumero] = React.useState(initialCamaNumero);

  // Estados del Formulario
  const [plagaPrincipal, setPlagaPrincipal] = React.useState<MipeData['plagaPrincipal']>('Ninguna');
  const [severidad, setSeveridad] = React.useState<MipeData['severidad']>('ninguna');
  const [incidencia, setIncidencia] = React.useState<number>(0);

  const [ph, setPh] = React.useState<number>(5.9);
  const [ce, setCe] = React.useState<number>(1.4);
  const [drenaje, setDrenaje] = React.useState<number>(25);

  const [variedad, setVariedad] = React.useState('Freedom');
  const [meta, setMeta] = React.useState<number>(3500);
  const [real, setReal] = React.useState<number>(3400);

  // Error de validación
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Al cambiar el prefill o el bloque seleccionado, actualizar la variedad por defecto
  React.useEffect(() => {
    const camaSeleccionada = bloques
      .find(b => b.id === bloqueId)
      ?.camas.find(c => c.numero === camaNumero);

    if (camaSeleccionada) {
      setPlagaPrincipal(camaSeleccionada.mipe.plagaPrincipal);
      setSeveridad(camaSeleccionada.mipe.severidad);
      setIncidencia(camaSeleccionada.mipe.incidencia);
      setPh(camaSeleccionada.mirfe.ph);
      setCe(camaSeleccionada.mirfe.ce);
      setDrenaje(camaSeleccionada.mirfe.drenaje);
      setVariedad(camaSeleccionada.produccion.variedad);
      setMeta(camaSeleccionada.produccion.meta);
      setReal(camaSeleccionada.produccion.real);
    }
  }, [bloqueId, camaNumero, bloques]);

  // Si cambia el prefilledCamaId externamente, forzar actualización
  React.useEffect(() => {
    if (prefilledCamaId) {
      const parts = prefilledCamaId.split('-');
      if (parts.length === 2) {
        setBloqueId(parts[0]);
        setCamaNumero(parseInt(parts[1], 10));
      }
    }
  }, [prefilledCamaId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones físicas reales
    if (ph < 0 || ph > 14) {
      setErrorMsg('El pH debe estar en un rango válido entre 0 y 14.');
      return;
    }
    if (ce < 0 || ce > 10) {
      setErrorMsg('La Conductividad Eléctrica (CE) debe ser un número real positivo (ej: 1.5).');
      return;
    }
    if (drenaje < 0 || drenaje > 100) {
      setErrorMsg('El porcentaje de drenaje debe estar entre 0% y 100%.');
      return;
    }
    if (incidencia < 0 || incidencia > 100) {
      setErrorMsg('La incidencia fitosanitaria debe estar entre 0% y 100%.');
      return;
    }
    if (meta <= 0 || real < 0) {
      setErrorMsg('Los datos de producción (meta y real) deben ser números positivos.');
      return;
    }

    setErrorMsg(null);
    const targetCamaId = `${bloqueId}-${camaNumero}`;
    
    // Ejecutar sumisión
    onSubmit(
      targetCamaId,
      { plagaPrincipal, severidad, incidencia },
      { ph, ce, drenaje },
      { variedad, meta, real }
    );
  };

  // Obtener lista de camas válidas para el bloque seleccionado
  const camasDisponibles = bloques.find(b => b.id === bloqueId)?.camas || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="monitoring-form-overlay">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-slide-up" id="monitoring-form-modal">
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center bg-slate-900 text-white px-6 py-5">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5.5 h-5.5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-display font-semibold">
                Registrar Bitácora de Monitoreo
              </h2>
              <p className="text-xs text-slate-300">
                Ingrese parámetros tomados directamente en campo (MIPE + MIRFE + Rendimiento).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-150 p-3.5 rounded-xl text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Bloque 1: Ubicación Física */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-sm"></span>
              1. Ubicación de Campo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Bloque</label>
                <select
                  value={bloqueId}
                  onChange={(e) => {
                    setBloqueId(e.target.value);
                    setCamaNumero(1); // Resetear a cama 1 al cambiar bloque
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {bloques.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Cama</label>
                <select
                  value={camaNumero}
                  onChange={(e) => setCamaNumero(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {camasDisponibles.map(c => (
                    <option key={c.numero} value={c.numero}>Cama #{c.numero} ({c.produccion.variedad})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bloque 2: MIPE (Plagas y Enfermedades) */}
          <div className="space-y-3.5 bg-rose-50/20 p-4 rounded-xl border border-rose-100/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 border-b border-rose-100/50 pb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-rose-500 rounded-sm"></span>
              2. Fitoprotección Sanitaria (MIPE)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Plaga Principal</label>
                <select
                  value={plagaPrincipal}
                  onChange={(e) => {
                    const val = e.target.value as MipeData['plagaPrincipal'];
                    setPlagaPrincipal(val);
                    if (val === 'Ninguna') {
                      setSeveridad('ninguna');
                      setIncidencia(0);
                    } else if (severidad === 'ninguna') {
                      setSeveridad('baja');
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="Ninguna">Ninguna (Óptimo)</option>
                  <option value="Arañita Roja">Arañita Roja</option>
                  <option value="Botrytis">Botrytis</option>
                  <option value="Mildiu Polvoso">Mildiu Polvoso</option>
                  <option value="Trips">Trips</option>
                  <option value="Pulgón">Pulgón</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Severidad</label>
                <select
                  value={severidad}
                  disabled={plagaPrincipal === 'Ninguna'}
                  onChange={(e) => setSeveridad(e.target.value as MipeData['severidad'])}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="ninguna">Ninguna</option>
                  <option value="baja">Baja (Localizada)</option>
                  <option value="media">Media (Moderada)</option>
                  <option value="alta">Alta (Infestación General)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Incidencia (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={plagaPrincipal === 'Ninguna'}
                  value={incidencia}
                  onChange={(e) => setIncidencia(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: MIRFE (Fertirriego) */}
          <div className="space-y-3.5 bg-sky-50/20 p-4 rounded-xl border border-sky-100/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 border-b border-sky-100/50 pb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-sky-500 rounded-sm"></span>
              3. Parámetros Fertirriego (MIRFE)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">pH del Suelo</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={ph}
                  onChange={(e) => setPh(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block font-mono">Rango Ideal: 5.5 - 6.5</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">CE (dS/m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={ce}
                  onChange={(e) => setCe(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block font-mono">Rango Ideal: 1.2 - 1.8</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Drenaje (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={drenaje}
                  onChange={(e) => setDrenaje(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block font-mono">Rango Ideal: 20% - 35%</span>
              </div>
            </div>
          </div>

          {/* Bloque 4: Producción */}
          <div className="space-y-3.5 bg-blue-50/20 p-4 rounded-xl border border-blue-100/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100/50 pb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-blue-500 rounded-sm"></span>
              4. Desempeño Productivo Semanal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Variedad Florícola</label>
                <input
                  type="text"
                  disabled
                  value={variedad}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Meta (Tallos/Sem)</label>
                <input
                  type="number"
                  min="1"
                  value={meta}
                  onChange={(e) => setMeta(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 font-mono">Real (Tallos/Sem)</label>
                <input
                  type="number"
                  min="0"
                  value={real}
                  onChange={(e) => setReal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer del Modal */}
        <div className="flex items-center justify-end gap-3 px-6 py-4.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition-all shadow-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-all shadow-md hover:shadow-sm"
          >
            <ClipboardCheck className="w-4 h-4" />
            Guardar en Base Central
          </button>
        </div>
      </div>
    </div>
  );
}
