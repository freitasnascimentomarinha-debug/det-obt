import { FormEvent, useMemo, useState } from 'react';
import { BadgeCheck, Building2, Filter } from 'lucide-react';
import { useRFQContext } from './RFQLayout';

export default function RFQEmpresas() {
  const { companies, addCompany } = useRFQContext();
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [segment, setSegment] = useState('');
  const [preferredCategories, setPreferredCategories] = useState('');
  const [rating, setRating] = useState('4.0');
  const [leadTimeDays, setLeadTimeDays] = useState('20');
  const [status, setStatus] = useState<'Approved' | 'Pending'>('Approved');

  const approvedCount = useMemo(
    () => companies.filter((item) => item.status === 'Approved').length,
    [companies]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !segment.trim() || !email.trim()) {
      return;
    }

    addCompany({
      name: name.trim(),
      cnpj: cnpj.trim(),
      email: email.trim(),
      contactName: contactName.trim(),
      segment: segment.trim(),
      preferredCategories: preferredCategories
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      rating: Number(rating),
      leadTimeDays: Number(leadTimeDays),
      status
    });

    setName('');
    setCnpj('');
    setEmail('');
    setContactName('');
    setSegment('');
    setPreferredCategories('');
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
          <div className="rfq-form-inline">
            <label>
              CNPJ
              <input value={cnpj} onChange={(event) => setCnpj(event.target.value)} placeholder="00.000.000/0000-00" />
            </label>
            <label>
              E-mail
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cotacoes@empresa.com" />
            </label>
            <label>
              Contato
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Nome do responsável" />
            </label>
          </div>
          <label>
            Segmento
            <input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Ex.: Componentes eletrônicos" />
          </label>
          <label>
            Categorias preferenciais
            <input value={preferredCategories} onChange={(event) => setPreferredCategories(event.target.value)} placeholder="Ex.: MRO, Eletrônica, Estrutural" />
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
                <th>CNPJ</th>
                <th>Contato</th>
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
                  <td>{company.cnpj ?? '-'}</td>
                  <td>
                    <div>
                      <strong>{company.contactName ?? '-'}</strong>
                      <p className="rfq-subtle-text">{company.email ?? '-'}</p>
                    </div>
                  </td>
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
