import React, { useState } from "react";
import { NavView, NavParams, BackendStatus } from "../../types";
import { useTheme } from "../../context/ThemeContext";
import {
  Search,
  Sun,
  Moon,
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
  const { theme, toggleTheme } = useTheme();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim() && onNavigate) {
      onNavigate("search", { query: globalSearch.trim() });
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-[#101728] dark:bg-[#0b101d] border-b border-slate-200 dark:border-[#1e293b] px-4 sm:px-6 flex items-center justify-between shrink-0 gap-4 z-20 transition-colors duration-200">
      <div className="flex items-center gap-3 flex-1 max-w-2xl min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2338] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar width"
          className="hidden md:flex p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2338] transition-colors"
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
            className="w-full bg-slate-100 dark:bg-[#131b2e] border border-slate-200 dark:border-[#1f293d] hover:border-indigo-500/40 focus:border-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs sm:text-sm pl-10 pr-12 py-2 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-[#1e293d]/80 px-1.5 py-0.5 rounded border border-slate-300 dark:border-[#2d3b55]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle light/dark theme"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2338] transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
};
