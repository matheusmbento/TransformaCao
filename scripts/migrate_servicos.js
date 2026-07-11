require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateServicos() {
  console.log('Iniciando migração de Serviços...');
  try {
    // 1. Puxar o estado legado
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    if (result.rows.length === 0) {
      console.log('Nenhum estado legado encontrado. Nada a migrar.');
      return;
    }

    const state = JSON.parse(result.rows[0].value);
    const servicos = state.servicos || [];

    if (servicos.length === 0) {
      console.log('Nenhum serviço encontrado no JSON legado.');
      return;
    }

    // 2. Inserir na nova tabela
    let count = 0;
    for (let i = 0; i < servicos.length; i++) {
      const s = servicos[i];
      // Ignora se já existir
      const exists = await pool.query("SELECT id FROM servicos WHERE id = $1", [s.id]);
      if (exists.rows.length === 0) {
        await pool.query(
          "INSERT INTO servicos (id, nome, preco, duracao, icone, descricao, ordem) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [s.id, s.nome, s.preco, s.duracao, s.icone || '', s.desc || '', i]
        );
        count++;
      }
    }

    console.log(`✅ Migração concluída! Foram migrados ${count} serviços novos.`);
  } catch (error) {
    console.error('❌ Erro na migração de serviços:', error);
  } finally {
    pool.end();
  }
}

migrateServicos();
