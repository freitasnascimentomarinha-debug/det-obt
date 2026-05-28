import {
  RFQBootstrapPayload,
  RFQChatMessage,
  RFQCompany,
  RFQInputMode,
  RFQItem,
  RFQSupplierPortalData
} from './types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    let errorMessage = 'Erro inesperado na API RFQ.';

    try {
      const payload = await response.json();
      errorMessage = payload?.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export function fetchRFQBootstrap() {
  return requestJson<RFQBootstrapPayload>('/api/rfq/bootstrap');
}

export function createRFQCompany(payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) {
  return requestJson<RFQCompany>('/api/rfq/companies', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createRFQItem(payload: Omit<RFQItem, 'id'>) {
  return requestJson<RFQItem>('/api/rfq/items', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createRFQProcess(payload: {
  title: string;
  department: string;
  deadline: string;
  inputMode: RFQInputMode;
  supplierIds: string[];
  buyerUserId: number;
  buyerName: string;
  items: Array<{
    sku: string;
    description: string;
    quantity: number;
    unit: string;
    targetPrice: number;
    preferredSupplier: string;
    historicalReference: string;
  }>;
}) {
  return requestJson<{
    processId: string;
    emailResults: Array<{
      companyId: string;
      companyName: string;
      sent: boolean;
      provider: string;
      error?: string;
    }>;
    bootstrap: RFQBootstrapPayload;
  }>('/api/rfq/processes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchRFQSupplierPortal(token: string) {
  return requestJson<RFQSupplierPortalData>(`/api/rfq/fornecedor/${token}`);
}

export function submitRFQSupplierProposal(
  token: string,
  payload: {
    prices: Record<string, number>;
    attachmentName?: string;
    attachmentBase64?: string;
  }
) {
  return requestJson<{ success: boolean; submittedAt: string; attachmentUrl?: string }>(
    `/api/rfq/fornecedor/${token}/proposta`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export function createRFQSupplierMessage(token: string, message: string) {
  return requestJson<RFQChatMessage>(`/api/rfq/fornecedor/${token}/mensagens`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}