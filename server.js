require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { Pool } = require('pg');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rota explícita para manifest.json — precisa vir ANTES do express.static
// para evitar interceptação pelo SSO da Vercel (causa erro CORS no PWA)
app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.use(express.static(__dirname));

// Connect to PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados PostgreSQL (Neon) com sucesso!');
});

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL não encontrada! Configure no arquivo .env ou no painel da Vercel.');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transformacao_state (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      )
    `);
    console.log('✅ Tabela transformacao_state verificada/criada no Neon.');
  } catch (err) {
    console.error('❌ Erro ao criar tabela no Postgres:', err.message);
  }
}
initDatabase();

// Route to get the complete database state
app.get('/api/db', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    if (result.rows.length === 0) {
      return res.json(null); // No data saved yet
    }
    res.json(JSON.parse(result.rows[0].value));
  } catch (err) {
    console.error('Erro ao carregar do Neon:', err);
    res.status(500).json({ error: 'Erro ao processar dados salvos no banco' });
  }
});

// Route to save the complete database state
app.post('/api/save', async (req, res) => {
  const stateString = JSON.stringify(req.body);
  try {
    await pool.query(
      "INSERT INTO transformacao_state (key, value) VALUES ('state', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [stateString]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar no Neon:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// NOVAS ROTAS: Desligar Sistema e Backup (Adaptadas para Nuvem)
// ----------------------------------------------------------------------

// Rota para baixar o arquivo de backup (Agora baixa um JSON do estado)
app.get('/api/backup/download', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    const data = result.rows.length > 0 ? result.rows[0].value : '{}';
    const dateStr = new Date().toISOString().split('T')[0].split('-').reverse().join('_');
    const fileName = `transformacao_backup_${dateStr}.json`;
    
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-type', 'application/json');
    res.send(data);
  } catch (err) {
    console.error('Erro ao gerar backup JSON:', err);
    res.status(500).send('Erro ao gerar backup.');
  }
});

// Rota para enviar o arquivo JSON para o Telegram
app.post('/api/backup/telegram', async (req, res) => {
  let { botToken, chatId } = req.body;
  botToken = (botToken || '').trim();
  chatId = (chatId || '').trim();
  if (!botToken || !chatId) return res.status(400).json({ error: 'Bot Token e Chat ID são obrigatórios.' });

  try {
    const result = await pool.query("SELECT value FROM transformacao_state WHERE key = 'state'");
    const data = result.rows.length > 0 ? result.rows[0].value : '{}';
    
    const form = new FormData();
    form.append('chat_id', chatId);
    const dateStr = new Date().toISOString().split('T')[0].split('-').reverse().join('/');
    form.append('caption', `📦 *Backup TransformaCão (Nuvem)* - ${dateStr}\nAqui está o seu backup em formato JSON.`);
    // form.append('parse_mode', 'Markdown'); // Removido para evitar erros de sintaxe 400
    
    // Anexa como Buffer
    form.append('document', Buffer.from(data, 'utf-8'), {
      filename: `backup_nuvem_${dateStr.replace(/\//g, '')}.json`,
      contentType: 'application/json',
    });

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const response = await axios.post(url, form, { headers: form.getHeaders() });
    
    if (response.data && response.data.ok) res.json({ success: true });
    else res.status(500).json({ error: 'Erro Telegram', details: response.data });
  } catch (error) {
    console.error('Erro ao enviar backup Telegram:', error);
    const details = error.response ? error.response.data : error.message;
    res.status(500).json({ error: 'Falha ao enviar backup.', details });
  }
});

// Rota para enviar mensagem de texto (agenda) para o Telegram
app.post('/api/telegram/message', async (req, res) => {
  const { botToken, chatId, text } = req.body;
  
  if (!botToken || !chatId || !text) {
    return res.status(400).json({ error: 'Bot Token, Chat ID e Texto são obrigatórios.' });
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });

    if (response.data && response.data.ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Erro na API do Telegram', details: response.data });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem para Telegram:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: 'Falha ao enviar mensagem para o Telegram.', 
      details: error.response ? error.response.data : error.message 
    });
  }
});

