import { randomBytes } from 'crypto';
import type { Express, Request, Response } from 'express';

type SupabaseClientLike = any;

interface RegisterRfqRoutesOptions {
  app: Express;
  supabase: SupabaseClientLike;
  createNotification: (userId: number, type: string, content: string, link: string) => Promise<void>;
  logAuditoria: (
    usuarioId: number | null,
    acao: string,
    descricao: string,
    objetoAfetado?: string,
    nomeUsuario?: string
  ) => Promise<void>;
  uploadBase64ToStorage: (base64Data: string, bucket: string, path: string) => Promise<string | null>;
}

const missingTablePatterns = [
  'could not find the table',
  'relation',
  'does not exist',
  'pgrst205'
];

function isMissingTableError(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return missingTablePatterns.some((pattern) => message.includes(pattern));
}

function buildBaseUrl(req: Request) {
  const configured = process.env.RFQ_PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return `${req.protocol}://${req.get('host')}`;
}

function toStringId(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapCompany(row: any) {
  return {
    id: toStringId(row.id),
    name: row.name,
    cnpj: row.cnpj || '',
    email: row.email || '',
    contactName: row.contact_name || '',
    segment: row.segment || '',
    rating: Number(row.rating || 0),
    status: row.status || 'Pending',
    leadTimeDays: Number(row.lead_time_days || 0),
    lastRFQ: row.last_rfq || '',
    preferredCategories: parseJsonArray<string>(row.preferred_categories)
  };
}

function mapItem(row: any) {
  return {
    id: toStringId(row.id),
    sku: row.sku,
    description: row.description,
    category: row.category,
    annualVolume: Number(row.annual_volume || 0),
    unit: row.unit || 'un',
    preferredSupplier: row.preferred_supplier || '',
    lastValidPrice: row.last_valid_price !== null && row.last_valid_price !== undefined
      ? Number(row.last_valid_price)
      : undefined,
    lastValidDate: row.last_valid_date || undefined
  };
}

function mapProcess(row: any) {
  return {
    id: toStringId(row.id),
    title: row.title,
    buyer: row.buyer_name,
    company: row.primary_company_name || 'Múltiplos fornecedores',
    department: row.department || '',
    deadline: row.deadline,
    status: row.status,
    savingsPotential: Number(row.savings_potential || 0),
    riskLevel: row.risk_level || 'Medium',
    inputMode: row.input_mode || 'Manual',
    createdAt: row.created_at?.slice?.(0, 10) || row.created_at,
    totalItems: Number(row.total_items || 0),
    closedAt: row.closed_at || undefined,
    validityUntil: row.validity_until || undefined,
    createdByUserId: row.created_by_user_id ? Number(row.created_by_user_id) : undefined,
    winningSupplierCompanyId: row.winning_supplier_company_id
      ? toStringId(row.winning_supplier_company_id)
      : undefined
  };
}

function mapProcessItem(row: any) {
  return {
    id: toStringId(row.id),
    processId: toStringId(row.process_id),
    sku: row.sku,
    description: row.description,
    quantity: Number(row.quantity || 0),
    unit: row.unit || 'un',
    targetPrice: Number(row.target_price || 0),
    preferredSupplier: row.preferred_supplier || '',
    historicalReference: row.historical_reference || ''
  };
}

function mapInvitation(row: any) {
  return {
    id: toStringId(row.id),
    processId: toStringId(row.process_id),
    companyId: toStringId(row.company_id),
    token: row.token,
    status: row.status,
    quotedItems: Number(row.quoted_items || 0),
    sentAt: row.sent_at,
    viewedAt: row.viewed_at || undefined,
    submittedAt: row.submitted_at || undefined,
    uniqueUrl: row.unique_url
  };
}

function mapQuote(row: any) {
  return {
    id: toStringId(row.id),
    processId: toStringId(row.process_id),
    companyId: toStringId(row.company_id),
    itemId: toStringId(row.item_id),
    price: Number(row.price || 0),
    attachmentName: row.attachment_name || undefined,
    attachmentUrl: row.attachment_url || undefined
  };
}

function mapMessage(row: any) {
  return {
    id: toStringId(row.id),
    processId: toStringId(row.process_id),
    companyId: toStringId(row.company_id),
    author: row.author,
    side: row.side,
    message: row.message,
    createdAt: row.created_at
  };
}

function mapNotification(row: any) {
  return {
    id: toStringId(row.id),
    processId: row.process_id ? toStringId(row.process_id) : undefined,
    companyId: row.company_id ? toStringId(row.company_id) : undefined,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    audience: row.audience,
    type: row.type
  };
}

function generateHistory(processRows: any[], companyRows: any[]) {
  const companyById = new Map(companyRows.map((row) => [toStringId(row.id), row.name]));

  return processRows
    .filter((row) => row.status === 'Awarded' || row.status === 'Closed' || row.closed_at)
    .map((row) => ({
      id: toStringId(row.id),
      title: row.title,
      closedAt: row.closed_at || row.deadline,
      winningSupplier: row.winning_supplier_company_id
        ? companyById.get(toStringId(row.winning_supplier_company_id)) || row.primary_company_name || 'A definir'
        : row.primary_company_name || 'A definir',
      savings: Number(row.savings_potential || 0),
      validUntil: row.validity_until || row.deadline,
      itemCount: Number(row.total_items || 0),
      department: row.department || 'Não informado'
    }));
}

async function sendEmailViaProvider(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const from = process.env.RFQ_EMAIL_FROM || process.env.EMAIL_FROM;

  if (!from) {
    return { sent: false, provider: 'none', error: 'RFQ_EMAIL_FROM não configurado.' };
  }

  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text
      })
    });

    if (!response.ok) {
      return {
        sent: false,
        provider: 'resend',
        error: await response.text()
      };
    }

    return { sent: true, provider: 'resend' };
  }

  if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: from },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text
      })
    });

    if (!response.ok) {
      return {
        sent: false,
        provider: 'brevo',
        error: await response.text()
      };
    }

    return { sent: true, provider: 'brevo' };
  }

  return { sent: false, provider: 'none', error: 'Nenhum provedor de e-mail configurado.' };
}

