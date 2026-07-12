/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bloque, MipeData, MirfeData, ProduccionData } from '../types';

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
  // Encontrar la cama pre-llenada para inicializar valores. Se localiza por el
  // id de negocio completo (soporta ids reales como 'B-16-001'), no por split.
  let initialBloqueId = bloques[0]?.id || 'A';
  let initialCamaId = bloques[0]?.camas[0]?.id ?? '';

  if (prefilledCamaId) {
    for (const b of bloques) {
      if (b.camas.some((c) => c.id === prefilledCamaId)) {
        initialBloqueId = b.id;
        initialCamaId = prefilledCamaId;
        break;
      }
    }
  }

  const [bloqueId, setBloqueId] = React.useState(initialBloqueId);
  const [camaId, setCamaId] = React.useState(initialCamaId);

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

  // Al cambiar la cama seleccionada, precargar sus valores actuales
  React.useEffect(() => {
    const camaSeleccionada = bloques
      .find(b => b.id === bloqueId)
      ?.camas.find(c => c.id === camaId);

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
  }, [bloqueId, camaId, bloques]);

  // Si cambia el prefilledCamaId externamente, forzar actualización
  React.useEffect(() => {
    if (!prefilledCamaId) return;
    for (const b of bloques) {
      if (b.camas.some((c) => c.id === prefilledCamaId)) {
        setBloqueId(b.id);
        setCamaId(prefilledCamaId);
        break;
      }
    }
  }, [prefilledCamaId, bloques]);

  const handleSubmit = () => {
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
    if (!camaId) {
      setErrorMsg('Seleccione una cama válida.');
      return;
    }

    setErrorMsg(null);

    // Ejecutar sumisión
    onSubmit(
      camaId,
      { plagaPrincipal, severidad, incidencia },
      { ph, ce, drenaje },
      { variedad, meta, real }
    );
  };

  // Obtener lista de camas válidas para el bloque seleccionado
  const camasDisponibles = bloques.find(b => b.id === bloqueId)?.camas || [];

  // Helper: parsear el valor string de un calcite-input-number
  const num = (v: string | undefined, fallback = 0): number => {
    const n = parseFloat(v ?? '');
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <calcite-dialog
      open
      modal
      heading="Registrar Bitácora de Monitoreo"
      description="Ingrese parámetros tomados directamente en campo (MIPE + MIRFE + Rendimiento)."
      oncalciteDialogClose={onClose}
      id="monitoring-form-modal"
    >
      <div className="space-y-6">
        {errorMsg && (
          <calcite-notice open kind="danger" icon="exclamation-mark-triangle" width="full">
            <div slot="message">{errorMsg}</div>
          </calcite-notice>
        )}

        {/* Bloque 1: Ubicación Física */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
            1. Ubicación de Campo
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <calcite-label>
              Bloque
              <calcite-select
                label="Bloque"
                value={bloqueId}
                oncalciteSelectChange={(e) => {
                  const nuevoBloque = e.currentTarget.value;
                  setBloqueId(nuevoBloque);
                  const primera = bloques.find((b) => b.id === nuevoBloque)?.camas[0];
                  setCamaId(primera?.id ?? '');
                }}
              >
                {bloques.map(b => (
                  <calcite-option key={b.id} value={b.id} label={b.nombre}></calcite-option>
                ))}
              </calcite-select>
            </calcite-label>

            <calcite-label>
              Cama
              <calcite-select
                label="Cama"
                value={camaId}
                oncalciteSelectChange={(e) => setCamaId(e.currentTarget.value)}
              >
                {camasDisponibles.map(c => (
                  <calcite-option
                    key={c.id}
                    value={c.id}
                    label={`Cama ${c.id} (${c.produccion.variedad})`}
                  ></calcite-option>
                ))}
              </calcite-select>
            </calcite-label>
          </div>
        </div>

        {/* Bloque 2: MIPE (Plagas y Enfermedades) */}
        <div className="space-y-3.5 bg-rose-50/20 p-4 rounded-xl border border-rose-100/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 border-b border-rose-100/50 pb-1.5">
            2. Fitoprotección Sanitaria (MIPE)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <calcite-label>
              Plaga Principal
              <calcite-select
                label="Plaga Principal"
                value={plagaPrincipal}
                oncalciteSelectChange={(e) => {
                  const val = e.currentTarget.value as MipeData['plagaPrincipal'];
                  setPlagaPrincipal(val);
                  if (val === 'Ninguna') {
                    setSeveridad('ninguna');
                    setIncidencia(0);
                  } else if (severidad === 'ninguna') {
                    setSeveridad('baja');
                  }
                }}
              >
                <calcite-option value="Ninguna" label="Ninguna (Óptimo)"></calcite-option>
                <calcite-option value="Arañita Roja" label="Arañita Roja"></calcite-option>
                <calcite-option value="Botrytis" label="Botrytis"></calcite-option>
                <calcite-option value="Mildiu Polvoso" label="Mildiu Polvoso"></calcite-option>
                <calcite-option value="Trips" label="Trips"></calcite-option>
                <calcite-option value="Pulgón" label="Pulgón"></calcite-option>
              </calcite-select>
            </calcite-label>

            <calcite-label>
              Severidad
              <calcite-select
                label="Severidad"
                disabled={plagaPrincipal === 'Ninguna'}
                value={severidad}
                oncalciteSelectChange={(e) => setSeveridad(e.currentTarget.value as MipeData['severidad'])}
              >
                <calcite-option value="ninguna" label="Ninguna"></calcite-option>
                <calcite-option value="baja" label="Baja (Localizada)"></calcite-option>
                <calcite-option value="media" label="Media (Moderada)"></calcite-option>
                <calcite-option value="alta" label="Alta (Infestación General)"></calcite-option>
              </calcite-select>
            </calcite-label>

            <calcite-label>
              Incidencia (%)
              <calcite-input-number
                min={0}
                max={100}
                disabled={plagaPrincipal === 'Ninguna'}
                value={String(incidencia)}
                oncalciteInputNumberInput={(e) =>
                  setIncidencia(Math.min(100, Math.max(0, Math.round(num(e.currentTarget.value)))))
                }
              ></calcite-input-number>
            </calcite-label>
          </div>
        </div>

        {/* Bloque 3: MIRFE (Fertirriego) */}
        <div className="space-y-3.5 bg-sky-50/20 p-4 rounded-xl border border-sky-100/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 border-b border-sky-100/50 pb-1.5">
            3. Parámetros Fertirriego (MIRFE)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <calcite-label>
              pH del Suelo
              <calcite-input-number
                min={0}
                max={14}
                step={0.1}
                value={String(ph)}
                oncalciteInputNumberInput={(e) => setPh(num(e.currentTarget.value))}
              ></calcite-input-number>
              <span className="text-[10px] text-slate-400 font-mono">Rango Ideal: 5.5 - 6.5</span>
            </calcite-label>

            <calcite-label>
              CE (dS/m)
              <calcite-input-number
                min={0}
                max={10}
                step={0.1}
                value={String(ce)}
                oncalciteInputNumberInput={(e) => setCe(num(e.currentTarget.value))}
              ></calcite-input-number>
              <span className="text-[10px] text-slate-400 font-mono">Rango Ideal: 1.2 - 1.8</span>
            </calcite-label>

            <calcite-label>
              Drenaje (%)
              <calcite-input-number
                min={0}
                max={100}
                value={String(drenaje)}
                oncalciteInputNumberInput={(e) =>
                  setDrenaje(Math.min(100, Math.max(0, Math.round(num(e.currentTarget.value)))))
                }
              ></calcite-input-number>
              <span className="text-[10px] text-slate-400 font-mono">Rango Ideal: 20% - 35%</span>
            </calcite-label>
          </div>
        </div>

        {/* Bloque 4: Producción */}
        <div className="space-y-3.5 bg-blue-50/20 p-4 rounded-xl border border-blue-100/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 border-b border-blue-100/50 pb-1.5">
            4. Desempeño Productivo Semanal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <calcite-label>
              Variedad Florícola
              <calcite-input disabled value={variedad}></calcite-input>
            </calcite-label>

            <calcite-label>
              Meta (Tallos/Sem)
              <calcite-input-number
                min={1}
                value={String(meta)}
                oncalciteInputNumberInput={(e) => setMeta(Math.max(1, Math.round(num(e.currentTarget.value, 1))))}
              ></calcite-input-number>
            </calcite-label>

            <calcite-label>
              Real (Tallos/Sem)
              <calcite-input-number
                min={0}
                value={String(real)}
                oncalciteInputNumberInput={(e) => setReal(Math.max(0, Math.round(num(e.currentTarget.value))))}
              ></calcite-input-number>
            </calcite-label>
          </div>
        </div>
      </div>

      {/* Acciones del Diálogo */}
      <calcite-button slot="footer-end" appearance="outline" onClick={onClose}>
        Cancelar
      </calcite-button>
      <calcite-button slot="footer-end" icon-start="save" onClick={handleSubmit}>
        Guardar en Base Central
      </calcite-button>
    </calcite-dialog>
  );
}
