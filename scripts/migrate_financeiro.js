require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateFinanceiro() {
  console.log('Iniciando migração do Financeiro...');
  try {
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    if (result.rows.length === 0) {
      console.log('Nenhum estado legado encontrado.');
      return;
    }

    const state = JSON.parse(result.rows[0].value);
    const financeiro = state.financeiro || [];

    if (financeiro.length === 0) {
      console.log('Nenhum registro financeiro encontrado no JSON legado.');
      return;
    }

    let count = 0;

    for (const f of financeiro) {
      // Idempotência
      const fExists = await pool.query("SELECT id FROM financeiro WHERE id = $1", [f.id]);
      if (fExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO financeiro (id, data_lancamento, valor, tipo, descricao) VALUES ($1, $2, $3, $4, $5)",
          [
            f.id, 
            f.data || f.data_lancamento || '', 
            f.valor || 0, 
            f.tipo || 'receita', 
            f.desc || f.descricao || ''
          ]
        );
        count++;
      }
    }

    console.log(`✅ Migração concluída! Foram migrados ${count} registros financeiros.`);
  } catch (error) {
    console.error('❌ Erro na migração financeira:', error);
  } finally {
    pool.end();
  }
}

migrateFinanceiro();
