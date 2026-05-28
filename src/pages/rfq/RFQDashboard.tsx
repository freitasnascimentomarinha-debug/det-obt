import { ArrowRight, AlertTriangle, BrainCircuit, CircleDollarSign, WandSparkles } from 'lucide-react';
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
import { useRFQContext } from './RFQLayout';

const statusPalette = ['#386641', '#6A994E', '#A7C957', '#F2E8CF'];

export default function RFQDashboard() {
  const { processes, aiInsight, aiPrompt, setAiPrompt, refreshAiSummary } = useRFQContext();

  const processByStatus = ['Draft', 'In Review', 'Negotiation', 'Awarded'].map((status) => ({
    status,
    total: processes.filter((item) => item.status === status).length
  }));

  const riskSeries = [
    { risk: 'Baixo', total: processes.filter((item) => item.riskLevel === 'Low').length },
    { risk: 'Médio', total: processes.filter((item) => item.riskLevel === 'Medium').length },
    { risk: 'Alto', total: processes.filter((item) => item.riskLevel === 'High').length }
  ];

  const highRisk = processes.filter((item) => item.riskLevel === 'High').length;
  const expectedSavings = processes.reduce((acc, item) => acc + item.savingsPotential, 0);

  return (
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
          <h2>Risco por processo</h2>
          <span>Concentração operacional</span>
        </div>
        <div className="rfq-chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskSeries}>
              <XAxis dataKey="risk" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[8, 8, 2, 2]} fill="#6A994E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rfq-panel rfq-panel-highlight">
        <div className="rfq-inline-title">
          <BrainCircuit size={18} />
          <h2>Assistente IA para Resumos</h2>
        </div>
        <p className="rfq-subtle-text">
          Digite um foco executivo e gere um resumo instantâneo para acompanhar o ciclo de compras.
        </p>
        <div className="rfq-ai-input-wrap">
          <input
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Ex.: Compare risco alto com potencial de economia"
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
          <AlertTriangle size={18} />
          <h2>Alertas e ganhos previstos</h2>
        </div>
        <div className="rfq-kpis-row">
          <article>
            <p>Processos com risco alto</p>
            <strong>{highRisk}</strong>
          </article>
          <article>
            <p>Economia potencial total</p>
            <strong>
              <CircleDollarSign size={14} />
              {expectedSavings.toFixed(1)}%
            </strong>
          </article>
        </div>
      </section>
    </div>
  );
}