// ----------------------------------------------------------------------
// NOVA API V2 (Strangler Fig)
// ----------------------------------------------------------------------
app.get('/api/v2/clientes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
        json_agg(json_build_object('id', p.id, 'nome', p.nome, 'raca', p.raca, 'porte', p.porte, 'metadata', p.metadata)) as pets
      FROM clientes c
      LEFT JOIN pets p ON c.id = p.cliente_id AND p.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.nome ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar clientes v2:', err);
    res.status(500).json({ error: 'Erro ao carregar clientes' });
  }
});

app.post('/api/v2/clientes', async (req, res) => {
  const { id, nome, telefone, observacoes, metadata, pet_id, pet_nome, raca, porte, pet_metadata } = req.body;
  try {
    await pool.query("BEGIN");
    await pool.query(
      "INSERT INTO clientes (id, nome, telefone, observacoes, metadata) VALUES ($1, $2, $3, $4, $5)",
      [id, nome, telefone, observacoes, metadata || {}]
    );
    if (pet_nome) {
      await pool.query(
        "INSERT INTO pets (id, cliente_id, nome, raca, porte, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
        [pet_id, id, pet_nome, raca, porte, pet_metadata || {}]
      );
    }
    await pool.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error('Erro ao salvar cliente v2:', err);
    res.status(500).json({ error: 'Erro ao salvar cliente' });
  }
});

app.put('/api/v2/clientes/:id', async (req, res) => {
  const clientId = req.params.id;
  const { nome, telefone, observacoes, metadata, pet_id, pet_nome, raca, porte, pet_metadata } = req.body;
  try {
    await pool.query("BEGIN");
    await pool.query(
      "UPDATE clientes SET nome = $1, telefone = $2, observacoes = $3, metadata = $4 WHERE id = $5",
      [nome, telefone, observacoes, metadata || {}, clientId]
    );
    if (pet_id && pet_nome) {
      const petExists = await pool.query("SELECT id FROM pets WHERE id = $1", [pet_id]);
      if (petExists.rows.length > 0) {
        await pool.query(
          "UPDATE pets SET nome = $1, raca = $2, porte = $3, metadata = $4 WHERE id = $5",
          [pet_nome, raca, porte, pet_metadata || {}, pet_id]
        );
      } else {
        await pool.query(
          "INSERT INTO pets (id, cliente_id, nome, raca, porte, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
          [pet_id, clientId, pet_nome, raca, porte, pet_metadata || {}]
        );
      }
    }
    await pool.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error('Erro ao editar cliente v2:', err);
    res.status(500).json({ error: 'Erro ao editar cliente' });
  }
});

app.delete('/api/v2/clientes/:id', async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query("UPDATE clientes SET deleted_at = NOW() WHERE id = $1", [req.params.id]);
    await pool.query("UPDATE pets SET deleted_at = NOW() WHERE cliente_id = $1", [req.params.id]);
    await pool.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error('Erro ao excluir cliente v2:', err);
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

app.get('/api/v2/servicos', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM servicos WHERE deleted_at IS NULL ORDER BY ordem ASC");
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar servicos v2:', err);
    res.status(500).json({ error: 'Erro ao carregar serviços' });
  }
});

