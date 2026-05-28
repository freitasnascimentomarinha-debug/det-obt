import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { Bot, Building2, ClipboardList, Gauge, History, ReceiptText, Send, Sparkles, Workflow } from 'lucide-react';
import { Usuario } from '../../types';
import {
  answerRfqQuestion,
  buildRfqAiSummary,
  initialCompanies,
  initialHistory,
  initialInvitations,
  initialItems,
  initialMessages,
  initialNotifications,
  initialProcessItems,
  initialProcesses,
  initialQuotes
} from './data';
import {
  RFQChatMessage,
  RFQCompany,
  RFQHistoryRecord,
  RFQInputMode,
  RFQItem,
  RFQNotificationItem,
  RFQProcess,
  RFQProcessItem,
  RFQQuote,
  RFQSupplierInvitation,
  RfqAiInsight
} from './types';
import './rfq.css';

interface RFQLayoutProps {
  user: Usuario;
}

export interface RFQContext {
  user: Usuario;
  companies: RFQCompany[];
  items: RFQItem[];
  processes: RFQProcess[];
  processItems: RFQProcessItem[];
  invitations: RFQSupplierInvitation[];
  quotes: RFQQuote[];
  notifications: RFQNotificationItem[];
  history: RFQHistoryRecord[];
  messages: RFQChatMessage[];
  aiInsight: RfqAiInsight;
  aiPrompt: string;
  aiQuestion: string;
  aiAnswer: string;
  setAiPrompt: (value: string) => void;
  setAiQuestion: (value: string) => void;
  refreshAiSummary: () => void;
  askAiQuestion: (value?: string) => void;
  addCompany: (payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) => string;
  addItem: (payload: Omit<RFQItem, 'id'>) => void;
  addProcess: (payload: {
    title: string;
    department: string;
    deadline: string;
    inputMode: RFQInputMode;
    supplierIds: string[];
    items: Array<{
      sku: string;
      description: string;
      quantity: number;
      unit: string;
      targetPrice: number;
      preferredSupplier: string;
      historicalReference: string;
    }>;
  }) => string;
}

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  `rfq-nav-link ${isActive ? 'rfq-nav-link-active' : ''}`;

export function useRFQContext() {
  return useOutletContext<RFQContext>();
}

