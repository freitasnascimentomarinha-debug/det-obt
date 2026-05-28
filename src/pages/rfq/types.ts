export type RFQStatus = 'Draft' | 'Open' | 'In Review' | 'Negotiation' | 'Closed' | 'Awarded';

export type RFQRiskLevel = 'Low' | 'Medium' | 'High';
export type RFQInvitationStatus = 'Sent' | 'Viewed' | 'Quoted' | 'Expired';
export type RFQInputMode = 'Manual' | 'Spreadsheet';

export interface RFQCompany {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  contactName?: string;
  segment: string;
  rating: number;
  status: 'Approved' | 'Pending';
  leadTimeDays: number;
  lastRFQ: string;
  preferredCategories?: string[];
}

export interface RFQItem {
  id: string;
  sku: string;
  description: string;
  category: string;
  annualVolume: number;
  unit?: string;
  preferredSupplier: string;
  lastValidPrice?: number;
  lastValidDate?: string;
}

export interface RFQProcess {
  id: string;
  title: string;
  buyer: string;
  company: string;
  department?: string;
  deadline: string;
  status: RFQStatus;
  savingsPotential: number;
  riskLevel: RFQRiskLevel;
  inputMode?: RFQInputMode;
  createdAt?: string;
  totalItems?: number;
}

export interface RFQProcessItem {
  id: string;
  processId: string;
  sku: string;
  description: string;
  quantity: number;
  unit: string;
  targetPrice: number;
  preferredSupplier: string;
  historicalReference: string;
}

export interface RFQSupplierInvitation {
  id: string;
  processId: string;
  companyId: string;
  token: string;
  status: RFQInvitationStatus;
  quotedItems: number;
  sentAt: string;
  viewedAt?: string;
  submittedAt?: string;
  uniqueUrl: string;
}

export interface RFQQuote {
  id: string;
  processId: string;
  companyId: string;
  itemId: string;
  price: number;
  attachmentName?: string;
}

export interface RFQNotificationItem {
  id: string;
  processId?: string;
  title: string;
  message: string;
  createdAt: string;
  audience: 'Buyer' | 'Supplier';
  type: 'NewProcess' | 'Deadline' | 'Submission' | 'Reminder';
}

export interface RFQHistoryRecord {
  id: string;
  title: string;
  closedAt: string;
  winningSupplier: string;
  savings: number;
  validUntil: string;
  itemCount: number;
  department: string;
}

export interface RFQChatMessage {
  id: string;
  processId: string;
  companyId: string;
  author: string;
  side: 'Buyer' | 'Supplier' | 'AI';
  message: string;
  createdAt: string;
}

export interface RFQComparativeRow {
  itemId: string;
  description: string;
  preferredSupplier: string;
  historicalReference: string;
  bestPrice: number | null;
  prices: Array<{
    companyId: string;
    price: number | null;
  }>;
}

export interface RfqAiInsight {
  headline: string;
  summary: string;
  actions: string[];
}
