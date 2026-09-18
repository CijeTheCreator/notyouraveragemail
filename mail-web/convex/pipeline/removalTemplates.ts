/**
 * Generic Privacy Removal Request Email Template (Eraser compatible)
 * Invokes GDPR, CCPA, and US state privacy rights
 */
export function renderGenericRemovalRequest(params: {
  brokerName: string;
  fullName: string;
  email: string;
  date?: string;
}): { subject: string; body: string } {
  const dateStr = params.date || new Date().toISOString().split("T")[0];
  const subject = `Data Deletion and Privacy Opt-Out Request - ${params.fullName}`;

  const body = `To Whom It May Concern at ${params.brokerName},

I am writing to request the permanent removal and deletion of my personal information from your database, public indices, and any associated services or downstream partners.

PERSONAL IDENTIFICATION:
- Full Name: ${params.fullName}
- Email Address: ${params.email}

REQUEST:
I formally request that you:
1. Remove and erase all personal information associated with me from your databases.
2. Cease any sale, sharing, licensing, or distribution of my personal information to third parties.
3. Remove my information from any public-facing search results, people-search pages, or directories.
4. Confirm the completion of this removal in writing to this email address.

I am exercising my privacy rights under applicable data protection laws, which include:
- General Data Protection Regulation (GDPR Article 17 - Right to Erasure)
- California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA)
- Virginia Consumer Data Protection Act (VCDPA)
- Colorado Privacy Act (CPA)
- Other applicable state, federal, and international privacy laws.

Please respond to this request within the statutory timeframe (30 days). If you require specific verification to process this opt-out request, please contact me directly at ${params.email}.

Thank you for your prompt attention to this matter.

Sincerely,
${params.fullName}
Date: ${dateStr}
`;

  return { subject, body };
}
