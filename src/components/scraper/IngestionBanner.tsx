import React from "react";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

export interface IngestionBannerData {
  type: "success" | "info" | "error";
  message: string;
  details?: string;
}

interface IngestionBannerProps {
  banner: IngestionBannerData | null;
  onDismiss: () => void;
}

export const IngestionBanner: React.FC<IngestionBannerProps> = ({
  banner,
  onDismiss,
}) => {
  if (!banner) return null;

  return (
    <div
      id="scraper-ingestion-banner"
      className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm ${
        banner.type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : banner.type === "error"
          ? "bg-red-50 border-red-200 text-red-900"
          : "bg-blue-50 border-blue-200 text-blue-900"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {banner.type === "success" && (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        )}
        {banner.type === "error" && (
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        )}
        {banner.type === "info" && (
          <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        )}
        <div>
          <p className="font-semibold">{banner.message}</p>
          {banner.details && (
            <p className="text-xs opacity-80 mt-0.5 font-mono">
              {banner.details}
            </p>
          )}
        </div>
      </div>
      <button
        id="btn-dismiss-banner"
        onClick={onDismiss}
        className="text-neutral-400 hover:text-neutral-700 p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
