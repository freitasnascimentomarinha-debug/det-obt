import { AlarmClock, Gauge, ListChecks, MessagesSquare } from 'lucide-react';
import { useRFQContext } from './RFQLayout';

export default function RFQFerramentas() {
  const { processes } = useRFQContext();

  const processNearDeadline = [...processes]
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))
    .slice(0, 3);

  const grouped = {
    draft: processes.filter((item) => item.status === 'Draft'),
    review: processes.filter((item) => item.status === 'In Review'),
    negotiation: processes.filter((item) => item.status === 'Negotiation'),
    awarded: processes.filter((item) => item.status === 'Awarded')
  };

  return (
    <div className="rfq-stack">
      <section className="rfq-panel">
        <div className="rfq-panel-title">
          <h2>Quadro gerencial de processos</h2>
          <span>Kanban executivo para governança RFQ</span>
        </div>

        <div className="rfq-kanban-grid">
          <article>
            <h3>Draft</h3>
            {grouped.draft.map((item) => (
              <div key={item.id} className="rfq-kanban-card">
                <strong>{item.title}</strong>
                <p>{item.buyer}</p>
              </div>
            ))}
          </article>
          <article>
            <h3>In Review</h3>
            {grouped.review.map((item) => (
              <div key={item.id} className="rfq-kanban-card">
                <strong>{item.title}</strong>
                <p>{item.company}</p>
              </div>
            ))}
          </article>
          <article>
            <h3>Negotiation</h3>
            {grouped.negotiation.map((item) => (
              <div key={item.id} className="rfq-kanban-card">
                <strong>{item.title}</strong>
                <p>Economia {item.savingsPotential.toFixed(1)}%</p>
              </div>
            ))}
          </article>
          <article>
            <h3>Awarded</h3>
            {grouped.awarded.map((item) => (
              <div key={item.id} className="rfq-kanban-card">
                <strong>{item.title}</strong>
                <p>Conclusão com {item.company}</p>
              </div>
            ))}
          </article>
        </div>
      </section>

      <div className="rfq-grid-two">
        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <AlarmClock size={18} />
            <h2>Prioridades da semana</h2>
          </div>
          <ul className="rfq-list">
            {processNearDeadline.map((item) => (
              <li key={item.id}>
                <span>{item.title}</span>
                <strong>{new Date(item.deadline).toLocaleDateString('pt-BR')}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <ListChecks size={18} />
            <h2>Checklist de governança</h2>
          </div>
          <ul className="rfq-checklist">
            <li>Conferir compliance documental de fornecedores críticos.</li>
            <li>Atualizar baseline de preço para itens de alto volume.</li>
            <li>Registrar justificativas dos desvios acima de 5%.</li>
            <li>Publicar resumo IA no comitê quinzenal de compras.</li>
          </ul>
        </section>
      </div>

      <div className="rfq-grid-two">
        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <MessagesSquare size={18} />
            <h2>Briefing rápido para stakeholders</h2>
          </div>
          <p className="rfq-subtle-text">
            “Mantemos foco em negociações com maior impacto financeiro, combinando velocidade de
            homologação e mitigação de risco de abastecimento.”
          </p>
        </section>

        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <Gauge size={18} />
            <h2>Indicador de maturidade RFQ</h2>
          </div>
          <div className="rfq-meter">
            <div className="rfq-meter-fill" style={{ width: '78%' }} />
            <span>78% - Operação em nível avançado</span>
          </div>
        </section>
      </div>
    </div>
  );
}
