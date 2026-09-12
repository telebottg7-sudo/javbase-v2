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
      className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-300 transition-all flex flex-col group shadow-xs"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-neutral-900 overflow-hidden">
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
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 gap-1.5">
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
            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-900 border border-neutral-200 rounded font-mono text-xs font-semibold">
              {item.code || "NO-CODE"}
            </span>
            {item.releaseDate && (
              <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{item.releaseDate}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4
            className="text-xs font-semibold text-neutral-900 line-clamp-2 leading-relaxed"
            title={item.title}
          >
            {item.title}
          </h4>

          {/* Actress & Studio tags */}
          <div className="space-y-1 pt-1 text-[11px] text-neutral-600">
            {item.actress && (
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="truncate font-medium">{item.actress}</span>
              </div>
            )}
            {item.studio && (
              <div className="flex items-center gap-1.5 truncate">
                <Building className="w-3 h-3 text-neutral-400 shrink-0" />
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
            className="flex-1 py-1.5 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-medium rounded-lg border border-neutral-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
            <span>Inspect</span>
          </button>

          {item.postUrl && (
            <a
              href={item.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-400 hover:text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
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
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                : "bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs"
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
