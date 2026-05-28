import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileSpreadsheet, Link2, PlusCircle, SendHorizontal } from 'lucide-react';
import { getComparativeMap, getProcessMetrics } from './data';
import { useRFQContext } from './RFQLayout';
import { RFQInputMode } from './types';

function parseDraftItems(
  source: string,
  catalog: Array<{
    sku: string;
    description: string;
    preferredSupplier: string;
    lastValidPrice?: number;
    lastValidDate?: string;
    unit?: string;
  }>
) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [skuRaw, descriptionRaw, quantityRaw, unitRaw, targetPriceRaw] = line
        .split(/[|;,]/)
        .map((part) => part.trim());

      const catalogItem = catalog.find((item) => item.sku === skuRaw);
      const sku = skuRaw || `RFQ-${index + 1}`;
      const description = descriptionRaw || catalogItem?.description || `Item ${index + 1}`;

      return {
        sku,
        description,
        quantity: Number(quantityRaw || 1),
        unit: unitRaw || catalogItem?.unit || 'un',
        targetPrice: Number(targetPriceRaw || catalogItem?.lastValidPrice || 0),
        preferredSupplier: catalogItem?.preferredSupplier || 'A definir',
        historicalReference:
          catalogItem?.lastValidPrice && catalogItem?.lastValidDate
            ? `R$ ${catalogItem.lastValidPrice.toFixed(2)} em ${catalogItem.lastValidDate}`
            : 'Sem histórico recente'
      };
    });
}

function formatRemaining(deadline: string, now: number) {
  const target = new Date(`${deadline}T23:59:59`).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return 'Encerrado';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return `${days}d ${hours}h ${minutes}m`;
}

