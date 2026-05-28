import { RFQCompany, RFQItem, RFQProcess, RfqAiInsight } from './types';

export const initialCompanies: RFQCompany[] = [
  {
    id: 'co-01',
    name: 'Nexo Industrial',
    segment: 'Equipamentos',
    rating: 4.8,
    status: 'Approved',
    leadTimeDays: 19,
    lastRFQ: '2026-05-18'
  },
  {
    id: 'co-02',
    name: 'Atlas Insumos',
    segment: 'Matéria-prima',
    rating: 4.2,
    status: 'Approved',
    leadTimeDays: 26,
    lastRFQ: '2026-05-11'
  },
  {
    id: 'co-03',
    name: 'Porto Supply',
    segment: 'Logística',
    rating: 3.9,
    status: 'Pending',
    leadTimeDays: 31,
    lastRFQ: '2026-04-29'
  }
];

export const initialItems: RFQItem[] = [
  {
    id: 'it-01',
    sku: 'ALM-4420',
    description: 'Conjunto de vedação marítima',
    category: 'MRO',
    annualVolume: 1600,
    preferredSupplier: 'Nexo Industrial'
  },
  {
    id: 'it-02',
    sku: 'CAB-1890',
    description: 'Cabo de aço galvanizado 8mm',
    category: 'Estrutural',
    annualVolume: 4800,
    preferredSupplier: 'Atlas Insumos'
  },
  {
    id: 'it-03',
    sku: 'ELE-2207',
    description: 'Módulo de monitoramento remoto',
    category: 'Eletrônica',
    annualVolume: 220,
    preferredSupplier: 'Porto Supply'
  }
];

export const initialProcesses: RFQProcess[] = [
  {
    id: 'rfq-101',
    title: 'RFQ Sensores de nível',
    buyer: 'Equipe A-3',
    company: 'Nexo Industrial',
    deadline: '2026-06-08',
    status: 'In Review',
    savingsPotential: 12.4,
    riskLevel: 'Low'
  },
  {
    id: 'rfq-102',
    title: 'RFQ Conectores blindados',
    buyer: 'Equipe C-1',
    company: 'Atlas Insumos',
    deadline: '2026-06-03',
    status: 'Negotiation',
    savingsPotential: 18.1,
    riskLevel: 'Medium'
  },
  {
    id: 'rfq-103',
    title: 'RFQ Jogo de válvulas',
    buyer: 'Equipe B-4',
    company: 'Porto Supply',
    deadline: '2026-05-31',
    status: 'Draft',
    savingsPotential: 9.2,
    riskLevel: 'High'
  },
  {
    id: 'rfq-104',
    title: 'RFQ Bombas submersíveis',
    buyer: 'Equipe D-2',
    company: 'Nexo Industrial',
    deadline: '2026-06-19',
    status: 'Awarded',
    savingsPotential: 21.7,
    riskLevel: 'Low'
  }
];

export function buildRfqAiSummary(
  processes: RFQProcess[],
  companies: RFQCompany[],
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

  const customFocus = prompt?.trim()
    ? `Foco solicitado: ${prompt.trim()}. `
    : '';

  const headline = highRisk > 0
    ? 'Atenção em processos de risco alto'
    : 'Pipeline RFQ estável e saudável';

  const summary = `${customFocus}Há ${total} processos ativos, com ${inNegotiation} em negociação e economia potencial média de ${avgSavings.toFixed(1)}%. ${highRisk > 0 ? `Foram identificados ${highRisk} processos críticos que exigem mitigação imediata.` : 'Nenhum processo crítico foi detectado no ciclo atual.'} ${pendingCompanies > 0 ? `Existem ${pendingCompanies} empresas com aprovação pendente.` : 'Todas as empresas estratégicas estão aprovadas.'}`;

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
