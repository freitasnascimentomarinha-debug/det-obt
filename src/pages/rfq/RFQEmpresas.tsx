import { FormEvent, useMemo, useState } from 'react';
import { BadgeCheck, Building2, Filter } from 'lucide-react';
import { useRFQContext } from './RFQLayout';

export default function RFQEmpresas() {
  const { companies, addCompany } = useRFQContext();
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [rating, setRating] = useState('4.0');
  const [leadTimeDays, setLeadTimeDays] = useState('20');
  const [status, setStatus] = useState<'Approved' | 'Pending'>('Approved');

  const approvedCount = useMemo(
    () => companies.filter((item) => item.status === 'Approved').length,
    [companies]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !segment.trim()) {
      return;
    }

    addCompany({
      name: name.trim(),
      segment: segment.trim(),
      rating: Number(rating),
      leadTimeDays: Number(leadTimeDays),
      status
    });

    setName('');
    setSegment('');
    setRating('4.0');
    setLeadTimeDays('20');
    setStatus('Approved');
  };

  return (
    <div className="rfq-grid-two">
      <section className="rfq-panel">
        <div className="rfq-panel-title">
          <h2>Cadastro de empresas</h2>
          <span>Fornecedor homologado para RFQ</span>
        </div>
        <form className="rfq-form" onSubmit={handleSubmit}>
          <label>
            Empresa
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Horizonte Naval" />
          </label>
          <label>
            Segmento
            <input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Ex.: Componentes eletrônicos" />
          </label>
          <div className="rfq-form-inline">
            <label>
              Rating
              <input type="number" min="1" max="5" step="0.1" value={rating} onChange={(event) => setRating(event.target.value)} />
            </label>
            <label>
              Lead time (dias)
              <input type="number" min="1" value={leadTimeDays} onChange={(event) => setLeadTimeDays(event.target.value)} />
            </label>
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as 'Approved' | 'Pending')}>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
          </div>
          <button type="submit" className="rfq-button">
            <Building2 size={14} />
            Cadastrar empresa
          </button>
        </form>
      </section>

      <section className="rfq-panel">
        <div className="rfq-inline-title">
          <Filter size={18} />
          <h2>Base atual de empresas</h2>
        </div>
        <p className="rfq-subtle-text">
          {approvedCount} de {companies.length} empresas aprovadas para negociação direta.
        </p>
        <div className="rfq-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Segmento</th>
                <th>Rating</th>
                <th>Lead Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.name}</td>
                  <td>{company.segment}</td>
                  <td>{company.rating.toFixed(1)}</td>
                  <td>{company.leadTimeDays} dias</td>
                  <td>
                    <span className={`rfq-status ${company.status === 'Approved' ? 'rfq-status-ok' : 'rfq-status-warn'}`}>
                      <BadgeCheck size={12} />
                      {company.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
