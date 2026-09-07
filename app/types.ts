export type FolderType = "inbox" | "sent" | "drafts" | "trash" | "action-cards";

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
  actionCard?: {
    type: "cancellation" | "data-removal" | "spam-takedown";
    service: string;
    costMonthly?: string;
    recommendedAction: string;
    autoTriggerDays?: number;
  };
  attachments?: Attachment[];
}
