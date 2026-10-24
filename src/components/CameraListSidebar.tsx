import React from 'react';
import { Camera, CoverageType } from '../types';
import { Video, MapPin, Radio, AlertCircle, Compass, Clock, ChevronRight } from 'lucide-react';

interface CameraListSidebarProps {
  cameras: Camera[];
  selectedCamera: Camera | null;
  onSelectCamera: (camera: Camera) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CameraListSidebar: React.FC<CameraListSidebarProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  isOpen,
  onClose,
}) => {
  const getCoverageIndicator = (coverage: CoverageType, isOnline: boolean) => {
    if (!isOnline) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          OFFLINE
        </span>
      );
    }

    switch (coverage) {
      case 'LIVE CAMERA':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        );
      case 'STREET VIEW':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/60">
            STREET VIEW
          </span>
        );
      case 'STATIC/ARCHIVED IMAGE':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
            STATIC
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      id="camera-list-sidebar"
      className={`fixed md:static inset-y-0 left-0 z-30 w-80 md:w-84 lg:w-96 bg-slate-950/95 md:bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Authorized Stations ({cameras.length})
          </h3>
        </div>

        <button
          onClick={onClose}
          className="md:hidden text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
        >
          Close
        </button>
      </div>

      {/* Camera Items Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
        {cameras.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No authorized cameras match your current filters.</p>
          </div>
        ) : (
          cameras.map((camera) => {
            const isSelected = selectedCamera?.camera_id === camera.camera_id;
            return (
              <div
                key={camera.camera_id}
                id={`cam-item-${camera.camera_id}`}
                onClick={() => {
                  onSelectCamera(camera);
                  // On mobile close drawer after selecting
                  if (window.innerWidth < 768) onClose();
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900/90 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/40 border-slate-800/70 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-200 line-clamp-1 font-sans">
                    {camera.name}
                  </span>
                  {getCoverageIndicator(camera.coverage_type, camera.status === 'LIVE')}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>
                      {camera.city}, {camera.region}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {camera.camera_type.replace(' Camera', '')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800/50 pt-1.5">
                  <span className="truncate max-w-[200px]">{camera.provider}</span>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span>View</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span>Tanzania LiveView Node v2.4</span>
        <span className="text-emerald-400">● 100% Authorized</span>
      </div>
    </aside>
  );
};
