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
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold border border-[#2c2a29] transition-transform active:scale-95 cursor-pointer brutal-shadow-sm select-none ${
          suspicious
            ? "bg-[#FFE4E6] text-[#9F1239] hover:bg-[#FECDD3]"
            : score !== undefined
            ? "bg-white text-[#2c2a29] hover:bg-[#F0FDF4]"
            : "bg-white text-gray-700 hover:bg-gray-100"
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
              className="h-3.5 w-auto flex-shrink-0"
            />
            <span className="font-mono text-[11px] font-bold leading-none">
              {score.toFixed(1)}
            </span>
          </>
        ) : (
          <>
            <Shield className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="font-sans text-[11px]">
              {compact ? domain : `${domain || "Sender"} Rep`}
            </span>
          </>
        )}
      </button>

      {/* Neobrutalist Popover */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-84 bg-[#FEFBEA] border-2 border-[#2c2a29] brutal-shadow p-4 z-50 text-left font-sans text-xs text-[#2c2a29]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading State with Trustpilot Logo & Spinner */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
              <img
                src="/trustpilot/logo-black.svg"
                alt="Trustpilot"
                className="h-5 w-auto"
              />
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-[#2c2a29]">
                <span className="w-4 h-4 border-2 border-[#00B67A] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Loading Trustpilot profile...</span>
              </div>
              <p className="text-[10px] text-gray-500 font-sans">
                Extracting real-time domain reputation and reviews
              </p>
            </div>
          ) : (
            <>
              {/* Header with Trustpilot Brand Logo */}
              <div className="flex items-start justify-between gap-2 border-b-2 border-[#2c2a29] pb-2.5 mb-3">
                <div>
                  <img
                    src="/trustpilot/logo-black.svg"
                    alt="Trustpilot"
                    className="h-3.5 w-auto mb-1.5 opacity-90"
                  />
                  <div className="font-anton text-base tracking-wide uppercase">
                    {domainData?.companyName || domain || "Domain Reputation"}
                  </div>
                </div>

                {score !== undefined && (
                  <div
                    className={`px-2.5 py-1 border-2 border-[#2c2a29] text-center brutal-shadow-sm flex flex-col items-center justify-center ${
                      suspicious ? "bg-[#FF6B6B] text-white" : "bg-[#00B67A] text-white"
                    }`}
                  >
                    <div className="font-anton text-lg leading-tight flex items-center justify-center gap-1">
                      <img
                        src="/trustpilot/star-mark-white.svg"
                        alt="Trustpilot"
                        className="w-3.5 h-3.5"
                      />
                      <span>{score.toFixed(1)}</span>
                    </div>
                    <div className="text-[9px] font-mono uppercase font-bold tracking-wider">/ 5.0</div>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="space-y-1.5 mb-3 bg-white p-2.5 border border-[#2c2a29]">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-gray-600">Rating:</span>
                  <span className="font-mono font-bold capitalize">
                    {category || (score !== undefined ? (score >= 4 ? "Great" : score >= 3 ? "Average" : "Bad") : "Unrated")}
                  </span>
                </div>
                {reviewCount !== undefined && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-gray-600">Total Reviews:</span>
                    <span className="font-mono font-bold">{reviewCount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Top Customer Complaints & Feedback */}
              {complaintKeywords && complaintKeywords.length > 0 && (
                <div className="mb-3">
                  <div className="font-bold text-[10px] uppercase text-gray-600 mb-1.5 font-mono">
                    Top Customer Complaints:
                  </div>
                  <div className="space-y-1.5">
                    {complaintKeywords.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="bg-white border border-[#2c2a29] p-2 text-[11px] font-sans flex items-start gap-2 leading-tight brutal-shadow-sm"
                      >
                        <span className="bg-[#FED7AA] text-[#7C2D12] border border-[#2c2a29] text-[9px] font-mono font-bold px-1 py-0.2 rounded-xs flex-shrink-0">
                          #{i + 1}
                        </span>
                        <span className="text-gray-800 font-medium">{item}</span>
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
                  className="brutal-btn w-full bg-[#00B67A] hover:bg-[#009b67] text-white py-2 px-3 flex items-center justify-center gap-1.5 text-[11px] font-bold mt-2 shadow-xs"
                >
                  <span>View Full Profile on Trustpilot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
