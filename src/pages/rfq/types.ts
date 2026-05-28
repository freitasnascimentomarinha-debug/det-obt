export type RFQStatus = 'Draft' | 'In Review' | 'Negotiation' | 'Awarded';

export interface RFQCompany {
  id: string;
  name: string;
  segment: string;
  rating: number;
  status: 'Approved' | 'Pending';
  leadTimeDays: number;
  lastRFQ: string;
}

export interface RFQItem {
  id: string;
  sku: string;
  description: string;
  category: string;
  annualVolume: number;
  preferredSupplier: string;
}

export interface RFQProcess {
  id: string;
  title: string;
  buyer: string;
  company: string;
  deadline: string;
  status: RFQStatus;
  savingsPotential: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface RfqAiInsight {
  headline: string;
  summary: string;
  actions: string[];
}
