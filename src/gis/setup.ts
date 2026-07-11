/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import esriConfig from '@arcgis/core/config';
import { GIS_CONFIG } from '../data';

/**
 * Configuración global del SDK de ArcGIS. Se importa una sola vez desde
 * main.tsx, antes de renderizar la app. Lee todo de GIS_CONFIG para que
 * no haya credenciales ni URLs dispersas por el código.
 */
export function setupArcgis(): void {
  if (GIS_CONFIG.apiKey) {
    esriConfig.apiKey = GIS_CONFIG.apiKey;
  }
  if (GIS_CONFIG.portalUrl) {
    esriConfig.portalUrl = GIS_CONFIG.portalUrl;
  }
}
