"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ArrowUpRight, Check, Search, Filter, ShieldAlert, Sparkles, Clock, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DataRemovalViewProps {
  inboxId: string;
}

function BrokerLogo({ domain, name }: { domain?: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  const cleanDomain = domain
    ? domain.replace(/https?:\/\/(www\.)?/, "").split("/")[0]
    : "";

  if (error || !cleanDomain) {
    return (
      <div className="w-8 h-8 rounded border-2 border-[#2c2a29] bg-[#D0B4FF] text-[#2c2a29] font-anton text-xs flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${cleanDomain}`}
      alt={name}
      onError={() => setError(true)}
      className="w-8 h-8 rounded border-2 border-[#2c2a29] object-contain bg-white flex-shrink-0 p-0.5"
    />
  );
}

export default function DataRemovalView({ inboxId }: DataRemovalViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const rawBrokers = useQuery(api.dataBrokers.listBrokers, {
    inboxId,
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const metrics = useQuery(api.dataBrokers.getRemovalMetrics, { inboxId });
  const prepareCampaignMutation = useMutation(api.dataBrokers.prepareCampaign);
  const queueSingleMutation = useMutation(api.dataBrokers.queueSingleBroker);
  const seedBrokersAction = useAction(api.dataBrokers.seedAllBrokers);

  const brokers = useMemo(() => rawBrokers || [], [rawBrokers]);

  const handleStartCampaign = async () => {
    setIsPreparing(true);
    try {
      const res = await prepareCampaignMutation({ inboxId, count: 30 });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start removal campaign");
    } finally {
      setIsPreparing(false);
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

  const handleQueueBroker = async (brokerId: string, name: string) => {
    try {
      await queueSingleMutation({ inboxId, brokerId });
      toast.success(`Queued removal request for ${name}`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to queue request for ${name}`);
    }
  };

  return (
    <div className="flex-1 bg-[#FEFBEA] flex flex-col h-screen overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-4 border-b-2 border-[#2c2a29] bg-white/70 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="font-anton text-2xl tracking-wide text-[#2c2a29]">
              DATA REMOVAL
            </h2>
            {/* Metric Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#FEF08A] text-[#854D0E] border-2 border-[#2c2a29] font-mono text-xs font-bold px-2.5 py-1 brutal-shadow-sm">
                Brokers: {metrics?.totalBrokers ?? 0}
              </span>
              <span className="bg-[#D0B4FF] text-[#2c2a29] border-2 border-[#2c2a29] font-mono text-xs font-bold px-2.5 py-1 brutal-shadow-sm">
                Queued: {metrics?.queued ?? 0}
              </span>
              <span className="bg-blue-100 text-blue-900 border-2 border-[#2c2a29] font-mono text-xs font-bold px-2.5 py-1 brutal-shadow-sm">
                Sent: {metrics?.sent ?? 0}
              </span>
              <span className="bg-emerald-100 text-emerald-900 border-2 border-[#2c2a29] font-mono text-xs font-bold px-2.5 py-1 brutal-shadow-sm">
                Erased: {metrics?.completed ?? 0}
              </span>
              {metrics && metrics.requiresAction > 0 && (
                <span className="bg-amber-100 text-amber-900 border-2 border-[#2c2a29] font-mono text-xs font-bold px-2.5 py-1 brutal-shadow-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  Action Needed: {metrics.requiresAction}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(!metrics || metrics.totalBrokers === 0) && (
              <button
                onClick={handleSeedCatalog}
                disabled={isSeeding}
                className="brutal-btn bg-white hover:bg-gray-100 text-[#2c2a29] px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSeeding ? "Seeding..." : "Seed 750+ Catalog"}</span>
              </button>
            )}
            <button
              onClick={handleStartCampaign}
              disabled={isPreparing}
              className="button-primary bg-[#8544FA] hover:bg-[#7330ea] text-[#FEFBEA] px-4 py-2 text-xs font-bold flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPreparing ? "Preparing..." : "Start Removal Campaign (Top 30)"}</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search brokers by name, website, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border-2 border-[#2c2a29] text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#8544FA]"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-gray-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Category:
            </span>
            {["all", "people-search", "marketing", "background-check"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 border-2 text-[11px] font-bold transition-all rounded-sm ${
                  categoryFilter === cat
                    ? "bg-[#D0B4FF] border-[#2c2a29] brutal-shadow-sm text-[#2c2a29]"
                    : "bg-white/80 border-transparent hover:border-[#2c2a29] text-gray-700"
                }`}
              >
                {cat === "all" ? "All" : cat.replace("-", " ").toUpperCase()}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 text-xs font-bold">
            {[
              { id: "all", label: "All" },
              { id: "queued", label: "Queued" },
              { id: "sent", label: "Sent" },
              { id: "in_progress", label: "In Progress" },
              { id: "completed", label: "Erased" },
              { id: "requires-human-action", label: "Action Needed" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2 py-1 border-2 text-[11px] font-bold transition-all rounded-sm ${
                  statusFilter === st.id
                    ? "bg-[#2c2a29] text-white border-[#2c2a29]"
                    : "bg-white/80 border-transparent hover:border-[#2c2a29] text-gray-700"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brokers List */}
      <div className="flex-1 overflow-y-auto divide-y-2 divide-[#2c2a29]">
        {brokers.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
            <p className="font-bold text-base text-[#2c2a29]">No data brokers found</p>
            <p className="text-xs text-gray-600 font-sans max-w-sm">
              Click &quot;Seed 750+ Catalog&quot; to initialize the data brokers directory, or adjust your search filter.
            </p>
          </div>
        ) : (
          brokers.map((broker: any) => {
            const isCompleted = broker.status === "completed";
            const isQueued = broker.status === "queued";
            const isSent = broker.status === "sent";
            const isInProgress = broker.status === "in_progress";
            const isActionNeeded = broker.status === "requires-human-action";
            const isNotStarted = broker.status === "not_started";

            const domainDisplay = broker.website
              ? broker.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0]
              : broker.email;

            return (
              <div
                key={broker.brokerId}
                className="p-4 flex items-center justify-between gap-6 hover:bg-white/60 transition-colors"
              >
                {/* Left: Logo, Name, Domain & Category */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <BrokerLogo domain={broker.website} name={broker.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#2c2a29] block truncate">
                        {broker.name}
                      </span>
                      {broker.category && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 border border-[#2c2a29] bg-[#FEF08A] rounded-sm flex-shrink-0">
                          {broker.category.replace("-", " ")}
                        </span>
                      )}
                      {broker.region && (
                        <span className="text-[10px] uppercase font-mono px-1 py-0.5 text-gray-500 flex-shrink-0">
                          {broker.region}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-mono block truncate">
                      {domainDisplay}
                    </span>
                  </div>
                </div>

                {/* Middle: Status Badge */}
                <div className="flex-shrink-0">
                  {isCompleted && (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-600 px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-sm">
                      <Check className="w-3.5 h-3.5" />
                      <span>Data Erased</span>
                    </span>
                  )}
                  {isActionNeeded && (
                    <span className="bg-amber-100 text-amber-800 border border-amber-600 px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-sm">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{broker.manualActionReason || "Manual Action Needed"}</span>
                    </span>
                  )}
                  {isInProgress && (
                    <span className="bg-amber-50 text-amber-700 border border-amber-400 px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-sm">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>In Progress</span>
                    </span>
                  )}
                  {isSent && (
                    <span className="bg-blue-100 text-blue-800 border border-blue-500 px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-sm">
                      <Send className="w-3.5 h-3.5" />
                      <span>Request Sent</span>
                    </span>
                  )}
                  {isQueued && (
                    <span className="bg-[#D0B4FF] text-[#2c2a29] border border-[#2c2a29] px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-sm">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Queued</span>
                    </span>
                  )}
                  {isNotStarted && (
                    <span className="text-gray-400 text-xs font-mono">
                      Not Started
                    </span>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isActionNeeded ? (
                    <a
                      href={broker.manualActionUrl || broker.optOutUrl || broker.website}
                      target="_blank"
                      rel="noreferrer"
                      className="brutal-btn bg-[#FEF08A] hover:bg-[#fde047] text-[#854D0E] px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                    >
                      <span>Complete Action</span>
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </a>
                  ) : isNotStarted ? (
                    <button
                      onClick={() => handleQueueBroker(broker.brokerId, broker.name)}
                      className="brutal-btn bg-white hover:bg-gray-100 text-[#2c2a29] px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                    >
                      <span>Queue Request</span>
                    </button>
                  ) : (
                    broker.optOutUrl && (
                      <a
                        href={broker.optOutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="brutal-btn bg-white hover:bg-gray-100 text-[#2c2a29] px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 opacity-70 hover:opacity-100"
                        title="Direct Opt-Out Page"
                      >
                        <span>Opt-Out URL</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
