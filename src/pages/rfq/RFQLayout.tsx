import { useMemo, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { Bot, Building2, ClipboardList, Gauge, Sparkles, Workflow } from 'lucide-react';
import { Usuario } from '../../types';
import { buildRfqAiSummary, initialCompanies, initialItems, initialProcesses } from './data';
import { RFQCompany, RFQItem, RFQProcess, RfqAiInsight } from './types';
import './rfq.css';

interface RFQLayoutProps {
  user: Usuario;
}

export interface RFQContext {
  user: Usuario;
  companies: RFQCompany[];
  items: RFQItem[];
  processes: RFQProcess[];
  aiInsight: RfqAiInsight;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  refreshAiSummary: () => void;
  addCompany: (payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) => void;
  addItem: (payload: Omit<RFQItem, 'id'>) => void;
}

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  `rfq-nav-link ${isActive ? 'rfq-nav-link-active' : ''}`;

export function useRFQContext() {
  return useOutletContext<RFQContext>();
}

export default function RFQLayout({ user }: RFQLayoutProps) {
  const [companies, setCompanies] = useState<RFQCompany[]>(initialCompanies);
  const [items, setItems] = useState<RFQItem[]>(initialItems);
  const [processes] = useState<RFQProcess[]>(initialProcesses);
  const [aiPrompt, setAiPrompt] = useState('Priorize riscos e oportunidades de economia.');
  const [aiInsight, setAiInsight] = useState<RfqAiInsight>(() =>
    buildRfqAiSummary(initialProcesses, initialCompanies)
  );

  const addCompany = (payload: Omit<RFQCompany, 'id' | 'lastRFQ'>) => {
    setCompanies((prev) => [
      {
        ...payload,
        id: `co-${Date.now()}`,
        lastRFQ: new Date().toISOString().slice(0, 10)
      },
      ...prev
    ]);
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
    setAiInsight(buildRfqAiSummary(processes, companies, aiPrompt));
  };

  const summaryCards = useMemo(() => {
    const openProcesses = processes.filter((item) => item.status !== 'Awarded').length;
    const approvedCompanies = companies.filter((item) => item.status === 'Approved').length;
    const avgLeadTime =
      companies.length === 0
        ? 0
        : Math.round(
            companies.reduce((acc, item) => acc + item.leadTimeDays, 0) / companies.length
          );

    return [
      { label: 'Processos em andamento', value: openProcesses, icon: Workflow },
      { label: 'Empresas aprovadas', value: approvedCompanies, icon: Building2 },
      { label: 'Itens estratégicos', value: items.length, icon: ClipboardList },
      { label: 'Lead time médio', value: `${avgLeadTime} dias`, icon: Gauge }
    ];
  }, [companies, items.length, processes]);

  const contextValue: RFQContext = {
    user,
    companies,
    items,
    processes,
    aiInsight,
    aiPrompt,
    setAiPrompt,
    refreshAiSummary,
    addCompany,
    addItem
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
        <NavLink to="/rfq/empresas" className={linkStyle}>
          Cadastro de Empresas
        </NavLink>
        <NavLink to="/rfq/itens" className={linkStyle}>
          Cadastro de Itens
        </NavLink>
        <NavLink to="/rfq/ferramentas" className={linkStyle}>
          Ferramentas Gerenciais
        </NavLink>
      </nav>

      <Outlet context={contextValue} />
    </section>
  );
}
