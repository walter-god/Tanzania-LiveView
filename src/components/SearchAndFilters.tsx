import React from 'react';
import { Search, X, Filter, MapPin, Radio, Car, CloudRain, Anchor, Plane, Building2, Compass } from 'lucide-react';
import { CameraType, CoverageType } from '../types';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  availableRegions: Array<{ region: string; total: number; live: number }>;
  selectedType: string;
  onTypeChange: (type: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  coverageFilter: string;
  onCoverageFilterChange: (coverage: string) => void;
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
}

const TYPE_FILTERS: Array<{ label: string; value: string; icon: React.ReactNode }> = [
  { label: 'All Types', value: 'ALL', icon: <Filter className="w-3.5 h-3.5" /> },
  { label: 'Traffic', value: 'Traffic Camera', icon: <Car className="w-3.5 h-3.5 text-amber-400" /> },
  { label: 'Road', value: 'Road Camera', icon: <Compass className="w-3.5 h-3.5 text-orange-400" /> },
  { label: 'Highway', value: 'Highway Camera', icon: <Car className="w-3.5 h-3.5 text-yellow-400" /> },
  { label: 'Port', value: 'Port Camera', icon: <Anchor className="w-3.5 h-3.5 text-cyan-400" /> },
  { label: 'Airport', value: 'Airport Camera', icon: <Plane className="w-3.5 h-3.5 text-blue-400" /> },
  { label: 'Weather', value: 'Weather Camera', icon: <CloudRain className="w-3.5 h-3.5 text-sky-400" /> },
  { label: 'Public Space', value: 'Public Space Camera', icon: <Building2 className="w-3.5 h-3.5 text-emerald-400" /> },
];

const PRESET_QUERIES = [
  'Traffic in Dar es Salaam',
  'Live cameras in Mbeya',
  'Road cameras near Dodoma',
  'Zanzibar Waterfront',
  'Kilimanjaro Weather',
];

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedRegion,
  onRegionChange,
  availableRegions,
  selectedType,
  onTypeChange,
  statusFilter,
  onStatusFilterChange,
  coverageFilter,
  onCoverageFilterChange,
  onClearAll,
  filteredCount,
  totalCount,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedRegion !== 'ALL' ||
    selectedType !== 'ALL' ||
    statusFilter !== 'ALL' ||
    coverageFilter !== 'ALL';

  return (
    <div id="search-and-filters" className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 z-20">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Top row: Search input + Region Selector + Status & Coverage toggles */}
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Main Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="camera-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cameras by city, region, type (e.g. 'Traffic cameras in Dar es Salaam')..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Region Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-52">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                id="region-select"
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                className="w-full pl-8 pr-7 py-2 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none font-medium cursor-pointer"
              >
                <option value="ALL">All Regions (Nationwide)</option>
                {availableRegions.map((reg) => (
                  <option key={reg.region} value={reg.region}>
                    {reg.region} ({reg.live}/{reg.total} live)
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Pill (Live / Offline / All) */}
            <div className="flex rounded-xl bg-slate-950/80 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                id="filter-status-all"
                onClick={() => onStatusFilterChange('ALL')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                id="filter-status-live"
                onClick={() => onStatusFilterChange('LIVE')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                  statusFilter === 'LIVE'
                    ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/50'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Live
              </button>
              <button
                id="filter-status-offline"
                onClick={() => onStatusFilterChange('OFFLINE')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'OFFLINE'
                    ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-700/50'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                Offline
              </button>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                id="btn-clear-filters"
                onClick={onClearAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                title="Reset all filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom row: Type chips + Coverage distinction pills + Results count */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 text-xs scrollbar-thin">
          <div className="flex items-center gap-1.5 flex-nowrap">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mr-1">Type:</span>
            {TYPE_FILTERS.map((f) => {
              const isSelected = selectedType === f.value;
              return (
                <button
                  key={f.value}
                  id={`type-filter-${f.value.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onTypeChange(f.value)}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all text-xs font-medium border ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Strict Coverage Type filter */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">FORMAT:</span>
              <button
                onClick={() => onCoverageFilterChange('ALL')}
                className={`px-1.5 py-0.5 rounded ${coverageFilter === 'ALL' ? 'text-white bg-slate-800' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => onCoverageFilterChange('LIVE CAMERA')}
                className={`px-1.5 py-0.5 rounded ${
                  coverageFilter === 'LIVE CAMERA' ? 'text-emerald-300 bg-emerald-950 border border-emerald-800' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                Live Video
              </button>
              <button
                onClick={() => onCoverageFilterChange('STREET VIEW')}
                className={`px-1.5 py-0.5 rounded ${
                  coverageFilter === 'STREET VIEW' ? 'text-sky-300 bg-sky-950 border border-sky-800' : 'text-slate-400 hover:text-sky-400'
                }`}
              >
                Street View
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
              <span className="text-emerald-400 font-bold">{filteredCount}</span> of {totalCount} cams
            </div>
          </div>
        </div>

        {/* Search Preset suggestions if search is empty */}
        {!searchQuery && (
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>Quick search:</span>
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset}
                onClick={() => onSearchChange(preset)}
                className="hover:text-emerald-300 hover:underline transition-colors"
              >
                "{preset}"
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
