import React, { useState, useEffect } from "react";
import { NavView, NavParams, BackendStatus } from "./types";
import { ThemeProvider } from "./context/ThemeContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { HomeView } from "./components/views/HomeView";
import { SearchView } from "./components/views/SearchView";
import { BulkScraperView } from "./components/views/BulkScraperView";
import { ActressView } from "./components/views/ActressView";
import { StudioView } from "./components/views/StudioView";
import { CodeView } from "./components/views/CodeView";
import { VideosView } from "./components/views/VideosView";
import { MaintenanceView } from "./components/views/MaintenanceView";
import { SystemTestsView } from "./components/views/SystemTestsView";

function MainApp() {
  const [currentView, setCurrentView] = useState<NavView>("home");
  const [bulkParams, setBulkParams] = useState<NavParams | null>(null);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const handleNavigate = (view: NavView, params?: NavParams) => {
    if (view === "bulk-scraper" && params) {
      setBulkParams(params);
    }
    setCurrentView(view);
  };

  useEffect(() => {
    fetch("/api/config/status")
      .then((res) => res.json())
      .then((data: BackendStatus) => {
        setStatus(data);
      })
      .catch((err) => {
        console.error("Failed to fetch backend status:", err);
      });
  }, []);

  const renderView = () => {
    switch (currentView) {
      case "home":
        return <HomeView status={status} onNavigate={handleNavigate} />;
      case "search":
        return <SearchView onNavigate={handleNavigate} />;
      case "bulk-scraper":
        return <BulkScraperView onNavigate={handleNavigate} initialParams={bulkParams} />;
      case "actress":
        return <ActressView onNavigate={handleNavigate} />;
      case "studio":
        return <StudioView onNavigate={handleNavigate} />;
      case "code":
        return <CodeView onNavigate={handleNavigate} />;
      case "videos":
        return <VideosView onNavigate={handleNavigate} />;
      case "maintenance":
        return <MaintenanceView />;
      case "system-tests":
        return <SystemTestsView />;
      default:
        return <HomeView status={status} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Collapsible & Mobile Responsive Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        status={status}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-[#090d16] transition-colors duration-200">
        <Header
          currentView={currentView}
          status={status}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onNavigate={handleNavigate}
        />
        <main className="flex-1 overflow-y-auto min-w-0 custom-scrollbar">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
