import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, ConfigResponse } from './services/api';
import { Camera, DashboardStats } from './types';
import {
  INITIAL_CAMERAS,
  computeLocalStats,
  computeLocalRegions,
} from './data/tanzaniaData';
import { Header } from './components/Header';
import { SearchAndFilters } from './components/SearchAndFilters';
import { MapContainer } from './components/MapContainer';
import { CesiumMapContainer } from './components/CesiumMapContainer';
import { CameraViewer } from './components/CameraViewer';
import { CameraListSidebar } from './components/CameraListSidebar';
import { SourcesRegistryModal } from './components/SourcesRegistryModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { Video, ShieldCheck, MapPin, Eye, ChevronUp, ChevronDown, Radio, Info, Globe } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(() => computeLocalStats(INITIAL_CAMERAS));
  const [allCameras, setAllCameras] = useState<Camera[]>(() => INITIAL_CAMERAS);
  const [availableRegions, setAvailableRegions] = useState<Array<{ region: string; total: number; live: number }>>(() => computeLocalRegions(INITIAL_CAMERAS));
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(() => INITIAL_CAMERAS[0] || null);
  const [geospatialEngine, setGeospatialEngine] = useState<'cesium' | 'googlemaps'>('cesium');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [coverageFilter, setCoverageFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);

  // Default fallback API key from provisioned demo key
  const mapsApiKey =
    config?.googleMapsApiKey ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyCU7_D9bSfUTlaHAt_72ZJJpnUAK-KaRN0';

  // Load App Data with resilient error handling
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsRefreshing(true);
      const results = await Promise.allSettled([
        api.getConfig(),
        api.getStats(),
        api.getCameras(),
        api.getRegions(),
      ]);

      const [confRes, statsRes, camsRes, regionsRes] = results;

      if (confRes.status === 'fulfilled') {
        setConfig(confRes.value);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (camsRes.status === 'fulfilled' && camsRes.value.cameras.length > 0) {
        setAllCameras(camsRes.value.cameras);
        setSelectedCamera((curr) => curr || camsRes.value.cameras[0]);
      }
      if (regionsRes.status === 'fulfilled') {
        setAvailableRegions(regionsRes.value);
      }
    } catch (err) {
      console.warn('Network sync notice (using local cache):', err);
    } finally {
      setIsRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Automated background telemetry sync every 30s
    const syncInterval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(syncInterval);
  }, [loadData]);

  // Client-side and server-side reactive filtering
  const filteredCameras = useMemo(() => {
    let result = [...allCameras];

    if (selectedRegion !== 'ALL') {
      result = result.filter((c) => c.region.toLowerCase() === selectedRegion.toLowerCase());
    }

    if (selectedType !== 'ALL') {
      result = result.filter((c) => c.camera_type.toLowerCase() === selectedType.toLowerCase());
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (coverageFilter !== 'ALL') {
      result = result.filter((c) => c.coverage_type.toLowerCase() === coverageFilter.toLowerCase());
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const textMatch =
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q) ||
          c.camera_type.toLowerCase().includes(q) ||
          c.provider.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q);

        // Also support natural queries like "traffic in Dar es Salaam"
        if (q.includes('traffic') && c.camera_type.includes('Traffic')) {
          if (q.includes('dar') && c.region.toLowerCase().includes('dar')) return true;
        }
        if (q.includes('live') && c.status === 'LIVE') {
          if (q.includes('mbeya') && c.region.toLowerCase().includes('mbeya')) return true;
          if (q.includes('dodoma') && c.region.toLowerCase().includes('dodoma')) return true;
        }
        if (q.includes('road') && (c.camera_type.includes('Road') || c.camera_type.includes('Highway'))) {
          if (q.includes('dodoma') && c.region.toLowerCase().includes('dodoma')) return true;
        }

        return textMatch;
      });
    }

    return result;
  }, [allCameras, selectedRegion, selectedType, statusFilter, coverageFilter, searchQuery]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRegion('ALL');
    setSelectedType('ALL');
    setStatusFilter('ALL');
    setCoverageFilter('ALL');
  };

  const handleSelectCamera = (camera: Camera) => {
    setSelectedCamera(camera);
    setIsMobileSheetExpanded(true);
  };

  return (
    <div id="tanzania-liveview-app" className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. Header with Clock & Dynamic Metrics */}
      <Header
        stats={stats}
        onOpenSources={() => setIsSourcesModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
        toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        geospatialEngine={geospatialEngine}
        onToggleEngine={setGeospatialEngine}
      />

      {/* 2. Command Search & Quick Filters Bar */}
      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        availableRegions={availableRegions}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        coverageFilter={coverageFilter}
        onCoverageFilterChange={setCoverageFilter}
        onClearAll={handleClearFilters}
        filteredCount={filteredCameras.length}
        totalCount={allCameras.length}
      />

      {/* 3. Main Workspace: Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Stations Sidebar */}
        <CameraListSidebar
          cameras={filteredCameras}
          selectedCamera={selectedCamera}
          onSelectCamera={handleSelectCamera}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area: Map + Command Camera Viewer */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Geospatial Map Area (Cesium 3D Globe or Google Maps) */}
          <div className="flex-1 h-full relative">
            {geospatialEngine === 'cesium' ? (
              <CesiumMapContainer
                cameras={filteredCameras}
                selectedCamera={selectedCamera}
                onSelectCamera={handleSelectCamera}
                onToggleToGoogleMaps={() => setGeospatialEngine('googlemaps')}
              />
            ) : (
              <>
                <MapContainer
                  apiKey={mapsApiKey}
                  cameras={filteredCameras}
                  selectedCamera={selectedCamera}
                  onSelectCamera={handleSelectCamera}
                  centerCoordinates={config?.center || { lat: -6.369028, lng: 34.888822 }}
                  zoomLevel={config?.zoom || 6}
                />

                {/* Switch back to Cesium 3D Globe Button */}
                <div className="absolute top-4 right-4 z-10">
                  <button
                    id="btn-switch-to-cesium"
                    onClick={() => setGeospatialEngine('cesium')}
                    className="px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md border border-emerald-500/50 text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 shadow-2xl transition-all cursor-pointer"
                    title="Switch to Cesium 3D Geospatial Globe"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Switch to Cesium 3D</span>
                  </button>
                </div>
              </>
            )}

            {/* Quick Toggle Overlay Button on Desktop */}
            <div className="absolute top-4 left-4 z-10 hidden md:block">
              <button
                id="btn-sidebar-desktop-toggle"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
              >
                <span>{isSidebarOpen ? 'Hide' : 'Show'} Station List</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-emerald-400 font-bold">
                  {filteredCameras.length}
                </span>
              </button>
            </div>
          </div>

          {/* Desktop Right Panel: Selected Camera Live Video Player */}
          <div className="hidden md:flex w-96 lg:w-[480px] xl:w-[540px] flex-col border-l border-slate-800 bg-slate-950/95 z-10 shadow-2xl">
            <CameraViewer
              camera={selectedCamera}
              onPanToMapLocation={(cam) => setSelectedCamera({ ...cam })}
              onRefreshFeed={() => loadData(true)}
            />
          </div>

          {/* Mobile Bottom Sheet for Selected Camera */}
          <div
            id="mobile-camera-bottom-sheet"
            className={`md:hidden absolute inset-x-0 bottom-0 z-30 bg-slate-950 border-t border-slate-800 transition-all duration-300 shadow-2xl rounded-t-2xl flex flex-col ${
              isMobileSheetExpanded ? 'h-[75vh]' : 'h-24'
            }`}
          >
            {/* Handle bar */}
            <div
              onClick={() => setIsMobileSheetExpanded((prev) => !prev)}
              className="w-full py-2 flex flex-col items-center justify-center cursor-pointer select-none bg-slate-900/60 rounded-t-2xl"
            >
              <div className="w-10 h-1 bg-slate-700 rounded-full mb-1"></div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span className="font-bold truncate max-w-[240px]">
                  {selectedCamera ? selectedCamera.name : 'No Camera Selected'}
                </span>
                {isMobileSheetExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {/* Content inside sheet */}
            <div className="flex-1 overflow-hidden">
              <CameraViewer
                camera={selectedCamera}
                onPanToMapLocation={(cam) => setSelectedCamera({ ...cam })}
                onRefreshFeed={() => loadData(true)}
              />
            </div>
          </div>
        </main>
      </div>

      {/* 4. Transparency Camera Sources Registry Modal */}
      <SourcesRegistryModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
      />

      {/* 5. Administrator Console Modal */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        cameras={allCameras}
        onCamerasUpdated={() => loadData(false)}
      />
    </div>
  );
}
