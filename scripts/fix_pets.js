require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixPets() {
  console.log('Corrigindo nomes e metadados dos pets...');
  try {
    const result = await pool.query('SELECT id, nome FROM pets');
    let count = 0;
    
    for (const row of result.rows) {
      if (row.nome && row.nome.startsWith('{') && row.nome.endsWith('}')) {
        try {
          const petData = JSON.parse(row.nome);
          const realName = petData.nome || 'Sem Nome';
          const raca = petData.raca || '';
          const porte = petData.porte || '';
          
          const metadata = {
            tipo: petData.tipo || '',
            aniversario: petData.aniversario || '',
            obs: petData.obs || '',
            tags: petData.tags || [],
            foto: petData.foto || ''
          };

          await pool.query(
            'UPDATE pets SET nome = $1, raca = $2, porte = $3, metadata = $4 WHERE id = $5',
            [realName, raca, porte, metadata, row.id]
          );
          count++;
        } catch (e) {
          console.log(`Erro ao parsear pet ${row.id}:`, e);
        }
      }
    }
    console.log(`✅ ${count} pets corrigidos com sucesso!`);
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  } finally {
    pool.end();
  }
}

fixPets();