async function loadRfqBootstrap(supabase: SupabaseClientLike) {
  const [companiesResult, itemsResult, processesResult, processItemsResult, invitationsResult, quotesResult, messagesResult, notificationsResult] = await Promise.all([
    supabase.from('rfq_companies').select('*').order('name'),
    supabase.from('rfq_items').select('*').order('description'),
    supabase.from('rfq_processes').select('*').order('created_at', { ascending: false }),
    supabase.from('rfq_process_items').select('*').order('id'),
    supabase.from('rfq_invitations').select('*').order('sent_at', { ascending: false }),
    supabase.from('rfq_quotes').select('*').order('updated_at', { ascending: false }),
    supabase.from('rfq_messages').select('*').order('created_at'),
    supabase.from('rfq_notifications').select('*').order('created_at', { ascending: false })
  ]);

  const error = [
    companiesResult.error,
    itemsResult.error,
    processesResult.error,
    processItemsResult.error,
    invitationsResult.error,
    quotesResult.error,
    messagesResult.error,
    notificationsResult.error
  ].find(Boolean);

  if (error) {
    if (isMissingTableError(error)) {
      return {
        schemaReady: false,
        companies: [],
        items: [],
        processes: [],
        processItems: [],
        invitations: [],
        quotes: [],
        messages: [],
        notifications: [],
        history: []
      };
    }
    throw error;
  }

  const companies = (companiesResult.data || []).map(mapCompany);
  const items = (itemsResult.data || []).map(mapItem);
  const processes = (processesResult.data || []).map(mapProcess);
  const processItems = (processItemsResult.data || []).map(mapProcessItem);
  const invitations = (invitationsResult.data || []).map(mapInvitation);
  const quotes = (quotesResult.data || []).map(mapQuote);
  const messages = (messagesResult.data || []).map(mapMessage);
  const notifications = (notificationsResult.data || []).map(mapNotification);
  const history = generateHistory(processesResult.data || [], companiesResult.data || []);

  return {
    schemaReady: true,
    companies,
    items,
    processes,
    processItems,
    invitations,
    quotes,
    messages,
    notifications,
    history
  };
}

