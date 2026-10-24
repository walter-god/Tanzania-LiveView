import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Camera, CoverageType } from '../types';
import { Video, ShieldCheck, MapPin, Eye, Radio, ExternalLink, AlertTriangle } from 'lucide-react';

interface MapContainerProps {
  apiKey: string;
  cameras: Camera[];
  selectedCamera: Camera | null;
  onSelectCamera: (camera: Camera) => void;
  centerCoordinates?: { lat: number; lng: number };
  zoomLevel?: number;
}

// Controller component to smoothly pan/zoom when a camera is selected
const MapPanController: React.FC<{ targetCamera: Camera | null }> = ({ targetCamera }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetCamera) return;
    map.panTo({ lat: targetCamera.latitude, lng: targetCamera.longitude });
    if (map.getZoom()! < 12) {
      map.setZoom(13);
    }
  }, [map, targetCamera]);

  return null;
};

// Dark command center map style
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#142823' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#34d399' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3b4252' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f1f5f9' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#091322' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#091322' }],
  },
];

export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  cameras,
  selectedCamera,
  onSelectCamera,
  centerCoordinates = { lat: -6.369028, lng: 34.888822 }, // Central Tanzania (Dodoma)
  zoomLevel = 6,
}) => {
  const [hoveredCamera, setHoveredCamera] = useState<Camera | null>(null);

  // Return appropriate pin colors based on Camera Type and Live status
  const getPinProps = (camera: Camera) => {
    const isSelected = selectedCamera?.camera_id === camera.camera_id;

    if (camera.status === 'OFFLINE') {
      return {
        background: '#475569',
        borderColor: '#94a3b8',
        glyphColor: '#e2e8f0',
        scale: isSelected ? 1.3 : 1.0,
      };
    }

    if (camera.coverage_type === 'STREET VIEW') {
      return {
        background: '#0284c7', // Sky blue
        borderColor: '#38bdf8',
        glyphColor: '#ffffff',
        scale: isSelected ? 1.3 : 1.0,
      };
    }

    switch (camera.camera_type) {
      case 'Traffic Camera':
      case 'Highway Camera':
        return {
          background: '#d97706', // Amber
          borderColor: '#fbbf24',
          glyphColor: '#ffffff',
          scale: isSelected ? 1.3 : 1.0,
        };
      case 'Port Camera':
        return {
          background: '#0891b2', // Cyan
          borderColor: '#22d3ee',
          glyphColor: '#ffffff',
          scale: isSelected ? 1.3 : 1.0,
        };
      case 'Airport Camera':
        return {
          background: '#2563eb', // Blue
          borderColor: '#60a5fa',
          glyphColor: '#ffffff',
          scale: isSelected ? 1.3 : 1.0,
        };
      case 'Weather Camera':
        return {
          background: '#0284c7', // Light blue
          borderColor: '#38bdf8',
          glyphColor: '#ffffff',
          scale: isSelected ? 1.3 : 1.0,
        };
      case 'Public Space Camera':
      default:
        return {
          background: '#059669', // Emerald
          borderColor: '#34d399',
          glyphColor: '#ffffff',
          scale: isSelected ? 1.3 : 1.0,
        };
    }
  };

  const getCoverageBadge = (coverage: CoverageType) => {
    switch (coverage) {
      case 'LIVE CAMERA':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE CAMERA
          </span>
        );
      case 'STREET VIEW':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700">
            STREET VIEW
          </span>
        );
      case 'STATIC/ARCHIVED IMAGE':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
            STATIC/ARCHIVED
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div id="tanzania-map-wrapper" className="relative w-full h-full min-h-[420px] bg-slate-950">
      <APIProvider apiKey={apiKey}>
        <Map
          id="tanzania-liveview-map"
          defaultCenter={centerCoordinates}
          defaultZoom={zoomLevel}
          gestureHandling="greedy"
          disableDefaultUI={false}
          styles={DARK_MAP_STYLES}
          mapId="TANZANIA_LIVEVIEW_MAP"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
        >
          <MapPanController targetCamera={selectedCamera} />

          {/* Render Advanced Markers for every camera */}
          {cameras.map((camera) => {
            const isSelected = selectedCamera?.camera_id === camera.camera_id;
            const pinProps = getPinProps(camera);

            return (
              <AdvancedMarker
                key={camera.camera_id}
                position={{ lat: camera.latitude, lng: camera.longitude }}
                onClick={() => onSelectCamera(camera)}
                onMouseEnter={() => setHoveredCamera(camera)}
                onMouseLeave={() => setHoveredCamera(null)}
                title={`${camera.name} (${camera.city}, ${camera.region})`}
              >
                <div className="relative group cursor-pointer transition-transform duration-200">
                  {/* Live pulsing ring indicator */}
                  {camera.status === 'LIVE' && (
                    <span className="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-pulse pointer-events-none"></span>
                  )}
                  {isSelected && (
                    <span className="absolute -inset-2.5 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none"></span>
                  )}

                  <Pin
                    background={pinProps.background}
                    borderColor={pinProps.borderColor}
                    glyphColor={pinProps.glyphColor}
                    scale={pinProps.scale}
                  />

                  {/* Marker mini-pill for quick identification */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:flex items-center gap-1 px-1.5 py-0.5 bg-slate-950/90 text-slate-100 text-[10px] font-mono rounded border border-slate-700 shadow-xl whitespace-nowrap z-50 pointer-events-none">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        camera.status === 'LIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <span>{camera.city}</span>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* InfoWindow for selected camera */}
          {selectedCamera && (
            <InfoWindow
              position={{ lat: selectedCamera.latitude, lng: selectedCamera.longitude }}
              pixelOffset={[0, -32]}
              onCloseClick={() => {}}
            >
              <div className="p-2 min-w-[240px] max-w-[300px] text-slate-900 font-sans">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {selectedCamera.name}
                  </div>
                  {getCoverageBadge(selectedCamera.coverage_type)}
                </div>

                <div className="text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>
                    {selectedCamera.city}, {selectedCamera.region}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-mono mb-2">
                  Provider: {selectedCamera.provider}
                </div>

                <button
                  onClick={() => onSelectCamera(selectedCamera)}
                  className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Feed in Command Player</span>
                </button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Floating Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-col gap-1 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 text-xs font-mono text-slate-300 shadow-2xl">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Map Legend & Telemetry
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"></span>
          <span className="text-[11px]">Live Camera (Authorized Feed)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          <span className="text-[11px]">Google Street View (Geographic)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-[11px]">Static / Periodic Refresh</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-[11px]">Offline / Maintenance</span>
        </div>
      </div>
    </div>
  );
};
