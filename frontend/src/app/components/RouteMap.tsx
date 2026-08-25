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
// Custom SVG Marker Creator
const createCustomIcon = (color: string, isOrigin: boolean) => {
  const pinSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <ellipse cx="12" cy="22" rx="4" ry="1.5" fill="#000000" opacity="0.3"/>
      <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      ${isOrigin ? `<circle cx="12" cy="9" r="3" fill="#ffffff"/>` : ''}
    </svg>
  `;

  return L.divIcon({
    html: pinSvg,
    className: 'custom-leaflet-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    tooltipAnchor: [0, -36],
  });
};

const originIcon = createCustomIcon('#10B981', true);
const destinationIcon = createCustomIcon('#0EA5E9', false);

// ---------------------------------------------------------------------------
// ViewFitter — fits all markers in view.
// ---------------------------------------------------------------------------
function ViewFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    const key = JSON.stringify(points);
    if (points.length > 0 && key !== prevKey.current) {
      prevKey.current = key;
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    }
  }, [points, map]);
  return null;
}
export default function RouteMap({
  origin,
  destinations,
  optimalSequence,
  trafficSegments,
}: RouteMapProps) {
  const allPoints: [number, number][] = [];
  const allNames: string[] = [];

  const oLat = parseFloat(origin.lat as string) || 0;
  const oLng = parseFloat(origin.lng as string) || 0;
  if (!isNaN(oLat) && !isNaN(oLng)) {
    allPoints.push([oLat, oLng]);
    allNames.push(origin.name);
  }

  destinations.forEach((d) => {
    const dLat = parseFloat(d.lat as string) || 0;
    const dLng = parseFloat(d.lng as string) || 0;
    if (!isNaN(dLat) && !isNaN(dLng)) {
      allPoints.push([dLat, dLng]);
      allNames.push(d.name);
    }
  });

  const center: [number, number] = allPoints.length > 0 ? allPoints[0] : [-5.4292, 105.2611];

  // Pre-analysis preview route
  const manualRoute: [number, number][] = [];
  if (allPoints.length > 0) {
    allPoints.forEach((p) => manualRoute.push(p));
    if (allPoints.length > 1) manualRoute.push(allPoints[0]);
  }

  const getTrafficColor = (status: string) => {
    if (status === 'congested') return '#FF3366'; // Red/Pink
    if (status === 'warning') return '#FFD700'; // Yellow
    return '#10B981'; // Emerald Green for Clear (was cyan)
  };

  return (
    <div className="w-full h-full absolute inset-0">
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* LEGEND OVERLAY */}
        <div className="leaflet-bottom leaflet-right !bottom-9 !right-4 absolute z-[400] pointer-events-none">
          <div className="bg-white/90 border border-gray-300 rounded shadow-md p-3 text-xs text-gray-800 font-medium pointer-events-auto">
            <h4 className="font-bold mb-2 border-b pb-1">Status Rute</h4>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-4 h-1 bg-[#10B981]"></div>
              <span>Lancar</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-4 h-1 bg-[#FFD700]"></div>
              <span>Renovasi (Peringatan)</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-4 h-1 bg-[#FF3366]"></div>
              <span>Macet (Kepadatan)</span>
            </div>
            <div className="flex items-center gap-2 border-t pt-1.5 mt-1.5">
              <div className="w-4 h-1 border-b-2 border-dashed border-[#FF3366]"></div>
              <span className="text-[10px]">Area Macet (Koridor)</span>
            </div>
          </div>
        </div>

        <ViewFitter points={allPoints} />

        {/* ---- Traffic corridor indicators (always visible as dashed lines) ---- */}
        {optimalSequence &&
          TRAFFIC_CORRIDORS.map((corridor, idx) => (
            <Polyline
              key={`corridor-${idx}`}
              positions={[corridor.from, corridor.to]}
              pathOptions={{
                color: corridor.status === 'congested' ? '#FF3366' : '#FFD700',
                weight: 3,
                opacity: 0.35,
                dashArray: '6, 10',
              }}
            >
              <Popup>
                <div className="text-xs text-gray-800 p-0.5">
                  <p className="font-extrabold mb-1">{corridor.label}</p>
                  <p className="text-[10px] text-gray-500">
                    Indikator area bermasalah (garis putus-putus)
                  </p>
                </div>
              </Popup>
            </Polyline>
          ))}

        {/* ---- Markers ---- */}
        {allPoints.map((pos, idx) => {
          const isOrigin = idx === 0;
          const locName = isOrigin ? origin.name : destinations[idx - 1]?.name;
          return (
            <Marker key={idx} position={pos} icon={isOrigin ? originIcon : destinationIcon}>
              <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                <div className="text-xs font-semibold text-gray-800 p-0.5">
                  <p className="font-extrabold">{locName}</p>
                  <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                    {isOrigin ? '📦 Titik Asal (Gudang)' : `📍 Toko Tujuan ${idx}`}
                  </span>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* ---- Pre-analysis preview (grey dashed) ---- */}
        {!optimalSequence && manualRoute.length > 1 && (
          <Polyline
            positions={manualRoute}
            pathOptions={{ color: '#9ca3af', weight: 3, opacity: 0.6, dashArray: '5, 10' }}
          />
        )}

        {/* ---- Optimal route segments ---- */}
        {optimalSequence &&
          trafficSegments &&
          trafficSegments.map((seg, idx) => {
            const startStop = optimalSequence[seg.start_idx];
            const endStop = optimalSequence[seg.end_idx];

            if (startStop.lat && startStop.lng && endStop.lat && endStop.lng) {
              return (
                <DynamicSegment
                  key={`seg-${idx}`}
                  start={[startStop.lat, startStop.lng]}
                  end={[endStop.lat, endStop.lng]}
                  color={getTrafficColor(seg.status)}
                  status={seg.status}
                  distance={seg.distance_km}
                  startName={seg.start_name}
                  endName={seg.end_name}
                />
              );
            }
            return null;
          })}
      </MapContainer>
    </div>
  );
}
