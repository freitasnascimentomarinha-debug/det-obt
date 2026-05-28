import { ArrowRight, BellRing, BrainCircuit, CircleDollarSign, MessagesSquare, WandSparkles } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getComparativeMap, getProcessMetrics } from './data';
import { useRFQContext } from './RFQLayout';

const statusPalette = ['#386641', '#6A994E', '#A7C957', '#F2E8CF', '#bc4749', '#588157'];

export default function RFQDashboard() {
  const {
    processes,
    processItems,
    invitations,
    quotes,
    notifications,
    history,
    aiInsight,
    aiPrompt,
    aiQuestion,
    aiAnswer,
    setAiPrompt,
    setAiQuestion,
    refreshAiSummary,
    askAiQuestion
  } = useRFQContext();

  const processByStatus = ['Draft', 'Open', 'In Review', 'Negotiation', 'Closed', 'Awarded'].map((status) => ({
    status,
    total: processes.filter((item) => item.status === status).length
  }));

  const responseSeries = processes.map((process) => ({
    name: process.title.replace('RFQ ', '').slice(0, 14),
    responseRate: Number(getProcessMetrics(process.id, invitations).responseRate.toFixed(0))
  }));

  const expectedSavings = processes.reduce((acc, item) => acc + item.savingsPotential, 0);
  const comparativeReady = processes.filter(
    (process) =>
      getComparativeMap(process.id, processItems, invitations, quotes).some((row) => row.bestPrice !== null)
  ).length;
  const latestNotifications = notifications.slice(0, 4);

  return (
    <div className="rfq-stack">
      <div className="rfq-grid-two">
        <section className="rfq-panel">
          <div className="rfq-panel-title">
            <h2>Pipeline de RFQ</h2>
            <span>Visão consolidada por etapa</span>
          </div>
          <div className="rfq-chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={processByStatus} dataKey="total" nameKey="status" innerRadius={65} outerRadius={95}>
                  {processByStatus.map((entry, index) => (
                    <Cell key={entry.status} fill={statusPalette[index % statusPalette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Processos']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rfq-panel">
          <div className="rfq-panel-title">
            <h2>Resposta em tempo real</h2>
            <span>Engajamento por processo</span>
          </div>
          <div className="rfq-chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={responseSeries}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Resposta']} />
                <Bar dataKey="responseRate" radius={[8, 8, 2, 2]} fill="#6A994E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="rfq-grid-two">
        <section className="rfq-panel rfq-panel-highlight">
          <div className="rfq-inline-title">
            <BrainCircuit size={18} />
            <h2>Assistente IA para Resumos</h2>
          </div>
          <p className="rfq-subtle-text">
            Gere análises executivas sobre prazo, risco, comparação de preços e fornecedores.
          </p>
          <div className="rfq-ai-input-wrap">
            <input
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="Ex.: Destaque processos com risco alto e baixa resposta"
            />
            <button type="button" onClick={refreshAiSummary}>
              <WandSparkles size={14} />
              Gerar com IA
            </button>
          </div>

          <article className="rfq-ai-result">
            <h3>{aiInsight.headline}</h3>
            <p>{aiInsight.summary}</p>
            <ul>
              {aiInsight.actions.map((action) => (
                <li key={action}>
                  <ArrowRight size={14} />
                  {action}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <MessagesSquare size={18} />
            <h2>Perguntas em linguagem natural</h2>
          </div>
          <p className="rfq-subtle-text">
            Exemplos: fornecedor mais competitivo, maior dispersão de preço, processo mais próximo do vencimento.
          </p>
          <div className="rfq-ai-input-wrap">
            <input
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              placeholder="Ex.: Qual item tem maior dispersão de preços?"
            />
            <button type="button" onClick={() => askAiQuestion()}>
              <BrainCircuit size={14} />
              Perguntar
            </button>
          </div>
          <article className="rfq-ai-result">
            <h3>Resposta da IA</h3>
            <p>{aiAnswer}</p>
          </article>
        </section>
      </div>

      <section className="rfq-panel">
        <div className="rfq-inline-title">
          <BellRing size={18} />
          <h2>Centro operacional</h2>
        </div>
        <div className="rfq-kpis-row">
          <article>
            <p>Economia potencial total</p>
            <strong>
              <CircleDollarSign size={14} />
              {expectedSavings.toFixed(1)}%
            </strong>
          </article>
          <article>
            <p>Mapas comparativos prontos</p>
            <strong>{comparativeReady}</strong>
          </article>
          <article>
            <p>Notificações recentes</p>
            <strong>{latestNotifications.length}</strong>
          </article>
          <article>
            <p>Históricos válidos para reaproveito</p>
            <strong>{history.length}</strong>
          </article>
        </div>
      </section>

      <section className="rfq-panel">
        <div className="rfq-inline-title">
          <BellRing size={18} />
          <h2>Notificações automáticas</h2>
        </div>
        <ul className="rfq-list">
          {latestNotifications.map((notification) => (
            <li key={notification.id}>
              <span>{notification.title}</span>
              <strong>{new Date(notification.createdAt).toLocaleDateString('pt-BR')}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
