import React, { useState, useEffect } from 'react';
import { ShieldCheck, Video, Radio, Database, ShieldAlert, RefreshCw, Layers, Globe, Map } from 'lucide-react';
import { DashboardStats } from '../types';

interface HeaderProps {
  stats: DashboardStats | null;
  onOpenSources: () => void;
  onOpenAdmin: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  geospatialEngine?: 'cesium' | 'googlemaps';
  onToggleEngine?: (engine: 'cesium' | 'googlemaps') => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onOpenSources,
  onOpenAdmin,
  onRefresh,
  isRefreshing,
  toggleSidebar,
  isSidebarOpen,
  geospatialEngine = 'cesium',
  onToggleEngine,
}) => {
  const [tanzaniaTime, setTanzaniaTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Dar_es_Salaam',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        setTanzaniaTime(formatter.format(now));
      } catch {
        setTanzaniaTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header id="main-header" className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 z-30 sticky top-0 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & National System Title */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-amber-500/10 border border-emerald-500/40 shadow-inner">
              <Video className="w-5 h-5 text-emerald-400" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-slate-100 uppercase font-mono">
                  Tanzania <span className="text-emerald-400">LiveView</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                  Authorized Feeds
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans tracking-tight">
                National Public Surveillance & Traffic Telemetry Network
              </p>
            </div>
          </div>

          <button
            id="btn-toggle-sidebar"
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title="Toggle list"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Live Clock & Status Badge */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs font-mono text-slate-300 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-slate-400">DAR ES SALAAM (EAT):</span>
            <span className="text-emerald-300 font-semibold">{tanzaniaTime || 'Loading...'}</span>
          </div>

          {/* Quick Refresh */}
          <button
            id="btn-header-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all ${
              isRefreshing ? 'animate-spin text-emerald-400' : ''
            }`}
            title="Synchronize live feeds"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Dashboard Metrics from Database */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-4 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block leading-tight">TOTAL</span>
              <span className="text-sm font-bold text-slate-200">{stats?.total_cameras ?? '—'}</span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-emerald-500/90 block leading-tight">LIVE</span>
              <span className="text-sm font-bold text-emerald-400">{stats?.live_cameras ?? '—'}</span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-rose-500/90 block leading-tight">OFFLINE</span>
              <span className="text-sm font-bold text-rose-400">{stats?.offline_cameras ?? '—'}</span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-sky-500/90 block leading-tight">REGIONS</span>
              <span className="text-sm font-bold text-sky-400">{stats?.regions_covered ?? '—'}</span>
            </div>
          </div>

          {/* 3D Geospatial Engine Switcher */}
          {onToggleEngine && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              <button
                id="btn-engine-cesium"
                onClick={() => onToggleEngine('cesium')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  geospatialEngine === 'cesium'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cesium 3D Geospatial Globe"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Cesium 3D</span>
              </button>
              <button
                id="btn-engine-maps"
                onClick={() => onToggleEngine('googlemaps')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  geospatialEngine === 'googlemaps'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Google Maps Standard View"
              >
                <Map className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Google Maps</span>
              </button>
            </div>
          )}

          {/* Actions: Sources & Admin */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-open-sources"
              onClick={onOpenSources}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
              title="Camera Sources Registry & Compliance"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Sources</span>
            </button>

            <button
              id="btn-open-admin"
              onClick={onOpenAdmin}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
              title="Command Administrator Console"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
