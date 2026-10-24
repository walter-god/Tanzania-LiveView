import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  X,
  Plus,
  Trash2,
  Edit2,
  Power,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Radio,
  FileCode,
  Check,
} from 'lucide-react';
import { Camera, HealthLog, AuditLog, CameraType, CoverageType, StreamFormat } from '../types';
import { api } from '../services/api';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: Camera[];
  onCamerasUpdated: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  cameras,
  onCamerasUpdated,
}) => {
  const [adminToken, setAdminToken] = useState<string>('');
  const [enteredKey, setEnteredKey] = useState<string>('tz-liveview-admin-secret-2025');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'CAMERAS' | 'ADD' | 'HEALTH_LOGS' | 'AUDIT_LOGS'>('CAMERAS');
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Diagnostic test state
  const [testingCamId, setTestingCamId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Form for Adding Camera
  const [newCam, setNewCam] = useState({
    name: '',
    description: '',
    latitude: -6.818,
    longitude: 39.298,
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    camera_type: 'Traffic Camera' as CameraType,
    provider: 'TANROADS Intelligent Transport System',
    stream_url: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200',
    authorization_source: 'TANROADS Public ITS Portal §14.2 Road Safety Data Protocol',
    coverage_type: 'LIVE CAMERA' as CoverageType,
    stream_format: 'IMAGE_REFRESH' as StreamFormat,
    status: 'LIVE' as const,
  });
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Authenticate Admin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await api.adminLogin(enteredKey.trim());
      if (res.success && res.token) {
        setAdminToken(res.token);
        setIsAuthenticated(true);
      } else {
        setAuthError('Authentication failed. Invalid administrative security key.');
      }
    } catch {
      setAuthError('Network error during authentication.');
    }
  };

  // Load Health and Audit Logs
  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const [hData, aData] = await Promise.all([api.getHealthLogs(), api.getAuditLogs()]);
      setHealthLogs(hData.logs);
      setAuditLogs(aData.logs);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs();
    }
  }, [isAuthenticated, activeTab]);

  // Toggle Camera Status (LIVE <-> OFFLINE)
  const handleToggleCamera = async (id: string) => {
    try {
      await api.toggleCamera(id, adminToken);
      onCamerasUpdated();
      loadLogs();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  // Delete Camera
  const handleDeleteCamera = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove camera: "${name}"?`)) return;
    try {
      await api.deleteCamera(id, adminToken);
      onCamerasUpdated();
      loadLogs();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  // Test Camera Stream Diagnostic
  const handleTestStream = async (id: string) => {
    try {
      setTestingCamId(id);
      setTestResult(null);
      const res = await api.testCameraStream(id, adminToken);
      setTestResult(res);
      loadLogs();
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestingCamId(null);
    }
  };

  // Create Camera
  const handleCreateCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      await api.addCamera(newCam, adminToken);
      setFormSuccess(`Camera "${newCam.name}" registered successfully.`);
      onCamerasUpdated();
      loadLogs();
      // Reset form
      setNewCam({
        name: '',
        description: '',
        latitude: -6.818,
        longitude: 39.298,
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        camera_type: 'Traffic Camera',
        provider: 'TANROADS Intelligent Transport System',
        stream_url: '',
        thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200',
        authorization_source: 'TANROADS Public ITS Portal §14.2 Road Safety Data Protocol',
        coverage_type: 'LIVE CAMERA',
        stream_format: 'IMAGE_REFRESH',
        status: 'LIVE',
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to register camera');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="admin-panel-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <div
        id="admin-panel-modal"
        className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950 border border-amber-800 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                Tanzania LiveView Command Administrator Console
              </h2>
              <p className="text-xs text-slate-400">
                Authorized Node Control, Station Provisioning & Feed Diagnostics
              </p>
            </div>
          </div>

          <button
            id="btn-close-admin"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authentication Gate */}
        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <form
              onSubmit={handleLogin}
              className="w-full max-w-md p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-amber-400 mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Administrator Verification Required
                </h3>
                <p className="text-xs text-slate-400">
                  Enter the command administrative secret key configured for this Tanzania LiveView node.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-mono block">Administrative Key:</label>
                <input
                  type="password"
                  value={enteredKey}
                  onChange={(e) => setEnteredKey(e.target.value)}
                  placeholder="Enter secret key..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
                <span className="text-[10px] text-slate-500 font-mono block">
                  Default: <code className="text-amber-400">tz-liveview-admin-secret-2025</code>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold font-mono transition-colors shadow-lg shadow-amber-950/50"
              >
                Unlock Administrator Console
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/40 text-xs font-mono">
              <button
                onClick={() => setActiveTab('CAMERAS')}
                className={`px-4 py-2 border-b-2 font-bold transition-all ${
                  activeTab === 'CAMERAS'
                    ? 'border-amber-400 text-amber-400 bg-amber-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Manage Stations ({cameras.length})
              </button>
              <button
                onClick={() => setActiveTab('ADD')}
                className={`px-4 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'ADD'
                    ? 'border-amber-400 text-amber-400 bg-amber-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Station
              </button>
              <button
                onClick={() => setActiveTab('HEALTH_LOGS')}
                className={`px-4 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'HEALTH_LOGS'
                    ? 'border-amber-400 text-amber-400 bg-amber-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Health Diagnostics
              </button>
              <button
                onClick={() => setActiveTab('AUDIT_LOGS')}
                className={`px-4 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'AUDIT_LOGS'
                    ? 'border-amber-400 text-amber-400 bg-amber-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Audit Logs
              </button>
            </div>

            {/* Tab 1: Stations Management Table */}
            {activeTab === 'CAMERAS' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                {testResult && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-800/80 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">Stream Diagnostic Result:</span>
                      <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="text-[11px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-900 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Camera Name</th>
                        <th className="p-3">Region / City</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Latency</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {cameras.map((c) => (
                        <tr key={c.camera_id} className="hover:bg-slate-900/40">
                          <td className="p-3">
                            <span className="font-bold text-slate-200 block">{c.name}</span>
                            <span className="text-[10px] text-slate-500">{c.provider}</span>
                          </td>
                          <td className="p-3 text-slate-300">
                            {c.city}, {c.region}
                          </td>
                          <td className="p-3 text-slate-400">{c.camera_type}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'LIVE'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{c.health_stats.response_time_ms}ms</td>
                          <td className="p-3 text-right space-x-2">
                            {/* Toggle Live/Offline */}
                            <button
                              onClick={() => handleToggleCamera(c.camera_id)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                                c.status === 'LIVE'
                                  ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                              }`}
                              title="Toggle station availability"
                            >
                              {c.status === 'LIVE' ? 'Disable' : 'Enable'}
                            </button>

                            {/* Test Diagnostic */}
                            <button
                              onClick={() => handleTestStream(c.camera_id)}
                              disabled={testingCamId === c.camera_id}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition-colors"
                              title="Ping stream health"
                            >
                              {testingCamId === c.camera_id ? 'Pinging...' : 'Test Feed'}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteCamera(c.camera_id, c.name)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete station"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Add Station Form */}
            {activeTab === 'ADD' && (
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <form onSubmit={handleCreateCamera} className="max-w-2xl mx-auto space-y-4 text-xs font-sans">
                  {formSuccess && (
                    <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>{formSuccess}</span>
                    </div>
                  )}
                  {formError && (
                    <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-mono text-slate-400 block">Station Name *</label>
                      <input
                        type="text"
                        value={newCam.name}
                        onChange={(e) => setNewCam({ ...newCam, name: e.target.value })}
                        placeholder="e.g. Dodoma Airport Apron Cam 01"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-slate-400 block">Camera Type</label>
                      <select
                        value={newCam.camera_type}
                        onChange={(e) => setNewCam({ ...newCam, camera_type: e.target.value as CameraType })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none font-mono"
                      >
                        <option value="Traffic Camera">Traffic Camera</option>
                        <option value="Road Camera">Road Camera</option>
                        <option value="Highway Camera">Highway Camera</option>
                        <option value="Port Camera">Port Camera</option>
                        <option value="Airport Camera">Airport Camera</option>
                        <option value="Weather Camera">Weather Camera</option>
                        <option value="Public Space Camera">Public Space Camera</option>
                        <option value="Other Authorized Public Camera">Other Authorized Public Camera</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-slate-400 block">Region (Tanzania)</label>
                      <input
                        type="text"
                        value={newCam.region}
                        onChange={(e) => setNewCam({ ...newCam, region: e.target.value })}
                        placeholder="e.g. Dodoma"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-slate-400 block">City / Town</label>
                      <input
                        type="text"
                        value={newCam.city}
                        onChange={(e) => setNewCam({ ...newCam, city: e.target.value })}
                        placeholder="e.g. Dodoma City"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-slate-400 block">Latitude (°N/S) *</label>
                      <input
                        type="number"
                        step="any"
                        value={newCam.latitude}
                        onChange={(e) => setNewCam({ ...newCam, latitude: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-slate-400 block">Longitude (°E) *</label>
                      <input
                        type="number"
                        step="any"
                        value={newCam.longitude}
                        onChange={(e) => setNewCam({ ...newCam, longitude: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="font-mono text-slate-400 block">Stream URL (HLS / MP4 / MJPEG)</label>
                      <input
                        type="url"
                        value={newCam.stream_url}
                        onChange={(e) => setNewCam({ ...newCam, stream_url: e.target.value })}
                        placeholder="Leave blank for Live Snapshot or enter verified HLS/MP4 feed URL"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none font-mono text-[11px]"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="font-mono text-slate-400 block">Authorized Provider</label>
                      <input
                        type="text"
                        value={newCam.provider}
                        onChange={(e) => setNewCam({ ...newCam, provider: e.target.value })}
                        placeholder="e.g. TANROADS Intelligent Transport System"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="font-mono text-slate-400 block">Authorization Source Mandate</label>
                      <input
                        type="text"
                        value={newCam.authorization_source}
                        onChange={(e) => setNewCam({ ...newCam, authorization_source: e.target.value })}
                        placeholder="e.g. TANROADS Public ITS Portal §14.2 Road Safety Data Protocol"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold font-mono text-xs transition-colors shadow-lg"
                  >
                    Authorize & Deploy Station to Map
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Health Logs */}
            {activeTab === 'HEALTH_LOGS' && (
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="flex items-center justify-between mb-3 text-xs font-mono">
                  <span className="text-slate-400">Background Stream Health Checks</span>
                  <button onClick={loadLogs} className="flex items-center gap-1 text-amber-400 hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  {healthLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.status === 'LIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span className="font-bold text-slate-200">{log.camera_name}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{log.message}</p>
                      </div>
                      <span className="text-emerald-400 font-bold text-[11px] whitespace-nowrap">
                        {log.response_time_ms}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Audit Logs */}
            {activeTab === 'AUDIT_LOGS' && (
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="space-y-2 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                            {log.action}
                          </span>
                          <span className="text-slate-300 font-semibold">{log.user}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
