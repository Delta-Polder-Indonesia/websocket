export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  platform?: string;
  timestamp: number;
  accuracy?: number;
}

export interface LocationUpdate {
  coords: LocationData;
  deviceId: string;
  deviceName?: string;
}

export interface MapConfig {
  defaultCenter: [number, number];
  defaultZoom: number;
  maxZoom: number;
  minZoom: number;
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  defaultCenter: [0, 0],
  defaultZoom: 2,
  maxZoom: 19,
  minZoom: 1,
};

export const MAP_LAYERS = {
  default: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB, &copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'ESRI Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, &copy; OpenStreetMap contributors',
  },
  terrain: {
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap, &copy; OpenStreetMap contributors',
  },
} as const;

export type MapLayerKey = keyof typeof MAP_LAYERS;
