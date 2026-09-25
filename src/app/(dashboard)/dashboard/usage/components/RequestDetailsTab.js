"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
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

function JsonPrettyViewer({ data, title = "JSON", maxHeight = "max-h-[360px]" }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("pretty"); // "pretty" | "raw"
  const [search, setSearch] = useState("");

  const formattedStr = useMemo(() => formatJsonValue(data), [data]);
  const rawStr = useMemo(() => {
    if (typeof data === "string") return data;
    try { return JSON.stringify(data); } catch { return String(data); }
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
          {lines.length > 6 && (
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-6 w-28 sm:w-36 text-[11px] bg-black/40 border border-white/10 rounded px-2 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
            />
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
            title="Copy to clipboard"
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
    <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {icon && <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>}
          <span className="font-semibold text-sm text-text-main">{title}</span>
          {badge}
        </div>
        <span
          className={cn(
            "material-symbols-outlined text-[20px] text-text-muted transition-transform duration-200",
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

function getCachedTokens(tokens) {
  return tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
}

function getCacheCreationTokens(tokens) {
  return tokens?.cache_creation_input_tokens || 0;
}

function getInputTokens(tokens) {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  const cache = getCachedTokens(tokens);
  return prompt < cache ? cache : prompt;
}

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSectionFilter, setActiveSectionFilter] = useState("all");
  const [copiedAll, setCopiedAll] = useState(false);

  const [filters, setFilters] = useState({
    provider: "",
    model: "",
    status: "",
    startDate: "",
    endDate: ""
  });

  const [providers, setProviders] = useState([]);

  useEffect(() => {
    fetchProviderNames().then(() => {
      fetch("/api/usage/providers")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setProviders(data);
        })
        .catch((err) => console.error("Failed to fetch providers:", err));
    });
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
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

  const handleViewDetail = (detail) => {
    setSelectedDetail(detail);
    setActiveSectionFilter("all");
    setIsDrawerOpen(true);
  };

  const handleCopyAll = () => {
    if (!selectedDetail) return;
    navigator.clipboard.writeText(JSON.stringify(selectedDetail, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => handleFilterChange("provider", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-sm text-text-main focus:outline-none focus:border-primary"
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
            <label className="block text-xs font-medium text-text-muted mb-1.5">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-sm text-text-main focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-sm text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full h-9 rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 text-sm text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!filters.provider && !filters.status && !filters.startDate && !filters.endDate}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
                <th className="text-left p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Timestamp</th>
                <th className="text-left p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Model</th>
                <th className="text-left p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Provider</th>
                <th className="text-right p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Input Tokens</th>
                <th className="text-right p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Cached</th>
                <th className="text-right p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Output Tokens</th>
                <th className="text-left p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Latency</th>
                <th className="text-center p-4 text-xs font-semibold text-text-main uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : details.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-text-muted">
                    No request details found
                  </td>
                </tr>
              ) : (
                details.map((detail, index) => (
                  <tr
                    key={`${detail.id}-${index}`}
                    className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="whitespace-nowrap p-4 text-xs text-text-main font-mono">
                      {new Date(detail.timestamp).toLocaleString()}
                    </td>
                    <td className="max-w-[260px] truncate p-4 font-mono text-xs text-text-main">
                      {detail.model}
                    </td>
                    <td className="max-w-[180px] truncate p-4 text-xs text-text-main">
                      <span className="font-medium">
                        {getProviderName(detail.provider, providerNameCache)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-text-main text-right font-mono">
                      {getInputTokens(detail.tokens).toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-text-main text-right font-mono">
                      {getCachedTokens(detail.tokens) > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ↻{getCachedTokens(detail.tokens).toLocaleString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-xs text-text-main text-right font-mono">
                      {detail.tokens?.completion_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="p-4 text-xs text-text-muted">
                      <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                        <div>TTFT: {detail.latency?.ttft || 0}ms</div>
                        <div>Total: {detail.latency?.total || 0}ms</div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(detail)}
                        className="cursor-pointer text-xs h-7 px-3"
                      >
                        Inspect
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

      {/* Upgraded Drawer with Prettier JSON Syntax Highlighting */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedDetail ? `Trace: ${selectedDetail.model}` : "Request Detail"}
        width="full"
        className={cn(
          "w-full transition-all duration-300",
          isFullscreen ? "sm:max-w-full lg:max-w-full" : "sm:max-w-3xl lg:max-w-5xl"
        )}
      >
        {selectedDetail && (
          <div className="space-y-5">
            {/* Top Toolbar: Fullscreen toggle & Copy All */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-text-muted text-[11px] mr-1">Section:</span>
                {["all", "1-request", "2-providerRequest", "3-providerResponse", "4-response"].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSectionFilter(sec)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                      activeSectionFilter === sec
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-main border border-border-subtle"
                    )}
                  >
                    {sec === "all" ? "All Sections" : sec.replace("-", ". ")}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  className="h-7 text-xs gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedAll ? "check" : "content_copy"}
                  </span>
                  <span>{copiedAll ? "Copied" : "Copy Payload"}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-7 w-7 p-0 cursor-pointer text-text-muted hover:text-text-main"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Metrics Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-border-subtle bg-surface">
                <span className="text-[11px] text-text-muted block mb-1">Status</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold",
                    selectedDetail.status === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      selectedDetail.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                    )}
                  />
                  {selectedDetail.status?.toUpperCase() || "OK"}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-border-subtle bg-surface">
                <span className="text-[11px] text-text-muted block mb-1">Latency</span>
                <div className="text-xs font-mono text-text-main font-semibold">
                  {selectedDetail.latency?.total || 0}ms
                  <span className="text-[10px] text-text-muted font-normal block">
                    TTFT: {selectedDetail.latency?.ttft || 0}ms
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border-subtle bg-surface">
                <span className="text-[11px] text-text-muted block mb-1">Tokens (In / Out)</span>
                <div className="text-xs font-mono text-text-main font-semibold">
                  {getInputTokens(selectedDetail.tokens).toLocaleString()} / {selectedDetail.tokens?.completion_tokens?.toLocaleString() || 0}
                  {getCachedTokens(selectedDetail.tokens) > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal block">
                      ↻ Cached: {getCachedTokens(selectedDetail.tokens).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border-subtle bg-surface">
                <span className="text-[11px] text-text-muted block mb-1">Provider & Type</span>
                <div className="text-xs text-text-main font-semibold truncate">
                  {getProviderName(selectedDetail.provider, providerNameCache)}
                  <span className="text-[10px] text-text-muted font-normal block font-mono">
                    {selectedDetail.response?.type === "streaming" || selectedDetail.request?.stream
                      ? "SSE Streaming"
                      : "Standard"}
                  </span>
                </div>
              </div>
            </div>

            {/* PXPIPE Image Compression Info (if present) */}
            {selectedDetail.pxpipe && (
              <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-text-main">
                  <span className="material-symbols-outlined text-[16px] text-primary">image</span>
                  <span>PXPIPE Image Optimizer</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      selectedDetail.pxpipe.applied
                        ? "bg-green-500/15 text-green-600"
                        : "bg-amber-500/15 text-amber-600"
                    )}
                  >
                    {selectedDetail.pxpipe.applied ? "Active" : "Skipped"}
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
                      <span className="text-text-muted block text-[10px]">Saved</span>
                      <span className="text-emerald-600 font-bold">{selectedDetail.pxpipe.savedPct || 0}%</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">Images</span>
                      <span>{selectedDetail.pxpipe.imageCount || 0}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted font-mono">{selectedDetail.pxpipe.reason}</p>
                )}
              </div>
            )}

            {/* Main Sections */}
            <div className="space-y-4">
              {/* Section 1: Client Request */}
              {(activeSectionFilter === "all" || activeSectionFilter === "1-request") && (
                <CollapsibleSection title="1. Client Request (Input)" defaultOpen={true} icon="input">
                  <JsonPrettyViewer data={selectedDetail.request} title="client-request.json" />
                </CollapsibleSection>
              )}

              {/* Section 2: Provider Request */}
              {selectedDetail.providerRequest &&
                (activeSectionFilter === "all" || activeSectionFilter === "2-providerRequest") && (
                  <CollapsibleSection title="2. Provider Request (Translated)" defaultOpen={true} icon="translate">
                    <JsonPrettyViewer data={selectedDetail.providerRequest} title="provider-request.json" />
                  </CollapsibleSection>
                )}

              {/* Section 3: Provider Response */}
              {selectedDetail.providerResponse &&
                (activeSectionFilter === "all" || activeSectionFilter === "3-providerResponse") && (
                  <CollapsibleSection title="3. Provider Response (Raw Upstream)" defaultOpen={true} icon="data_object">
                    <JsonPrettyViewer data={selectedDetail.providerResponse} title="provider-response.json" />
                  </CollapsibleSection>
                )}

              {/* Section 4: Client Response (Final) with Tools, Thinking & Content */}
              {(activeSectionFilter === "all" || activeSectionFilter === "4-response") && (
                <CollapsibleSection title="4. Client Response (Final)" defaultOpen={true} icon="output">
                  <div className="space-y-4">
                    {/* Thinking / Reasoning Process */}
                    {selectedDetail.response?.thinking && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-main">
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                            Thinking / Reasoning Process
                          </span>
                          <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                            {selectedDetail.response.thinking.length.toLocaleString()} chars
                          </span>
                        </div>
                        <pre className="max-h-[260px] max-w-full overflow-auto rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 font-mono text-xs text-amber-950 dark:text-amber-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                          {selectedDetail.response.thinking}
                        </pre>
                      </div>
                    )}

                    {/* Tool Calls Execution Details */}
                    {selectedDetail.response?.tool_calls && selectedDetail.response.tool_calls.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-main">
                          <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                            <span className="material-symbols-outlined text-[16px]">build</span>
                            Tool Calls Executed ({selectedDetail.response.tool_calls.length})
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {selectedDetail.response.tool_calls.map((tc, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5 space-y-2 shadow-xs"
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

                    {/* Final Message Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-text-main">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                          Message Content
                        </span>
                        {selectedDetail.response?.content && (
                          <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                            {selectedDetail.response.content.length.toLocaleString()} chars
                          </span>
                        )}
                      </div>

                      {selectedDetail.response?.content &&
                      selectedDetail.response.content !== "[Empty streaming response]" ? (
                        <pre className="max-h-[350px] max-w-full overflow-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 font-sans text-xs text-text-main whitespace-pre-wrap leading-relaxed shadow-xs">
                          {selectedDetail.response.content}
                        </pre>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-border-subtle text-center text-xs text-text-muted">
                          {selectedDetail.response?.tool_calls?.length
                            ? "Tool call execution (no direct text message body)"
                            : "[No text content returned]"}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
