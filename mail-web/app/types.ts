export type FolderType = "inbox" | "sent" | "drafts" | "trash" | "subscriptions";

export interface Attachment {
  id: string;
  filename: string;
  size: string;
  contentType: string;
}

export interface Email {
  id: string;
  folder: FolderType;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  subject: string;
  preview: string;
  body: string;
  htmlBody?: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  tags?: Array<{
    label: string;
    bgColor: string;
    textColor: string;
  }>;
  otpCode?: string;
  senderDomain?: string;
  trustScore?: number;
  ratingCategory?: string;
  priority?: "high" | "normal" | "low";
  isSuspicious?: boolean;
  actionCard?: {
    type: "cancellation" | "data-removal" | "spam-takedown";
    service: string;
    costMonthly?: string;
    recommendedAction: string;
    autoTriggerDays?: number;
    autoTriggerAt?: number;
    status?: string;
    supportEmail?: string;
    portalUrl?: string;
    cancellationMethod?: string;
    policySummary?: string;
    recommendedTier?: string;
    executionStatus?: string;
    executionLog?: string[];
  };
  attachments?: Attachment[];
}
