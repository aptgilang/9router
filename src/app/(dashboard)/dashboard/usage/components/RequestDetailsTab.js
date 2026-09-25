"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

let providerNameCache = null;
let providerNodesCache = null;

async function fetchProviderNames() {
  if (providerNameCache && providerNodesCache) {
    return { providerNameCache, providerNodesCache };
  }

  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes = nodesData.nodes || [];
  providerNodesCache = {};

  for (const node of nodes) {
    providerNodesCache[node.id] = node.name;
  }

  providerNameCache = {
    ...AI_PROVIDERS,
    ...providerNodesCache
  };

  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId, cache) {
  if (!providerId) return providerId;
  if (!cache) return providerId;

  const cached = cache[providerId];
  if (typeof cached === "string") return cached;
  if (cached?.name) return cached.name;

  const providerConfig = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return providerConfig?.name || providerId;
}

function formatJsonValue(val) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

function renderHighlightedJsonLine(line) {
  if (typeof line !== "string") return line;

  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      elements.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    let cls = "text-amber-500 dark:text-amber-400";
    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        cls = "text-sky-600 dark:text-sky-400 font-semibold";
      } else {
        cls = "text-emerald-600 dark:text-emerald-400";
      }
    } else if (/true|false/.test(token)) {
      cls = "text-purple-600 dark:text-purple-400 font-semibold";
    } else if (/null/.test(token)) {
      cls = "text-rose-500 italic";
    } else if (/^[{}[\],:]$/.test(token)) {
      cls = "text-zinc-500";
    }
    elements.push(
      <span key={match.index} className={cls}>
        {token}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    elements.push(line.slice(lastIndex));
  }
  return elements.length > 0 ? elements : line;
}

