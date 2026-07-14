# 🌱 Centro de Inteligencia Agronómica para Florícolas

> Plataforma web de inteligencia geoespacial para el monitoreo agronómico de cultivos de flor de exportación, desarrollada para **Sector Recursos Naturales | ESRI | Colombia y Ecuador**.

<p>
  <a href="https://januarf121995.github.io/centro-de-inteligencia-agron-mica-Floricultivos/"><img alt="Demo en vivo" src="https://img.shields.io/badge/🌐_Demo_en_vivo-GitHub_Pages-2ea44f" /></a>
  <img alt="Deploy" src="https://github.com/januarf121995/centro-de-inteligencia-agron-mica-Floricultivos/actions/workflows/deploy.yml/badge.svg" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="ArcGIS Maps SDK" src="https://img.shields.io/badge/ArcGIS_Maps_SDK-5.x-0079C1?logo=arcgis&logoColor=white" />
  <img alt="Calcite" src="https://img.shields.io/badge/Calcite_Design_System-5.x-007AC2" />
  <img alt="Licencia" src="https://img.shields.io/badge/Licencia-Apache_2.0-blue" />
</p>

## 🌐 Aplicación en vivo

La aplicación está desplegada y disponible públicamente en **GitHub Pages**:

### 👉 [https://januarf121995.github.io/centro-de-inteligencia-agron-mica-Floricultivos/](https://januarf121995.github.io/centro-de-inteligencia-agron-mica-Floricultivos/)

Carga en tiempo real el Web Map **"Mapa Floricolas"** de ArcGIS Online con las camas del cultivo y sus indicadores agronómicos (no requiere credenciales: el contenido es público). Cada `push` a la rama `main` reconstruye y republica el sitio automáticamente.

---

## 📖 Introducción

El **Centro de Inteligencia Agronómica para Florícolas** es una aplicación web de vanguardia que unifica, sobre un único modelo geográfico, las variables que tradicionalmente se analizan por separado en una finca de flores: **sanidad vegetal (MIPE)**, **fertirriego y nutrición (MIRFE)** y **metas de producción**.

La solución combina un frontend moderno de **React + TypeScript** con la potencia del **ArcGIS Maps SDK for JavaScript (v5.x, arquitectura nativa de Web Components)** para visualizar y monitorear —cama por cama y en tiempo real— indicadores agronómicos críticos:

- 🧪 **pH** del suelo
- ⚡ **CE** (Conductividad Eléctrica, dS/m)
- 🐛 **Severidad** fitosanitaria
- 📈 **Incidencia** de plagas y cumplimiento de producción

El objetivo es permitir al líder agrónomo **detectar correlaciones espaciales** (por ejemplo, una caída de producción vinculada a acidez excesiva del suelo o a un foco de arañita roja) y **priorizar la intervención de campo antes** de que los tallos pierdan valor de exportación.

### ✨ Características principales

- **Mapa GIS nativo** cargado directamente desde un Web Map de ArcGIS Online.
- **Simbología temática dinámica** (Riesgo Integrado, MIPE, MIRFE, Producción) computada en tiempo real con expresiones **Arcade** sobre los campos reales del servicio.
- **Selección espacial bidireccional**: clic en el mapa ⇄ expediente (dossier) en el panel lateral.
- **Panel de tareas prioritarias** generado automáticamente al cruzar las tres dimensiones agronómicas.
- **Interfaz de nivel producto Esri** construida con el **Calcite Design System**.

---

## 🛠️ Arquitectura Tecnológica

La aplicación sigue una arquitectura desacoplada donde la capa de datos GIS es totalmente agnóstica respecto de la UI.

### Stack principal

| Capa | Tecnología | Rol |
|------|------------|-----|
| **Framework UI** | React `19` | Renderizado declarativo y gestión de estado. |
| **Lenguaje** | TypeScript `5.8` | Tipado estático de extremo a extremo. |
| **Build tool** | Vite `6` | Servidor de desarrollo (HMR) y empaquetado de producción. |
| **Estilos** | Tailwind CSS `4` | Utilidades de espaciado, tipografía y maquetación interna. |
| **Design System** | Calcite `5.x` | Componentes estructurales y controles con la estética oficial de Esri. |

