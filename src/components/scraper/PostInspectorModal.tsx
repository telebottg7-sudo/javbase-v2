import React from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Play,
  Film,
  Calendar,
  Clock,
  User,
  Building,
  Layers,
} from "lucide-react";
import { JavtifulVideoItem } from "../../types";

interface PostInspectorModalProps {
  video: JavtifulVideoItem | null;
  inspectLoading: boolean;
  onClose: () => void;
  onIngest: (video: JavtifulVideoItem) => void;
  onRegisterInRegistry: (video: JavtifulVideoItem) => void;
  isIngesting?: boolean;
  isRegistering?: boolean;
}

export const PostInspectorModal: React.FC<PostInspectorModalProps> = ({
  video,
  inspectLoading,
  onClose,
  onIngest,
  onRegisterInRegistry,
  isIngesting = false,
  isRegistering = false,
}) => {
  if (!video) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div
        id="modal-post-inspector"
        className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-800" />
            <h3 className="font-semibold text-neutral-900 text-sm">
              Post Inspector: {video.code || "Video Details"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {inspectLoading && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-700" />
              <span>Fetching full metadata and streams from Javtiful...</span>
            </div>
          )}

          {/* Cover & Title */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-1/2 aspect-video bg-neutral-900 rounded-xl overflow-hidden relative shrink-0">
              {video.coverImage ? (
                <img
                  src={video.coverImage}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  <Film className="w-8 h-8 opacity-40" />
                </div>
              )}
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-neutral-900 text-white rounded font-mono text-xs font-semibold">
                  {video.code || "N/A"}
                </span>
                {video.isDuplicate ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>In Registry</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">
                    New Unregistered
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-neutral-900 text-sm leading-snug">
                {video.title}
              </h4>
              <div className="text-xs text-neutral-600 space-y-1 pt-1">
                {video.releaseDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Release: {video.releaseDate}</span>
                  </div>
                )}
                {video.duration && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Duration: {video.duration}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Entities info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <User className="w-3.5 h-3.5" />
                <span>Actress</span>
              </div>
              <p className="text-sm font-semibold text-neutral-900">
                {video.actress || "Unknown / Unspecified"}
              </p>
              {video.actressSlug && (
                <p className="text-[11px] font-mono text-neutral-500">
                  Slug: {video.actressSlug}
                </p>
              )}
            </div>

            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <Building className="w-3.5 h-3.5" />
                <span>Studio</span>
              </div>
              <p className="text-sm font-semibold text-neutral-900">
                {video.studio || "Unknown / Unspecified"}
              </p>
              {video.studioSlug && (
                <p className="text-[11px] font-mono text-neutral-500">
                  Slug: {video.studioSlug}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">Tags / Genres</span>
              <div className="flex flex-wrap gap-1.5">
                {video.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Streams */}
          {video.streams && video.streams.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-500">
                Detected Stream Sources ({video.streams.length})
              </span>
              <div className="space-y-1">
                {video.streams.map((stream, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-neutral-900 text-neutral-300 rounded-lg text-xs font-mono flex items-center justify-between gap-2 overflow-hidden"
                  >
                    <span className="truncate">{stream.src}</span>
                    <span className="px-1.5 py-0.5 bg-neutral-800 rounded text-[10px] text-neutral-400 shrink-0">
                      {stream.label || "stream"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-2">
          {video.postUrl && (
            <a
              href={video.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open on Javtiful</span>
            </a>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRegisterInRegistry(video)}
              disabled={isRegistering || video.isDuplicate}
              className="px-3 py-2 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isRegistering ? "Registering..." : "Register Code Only"}</span>
            </button>

            <button
              disabled={isIngesting || video.isDuplicate}
              onClick={() => onIngest(video)}
              className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                video.isDuplicate
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                  : "bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs"
              }`}
            >
              {isIngesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : video.isDuplicate ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ingested</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Ingest to Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
