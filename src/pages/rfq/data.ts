import {
  RFQChatMessage,
  RFQComparativeRow,
  RFQCompany,
  RFQHistoryRecord,
  RFQItem,
  RFQNotificationItem,
  RFQProcess,
  RFQProcessItem,
  RFQQuote,
  RFQSupplierInvitation,
  RfqAiInsight
} from './types';

export const initialCompanies: RFQCompany[] = [
  {
    id: 'co-01',
    name: 'Nexo Industrial',
    cnpj: '12.345.678/0001-90',
    email: 'cotacoes@nexoindustrial.com.br',
    contactName: 'Marta Ferreira',
    segment: 'Equipamentos',
    rating: 4.8,
    status: 'Approved',
    leadTimeDays: 19,
    lastRFQ: '2026-05-18',
    preferredCategories: ['MRO', 'Eletrônica']
  },
  {
    id: 'co-02',
    name: 'Atlas Insumos',
    cnpj: '22.876.155/0001-40',
    email: 'propostas@atlasinsumos.com.br',
    contactName: 'Renata Souza',
    segment: 'Matéria-prima',
    rating: 4.2,
    status: 'Approved',
    leadTimeDays: 26,
    lastRFQ: '2026-05-11',
    preferredCategories: ['Estrutural', 'Serviços']
  },
  {
    id: 'co-03',
    name: 'Porto Supply',
    cnpj: '45.108.998/0001-12',
    email: 'vendas@portosupply.com.br',
    contactName: 'Lucas Martins',
    segment: 'Logística',
    rating: 3.9,
    status: 'Pending',
    leadTimeDays: 31,
    lastRFQ: '2026-04-29',
    preferredCategories: ['Logística', 'Estrutural']
  },
  {
    id: 'co-04',
    name: 'Horizonte Naval',
    cnpj: '63.220.004/0001-07',
    email: 'licitacoes@horizontenaval.com.br',
    contactName: 'Paulo Lins',
    segment: 'Manutenção naval',
    rating: 4.6,
    status: 'Approved',
    leadTimeDays: 14,
    lastRFQ: '2026-05-20',
    preferredCategories: ['MRO', 'Estrutural']
  }
];

export const initialItems: RFQItem[] = [
  {
    id: 'it-01',
    sku: 'ALM-4420',
    description: 'Conjunto de vedação marítima',
    category: 'MRO',
    annualVolume: 1600,
    unit: 'kit',
    preferredSupplier: 'Nexo Industrial',
    lastValidPrice: 182.4,
    lastValidDate: '2026-03-18'
  },
  {
    id: 'it-02',
    sku: 'CAB-1890',
    description: 'Cabo de aço galvanizado 8mm',
    category: 'Estrutural',
    annualVolume: 4800,
    unit: 'm',
    preferredSupplier: 'Atlas Insumos',
    lastValidPrice: 24.85,
    lastValidDate: '2026-02-26'
  },
  {
    id: 'it-03',
    sku: 'ELE-2207',
    description: 'Módulo de monitoramento remoto',
    category: 'Eletrônica',
    annualVolume: 220,
    unit: 'un',
    preferredSupplier: 'Porto Supply',
    lastValidPrice: 1480,
    lastValidDate: '2026-04-12'
  },
  {
    id: 'it-04',
    sku: 'MEC-5543',
    description: 'Unidade de controle térmico',
    category: 'Serviços',
    annualVolume: 140,
    unit: 'un',
    preferredSupplier: 'Horizonte Naval',
    lastValidPrice: 963.55,
    lastValidDate: '2026-05-01'
  }
];

