import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import { Camera, CameraStatus } from '../types';
import {
  Globe,
  Compass,
  Layers,
  Sun,
  Eye,
  Crosshair,
  Maximize2,
  Minimize2,
  Navigation,
  MapPin,
  Radio,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface CesiumMapContainerProps {
  cameras: Camera[];
  selectedCamera: Camera | null;
  onSelectCamera: (camera: Camera) => void;
  onToggleToGoogleMaps?: () => void;
}

type BasemapStyle = 'satellite' | 'dark' | 'streets' | 'topo';

interface ViewPreset {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  height: number;
  pitch: number;
  heading: number;
}

const TANZANIA_PRESETS: ViewPreset[] = [
  {
    id: 'orbit',
    name: 'Tanzania Overview',
    region: 'Nationwide Orbit',
    lat: -6.3690,
    lng: 34.8888,
    height: 1400000,
    pitch: -85,
    heading: 0,
  },
  {
    id: 'dar',
    name: 'Dar es Salaam Port',
    region: 'Coast / Maritime',
    lat: -6.8235,
    lng: 39.2695,
    height: 3800,
    pitch: -32,
    heading: 320,
  },
  {
    id: 'kilimanjaro',
    name: 'Mt. Kilimanjaro & Arusha',
    region: 'Northern Highlands',
    lat: -3.0674,
    lng: 37.3556,
    height: 8500,
    pitch: -25,
    heading: 45,
  },
  {
    id: 'dodoma',
    name: 'Dodoma Capital',
    region: 'Central Corridor',
    lat: -6.1731,
    lng: 35.7419,
    height: 4200,
    pitch: -35,
    heading: 10,
  },
  {
    id: 'zanzibar',
    name: 'Zanzibar Channel',
    region: 'Islands Corridor',
    lat: -6.1622,
    lng: 39.1979,
    height: 5000,
    pitch: -38,
    heading: 290,
  },
  {
    id: 'mwanza',
    name: 'Lake Victoria / Mwanza',
    region: 'Lake Victoria Basin',
    lat: -2.5164,
    lng: 32.9034,
    height: 4500,
    pitch: -30,
    heading: 350,
  },
];

// Helper to create high-DPI custom pin icons on the fly
function generatePinDataUrl(status: CameraStatus, isSelected: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const primaryColor =
    status === 'LIVE' ? '#10b981' : status === 'OFFLINE' ? '#f43f5e' : '#f59e0b';
  const glowColor =
    status === 'LIVE'
      ? 'rgba(16, 185, 129, 0.4)'
      : status === 'OFFLINE'
      ? 'rgba(244, 63, 94, 0.4)'
      : 'rgba(245, 158, 11, 0.4)';

  ctx.clearRect(0, 0, 64, 64);

  // Outer pulse circle if selected
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(32, 26, 24, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  // Pin base shadow
  ctx.beginPath();
  ctx.ellipse(32, 58, 10, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();

  // Pin tear-drop path
  ctx.beginPath();
  ctx.moveTo(32, 56);
  ctx.bezierCurveTo(24, 42, 16, 32, 16, 24);
  ctx.arc(32, 24, 16, Math.PI, 0, false);
  ctx.bezierCurveTo(48, 32, 40, 42, 32, 56);
  ctx.closePath();

  ctx.fillStyle = '#090d16';
  ctx.fill();
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.strokeStyle = primaryColor;
  ctx.stroke();

  // Inner lens circle
  ctx.beginPath();
  ctx.arc(32, 24, 8, 0, Math.PI * 2);
  ctx.fillStyle = primaryColor;
  ctx.fill();

  // Lens highlight
  ctx.beginPath();
  ctx.arc(30, 22, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  return canvas.toDataURL();
}

// Helper to build independent tile imagery providers without requiring Cesium Ion
function createImageryProvider(style: BasemapStyle): Cesium.ImageryProvider {
  switch (style) {
    case 'satellite':
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
        credit: 'ESRI World Imagery',
      });
    case 'dark':
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        maximumLevel: 19,
        subdomains: ['a', 'b', 'c', 'd'],
        credit: 'CartoDB Dark Matter',
      });
    case 'topo':
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
        credit: 'ESRI Topographic',
      });
    case 'streets':
    default:
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 19,
        credit: 'OpenStreetMap Contributors',
      });
  }
}

