/// <reference types="vite/client" />
/// <reference types="@arcgis/map-components/dist/types/react" />
/// <reference types="@arcgis/core/interfaces" />

interface ImportMetaEnv {
  /** API key de ArcGIS (opcional). Definir en un archivo .env como VITE_ARCGIS_API_KEY. */
  readonly VITE_ARCGIS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
