import React, { useState } from "react";
import { Play, Loader2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Bug } from "lucide-react";
import { 
  Step8TestReport, 
  Step11TestReport, 
  JavtifulTestSuiteReport, 
  Step6TestReport 
} from "../../types";

export const SystemTestsView: React.FC = () => {
  // Step 6: Database Ingestion & Sharding Test Suite
  const [ingestionTestRunning, setIngestionTestRunning] = useState<boolean>(false);
  const [ingestionTestReport, setIngestionTestReport] = useState<any>(null);

  // Step 7: Bulk Scraper Pipeline Test Suite
  const [step7TestRunning, setStep7TestRunning] = useState<boolean>(false);
  const [step7TestReport, setStep7TestReport] = useState<any>(null);

  // Step 8: Media Stream & Search Test Suite
  const [step8TestRunning, setStep8TestRunning] = useState<boolean>(false);
  const [step8TestReport, setStep8TestReport] = useState<Step8TestReport | null>(null);

  // Step 11: Maintenance & Healing Test Suite
  const [step11TestRunning, setStep11TestRunning] = useState<boolean>(false);
  const [step11TestReport, setStep11TestReport] = useState<Step11TestReport | null>(null);

  const runIngestionTestSuite = async () => {
    setIngestionTestRunning(true);
    setIngestionTestReport(null);
    try {
      const res = await fetch("/api/ingestion/step6-test-suite", { method: "POST" });
      const data = await res.json();
      setIngestionTestReport(data);
    } catch (err) {
      console.error("Step 6 test suite failed:", err);
    } finally {
      setIngestionTestRunning(false);
    }
  };

  const runStep7TestSuite = async () => {
    setStep7TestRunning(true);
    setStep7TestReport(null);
    try {
      const res = await fetch("/api/scraper/step7-test-suite", { method: "POST" });
      const data = await res.json();
      setStep7TestReport(data);
    } catch (err) {
      console.error("Step 7 test suite failed:", err);
    } finally {
      setStep7TestRunning(false);
    }
  };

  const runStep8TestSuite = async () => {
    setStep8TestRunning(true);
    setStep8TestReport(null);
    try {
      const res = await fetch("/api/search/step8-test-suite", { method: "POST" });
      const data = await res.json();
      setStep8TestReport(data);
    } catch (err) {
      console.error("Failed to run Step 8 test suite:", err);
    } finally {
      setStep8TestRunning(false);
    }
  };

  const runStep11TestSuite = async () => {
    setStep11TestRunning(true);
    setStep11TestReport(null);
    try {
      const res = await fetch("/api/maintenance/step11-test-suite", { method: "POST" });
      const data = await res.json();
      setStep11TestReport(data);
    } catch (err) {
      console.error("Maintenance test suite failed:", err);
    } finally {
      setStep11TestRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <Bug className="w-6 h-6 text-neutral-500" />
          System Test Suites
        </h1>
      </div>

      <div className="space-y-6">
        
        {/* Ingestion Test Suite */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Database Ingestion & Sharding Suite
              </h2>
            </div>
            <button
              onClick={runIngestionTestSuite}
              disabled={ingestionTestRunning}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              {ingestionTestRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {ingestionTestRunning ? "Running..." : "Run Ingestion Suite"}
            </button>
          </div>
          {ingestionTestReport && (
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                {ingestionTestReport.success ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All Ingestion Tests Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Ingestion Tests Failed
                  </span>
                )}
                <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded-md">
                  {ingestionTestReport.durationMs}ms
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ingestionTestReport.steps?.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      step.status === "passed"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {step.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="truncate">{step.name}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 ml-2">
                      {step.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scraper Test Suite */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Bulk Scraper & Commit Pipeline Suite
              </h2>
            </div>
            <button
              onClick={runStep7TestSuite}
              disabled={step7TestRunning}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              {step7TestRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {step7TestRunning ? "Running..." : "Run Scraper Suite"}
            </button>
          </div>
          {step7TestReport && (
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                {step7TestReport.success ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All Scraper Tests Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Scraper Tests Failed
                  </span>
                )}
                <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded-md">
                  {step7TestReport.durationMs}ms
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {step7TestReport.steps?.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      step.status === "passed"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {step.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="truncate">{step.name}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 ml-2">
                      {step.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Test Suite */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Media Stream & Search Test Suite
              </h2>
            </div>
            <button
              onClick={runStep8TestSuite}
              disabled={step8TestRunning}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              {step8TestRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {step8TestRunning ? "Running..." : "Run Search Suite"}
            </button>
          </div>
          {step8TestReport && (
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                {step8TestReport.success ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All Search Tests Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Search Tests Failed
                  </span>
                )}
                <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded-md">
                  {step8TestReport.durationMs}ms
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {step8TestReport.steps?.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      step.status === "passed"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {step.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="truncate">{step.name}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 ml-2">
                      {step.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Maintenance Test Suite */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Maintenance & Self-Healing Suite
              </h2>
            </div>
            <button
              onClick={runStep11TestSuite}
              disabled={step11TestRunning}
              className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              {step11TestRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {step11TestRunning ? "Running..." : "Run Maintenance Suite"}
            </button>
          </div>
          {step11TestReport && (
            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                {step11TestReport.success ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All Maintenance Tests Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Maintenance Tests Failed
                  </span>
                )}
                <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded-md">
                  {step11TestReport.totalDurationMs}ms
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {step11TestReport.steps?.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      step.status === "passed"
                        ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {step.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="truncate">{step.name}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 ml-2">
                      {step.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