export function registerRfqRoutes(options: RegisterRfqRoutesOptions) {
  const { app, supabase, createNotification, logAuditoria, uploadBase64ToStorage } = options;

  app.get('/api/rfq/bootstrap', async (req: Request, res: Response) => {
    try {
      const payload = await loadRfqBootstrap(supabase);
      res.json(payload);
    } catch (error: any) {
      console.error('Erro ao carregar bootstrap RFQ:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar módulo RFQ.' });
    }
  });

  app.post('/api/rfq/companies', async (req: Request, res: Response) => {
    try {
      const {
        name,
        cnpj,
        email,
        contactName,
        segment,
        rating,
        status,
        leadTimeDays,
        preferredCategories
      } = req.body;

      const { data, error } = await supabase
        .from('rfq_companies')
        .insert({
          name,
          cnpj: cnpj || null,
          email,
          contact_name: contactName || null,
          segment,
          rating,
          status,
          lead_time_days: leadTimeDays,
          last_rfq: new Date().toISOString().slice(0, 10),
          preferred_categories: preferredCategories || []
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(mapCompany(data));
    } catch (error: any) {
      console.error('Erro ao criar empresa RFQ:', error);
      res.status(400).json({ error: error.message || 'Erro ao salvar fornecedor RFQ.' });
    }
  });

  app.post('/api/rfq/items', async (req: Request, res: Response) => {
    try {
      const {
        sku,
        description,
        category,
        annualVolume,
        unit,
        preferredSupplier,
        lastValidPrice,
        lastValidDate
      } = req.body;

      const { data, error } = await supabase
        .from('rfq_items')
        .insert({
          sku,
          description,
          category,
          annual_volume: annualVolume,
          unit,
          preferred_supplier: preferredSupplier,
          last_valid_price: lastValidPrice ?? null,
          last_valid_date: lastValidDate || null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json(mapItem(data));
    } catch (error: any) {
      console.error('Erro ao criar item RFQ:', error);
      res.status(400).json({ error: error.message || 'Erro ao salvar item RFQ.' });
    }
  });

  app.post('/api/rfq/processes', async (req: Request, res: Response) => {
    try {
      const {
        title,
        department,
        deadline,
        inputMode,
        supplierIds,
        items,
        buyerUserId,
        buyerName
      } = req.body;

      if (!title || !deadline || !Array.isArray(supplierIds) || supplierIds.length === 0 || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Dados insuficientes para criar o processo RFQ.' });
      }

      const supplierIdsNumeric = supplierIds.map((item: string | number) => Number(item)).filter(Boolean);
      const { data: supplierRows, error: supplierError } = await supabase
        .from('rfq_companies')
        .select('*')
        .in('id', supplierIdsNumeric);

      if (supplierError) {
        throw supplierError;
      }

      const primaryCompanyName = supplierRows?.[0]?.name || 'Múltiplos fornecedores';
      const riskLevel = supplierIdsNumeric.length >= 3 ? 'Low' : supplierIdsNumeric.length === 2 ? 'Medium' : 'High';
      const savingsPotential = Number((10 + items.length * 1.35).toFixed(1));

      const { data: processRow, error: processError } = await supabase
        .from('rfq_processes')
        .insert({
          title,
          buyer_name: buyerName,
          created_by_user_id: buyerUserId || null,
          primary_company_name: primaryCompanyName,
          department,
          deadline,
          status: 'Open',
          savings_potential: savingsPotential,
          risk_level: riskLevel,
          input_mode: inputMode,
          total_items: items.length
        })
        .select()
        .single();

      if (processError) {
        throw processError;
      }

      const processId = Number(processRow.id);
      const processItemsPayload = items.map((item: any) => ({
        process_id: processId,
        sku: item.sku,
        description: item.description,
        quantity: Number(item.quantity || 0),
        unit: item.unit || 'un',
        target_price: Number(item.targetPrice || 0),
        preferred_supplier: item.preferredSupplier || null,
        historical_reference: item.historicalReference || null
      }));

      const { error: processItemsError } = await supabase.from('rfq_process_items').insert(processItemsPayload);
      if (processItemsError) {
        throw processItemsError;
      }

      const baseUrl = buildBaseUrl(req);
      const now = new Date().toISOString();
      const invitationsPayload = supplierRows.map((company: any) => {
        const token = randomBytes(18).toString('hex');
        return {
          process_id: processId,
          company_id: company.id,
          token,
          status: 'Sent',
          quoted_items: 0,
          sent_at: now,
          unique_url: `${baseUrl}/rfq/fornecedor/${token}`
        };
      });

      const { data: invitationRows, error: invitationError } = await supabase
        .from('rfq_invitations')
        .insert(invitationsPayload)
        .select();
      if (invitationError) {
        throw invitationError;
      }

      const notificationPayload = [
        {
          process_id: processId,
          title: 'Processo RFQ criado',
          message: `${title} foi aberto com ${supplierRows.length} fornecedores convidados.`,
          audience: 'Buyer',
          type: 'NewProcess'
        },
        ...supplierRows.map((company: any) => ({
          process_id: processId,
          company_id: company.id,
          title: 'Link único gerado',
          message: `Fornecedor ${company.name} recebeu um link exclusivo para responder ${title}.`,
          audience: 'Supplier',
          type: 'NewProcess'
        }))
      ];

      const { error: notificationError } = await supabase.from('rfq_notifications').insert(notificationPayload);
      if (notificationError) {
        throw notificationError;
      }

      const emailResults = await Promise.all(
        (invitationRows || []).map(async (invitation: any) => {
          const company = supplierRows.find((item: any) => item.id === invitation.company_id);
          const subject = `Novo RFQ disponível: ${title}`;
          const text = `Olá ${company?.contact_name || company?.name},\n\nUm novo processo RFQ foi aberto para sua empresa. Acesse o link único abaixo para enviar preços e proposta:\n${invitation.unique_url}\n\nPrazo final: ${new Date(deadline).toLocaleDateString('pt-BR')}.`;
          const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#102117">
              <h2 style="margin-bottom:12px;">Novo RFQ disponível</h2>
              <p>Olá <strong>${company?.contact_name || company?.name || 'fornecedor'}</strong>,</p>
              <p>Um novo processo de cotação foi aberto para sua empresa.</p>
              <p><strong>Processo:</strong> ${title}</p>
              <p><strong>Prazo final:</strong> ${new Date(deadline).toLocaleDateString('pt-BR')}</p>
              <p style="margin:20px 0;">
                <a href="${invitation.unique_url}" style="background:#8ebf65;color:#112010;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Abrir link exclusivo</a>
              </p>
              <p>O link já identifica sua empresa e permite enviar preços, anexos e mensagens.</p>
            </div>
          `;

          return {
            companyId: toStringId(company?.id),
            companyName: company?.name,
            ...(await sendEmailViaProvider({ to: company?.email, subject, text, html }))
          };
        })
      );

      if (buyerUserId) {
        await createNotification(
          Number(buyerUserId),
          'rfq',
          `Processo RFQ criado: ${title}. ${supplierRows.length} fornecedores convidados.`,
          '/rfq/processos'
        );
      }

      await logAuditoria(
        Number(buyerUserId || 0) || null,
        'RFQ Criado',
        `Processo ${title} criado com ${items.length} itens e ${supplierRows.length} fornecedores.`,
        String(processId),
        buyerName
      );

      const payload = await loadRfqBootstrap(supabase);
      res.json({
        processId: String(processId),
        emailResults,
        bootstrap: payload
      });
    } catch (error: any) {
      console.error('Erro ao criar processo RFQ:', error);
      res.status(400).json({ error: error.message || 'Erro ao criar processo RFQ.' });
    }
  });

  app.get('/api/rfq/fornecedor/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { data: invitation, error: invitationError } = await supabase
        .from('rfq_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (invitationError || !invitation) {
        return res.status(404).json({ error: 'Convite RFQ não encontrado.' });
      }

      const { data: processRow, error: processError } = await supabase
        .from('rfq_processes')
        .select('*')
        .eq('id', invitation.process_id)
        .single();

      if (processError || !processRow) {
        return res.status(404).json({ error: 'Processo RFQ não encontrado.' });
      }

      const deadlineExpired = new Date(`${processRow.deadline}T23:59:59`).getTime() <= Date.now();

      if (!invitation.viewed_at) {
        await supabase
          .from('rfq_invitations')
          .update({
            viewed_at: new Date().toISOString(),
            status: deadlineExpired ? 'Expired' : 'Viewed'
          })
          .eq('id', invitation.id);
      }

      const [companyResult, processItemsResult, quotesResult, messagesResult] = await Promise.all([
        supabase.from('rfq_companies').select('*').eq('id', invitation.company_id).single(),
        supabase.from('rfq_process_items').select('*').eq('process_id', invitation.process_id).order('id'),
        supabase.from('rfq_quotes').select('*').eq('process_id', invitation.process_id).eq('company_id', invitation.company_id),
        supabase.from('rfq_messages').select('*').eq('process_id', invitation.process_id).eq('company_id', invitation.company_id).order('created_at')
      ]);

      if (companyResult.error) {
        throw companyResult.error;
      }

      res.json({
        invitation: mapInvitation({
          ...invitation,
          viewed_at: invitation.viewed_at || new Date().toISOString(),
          status: deadlineExpired && invitation.status !== 'Quoted' ? 'Expired' : invitation.status === 'Sent' ? 'Viewed' : invitation.status
        }),
        process: mapProcess(processRow),
        company: mapCompany(companyResult.data),
        items: (processItemsResult.data || []).map(mapProcessItem),
        quotes: (quotesResult.data || []).map(mapQuote),
        messages: (messagesResult.data || []).map(mapMessage)
      });
    } catch (error: any) {
      console.error('Erro ao carregar portal do fornecedor RFQ:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar portal do fornecedor.' });
    }
  });

  app.post('/api/rfq/fornecedor/:token/proposta', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { prices, attachmentBase64, attachmentName } = req.body;

      const { data: invitation, error: invitationError } = await supabase
        .from('rfq_invitations')
        .select('*')
        .eq('token', token)
        .single();
      if (invitationError || !invitation) {
        return res.status(404).json({ error: 'Convite RFQ não encontrado.' });
      }

      const { data: processRow, error: processError } = await supabase
        .from('rfq_processes')
        .select('*')
        .eq('id', invitation.process_id)
        .single();
      if (processError || !processRow) {
        return res.status(404).json({ error: 'Processo RFQ não encontrado.' });
      }

      if (new Date(`${processRow.deadline}T23:59:59`).getTime() <= Date.now()) {
        await supabase.from('rfq_invitations').update({ status: 'Expired' }).eq('id', invitation.id);
        return res.status(400).json({ error: 'Prazo encerrado. Novas propostas estão bloqueadas.' });
      }

      let attachmentUrl: string | null = null;
      if (attachmentBase64) {
        attachmentUrl = await uploadBase64ToStorage(
          attachmentBase64,
          'arquivos',
          `rfq/propostas/${invitation.process_id}/${invitation.company_id}_${Date.now()}`
        );
      }

      const quoteRows = Object.entries(prices || {})
        .map(([itemId, price]) => ({
          process_id: invitation.process_id,
          company_id: invitation.company_id,
          item_id: Number(itemId),
          price: Number(price),
          attachment_name: attachmentName || null,
          attachment_url: attachmentUrl,
          updated_at: new Date().toISOString()
        }))
        .filter((item) => Number.isFinite(item.price) && item.price > 0);

      if (quoteRows.length === 0) {
        return res.status(400).json({ error: 'Nenhum valor válido foi informado.' });
      }

      const { error: quoteError } = await supabase
        .from('rfq_quotes')
        .upsert(quoteRows, { onConflict: 'process_id,company_id,item_id' });
      if (quoteError) {
        throw quoteError;
      }

      const submittedAt = new Date().toISOString();
      const { error: invitationUpdateError } = await supabase
        .from('rfq_invitations')
        .update({
          status: 'Quoted',
          quoted_items: quoteRows.length,
          viewed_at: invitation.viewed_at || submittedAt,
          submitted_at: submittedAt
        })
        .eq('id', invitation.id);

      if (invitationUpdateError) {
        throw invitationUpdateError;
      }

      const { data: companyRow } = await supabase
        .from('rfq_companies')
        .select('*')
        .eq('id', invitation.company_id)
        .single();

      await supabase.from('rfq_notifications').insert({
        process_id: invitation.process_id,
        company_id: invitation.company_id,
        title: 'Proposta recebida',
        message: `${companyRow?.name || 'Fornecedor'} enviou ${quoteRows.length} preços para ${processRow.title}.`,
        audience: 'Buyer',
        type: 'Submission'
      });

      if (processRow.created_by_user_id) {
        await createNotification(
          Number(processRow.created_by_user_id),
          'rfq',
          `${companyRow?.name || 'Fornecedor'} enviou proposta para ${processRow.title}.`,
          '/rfq/processos'
        );
      }

      res.json({ success: true, submittedAt, attachmentUrl });
    } catch (error: any) {
      console.error('Erro ao registrar proposta RFQ:', error);
      res.status(400).json({ error: error.message || 'Erro ao registrar proposta RFQ.' });
    }
  });

  app.post('/api/rfq/fornecedor/:token/mensagens', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { message } = req.body;
      if (!String(message || '').trim()) {
        return res.status(400).json({ error: 'Mensagem é obrigatória.' });
      }

      const { data: invitation, error: invitationError } = await supabase
        .from('rfq_invitations')
        .select('*')
        .eq('token', token)
        .single();
      if (invitationError || !invitation) {
        return res.status(404).json({ error: 'Convite RFQ não encontrado.' });
      }

      const { data: companyRow } = await supabase
        .from('rfq_companies')
        .select('*')
        .eq('id', invitation.company_id)
        .single();

      const { data: processRow } = await supabase
        .from('rfq_processes')
        .select('*')
        .eq('id', invitation.process_id)
        .single();

      const { data, error } = await supabase
        .from('rfq_messages')
        .insert({
          process_id: invitation.process_id,
          company_id: invitation.company_id,
          author: companyRow?.contact_name || companyRow?.name || 'Fornecedor',
          side: 'Supplier',
          message: String(message).trim()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await supabase.from('rfq_notifications').insert({
        process_id: invitation.process_id,
        company_id: invitation.company_id,
        title: 'Nova mensagem do fornecedor',
        message: `${companyRow?.name || 'Fornecedor'} enviou mensagem em ${processRow?.title || 'processo RFQ'}.`,
        audience: 'Buyer',
        type: 'Reminder'
      });

      if (processRow?.created_by_user_id) {
        await createNotification(
          Number(processRow.created_by_user_id),
          'rfq',
          `Nova mensagem de ${companyRow?.name || 'Fornecedor'} no processo ${processRow?.title || ''}.`,
          '/rfq/processos'
        );
      }

      res.json(mapMessage(data));
    } catch (error: any) {
      console.error('Erro ao registrar mensagem RFQ:', error);
      res.status(400).json({ error: error.message || 'Erro ao registrar mensagem RFQ.' });
    }
  });
}