### Motor GIS central

El corazón geoespacial usa **`@arcgis/map-components` (v5.x)** — la **arquitectura de Web Components nativos** de Esri— en lugar de _wrappers_ de React obsoletos y ya descontinuados (`@arcgis/map-components-react`).

> **¿Por qué Web Components nativos?**
> React 19 admite _custom elements_ de forma nativa (propiedades, atributos y eventos). Consumir `<arcgis-map>` directamente en JSX elimina una capa de abstracción intermedia, lo que se traduce en **máximo rendimiento de renderizado**, menor tamaño de dependencias y **longevidad** (el ciclo de vida del componente sigue al SDK oficial de ArcGIS, no a un adaptador de terceros).

Los tipos JSX de los custom elements se habilitan mediante referencias de tipos en [`src/vite-env.d.ts`](src/vite-env.d.ts), y los componentes se auto-registran con imports de efecto lateral en [`src/main.tsx`](src/main.tsx).

---

## 🗺️ Integración con ArcGIS Online (Modo Web Map Nativo)

La **fuente única de verdad** de la aplicación es un **Web Map de ArcGIS Online**:

```
Web Map ID: e8b44defaf834ebea3fc1cc2bd76b38f
```

El componente `<arcgis-map>` se inicializa **estrictamente con `itemId`**, de modo que hereda del portal el mapa base, las capas operacionales y la extensión geográfica — sin `basemap`/`center`/`zoom` codificados en el cliente:

```tsx
<arcgis-map item-id={GIS_CONFIG.webMapId} /* … */></arcgis-map>
```

### Consumo de la capa operacional `Camas`

Una vez cargado el Web Map, la aplicación localiza dentro de él la capa operacional **`Camas`** (`FeatureServer/1`) mediante `findCamasLayer()`, aplica la simbología temática y **consulta las _features_ vivas** para alimentar todo el tablero (KPIs, dossier, lista de prioridades):

```ts
const layer = findCamasLayer(view.map, GIS_CONFIG);   // busca por título/URL
const { features } = await layer.queryFeatures({ where: '1=1', outFields: ['*'] });
onFeaturesLoaded(attributesListToBloques(features.map(f => f.attributes), GIS_CONFIG));
```

### Unificación mapa ⇄ estado de React (`hitTest` → `onSelectCama`)

El evento de clic del mapa se traduce a una selección de React a través de un `hitTest`. El punto clave es que el _graphic_ obtenido expone atributos crudos (donde el identificador de dibujo es el numérico `OBJECTID`), por lo que el handler **extrae el identificador de negocio real `CAMAS_ID`** (resuelto vía `GIS_CONFIG.fieldMap.bedId`) y lo enruta al estado central `onSelectCama`:

```ts
async function handleViewClick(event) {
  const { results } = await mapEl.hitTest({ x: event.detail.x, y: event.detail.y }, { include: [layer] });
  const hit = results.find(r => r.type === 'graphic');
  if (!hit) return;

  // 1) Preferir el id de negocio (string), NO el OBJECTID numérico.
  let camaId = hit.graphic.attributes[GIS_CONFIG.fieldMap.bedId]; // → 'B-16-001'

  // 2) Respaldo: si el graphic del hitTest no trajo el campo, consultarlo por OBJECTID.
  if (camaId == null) {
    const oid = hit.graphic.attributes[layer.objectIdField];
    const res = await layer.queryFeatures({ objectIds: [oid], outFields: [GIS_CONFIG.fieldMap.bedId] });
    camaId = res.features[0]?.attributes?.[GIS_CONFIG.fieldMap.bedId];
  }

  if (camaId) onSelectCama(String(camaId)); // ← estado central de React
}
```