export const initialProcesses: RFQProcess[] = [
  {
    id: 'rfq-101',
    title: 'RFQ Sensores de nível',
    buyer: 'Equipe A-3',
    company: 'Nexo Industrial',
    department: 'Operações Navais',
    deadline: '2026-06-08',
    status: 'In Review',
    savingsPotential: 12.4,
    riskLevel: 'Low',
    inputMode: 'Manual',
    createdAt: '2026-05-23',
    totalItems: 3
  },
  {
    id: 'rfq-102',
    title: 'RFQ Conectores blindados',
    buyer: 'Equipe C-1',
    company: 'Atlas Insumos',
    department: 'Sistemas Embarcados',
    deadline: '2026-06-03',
    status: 'Negotiation',
    savingsPotential: 18.1,
    riskLevel: 'Medium',
    inputMode: 'Spreadsheet',
    createdAt: '2026-05-18',
    totalItems: 2
  },
  {
    id: 'rfq-103',
    title: 'RFQ Jogo de válvulas',
    buyer: 'Equipe B-4',
    company: 'Porto Supply',
    department: 'Base de Apoio',
    deadline: '2026-05-31',
    status: 'Draft',
    savingsPotential: 9.2,
    riskLevel: 'High',
    inputMode: 'Manual',
    createdAt: '2026-05-26',
    totalItems: 4
  },
  {
    id: 'rfq-104',
    title: 'RFQ Bombas submersíveis',
    buyer: 'Equipe D-2',
    company: 'Nexo Industrial',
    department: 'Infraestrutura',
    deadline: '2026-06-19',
    status: 'Awarded',
    savingsPotential: 21.7,
    riskLevel: 'Low',
    inputMode: 'Spreadsheet',
    createdAt: '2026-05-05',
    totalItems: 3
  }
];

export const initialProcessItems: RFQProcessItem[] = [
  {
    id: 'pi-101-1',
    processId: 'rfq-101',
    sku: 'SNS-101',
    description: 'Sensor ultrassônico de tanque',
    quantity: 12,
    unit: 'un',
    targetPrice: 920,
    preferredSupplier: 'Nexo Industrial',
    historicalReference: 'R$ 948,00 em mar/2026'
  },
  {
    id: 'pi-101-2',
    processId: 'rfq-101',
    sku: 'CAB-778',
    description: 'Cabo blindado 20m',
    quantity: 30,
    unit: 'un',
    targetPrice: 118,
    preferredSupplier: 'Atlas Insumos',
    historicalReference: 'R$ 124,00 em jan/2026'
  },
  {
    id: 'pi-101-3',
    processId: 'rfq-101',
    sku: 'SUP-450',
    description: 'Suporte inox para fixação',
    quantity: 18,
    unit: 'un',
    targetPrice: 76,
    preferredSupplier: 'Horizonte Naval',
    historicalReference: 'R$ 80,00 em fev/2026'
  },
  {
    id: 'pi-102-1',
    processId: 'rfq-102',
    sku: 'CON-900',
    description: 'Conector blindado IP68',
    quantity: 80,
    unit: 'un',
    targetPrice: 215,
    preferredSupplier: 'Atlas Insumos',
    historicalReference: 'R$ 226,00 em abr/2026'
  },
  {
    id: 'pi-102-2',
    processId: 'rfq-102',
    sku: 'TER-220',
    description: 'Terminal de aterramento naval',
    quantity: 120,
    unit: 'un',
    targetPrice: 38,
    preferredSupplier: 'Nexo Industrial',
    historicalReference: 'R$ 42,00 em mar/2026'
  },
  {
    id: 'pi-103-1',
    processId: 'rfq-103',
    sku: 'VAL-100',
    description: 'Válvula de retenção 2"',
    quantity: 24,
    unit: 'un',
    targetPrice: 540,
    preferredSupplier: 'Horizonte Naval',
    historicalReference: 'R$ 570,00 em abr/2026'
  },
  {
    id: 'pi-103-2',
    processId: 'rfq-103',
    sku: 'VAL-101',
    description: 'Válvula esfera inox 1 1/2"',
    quantity: 18,
    unit: 'un',
    targetPrice: 398,
    preferredSupplier: 'Atlas Insumos',
    historicalReference: 'R$ 420,00 em mar/2026'
  },
  {
    id: 'pi-104-1',
    processId: 'rfq-104',
    sku: 'BOM-330',
    description: 'Bomba submersível anticorrosiva',
    quantity: 10,
    unit: 'un',
    targetPrice: 2980,
    preferredSupplier: 'Nexo Industrial',
    historicalReference: 'R$ 3.080,00 em dez/2025'
  },
  {
    id: 'pi-104-2',
    processId: 'rfq-104',
    sku: 'BOM-331',
    description: 'Painel de partida protegido',
    quantity: 10,
    unit: 'un',
    targetPrice: 1120,
    preferredSupplier: 'Horizonte Naval',
    historicalReference: 'R$ 1.170,00 em nov/2025'
  }
];

