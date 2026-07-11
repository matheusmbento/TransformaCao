require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function aplicarMelhorias() {
  console.log('Aplicando melhorias estruturais no banco de dados...');
  try {
    // 1. ÍNDICES DE PERFORMANCE
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_data_agendamento ON agendamentos(data_agendamento);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_pet_id ON agendamentos(pet_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
      CREATE INDEX IF NOT EXISTS idx_pets_cliente_id ON pets(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
      CREATE INDEX IF NOT EXISTS idx_financeiro_data_lancamento ON financeiro(data_lancamento);
    `);
    console.log('✅ Índices criados.');

    // 2. SOFT DELETE
    await pool.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    console.log('✅ Colunas de Soft Delete adicionadas.');

    // 3. CAMPOS DE AUDITORIA
    await pool.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE servicos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE financeiro ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    
    // Função Trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Drops caso já existam para evitar erro
    await pool.query("DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;");
    await pool.query("DROP TRIGGER IF EXISTS trg_pets_updated_at ON pets;");
    await pool.query("DROP TRIGGER IF EXISTS trg_agendamentos_updated_at ON agendamentos;");
    await pool.query("DROP TRIGGER IF EXISTS trg_servicos_updated_at ON servicos;");

    // Triggers
    await pool.query(`
      CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_agendamentos_updated_at BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      CREATE TRIGGER trg_servicos_updated_at BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
    console.log('✅ Campos de auditoria e Triggers criados.');

    // 4. VALIDAÇÃO PÓS-EXECUÇÃO
    console.log('\\n--- Índices Criados ---');
    const indexes = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
      ORDER BY tablename;
    `);
    console.table(indexes.rows);

    console.log('\\n--- Colunas de Auditoria ---');
    const cols = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name IN ('deleted_at', 'created_at', 'updated_at')
      ORDER BY table_name, column_name;
    `);
    console.table(cols.rows);

  } catch (error) {
    console.error('❌ Erro ao aplicar melhorias:', error);
  } finally {
    pool.end();
  }
}

aplicarMelhorias();
