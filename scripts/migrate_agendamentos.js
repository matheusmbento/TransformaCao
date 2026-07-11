require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateAgendamentos() {
  console.log('Iniciando migração de Agendamentos...');
  try {
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    if (result.rows.length === 0) {
      console.log('Nenhum estado legado encontrado.');
      return;
    }

    const state = JSON.parse(result.rows[0].value);
    const agendamentos = state.agendamentos || [];

    if (agendamentos.length === 0) {
      console.log('Nenhum agendamento encontrado no JSON legado.');
      return;
    }

    let count = 0;

    for (const ag of agendamentos) {
      // Verifica se já inseriu (idempotência)
      const agExists = await pool.query("SELECT id FROM agendamentos WHERE id = $1", [ag.id]);
      if (agExists.rows.length === 0) {
        
        // No legado, a agenda salva o clienteId. Precisamos achar o pet_id do cliente!
        const petRes = await pool.query("SELECT id FROM pets WHERE cliente_id = $1 LIMIT 1", [ag.clienteId]);
        let pet_id = null;
        if (petRes.rows.length > 0) {
          pet_id = petRes.rows[0].id;
        }

        await pool.query(
          "INSERT INTO agendamentos (id, pet_id, servico_id, data_agendamento, horario, status, valor_cobrado, pago, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            ag.id, 
            pet_id, 
            ag.servicoId, 
            ag.data || ag.data_agendamento || '', 
            ag.hora || ag.horario || '', 
            ag.status || 'agendado', 
            ag.valor_cobrado || null, 
            ag.pago || false, 
            ag.obs || ''
          ]
        );
        count++;
      }
    }

    console.log(`✅ Migração concluída! Foram migrados ${count} agendamentos.`);
  } catch (error) {
    console.error('❌ Erro na migração de agendamentos:', error);
  } finally {
    pool.end();
  }
}

migrateAgendamentos();
