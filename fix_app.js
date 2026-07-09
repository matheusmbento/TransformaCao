const fs = require('fs');
let d = fs.readFileSync('app.js', 'utf8');

// The bad chunk that was injected:
const bad = `      }
      #taxi-dog-modal-wrap #taxi-valor {
        flex:1; border:none; background:transparent; padding:10px 12px;
  const finId = uid();
  state.financeiro.push({
    id: finId,
    tipo: 'receita',
    desc: \`Taxi Dog — 🚗 \${petNome} (\${tutorNome})\`,
    valor: valor,
    data: a.data,
    categoria: 'taxi_dog'
  });

  try {
    fetch('/api/v2/financeiro', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: finId, data_lancamento: a.data, valor: valor, tipo: 'receita', 
        descricao: \`Taxi Dog — 🚗 \${petNome} (\${tutorNome})\`, 
        metadata: { categoria: 'taxi_dog' }
      })
    });
    fetch(\`/api/v2/agendamentos/\${agendId}\`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        pet_id: a.pet_id, servico_id: a.servicoId, data_agendamento: a.data,
        horario: a.hora, status: a.status, valor_cobrado: a.valor_cobrado, pago: a.pago,
        observacoes: a.obs, metadata: { ...a.metadata, taxiDog: a.taxiDog }
      })
    });
  } catch(e) {}
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>`;

// The good chunk to restore:
const good = `      }
      #taxi-dog-modal-wrap #taxi-valor {
        flex:1; border:none; background:transparent; padding:10px 12px;
        font-size:18px; font-weight:700; color:var(--text); outline:none;
        font-family:'Nunito',sans-serif;
      }
      #taxi-dog-modal-wrap .taxi-historico {
        font-size:11px; color:var(--text-muted);
        display:flex; align-items:center; gap:4px;
      }
      #taxi-dog-modal-wrap .taxi-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:4px; }
    </style>
    <div id="taxi-dog-modal-wrap">
      <div class="taxi-info">
        <div class="taxi-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E040A0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>`;

if (d.includes(bad)) {
  d = d.replace(bad, good);
  console.log("Restored original taxi dog modal HTML.");
} else {
  console.log("Bad chunk not found exactly. Needs manual inspection.");
}

// Now safely do the actual replacement for confirmarTaxiDog
const target = `  // Lança no financeiro como receita individual
  state.financeiro.push({
    id: uid(),
    tipo: 'receita',
    desc: \`Taxi Dog — 🚗 \${petNome} (\${tutorNome})\`,
    valor: valor,
    data: a.data,
    categoria: 'taxi_dog'
  });`;

const replacement = `  // Lança no financeiro como receita individual
  const finId = uid();
  state.financeiro.push({
    id: finId,
    tipo: 'receita',
    desc: \`Taxi Dog — 🚗 \${petNome} (\${tutorNome})\`,
    valor: valor,
    data: a.data,
    categoria: 'taxi_dog'
  });

  // DUAL WRITE: Salvar o financeiro na API V2 e atualizar o agendamento
  try {
    fetch('/api/v2/financeiro', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: finId, data_lancamento: a.data, valor: valor, tipo: 'receita', 
        descricao: \`Taxi Dog — 🚗 \${petNome} (\${tutorNome})\`, 
        metadata: { categoria: 'taxi_dog' }
      })
    });
    fetch(\`/api/v2/agendamentos/\${agendId}\`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        pet_id: a.pet_id, servico_id: a.servicoId, data_agendamento: a.data,
        horario: a.hora, status: a.status, valor_cobrado: a.valor_cobrado, pago: a.pago,
        observacoes: a.obs, metadata: { ...a.metadata, taxiDog: a.taxiDog }
      })
    });
  } catch(e) {}`;

if (d.includes(target)) {
  d = d.replace(target, replacement);
  console.log("Applied dual-write to confirmarTaxiDog successfully.");
} else {
  console.log("Could not find the target to apply dual write.");
}

fs.writeFileSync('app.js', d, 'utf8');
