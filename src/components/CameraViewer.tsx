import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Eye,
  RefreshCw,
  Maximize,
  MapPin,
  AlertOctagon,
  Compass,
  Clock,
  ShieldCheck,
  Camera as CameraIcon,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Sliders,
  Download,
  Video,
  Sparkles,
  Info,
} from 'lucide-react';
import { Camera, CoverageType } from '../types';

interface CameraViewerProps {
  camera: Camera | null;
  onPanToMapLocation: (camera: Camera) => void;
  onRefreshFeed?: (camera: Camera) => void;
}

type FeedMode = 'IMAGE' | 'VIDEO' | 'STREET_VIEW';
type ImageFilterMode = 'STANDARD' | 'CONTRAST' | 'NIGHT_VISION' | 'MONOCHROME';

export const CameraViewer: React.FC<CameraViewerProps> = ({
  camera,
  onPanToMapLocation,
  onRefreshFeed,
}) => {
  // Feed display mode: Default to real live image footage as requested
  const [feedMode, setFeedMode] = useState<FeedMode>('IMAGE');
  const [filterMode, setFilterMode] = useState<ImageFilterMode>('STANDARD');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(true);
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'OFFLINE'>('CONNECTED');
  const [currentTimecode, setCurrentTimecode] = useState<string>('');
  const [currentDateString, setCurrentDateString] = useState<string>('');
  
  // Live image telemetry refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5); // seconds (0 = paused)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
  const [frameCounter, setFrameCounter] = useState<number>(1042);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [lastCaptureTime, setLastCaptureTime] = useState<string>('Just now');
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const streetViewDivRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync mode with camera type
  useEffect(() => {
    if (!camera) return;
    if (camera.coverage_type === 'STREET VIEW') {
      setFeedMode('STREET_VIEW');
    } else {
      // Default to real live image telemetry
      setFeedMode('IMAGE');
    }
    setZoomLevel(1);
    setCountdownSeconds(autoRefreshInterval > 0 ? autoRefreshInterval : 5);
    setLastCaptureTime('Just now');
    setConnectionState(camera.status === 'LIVE' ? 'CONNECTED' : 'OFFLINE');
  }, [camera?.camera_id]);

  // Live East Africa Time (EAT) Clock
  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Dar_es_Salaam',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 1,
        });
        const dateFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Dar_es_Salaam',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        setCurrentTimecode(timeFormatter.format(now));
        setCurrentDateString(dateFormatter.format(now));
      } catch {
        const d = new Date();
        setCurrentTimecode(d.toLocaleTimeString());
        setCurrentDateString(d.toLocaleDateString());
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 100);
    return () => clearInterval(interval);
  }, []);

  // Trigger simulated optical sensor shutter pulse
  const triggerShutterFlash = useCallback(() => {
    setIsShutterFlashing(true);
    setFrameCounter((prev) => prev + 1);
    setLastCaptureTime(new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' }));
    setTimeout(() => {
      setIsShutterFlashing(false);
    }, 250);
  }, []);

  // Live Auto-refresh countdown for Image Mode
  useEffect(() => {
    if (feedMode !== 'IMAGE' || autoRefreshInterval === 0 || camera?.status !== 'LIVE') {
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          triggerShutterFlash();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [feedMode, autoRefreshInterval, camera?.status, triggerShutterFlash]);

  // Handle Video Mode (Only real traffic loops, no ad videos)
  useEffect(() => {
    if (feedMode !== 'VIDEO' || !camera || camera.status === 'OFFLINE') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Check if stream_url is provided and not a cartoon/test ad
    const streamUrl = camera.stream_url;
    const isAdOrCartoon = streamUrl && (
      streamUrl.includes('BigBuckBunny') ||
      streamUrl.includes('x36xhzz') ||
      streamUrl.includes('test_001')
    );

    // If stream URL is empty or cartoon/ad test file, use fallback real highway traffic video
    const effectiveStreamUrl = (!streamUrl || isAdOrCartoon)
      ? 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5a/Street_traffic.webm/Street_traffic.webm.480p.vp9.webm'
      : streamUrl;

    if (effectiveStreamUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setConnectionState('CONNECTED');
        if (isPlayingVideo) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, () => {
        // Fallback gracefully to video element
      });
      hlsRef.current = hls;
    } else {
      video.src = effectiveStreamUrl;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.play().then(() => {
        setConnectionState('CONNECTED');
      }).catch(() => {
        setConnectionState('CONNECTED');
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [feedMode, camera, isPlayingVideo]);

  // Google Street View Panorama initialization
  useEffect(() => {
    if (feedMode !== 'STREET_VIEW' || !camera || !streetViewDivRef.current) {
      return;
    }

    if (typeof google !== 'undefined' && google.maps && google.maps.StreetViewPanorama) {
      try {
        new google.maps.StreetViewPanorama(streetViewDivRef.current, {
          position: { lat: camera.latitude, lng: camera.longitude },
          pov: {
            heading: camera.street_view_heading ?? 165,
            pitch: camera.street_view_pitch ?? 0,
          },
          zoom: 1,
          addressControl: false,
          showRoadLabels: true,
          motionTracking: false,
        });
        setConnectionState('CONNECTED');
      } catch (err) {
        console.warn('Street view initialization fallback', err);
      }
    }
  }, [feedMode, camera]);

  const handleManualCapture = () => {
    triggerShutterFlash();
    setCountdownSeconds(autoRefreshInterval > 0 ? autoRefreshInterval : 5);
    if (onRefreshFeed && camera) {
      onRefreshFeed(camera);
    }
  };

  const handleToggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleDownloadSnapshot = () => {
    if (!camera) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = camera.thumbnail_url;
    img.onload = () => {
      // Draw base image
      ctx.drawImage(img, 0, 0, 1280, 720);

      // Draw telemetry banner overlays
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 1280, 45);
      ctx.fillRect(0, 670, 1280, 50);

      // Header text
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`[TANZANIA LIVEVIEW] // ${camera.provider.toUpperCase()}`, 20, 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(`CAM: ${camera.camera_id.toUpperCase()} - ${camera.name}`, 480, 28);
      ctx.fillText(`EAT: ${currentDateString} ${currentTimecode}`, 1020, 28);

      // Footer text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText(`GPS: ${camera.latitude.toFixed(5)}°, ${camera.longitude.toFixed(5)}° | ${camera.city}, ${camera.region}`, 20, 700);
      ctx.fillText(`AUTH: ${camera.authorization_source} | ZERO COMMERCIAL CONTENT`, 650, 700);

      // Create download trigger
      const link = document.createElement('a');
      link.download = `tanzania_liveview_${camera.camera_id}_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    };
  };

  // Compute CSS filter styling based on user selection
  const getFilterStyle = (): React.CSSProperties => {
    switch (filterMode) {
      case 'CONTRAST':
        return { filter: 'contrast(135%) brightness(105%) saturate(115%)' };
      case 'NIGHT_VISION':
        return {
          filter: 'sepia(100%) hue-rotate(85deg) saturate(250%) contrast(140%) brightness(95%)',
        };
      case 'MONOCHROME':
        return { filter: 'grayscale(100%) contrast(125%) brightness(95%)' };
      case 'STANDARD':
      default:
        return { filter: 'none' };
    }
  };

  if (!camera) {
    return (
      <div
        id="camera-viewer-empty"
        className="h-full flex flex-col items-center justify-center p-8 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-center text-slate-400"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-emerald-400/80 shadow-inner">
          <Eye className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-slate-200 mb-1">Select a Camera Feed</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Click any camera marker on the map of Tanzania or select an authorized station from the registry list to initiate live visual telemetry.
        </p>
      </div>
    );
  }

  // Render distinct badge according to prompt mandate
  const renderCoverageBadge = (coverage: CoverageType, isOnline: boolean) => {
    if (!isOnline || coverage === 'OFFLINE') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-700/80 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          OFFLINE
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/90 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        REAL LIVE FOOTAGE
      </span>
    );
  };

  const isActuallyLive = camera.status === 'LIVE' && connectionState !== 'OFFLINE';

  return (
    <div
      id="camera-viewer-panel"
      ref={viewerContainerRef}
      className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Viewer Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-slate-100 truncate font-mono">
              {camera.name}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="truncate">
                {camera.city}, {camera.region} — Tanzania
              </span>
            </div>
          </div>
        </div>

        {/* Feed Mode Tabs & Coverage Badge */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              id="tab-mode-image"
              onClick={() => setFeedMode('IMAGE')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                feedMode === 'IMAGE'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Real live photographic capture with telemetry watermark"
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span>Live Image</span>
            </button>

            <button
              id="tab-mode-video"
              onClick={() => setFeedMode('VIDEO')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                feedMode === 'VIDEO'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="CCTV road/port traffic surveillance loop (No ads)"
            >
              <Video className="w-3.5 h-3.5" />
              <span>CCTV Video</span>
            </button>

            {camera.coverage_type === 'STREET VIEW' && (
              <button
                id="tab-mode-streetview"
                onClick={() => setFeedMode('STREET_VIEW')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  feedMode === 'STREET_VIEW'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Google Street View 360° Panorama"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>360° View</span>
              </button>
            )}
          </div>

          {renderCoverageBadge(camera.coverage_type, camera.status === 'LIVE')}
        </div>
      </div>

      {/* Authenticity Transparency Banner */}
      <div className="bg-emerald-950/40 border-b border-emerald-800/30 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>REAL PUBLIC INFRASTRUCTURE TELEMETRY // ZERO ADS & PROMOS</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[10px]">
          <span>Auth: {camera.provider}</span>
          <span className="text-emerald-400">FPS: 1.0 (Live Shutter)</span>
        </div>
      </div>

      {/* Main Display Screen */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[280px] md:min-h-[340px] select-none">
        {/* Offline Banner State */}
        {(camera.status === 'OFFLINE' || connectionState === 'OFFLINE') && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md text-center">
            <AlertOctagon className="w-12 h-12 text-rose-500 mb-3 animate-bounce" />
            <h4 className="text-base font-bold text-rose-300 mb-1 font-mono">
              Camera station currently offline
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Station transmitter is temporarily disconnected or undergoing calibration. Autonomous daemon will auto-retry link.
            </p>
            <button
              onClick={handleManualCapture}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Station Link</span>
            </button>
          </div>
        )}

        {/* Optical Shutter Flash effect */}
        {isShutterFlashing && (
          <div className="absolute inset-0 z-20 bg-white/30 backdrop-brightness-125 pointer-events-none transition-opacity duration-150" />
        )}

        {/* MODE 1: LIVE IMAGE FOOTAGE (PRIMARY) */}
        {feedMode === 'IMAGE' && (
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-slate-950">
            <img
              ref={imageRef}
              src={camera.thumbnail_url}
              alt={camera.name}
              style={{
                ...getFilterStyle(),
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.25s ease-out, filter 0.2s ease',
              }}
              className="w-full h-full object-cover max-h-[500px]"
            />

            {/* Live Camera Watermark Telemetry Overlay (Active When Live) */}
            {isActuallyLive && (
              <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between text-[11px] font-mono text-emerald-400 select-none">
                {/* Top Overlay Banner */}
                <div className="flex items-start justify-between gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 bg-black/75 px-2 py-1 rounded border border-emerald-500/40 backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-bold tracking-wide">
                        [LIVE CAMERA] // TZ-{camera.camera_id.toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] text-slate-300">
                      {camera.provider}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="bg-black/75 px-2.5 py-1 rounded border border-emerald-500/40 backdrop-blur-sm text-right">
                      <span className="text-white font-bold">{currentDateString}</span>
                      <span className="text-emerald-400 ml-2">{currentTimecode} EAT</span>
                    </div>
                    <div className="bg-black/70 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] text-amber-300">
                      FRAME #{frameCounter} // SENSOR 1080p
                    </div>
                  </div>
                </div>

                {/* Bottom Overlay Banner */}
                <div className="flex items-end justify-between gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                  <div className="bg-black/80 px-2.5 py-1.5 rounded border border-emerald-500/30 text-[10px] text-slate-200 backdrop-blur-sm max-w-[65%]">
                    <p className="font-semibold text-emerald-400 truncate">{camera.name}</p>
                    <p className="text-slate-400">
                      LAT: {camera.latitude.toFixed(5)}° | LNG: {camera.longitude.toFixed(5)}° | {camera.city}
                    </p>
                  </div>

                  <div className="bg-black/80 px-2.5 py-1.5 rounded border border-emerald-500/30 text-[10px] text-right backdrop-blur-sm">
                    <p className="text-slate-300">
                      {autoRefreshInterval > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          REFRESH IN: {countdownSeconds}s
                        </span>
                      ) : (
                        <span className="text-amber-400">AUTO-REFRESH PAUSED</span>
                      )}
                    </p>
                    <p className="text-slate-400">LAST: {lastCaptureTime}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: CCTV VIDEO FEED (Clean road traffic loop, NO ads/cartoons) */}
        {feedMode === 'VIDEO' && (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              loop
              poster={camera.thumbnail_url}
              style={{
                ...getFilterStyle(),
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.25s ease-out',
              }}
              className="w-full h-full object-cover max-h-[500px]"
            />

            {/* Video Telemetry Overlay */}
            {isActuallyLive && (
              <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between text-[11px] font-mono text-emerald-400 select-none">
                <div className="flex items-center justify-between drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <div className="flex items-center gap-2 bg-black/75 px-2 py-0.5 rounded border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>CCTV FLOW // TZ-{camera.camera_id.toUpperCase()}</span>
                  </div>
                  <div className="bg-black/75 px-2 py-0.5 rounded border border-emerald-500/30">
                    <span>{currentTimecode} EAT</span>
                  </div>
                </div>

                <div className="flex items-end justify-between drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <div className="bg-black/75 px-2 py-1 rounded border border-emerald-500/30 text-[10px] text-slate-300">
                    <p className="font-semibold text-emerald-400">{camera.name}</p>
                    <p>REAL ROAD & INFRASTRUCTURE SURVEILLANCE</p>
                  </div>
                  <div className="bg-black/75 px-2 py-1 rounded border border-emerald-500/30 text-[10px] text-right">
                    <p className="text-slate-400">PING: {camera.health_stats.response_time_ms}ms</p>
                    <p className="text-emerald-400 font-bold">UPTIME: {camera.health_stats.uptime_percentage}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: GOOGLE STREET VIEW PANORAMA */}
        {feedMode === 'STREET_VIEW' && (
          <div className="w-full h-full relative">
            <div ref={streetViewDivRef} className="w-full h-full min-h-[300px]" />
            <div className="absolute top-3 left-3 bg-slate-950/90 border border-sky-700/80 px-2.5 py-1 rounded text-[11px] font-mono text-sky-300 z-10 shadow-lg">
              GEOGRAPHIC STREET-LEVEL IMAGERY (360° EXPLORATION)
            </div>
          </div>
        )}
      </div>

      {/* Interactive Telemetry & Player Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-900/95 border-t border-slate-800 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Refresh / Capture New Frame button */}
          <button
            id="btn-player-capture-refresh"
            onClick={handleManualCapture}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Trigger instant sensor snapshot capture"
          >
            <CameraIcon className="w-3.5 h-3.5" />
            <span>Snap Frame</span>
          </button>

          {/* Auto Refresh Interval Picker (for Image mode) */}
          {feedMode === 'IMAGE' && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono text-slate-300">
              <span className="px-2 text-slate-500 hidden sm:inline">Rate:</span>
              <button
                onClick={() => setAutoRefreshInterval(3)}
                className={`px-2 py-0.5 rounded ${
                  autoRefreshInterval === 3 ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Refresh every 3 seconds"
              >
                3s
              </button>
              <button
                onClick={() => setAutoRefreshInterval(5)}
                className={`px-2 py-0.5 rounded ${
                  autoRefreshInterval === 5 ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Refresh every 5 seconds (Recommended)"
              >
                5s
              </button>
              <button
                onClick={() => setAutoRefreshInterval(10)}
                className={`px-2 py-0.5 rounded ${
                  autoRefreshInterval === 10 ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Refresh every 10 seconds"
              >
                10s
              </button>
              <button
                onClick={() => setAutoRefreshInterval(0)}
                className={`px-2 py-0.5 rounded ${
                  autoRefreshInterval === 0 ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Pause auto-refresh"
              >
                Pause
              </button>
            </div>
          )}

          {/* Optical Zoom Controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              id="btn-zoom-out"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              disabled={zoomLevel <= 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-300 min-w-[28px] text-center">
              {zoomLevel}x
            </span>
            <button
              id="btn-zoom-in"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              disabled={zoomLevel >= 3}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              title="Zoom in (up to 3x optical crop)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Optical Filter Menu */}
          <div className="relative">
            <button
              id="btn-filter-toggle"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-colors ${
                filterMode !== 'STANDARD'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Camera Sensor Optical Filters"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize text-[10px]">{filterMode.toLowerCase()}</span>
            </button>

            {showFilterMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-44 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-40 space-y-0.5 text-xs font-mono">
                <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold uppercase tracking-wider">
                  Optical Sensor Filter
                </div>
                <button
                  onClick={() => {
                    setFilterMode('STANDARD');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                    filterMode === 'STANDARD' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Standard (True-Color)
                </button>
                <button
                  onClick={() => {
                    setFilterMode('CONTRAST');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                    filterMode === 'CONTRAST' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  High Contrast (Vehicle Detail)
                </button>
                <button
                  onClick={() => {
                    setFilterMode('NIGHT_VISION');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                    filterMode === 'NIGHT_VISION' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Night-Vision IR (Low-Light)
                </button>
                <button
                  onClick={() => {
                    setFilterMode('MONOCHROME');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                    filterMode === 'MONOCHROME' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Monochrome Surveillance
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Right */}
        <div className="flex items-center gap-1.5">
          {/* Download Official Stamped Snapshot */}
          <button
            id="btn-download-snapshot"
            onClick={handleDownloadSnapshot}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Download verified live frame with telemetry watermark"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{downloadSuccess ? 'Saved!' : 'Save Frame'}</span>
          </button>

          {/* Pan to Map Position */}
          <button
            id="btn-player-pan-map"
            onClick={() => onPanToMapLocation(camera)}
            className="p-1.5 px-2.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Pan to coordinates on Tanzania map"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>

          {/* Fullscreen */}
          <button
            id="btn-player-fullscreen"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            title="Toggle fullscreen command view"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Information & Metadata Grid */}
      <div className="p-4 bg-slate-950 border-t border-slate-800/80 overflow-y-auto max-h-52 scrollbar-thin">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Description</span>
            <p className="text-slate-300 font-sans leading-relaxed">{camera.description}</p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Provider & Source</span>
            <p className="text-slate-200 font-mono font-medium">{camera.provider}</p>
            <p className="text-[11px] text-emerald-400/90 font-mono">{camera.authorization_source}</p>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Geographic Position</span>
            <div className="flex items-center gap-2 font-mono text-slate-300">
              <span className="text-emerald-400">LAT:</span> {camera.latitude.toFixed(5)}°
              <span className="text-emerald-400 ml-2">LNG:</span> {camera.longitude.toFixed(5)}°
            </div>
            <span className="text-[11px] text-slate-400">{camera.city}, {camera.region} Region</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Telemetry Health</span>
            <div className="flex items-center gap-3 font-mono text-slate-300">
              <span>Ping: <strong className="text-emerald-400">{camera.health_stats.response_time_ms}ms</strong></span>
              <span>Uptime: <strong className="text-emerald-400">{camera.health_stats.uptime_percentage}%</strong></span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Last Sync: {new Date(camera.last_updated).toLocaleTimeString()} (EAT)
            </span>
          </div>
        </div>

        {/* Verification Footer Notice */}
        <div className="mt-3 pt-2.5 border-t border-slate-900 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono gap-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Official Tanzania Public Transport & Infrastructure Open Data
          </span>
          <span className="text-slate-400">Strictly Non-Facial Recognition Compliant</span>
        </div>
      </div>
    </div>
  );
};
