import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error('Erro ao inicializar Supabase:', e);
  }
} else {
  console.error('CRITICAL: Supabase URL or Key is missing!');
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '50mb' }));
  
  // Middleware to check Supabase
  app.use((req, res, next) => {
    if (!supabase && req.path.startsWith('/api') && req.path !== '/api/health' && req.path !== '/api/debug-env') {
      return res.status(503).json({ 
        error: "Supabase não configurado.",
        details: "As chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram encontradas no ambiente.",
        help: "Adicione estas chaves nos 'Secrets' do projeto no AI Studio."
      });
    }
    next();
  });
  
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const clients = new Map<number, WebSocket>();

  wss.on("connection", (ws) => {
    let userId: number | null = null;
    ws.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.type === "auth") {
        userId = data.userId;
        if (userId) clients.set(userId, ws);
      }
    });
    ws.on("close", () => {
      if (userId) clients.delete(userId);
    });
  });

  const sendNotification = (userId: number, notification: any) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "notification", data: notification }));
    }
  };

  const logAuditoria = async (usuario_id: number | null, acao: string, descricao: string, objeto_afetado?: string) => {
    await supabase.from('auditoria').insert({
      usuario_id, acao, descricao, objeto_afetado
    });
  };

  // Helper to upload base64 to Supabase Storage
  const uploadBase64ToStorage = async (base64Data: string, bucket: string, path: string) => {
    try {
      // Extract mime type and base64 data
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return null;
      
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: mimeType,
          upsert: true
        });
        
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Erro ao fazer upload para o storage:', err);
      return null;
    }
  };

  // --- API ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/config/oms", async (req, res) => {
    const { data } = await supabase.from('oms').select('*').order('nome');
    res.json(data || []);
  });

  app.get("/api/config/funcoes", async (req, res) => {
    const { data } = await supabase.from('funcoes').select('*').order('nome');
    res.json(data || []);
  });

  app.get("/api/config/classificacoes", async (req, res) => {
    const { data } = await supabase.from('conhecimentos').select('*').order('nome');
    res.json(data || []);
  });

  app.post("/api/login", async (req, res) => {
    const { codigo_interno } = req.body;
    const { data: user, error } = await supabase.from('usuarios').select('*').eq('codigo_interno', codigo_interno).single();
    
    if (error || !user) {
      await logAuditoria(null, 'Login Inválido', `Tentativa de login com NIP: ${codigo_interno}`);
      return res.status(404).json({ error: "Militar não cadastrado. Por favor, realize o cadastro." });
    }
    if (!user.ativo) {
      await logAuditoria(user.id, 'Login Bloqueado', `Usuário desativado tentou acessar o sistema.`);
      return res.status(403).json({ error: "Sua conta está desativada. Entre em contato com o administrador." });
    }
    
    await logAuditoria(user.id, 'Login Realizado', `Usuário ${user.nome} acessou o sistema.`);
    res.json(user);
  });

  app.post("/api/register", async (req, res) => {
    const { nome, nome_completo, posto_graduacao, codigo_interno, organizacao_militar, foto_perfil, funcao, conhecimento_material } = req.body;
    try {
      if (organizacao_militar) await supabase.from('oms').insert({ nome: organizacao_militar.trim() }).select();
      if (funcao) await supabase.from('funcoes').insert({ nome: funcao.trim() }).select();
      if (conhecimento_material) await supabase.from('conhecimentos').insert({ nome: conhecimento_material.trim() }).select();

      let finalFotoUrl = foto_perfil;
      if (foto_perfil && foto_perfil.startsWith('data:')) {
        const fileName = `avatar_${codigo_interno}_${Date.now()}`;
        const uploadedUrl = await uploadBase64ToStorage(foto_perfil, 'avatares', fileName);
        if (uploadedUrl) finalFotoUrl = uploadedUrl;
      }

      const { data: user, error } = await supabase.from('usuarios').insert({
        nome, nome_completo, posto_graduacao, codigo_interno, organizacao_militar, foto_perfil: finalFotoUrl, funcao, conhecimento_material, perfil: 'usuario'
      }).select().single();

      if (error) throw error;
      await logAuditoria(user.id, 'Cadastro', `Novo usuário cadastrado: ${nome}`);
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "NIP já cadastrado ou erro nos dados." });
    }
  });

  app.get("/api/notificacoes/:userId", async (req, res) => {
    const { data } = await supabase.from('notificacoes').select('*').eq('usuario_id', req.params.userId).order('data_criacao', { ascending: false }).limit(50);
    res.json(data || []);
  });

  app.post("/api/notificacoes/:id/lida", async (req, res) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', req.params.id);
    res.json({ success: true });
  });

  app.get("/api/users", async (req, res) => {
    const { q } = req.query;
    let query = supabase.from('usuarios').select('*').eq('ativo', true);
    if (q) {
      query = query.or(`nome.ilike.%${q}%,codigo_interno.ilike.%${q}%,organizacao_militar.ilike.%${q}%`);
    }
    const { data } = await query.limit(20);
    res.json(data || []);
  });

  app.get("/api/consultas", async (req, res) => {
    // Para simplificar a query complexa do SQLite, buscamos as consultas e depois os contadores
    const { data: consultas, error } = await supabase
      .from('consultas')
      .select(`
        *,
        usuarios:usuario_id (nome, organizacao_militar, foto_perfil),
        comentarios (count),
        curtidas_consultas (count)
      `)
      .order('data_criacao', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = consultas.map((c: any) => ({
      ...c,
      autor_nome: c.usuarios?.nome,
      autor_om: c.usuarios?.organizacao_militar,
      autor_foto: c.usuarios?.foto_perfil,
      total_comentarios: c.comentarios?.[0]?.count || 0,
      total_curtidas: c.curtidas_consultas?.[0]?.count || 0
    }));

    res.json(formatted);
  });

  app.post("/api/consultas", async (req, res) => {
    const { usuario_id, numero_item, nome_item, classificacao, meio_operacional, descricao, arquivo_url } = req.body;
    
    let finalUrl = arquivo_url;
    if (arquivo_url && arquivo_url.startsWith('data:')) {
      const fileName = `consulta_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uploadedUrl = await uploadBase64ToStorage(arquivo_url, 'arquivos', fileName);
      if (uploadedUrl) finalUrl = uploadedUrl;
    }

    const { data: info, error } = await supabase.from('consultas').insert({
      usuario_id, numero_item, nome_item, classificacao, meio_operacional, descricao, arquivo_url: finalUrl
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    await logAuditoria(usuario_id, 'Consulta Criada', `Nova consulta criada para o item: ${numero_item}`, info.id.toString());
    res.json({ id: info.id });
  });

  app.get("/api/consultas/:id", async (req, res) => {
    const { data: c, error } = await supabase
      .from('consultas')
      .select(`*, usuarios:usuario_id (nome, organizacao_militar, foto_perfil)`)
      .eq('id', req.params.id)
      .single();

    if (error || !c) return res.status(404).json({ error: "Consulta não encontrada" });

    const { count: total_comentarios } = await supabase.from('comentarios').select('*', { count: 'exact', head: true }).eq('consulta_id', c.id);
    const { count: total_curtidas } = await supabase.from('curtidas_consultas').select('*', { count: 'exact', head: true }).eq('consulta_id', c.id);

    res.json({
      ...c,
      autor_nome: c.usuarios?.nome,
      autor_om: c.usuarios?.organizacao_militar,
      autor_foto: c.usuarios?.foto_perfil,
      total_comentarios: total_comentarios || 0,
      total_curtidas: total_curtidas || 0
    });
  });

  app.get("/api/consultas/:id/comentarios", async (req, res) => {
    const { data: comentarios, error } = await supabase
      .from('comentarios')
      .select(`
        *,
        usuarios:usuario_id (nome, organizacao_militar, foto_perfil),
        curtidas_comentarios (count)
      `)
      .eq('consulta_id', req.params.id)
      .order('data_criacao', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = comentarios.map((c: any) => ({
      ...c,
      autor_nome: c.usuarios?.nome,
      autor_om: c.usuarios?.organizacao_militar,
      autor_foto: c.usuarios?.foto_perfil,
      total_curtidas: c.curtidas_comentarios?.[0]?.count || 0
    }));

    res.json(formatted);
  });

  app.post("/api/comentarios", async (req, res) => {
    const { consulta_id, usuario_id, texto, arquivo_url } = req.body;
    
    let finalUrl = arquivo_url;
    if (arquivo_url && arquivo_url.startsWith('data:')) {
      const fileName = `comentario_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uploadedUrl = await uploadBase64ToStorage(arquivo_url, 'arquivos', fileName);
      if (uploadedUrl) finalUrl = uploadedUrl;
    }

    const { data: info, error } = await supabase.from('comentarios').insert({
      consulta_id, usuario_id, texto, arquivo_url: finalUrl
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    await logAuditoria(usuario_id, 'Comentário Realizado', `Usuário comentou no chamado ID: ${consulta_id}`, consulta_id.toString());
    res.json({ id: info.id });
  });

  app.post("/api/consultas/:id/curtir", async (req, res) => {
    const { usuario_id } = req.body;
    try {
      await supabase.from('curtidas_consultas').insert({ consulta_id: req.params.id, usuario_id });
      res.json({ success: true });
    } catch (e) {
      await supabase.from('curtidas_consultas').delete().match({ consulta_id: req.params.id, usuario_id });
      res.json({ success: true, removed: true });
    }
  });

  app.get("/api/itens", async (req, res) => {
    // Supabase não tem SELECT DISTINCT fácil via JS, então pegamos tudo e filtramos
    const { data } = await supabase.from('consultas').select('numero_item, nome_item, classificacao, meio_operacional');
    const unique = Array.from(new Set(data?.map(i => JSON.stringify(i)))).map((i: any) => JSON.parse(i));
    res.json(unique);
  });

  app.get("/api/empresas", async (req, res) => {
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select(`
        *,
        usuarios:indicado_por_id (nome),
        validacoes_empresas (count)
      `)
      .order('data_cadastro', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = empresas.map((e: any) => ({
      ...e,
      indicado_por: e.usuarios?.nome,
      total_validacoes: e.validacoes_empresas?.[0]?.count || 0
    }));

    res.json(formatted);
  });

  app.post("/api/empresas", async (req, res) => {
    const { cnpj, razao_social, telefones, emails, tipo, numero_item, usuario_id } = req.body;
    const { data: info, error } = await supabase.from('empresas').insert({
      cnpj, razao_social, telefones: JSON.stringify(telefones), emails: JSON.stringify(emails), tipo, numero_item, indicado_por_id: usuario_id
    }).select().single();

    if (error) return res.status(400).json({ error: "Erro ao cadastrar empresa ou CNPJ já existe." });
    await logAuditoria(usuario_id, 'Empresa Cadastrada', `Nova empresa cadastrada: ${razao_social}`);
    res.json({ id: info.id });
  });

  app.get("/api/ranking", async (req, res) => {
    const { data: ranking, error } = await supabase
      .from('usuarios')
      .select(`
        id, nome, organizacao_militar, foto_perfil,
        consultas (count),
        comentarios (count),
        validacoes_empresas (count)
      `)
      .eq('ativo', true);

    if (error) return res.status(500).json({ error: error.message });

    const formatted = ranking.map((u: any) => ({
      id: u.id,
      nome: u.nome,
      om: u.organizacao_militar,
      foto: u.foto_perfil,
      pontos: (u.consultas?.[0]?.count || 0) * 10 + (u.comentarios?.[0]?.count || 0) * 5 + (u.validacoes_empresas?.[0]?.count || 0) * 2
    })).sort((a, b) => b.pontos - a.pontos);

    res.json(formatted);
  });

  app.get("/api/conversas/:userId", async (req, res) => {
    const { data: conversas, error } = await supabase
      .from('conversas')
      .select(`
        *,
        u1:usuario1_id (nome, codigo_interno),
        u2:usuario2_id (nome, codigo_interno)
      `)
      .or(`usuario1_id.eq.${req.params.userId},usuario2_id.eq.${req.params.userId}`)
      .order('data_ultima_mensagem', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formatted = conversas.map((c: any) => ({
      ...c,
      u1_nome: c.u1?.nome,
      u1_codigo: c.u1?.codigo_interno,
      u2_nome: c.u2?.nome,
      u2_codigo: c.u2?.codigo_interno
    }));

    res.json(formatted);
  });

  app.get("/api/mensagens/:conversaId", async (req, res) => {
    const { data, error } = await supabase
      .from('mensagens_chat')
      .select('*')
      .eq('conversa_id', req.params.conversaId)
      .order('data_envio', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/mensagens", async (req, res) => {
    const { conversa_id, remetente_id, texto, arquivo_url, destinatario_id } = req.body;
    let cid = conversa_id;

    if (!cid && destinatario_id) {
      const { data: existing } = await supabase
        .from('conversas')
        .select('id')
        .or(`and(usuario1_id.eq.${remetente_id},usuario2_id.eq.${destinatario_id}),and(usuario1_id.eq.${destinatario_id},usuario2_id.eq.${remetente_id})`)
        .single();

      if (existing) {
        cid = existing.id;
      } else {
        const { data: newConv } = await supabase
          .from('conversas')
          .insert({ usuario1_id: remetente_id, usuario2_id: destinatario_id })
          .select().single();
        cid = newConv.id;
      }
    }

    let finalUrl = arquivo_url;
    if (arquivo_url && arquivo_url.startsWith('data:')) {
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uploadedUrl = await uploadBase64ToStorage(arquivo_url, 'arquivos', fileName);
      if (uploadedUrl) finalUrl = uploadedUrl;
    }

    const { data: msg, error } = await supabase
      .from('mensagens_chat')
      .insert({ conversa_id: cid, remetente_id, texto, arquivo_url: finalUrl })
      .select().single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('conversas').update({ data_ultima_mensagem: new Date().toISOString() }).eq('id', cid);

    res.json(msg);
  });

  app.get("/api/admin/auditoria", async (req, res) => {
    const { data } = await supabase
      .from('auditoria')
      .select(`*, usuarios:usuario_id (nome, organizacao_militar)`)
      .order('data_hora', { ascending: false })
      .limit(100);
    
    const formatted = data?.map((a: any) => ({
      ...a,
      nome_guerra: a.usuarios?.nome,
      organizacao_militar: a.usuarios?.organizacao_militar
    }));
    res.json(formatted || []);
  });

  app.get("/api/admin/users", async (req, res) => {
    const { data } = await supabase.from('usuarios').select('*').order('nome');
    res.json(data || []);
  });

  app.post("/api/admin/users/:id/toggle", async (req, res) => {
    const { ativo } = req.body;
    await supabase.from('usuarios').update({ ativo }).eq('id', req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/users/:id/perfil", async (req, res) => {
    const { perfil } = req.body;
    await supabase.from('usuarios').update({ perfil }).eq('id', req.params.id);
    res.json({ success: true });
  });

  app.get("/api/debug-env", (req, res) => {
    res.json({
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'missing',
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
  });

  app.get("/api/test", (req, res) => {
    res.json({ status: "ok", server: "supabase" });
  });

  app.get("/api/admin/migrate-to-supabase", async (req, res) => {
    const results: any = {};
    const db = new (await import('better-sqlite3')).default("sitec.db");

    const migrate = async (tableName: string, sqliteTable: string, transform?: (row: any) => any) => {
      try {
        const rows = db.prepare(`SELECT * FROM ${sqliteTable}`).all();
        if (rows.length === 0) {
          results[tableName] = "Vazia";
          return;
        }
        const transformed = transform ? rows.map(transform) : rows;
        
        // Delete existing to avoid conflicts during migration
        await supabase.from(tableName).delete().neq('id', -1); 

        const { error } = await supabase.from(tableName).insert(transformed);
        if (error) throw error;
        results[tableName] = `Sucesso (${rows.length} registros)`;
      } catch (err: any) {
        results[tableName] = `Erro: ${err.message}`;
      }
    };

    await migrate('usuarios', 'usuarios', (r) => ({
      ...r,
      ativo: r.ativo === 1,
      ramal: r.ramal
    }));
    await migrate('consultas', 'consultas');
    await migrate('comentarios', 'comentarios');
    await migrate('empresas', 'empresas');
    await migrate('curtidas_consultas', 'curtidas_consultas', (r) => {
      const { id, ...rest } = r;
      return rest;
    });
    await migrate('curtidas_comentarios', 'curtidas_comentarios', (r) => {
      const { id, ...rest } = r;
      return rest;
    });
    await migrate('validacoes_empresas', 'validacoes_empresas', (r) => {
      const { id, ...rest } = r;
      return rest;
    });
    await migrate('notificacoes', 'notificacoes', (r) => ({
      ...r,
      lida: r.lida === 1
    }));
    await migrate('amizades', 'amizades', (r) => {
      const { id, ...rest } = r;
      return rest;
    });
    await migrate('auditoria', 'auditoria');

    res.json(results);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (Supabase Backend)`);
  });
}

startServer();
