require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  console.log('Iniciando criação das tabelas...');

  try {
    // Tabela de Clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela clientes verificada/criada.');

    // Tabela de Pets (Vinculada ao Cliente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id VARCHAR(255) PRIMARY KEY,
        cliente_id VARCHAR(255) REFERENCES clientes(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        raca VARCHAR(100),
        porte VARCHAR(50),
        nascimento VARCHAR(50),
        foto_url TEXT,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela pets verificada/criada.');

    // Tabela de Serviços
    await pool.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        preco DECIMAL(10, 2) NOT NULL,
        duracao INTEGER NOT NULL,
        icone VARCHAR(50),
        descricao TEXT,
        ordem INTEGER DEFAULT 0
      )
    `);
    console.log('✅ Tabela servicos verificada/criada.');

    // Tabela de Agendamentos (Vinculada ao Pet e ao Serviço)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id VARCHAR(255) PRIMARY KEY,
        pet_id VARCHAR(255) REFERENCES pets(id) ON DELETE CASCADE,
        servico_id VARCHAR(255),
        data_agendamento VARCHAR(20) NOT NULL,
        horario VARCHAR(10) NOT NULL,
        status VARCHAR(50) DEFAULT 'agendado',
        valor_cobrado DECIMAL(10, 2),
        pago BOOLEAN DEFAULT false,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela agendamentos verificada/criada.');

    // Tabela Financeiro
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financeiro (
        id VARCHAR(255) PRIMARY KEY,
        data_lancamento VARCHAR(20) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        descricao TEXT,
        agendamento_id VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela financeiro verificada/criada.');

    console.log('🎉 Todas as tabelas do novo esquema foram criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    pool.end();
  }
}

createTables();