Como `attributesToCama()` asigna ese mismo `CAMAS_ID` a `Cama.id`, **el mapa y el panel lateral quedan sincronizados sobre la misma clave string**: seleccionar una cama (por clic o desde la lista de prioridades) rellena el dossier, la resalta (`highlight`) y **encuadra la vista** sobre ella (`view.goTo`).

---

## 📊 Lógica de Negocio y Métricas

### Capa de mapeo de campos (`fieldMap`)

Toda la aplicación habla un vocabulario lógico fijo (`bedId`, `ph`, `ce`, `severity`, …) y el objeto **`fieldMap`** —definido en [`src/data.ts`](src/data.ts)— lo traduce a los nombres de campo físicos del servicio. Esto **desacopla la base de datos de la UI**: para conectar otro servicio basta con cambiar los _valores_ de este mapa, sin tocar componentes.

| Atributo lógico | Campo físico (`Camas`) | Notas |
|-----------------|------------------------|-------|
| `bedId` | `CAMAS_ID` | Identificador de negocio (`'B-16-001'`). |
| `blockId` | `BLOQUE_ID` | Agrupación por bloque. |
| `blockName` | `BLOQUE_ID` | _Fallback_ (la capa `Camas` no trae nombre de bloque). |
| `bedNumber` | `OBJECTID` | _Fallback_ (sin número de cama dedicado). |
| `variety` | `VARIEDAD` | Variedad florícola. |
| `pest` | `PLAGA_PPAL` | Plaga principal. |
| `severity` | `SEVERIDAD` | `'Alta' / 'Media' / 'Baja'` (normalizado a minúsculas). |
| `incidence` | `RIESGO` | _Fallback_ (sin % de incidencia real; ver derivación abajo). |
| `ph` | `PH` | pH del suelo. |
| `ce` | `CE` | Conductividad eléctrica (dS/m). |
| `drainage` | `DRENAJE` | % de drenaje. |
| `productionTarget` | `PRODUCCION` | Meta de tallos. |
| `productionActual` | `PRODUCCIONREAL` | Tallos cosechados. |
| `lastUpdated` | `ESTADO` | _Fallback_ (sin campo de fecha). |

> Configuración adicional en `GIS_CONFIG`: `layerId: 1`, `layerTitle: 'Camas'`, `apiKey` (desde variable de entorno) y `thresholds` (umbrales agronómicos).

### Incidencia Fitosanitaria derivada de `SEVERIDAD`

Dado que la capa real no expone un campo de incidencia porcentual, la métrica **"Incidencia Fitosanitaria"** se **deriva dinámicamente del texto de `SEVERIDAD`** (normalizado a minúsculas) en el dossier de cama:

| `SEVERIDAD` | Incidencia derivada |
|-------------|---------------------|
| `alta` | **85 %** |
| `media` | **50 %** |
| `baja` | **15 %** |
| _cualquier otro / null_ | **0 %** |

### Umbral de daño económico

La barra de progreso está conectada al **límite biológico de daño económico**: `RANGOS_OPTISMOS.mipe.incidenciaMaximaAceptable = 10 %` (*"Umbral máximo aceptable: 10% de aspersión"*). Cuando la incidencia derivada **supera el 10 %**, la UI cambia a un estado de alerta que indica que se requiere intervención química:

```
Incidencia > 50 %          → 🔴 Rojo   (severidad 'alta')
Incidencia > 10 % (umbral) → 🟠 Ámbar  (severidad 'baja' / 'media') → «⚠ Umbral superado, requiere aspersión»
Incidencia ≤ 10 %          → 🟢 Verde  (sin presencia)
```

> Las mismas reglas agronómicas (`calcularRiesgoCama`, `contarFallasMirfe`, % de producción) se replican como **expresiones Arcade** en los _renderers_ del mapa, de modo que la simbología de las capas temáticas refleja exactamente la lógica de negocio del tablero.

---

## 🚀 Configuración y Despliegue Local

### Requisitos previos

- **Node.js** ≥ 18
- Una **API Key de ArcGIS** (ArcGIS Location Platform / ArcGIS Online). *Opcional para el Web Map de demostración, que es público, pero recomendada para mapas base premium y contenido autenticado.*

