import { useEffect, useMemo, useState } from 'react';
import { Clock3, MessageSquareMore, Paperclip, SendHorizontal } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  initialCompanies,
  initialInvitations,
  initialMessages,
  initialProcessItems,
  initialProcesses,
  initialQuotes
} from './data';

function getRemaining(deadline: string, now: number) {
  const diff = new Date(`${deadline}T23:59:59`).getTime() - now;

  if (diff <= 0) {
    return 'Prazo encerrado';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return `${days}d ${hours}h ${minutes}m restantes`;
}

export default function RFQSupplierPortal() {
  const { token } = useParams();
  const invitation = initialInvitations.find((item) => item.token === token);
  const process = initialProcesses.find((item) => item.id === invitation?.processId);
  const company = initialCompanies.find((item) => item.id === invitation?.companyId);
  const scopedItems = initialProcessItems.filter((item) => item.processId === process?.id);
  const existingQuotes = initialQuotes.filter(
    (item) => item.processId === process?.id && item.companyId === company?.id
  );
  const [now, setNow] = useState(Date.now());
  const [attachmentName, setAttachmentName] = useState(existingQuotes[0]?.attachmentName ?? '');
  const [chatInput, setChatInput] = useState('');
  const [submittedAt, setSubmittedAt] = useState(invitation?.submittedAt ?? '');
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      scopedItems.map((item) => {
        const quote = existingQuotes.find((entry) => entry.itemId === item.id);
        return [item.id, quote ? quote.price.toString() : ''];
      })
    )
  );
  const [messages, setMessages] = useState(
    initialMessages.filter(
      (message) => message.processId === process?.id && message.companyId === company?.id
    )
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const expired = process ? new Date(`${process.deadline}T23:59:59`).getTime() <= now : true;
  const quotedCount = useMemo(
    () => Object.values(prices).filter((value) => Number(value) > 0).length,
    [prices]
  );

  if (!invitation || !process || !company) {
    return (
      <main className="rfq-supplier-shell">
        <section className="rfq-panel">
          <h1>Link inválido ou expirado</h1>
          <p className="rfq-subtle-text">
            Este acesso exclusivo do fornecedor não está disponível. Solicite um novo link ao comprador responsável.
          </p>
        </section>
      </main>
    );
  }

  const handleSubmitProposal = () => {
    if (expired) {
      return;
    }

    setSubmittedAt(new Date().toISOString());
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        processId: process.id,
        companyId: company.id,
        author: company.contactName ?? company.name,
        side: 'Supplier',
        message: chatInput.trim(),
        createdAt: new Date().toISOString()
      }
    ]);
    setChatInput('');
  };

  return (
    <main className="rfq-supplier-shell">
      <section className="rfq-supplier-hero">
        <span className="rfq-chip">Link único do fornecedor</span>
        <h1>{process.title}</h1>
        <div className="rfq-supplier-meta">
          <span>{company.name}</span>
          <span>{company.cnpj}</span>
          <span>{company.email}</span>
        </div>
        <div className="rfq-deadline-banner">
          <Clock3 size={16} />
          {getRemaining(process.deadline, now)}
        </div>
      </section>

      <div className="rfq-grid-two">
        <section className="rfq-panel">
          <div className="rfq-panel-title">
            <h2>Preencher proposta</h2>
            <span>{quotedCount}/{scopedItems.length} itens cotados</span>
          </div>
          <div className="rfq-price-grid">
            {scopedItems.map((item) => (
              <article key={item.id} className="rfq-price-card">
                <strong>{item.description}</strong>
                <p>{item.quantity} {item.unit} • Referência: {item.historicalReference}</p>
                <label>
                  Valor unitário
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices[item.id] ?? ''}
                    onChange={(event) =>
                      setPrices((prev) => ({
                        ...prev,
                        [item.id]: event.target.value
                      }))
                    }
                    disabled={expired}
                  />
                </label>
              </article>
            ))}
          </div>

          <div className="rfq-form">
            <label>
              Anexar proposta
              <input
                type="file"
                disabled={expired}
                onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? '')}
              />
            </label>
            {attachmentName && (
              <div className="rfq-file-meta">
                <Paperclip size={14} />
                {attachmentName}
              </div>
            )}
            <button type="button" className="rfq-button" onClick={handleSubmitProposal} disabled={expired}>
              <SendHorizontal size={14} />
              {submittedAt ? 'Atualizar proposta' : 'Enviar proposta'}
            </button>
            {submittedAt && (
              <p className="rfq-subtle-text">
                Proposta registrada em {new Date(submittedAt).toLocaleString('pt-BR')}.
              </p>
            )}
          </div>
        </section>

        <section className="rfq-panel">
          <div className="rfq-inline-title">
            <MessageSquareMore size={18} />
            <h2>Canal direto de negociação</h2>
          </div>
          <div className="rfq-chat-box">
            {messages.map((message) => (
              <article key={message.id} className={`rfq-chat-message rfq-chat-${message.side.toLowerCase()}`}>
                <strong className="rfq-chat-author">{message.author}</strong>
                <p>{message.message}</p>
                <span>{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
              </article>
            ))}
          </div>
          <div className="rfq-ai-input-wrap">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Escreva sua dúvida ou contraproposta"
              disabled={expired}
            />
            <button type="button" onClick={handleSendMessage} disabled={expired}>
              <SendHorizontal size={14} />
              Enviar
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}