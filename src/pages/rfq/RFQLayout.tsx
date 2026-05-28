import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { Bot, Building2, ClipboardList, Gauge, History, ReceiptText, Send, Sparkles, Workflow } from 'lucide-react';
import { Usuario } from '../../types';
import {
  answerRfqQuestion,
  buildRfqAiSummary
} from './data';
import { createRFQCompany, createRFQItem, createRFQProcess, fetchRFQBootstrap } from './api';
import {
  RFQBootstrapPayload,
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
  schemaReady: boolean;
  isLoading: boolean;
  dataError: string | null;
  aiInsight: RfqAiInsight;
  aiPrompt: string;
  aiQuestion: string;
  aiAnswer: string;
  setAiPrompt: (value: string) => void;
  setAiQuestion: (value: string) => void;
  refreshAiSummary: () => void;
  askAiQuestion: (value?: string) => void;
  reloadData: () => Promise<void>;
  addCompany: (payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) => Promise<string>;
  addItem: (payload: Omit<RFQItem, 'id'>) => Promise<void>;
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
  }) => Promise<string>;
}

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  `rfq-nav-link ${isActive ? 'rfq-nav-link-active' : ''}`;

export function useRFQContext() {
  return useOutletContext<RFQContext>();
}

function emptyBootstrap(): RFQBootstrapPayload {
  return {
    schemaReady: true,
    companies: [],
    items: [],
    processes: [],
    processItems: [],
    invitations: [],
    quotes: [],
    messages: [],
    notifications: [],
    history: []
  };
}

export default function RFQLayout({ user }: RFQLayoutProps) {
  const [companies, setCompanies] = useState<RFQCompany[]>([]);
  const [items, setItems] = useState<RFQItem[]>([]);
  const [processes, setProcesses] = useState<RFQProcess[]>([]);
  const [processItems, setProcessItems] = useState<RFQProcessItem[]>([]);
  const [invitations, setInvitations] = useState<RFQSupplierInvitation[]>([]);
  const [quotes, setQuotes] = useState<RFQQuote[]>([]);
  const [notifications, setNotifications] = useState<RFQNotificationItem[]>([]);
  const [history, setHistory] = useState<RFQHistoryRecord[]>([]);
  const [messages, setMessages] = useState<RFQChatMessage[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('Priorize riscos e oportunidades de economia.');
  const [aiQuestion, setAiQuestion] = useState('Quais fornecedores estão mais competitivos?');
  const [aiInsight, setAiInsight] = useState<RfqAiInsight>(() => buildRfqAiSummary([], [], [], []));
  const [aiAnswer, setAiAnswer] = useState(() => answerRfqQuestion('Quais fornecedores estão mais competitivos?', [], [], [], [], []));

  const applyBootstrap = (payload: RFQBootstrapPayload) => {
    setCompanies(payload.companies);
    setItems(payload.items);
    setProcesses(payload.processes);
    setProcessItems(payload.processItems);
    setInvitations(payload.invitations);
    setQuotes(payload.quotes);
    setNotifications(payload.notifications);
    setHistory(payload.history);
    setMessages(payload.messages);
    setSchemaReady(payload.schemaReady);
  };

  const reloadData = async () => {
    setIsLoading(true);

    try {
      const payload = await fetchRFQBootstrap();
      applyBootstrap(payload);
      setDataError(
        payload.schemaReady
          ? null
          : 'Persistência RFQ indisponível até a execução de supabase-rfq-schema.sql no Supabase.'
      );
    } catch (error: any) {
      const fallback = emptyBootstrap();
      applyBootstrap(fallback);
      setDataError(error.message || 'Não foi possível carregar os dados do RFQ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reloadData();
  }, []);

  useEffect(() => {
    setAiInsight(buildRfqAiSummary(processes, companies, invitations, quotes, aiPrompt));
  }, [aiPrompt, companies, invitations, processes, quotes]);

  const addCompany = async (payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) => {
    const company = await createRFQCompany(payload);
    setCompanies((prev) => [company, ...prev]);
    return company.id;
  };

  const addItem = async (payload: Omit<RFQItem, 'id'>) => {
    const item = await createRFQItem(payload);
    setItems((prev) => [item, ...prev]);
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

  const addProcess = async (payload: {
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
    const response = await createRFQProcess({
      ...payload,
      buyerUserId: Number(user.id),
      buyerName: user.nome
    });

    applyBootstrap(response.bootstrap);
    return response.processId;
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
    schemaReady,
    isLoading,
    dataError,
    aiInsight,
    aiPrompt,
    aiQuestion,
    aiAnswer,
    setAiPrompt,
    setAiQuestion,
    refreshAiSummary,
    askAiQuestion,
    reloadData,
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

      {dataError && (
        <section className="rfq-panel">
          <div className="rfq-panel-title">
            <h2>Status da integração RFQ</h2>
            <span>{schemaReady ? 'Conectividade' : 'Schema pendente'}</span>
          </div>
          <p className="rfq-subtle-text">{dataError}</p>
        </section>
      )}

      {isLoading && (
        <section className="rfq-panel">
          <p className="rfq-subtle-text">Carregando dados reais do RFQ...</p>
        </section>
      )}

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