### Instalación

```bash
# 1. Instalar dependencias
npm install
```

### Configurar credenciales

Crea un archivo **`.env.local`** en la raíz del proyecto con tu token de ArcGIS. Vite sólo expone al cliente las variables con prefijo `VITE_`:

```dotenv
# .env.local
VITE_ARCGIS_API_KEY=tu_api_key_de_arcgis_aqui
```

> La clave se lee en [`src/data.ts`](src/data.ts) (`import.meta.env.VITE_ARCGIS_API_KEY`) y se inyecta en el SDK vía `esriConfig.apiKey` en [`src/gis/setup.ts`](src/gis/setup.ts), **antes** de renderizar la app. Si se omite, la aplicación usa un mapa base sin credencial.

### Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación quedará disponible en **http://localhost:3000**.

### Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `npm run dev` | `vite --port=3000 --host=0.0.0.0` | Servidor de desarrollo con HMR. |
| `npm run build` | `vite build` | Compila los estáticos de producción en `dist/`. |
| `npm run preview` | `vite preview` | Sirve localmente el _build_ de producción. |
| `npm run lint` | `tsc --noEmit` | Verificación de tipos TypeScript (sin emitir). |

### Despliegue en producción (GitHub Pages — automático)

El despliegue está **automatizado con GitHub Actions** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)): cada `push` a `main` ejecuta `npm ci` + `npm run build` (Node 22) y publica `dist/` en GitHub Pages mediante `actions/deploy-pages`.

- **URL pública**: https://januarf121995.github.io/centro-de-inteligencia-agron-mica-Floricultivos/
- La base del build (`/centro-de-inteligencia-agron-mica-Floricultivos/`) se define en [`vite.config.ts`](vite.config.ts) solo para producción; el desarrollo local sigue sirviendo en `/`.
- El Web Map y el Feature Service son públicos, por lo que el sitio no necesita API key. Si se quisiera un mapa base premium de Esri en producción, basta con añadir el secret `VITE_ARCGIS_API_KEY` al repositorio e inyectarlo como variable de entorno en el paso de build del workflow.
- También puede relanzarse manualmente desde la pestaña **Actions** (`workflow_dispatch`).

**Alternativas**: la carpeta `dist/` (generada con `npm run build`) puede desplegarse igualmente en Vercel/Netlify. En cualquier caso, se recomienda registrar la URL pública como un ítem **"Web Mapping Application"** en el **Portal Organizacional de ArcGIS Online**, para gobernar el acceso y compartirla con los grupos de la organización.

---

## 📂 Estructura del proyecto

```
src/
├── App.tsx                 # Shell (Calcite), estado central y orquestación
├── main.tsx                # Registro de Web Components + bootstrap de React
├── index.css               # Tema Esri + Tailwind + alturas del shell/mapa
├── types.ts                # Tipos de dominio + GisConfig / fieldMap / métricas
├── data.ts                 # GIS_CONFIG, proveedores de datos y lógica agronómica
├── vite-env.d.ts           # Referencias de tipos JSX (ArcGIS + Calcite)
├── gis/
│   ├── setup.ts            # Configuración global del SDK (apiKey, portal)
│   └── camasLayer.ts       # Renderers Arcade, popup, búsqueda y findCamasLayer
└── components/
    ├── FarmMap.tsx         # <arcgis-map>, hitTest, simbología y selección
    ├── FarmStats.tsx       # KPIs globales
    ├── BedDetail.tsx       # Dossier de cama (MIPE / MIRFE / producción)
    ├── ActionList.tsx      # Tareas prioritarias de campo
    └── MonitoringForm.tsx  # Formulario de bitácora (Calcite Dialog)
```

---

<div align="center">
  <sub>
    Plataforma Diseñada para Florícolas de Alta Densidad · © 2026 Centro de Inteligencia Agronómica para Florícolas<br/>
    <strong>Sector Recursos Naturales | ESRI | Colombia y Ecuador</strong>
  </sub>
</div>
