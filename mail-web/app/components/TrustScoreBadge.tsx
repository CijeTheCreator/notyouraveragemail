"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ExternalLink, Shield } from "lucide-react";

interface TrustScoreBadgeProps {
  domain?: string;
  trustScore?: number;
  ratingCategory?: string;
  isSuspicious?: boolean;
  compact?: boolean;
}

/**
 * Maps a numerical TrustScore (e.g. 1.6, 4.0) to Trustpilot's official star SVG assets:
 * /trustpilot/stars/stars-{0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5}.svg
 */
function getTrustpilotStarSvg(score: number): string {
  const rounded = Math.round(score * 2) / 2;
  const clamped = Math.max(0, Math.min(5, rounded));
  const starName = clamped % 1 === 0 ? clamped.toString() : clamped.toFixed(1);
  return `/trustpilot/stars/stars-${starName}.svg`;
}

export default function TrustScoreBadge({
  domain,
  trustScore,
  ratingCategory,
  isSuspicious,
  compact = false,
}: TrustScoreBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load cached domain intelligence on demand
  const domainData = useQuery(
    api.pipeline.domainReputation.getDomainIntelligence,
    isOpen && domain ? { domain } : "skip"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const score = trustScore ?? domainData?.trustScore;
  const suspicious = isSuspicious ?? domainData?.isSuspicious ?? (score !== undefined && score < 3.0);
  const category = ratingCategory || domainData?.ratingCategory;
  const reviewCount = domainData?.reviewCount;
  const complaintKeywords = domainData?.complaintKeywords || [];
  const trustpilotUrl =
    domainData?.trustpilotUrl || (domain ? `https://www.trustpilot.com/review/${domain}` : undefined);

  // Loading indicator: card is open, domain is specified, but data is still fetching
  const isLoading = isOpen && domain && domainData === undefined && score === undefined;

  // Do not display badge if no domain and no score
  if (!domain && score === undefined) return null;

  return (
    <div
      ref={containerRef}
      className="relative inline-block font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border transition-colors cursor-pointer select-none ${
          suspicious
            ? "bg-[#fef2f2] text-[#be222a] border-[#fecaca] hover:bg-[#fee2e2]"
            : score !== undefined
            ? "bg-white text-[#161619] border-[#00000014] hover:bg-[#f6f6f9]"
            : "bg-white text-[#5a5a61] border-[#00000014] hover:bg-[#f6f6f9]"
        }`}
        title={
          score !== undefined
            ? `TrustScore ${score.toFixed(1)}/5 on Trustpilot - Click for details`
            : "Click to view sender domain Trustpilot reputation"
        }
      >
        {score !== undefined ? (
          <>
            <img
              src={getTrustpilotStarSvg(score)}
              alt={`Trustpilot ${score} stars`}
              className="h-3 w-auto flex-shrink-0"
            />
            <span className="font-mono text-xs font-medium leading-none">
              {score.toFixed(1)}
            </span>
          </>
        ) : (
          <>
            <Shield className="size-3 text-[#797981] flex-shrink-0" />
            <span className="text-xs">
              {compact ? domain : `${domain || "Sender"} Rep`}
            </span>
          </>
        )}
      </button>

      {/* Sleek Popover Card */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-[#00000014] rounded-lg shadow-xl p-4 z-50 text-left font-sans text-xs text-[#161619]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <img
                src="/trustpilot/logo-black.svg"
                alt="Trustpilot"
                className="h-4 w-auto opacity-70"
              />
              <div className="flex items-center gap-2 text-xs font-medium text-[#161619]">
                <span className="size-3.5 border-2 border-[#111114] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Loading domain profile...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[#00000014] pb-2.5 mb-3">
                <div>
                  <img
                    src="/trustpilot/logo-black.svg"
                    alt="Trustpilot"
                    className="h-3.5 w-auto mb-1 opacity-80"
                  />
                  <div className="font-semibold text-sm text-[#111114]">
                    {domainData?.companyName || domain || "Domain Reputation"}
                  </div>
                </div>

                {score !== undefined && (
                  <div
                    className={`px-2 py-1 rounded-md text-center flex flex-col items-center justify-center ${
                      suspicious ? "bg-[#fef2f2] text-[#be222a]" : "bg-[#f0fdf4] text-[#186a23]"
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center justify-center gap-1 font-mono">
                      <span>{score.toFixed(1)}</span>
                      <span className="text-[10px] text-[#797981]">/5</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="space-y-1.5 mb-3 bg-[#f6f6f9] p-2.5 rounded-md border border-[#00000014]">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#5a5a61]">Rating:</span>
                  <span className="font-medium capitalize text-[#111114]">
                    {category || (score !== undefined ? (score >= 4 ? "Great" : score >= 3 ? "Average" : "Bad") : "Unrated")}
                  </span>
                </div>
                {reviewCount !== undefined && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#5a5a61]">Total Reviews:</span>
                    <span className="font-mono font-medium text-[#111114]">{reviewCount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Top Customer Complaints & Feedback */}
              {complaintKeywords && complaintKeywords.length > 0 && (
                <div className="mb-3">
                  <div className="font-medium text-[11px] uppercase tracking-wider text-[#797981] mb-1.5 font-mono">
                    Top Feedback Keywords:
                  </div>
                  <div className="space-y-1">
                    {complaintKeywords.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="bg-[#f6f6f9] border border-[#0000000a] p-1.5 rounded text-[11px] flex items-start gap-1.5 leading-tight"
                      >
                        <span className="text-[#797981] font-mono text-[10px]">#{i + 1}</span>
                        <span className="text-[#323237]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Trustpilot Link */}
              {trustpilotUrl && (
                <a
                  href={trustpilotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#111114] hover:bg-black text-[#fafafb] py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
                >
                  <span>View Full Profile</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