export const initialInvitations: RFQSupplierInvitation[] = [
  {
    id: 'inv-101-1',
    processId: 'rfq-101',
    companyId: 'co-01',
    token: 'nexo-rfq-101',
    status: 'Quoted',
    quotedItems: 3,
    sentAt: '2026-05-23T09:00:00',
    viewedAt: '2026-05-23T11:10:00',
    submittedAt: '2026-05-24T14:20:00',
    uniqueUrl: '/rfq/fornecedor/nexo-rfq-101'
  },
  {
    id: 'inv-101-2',
    processId: 'rfq-101',
    companyId: 'co-02',
    token: 'atlas-rfq-101',
    status: 'Viewed',
    quotedItems: 1,
    sentAt: '2026-05-23T09:05:00',
    viewedAt: '2026-05-23T16:30:00',
    uniqueUrl: '/rfq/fornecedor/atlas-rfq-101'
  },
  {
    id: 'inv-102-1',
    processId: 'rfq-102',
    companyId: 'co-02',
    token: 'atlas-rfq-102',
    status: 'Quoted',
    quotedItems: 2,
    sentAt: '2026-05-18T08:20:00',
    viewedAt: '2026-05-18T10:00:00',
    submittedAt: '2026-05-19T12:40:00',
    uniqueUrl: '/rfq/fornecedor/atlas-rfq-102'
  },
  {
    id: 'inv-102-2',
    processId: 'rfq-102',
    companyId: 'co-04',
    token: 'horizonte-rfq-102',
    status: 'Quoted',
    quotedItems: 2,
    sentAt: '2026-05-18T08:25:00',
    viewedAt: '2026-05-18T10:35:00',
    submittedAt: '2026-05-20T17:05:00',
    uniqueUrl: '/rfq/fornecedor/horizonte-rfq-102'
  },
  {
    id: 'inv-103-1',
    processId: 'rfq-103',
    companyId: 'co-04',
    token: 'horizonte-rfq-103',
    status: 'Sent',
    quotedItems: 0,
    sentAt: '2026-05-26T14:00:00',
    uniqueUrl: '/rfq/fornecedor/horizonte-rfq-103'
  }
];

export const initialQuotes: RFQQuote[] = [
  { id: 'qt-1', processId: 'rfq-101', companyId: 'co-01', itemId: 'pi-101-1', price: 901, attachmentName: 'proposta-nexo.pdf' },
  { id: 'qt-2', processId: 'rfq-101', companyId: 'co-01', itemId: 'pi-101-2', price: 116.5 },
  { id: 'qt-3', processId: 'rfq-101', companyId: 'co-01', itemId: 'pi-101-3', price: 72.4 },
  { id: 'qt-4', processId: 'rfq-101', companyId: 'co-02', itemId: 'pi-101-1', price: 928 },
  { id: 'qt-5', processId: 'rfq-102', companyId: 'co-02', itemId: 'pi-102-1', price: 206 },
  { id: 'qt-6', processId: 'rfq-102', companyId: 'co-02', itemId: 'pi-102-2', price: 37.2 },
  { id: 'qt-7', processId: 'rfq-102', companyId: 'co-04', itemId: 'pi-102-1', price: 199.8 },
  { id: 'qt-8', processId: 'rfq-102', companyId: 'co-04', itemId: 'pi-102-2', price: 39.1 },
  { id: 'qt-9', processId: 'rfq-104', companyId: 'co-01', itemId: 'pi-104-1', price: 2870 },
  { id: 'qt-10', processId: 'rfq-104', companyId: 'co-01', itemId: 'pi-104-2', price: 1098 }
];

export const initialNotifications: RFQNotificationItem[] = [
  {
    id: 'nt-1',
    processId: 'rfq-101',
    title: 'Novo processo enviado',
    message: 'Nexo Industrial recebeu o link único do processo RFQ Sensores de nível.',
    createdAt: '2026-05-23T09:01:00',
    audience: 'Supplier',
    type: 'NewProcess'
  },
  {
    id: 'nt-2',
    processId: 'rfq-102',
    title: 'Proposta recebida',
    message: 'Horizonte Naval concluiu o envio da proposta para RFQ Conectores blindados.',
    createdAt: '2026-05-20T17:06:00',
    audience: 'Buyer',
    type: 'Submission'
  },
  {
    id: 'nt-3',
    processId: 'rfq-103',
    title: 'Prazo próximo do vencimento',
    message: 'Faltam menos de 72 horas para encerrar RFQ Jogo de válvulas.',
    createdAt: '2026-05-28T08:30:00',
    audience: 'Buyer',
    type: 'Deadline'
  }
];