export default function RFQProcessos() {
  const {
    user,
    companies,
    items,
    processes,
    processItems,
    invitations,
    quotes,
    notifications,
    addCompany,
    addProcess
  } = useRFQContext();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Compras Estratégicas');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [inputMode, setInputMode] = useState<RFQInputMode>('Manual');
  const [draftLines, setDraftLines] = useState(
    'SNS-990 | Sensor digital de pressão | 10 | un | 895\nCAB-210 | Chicote blindado 5m | 24 | un | 118'
  );
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(['co-01', 'co-02']);
  const [quickCompanyName, setQuickCompanyName] = useState('');
  const [quickCompanyEmail, setQuickCompanyEmail] = useState('');
  const [quickCompanyCnpj, setQuickCompanyCnpj] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState(processes[0]?.id ?? '');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedProcessId && processes.length > 0) {
      setSelectedProcessId(processes[0].id);
    }
  }, [processes, selectedProcessId]);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );

  const selectedProcess = processes.find((process) => process.id === selectedProcessId) ?? processes[0];
  const selectedInvitations = invitations.filter(
    (invitation) => invitation.processId === selectedProcess?.id
  );
  const selectedComparative = selectedProcess
    ? getComparativeMap(selectedProcess.id, processItems, invitations, quotes)
    : [];
  const selectedNotifications = notifications.filter(
    (notification) => notification.processId === selectedProcess?.id
  );
  const selectedMetrics = selectedProcess
    ? getProcessMetrics(selectedProcess.id, invitations)
    : { invited: 0, responded: 0, viewed: 0, pending: 0, responseRate: 0 };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleSupplierToggle = (companyId: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((item) => item !== companyId)
        : [...prev, companyId]
    );
  };

  const handleQuickSupplier = () => {
    if (!quickCompanyName.trim() || !quickCompanyEmail.trim()) {
      return;
    }

    const companyId = addCompany({
      name: quickCompanyName.trim(),
      cnpj: quickCompanyCnpj.trim(),
      email: quickCompanyEmail.trim(),
      contactName: quickCompanyName.trim(),
      segment: 'Cadastro rápido RFQ',
      rating: 4,
      status: 'Approved',
      leadTimeDays: 15,
      preferredCategories: []
    });

    setSelectedSupplierIds((prev) => [...new Set([...prev, companyId])]);
    setQuickCompanyName('');
    setQuickCompanyEmail('');
    setQuickCompanyCnpj('');
  };

  const handleSubmit = () => {
    const parsedItems = parseDraftItems(draftLines, items);

    if (!title.trim() || parsedItems.length === 0 || selectedSupplierIds.length === 0) {
      return;
    }

    const processId = addProcess({
      title: title.trim(),
      department: department.trim(),
      deadline,
      inputMode,
      supplierIds: selectedSupplierIds,
      items: parsedItems
    });

    setSelectedProcessId(processId);
    setTitle('');
    setDepartment('Compras Estratégicas');
    setInputMode('Manual');
    setDraftLines('');
    setSelectedSupplierIds([]);
  };

  return (
    <div className="rfq-process-shell">
      <section className="rfq-panel">
        <div className="rfq-panel-title">
          <h2>Abrir novo processo RFQ</h2>
          <span>Manual ou importação de planilha</span>
        </div>

        <div className="rfq-form">
          <div className="rfq-form-inline">
            <label>
              Título do processo
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: RFQ Sensores de pressão" />
            </label>
            <label>
              Área solicitante
              <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Ex.: Operações Navais" />
            </label>
            <label>
              Comprador responsável
              <input value={user.nome} readOnly />
            </label>
          </div>

          <div className="rfq-form-inline">
            <label>
              Prazo final
              <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
            </label>
            <label>
              Modo de entrada
              <select value={inputMode} onChange={(event) => setInputMode(event.target.value as RFQInputMode)}>
                <option value="Manual">Manual</option>
                <option value="Spreadsheet">Spreadsheet</option>
              </select>
            </label>
            <label>
              Formato esperado
              <input value="SKU | Descrição | Quantidade | Unidade | Preço alvo" readOnly />
            </label>
          </div>

          <label>
            {inputMode === 'Manual' ? 'Itens digitados manualmente' : 'Cole o conteúdo da planilha'}
            <textarea
              value={draftLines}
              onChange={(event) => setDraftLines(event.target.value)}
              rows={7}
              placeholder="SKU | Descrição | Quantidade | Unidade | Preço alvo"
            />
          </label>

          <div className="rfq-grid-two">
            <section className="rfq-panel">
              <div className="rfq-inline-title">
                <SendHorizontal size={18} />
                <h2>Selecionar fornecedores</h2>
              </div>
              <div className="rfq-checkbox-grid">
                {companies.map((company) => (
                  <label key={company.id} className="rfq-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedSupplierIds.includes(company.id)}
                      onChange={() => handleSupplierToggle(company.id)}
                    />
                    <div>
                      <strong>{company.name}</strong>
                      <p>{company.email ?? 'Sem e-mail'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="rfq-panel">
              <div className="rfq-inline-title">
                <PlusCircle size={18} />
                <h2>Adicionar fornecedor no envio</h2>
              </div>
              <div className="rfq-form">
                <label>
                  Nome da empresa
                  <input value={quickCompanyName} onChange={(event) => setQuickCompanyName(event.target.value)} placeholder="Ex.: Nova Supply" />
                </label>
                <div className="rfq-form-inline">
                  <label>
                    E-mail
                    <input value={quickCompanyEmail} onChange={(event) => setQuickCompanyEmail(event.target.value)} placeholder="propostas@novasupply.com" />
                  </label>
                  <label>
                    CNPJ
                    <input value={quickCompanyCnpj} onChange={(event) => setQuickCompanyCnpj(event.target.value)} placeholder="00.000.000/0000-00" />
                  </label>
                </div>
                <button type="button" className="rfq-button" onClick={handleQuickSupplier}>
                  <PlusCircle size={14} />
                  Incluir fornecedor e selecionar
                </button>
              </div>
            </section>
          </div>

          <button type="button" className="rfq-button" onClick={handleSubmit}>
            {inputMode === 'Spreadsheet' ? <FileSpreadsheet size={14} /> : <CalendarClock size={14} />}
            Criar processo e gerar links únicos
          </button>
        </div>
      </section>

      <div className="rfq-grid-two">
        <section className="rfq-panel">
          <div className="rfq-panel-title">
            <h2>Processos ativos</h2>
            <span>Clique para acompanhar</span>
          </div>
          <div className="rfq-process-list">
            {processes.map((process) => {
              const metrics = getProcessMetrics(process.id, invitations);

              return (
                <button
                  key={process.id}
                  type="button"
                  className={`rfq-process-card ${selectedProcess?.id === process.id ? 'rfq-process-card-active' : ''}`}
                  onClick={() => setSelectedProcessId(process.id)}
                >
                  <div className="rfq-process-header">
                    <strong>{process.title}</strong>
                    <span className="rfq-status rfq-status-neutral">{process.status}</span>
                  </div>
                  <p>{process.department ?? process.company}</p>
                  <div className="rfq-process-meta">
                    <span>{new Date(process.deadline).toLocaleDateString('pt-BR')}</span>
                    <span>{metrics.responded}/{metrics.invited} responderam</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rfq-panel">
          <div className="rfq-panel-title">
            <h2>Acompanhamento do processo</h2>
            <span>{selectedProcess?.title ?? 'Nenhum processo selecionado'}</span>
          </div>
          {selectedProcess ? (
            <>
              <div className="rfq-kpis-row">
                <article>
                  <p>Convites enviados</p>
                  <strong>{selectedMetrics.invited}</strong>
                </article>
                <article>
                  <p>Respostas recebidas</p>
                  <strong>{selectedMetrics.responded}</strong>
                </article>
                <article>
                  <p>Taxa de resposta</p>
                  <strong>{selectedMetrics.responseRate.toFixed(0)}%</strong>
                </article>
                <article>
                  <p>Cronômetro</p>
                  <strong>{formatRemaining(selectedProcess.deadline, now)}</strong>
                </article>
              </div>

              <section className="rfq-panel">
                <div className="rfq-inline-title">
                  <Link2 size={18} />
                  <h2>Links únicos por fornecedor</h2>
                </div>
                <div className="rfq-link-grid">
                  {selectedInvitations.map((invitation) => (
                    <article key={invitation.id} className="rfq-link-card">
                      <strong>{companyMap.get(invitation.companyId)?.name ?? invitation.companyId}</strong>
                      <p>{companyMap.get(invitation.companyId)?.cnpj ?? '-'}</p>
                      <a href={`${origin}${invitation.uniqueUrl}`} target="_blank" rel="noreferrer">
                        {`${origin}${invitation.uniqueUrl}`}
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <p className="rfq-empty-state">Selecione um processo para ver detalhes.</p>
          )}
        </section>
      </div>

      {selectedProcess && (
        <div className="rfq-grid-two">
          <section className="rfq-panel">
            <div className="rfq-panel-title">
              <h2>Mapa comparativo de preços</h2>
              <span>Menor preço destacado por item</span>
            </div>
            <div className="rfq-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    {selectedInvitations.map((invitation) => (
                      <th key={invitation.id}>{companyMap.get(invitation.companyId)?.name ?? invitation.companyId}</th>
                    ))}
                    <th>Melhor valor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedComparative.map((row) => (
                    <tr key={row.itemId}>
                      <td>
                        <strong>{row.description}</strong>
                        <div className="rfq-subtle-text">{row.historicalReference}</div>
                      </td>
                      {row.prices.map((price) => (
                        <td key={`${row.itemId}-${price.companyId}`} className={price.price !== null && price.price === row.bestPrice ? 'rfq-best-cell' : ''}>
                          {price.price !== null ? `R$ ${price.price.toFixed(2)}` : 'Aguardando'}
                        </td>
                      ))}
                      <td className="rfq-best-cell">{row.bestPrice !== null ? `R$ ${row.bestPrice.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rfq-panel">
            <div className="rfq-inline-title">
              <CalendarClock size={18} />
              <h2>Notificações e auditoria</h2>
            </div>
            <ul className="rfq-list">
              {selectedNotifications.map((notification) => (
                <li key={notification.id}>
                  <span>{notification.message}</span>
                  <strong>{new Date(notification.createdAt).toLocaleDateString('pt-BR')}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}