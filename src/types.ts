export type CameraType =
  | 'Traffic Camera'
  | 'Road Camera'
  | 'Port Camera'
  | 'Airport Camera'
  | 'Weather Camera'
  | 'Public Space Camera'
  | 'Highway Camera'
  | 'Other Authorized Public Camera';

export type CameraStatus = 'LIVE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';

export type CoverageType =
  | 'LIVE CAMERA'
  | 'STREET VIEW'
  | 'STATIC/ARCHIVED IMAGE'
  | 'OFFLINE';

export type StreamFormat = 'HLS' | 'MJPEG' | 'WebRTC' | 'IMAGE_REFRESH' | 'STREET_VIEW';

export interface HealthStats {
  last_successful_connection: string;
  last_failure: string | null;
  response_time_ms: number;
  uptime_percentage: number;
}

export interface Camera {
  camera_id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  camera_type: CameraType;
  provider: string;
  stream_url: string;
  thumbnail_url: string;
  status: CameraStatus;
  last_updated: string;
  is_live: boolean;
  authorization_source: string;
  coverage_type: CoverageType;
  stream_format: StreamFormat;
  street_view_heading?: number;
  street_view_pitch?: number;
  health_stats: HealthStats;
}

export interface CameraSource {
  source_id: string;
  source_name: string;
  organization: string;
  API_endpoint: string;
  documentation_url: string;
  authorization_status: string;
  update_frequency: string;
  supported_stream_format: string;
  total_registered_cameras: number;
  verified_legal_basis: string;
  last_sync: string;
}

export interface DashboardStats {
  total_cameras: number;
  live_cameras: number;
  offline_cameras: number;
  regions_covered: number;
  last_system_update: string;
  health_index_pct: number;
}

export interface HealthLog {
  id: string;
  camera_id: string;
  camera_name: string;
  timestamp: string;
  status: CameraStatus;
  response_time_ms: number;
  message: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}