export default function RFQLayout({ user }: RFQLayoutProps) {
  const [companies, setCompanies] = useState<RFQCompany[]>(initialCompanies);
  const [items, setItems] = useState<RFQItem[]>(initialItems);
  const [processes, setProcesses] = useState<RFQProcess[]>(initialProcesses);
  const [processItems, setProcessItems] = useState<RFQProcessItem[]>(initialProcessItems);
  const [invitations, setInvitations] = useState<RFQSupplierInvitation[]>(initialInvitations);
  const [quotes] = useState<RFQQuote[]>(initialQuotes);
  const [notifications, setNotifications] = useState<RFQNotificationItem[]>(initialNotifications);
  const [history] = useState<RFQHistoryRecord[]>(initialHistory);
  const [messages] = useState<RFQChatMessage[]>(initialMessages);
  const [aiPrompt, setAiPrompt] = useState('Priorize riscos e oportunidades de economia.');
  const [aiQuestion, setAiQuestion] = useState('Quais fornecedores estão mais competitivos?');
  const [aiInsight, setAiInsight] = useState<RfqAiInsight>(() =>
    buildRfqAiSummary(initialProcesses, initialCompanies, initialInvitations, initialQuotes)
  );
  const [aiAnswer, setAiAnswer] = useState(() =>
    answerRfqQuestion(
      'Quais fornecedores estão mais competitivos?',
      initialCompanies,
      initialProcesses,
      initialProcessItems,
      initialInvitations,
      initialQuotes
    )
  );

  useEffect(() => {
    setAiInsight(buildRfqAiSummary(processes, companies, invitations, quotes, aiPrompt));
  }, [aiPrompt, companies, invitations, processes, quotes]);

  const addCompany = (payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) => {
    const companyId = `co-${Date.now()}`;

    setCompanies((prev) => [
      {
        ...payload,
        id: companyId,
        lastRFQ: new Date().toISOString().slice(0, 10)
      },
      ...prev
    ]);

    return companyId;
  };

  const addItem = (payload: Omit<RFQItem, 'id'>) => {
    setItems((prev) => [
      {
        ...payload,
        id: `it-${Date.now()}`
      },
      ...prev
    ]);
  };

  const refreshAiSummary = () => {
    setAiInsight(buildRfqAiSummary(processes, companies, invitations, quotes, aiPrompt));
  };

  const askAiQuestion = (value?: string) => {
    const nextQuestion = value ?? aiQuestion;
    setAiAnswer(
      answerRfqQuestion(nextQuestion, companies, processes, processItems, invitations, quotes)
    );
  };

  const addProcess = (payload: {
    title: string;
    department: string;
    deadline: string;
    inputMode: RFQInputMode;
    supplierIds: string[];
    items: Array<{
      sku: string;
      description: string;
      quantity: number;
      unit: string;
      targetPrice: number;
      preferredSupplier: string;
      historicalReference: string;
    }>;
  }) => {
    const processId = `rfq-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const firstCompany = companies.find((item) => item.id === payload.supplierIds[0]);

    const newProcess: RFQProcess = {
      id: processId,
      title: payload.title,
      buyer: user.nome,
      company: firstCompany?.name ?? 'Múltiplos fornecedores',
      department: payload.department,
      deadline: payload.deadline,
      status: 'Open',
      savingsPotential: Number((10 + payload.items.length * 1.4).toFixed(1)),
      riskLevel: payload.supplierIds.length >= 3 ? 'Low' : 'Medium',
      inputMode: payload.inputMode,
      createdAt: createdAt.slice(0, 10),
      totalItems: payload.items.length
    };

    const newProcessItems: RFQProcessItem[] = payload.items.map((item, index) => ({
      id: `${processId}-item-${index + 1}`,
      processId,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      targetPrice: item.targetPrice,
      preferredSupplier: item.preferredSupplier,
      historicalReference: item.historicalReference
    }));

    const newInvitations: RFQSupplierInvitation[] = payload.supplierIds.map((companyId, index) => ({
      id: `${processId}-inv-${index + 1}`,
      processId,
      companyId,
      token: `${processId}-${companyId}`,
      status: 'Sent',
      quotedItems: 0,
      sentAt: createdAt,
      uniqueUrl: `/rfq/fornecedor/${processId}-${companyId}`
    }));

    const buyerNotification: RFQNotificationItem = {
      id: `nt-${Date.now()}`,
      processId,
      title: 'Processo RFQ criado',
      message: `${payload.title} foi aberto com ${payload.supplierIds.length} fornecedores e ${payload.items.length} itens.`,
      createdAt: createdAt,
      audience: 'Buyer',
      type: 'NewProcess'
    };

    const supplierNotifications: RFQNotificationItem[] = newInvitations.map((invitation, index) => {
      const company = companies.find((item) => item.id === invitation.companyId);

      return {
        id: `nt-${Date.now()}-${index}`,
        processId,
        title: 'Link único enviado ao fornecedor',
        message: `${company?.name ?? 'Fornecedor'} recebeu acesso dedicado para enviar a proposta do processo ${payload.title}.`,
        createdAt: createdAt,
        audience: 'Supplier',
        type: 'NewProcess'
      };
    });

    setProcesses((prev) => [newProcess, ...prev]);
    setProcessItems((prev) => [...newProcessItems, ...prev]);
    setInvitations((prev) => [...newInvitations, ...prev]);
    setNotifications((prev) => [buyerNotification, ...supplierNotifications, ...prev]);

    return processId;
  };

  const summaryCards = useMemo(() => {
    const openProcesses = processes.filter((item) => item.status !== 'Awarded').length;
    const overallResponseRate =
      invitations.length === 0
        ? 0
        : Math.round(
            (invitations.filter((item) => item.status === 'Quoted').length / invitations.length) * 100
          );

    return [
      { label: 'Processos em andamento', value: openProcesses, icon: Workflow },
      { label: 'Links únicos enviados', value: invitations.length, icon: Send },
      { label: 'Itens rastreados', value: processItems.length, icon: ClipboardList },
      { label: 'Resposta consolidada', value: `${overallResponseRate}%`, icon: Gauge },
      { label: 'Histórico reaproveitável', value: history.length, icon: History },
      { label: 'Fornecedores homologados', value: companies.filter((item) => item.status === 'Approved').length, icon: Building2 },
      { label: 'Mapas comparativos ativos', value: processes.filter((item) => item.status !== 'Draft').length, icon: ReceiptText }
    ];
  }, [companies, history.length, invitations, processItems.length, processes]);

  const contextValue: RFQContext = {
    user,
    companies,
    items,
    processes,
    processItems,
    invitations,
    quotes,
    notifications,
    history,
    messages,
    aiInsight,
    aiPrompt,
    aiQuestion,
    aiAnswer,
    setAiPrompt,
    setAiQuestion,
    refreshAiSummary,
    askAiQuestion,
    addCompany,
    addItem,
    addProcess
  };

  return (
    <section className="rfq-root">
      <header className="rfq-hero">
        <div className="rfq-hero-content">
          <span className="rfq-chip">
            <Sparkles size={14} />
            Plataforma RFQ inteligente
          </span>
          <h1>Centro RFQ Corporativo</h1>
          <p>
            Gestão de cotação com visão executiva, cadastro estruturado e inteligência aplicada aos
            processos de suprimentos.
          </p>
          <div className="rfq-user-box">
            <Bot size={16} />
            IA assistindo {user.nome}
          </div>
        </div>
      </header>

      <div className="rfq-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="rfq-summary-card">
            <div>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
            </div>
            <card.icon size={18} />
          </article>
        ))}
      </div>

      <nav className="rfq-nav-shell" aria-label="Navegação RFQ">
        <NavLink to="/rfq" end className={linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/rfq/processos" className={linkStyle}>
          Processos RFQ
        </NavLink>
        <NavLink to="/rfq/empresas" className={linkStyle}>
          Cadastro de Empresas
        </NavLink>
        <NavLink to="/rfq/itens" className={linkStyle}>
          Cadastro de Itens
        </NavLink>
        <NavLink to="/rfq/ferramentas" className={linkStyle}>
          Ferramentas Gerenciais
        </NavLink>
        <NavLink to="/rfq/historico" className={linkStyle}>
          Histórico
        </NavLink>
      </nav>

      <Outlet context={contextValue} />
    </section>
  );
}
