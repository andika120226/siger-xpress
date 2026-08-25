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
// ---------------------------------------------------------------------------
// Dynamic Segment — straight at low zoom, curved (OSRM) at high zoom
// ---------------------------------------------------------------------------
function DynamicSegment({
  start,
  end,
  color,
  status,
  distance,
  startName,
  endName,
}: {
  start: [number, number];
  end: [number, number];
  color: string;
  status: string;
  distance: number;
  startName: string;
  endName: string;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [osrmPositions, setOsrmPositions] = useState<[number, number][] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map]);
  useEffect(() => {
    if (zoom >= 10 && !fetchedRef.current) {
      fetchedRef.current = true;
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes?.[0]) {
            const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );
            setOsrmPositions(coords);
          }
        })
        .catch(() => {
          /* keep straight fallback */
        });
    }
  }, [zoom, start, end]);

  const useCurved = zoom >= 10 && osrmPositions !== null;
  const positions = useCurved ? osrmPositions : [start, end];

  const statusLabel =
    status === 'congested' ? 'Macet' : status === 'warning' ? 'Renovasi' : 'Lancar';

  return (
    <Polyline positions={positions} pathOptions={{ color, weight: 6, opacity: 0.8 }}>
      <Tooltip sticky>
        <div className="text-xs">
          <p className="font-bold">
            {startName} &rarr; {endName}
          </p>
          <p>
            Status:{' '}
            <span className="uppercase font-semibold" style={{ color }}>
              {statusLabel}
            </span>
          </p>
          <p>Jarak: {distance} KM</p>
          {useCurved && <p className="text-[10px] text-gray-500 mt-1 italic">Rute riil via OSRM</p>}
        </div>
      </Tooltip>
    </Polyline>
  );
}
