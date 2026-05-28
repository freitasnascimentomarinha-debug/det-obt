import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { useRFQContext } from './RFQLayout';

export default function RFQHistorico() {
  const { history, items } = useRFQContext();
  const [query, setQuery] = useState('');

  const filteredHistory = useMemo(() => {
    const normalized = query.toLowerCase();

    return history.filter(
      (entry) =>
        entry.title.toLowerCase().includes(normalized) ||
        entry.department.toLowerCase().includes(normalized) ||
        entry.winningSupplier.toLowerCase().includes(normalized)
    );
  }, [history, query]);

  const reusablePrices = useMemo(() => {
    const today = Date.now();
    const sixMonths = 1000 * 60 * 60 * 24 * 180;

    return items.filter((item) => {
      if (!item.lastValidDate) {
        return false;
      }

      return today - Date.parse(item.lastValidDate) <= sixMonths;
    });
  }, [items]);

  return (
    <div className="rfq-stack">
      <section className="rfq-panel">
        <div className="rfq-panel-title">
          <h2>Banco histórico de cotações</h2>
          <span>Pesquisa e reaproveitamento dos últimos 6 meses</span>
        </div>
        <div className="rfq-ai-input-wrap">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por processo, área ou fornecedor" />
          <button type="button">
            <Search size={14} />
            Filtrar
          </button>
        </div>
      </section>

      <div className="rfq-grid-two">
        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <History size={18} />
            <h2>Processos encerrados</h2>
          </div>
          <div className="rfq-history-card-grid">
            {filteredHistory.map((entry) => (
              <article key={entry.id} className="rfq-history-card">
                <strong>{entry.title}</strong>
                <p>{entry.department}</p>
                <div className="rfq-chip-stack">
                  <span className="rfq-soft-chip">Vencedor: {entry.winningSupplier}</span>
                  <span className="rfq-soft-chip">Economia: {entry.savings.toFixed(1)}%</span>
                  <span className="rfq-soft-chip">Válido até {new Date(entry.validUntil).toLocaleDateString('pt-BR')}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <Search size={18} />
            <h2>Preços válidos reutilizáveis</h2>
          </div>
          <div className="rfq-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Fornecedor preferencial</th>
                  <th>Último preço</th>
                  <th>Validade</th>
                </tr>
              </thead>
              <tbody>
                {reusablePrices.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.preferredSupplier}</td>
                    <td>{item.lastValidPrice ? `R$ ${item.lastValidPrice.toFixed(2)}` : '-'}</td>
                    <td>{item.lastValidDate ? new Date(item.lastValidDate).toLocaleDateString('pt-BR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}