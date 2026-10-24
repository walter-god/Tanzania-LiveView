import React, { useEffect, useState } from 'react';
import { ShieldCheck, ExternalLink, X, CheckCircle, Lock, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { CameraSource } from '../types';
import { api } from '../services/api';

interface SourcesRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourcesRegistryModal: React.FC<SourcesRegistryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sources, setSources] = useState<CameraSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSources = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getSources();
        setSources(data.sources);
      } catch (err: any) {
        setError(err.message || 'Failed to load camera sources');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSources();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="sources-registry-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        id="sources-registry-modal"
        className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-950 border border-sky-800 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                Authorized Public Camera Sources Registry
              </h2>
              <p className="text-xs text-slate-400">
                Official Government, Municipal, Transportation & Infrastructure Telemetry Registry
              </p>
            </div>
          </div>

          <button
            id="btn-close-sources"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Integrity & Privacy Compliance Banner */}
        <div className="px-6 py-3 bg-emerald-950/40 border-b border-emerald-900/60 flex items-start gap-3 text-xs text-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-emerald-300">
              Public Safety & Privacy Compliance Guarantee
            </p>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Tanzania LiveView operates under strict authorization standards. No private CCTV systems, residential cameras, or unauthorized networks are accessed or scanned. In compliance with data privacy mandates, no facial recognition or individual vehicle tracking is permitted or implemented.
            </p>
          </div>
        </div>

        {/* Modal Body / Registry Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-400" />
              <p className="text-xs font-mono">Synchronizing registered public providers...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((src) => (
                <div
                  key={src.source_id}
                  id={`source-card-${src.source_id}`}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold text-slate-100 font-mono">
                        {src.source_name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800 whitespace-nowrap">
                        {src.total_registered_cameras} Cams
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium mb-2">
                      {src.organization}
                    </p>

                    <div className="space-y-1.5 text-[11px] font-mono mb-3">
                      <div>
                        <span className="text-slate-500 block text-[10px]">API ENDPOINT:</span>
                        <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] break-all">
                          {src.API_endpoint}
                        </code>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">LEGAL BASIS:</span>
                        <span className="text-slate-300">{src.verified_legal_basis}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Rate: <strong className="text-slate-200">{src.update_frequency}</strong></span>
                        <span>Formats: <strong className="text-slate-200">{src.supported_stream_format}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {src.authorization_status.split('-')[0]}
                    </span>

                    <a
                      href={src.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <span>Public Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Tanzania National Infrastructure Open Standards</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close Registry
          </button>
        </div>
      </div>
    </div>
  );
};