export const initialHistory: RFQHistoryRecord[] = [
  {
    id: 'hist-01',
    title: 'RFQ Painéis de comando',
    closedAt: '2026-02-18',
    winningSupplier: 'Nexo Industrial',
    savings: 16.8,
    validUntil: '2026-08-18',
    itemCount: 5,
    department: 'Sistemas Embarcados'
  },
  {
    id: 'hist-02',
    title: 'RFQ Cabos galvanizados',
    closedAt: '2026-03-02',
    winningSupplier: 'Atlas Insumos',
    savings: 11.4,
    validUntil: '2026-09-02',
    itemCount: 8,
    department: 'Infraestrutura'
  },
  {
    id: 'hist-03',
    title: 'RFQ Selagem de convés',
    closedAt: '2026-04-11',
    winningSupplier: 'Horizonte Naval',
    savings: 14.1,
    validUntil: '2026-10-11',
    itemCount: 6,
    department: 'Operações Navais'
  }
];

export const initialMessages: RFQChatMessage[] = [
  {
    id: 'msg-1',
    processId: 'rfq-101',
    companyId: 'co-01',
    author: 'Comprador RFQ',
    side: 'Buyer',
    message: 'Favor confirmar se o prazo de entrega permanece em 18 dias.',
    createdAt: '2026-05-23T13:00:00'
  },
  {
    id: 'msg-2',
    processId: 'rfq-101',
    companyId: 'co-01',
    author: 'Marta Ferreira',
    side: 'Supplier',
    message: 'Prazo confirmado. Podemos antecipar lote parcial em 12 dias.',
    createdAt: '2026-05-23T13:18:00'
  },
  {
    id: 'msg-3',
    processId: 'rfq-102',
    companyId: 'co-04',
    author: 'Assistente IA',
    side: 'AI',
    message: 'A proposta enviada ficou 3,0% abaixo da última referência válida.',
    createdAt: '2026-05-20T17:10:00'
  }
];

export function buildRfqAiSummary(
  processes: RFQProcess[],
  companies: RFQCompany[],
  invitations: RFQSupplierInvitation[] = [],
  quotes: RFQQuote[] = [],
  prompt?: string
): RfqAiInsight {
  const total = processes.length;
  const highRisk = processes.filter((item) => item.riskLevel === 'High').length;
  const inNegotiation = processes.filter((item) => item.status === 'Negotiation').length;
  const avgSavings =
    total === 0
      ? 0
      : processes.reduce((acc, item) => acc + item.savingsPotential, 0) / total;

  const pendingCompanies = companies.filter((item) => item.status === 'Pending').length;
  const quotedInvitations = invitations.filter((item) => item.status === 'Quoted').length;
  const responseRate = invitations.length === 0 ? 0 : (quotedInvitations / invitations.length) * 100;
  const quotedItems = quotes.length;

  const customFocus = prompt?.trim()
    ? `Foco solicitado: ${prompt.trim()}. `
    : '';

  const headline = highRisk > 0
    ? 'Atenção em processos de risco alto'
    : 'Pipeline RFQ estável e saudável';

  const summary = `${customFocus}Há ${total} processos ativos, com ${inNegotiation} em negociação, taxa de resposta de ${responseRate.toFixed(0)}% e ${quotedItems} preços já coletados. A economia potencial média está em ${avgSavings.toFixed(1)}%. ${highRisk > 0 ? `Foram identificados ${highRisk} processos críticos que exigem mitigação imediata.` : 'Nenhum processo crítico foi detectado no ciclo atual.'} ${pendingCompanies > 0 ? `Existem ${pendingCompanies} empresas com aprovação pendente.` : 'Todas as empresas estratégicas estão aprovadas.'}`;

  const actions: string[] = [
    highRisk > 0
      ? 'Priorizar revisão técnica dos processos com risco alto nas próximas 24 horas.'
      : 'Manter rotina semanal de auditoria de conformidade com fornecedores.',
    inNegotiation > 0
      ? 'Consolidar histórico de propostas para acelerar fechamento dos processos em negociação.'
      : 'Abrir nova rodada de RFQs para itens com maior variação de preço no trimestre.',
    pendingCompanies > 0
      ? 'Concluir diligência de cadastro para eliminar gargalos de homologação.'
      : 'Atualizar scorecards de desempenho e lead time dos parceiros aprovados.'
  ];

  return { headline, summary, actions };
}