function JsonPrettyViewer({ data, title = "JSON", maxHeight = "max-h-[380px]" }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("pretty");
  const [search, setSearch] = useState("");

  const formattedStr = useMemo(() => formatJsonValue(data), [data]);
  const rawStr = useMemo(() => {
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }, [data]);

  const activeStr = viewMode === "pretty" ? formattedStr : rawStr;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = useMemo(() => activeStr.split("\n"), [activeStr]);

  const filteredLines = useMemo(() => {
    if (!search.trim()) {
      return lines.map((line, idx) => ({ line, num: idx + 1 }));
    }
    const q = search.toLowerCase();
    return lines
      .map((line, idx) => ({ line, num: idx + 1 }))
      .filter((item) => item.line.toLowerCase().includes(q));
  }, [lines, search]);

  const byteSize = useMemo(() => {
    return (new TextEncoder().encode(activeStr).length / 1024).toFixed(1);
  }, [activeStr]);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-slate-950 dark:bg-black/90 overflow-hidden shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-900/90 dark:bg-zinc-900/90 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-text-muted px-2 py-0.5 rounded bg-white/5 border border-white/5">
            {lines.length} lines • {byteSize} KB
          </span>
          <div className="flex items-center rounded-md bg-white/5 p-0.5 border border-white/5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("pretty")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors font-medium cursor-pointer",
                viewMode === "pretty"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Prettier
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors font-medium cursor-pointer",
                viewMode === "raw"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Raw
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {lines.length > 5 && (
            <input
              type="text"
              placeholder="Search in JSON..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-6 w-28 sm:w-36 text-[11px] bg-black/40 border border-white/10 rounded px-2 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
            />
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
            title="Copy text"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className={cn("overflow-auto font-mono text-xs p-3 leading-relaxed", maxHeight)}>
        <table className="w-full border-collapse">
          <tbody>
            {filteredLines.map(({ line, num }) => (
              <tr key={num} className="hover:bg-white/[0.03]">
                <td className="w-10 pr-3 text-right select-none text-zinc-600 text-[11px] font-mono align-top">
                  {num}
                </td>
                <td className="text-zinc-200 whitespace-pre break-all pl-2 border-l border-white/5">
                  {renderHighlightedJsonLine(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, icon = null, badge = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-xs bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="material-symbols-outlined text-[18px] text-primary shrink-0">{icon}</span>}
          <span className="font-semibold text-sm text-text-main truncate">{title}</span>
          {badge}
        </div>
        <span
          className={cn(
            "material-symbols-outlined text-[20px] text-text-muted transition-transform duration-200 shrink-0 ml-2",
            isOpen ? "rotate-90" : ""
          )}
        >
          chevron_right
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-black/10 dark:border-white/10 bg-surface">
          {children}
        </div>
      )}
    </div>
  );
}

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerNames, setProviderNames] = useState({});
  const [filters, setFilters] = useState({
    provider: "",
    model: "",
    status: "",
    startDate: "",
    endDate: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });

  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeSectionFilter, setActiveSectionFilter] = useState("all");
  const [responseViewTab, setResponseViewTab] = useState("formatted");

  useEffect(() => {
    fetchProviderNames().then(({ providerNameCache }) => {
      setProviderNames(providerNameCache);
    });

    fetch("/api/usage/request-details/providers")
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) setProviders(data.providers);
      })
      .catch((err) => console.error("Failed to load providers:", err));
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        summary: "true"
      });

      if (filters.provider) params.append("provider", filters.provider);
      if (filters.model) params.append("model", filters.model);
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/usage/request-details?${params}`);
      const data = await res.json();

      if (data.details) {
        setDetails(data.details);
        setPagination((prev) => ({
          ...prev,
          totalItems: data.pagination.totalItems,
          totalPages: data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error("Failed to fetch request details:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Keyboard shortcut: ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      provider: "",
      model: "",
      status: "",
      startDate: "",
      endDate: ""
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }));
  };

  // Detail: lazy load full record by ID if not in cache
  const handleViewDetail = async (summaryItem) => {
    setIsModalOpen(true);
    setActiveSectionFilter("all");
    setResponseViewTab("formatted");

    if (detailCache[summaryItem.id]) {
      setSelectedDetail(detailCache[summaryItem.id]);
      return;
    }

    setSelectedDetail(summaryItem);
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/usage/request-details?id=${encodeURIComponent(summaryItem.id)}`);
      const data = await res.json();
      if (data.detail) {
        setSelectedDetail(data.detail);
        setDetailCache((prev) => ({ ...prev, [summaryItem.id]: data.detail }));
      }
    } catch (err) {
      console.error("Failed to load full detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyAll = () => {
    if (!selectedDetail) return;
    navigator.clipboard.writeText(JSON.stringify(selectedDetail, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!selectedDetail) return;
    const jsonStr = JSON.stringify(selectedDetail, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `request-detail-${selectedDetail.id || "export"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getInputTokens = (tokens) => {
    if (!tokens) return 0;
    return tokens.prompt_tokens || tokens.input_tokens || 0;
  };

  const getCachedTokens = (tokens) => {
    if (!tokens) return 0;
    return tokens.cached_tokens || tokens.cache_read_input_tokens || tokens.prompt_tokens_details?.cached_tokens || 0;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters Card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => handleFilterChange("provider", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {getProviderName(p, providerNameCache)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Model Search</label>
            <input
              type="text"
              value={filters.model}
              onChange={(e) => handleFilterChange("model", e.target.value)}
              placeholder="e.g. gemini, claude"
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-xs sm:text-sm text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3">
          <span className="text-xs text-text-muted">
            Total Records: <strong className="text-text-main font-mono">{pagination.totalItems.toLocaleString()}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs h-8">
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                <th className="text-left p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Timestamp</th>
                <th className="text-left p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Model</th>
                <th className="text-left p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Provider</th>
                <th className="text-right p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Input</th>
                <th className="text-right p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Output</th>
                <th className="text-left p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Latency</th>
                <th className="text-center p-3 sm:p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Loading transactions...
                    </div>
                  </td>
                </tr>
              ) : details.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-text-muted text-xs sm:text-sm">
                    No request details found
                  </td>
                </tr>
              ) : (
                details.map((detail, index) => (
                  <tr
                    key={`${detail.id}-${index}`}
                    className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="whitespace-nowrap p-3 sm:p-4 text-xs text-text-main font-mono">
                      {new Date(detail.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      <span className="text-[10px] text-text-muted block font-sans">
                        {new Date(detail.timestamp).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="max-w-[200px] sm:max-w-[260px] truncate p-3 sm:p-4 font-mono text-xs text-text-main">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{detail.model}</span>
                        {detail.hasTools && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-sans shrink-0 font-medium">
                            Tool
                          </span>
                        )}
                        {detail.hasThinking && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-sans shrink-0 font-medium">
                            Think
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[140px] sm:max-w-[180px] truncate p-3 sm:p-4 text-xs text-text-main">
                      <span className="font-medium truncate block">
                        {getProviderName(detail.provider, providerNameCache)}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-xs text-text-main text-right font-mono">
                      {getInputTokens(detail.tokens).toLocaleString()}
                      {getCachedTokens(detail.tokens) > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                          ↻{getCachedTokens(detail.tokens).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-xs text-text-main text-right font-mono">
                      {detail.tokens?.completion_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="p-3 sm:p-4 text-xs text-text-muted">
                      <div className="flex flex-col font-mono text-[11px]">
                        <div>Total: {detail.latency?.total || 0}ms</div>
                        <div className="text-[10px] text-text-muted/80">TTFT: {detail.latency?.ttft || 0}ms</div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(detail)}
                        className="cursor-pointer text-xs h-7 px-3 gap-1 hover:border-primary"
                        title="View complete transaction detail"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>Detail</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && details.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>

      {/* FULLSCREEN RESPONSIVE MODAL DIALOG */}
      {isModalOpen && selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-5 bg-black/70 backdrop-blur-md transition-all">
          <div
            className="fixed inset-0"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div
            className={cn(
              "relative flex flex-col bg-surface z-10 overflow-hidden shadow-2xl transition-all duration-300",
              isFullscreen
                ? "w-full h-full rounded-none"
                : "w-full h-full sm:h-[94vh] sm:max-h-[960px] sm:max-w-6xl xl:max-w-7xl sm:rounded-2xl border border-black/10 dark:border-white/10"
            )}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-border-subtle bg-muted/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-text-main truncate">
                      {selectedDetail.model}
                    </h2>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        selectedDetail.status === "success"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          selectedDetail.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                        )}
                      />
                      {selectedDetail.status || "OK"}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate font-mono">
                    ID: {selectedDetail.id} • {new Date(selectedDetail.timestamp).toLocaleString()}
                    {selectedDetail.connectionId && (
                      <span className="ml-2 text-text-muted/80">• Account: {selectedDetail.connectionId.slice(0, 16)}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJson}
                  className="h-8 text-xs gap-1.5 cursor-pointer hidden sm:flex"
                  title="Download complete transaction as JSON"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Download JSON</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  className="h-8 text-xs gap-1.5 cursor-pointer hidden sm:flex"
                  title="Copy full payload object to clipboard"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedAll ? "check" : "content_copy"}
                  </span>
                  <span>{copiedAll ? "Copied" : "Copy Payload"}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0 cursor-pointer text-text-muted hover:text-text-main hidden sm:flex items-center justify-center rounded-lg"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </Button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-5">
              {/* Section Jump Nav */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs">
                  <span className="text-text-muted text-[11px] mr-1 hidden sm:inline">Jump to:</span>
                  {[
                    { id: "all", label: "All Sections" },
                    { id: "1-request", label: "1. Client Request" },
                    { id: "2-providerRequest", label: "2. Provider Request" },
                    { id: "3-providerResponse", label: "3. Raw Response" },
                    { id: "4-response", label: "4. Final Output" }
                  ].map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setActiveSectionFilter(sec.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                        activeSectionFilter === sec.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-main border border-border-subtle"
                      )}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                {loadingDetail && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium px-2 py-0.5">
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    <span>Loading payload...</span>
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-border-subtle bg-surface shadow-xs">
                  <span className="text-[11px] text-text-muted block mb-0.5">Provider</span>
                  <div className="text-xs sm:text-sm font-semibold text-text-main truncate">
                    {getProviderName(selectedDetail.provider, providerNameCache)}
                  </div>
                  {selectedDetail.metadata?.targetFormat && (
                    <span className="text-[10px] text-text-muted block mt-0.5 font-mono truncate">
                      Format: {selectedDetail.metadata.targetFormat}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl border border-border-subtle bg-surface shadow-xs">
                  <span className="text-[11px] text-text-muted block mb-0.5">Latency (TTFT / Total)</span>
                  <div className="text-xs sm:text-sm font-mono font-semibold text-text-main">
                    {selectedDetail.latency?.total || 0}ms
                    <span className="text-[10px] text-text-muted font-normal block">
                      TTFT: {selectedDetail.latency?.ttft || 0}ms
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border-subtle bg-surface shadow-xs">
                  <span className="text-[11px] text-text-muted block mb-0.5">Tokens (In / Out)</span>
                  <div className="text-xs sm:text-sm font-mono font-semibold text-text-main">
                    {getInputTokens(selectedDetail.tokens).toLocaleString()} / {selectedDetail.tokens?.completion_tokens?.toLocaleString() || 0}
                    {getCachedTokens(selectedDetail.tokens) > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal block">
                        ↻ Cached: {getCachedTokens(selectedDetail.tokens).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border-subtle bg-surface shadow-xs">
                  <span className="text-[11px] text-text-muted block mb-0.5">Stream Mode</span>
                  <div className="text-xs sm:text-sm font-semibold text-text-main font-mono">
                    {selectedDetail.response?.type === "streaming" || selectedDetail.request?.stream
                      ? "SSE Streaming"
                      : "Standard JSON"}
                  </div>
                  {selectedDetail.response?.choices?.[0]?.finish_reason && (
                    <span className="text-[10px] text-text-muted block mt-0.5 font-mono">
                      Finish: {selectedDetail.response.choices[0].finish_reason}
                    </span>
                  )}
                </div>
              </div>

              {/* PXPIPE Image Optimization */}
              {selectedDetail.pxpipe && (
                <div className="rounded-xl border border-border-subtle bg-surface p-3.5 shadow-xs">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-text-main">
                    <span className="material-symbols-outlined text-[16px] text-primary">image</span>
                    <span>PXPIPE Token Saver</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-bold",
                        selectedDetail.pxpipe.applied
                          ? "bg-green-500/15 text-green-600"
                          : "bg-amber-500/15 text-amber-600"
                      )}
                    >
                      {selectedDetail.pxpipe.applied ? "ACTIVATED" : "SKIPPED"}
                    </span>
                  </div>
                  {selectedDetail.pxpipe.applied ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-text-muted block text-[10px]">Tokens Before</span>
                        <span>{(selectedDetail.pxpipe.tokensBeforeEst || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Tokens After</span>
                        <span>{(selectedDetail.pxpipe.tokensAfterEst || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Savings</span>
                        <span className="text-emerald-600 font-bold">{selectedDetail.pxpipe.savedPct || 0}%</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Images Compressed</span>
                        <span>{selectedDetail.pxpipe.imageCount || 0}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted font-mono">{selectedDetail.pxpipe.reason}</p>
                  )}
                </div>
              )}

              {/* Main Content Sections */}
              <div className="space-y-4">
                {/* Section 1: Client Request */}
                {(activeSectionFilter === "all" || activeSectionFilter === "1-request") && (
                  <CollapsibleSection
                    title="1. Client Request (Input)"
                    defaultOpen={true}
                    icon="input"
                    badge={
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          {selectedDetail.metadata?.endpoint || selectedDetail.endpoint || (selectedDetail.request?.stream ? "POST /v1/chat/completions (stream)" : "POST /v1/chat/completions")}
                        </span>
                        {selectedDetail.request?.messages?.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-text-muted">
                            {selectedDetail.request.messages.length} msgs
                          </span>
                        )}
                        {selectedDetail.request?.tools?.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            {selectedDetail.request.tools.length} tools
                          </span>
                        )}
                      </div>
                    }
                  >
                    <JsonPrettyViewer data={selectedDetail.request} title="client_request.json" />
                  </CollapsibleSection>
                )}

                {/* Section 2: Provider Request */}
                {selectedDetail.providerRequest &&
                  (activeSectionFilter === "all" || activeSectionFilter === "2-providerRequest") && (
                    <CollapsibleSection
                      title="2. Provider Request (Translated Upstream)"
                      defaultOpen={true}
                      icon="translate"
                      badge={
                        selectedDetail.metadata?.targetFormat ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                            Format: {selectedDetail.metadata.targetFormat}
                          </span>
                        ) : null
                      }
                    >
                      <div className="space-y-3">
                        {selectedDetail.providerRequest.url && (
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border-subtle flex items-center justify-between gap-2 text-xs font-mono">
                            <div className="flex items-center gap-1.5 min-w-0 truncate text-text-muted">
                              <span className="font-semibold text-text-main">Target URL:</span>
                              <span className="truncate text-primary">{selectedDetail.providerRequest.url}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedDetail.providerRequest.url);
                                alert("URL copied!");
                              }}
                              className="text-text-muted hover:text-text-main shrink-0 p-1 cursor-pointer"
                              title="Copy Target URL"
                            >
                              <span className="material-symbols-outlined text-[15px]">content_copy</span>
                            </button>
                          </div>
                        )}

                        {selectedDetail.providerRequest.headers && Object.keys(selectedDetail.providerRequest.headers).length > 0 && (
                          <CollapsibleSection title="Upstream Request Headers" defaultOpen={false} icon="list_alt">
                            <JsonPrettyViewer data={selectedDetail.providerRequest.headers} title="headers.json" maxHeight="max-h-[200px]" />
                          </CollapsibleSection>
                        )}

                        <JsonPrettyViewer
                          data={selectedDetail.providerRequest.body || selectedDetail.providerRequest}
                          title="provider_request.json"
                        />
                      </div>
                    </CollapsibleSection>
                  )}

                {/* Section 3: Provider Response */}
                {selectedDetail.providerResponse &&
                  (activeSectionFilter === "all" || activeSectionFilter === "3-providerResponse") && (
                    <CollapsibleSection
                      title="3. Provider Response (Raw Upstream)"
                      defaultOpen={true}
                      icon="data_object"
                      badge={
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                          {typeof selectedDetail.providerResponse === "string" ? "Raw Stream / Text" : "Raw JSON Object"}
                        </span>
                      }
                    >
                      <JsonPrettyViewer data={selectedDetail.providerResponse} title="provider_response.raw" />
                    </CollapsibleSection>
                  )}

                {/* Section 4: Final Output */}
                {(activeSectionFilter === "all" || activeSectionFilter === "4-response") && (
                  <CollapsibleSection
                    title="4. Client Response (Final Output)"
                    defaultOpen={true}
                    icon="output"
                    badge={
                      <div className="flex items-center rounded-lg bg-black/5 dark:bg-white/5 p-0.5 border border-border-subtle text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setResponseViewTab("formatted"); }}
                          className={cn(
                            "px-2 py-0.5 rounded transition-colors font-medium cursor-pointer",
                            responseViewTab === "formatted"
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-text-muted hover:text-text-main"
                          )}
                        >
                          Visual View
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setResponseViewTab("raw"); }}
                          className={cn(
                            "px-2 py-0.5 rounded transition-colors font-medium cursor-pointer",
                            responseViewTab === "raw"
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-text-muted hover:text-text-main"
                          )}
                        >
                          Full JSON
                        </button>
                      </div>
                    }
                  >
                    {responseViewTab === "raw" ? (
                      <JsonPrettyViewer data={selectedDetail.response} title="client_response.json" />
                    ) : (
                      <div className="space-y-4">
                        {/* Error Banner if response has error */}
                        {(selectedDetail.response?.error || selectedDetail.status === "error") && (
                          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-xs">
                              <span className="material-symbols-outlined text-[18px]">error</span>
                              <span>Error Status: {selectedDetail.response?.status || selectedDetail.status || "Failed"}</span>
                            </div>
                            <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                              {typeof selectedDetail.response?.error === "object"
                                ? JSON.stringify(selectedDetail.response.error, null, 2)
                                : String(selectedDetail.response?.error || selectedDetail.response?.message || "Unknown error occurred")}
                            </pre>
                          </div>
                        )}

                        {/* Thinking / Reasoning Process */}
                        {(selectedDetail.response?.thinking || selectedDetail.response?.choices?.[0]?.message?.reasoning_content) && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-text-main">
                              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <span className="material-symbols-outlined text-[16px]">psychology</span>
                                Thinking / Reasoning Process
                              </span>
                              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                                {(selectedDetail.response.thinking || selectedDetail.response.choices?.[0]?.message?.reasoning_content || "").length.toLocaleString()} characters
                              </span>
                            </div>
                            <pre className="max-h-[300px] max-w-full overflow-auto rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 font-mono text-xs text-amber-950 dark:text-amber-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                              {selectedDetail.response.thinking || selectedDetail.response.choices?.[0]?.message?.reasoning_content}
                            </pre>
                          </div>
                        )}

                        {/* Tool Calls Execution */}
                        {((selectedDetail.response?.tool_calls && selectedDetail.response.tool_calls.length > 0) ||
                          (selectedDetail.response?.choices?.[0]?.message?.tool_calls && selectedDetail.response.choices[0].message.tool_calls.length > 0)) && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-text-main">
                              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                                <span className="material-symbols-outlined text-[16px]">build</span>
                                Tool Calls Executed (
                                {(selectedDetail.response?.tool_calls || selectedDetail.response?.choices?.[0]?.message?.tool_calls).length}
                                )
                              </span>
                            </div>
                            <div className="space-y-2.5">
                              {(selectedDetail.response?.tool_calls || selectedDetail.response?.choices?.[0]?.message?.tool_calls).map((tc, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 sm:p-4 space-y-2 shadow-xs"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[16px]">terminal</span>
                                      {tc.function?.name || tc.name || `Tool #${idx + 1}`}
                                    </span>
                                    {tc.id && (
                                      <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                                        {tc.id}
                                      </span>
                                    )}
                                  </div>
                                  <JsonPrettyViewer
                                    data={tc.function?.arguments || tc.arguments || {}}
                                    title={`arguments_${idx + 1}.json`}
                                    maxHeight="max-h-[220px]"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Message Content */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-text-main">
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                              Message Text Body
                            </span>
                            {(selectedDetail.response?.content || selectedDetail.response?.choices?.[0]?.message?.content) && (
                              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                                {(selectedDetail.response.content || selectedDetail.response.choices?.[0]?.message?.content || "").length.toLocaleString()} chars
                              </span>
                            )}
                          </div>

                          {(selectedDetail.response?.content || selectedDetail.response?.choices?.[0]?.message?.content) &&
                          (selectedDetail.response?.content !== "[Empty streaming response]" && selectedDetail.response?.choices?.[0]?.message?.content !== "[Empty streaming response]") ? (
                            <pre className="max-h-[400px] max-w-full overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 font-sans text-xs text-text-main whitespace-pre-wrap leading-relaxed shadow-xs">
                              {selectedDetail.response?.content || selectedDetail.response?.choices?.[0]?.message?.content}
                            </pre>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed border-border-subtle text-center text-xs text-text-muted">
                              {selectedDetail.response?.tool_calls?.length || selectedDetail.response?.choices?.[0]?.message?.tool_calls?.length
                                ? "Tool call execution (no direct text message body)"
                                : "[No text content returned]"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CollapsibleSection>
                )}
              </div>
            </div>

            {/* Modal Mobile Bottom Bar */}
            <div className="sm:hidden px-4 py-3 border-t border-border-subtle bg-muted/40 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJson}
                className="flex-1 text-xs gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="flex-1 text-xs gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedAll ? "check" : "content_copy"}
                </span>
                <span>{copiedAll ? "Copied" : "Copy"}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
