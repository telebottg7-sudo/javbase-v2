import React from "react";
import {
  Home,
  Search,
  Cloud,
  Users,
  Building2,
  Code,
  Film,
  Wrench,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
} from "lucide-react";
import { NavView, BackendStatus } from "../../types";

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  status: BackendStatus | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavView;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItemConfig[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "bulk-scraper", label: "Bulk Scraper", icon: Cloud },
  { id: "actress", label: "Actress", icon: Users },
  { id: "studio", label: "Studio", icon: Building2 },
  { id: "code", label: "Code", icon: Code },
  { id: "videos", label: "Videos", icon: Film },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "system-tests", label: "System Tests", icon: FileCheck2 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#0b101d] border-r border-[#1e293b] flex flex-col shrink-0 h-full transition-all duration-200 ease-in-out ${
          isCollapsed ? "md:w-16" : "md:w-60"
        } ${
          mobileOpen
            ? "translate-x-0 w-60 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-[#1e293b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            {(!isCollapsed || mobileOpen) && (
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-white text-lg tracking-tight">
                  Jav<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">base</span>
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-400 border border-slate-700/60">
                  v2.0
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2338] transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2338]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                title={isCollapsed && !mobileOpen ? item.label : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  if (mobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 text-left ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2e]"
                } ${isCollapsed && !mobileOpen ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                {(!isCollapsed || mobileOpen) && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Online Status Widget Footer */}
        <div className="p-3 border-t border-[#1e293b] bg-[#090d16]/80 shrink-0">
          {(!isCollapsed || mobileOpen) ? (
            <div className="p-3 rounded-xl border border-[#1f293d] bg-[#101728] text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-white">System Online</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">All services running</p>
            </div>
          ) : (
            <div
              title="System Online: All services running"
              className="flex justify-center p-2 rounded-xl hover:bg-[#131b2e] cursor-pointer"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