export function getProcessMetrics(processId: string, invitations: RFQSupplierInvitation[]) {
  const related = invitations.filter((item) => item.processId === processId);
  const responded = related.filter((item) => item.status === 'Quoted').length;
  const viewed = related.filter((item) => item.status === 'Viewed').length;
  const pending = related.length - responded;

  return {
    invited: related.length,
    responded,
    viewed,
    pending,
    responseRate: related.length === 0 ? 0 : (responded / related.length) * 100
  };
}

export function getComparativeMap(
  processId: string,
  processItems: RFQProcessItem[],
  invitations: RFQSupplierInvitation[],
  quotes: RFQQuote[]
): RFQComparativeRow[] {
  const invitedSuppliers = invitations.filter((item) => item.processId === processId);

  return processItems
    .filter((item) => item.processId === processId)
    .map((item) => {
      const prices = invitedSuppliers.map((supplier) => {
        const quote = quotes.find(
          (entry) =>
            entry.processId === processId &&
            entry.companyId === supplier.companyId &&
            entry.itemId === item.id
        );

        return {
          companyId: supplier.companyId,
          price: quote?.price ?? null
        };
      });

      const bestPrice = prices
        .filter((entry) => entry.price !== null)
        .reduce<number | null>((best, entry) => {
          if (entry.price === null) return best;
          if (best === null || entry.price < best) return entry.price;
          return best;
        }, null);

      return {
        itemId: item.id,
        description: `${item.sku} - ${item.description}`,
        preferredSupplier: item.preferredSupplier,
        historicalReference: item.historicalReference,
        bestPrice,
        prices
      };
    });
}

export function answerRfqQuestion(
  question: string,
  companies: RFQCompany[],
  processes: RFQProcess[],
  processItems: RFQProcessItem[],
  invitations: RFQSupplierInvitation[],
  quotes: RFQQuote[]
) {
  const normalized = question.toLowerCase();

  if (normalized.includes('competitiv') || normalized.includes('melhor fornecedor')) {
    const averageByCompany = companies
      .map((company) => {
        const companyQuotes = quotes.filter((quote) => quote.companyId === company.id);
        const average =
          companyQuotes.length === 0
            ? Number.POSITIVE_INFINITY
            : companyQuotes.reduce((acc, quote) => acc + quote.price, 0) / companyQuotes.length;

        return { company, average, totalQuotes: companyQuotes.length };
      })
      .filter((item) => Number.isFinite(item.average))
      .sort((a, b) => a.average - b.average)[0];

    return averageByCompany
      ? `${averageByCompany.company.name} aparece como fornecedor mais competitivo no conjunto atual, com média de R$ ${averageByCompany.average.toFixed(2)} em ${averageByCompany.totalQuotes} preços enviados.`
      : 'Ainda não há propostas suficientes para ranquear competitividade dos fornecedores.';
  }

  if (normalized.includes('dispers') || normalized.includes('varia')) {
    const comparativeRows = processes.flatMap((process) =>
      getComparativeMap(process.id, processItems, invitations, quotes)
    );

    const ranked = comparativeRows
      .map((row) => {
        const values = row.prices
          .map((entry) => entry.price)
          .filter((entry): entry is number => entry !== null);

        if (values.length < 2) {
          return { row, spread: -1 };
        }

        return { row, spread: Math.max(...values) - Math.min(...values) };
      })
      .sort((a, b) => b.spread - a.spread)[0];

    return ranked && ranked.spread >= 0
      ? `${ranked.row.description} é o item com maior dispersão no momento, com diferença de R$ ${ranked.spread.toFixed(2)} entre a menor e a maior proposta.`
      : 'Ainda não há variação suficiente registrada para calcular dispersão relevante entre propostas.';
  }

  if (normalized.includes('prazo') || normalized.includes('venc')) {
    const nextProcess = [...processes].sort(
      (a, b) => Date.parse(a.deadline) - Date.parse(b.deadline)
    )[0];

    return nextProcess
      ? `${nextProcess.title} é o processo com vencimento mais próximo, previsto para ${new Date(nextProcess.deadline).toLocaleDateString('pt-BR')}.`
      : 'Nenhum processo com prazo definido foi encontrado.';
  }

  return 'A IA pode responder sobre competitividade de fornecedores, dispersão de preços, prazo, taxa de resposta e oportunidades de reaproveitamento histórico.';
}