app.post('/api/v2/servicos', async (req, res) => {
  const { id, nome, preco, duracao, icone, descricao, ordem } = req.body;
  try {
    await pool.query(
      "INSERT INTO servicos (id, nome, preco, duracao, icone, descricao, ordem) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, nome, preco, duracao, icone || '', descricao || '', ordem || 0]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar servico v2:', err);
    res.status(500).json({ error: 'Erro ao salvar serviço' });
  }
});

app.put('/api/v2/servicos/:id', async (req, res) => {
  const { nome, preco, duracao, icone, descricao, ordem } = req.body;
  try {
    await pool.query(
      "UPDATE servicos SET nome = $1, preco = $2, duracao = $3, icone = $4, descricao = $5, ordem = $6 WHERE id = $7",
      [nome, preco, duracao, icone || '', descricao || '', ordem || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao editar servico v2:', err);
    res.status(500).json({ error: 'Erro ao editar serviço' });
  }
});

app.delete('/api/v2/servicos/:id', async (req, res) => {
  try {
    await pool.query("UPDATE servicos SET deleted_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir servico v2:', err);
    res.status(500).json({ error: 'Erro ao excluir serviço' });
  }
});

app.get('/api/v2/agendamentos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, p.cliente_id 
      FROM agendamentos a
      LEFT JOIN pets p ON a.pet_id = p.id
      WHERE a.deleted_at IS NULL 
      ORDER BY a.data_agendamento ASC, a.horario ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar agendamentos v2:', err);
    res.status(500).json({ error: 'Erro ao carregar agendamentos' });
  }
});

app.post('/api/v2/agendamentos', async (req, res) => {
  const { id, pet_id, servico_id, data_agendamento, horario, status, valor_cobrado, pago, observacoes, metadata } = req.body;
  try {
    await pool.query(
      "INSERT INTO agendamentos (id, pet_id, servico_id, data_agendamento, horario, status, valor_cobrado, pago, observacoes, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [id, pet_id, servico_id, data_agendamento, horario, status || 'agendado', valor_cobrado || 0, pago || false, observacoes || '', metadata || {}]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar agendamento v2:', err);
    res.status(500).json({ error: 'Erro ao salvar agendamento' });
  }
});

app.put('/api/v2/agendamentos/:id', async (req, res) => {
  const { pet_id, servico_id, data_agendamento, horario, status, valor_cobrado, pago, observacoes, metadata } = req.body;
  try {
    await pool.query(
      "UPDATE agendamentos SET pet_id = $1, servico_id = $2, data_agendamento = $3, horario = $4, status = $5, valor_cobrado = $6, pago = $7, observacoes = $8, metadata = $9 WHERE id = $10",
      [pet_id, servico_id, data_agendamento, horario, status, valor_cobrado, pago, observacoes, metadata || {}, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao editar agendamento v2:', err);
    res.status(500).json({ error: 'Erro ao editar agendamento' });
  }
});

app.delete('/api/v2/agendamentos/:id', async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query("UPDATE agendamentos SET deleted_at = NOW() WHERE id = $1", [req.params.id]);
    await pool.query("UPDATE financeiro SET deleted_at = NOW() WHERE agendamento_id = $1", [req.params.id]);
    await pool.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error('Erro ao excluir agendamento v2:', err);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

app.get('/api/v2/financeiro', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM financeiro 
      WHERE deleted_at IS NULL 
      ORDER BY data_lancamento DESC, criado_em DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar financeiro v2:', err);
    res.status(500).json({ error: 'Erro ao carregar financeiro' });
  }
});

app.post('/api/v2/financeiro', async (req, res) => {
  const { id, data_lancamento, valor, tipo, descricao, agendamento_id, metadata } = req.body;
  try {
    await pool.query(
      "INSERT INTO financeiro (id, data_lancamento, valor, tipo, descricao, agendamento_id, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, data_lancamento, valor, tipo, descricao || '', agendamento_id || null, metadata || {}]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar financeiro v2:', err);
    res.status(500).json({ error: 'Erro ao salvar lançamento financeiro' });
  }
});

app.put('/api/v2/financeiro/:id', async (req, res) => {
  const { data_lancamento, valor, tipo, descricao, agendamento_id, metadata } = req.body;
  try {
    await pool.query(
      "UPDATE financeiro SET data_lancamento = $1, valor = $2, tipo = $3, descricao = $4, agendamento_id = $5, metadata = $6 WHERE id = $7",
      [data_lancamento, valor, tipo, descricao || '', agendamento_id || null, metadata || {}, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao editar financeiro v2:', err);
    res.status(500).json({ error: 'Erro ao editar lançamento financeiro' });
  }
});

app.delete('/api/v2/financeiro/:id', async (req, res) => {
  try {
    await pool.query("UPDATE financeiro SET deleted_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir financeiro v2:', err);
    res.status(500).json({ error: 'Erro ao excluir lançamento financeiro' });
  }
});

// ----------------------------------------------------------------------
// Rota de fallback do PWA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Export the app for Vercel Serverless
module.exports = app;

// Inicia servidor apenas se rodando localmente (não na Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 SERVIDOR ESPAÇO PET (NEON) INICIADO LOCALMENTE!`);
    console.log(`💻 Computador Local: http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
}
