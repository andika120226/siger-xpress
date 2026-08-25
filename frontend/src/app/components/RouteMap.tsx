'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
interface Location {
  name: string;
  lat: string | number;
  lng: string | number;
}

interface RouteStop {
  order: number;
  name: string;
  type: string;
  lat?: number;
  lng?: number;
}

interface TrafficSegment {
  start_idx: number;
  end_idx: number;
  start_name: string;
  end_name: string;
  status: 'clear' | 'warning' | 'congested';
  distance_km: number;
}

interface RouteMapProps {
  origin: Location;
  destinations: Location[];
  optimalSequence?: RouteStop[];
  trafficSegments?: TrafficSegment[];
}
// ---------------------------------------------------------------------------
// Known traffic problem corridors (visual indicators on map)
// ---------------------------------------------------------------------------
const TRAFFIC_CORRIDORS: {
  from: [number, number];
  to: [number, number];
  label: string;
  status: 'congested' | 'warning';
}[] = [
  {
    from: [-5.4292, 105.2611],
    to: [-5.8708, 105.7533],
    label: '⚠ Macet: B.Lampung ↔ Bakauheni',
    status: 'congested',
  },
  {
    from: [-4.8286, 104.8829],
    to: [-5.0345, 104.0754],
    label: '⚠ Macet: Kotabumi ↔ Liwa',
    status: 'congested',
  },
  {
    from: [-5.1131, 105.3067],
    to: [-4.8286, 104.8829],
    label: '⚠ Renovasi: Metro ↔ Kotabumi',
    status: 'warning',
  },
];