export const CesiumMapContainer: React.FC<CesiumMapContainerProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  onToggleToGoogleMaps,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const entitiesMapRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

  // Live HUD States
  const [activeBasemap, setActiveBasemap] = useState<BasemapStyle>('satellite');
  const [isLightingEnabled, setIsLightingEnabled] = useState<boolean>(true);
  const [showFovCones, setShowFovCones] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>('orbit');
  const [hoveredCamera, setHoveredCamera] = useState<Camera | null>(null);
  const [cursorCoordinates, setCursorCoordinates] = useState<{
    lat: number;
    lng: number;
    alt: number;
  } | null>(null);
  const [is3DTilt, setIs3DTilt] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Cache pin data URLs to avoid regenerating
  const pinUrls = useRef<Record<string, string>>({});
  const getPinUrl = (status: CameraStatus, isSelected: boolean) => {
    const key = `${status}_${isSelected}`;
    if (!pinUrls.current[key]) {
      pinUrls.current[key] = generatePinDataUrl(status, isSelected);
    }
    return pinUrls.current[key];
  };

  // Helper to switch basemap imagery layer
  const applyBasemap = useCallback((viewer: Cesium.Viewer, style: BasemapStyle) => {
    viewer.imageryLayers.removeAll();
    const provider = createImageryProvider(style);
    viewer.imageryLayers.add(new Cesium.ImageryLayer(provider));
  }, []);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Completely disable Cesium Ion network calls and redirect endpoint
    Cesium.Ion.defaultAccessToken = '';
    Cesium.Ion.defaultServer = new Cesium.Resource({ url: '/api/cesium-disabled/' });

    // 2. Safely neutralize IonResource calls
    try {
      if (Cesium.IonResource) {
        (Cesium.IonResource as any).fromAssetId = function () {
          return Promise.reject(new Error('Cesium Ion disabled'));
        };
        (Cesium.IonResource as any)._createEndpointResource = function () {
          return {
            fetchJson: () => Promise.reject(new Error('Cesium Ion disabled')),
            fetchImage: () => Promise.reject(new Error('Cesium Ion disabled')),
            fetch: () => Promise.reject(new Error('Cesium Ion disabled')),
          };
        };
      }
    } catch {}

    // 3. Intercept internal Cesium Resource loader for any api.cesium.com requests
    try {
      const impl = (Cesium as any).Resource?._Implementations;
      if (impl && impl.loadWithXhr) {
        const originalLoadWithXhr = impl.loadWithXhr;
        impl.loadWithXhr = function (
          url: string,
          responseType: any,
          method: any,
          data: any,
          headers: any,
          deferred: any,
          overrideMimeType: any
        ) {
          if (typeof url === 'string' && url.includes('api.cesium.com')) {
            deferred.resolve({});
            return;
          }
          return originalLoadWithXhr(url, responseType, method, data, headers, deferred, overrideMimeType);
        };
      }
    } catch {}

    const initialBaseLayer = new Cesium.ImageryLayer(createImageryProvider('satellite'));

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: initialBaseLayer,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      selectionIndicator: false,
      fullscreenButton: false,
      vrButton: false,
      requestRenderMode: false,
      maximumRenderTimeChange: Infinity,
      contextOptions: {
        webgl: {
          alpha: true,
          preserveDrawingBuffer: true,
        },
      },
    });

    viewerRef.current = viewer;

    // Configure globe visual styling
    const scene = viewer.scene;
    const globe = scene.globe;

    globe.enableLighting = true;
    globe.showGroundAtmosphere = true;
    globe.atmosphereLightIntensity = 12.0;
    scene.highDynamicRange = true;

    // Black / cosmic space background
    scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');

    // Initial Camera position: Tanzania Nationwide Orbit
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(34.8888, -6.3690, 1400000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-85),
        roll: 0.0,
      },
    });

    // Mouse Coordinates Tracking & Hover Raycasting
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handlerRef.current = handler;

    handler.setInputAction((movement: { startPosition: Cesium.Cartesian2; endPosition: Cesium.Cartesian2 }) => {
      // 1. Raycast cursor for Coordinates HUD
      const ray = viewer.camera.getPickRay(movement.endPosition);
      if (ray) {
        const cartesian = scene.globe.pick(ray, scene);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          setCursorCoordinates({
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            lng: Cesium.Math.toDegrees(cartographic.longitude),
            alt: Math.round(cartographic.height),
          });
        }
      }

      // 2. Pick entities for Hover preview
      const pickedObject = scene.pick(movement.endPosition);
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.userData) {
        setHoveredCamera(pickedObject.id.userData as Camera);
      } else {
        setHoveredCamera(null);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Entity Click Selection
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const pickedObject = scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.userData) {
        const cam = pickedObject.id.userData as Camera;
        onSelectCamera(cam);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    setIsReady(true);

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [applyBasemap, onSelectCamera]);

  // Update Imagery Basemap
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    applyBasemap(viewerRef.current, activeBasemap);
  }, [activeBasemap, applyBasemap]);

  // Toggle Sun/Atmosphere Lighting
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    viewerRef.current.scene.globe.enableLighting = isLightingEnabled;
  }, [isLightingEnabled]);

  // Sync Camera Entities on 3D Globe
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || !isReady) return;

    const viewer = viewerRef.current;
    const currentEntityMap = entitiesMapRef.current;

    // Collect all active camera IDs
    const activeIds = new Set(cameras.map((c) => c.camera_id));

    // Remove entities no longer in the list
    for (const [id, entity] of currentEntityMap.entries()) {
      if (!activeIds.has(id)) {
        viewer.entities.remove(entity);
        currentEntityMap.delete(id);
      }
    }

    // Add or update camera entities
    cameras.forEach((cam) => {
      const isSelected = selectedCamera?.camera_id === cam.camera_id;
      const pinUrl = getPinUrl(cam.status, isSelected);
      const pos = Cesium.Cartesian3.fromDegrees(cam.longitude, cam.latitude, 20);

      let entity = currentEntityMap.get(cam.camera_id);

      if (!entity) {
        // Create new entity with Billboard and label
        entity = viewer.entities.add({
          id: `camera-${cam.camera_id}`,
          position: pos,
          billboard: {
            image: pinUrl,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            scale: isSelected ? 1.25 : 0.9,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.3, 8.0e6, 0.45),
            translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.2e7, 0.3),
            disableDepthTestDistance: 100000,
          },
          label: {
            text: cam.name,
            font: '11px JetBrains Mono, monospace',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 120000), // Only show labels when closer
            disableDepthTestDistance: 100000,
          },
          ellipse: showFovCones
            ? {
                semiMinorAxis: 250.0,
                semiMajorAxis: 250.0,
                material:
                  cam.status === 'LIVE'
                    ? Cesium.Color.fromCssColorString('rgba(16, 185, 129, 0.25)')
                    : Cesium.Color.fromCssColorString('rgba(244, 63, 94, 0.25)'),
                outline: true,
                outlineColor:
                  cam.status === 'LIVE'
                    ? Cesium.Color.fromCssColorString('rgba(16, 185, 129, 0.8)')
                    : Cesium.Color.fromCssColorString('rgba(244, 63, 94, 0.8)'),
                outlineWidth: 2,
                height: 5,
              }
            : undefined,
        });

        entity.userData = cam;
        currentEntityMap.set(cam.camera_id, entity);
      } else {
        // Update existing entity
        entity.userData = cam;
        if (entity.billboard) {
          entity.billboard.image = new Cesium.ConstantProperty(pinUrl);
          entity.billboard.scale = new Cesium.ConstantProperty(isSelected ? 1.3 : 0.9);
        }
      }
    });
  }, [cameras, selectedCamera, showFovCones, isReady]);

  // Smooth 3D Cinematic FlyTo when a camera is selected
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || !selectedCamera) return;

    const viewer = viewerRef.current;

    // Dramatic 3D tilted aerial perspective
    const pitchAngle = is3DTilt ? -35 : -85;
    const offsetLat = is3DTilt ? -0.015 : 0;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedCamera.longitude,
        selectedCamera.latitude + offsetLat,
        1800
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(pitchAngle),
        roll: 0.0,
      },
      duration: 2.2,
      maximumHeight: 45000,
      pitchAdjustHeight: 1500,
    });
  }, [selectedCamera, is3DTilt]);

  // Fly to Geographic Preset
  const handlePresetSelect = (preset: ViewPreset) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    setActivePreset(preset.id);

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(preset.lng, preset.lat, preset.height),
      orientation: {
        heading: Cesium.Math.toRadians(preset.heading),
        pitch: Cesium.Math.toRadians(preset.pitch),
        roll: 0.0,
      },
      duration: 2.5,
    });
  };

  // Toggle 3D Tilt vs 2D Top-Down
  const handleToggleTilt = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const nextTilt = !is3DTilt;
    setIs3DTilt(nextTilt);

    const camera = viewerRef.current.camera;
    const currentHeading = camera.heading;
    const targetPitch = nextTilt ? Cesium.Math.toRadians(-35) : Cesium.Math.toRadians(-88);

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: currentHeading,
        pitch: targetPitch,
        roll: 0.0,
      },
      duration: 1.2,
    });
  };

  // Reset North View
  const handleResetNorth = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
    const camera = viewerRef.current.camera;

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: camera.pitch,
        roll: 0.0,
      },
      duration: 1.0,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* 3D Cesium WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Left: 3D Platform Header & Preset Selector */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-32px)]">
        {/* Cesium 3D Geospatial Badge & Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 shadow-2xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              CESIUM 3D GEOSPATIAL
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono border border-emerald-800/60 font-semibold">
              WGS-84 GLOBE
            </span>
          </div>

          {/* Toggle to Google Maps if available */}
          {onToggleToGoogleMaps && (
            <button
              onClick={onToggleToGoogleMaps}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
              title="Switch to Google Maps standard 2D view"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Maps Mode</span>
            </button>
          )}
        </div>

        {/* Quick Fly-To Geographic Corridors */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
          {TANZANIA_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950 font-bold'
                    : 'bg-slate-950/85 hover:bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
                title={`Fly to ${preset.name} (${preset.region})`}
              >
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right: Geospatial Controls & Basemap Switcher */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Basemap Selection Bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-2xl">
          <button
            onClick={() => setActiveBasemap('satellite')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeBasemap === 'satellite'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="High-Resolution Photorealistic Satellite Imagery"
          >
            Satellite
          </button>
          <button
            onClick={() => setActiveBasemap('dark')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeBasemap === 'dark'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tactical Dark Command Center Layer"
          >
            Dark Ops
          </button>
          <button
            onClick={() => setActiveBasemap('streets')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeBasemap === 'streets'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Roads & Infrastructure Network"
          >
            Streets
          </button>
          <button
            onClick={() => setActiveBasemap('topo')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              activeBasemap === 'topo'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Topographical Elevation & Contours"
          >
            Topo
          </button>
        </div>

        {/* 3D Tools Vertical Pill */}
        <div className="flex flex-col gap-1 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-2xl">
          {/* 3D Tilt Toggle */}
          <button
            onClick={handleToggleTilt}
            className={`p-2 rounded-lg text-xs font-mono flex items-center justify-center transition-all cursor-pointer ${
              is3DTilt
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title={is3DTilt ? 'Switch to Top-Down 2D View' : 'Switch to 3D Perspective Tilt'}
          >
            <Compass className={`w-4 h-4 transition-transform ${is3DTilt ? 'rotate-45' : ''}`} />
          </button>

          {/* Reset North */}
          <button
            onClick={handleResetNorth}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
            title="Reset North Orientation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Day / Night Solar Lighting */}
          <button
            onClick={() => setIsLightingEnabled((prev) => !prev)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isLightingEnabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Toggle Solar Atmosphere Lighting & Sun Terminator"
          >
            <Sun className="w-4 h-4" />
          </button>

          {/* Coverage Radar Cones */}
          <button
            onClick={() => setShowFovCones((prev) => !prev)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              showFovCones
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Toggle Camera Station Coverage Footprints"
          >
            <Radio className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Hover Card for Selected/Hovered Camera */}
      {hoveredCamera && (
        <div className="absolute bottom-16 left-6 z-20 pointer-events-none transition-all">
          <div className="px-4 py-3 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative flex-shrink-0">
              <img
                src={hoveredCamera.thumbnail_url}
                alt={hoveredCamera.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white font-mono">
                  {hoveredCamera.name}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    hoveredCamera.status === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {hoveredCamera.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>{hoveredCamera.region}</span>
                <span>•</span>
                <span>{hoveredCamera.camera_type}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                {hoveredCamera.latitude.toFixed(4)}°, {hoveredCamera.longitude.toFixed(4)}°
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Telemetry HUD: Mouse Coordinates, Camera Elevation & Station Stats */}
      <div className="absolute bottom-3 left-4 right-4 z-10 pointer-events-none flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Real-Time Geospatial Coordinates Raycast */}
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 shadow-2xl">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>GEO HUD</span>
          </div>
          {cursorCoordinates ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">
                LAT {cursorCoordinates.lat.toFixed(4)}°
              </span>
              <span className="text-emerald-400 font-semibold">
                LNG {cursorCoordinates.lng.toFixed(4)}°
              </span>
              <span className="text-slate-300">
                ELEV {cursorCoordinates.alt >= 0 ? `+${cursorCoordinates.alt}m` : `${cursorCoordinates.alt}m`}
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Move cursor over globe to measure</span>
          )}
        </div>

        {/* Right: Station Count & Cesium Platform Tag */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 shadow-2xl">
          <span className="text-slate-300">Surveillance Pins:</span>
          <span className="text-emerald-400 font-bold">{cameras.length} active</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">CesiumJS 3D WebGL</span>
        </div>
      </div>
    </div>
  );
};
