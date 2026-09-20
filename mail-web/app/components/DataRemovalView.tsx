"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ArrowUpRight,
  Check,
  Search,
  SlidersHorizontal,
  Sparkles,
  Clock,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { getBrokerLogoUrl } from "../utils/brokerLogos";
import JudgesButton from "./JudgesButton";

interface DataRemovalViewProps {
  inboxId: string;
  onOpenJudges?: () => void;
}

/**
 * Column 1: Displays the broker logo in a clean fixed-height container.
 * If no logo is matched or if loading fails, falls back strictly to the broker text name.
 */
function BrokerLogoCell({ broker }: { broker: { brokerId?: string; id?: string; name: string; website?: string } }) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = useMemo(() => getBrokerLogoUrl(broker), [broker]);

  if (logoUrl && !hasError) {
    return (
      <div className="h-7 max-w-[130px] flex items-center">
        <img
          src={logoUrl}
          alt={broker.name}
          onError={() => setHasError(true)}
          className="max-h-7 max-w-[130px] object-contain object-left"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <span className="text-xs font-semibold text-[#111114] truncate block" title={broker.name}>
        {broker.name}
      </span>
    </div>
  );
}

export default function DataRemovalView({ inboxId, onOpenJudges }: DataRemovalViewProps) {
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startingBrokerIds, setStartingBrokerIds] = useState<Set<string>>(new Set());
  const [isSeeding, setIsSeeding] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        (e.target as HTMLElement)?.tagName !== "INPUT" &&
        (e.target as HTMLElement)?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        document.getElementById("broker-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const rawBrokers = useQuery(api.dataBrokers.listBrokers, {
    inboxId,
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const metrics = useQuery(api.dataBrokers.getRemovalMetrics, { inboxId });
  const startRemovalAction = useAction(api.dataBrokers.startRemoval);
  const seedBrokersAction = useAction(api.dataBrokers.seedAllBrokers);

  const brokers = useMemo(() => {
    if (!rawBrokers) return [];
    const list = [...rawBrokers];

    return list.sort((a, b) => {
      // 1. "notreallydatabroker" / "notreallyaborker" comes first
      const isANotReally =
        a.brokerId === "notreallydatabroker" ||
        a.brokerId === "notreallyaborker" ||
        a.name?.toLowerCase().includes("notreally");
      const isBNotReally =
        b.brokerId === "notreallydatabroker" ||
        b.brokerId === "notreallyaborker" ||
        b.name?.toLowerCase().includes("notreally");

      if (isANotReally && !isBNotReally) return -1;
      if (!isANotReally && isBNotReally) return 1;

      // 2. Brokers with matched logos come next
      const aHasLogo = Boolean(getBrokerLogoUrl(a));
      const bHasLogo = Boolean(getBrokerLogoUrl(b));

      if (aHasLogo && !bHasLogo) return -1;
      if (!aHasLogo && bHasLogo) return 1;

      // 3. Alphabetical tie-breaker within each section
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [rawBrokers]);

  const totalPages = Math.max(1, Math.ceil(brokers.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedBrokers = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return brokers.slice(start, start + PAGE_SIZE);
  }, [brokers, activePage]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleStartRemoval = async (brokerId: string, name: string) => {
    setStartingBrokerIds((prev) => new Set(prev).add(brokerId));
    try {
      const res = await startRemovalAction({ inboxId, brokerId });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err?.message || `Failed to start removal for ${name}`);
    } finally {
      setStartingBrokerIds((prev) => {
        const next = new Set(prev);
        next.delete(brokerId);
        return next;
      });
    }
  };

  const handleSeedCatalog = async () => {
    setIsSeeding(true);
    try {
      const res = await seedBrokersAction({});
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err?.message || "Failed to seed brokers catalog");
    } finally {
      setIsSeeding(false);
    }
  };

  const inProgressTotal =
    (metrics?.sent ?? 0) + (metrics?.inProgress ?? 0) + (metrics?.queued ?? 0);

  return (
    <div className="flex-1 bg-[#fafafb] flex flex-col h-screen overflow-hidden font-sans select-none">
      {/* 56px Top Header Toolbar */}
      <header className="h-14 flex-shrink-0 border-b border-[#00000014] px-4 flex items-center justify-between gap-3 bg-[#fafafb]">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#797981] font-medium hidden sm:inline">Inboxes</span>
          <span className="text-xs text-[#797981] hidden sm:inline">/</span>
          <h2 className="text-xs font-semibold text-[#111114] tracking-tight truncate">
            Data Removal
          </h2>
          <span className="text-[11px] font-mono text-[#797981] ml-1 bg-black/5 px-1.5 py-0.5 rounded">
            {metrics?.totalBrokers ?? brokers.length}
          </span>
        </div>

        {/* Center: Search Bar */}
        <div className="relative flex-1 max-w-md mx-2">
          <Search className="size-3.5 text-[#797981] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="broker-search-input"
            type="text"
            placeholder="Search brokers by name, website..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-12 py-1.5 bg-white border border-[#00000014] rounded-md text-xs text-[#161619] placeholder:text-[#797981] focus:outline-none focus:border-[#111114]/40 focus:ring-1 focus:ring-[#111114]/20 transition-all font-sans"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-[#f1f1f4] border border-[#00000014] px-1 py-0.5 rounded text-[#797981]">
            /
          </kbd>
        </div>

        {/* Right Controls: Filters & Seed */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filters Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="h-8 px-2.5 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] hover:text-[#111114] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="size-3 text-[#797981]" />
              <span className="hidden sm:inline">
                {statusFilter !== "all"
                  ? statusFilter.replace("-", " ")
                  : categoryFilter !== "all"
                  ? categoryFilter.replace("-", " ")
                  : "Filter"}
              </span>
              <ChevronDown className="size-3 text-[#797981]" />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-[#00000014] rounded-md shadow-lg z-30 py-2 text-xs font-sans">
                <div className="px-3 py-1 text-[10px] font-mono uppercase text-[#797981] tracking-wider font-semibold">
                  Status
                </div>
                {[
                  { id: "all", label: "All Statuses" },
                  { id: "queued", label: "Queued" },
                  { id: "sent", label: "Sent" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "completed", label: "Erased" },
                  { id: "requires-human-action", label: "Action Needed" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      handleStatusChange(st.id);
                      setIsFilterOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                  >
                    <span>{st.label}</span>
                    {statusFilter === st.id && <Check className="size-3.5 text-[#111114]" />}
                  </button>
                ))}

                <div className="my-1.5 border-t border-[#00000014]" />

                <div className="px-3 py-1 text-[10px] font-mono uppercase text-[#797981] tracking-wider font-semibold">
                  Category
                </div>
                {[
                  { id: "all", label: "All Categories" },
                  { id: "people-search", label: "People Search" },
                  { id: "marketing", label: "Marketing" },
                  { id: "background-check", label: "Background Check" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      handleCategoryChange(cat.id);
                      setIsFilterOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#f6f6f9] flex items-center justify-between text-[#161619]"
                  >
                    <span>{cat.label}</span>
                    {categoryFilter === cat.id && <Check className="size-3.5 text-[#111114]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seed Catalog Button (if needed) */}
          {(!metrics || metrics.totalBrokers === 0) && (
            <button
              onClick={handleSeedCatalog}
              disabled={isSeeding}
              className="h-8 px-2.5 bg-[#111114] hover:bg-black/90 text-[#fafafb] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Sparkles className="size-3" />
              <span>{isSeeding ? "Seeding..." : "Seed 750+ Catalog"}</span>
            </button>
          )}

          {/* For Judges Button */}
          {onOpenJudges && (
            <JudgesButton onClick={onOpenJudges} />
          )}
        </div>
      </header>

      {/* Firecrawl-Style Stat Cards Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 flex-shrink-0">
        <div className="border border-[#00000014] bg-white rounded-lg shadow-xs overflow-hidden">
          <div className="flex flex-wrap lg:flex-nowrap divide-y lg:divide-y-0 lg:divide-x divide-[#00000014]">
            {/* Card 1: Total Brokers */}
            <div className="flex-1 min-w-[160px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                Total Brokers
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#111114]">
                {metrics?.totalBrokers ?? 750}
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                Tracked in catalog
              </div>
            </div>

            {/* Card 2: In Progress / Sent */}
            <div className="flex-1 min-w-[160px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                In Progress
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#111114]">
                {inProgressTotal}
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                {metrics?.sent ?? 0} sent · {metrics?.queued ?? 0} queued
              </div>
            </div>

            {/* Card 3: Erased */}
            <div className="flex-1 min-w-[160px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                Erased
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#186a23]">
                {metrics?.completed ?? 0}
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                Confirmed deletions
              </div>
            </div>

            {/* Card 4: Action Needed */}
            <div className="flex-1 min-w-[160px] px-5 py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#797981] mb-1">
                Action Needed
              </div>
              <div className={`text-2xl font-semibold tabular-nums ${
                (metrics?.requiresAction ?? 0) > 0 ? "text-[#8d5400]" : "text-[#111114]"
              }`}>
                {metrics?.requiresAction ?? 0}
              </div>
              <div className="text-xs text-[#797981] mt-0.5 truncate">
                Manual opt-out required
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple 3-Column Table */}
      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pb-4 overflow-hidden">
        <div className="border border-[#00000014] bg-white rounded-lg shadow-xs flex-1 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#f6f6f9] border-b border-[#00000014] px-5 py-2.5 text-[11px] font-semibold text-[#797981] uppercase tracking-wider flex items-center justify-between select-none shrink-0">
            <div className="w-5/12 sm:w-1/2">Data Broker</div>
            <div className="w-3/12 sm:w-1/4">Status</div>
            <div className="w-4/12 sm:w-1/4 text-right pr-2">Actions</div>
          </div>

          {/* Table Rows Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#00000014]">
            {brokers.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center gap-2 text-[#797981]">
                <p className="font-semibold text-xs text-[#111114]">No data brokers found</p>
                <p className="text-[11px] text-[#797981] max-w-sm">
                  {search || categoryFilter !== "all" || statusFilter !== "all"
                    ? "No data brokers match your current search or filter criteria."
                    : "Click \"Seed 750+ Catalog\" above to initialize the data brokers directory."}
                </p>
              </div>
            ) : (
              paginatedBrokers.map((broker: any) => {
                const isCompleted = broker.status === "completed";
                const isQueued = broker.status === "queued";
                const isSent = broker.status === "sent";
                const isInProgress = broker.status === "in_progress";
                const isActionNeeded = broker.status === "requires-human-action";
                const isNotStarted = broker.status === "not_started" || !broker.status;
                const isStarting = startingBrokerIds.has(broker.brokerId);

                const portalUrl = broker.optOutUrl || broker.website;

                return (
                  <div
                    key={broker.brokerId}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#eeeef1]/40 transition-colors"
                  >
                    {/* Column 1: Logo (defaults strictly to name if not matched or error) */}
                    <div className="w-5/12 sm:w-1/2 pr-4 min-w-0">
                      <BrokerLogoCell broker={broker} />
                    </div>

                    {/* Column 2: Status */}
                    <div className="w-3/12 sm:w-1/4 shrink-0">
                      {isCompleted ? (
                        <span className="bg-[#186a23]/10 text-[#186a23] border border-[#186a23]/20 px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1.5">
                          <Check className="size-3 stroke-[2.5]" />
                          <span>Data Erased</span>
                        </span>
                      ) : isActionNeeded ? (
                        <span
                          className="bg-[#8d5400]/10 text-[#8d5400] border border-[#8d5400]/20 px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1.5"
                          title={broker.manualActionReason || "Manual action required"}
                        >
                          <AlertCircle className="size-3" />
                          <span className="truncate max-w-[120px] sm:max-w-[160px]">
                            {broker.manualActionReason || "Action Needed"}
                          </span>
                        </span>
                      ) : isInProgress ? (
                        <span className="bg-[#916600]/10 text-[#916600] border border-[#916600]/20 px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1.5">
                          <Clock className="size-3 animate-spin" />
                          <span>In Progress</span>
                        </span>
                      ) : isSent ? (
                        <span className="bg-[#005fad]/10 text-[#005fad] border border-[#005fad]/20 px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1.5">
                          <Send className="size-3" />
                          <span>Sent</span>
                        </span>
                      ) : isQueued ? (
                        <span className="bg-[#111114]/5 text-[#323237] border border-[#00000014] px-2.5 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1.5">
                          <Clock className="size-3" />
                          <span>Queued</span>
                        </span>
                      ) : (
                        <span className="text-[#797981] text-xs font-mono">
                          Not Started
                        </span>
                      )}
                    </div>

                    {/* Column 3: The 2 Buttons by the side (Start Removal and Portal) */}
                    <div className="w-4/12 sm:w-1/4 flex items-center justify-end gap-2 shrink-0">
                      {/* Button 1: Primary Action (Start Removal / Resend / Proof / Complete Action) */}
                      {isActionNeeded ? (
                        <a
                          href={broker.manualActionUrl || portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#111114] text-[#fafafb] hover:bg-black/90 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-xs inline-flex items-center gap-1"
                        >
                          <span>Complete</span>
                          <ArrowUpRight className="size-3 stroke-[2]" />
                        </a>
                      ) : isCompleted && broker.screenshotUrl ? (
                        <a
                          href={broker.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#111114] text-[#fafafb] hover:bg-black/90 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-xs inline-flex items-center gap-1"
                          title="View Erasure Proof Screenshot"
                        >
                          <span>Proof</span>
                          <ArrowUpRight className="size-3 stroke-[2]" />
                        </a>
                      ) : isStarting ? (
                        <button
                          disabled
                          className="bg-[#111114]/80 text-[#fafafb] px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 cursor-not-allowed"
                        >
                          <Clock className="size-3 animate-spin" />
                          <span>Starting...</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartRemoval(broker.brokerId, broker.name)}
                          className="bg-[#111114] text-[#fafafb] hover:bg-black/90 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          title={`Start autonomous removal process for ${broker.name}`}
                        >
                          <Send className="size-3" />
                          <span>{isSent ? "Resend" : "Start Removal"}</span>
                        </button>
                      )}

                      {/* Button 2: Portal Button */}
                      {portalUrl ? (
                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#161619] px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Direct Opt-Out Portal"
                        >
                          <span>Portal</span>
                          <ArrowUpRight className="size-3 text-[#797981]" />
                        </a>
                      ) : (
                        <button
                          disabled
                          className="bg-white border border-[#0000000f] text-[#797981]/40 px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1 cursor-not-allowed"
                        >
                          <span>Portal</span>
                          <ArrowUpRight className="size-3 opacity-30" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Clean Pagination Footer */}
          {brokers.length > 0 && (
            <div className="px-5 py-2.5 border-t border-[#00000014] bg-white flex items-center justify-between gap-4 flex-wrap shrink-0">
              <div className="text-xs font-mono text-[#797981]">
                Showing <span className="text-[#111114] font-medium">{(activePage - 1) * PAGE_SIZE + 1}</span>–
                <span className="text-[#111114] font-medium">{Math.min(activePage * PAGE_SIZE, brokers.length)}</span> of{" "}
                <span className="text-[#111114] font-medium">{brokers.length}</span> brokers
              </div>

              <div className="flex items-center gap-1 font-mono text-xs">
                {/* Prev Button */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage <= 1}
                  className="h-7 px-2.5 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Prev</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - activePage) <= 1;
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && (
                            <span className="px-1 text-[#797981] font-mono text-xs">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`h-7 min-w-[28px] px-2 text-xs font-medium rounded-md transition-colors ${
                              activePage === p
                                ? "bg-[#111114] text-[#fafafb] shadow-xs"
                                : "bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237]"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage >= totalPages}
                  className="h-7 px-2.5 bg-white border border-[#00000014] hover:bg-[#f6f6f9] text-[#323237] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
