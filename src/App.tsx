/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bloque, Cama, VisualLayer, MipeData, MirfeData, ProduccionData, PriorityAction, ArcgisMapElement } from './types';
import { BLOQUES_INICIALES, calcularRiesgoCama, generarAccionesPrioritarias, GIS_CONFIG, getDataProvider } from './data';
import FarmStats from './components/FarmStats';
import FarmMap from './components/FarmMap';
import BedDetail from './components/BedDetail';
import ActionList from './components/ActionList';
import MonitoringForm from './components/MonitoringForm';
import { 
  Sprout, 
  Layers, 
  PlusCircle, 
  Search, 
  SlidersHorizontal,
  FileText,
  AlertTriangle,
  History,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Leaf,
  Droplet
} from 'lucide-react';

export default function App() {
  // Proveedor de datos GIS (mock + localStorage por defecto; Feature Service
  // cuando configures GIS_CONFIG). Es la fuente única para leer/escribir camas.
  const provider = React.useMemo(() => getDataProvider(GIS_CONFIG), []);

  // Referencia al componente <arcgis-map>: fuente única de consultas espaciales
  // (extensiones, hitTests, queries contra el servicio) para toda la app.
  const mapRef = React.useRef<ArcgisMapElement | null>(null);

  // Cargar estado inicial desde localStorage si existe
  const [bloques, setBloques] = React.useState<Bloque[]>(() => {
    const saved = localStorage.getItem('cia_bloques_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parseando localStorage, cargando por defecto', e);
      }
    }
    return BLOQUES_INICIALES;
  });

  // En modo no-mock (Feature Service / Web Map), hidratar los bloques desde el
  // servicio. En modo mock esto no corre y se conserva el estado de localStorage.
  React.useEffect(() => {
    if (provider.mode === 'mock') return;
    let cancelled = false;
    provider
      .loadBloques()
      .then((data) => {
        if (!cancelled) setBloques(data);
      })
      .catch((e) => console.error('Error cargando datos del servicio GIS', e));
    return () => {
      cancelled = true;
    };
  }, [provider]);

  // Guardar en localStorage cada vez que cambien los bloques
  React.useEffect(() => {
    localStorage.setItem('cia_bloques_data', JSON.stringify(bloques));
  }, [bloques]);

  // Sin selección inicial fija: los ids reales dependen del origen de datos
  // (p. ej. 'B-16-001' en el Web Map), así que se auto-selecciona la primera
  // cama al cargar features (ver handleFeaturesLoaded).
  const [selectedCamaId, setSelectedCamaId] = React.useState<string | null>(null);
  const [activeLayer, setActiveLayer] = React.useState<VisualLayer>('riesgo');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [formPrefillId, setFormPrefillId] = React.useState<string | null>(null);

  // Sistema de pestañas para la columna derecha (Expediente vs Tareas)
  const [rightPanelTab, setRightPanelTab] = React.useState<'expediente' | 'tareas'>('expediente');

  // Estado para un toast flotante de confirmación de bases de datos
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // Acciones prioritarias recalculadas reactivamente
  const acciones = React.useMemo(() => generarAccionesPrioritarias(bloques), [bloques]);

  // Features cargadas desde la capa del Web Map → fuente de verdad del tablero.
  // Además auto-selecciona la primera cama si no hay una selección válida, para
  // que el panel lateral muestre un expediente en cuanto cargan los datos.
  const handleFeaturesLoaded = React.useCallback((data: Bloque[]) => {
    setBloques(data);
    setSelectedCamaId((current) => {
      const sigueValido = current != null && data.some((b) => b.camas.some((c) => c.id === current));
      return sigueValido ? current : data[0]?.camas[0]?.id ?? null;
    });
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Handler para agregar/actualizar un monitoreo
  const handleUpdateMonitoring = (
    camaId: string,
    mipe: MipeData,
    mirfe: MirfeData,
    produccion: ProduccionData
  ) => {
    const parts = camaId.split('-');
    if (parts.length !== 2) return;
    const bId = parts[0];
    const cNum = parseInt(parts[1], 10);

    setBloques((prevBloques) =>
      prevBloques.map((bloque) => {
        if (bloque.id !== bId) return bloque;

        return {
          ...bloque,
          camas: bloque.camas.map((cama) => {
            if (cama.numero !== cNum) return cama;

            // Generar nuevo registro histórico basado en el registro previo
            const nuevaSemanaNum = (cama.historico.length + 24);
            const nuevoRegistroHistorico = {
              semana: `Sem ${nuevaSemanaNum}`,
              ph: mirfe.ph,
              ce: mirfe.ce,
              incidencia: mipe.incidencia,
              produccionReal: produccion.real,
            };

            // Mantener últimos 5 registros históricos
            const nuevoHistorico = [...cama.historico, nuevoRegistroHistorico].slice(-5);

            return {
              ...cama,
              mipe,
              mirfe,
              produccion,
              historico: nuevoHistorico,
              ultimaActualizacion: new Date().toISOString().split('T')[0],
            };
          }),
        };
      })
    );

    // Persistir el monitoreo a través del proveedor GIS (no-op en mock; en
    // Feature Service ejecuta applyEdits contra la capa cuando lo implementes).
    provider.saveMonitoring(camaId, mipe, mirfe, produccion).catch((e) =>
      console.error('Error guardando monitoreo en el servicio GIS', e)
    );

    setShowForm(false);
    setFormPrefillId(null);
    setSelectedCamaId(camaId); // Seleccionar la cama recién actualizada
    triggerToast(`📊 Bitácora guardada con éxito para la Cama ${camaId}. Mapas y alarmas recalculados.`);
  };

  // Handler para resolver un problema de cama (restablecer valores a óptimos)
  const handleCompletarAccion = (accionId: string) => {
    const accion = acciones.find((a) => a.id === accionId);
    if (!accion) return;

    const bId = accion.bloqueId;
    const camaId = accion.camaId; // id de negocio real (CAMAS_ID), no reconstruido

    setBloques((prevBloques) =>
      prevBloques.map((bloque) => {
        if (bloque.id !== bId) return bloque;

        return {
          ...bloque,
          camas: bloque.camas.map((cama) => {
            if (cama.id !== camaId) return cama;

            // Restablecer parámetros a óptimos estables según la categoría corregida
            let mipe = { ...cama.mipe };
            let mirfe = { ...cama.mirfe };
            let produccion = { ...cama.produccion };

            if (accion.categoria === 'mipe' || accion.categoria === 'mixto') {
              mipe = { plagaPrincipal: 'Ninguna', severidad: 'ninguna', incidencia: 0 };
            }
            if (accion.categoria === 'mirfe' || accion.categoria === 'mixto') {
              mirfe = { ph: 6.0, ce: 1.4, drenaje: 25 };
            }
            if (accion.categoria === 'produccion' || accion.categoria === 'mixto') {
              produccion = { ...cama.produccion, real: cama.produccion.meta };
            }

            const nuevaSemanaNum = (cama.historico.length + 24);
            const nuevoHistorico = [
              ...cama.historico,
              {
                semana: `Sem ${nuevaSemanaNum}`,
                ph: mirfe.ph,
                ce: mirfe.ce,
                incidencia: mipe.incidencia,
                produccionReal: produccion.real,
              }
            ].slice(-5);

            return {
              ...cama,
              mipe,
              mirfe,
              produccion,
              historico: nuevoHistorico,
              ultimaActualizacion: new Date().toISOString().split('T')[0],
            };
          }),
        };
      })
    );

    triggerToast(`✅ Acción de campo completada para Cama ${camaId}. Suelo y salud vegetal estabilizados.`);
  };

  // Buscar la cama seleccionada actualmente para pasarla al detalle
  const selectedCama = React.useMemo(() => {
    if (!selectedCamaId) return null;
    for (const b of bloques) {
      const c = b.camas.find((item) => item.id === selectedCamaId);
      if (c) return c;
    }
    return null;
  }, [selectedCamaId, bloques]);

  // Al seleccionar cama desde la lista de acciones, forzar la pestaña del Expediente para ver los detalles de esa cama
  const handleSelectCamaFromAction = (camaId: string) => {
    setSelectedCamaId(camaId);
    setRightPanelTab('expediente');
    // Scroll suave hasta el panel de detalle en mobile si es necesario
    const panel = document.getElementById('right-agronomic-column');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenFormFromDetail = (camaId: string) => {
    setFormPrefillId(camaId);
    setShowForm(true);
  };

  const resetAllData = () => {
    if (window.confirm('¿Desea restablecer todos los datos del Centro Agronómico a los valores iniciales de fábrica?')) {
      setBloques(BLOQUES_INICIALES);
      setSelectedCamaId('A-3');
      setRightPanelTab('expediente');
      triggerToast('🔄 Datos agronómicos restablecidos al estado de inicialización.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Toast Informativo Flotante */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 z-50 animate-slide-up max-w-md">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
          <p className="text-xs font-medium leading-relaxed">{toastMsg}</p>
        </div>
      )}

      {/* HEADER DE LA APLICACIÓN */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Logo y Eslogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded">
                  Modelo Unificado
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400 font-mono">BellaVista Florícola</span>
              </div>
              <h1 className="text-lg font-display font-bold tracking-tight text-white mt-0.5">
                Centro de Inteligencia Agronómica
              </h1>
            </div>
          </div>

          {/* Breve Resumen Contextual de la Solución */}
          <div className="hidden lg:block max-w-md bg-slate-800/40 border border-slate-800/80 px-4 py-2.5 rounded-xl text-[11px] text-slate-300 leading-relaxed">
            <span className="text-emerald-400 font-semibold block mb-0.5">La Innovación: Conexión Espacial</span>
            Integra variables de sanidad vegetal (MIPE), fertirriego (MIRFE) y metas de producción en un único modelo geográfico para priorizar la labor de campo.
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormPrefillId(selectedCamaId);
                setShowForm(true);
              }}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-sm transition-all"
              id="btn-global-monitoreo"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo Reporte
            </button>

            <button
              onClick={resetAllData}
              title="Restablecer datos por defecto"
              className="p-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
            >
              <History className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* SECCIÓN PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">

        {/* METER CON KPI PRINCIPALES */}
        <FarmStats bloques={bloques} />

        {/* BARRA DE CONTROLES, CAPAS Y BÚSQUEDA */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Capas de visualización espacial */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono mb-1 sm:mb-0">
              <Layers className="w-4 h-4 text-slate-400" />
              Capa Espacial:
            </span>
            <div className="bg-slate-100/80 p-1 rounded-xl flex flex-wrap gap-1">
              {[
                { id: 'riesgo', label: 'Riesgo Integrado', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
                { id: 'mipe', label: 'Sanidad (MIPE)', icon: <Leaf className="w-3.5 h-3.5" /> },
                { id: 'mirfe', label: 'Fertirriego (MIRFE)', icon: <Droplet className="w-3.5 h-3.5" /> },
                { id: 'produccion', label: 'Producción', icon: <TrendingUp className="w-3.5 h-3.5" /> }
              ].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id as VisualLayer)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all
                    ${activeLayer === layer.id
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                    }
                  `}
                >
                  {layer.icon}
                  {layer.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input de Búsqueda de Camas o Plagas */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cama (ej: A-3), variedad o plaga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-9.5 pr-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 bg-rose-50 rounded"
              >
                Limpiar Filtro
              </button>
            )}
          </div>
        </div>

        {/* CONTENEDOR CENTRAL: MAPA + PANEL DE EXPEDIENTE / TAREAS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Columna Izquierda (Mapa de Camas) - Toma 3 de 5 columnas en desktop */}
          <div className="lg:col-span-3 h-full">
            <FarmMap
              bloques={bloques}
              activeLayer={activeLayer}
              selectedCamaId={selectedCamaId}
              onSelectCama={(camaId) => {
                setSelectedCamaId(camaId);
                setRightPanelTab('expediente'); // Cambiar a expediente al hacer clic en el mapa
              }}
              searchQuery={searchQuery}
              mapRef={mapRef}
              onFeaturesLoaded={handleFeaturesLoaded}
            />
          </div>

          {/* Columna Derecha (Expediente Agronómico + Tareas) - Toma 2 de 5 columnas en desktop */}
          <div className="lg:col-span-2 space-y-6 h-full flex flex-col" id="right-agronomic-column">
            
            {/* Selector de pestañas para el panel derecho */}
            <div className="bg-slate-200/50 p-1 rounded-2xl flex gap-1 w-full border border-slate-100">
              <button
                onClick={() => setRightPanelTab('expediente')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all
                  ${rightPanelTab === 'expediente'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                  }
                `}
              >
                <FileText className="w-4 h-4" />
                Dossier de Cama Selected
              </button>

              <button
                onClick={() => setRightPanelTab('tareas')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all relative
                  ${rightPanelTab === 'tareas'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                  }
                `}
              >
                <AlertTriangle className="w-4 h-4" />
                Lista Prioridades Campo
                {acciones.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                    {acciones.length}
                  </span>
                )}
              </button>
            </div>

            {/* Renderizado de la Pestaña Activa */}
            <div className="flex-1">
              {rightPanelTab === 'expediente' ? (
                <BedDetail
                  cama={selectedCama}
                  onClose={() => setSelectedCamaId(null)}
                  onOpenMonitoringForm={handleOpenFormFromDetail}
                />
              ) : (
                <ActionList
                  acciones={acciones}
                  onSelectCama={handleSelectCamaFromAction}
                  onCompletarAccion={handleCompletarAccion}
                />
              )}
            </div>

          </div>
        </div>

        {/* SECCIÓN DOCUMENTAL EXPLICATIVA DE METODOLOGÍA (SOBRE EL CENTRO AGRONÓMICO) */}
        <section className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 mt-12 border border-slate-800" id="metodologia-agronoma">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-xl md:text-2xl font-display font-bold text-emerald-400">
              ¿Por qué es innovador conectar estas variables?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tradicionalmente, las florícolas inspeccionan plagas (MIPE), revisan conductividad y acidez en laboratorio (MIRFE), y miden tallos cosechados de forma independiente. Esta fragmentación de datos provoca que cuando un agrónomo detecta una caída de producción, ya es demasiado tarde.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              El <strong className="text-white">Centro de Inteligencia Agronómica</strong> unifica estas capas espacialmente. Por primera vez, el líder agrónomo puede visualizar si un bloque de camas en declive productivo tiene correlación con una acidez excesiva de suelo o un foco de arañitas rojas en tiempo real, lo que permite tomar medidas antes de que los tallos pierdan valor de exportación.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 mt-6">
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-emerald-400 font-mono">1. Sanidad (MIPE)</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Evalúa severidad de plagas y aspersión dirigida para prevenir mermas estéticas de pétalos.</p>
              </div>
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-sky-400 font-mono">2. Nutrición (MIRFE)</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Controla pH, CE y drenaje para asegurar la asimilación idónea de microelementos.</p>
              </div>
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                <span className="text-xs uppercase font-bold text-blue-400 font-mono">3. Proyecciones</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Previene pérdidas logísticas cruzando datos de calidad del tallo antes del empaque.</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* PIE DE PÁGINA */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-6">
          <p>Plataforma Diseñada para Florícolas de Alta Densidad • © 2026 Centro de Inteligencia Agronómica</p>
          <p className="mt-1 text-slate-300">Modelado Dinámico de Conductividad de Suelos y Control Biológico • BellaVista Florícola S.A.</p>
        </div>
      </footer>

      {/* FORMULARIO FLOTANTE (MODAL) */}
      {showForm && (
        <MonitoringForm
          bloques={bloques}
          prefilledCamaId={formPrefillId}
          onClose={() => {
            setShowForm(false);
            setFormPrefillId(null);
          }}
          onSubmit={handleUpdateMonitoring}
        />
      )}

    </div>
  );
}
