import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar no ambiente ou no arquivo .env");
  console.log("Variáveis disponíveis:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Verifica se o banco local existe
if (!fs.existsSync('database.sqlite')) {
  console.error("Erro: Arquivo database.sqlite não encontrado.");
  process.exit(1);
}

const db = new Database('database.sqlite');

async function migrateTable(tableName, orderBy = 'id') {
  console.log(`Migrando tabela: ${tableName}...`);
  try {
    const rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`).all();
    if (rows.length === 0) {
      console.log(`Tabela ${tableName} vazia. Pulando.`);
      return;
    }

    // O Supabase tem um limite de inserção por vez, então vamos dividir em lotes (chunks)
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(tableName).insert(chunk);
      if (error) {
        console.error(`Erro ao inserir lote na tabela ${tableName}:`, error.message);
      }
    }
    console.log(`✓ ${rows.length} registros migrados para ${tableName}.`);
  } catch (err) {
    console.error(`Erro ao ler a tabela ${tableName} do SQLite:`, err.message);
  }
}

async function runMigration() {
  console.log("=== INICIANDO MIGRAÇÃO PARA O SUPABASE ===");
  
  // A ordem importa devido às chaves estrangeiras (Foreign Keys)
  
  // 1. Tabelas sem dependências
  await migrateTable('oms');
  await migrateTable('funcoes');
  await migrateTable('conhecimentos');
  
  // 2. Usuários (depende das listas acima, mas no SQLite era texto livre)
  await migrateTable('usuarios');
  
  // 3. Consultas e Empresas (dependem de usuários)
  await migrateTable('consultas');
  await migrateTable('empresas');
  
  // 4. Tabelas que dependem de consultas e usuários
  await migrateTable('comentarios');
  await migrateTable('curtidas_consultas', 'consulta_id'); // Não tem 'id'
  await migrateTable('curtidas_comentarios', 'comentario_id'); // Não tem 'id'
  await migrateTable('validacoes_empresas', 'empresa_id'); // Não tem 'id'
  
  // 5. Social e Chat
  await migrateTable('amizades', 'usuario_id'); // Não tem 'id'
  await migrateTable('notificacoes');
  await migrateTable('conversas');
  await migrateTable('mensagens_chat');
  
  // 6. Auditoria
  await migrateTable('auditoria');

  console.log("=== MIGRAÇÃO CONCLUÍDA ===");
  console.log("Verifique o painel do Supabase para confirmar os dados.");
}

runMigration();
