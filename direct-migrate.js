import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: Supabase URL/Key não encontrados no ambiente.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const db = new Database('sitec.db');

async function migrateTable(tableName, sqliteTable, transform) {
  console.log(`Migrando ${tableName}...`);
  try {
    const rows = db.prepare(`SELECT * FROM ${sqliteTable}`).all();
    if (rows.length === 0) return;
    const transformed = transform ? rows.map(transform) : rows;
    
    // Split into chunks of 50
    for (let i = 0; i < transformed.length; i += 50) {
      const chunk = transformed.slice(i, i + 50);
      const { error } = await supabase.from(tableName).insert(chunk);
      if (error) console.error(`Erro em ${tableName}:`, error.message);
    }
    console.log(`✓ ${transformed.length} registros em ${tableName}`);
  } catch (e) {
    console.error(`Erro fatal em ${tableName}:`, e.message);
  }
}

async function run() {
  await migrateTable('usuarios', 'usuarios', r => ({ ...r, ativo: r.ativo === 1 }));
  await migrateTable('consultas', 'consultas');
  await migrateTable('comentarios', 'comentarios');
  await migrateTable('empresas', 'empresas');
  await migrateTable('curtidas_consultas', 'curtidas_consultas', r => { const { id, ...rest } = r; return rest; });
  await migrateTable('curtidas_comentarios', 'curtidas_comentarios', r => { const { id, ...rest } = r; return rest; });
  await migrateTable('notificacoes', 'notificacoes', r => ({ ...r, lida: r.lida === 1 }));
  console.log("Migração concluída!");
}

run();
