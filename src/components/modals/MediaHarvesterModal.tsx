import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Film,
  Download,
  Copy,
  Check,
  ExternalLink,
  Tag,
  Users,
  Building2,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import { HarvestedMediaDetails } from "../../types";

interface MediaHarvesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  postUrlOrCode: string | null;
  onIngested?: (code: string) => void;
}

export const MediaHarvesterModal: React.FC<MediaHarvesterModalProps> = ({
  isOpen,
  onClose,
  postUrlOrCode,
  onIngested,
}) => {
  const [data, setData] = useState<HarvestedMediaDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestSuccess, setIngestSuccess] = useState<boolean>(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !postUrlOrCode) {
      setData(null);
      setError(null);
      setActiveStreamUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setIngestSuccess(false);

    const isUrl = postUrlOrCode.startsWith("http://") || postUrlOrCode.startsWith("https://");
    const param = isUrl ? `url=${encodeURIComponent(postUrlOrCode)}` : `code=${encodeURIComponent(postUrlOrCode)}`;

    fetch(`/api/media/harvest?${param}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to harvest media details`);
        return res.json();
      })
      .then((details: HarvestedMediaDetails) => {
        if (isMounted) {
          setData(details);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, postUrlOrCode]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleIngestNow = async () => {
    if (!data) return;
    setIngesting(true);
    try {
      const res = await fetch("/api/ingestion/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              code: data.code,
              rawCode: data.rawCode,
              title: data.title,
              postUrl: data.postUrl,
              coverImage: data.coverImage,
              duration: data.duration,
              releaseDate: data.releaseDate,
              actress: data.actressName,
              actressSlug: data.actressSlug,
              studio: data.studioName,
              studioSlug: data.studioSlug,
            },
          ],
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to ingest item");
      }

      setIngestSuccess(true);
      setData((prev) => (prev ? { ...prev, inDatabase: true } : prev));
      if (onIngested && data.code) {
        onIngested(data.code);
      }
    } catch (err: unknown) {
      alert(`Ingestion failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div
      id="media-harvester-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="media-harvester-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#101728] rounded-xl shadow-2xl border border-neutral-200 dark:border-[#1e293b] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-[#1e293b] bg-neutral-50/80 dark:bg-[#0b101a]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-slate-900 tracking-wider">
                  {data?.code || postUrlOrCode || "INSPECTION"}
                </span>
                <span className="text-xs font-medium text-neutral-500 dark:text-slate-400">
                  Deep Video Harvester
                </span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-lg mt-0.5">
                {data?.title || "Harvesting Live Metadata & Media Streams..."}
              </h3>
            </div>
          </div>
          <button
            id="media-harvester-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 dark:text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-800 dark:text-slate-200" />
              <p className="text-sm font-medium">
                Parsing watch page, stream manifest, and download endpoints...
              </p>
              <p className="text-xs text-neutral-400 dark:text-slate-500 font-mono max-w-md text-center truncate">
                {postUrlOrCode}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="text-sm font-semibold">Failed to harvest media details</p>
                <p className="text-xs mt-1 text-red-600">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Media & Overview */}
              <div className="md:col-span-5 space-y-4">
                {/* Poster / Preview */}
                <div className="relative aspect-16/10 rounded-lg overflow-hidden bg-neutral-900 dark:bg-white border border-neutral-200 dark:border-[#1e293b] group">
                  {data.coverImage ? (
                    <img
                      src={data.coverImage}
                      alt={data.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-neutral-500 dark:text-slate-400">
                      <Film className="w-12 h-12" />
                    </div>
                  )}

                  {/* Top Bar Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    {data.duration && (
                      <span className="px-2 py-0.5 rounded bg-black/80 text-white text-xs font-mono font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {data.duration}
                      </span>
                    )}
                  </div>

                  {data.previewVideoUrl && (
                    <div className="absolute bottom-2 right-2">
                      <a
                        href={data.previewVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-md transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Preview Clip
                      </a>
                    </div>
                  )}
                </div>

                {/* Video Info List */}
                <div className="p-3.5 bg-neutral-50 dark:bg-[#0b101a] rounded-lg border border-neutral-200 dark:border-[#1e293b] space-y-2 text-xs">
                  {data.actressName && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Actress:
                      </span>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {data.actressName}
                      </span>
                    </div>
                  )}

                  {data.studioName && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        Studio:
                      </span>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {data.studioName}
                      </span>
                    </div>
                  )}

                  {data.releaseDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Release Date:
                      </span>
                      <span className="font-mono text-neutral-700 dark:text-slate-300">
                        {data.releaseDate}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-[#1e293b]">
                    <span className="text-neutral-500 dark:text-slate-400">Source:</span>
                    <a
                      href={data.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                    >
                      Javtiful Watch Page
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Database Ingestion Status */}
                <div
                  className={`p-3.5 rounded-lg border flex flex-col gap-2.5 ${
                    data.inDatabase
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : "bg-amber-50/70 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {data.inDatabase ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Database className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-xs font-semibold">
                        {data.inDatabase
                          ? "Cataloged in Database"
                          : "Not Ingested in Database"}
                      </span>
                    </div>
                    {data.inDatabase && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Synced
                      </span>
                    )}
                  </div>

                  {!data.inDatabase && (
                    <div>
                      <p className="text-xs text-amber-700 mb-2.5">
                        This release has not yet been committed to your GitHub database index.
                      </p>
                      <button
                        id="media-harvester-ingest-btn"
                        onClick={handleIngestNow}
                        disabled={ingesting}
                        className="w-full py-1.5 px-3 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                      >
                        {ingesting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Ingesting Transaction...
                          </>
                        ) : ingestSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Committed to Database!
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            1-Click Ingest to Database
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Streams, Downloads, Tags */}
              <div className="md:col-span-7 space-y-5">
                {/* Direct Video Streams & Download Options */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-neutral-700 dark:text-slate-300" />
                      Direct Streaming & Media Sources
                    </h4>
                    <span className="text-xs text-neutral-400 dark:text-slate-500 font-mono">
                      {data.playerSources.length} stream source(s)
                    </span>
                  </div>

                  {data.playerSources.length === 0 ? (
                    <div className="p-4 rounded-lg bg-neutral-50 dark:bg-[#0b101a] border border-dashed border-neutral-200 dark:border-[#1e293b] text-center text-xs text-neutral-500 dark:text-slate-400">
                      No direct MP4 streams available for this post.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeStreamUrl && (
                        <div className="rounded-lg overflow-hidden bg-black aspect-16/9 border border-neutral-200 dark:border-[#1e293b]">
                          <video
                            src={activeStreamUrl}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        {data.playerSources.map((source, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              activeStreamUrl === source.url
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728] hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54]"
                            }`}
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 font-mono text-xs font-semibold">
                                  {source.label || `${source.quality}p`}
                                </span>
                                <span className="text-xs text-neutral-500 dark:text-slate-400 font-medium">
                                  {source.format}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 dark:text-slate-500 font-mono truncate max-w-xs mt-1">
                                {source.url}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                id={`copy-stream-btn-${idx}`}
                                onClick={() => handleCopy(source.url, `stream-${idx}`)}
                                className="p-1.5 rounded bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                                title="Copy direct stream link"
                              >
                                {copiedUrl === `stream-${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span className="text-[11px]">Copy</span>
                              </button>

                              <button
                                onClick={() => setActiveStreamUrl(source.url)}
                                className={`p-1.5 px-2.5 rounded text-white text-xs font-medium flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
                                  activeStreamUrl === source.url
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:bg-slate-200"
                                }`}
                              >
                                <Play className="w-3 h-3" />
                                <span className="text-[11px]">
                                  {activeStreamUrl === source.url ? "Playing" : "Play Stream"}
                                </span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Video Clip Player (if available) */}
                {data.previewVideoUrl && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-neutral-700 dark:text-slate-300" />
                      Embedded Video Clip Preview
                    </h4>
                    <div className="rounded-lg overflow-hidden bg-black aspect-16/9 border border-neutral-200 dark:border-[#1e293b]">
                      <video
                        src={data.previewVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Tags & Genres */}
                {data.tags && data.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-neutral-700 dark:text-slate-300" />
                      Categories & Tags
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {data.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs font-medium transition-colors"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-[#1e293b] bg-neutral-50/50 dark:bg-[#0b101a]/50">
          <span className="text-xs text-neutral-400 dark:text-slate-500 font-mono">
            {data?.harvestedAt ? `Harvested at ${new Date(data.harvestedAt).toLocaleTimeString()}` : "Avdb Engine"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 dark:text-slate-300 bg-white dark:bg-[#101728] border border-neutral-300 dark:border-[#2b3a54] rounded-md hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] active:bg-neutral-100 dark:bg-slate-800 shadow-2xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
