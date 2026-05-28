import { useEffect, useMemo, useState } from 'react';
import { Clock3, MessageSquareMore, Paperclip, SendHorizontal } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createRFQSupplierMessage, fetchRFQSupplierPortal, submitRFQSupplierProposal } from './api';
import { RFQChatMessage, RFQCompany, RFQProcess, RFQProcessItem, RFQQuote, RFQSupplierInvitation } from './types';

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
  const [invitation, setInvitation] = useState<RFQSupplierInvitation | null>(null);
  const [process, setProcess] = useState<RFQProcess | null>(null);
  const [company, setCompany] = useState<RFQCompany | null>(null);
  const [scopedItems, setScopedItems] = useState<RFQProcessItem[]>([]);
  const [existingQuotes, setExistingQuotes] = useState<RFQQuote[]>([]);
  const [messages, setMessages] = useState<RFQChatMessage[]>([]);
  const [now, setNow] = useState(Date.now());
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadPortal() {
      if (!token) {
        setIsLoading(false);
        setErrorMessage('Token do fornecedor não informado.');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const payload = await fetchRFQSupplierPortal(token);
        setInvitation(payload.invitation);
        setProcess(payload.process);
        setCompany(payload.company);
        setScopedItems(payload.items);
        setExistingQuotes(payload.quotes);
        setMessages(payload.messages);
        setAttachmentName(payload.quotes[0]?.attachmentName || '');
        setSubmittedAt(payload.invitation.submittedAt || '');
        setPrices(
          Object.fromEntries(
            payload.items.map((item) => {
              const quote = payload.quotes.find((entry) => entry.itemId === item.id);
              return [item.id, quote ? quote.price.toString() : ''];
            })
          )
        );
      } catch (error: any) {
        setErrorMessage(error.message || 'Não foi possível carregar o portal do fornecedor.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadPortal();
  }, [token]);

  const expired = process ? new Date(`${process.deadline}T23:59:59`).getTime() <= now : true;
  const quotedCount = useMemo(
    () => Object.values(prices).filter((value) => Number(value) > 0).length,
    [prices]
  );

  if (isLoading) {
    return (
      <main className="rfq-supplier-shell">
        <section className="rfq-panel">
          <p className="rfq-subtle-text">Carregando link exclusivo do fornecedor...</p>
        </section>
      </main>
    );
  }

  if (!invitation || !process || !company) {
    return (
      <main className="rfq-supplier-shell">
        <section className="rfq-panel">
          <h1>Link inválido ou expirado</h1>
          <p className="rfq-subtle-text">
            {errorMessage || 'Este acesso exclusivo do fornecedor não está disponível. Solicite um novo link ao comprador responsável.'}
          </p>
        </section>
      </main>
    );
  }

  const handleSubmitProposal = async () => {
    if (expired || !token) {
      return;
    }

    const numericPrices = Object.fromEntries(
      Object.entries(prices)
        .map(([itemId, value]) => [itemId, Number(value)])
        .filter(([, value]) => Number.isFinite(value) && value > 0)
    );

    if (Object.keys(numericPrices).length === 0) {
      setErrorMessage('Informe pelo menos um valor antes de enviar a proposta.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let attachmentBase64: string | undefined;
      if (attachmentFile) {
        attachmentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Falha ao ler o anexo selecionado.'));
          reader.readAsDataURL(attachmentFile);
        });
      }

      const response = await submitRFQSupplierProposal(token, {
        prices: numericPrices,
        attachmentName: attachmentName || undefined,
        attachmentBase64
      });
      setSubmittedAt(response.submittedAt);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao enviar a proposta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !token) {
      return;
    }

    try {
      const message = await createRFQSupplierMessage(token, chatInput.trim());
      setMessages((prev) => [...prev, message]);
      setChatInput('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao enviar mensagem ao comprador.');
    }
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
          {errorMessage && <p className="rfq-subtle-text">{errorMessage}</p>}
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
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setAttachmentFile(file);
                  setAttachmentName(file?.name ?? existingQuotes[0]?.attachmentName ?? '');
                }}
              />
            </label>
            {attachmentName && (
              <div className="rfq-file-meta">
                <Paperclip size={14} />
                {attachmentName}
              </div>
            )}
            <button type="button" className="rfq-button" onClick={() => void handleSubmitProposal()} disabled={expired || isSubmitting}>
              <SendHorizontal size={14} />
              {isSubmitting ? 'Enviando...' : submittedAt ? 'Atualizar proposta' : 'Enviar proposta'}
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
            <button type="button" onClick={() => void handleSendMessage()} disabled={expired}>
              <SendHorizontal size={14} />
              Enviar
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}