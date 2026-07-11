require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function migrateClientes() {
  console.log('Iniciando migração de Clientes e Pets...');
  try {
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    if (result.rows.length === 0) {
      console.log('Nenhum estado legado encontrado.');
      return;
    }

    const state = JSON.parse(result.rows[0].value);
    const clientes = state.clientes || [];

    if (clientes.length === 0) {
      console.log('Nenhum cliente legado encontrado.');
      return;
    }

    let clientesCount = 0;
    let petsCount = 0;

    for (const c of clientes) {
      // 1. Inserir Cliente
      const clientExists = await pool.query("SELECT id FROM clientes WHERE id = $1", [c.id]);
      if (clientExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO clientes (id, nome, telefone, observacoes) VALUES ($1, $2, $3, $4)",
          [c.id, c.nome, c.telefone || '', c.obs || '']
        );
        clientesCount++;
      }

      // 2. Inserir Pet (O legado tinha apenas 1 pet por cliente)
      // Usamos c.id + '_pet' ou geramos um UID novo. Vamos usar novo UID e manter relacao
      // Checar se ja inserimos um pet para esse cliente para evitar duplicações caso rodemos o script 2 vezes
      const petExists = await pool.query("SELECT id FROM pets WHERE cliente_id = $1 AND nome = $2", [c.id, c.pet]);
      if (petExists.rows.length === 0 && c.pet) {
        const petId = uid();
        await pool.query(
          "INSERT INTO pets (id, cliente_id, nome, raca, porte, observacoes) VALUES ($1, $2, $3, $4, $5, $6)",
          [petId, c.id, c.pet, c.raca || '', c.porte || '', c.obs || '']
        );
        petsCount++;
      }
    }

    console.log(`✅ Migração concluída! ${clientesCount} clientes e ${petsCount} pets inseridos.`);
  } catch (error) {
    console.error('❌ Erro na migração de clientes:', error);
  } finally {
    pool.end();
  }
}

migrateClientes();
