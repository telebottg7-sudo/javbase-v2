import React from "react";
import {
  Film,
  User,
  Building,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Play,
  RefreshCw,
} from "lucide-react";
import { JavtifulVideoItem } from "../../types";

interface ScraperVideoCardProps {
  item: JavtifulVideoItem;
  onInspect: (item: JavtifulVideoItem) => void;
  onIngest: (item: JavtifulVideoItem) => void;
  isIngesting?: boolean;
  isRegistering?: boolean;
}

export const ScraperVideoCard: React.FC<ScraperVideoCardProps> = ({
  item,
  onInspect,
  onIngest,
  isIngesting = false,
}) => {
  return (
    <div
      id={`scraper-card-${item.code || item.title.slice(0, 10)}`}
      className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl overflow-hidden hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54] transition-all flex flex-col group shadow-xs"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-neutral-900 dark:bg-white overflow-hidden">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 dark:text-slate-400 gap-1.5">
            <Film className="w-8 h-8 opacity-40" />
            <span className="text-[11px] font-mono">No Preview</span>
          </div>
        )}

        {/* Duration badge */}
        {item.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 backdrop-blur-xs rounded text-[10px] font-mono text-white flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>{item.duration}</span>
          </div>
        )}

        {/* Duplicate badge */}
        {item.isDuplicate && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600/90 text-white rounded text-[10px] font-medium flex items-center gap-1 shadow-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>In Registry</span>
          </div>
        )}
      </div>

      {/* Body details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Code pill & release date */}
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-[#1e293b] rounded font-mono text-xs font-semibold">
              {item.code || "NO-CODE"}
            </span>
            {item.releaseDate && (
              <span className="text-[11px] text-neutral-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{item.releaseDate}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4
            className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-relaxed"
            title={item.title}
          >
            {item.title}
          </h4>

          {/* Actress & Studio tags */}
          <div className="space-y-1 pt-1 text-[11px] text-neutral-600 dark:text-slate-400">
            {item.actress && (
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3 h-3 text-neutral-400 dark:text-slate-500 shrink-0" />
                <span className="truncate font-medium">{item.actress}</span>
              </div>
            )}
            {item.studio && (
              <div className="flex items-center gap-1.5 truncate">
                <Building className="w-3 h-3 text-neutral-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{item.studio}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
          <button
            id={`btn-inspect-${item.code || "item"}`}
            onClick={() => onInspect(item)}
            className="flex-1 py-1.5 px-2 bg-neutral-50 dark:bg-[#0b101a] hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-300 text-xs font-medium rounded-lg border border-neutral-200 dark:border-[#1e293b] transition-colors flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400" />
            <span>Inspect</span>
          </button>

          {item.postUrl && (
            <a
              href={item.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-[#1e293b] rounded-lg hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] transition-colors"
              title="Open Source Link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            id={`btn-ingest-${item.code || "item"}`}
            disabled={item.isDuplicate || isIngesting}
            onClick={() => onIngest(item)}
            className={`py-1.5 px-2.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
              item.isDuplicate
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 cursor-default"
                : "bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-xs"
            }`}
          >
            {isIngesting ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Ingesting...</span>
              </>
            ) : item.isDuplicate ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Ingested</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>+ Ingest</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
