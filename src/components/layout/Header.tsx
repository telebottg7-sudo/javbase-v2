import React, { useState } from "react";
import { NavView, NavParams, BackendStatus } from "../../types";
import {
  Search,
  Sun,
  Bell,
  ChevronDown,
  Menu,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";

interface HeaderProps {
  currentView: NavView;
  status: BackendStatus | null;
  onOpenMobileSidebar: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: (view: NavView, params?: NavParams) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
}) => {
  const [globalSearch, setGlobalSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim() && onNavigate) {
      onNavigate("search", { query: globalSearch.trim() });
    }
  };

  return (
    <header className="h-16 bg-[#0b101d] border-b border-[#1e293b] px-4 sm:px-6 flex items-center justify-between shrink-0 gap-4 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-2xl min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2338] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar width"
          className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2338] transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Global Header Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search by code, title, actress, studio..."
            className="w-full bg-[#131b2e] border border-[#1f293d] hover:border-indigo-500/40 focus:border-indigo-500 text-slate-200 placeholder-slate-400 text-xs sm:text-sm pl-10 pr-12 py-2 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono font-medium text-slate-400 bg-[#1e293d]/80 px-1.5 py-0.5 rounded border border-[#2d3b55]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Theme Toggle Button */}
        <button
          title="Toggle light/dark theme"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2338] transition-colors"
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Notifications Icon */}
        <button
          title="Notifications"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2338] transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#0b101d]" />
        </button>

        {/* User Profile Avatar Pill */}
        <div className="flex items-center gap-1.5 pl-1 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/30">
            A
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
};
