/* ============================================================
   TRANSFORMACÃO — SISTEMA DE GESTÃO PET
   app.js — Lógica principal + State + Rendering
   ============================================================ */

'use strict';

// ─── STATE ────────────────────────────────────────────────────
let state = defaultDB();

function defaultDB() {
  return {
    clientes: [],
    agendamentos: [],
    servicos: [
      { id: uid(), nome: 'Banho Simples', preco: 60, duracao: 30, icone: '🛁', desc: 'Banho completo com shampoo, condicionador e secagem' },
      { id: uid(), nome: 'Banho + Tosa', preco: 110, duracao: 60, icone: '✂️', desc: 'Banho completo + tosa higiênica ou no padrão da raça' },
      { id: uid(), nome: 'Tosa Higiênica', preco: 45, duracao: 30, icone: '🪒', desc: 'Tosa das áreas íntimas, patas e focinho' },
      { id: uid(), nome: 'Tosa na Tesoura', preco: 130, duracao: 90, icone: '✂️', desc: 'Tosa artesanal com tesoura, estilo personalizado' },
      { id: uid(), nome: 'Spa Completo', preco: 180, duracao: 120, icone: '💆', desc: 'Banho, tosa, hidratação profunda, perfume e laço' },
      { id: uid(), nome: 'Hidratação', preco: 50, duracao: 30, icone: '💧', desc: 'Tratamento hidratante para pelo e pele seca' },
    ],
    financeiro: [],
    configuracoes: { 
      nome_negocio: 'Espaço Pet TransformaCão', 
      telefone: '',
      mensagens: {
        padrao: 'Olá {{nome}}! 🐾 Aqui é o Espaço Pet TransformaCão! Tudo bem? O {{pet}} está precisando de um banhinho em breve? Pode entrar em contato para agendarmos no melhor horário para você! 😊',
        atrasado: 'Olá {{nome}}! 🐾 Aqui é o Espaço Pet TransformaCão! Notamos que já faz um tempinho desde o último banho do {{pet}}. Que tal remarcarmos? 😊 Estamos aqui para deixar o {{pet}} mais bonito do que nunca! ✨',
        confirmar: 'Olá {{nome}}! 🐾 Passando para confirmar o agendamento do {{pet}} no Espaço Pet TransformaCão! Podemos confirmar a data? 📅 Qualquer dúvida, estamos à disposição! 🐶',
        pronto: 'Olá {{nome}}! 🐾 O(a) {{pet}} já tomou banho, está super cheiroso(a) e prontinho(a) te esperando aqui no Espaço Pet TransformaCão! ✨'
      }
    },
    recordes: {
      melhorDia:     { data: null, qtd: 0, receita: 0 },
      melhorSemana:  { inicio: null, qtd: 0, receita: 0 },
      melhorMes:     { mes: null, qtd: 0, receita: 0 },
      totalPets:     0,
      celebracoesPendentes: [],   // [{tipo, dados, nivel}] para exibir ao abrir
      ultimoCheckSemana: null,    // data da última checagem de semana (YYYY-Www)
      ultimoCheckMes:    null     // data da última checagem de mês  (YYYY-MM)
    }
  };
}

async function loadDB() {
  try {
    const finalState = defaultDB();
    
    // ── Serviços V2 ──
    try {
      const resSrv = await fetch('/api/v2/servicos?t=' + Date.now());
      if (resSrv.ok) {
        const servicosV2 = await resSrv.json();
        if (servicosV2 && servicosV2.length > 0) {
          finalState.servicos = servicosV2;
        }
      }
    } catch (err) { console.error('Erro ao carregar servicos V2:', err); }
    
    // ── Clientes V2 ──
    try {
      const resCli = await fetch('/api/v2/clientes?t=' + Date.now());
      if (resCli.ok) {
        const clientesV2 = await resCli.json();
        if (clientesV2) {
          finalState.clientes = clientesV2.map(c => {
            const firstPet = (c.pets && c.pets.length > 0 && c.pets[0].id) ? c.pets[0] : null;
            const petMeta = firstPet ? (firstPet.metadata || {}) : {};
            return {
              id: c.id,
              nome: c.nome,
              telefone: c.telefone,
              obs: c.observacoes,
              ...(c.metadata || {}),
              pet_id: firstPet ? firstPet.id : null,
              pet: firstPet ? {
                nome: firstPet.nome,
                raca: firstPet.raca,
                porte: firstPet.porte,
                ...petMeta
              } : null
            };
          });
        }
      }
    } catch (err) { console.error('Erro ao carregar clientes V2:', err); }
    
    // ── Agendamentos V2 ──
    try {
      const resAg = await fetch('/api/v2/agendamentos?t=' + Date.now());
      if (resAg.ok) {
        const agendasV2 = await resAg.json();
        if (agendasV2) {
          finalState.agendamentos = agendasV2.map(a => ({
            id: a.id,
            clienteId: a.cliente_id,
            pet_id: a.pet_id,
            data: a.data_agendamento,
            hora: a.horario,
            servicoId: a.servico_id,
            status: a.status,
            valor_cobrado: a.valor_cobrado,
            pago: a.pago,
            obs: a.observacoes,
            ...(a.metadata || {})
          }));
        }
      }
    } catch (err) { console.error('Erro ao carregar agendamentos V2:', err); }
    
    // ── Financeiro V2 ──
    try {
      const resFin = await fetch('/api/v2/financeiro?t=' + Date.now());
      if (resFin.ok) {
        const finV2 = await resFin.json();
        if (finV2) {
          finalState.financeiro = finV2.map(f => ({
            id: f.id,
            data: f.data_lancamento,
            valor: parseFloat(f.valor),
            tipo: f.tipo,
            desc: f.descricao,
            agendamento_id: f.agendamento_id,
            ...(f.metadata || {})
          }));
        }
      }
    } catch (err) { console.error('Erro ao carregar financeiro V2:', err); }
    
    // ── Configurações e Recordes V2 ──
    try {
      const resCfg = await fetch('/api/v2/config?t=' + Date.now());
      if (resCfg.ok) {
        const configV2 = await resCfg.json();
        if (configV2.configuracoes) {
          finalState.configuracoes = { ...finalState.configuracoes, ...configV2.configuracoes };
        }
        if (configV2.recordes) {
          finalState.recordes = { ...finalState.recordes, ...configV2.recordes };
        }
      }
    } catch (err) { console.error('Erro ao carregar config V2:', err); }

    return finalState;
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    return defaultDB();
  }
}

// ── Funções auxiliares para salvar config/recordes no V2 ──
async function saveConfigV2(key, value) {
  try {
    await fetch('/api/v2/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  } catch (e) { console.error('Erro ao salvar config V2:', e); }
}


function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── NAVIGATION ───────────────────────────────────────────────
let currentPage = 'dashboard';
const pageTitles = {
  dashboard: '📊 Dashboard',
  agenda: '📅 Agenda',
  clientes: '🐶 Clientes',
  fila: '💬 Fila de Contatos',
  servicos: '✂️ Serviços',
  financeiro: '💰 Financeiro'
};

function navigate(page, fromHistory = false) {
  if (!fromHistory) {
    history.pushState({ page }, '', `#${page}`);
  }
  currentPage = page;
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  document.getElementById('topbar-title').textContent = pageTitles[page] || page;
  if (page === 'financeiro') {
    finShowAll = false;
  }
  
  // Fecha a sidebar no mobile ao navegar
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      const overlay = document.getElementById('sidebar-overlay');
      if (overlay) overlay.remove();
    }
  }
  
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'agenda': renderAgenda(); break;
    case 'clientes': renderClientes(); break;
    case 'fila': renderFila(); break;
    case 'servicos': renderServicos(); break;
    case 'financeiro': renderFinanceiro(); break;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
    const hasOverlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('mobile-open')) {
      if (!hasOverlay) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.zIndex = '999';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
      }
    } else {
      if (hasOverlay) {
        hasOverlay.remove();
      }
    }
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

function openGlobalAdd() {
  switch (currentPage) {
    case 'clientes': openClienteModal(); break;
    case 'agenda': openAgendamentoModal(); break;
    case 'servicos': openServicoModal(); break;
    case 'financeiro': openFinanceiroModal(); break;
    default: openAgendamentoModal();
  }
}

// ─── MODAL ────────────────────────────────────────────────────
function openModal(title, bodyHTML, wide = false, fromHistory = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.style.maxWidth = wide ? '760px' : '600px';
  overlay.classList.add('open');
  if (!fromHistory) {
    history.pushState({ modal: true, page: currentPage }, '', '#modal');
  }
}

function closeModal(e, fromHistory = false) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  if (!fromHistory && window.history.state?.modal) {
    history.back(); // Trigger popstate para limpar URL
  }
}

window.closeModal = closeModal;;

// ─── TOAST ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ─── DATES ────────────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function fmt(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function today() { return new Date().toISOString().slice(0, 10); }

function isPetBirthday(bday) {
  if (!bday) return false;
  const now = new Date();
  const [,m,d] = bday.split('-');
  return parseInt(m) === now.getMonth() + 1 && parseInt(d) === now.getDate();
}

function isPetBirthdayMonth(bday) {
  if (!bday) return false;
  const [,m] = bday.split('-');
  return parseInt(m) === new Date().getMonth() + 1;
}

function daysUntilBirthday(bday) {
  if (!bday) return null;
  const now = new Date();
  const [,m,d] = bday.split('-');
  const next = new Date(now.getFullYear(), parseInt(m)-1, parseInt(d));
  if (next < now) next.setFullYear(next.getFullYear() + 1);
  const diff = Math.round((next - now) / 86400000);
  return diff;
}

function cycleDays(ciclo) {
  if (ciclo === 'semanal') return 7;
  if (ciclo === 'quinzenal') return 15;
  if (ciclo === 'mensal') return 30;
  return null;
}

function getContactStatus(cliente) {
  const dias = cycleDays(cliente.ciclo);
  if (!dias || !cliente.ultimoAtendimento) return 'sem_ciclo';
  const ultimo = new Date(cliente.ultimoAtendimento);
  const next = new Date(ultimo.getTime() + dias * 86400000);
  const diff = Math.round((next - new Date()) / 86400000);
  if (diff < -3) return 'atrasado';
  if (diff <= 3) return 'confirmar';
  return 'agendado';
}

// ─── CLIENTE INSIGHT (novo, para cards) ───────────────────────
function getClienteInsight(c) {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const hojeStr = hoje.toISOString().slice(0,10);

  // ── Último Banho ───────────────────────────────────────────
  let ultimoBanho = null;
  if (c.ultimoAtendimento) {
    const ult = new Date(c.ultimoAtendimento + 'T00:00:00');
    const diff = Math.floor((hoje - ult) / (1000 * 60 * 60 * 24));
    ultimoBanho = { dias: diff, data: c.ultimoAtendimento };
  }

  // ── Ciclo ──────────────────────────────────────────────────
  let ciclo = null;
  const diasCiclo = cycleDays(c.ciclo);
  if (diasCiclo && ultimoBanho) {
    const progresso = Math.min(ultimoBanho.dias / diasCiclo, 1.5); // cap em 150% p/ overflow
    const diasRestantes = diasCiclo - ultimoBanho.dias;
    ciclo = { tipo: c.ciclo, diasCiclo, diasRestantes, progresso };
  } else if (diasCiclo) {
    ciclo = { tipo: c.ciclo, diasCiclo, diasRestantes: null, progresso: 0 };
  }

  // ── Próximo Agendamento (REAL, da agenda) ──────────────────
  let proximoAgendamento = null;
  const agendsFuturos = state.agendamentos
    .filter(a => a.clienteId === c.id && a.status !== 'concluido' && a.status !== 'cancelado' && a.data >= hojeStr)
    .sort((a,b) => {
      if (a.data === b.data) return (a.hora||'').localeCompare(b.hora||'');
      return a.data.localeCompare(b.data);
    });
  if (agendsFuturos.length > 0) {
    const prox = agendsFuturos[0];
    const srv = state.servicos.find(s => s.id === prox.servicoId);
    const isHoje = prox.data === hojeStr;
    proximoAgendamento = { data: prox.data, hora: prox.hora, servico: srv?.nome || 'Serviço', isHoje };
  }

  // ── Créditos ───────────────────────────────────────────────
  let creditos = null;
  const pacote = c.pacote;
  if (pacote && pacote.servicos && pacote.servicos.length > 0) {
    const totalRestante = pacote.servicos.reduce((s, i) => s + Math.max(0, i.contratado - i.usado), 0);
    const totalContratado = pacote.servicos.reduce((s, i) => s + i.contratado, 0);
    creditos = { restantes: totalRestante, total: totalContratado, esgotado: totalRestante === 0, nome: pacote.nome };
  }

  // ── Mini Timeline (últimos 4 atendimentos concluídos) ─────
  const timeline = state.agendamentos
    .filter(a => a.clienteId === c.id && a.status === 'concluido')
    .sort((a,b) => b.data.localeCompare(a.data))
    .slice(0, 4)
    .map(a => {
      const srv = state.servicos.find(s => s.id === a.servicoId);
      return { data: a.data, servico: srv?.nome || '—' };
    });

  // ── Ação + Prioridade ─────────────────────────────────────
  let acao = null;
  let prioridade = 5;

  if (!proximoAgendamento) {
    // Sem agendamento futuro: decidir pela urgência do ciclo
    if (ciclo && ciclo.diasRestantes !== null) {
      if (ciclo.diasRestantes < -3) {
        acao = 'resgatar';   // sumiu faz tempo
        prioridade = 1;
      } else if (ciclo.diasRestantes <= 3) {
        acao = 'agendar';    // hora de chamar
        prioridade = 2;
      } else {
        acao = 'ok_ciclo';   // ainda está cedo, relaxa
        prioridade = 5;
      }
    } else if (!ciclo && ultimoBanho && ultimoBanho.dias > 60) {
      acao = 'resgatar';     // sem ciclo mas sumiu
      prioridade = 1;
    } else if (!ciclo && ultimoBanho && ultimoBanho.dias > 30) {
      acao = 'agendar';
      prioridade = 2;
    }
  } else {
    acao = 'agendado';       // tem data real
    prioridade = proximoAgendamento.isHoje ? 4 : 5;
  }

  // Crédito esgotado sobe prioridade
  if (creditos && creditos.esgotado && prioridade > 3) {
    acao = 'renovar';
    prioridade = 3;
  }

  return { ultimoBanho, proximoAgendamento, ciclo, creditos, timeline, acao, prioridade, pacote };
}

// ─── SIDEBAR DATE ─────────────────────────────────────────────
function updateSidebarDate() {
  const now = new Date();
  const el = document.getElementById('sidebar-date');
  if (!el) return;

  const todayStr = today();
  const agendHoje = (state?.agendamentos || []).filter(a => a.data === todayStr).length;

  const diaSemana = DAYS_PT[now.getDay()];
  // Nomes por extenso completos (DAYS_PT usa abreviado, então definimos aqui)
  const diasExtenso = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const diaExtenso = diasExtenso[now.getDay()];
  const diaNum     = now.getDate();
  const mesExtenso = MONTHS_PT[now.getMonth()];
  const ano        = now.getFullYear();

  const pillHTML = agendHoje > 0 ? `
    <span style="flex-shrink:0;font-size:10px;font-weight:500;padding:2px 7px;border-radius:3px;background:rgba(10,191,163,0.12);border:0.5px solid rgba(10,191,163,0.3);color:#0ABFA3;white-space:nowrap;">${agendHoje} hoje</span>
  ` : '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.07);margin-bottom:10px;">
      <i class="ti ti-calendar" style="font-size:15px;color:#7A90A8;flex-shrink:0;"></i>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:500;color:#EEF2F7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${diaExtenso}, ${diaNum} de ${mesExtenso}</div>
        <div style="font-size:10px;color:#7A90A8;margin-top:1px;">${ano}</div>
      </div>
      ${pillHTML}
    </div>
  `;
}

// ─── FILA BADGE ───────────────────────────────────────────────
function updateFilaBadge() {
  const count = state.clientes.filter(c => {
    const s = getContactStatus(c);
    return s === 'atrasado' || s === 'confirmar';
  }).length;
  const el = document.getElementById('fila-badge');
  if (el) {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  }
  // Atualiza pill de agendamentos do dia no widget de data
  updateSidebarDate();
}

// ─── DASHBOARD ────────────────────────────────────────────────
let dashCharts = {};

function renderDashboard() {
  const page = document.getElementById('page-dashboard');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,'0')}`;

  // ── Métricas mês atual ─────────────────────────────────────────
  const agendsMes    = state.agendamentos.filter(a => a.data?.startsWith(thisMonth));
  const agendsPrev   = state.agendamentos.filter(a => a.data?.startsWith(prevMonth));
  // ── FONTE ÚNICA: toda receita vem de state.financeiro ──
  const receita = state.financeiro.filter(f => f.tipo === 'receita' && f.data?.startsWith(thisMonth)).reduce((s, f) => s + Number(f.valor || 0), 0);
  const receitaPrev = state.financeiro.filter(f => f.tipo === 'receita' && f.data?.startsWith(prevMonth)).reduce((s, f) => s + Number(f.valor || 0), 0);
  const custos           = state.financeiro.filter(f => f.tipo === 'custo' && f.data?.startsWith(thisMonth)).reduce((s, f) => s + Number(f.valor || 0), 0);
  const custosPrev       = state.financeiro.filter(f => f.tipo === 'custo' && f.data?.startsWith(prevMonth)).reduce((s, f) => s + Number(f.valor || 0), 0);
  const lucro            = receita - custos;
  const lucroPrev        = receitaPrev - custosPrev;
  const ticketMedio      = agendsMes.length ? receita / agendsMes.length : 0;
  const ticketPrev       = agendsPrev.length ? receitaPrev / agendsPrev.length : 0;

  function pct(cur, prev) {
    if (!prev) return cur > 0 ? '+100%' : null;
    const p = ((cur - prev) / prev * 100).toFixed(1);
    return (p >= 0 ? '+' : '') + p + '%';
  }
  function pctColor(cur, prev) { return cur >= prev ? '#4ade80' : '#f87171'; }
  function kpiDelta(cur, prev) {
    const p = pct(cur, prev);
    if (!p) return '';
    const c = pctColor(cur, prev);
    const arrow = cur >= prev ? '↑' : '↓';
    return `<div style="font-size:11px;font-weight:700;color:${c};margin-top:4px;">${arrow} ${p} vs mês ant.</div>`;
  }

  const aniversariantes = state.clientes.filter(c => isPetBirthday(c.pet?.aniversario));
  const filaAtencao = state.clientes.filter(c => { const s = getContactStatus(c); return s === 'atrasado' || s === 'confirmar'; });

  // ── Top clientes ───────────────────────────────────────────────
  const clientRank = state.clientes.map(c => {
    const agends = state.agendamentos.filter(a => a.clienteId === c.id && a.status === 'concluido');
    const gasto = agends.reduce((s, a) => { const srv = state.servicos.find(sv => sv.id === a.servicoId); return s + (srv ? Number(srv.preco) : 0); }, 0);
    return { ...c, gasto, visits: agends.length };
  }).filter(c => c.gasto > 0).sort((a,b) => b.gasto - a.gasto).slice(0, 5);
  const maxGasto = clientRank[0]?.gasto || 1;

  // ── 6 meses de dados ───────────────────────────────────────────
  const months6 = [], receita6 = [], custo6 = [], lucro6 = [], pctLabels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months6.push(MONTHS_PT[d.getMonth()].slice(0,3));
    const r = state.financeiro.filter(f => f.tipo === 'receita' && f.data?.startsWith(key)).reduce((s, f) => s + Number(f.valor || 0), 0);
    const c = state.financeiro.filter(f => f.tipo === 'custo' && f.data?.startsWith(key)).reduce((s, f) => s + Number(f.valor || 0), 0);
    receita6.push(r);
    custo6.push(c);
    lucro6.push(r - c);
  }
  // Calcular % mês a mês para cada mês de receita
  for (let i = 0; i < 6; i++) {
    if (i === 0 || receita6[i-1] === 0) { pctLabels.push(null); continue; }
    const p = ((receita6[i] - receita6[i-1]) / receita6[i-1] * 100).toFixed(1);
    pctLabels.push({ val: p, up: Number(p) >= 0 });
  }

  // ── Serviços do mês ────────────────────────────────────────────
  const srvCount = {}, srvVal = {};
  agendsMes.forEach(a => {
    const srv = state.servicos.find(s => s.id === a.servicoId);
    if (srv) {
      srvCount[srv.nome] = (srvCount[srv.nome] || 0) + 1;
      srvVal[srv.nome] = (srvVal[srv.nome] || 0) + Number(srv.preco);
    }
  });
  const srvEntries = Object.entries(srvCount).sort((a,b) => b[1]-a[1]);
  const srvLabels = srvEntries.map(e => e[0]);
  const srvData   = srvEntries.map(e => e[1]);
  const totalSrv  = srvData.reduce((s, v) => s + v, 0) || 1;
  const CHART_COLORS = ['#0ABFA3','#E040A0','#60A5FA','#FBBF24','#f87171','#a78bfa'];

  // ── Hoje ────────────────────────────────────────────────────────
  const hojeDateObj = new Date();
  const hojeStr = `${hojeDateObj.getFullYear()}-${String(hojeDateObj.getMonth()+1).padStart(2,'0')}-${String(hojeDateObj.getDate()).padStart(2,'0')}`;
  
  const agendsHojeAll = state.agendamentos.filter(a => a.data === hojeStr);
  const agendsHojeConcluidos = agendsHojeAll.filter(a => a.status === 'concluido');
  
  // ── FONTE ÚNICA: faturado hoje vem do financeiro ──
  const faturadoHoje = state.financeiro.filter(f => f.tipo === 'receita' && f.data === hojeStr).reduce((s, f) => s + Number(f.valor || 0), 0);
  const atendimentosHoje = agendsHojeAll.length;
  const ticketMedioHoje = agendsHojeConcluidos.length > 0 ? (faturadoHoje / agendsHojeConcluidos.length) : 0;
  
  const hNow = hojeDateObj.getHours();
  const mNow = hojeDateObj.getMinutes();
  const tNow = hNow * 60 + mNow;
  
  // Usar a função inteligente para achar os horários livres com um bloco padrão de 30 min (usamos null pois não sabemos qual serviço será)
  let nextLivre = null;
  if (typeof calcularHorariosLivres === 'function') {
    const slots = calcularHorariosLivres(hojeStr, null); // vai assumir 60min default, ou poderíamos criar um serviço dummy. Vamos assumir que 30 min (menor servico) é o suficiente para ter um "horário livre"
    
    // Melhor: recalcular manualmente aqui apenas gaps puros de pelo menos 30 min para ser flexível
    const blocks = agendsHojeAll.map(a => {
      if (!a.hora) return null;
      const [h, m] = a.hora.split(':').map(Number);
      const start = h * 60 + m;
      const aSrv = state.servicos.find(s => s.id === a.servicoId);
      const aDur = aSrv ? (aSrv.duracao || 60) : 60;
      return { start, end: start + aDur };
    }).filter(b => b !== null);
  
    for (let m = Math.max(8 * 60, Math.ceil(tNow / 30) * 30); m + 35 <= 18 * 60; m += 30) {
      let overlap = false;
      for (const b of blocks) {
        if (m < b.end && (m + 35) > b.start) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        nextLivre = `${hh}:${mm}`;
        break;
      }
    }
  }

  // ── Taxa de Retorno ──────────────────────────────────────────────
  const cliAgMes = {};
  agendsMes.forEach(a => { cliAgMes[a.clienteId] = (cliAgMes[a.clienteId] || 0) + 1; });
  const cliRetMes = Object.values(cliAgMes).filter(c => c >= 2).length;
  const ativosMes = state.clientes.length;
  const taxaRetorno = ativosMes ? ((cliRetMes / ativosMes) * 100).toFixed(1) : '0.0';
  let taxRetColor = '#f87171';
  if (taxaRetorno >= 70) taxRetColor = '#0ABFA3';
  else if (taxaRetorno >= 40) taxRetColor = '#FBBF24';
  
  const cliAgPrev = {};
  agendsPrev.forEach(a => { cliAgPrev[a.clienteId] = (cliAgPrev[a.clienteId] || 0) + 1; });
  const cliRetPrev = Object.values(cliAgPrev).filter(c => c >= 2).length;
  const taxaRetPrev = ativosMes ? ((cliRetPrev / ativosMes) * 100).toFixed(1) : '0.0';

  // ── Clientes Ativos (Últimos 60 dias) ────────────────────────
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  const ativosAtuais = new Set();
  const ativosAnt = new Set();
  const primeirosAtendimentos = {};

  state.agendamentos.forEach(a => {
    if (a.status !== 'concluido') return;
    const d = new Date(a.data);
    
    // Window 1: last 60 days
    if (d >= sixtyDaysAgo && d <= now) ativosAtuais.add(a.clienteId);
    
    // Window 2: prev month sliding window (30 to 90 days ago) for variance
    if (d >= ninetyDaysAgo && d < thirtyDaysAgo) ativosAnt.add(a.clienteId);
    
    // Track first attendance
    if (!primeirosAtendimentos[a.clienteId] || d < primeirosAtendimentos[a.clienteId]) {
      primeirosAtendimentos[a.clienteId] = d;
    }
  });

  let clientesNovos = 0;
  for (let cid in primeirosAtendimentos) {
    const d = primeirosAtendimentos[cid];
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      clientesNovos++;
    }
  }

  const clientesAtivosVal = ativosAtuais.size;
  const clientesAtivosPrev = ativosAnt.size;
  const totalClientesVal = state.clientes.length;

  // ── Radar de Retenção (>30 dias e sem futuro) ──
  const limitDays = 30;
  const retentionList = state.clientes.map(c => {
    const agends = state.agendamentos.filter(a => a.clienteId === c.id);
    if (agends.length === 0) return null;
    
    // Check se tem algo no futuro
    const hasFuture = agends.some(a => {
      if (a.status !== 'agendado') return false;
      const d = new Date(a.data);
      d.setHours(23, 59, 59, 999);
      return d >= now;
    });
    if (hasFuture) return null;

    // Achar o mais recente concluído
    const concluidos = agends.filter(a => a.status === 'concluido').sort((a,b) => new Date(b.data) - new Date(a.data));
    if (concluidos.length === 0) return null;
    
    const ult = new Date(concluidos[0].data);
    const diffTime = Math.abs(now - ult);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= limitDays) {
      return { cliente: c, dias: diffDays, ultimo: concluidos[0] };
    }
    return null;
  }).filter(Boolean).sort((a,b) => b.dias - a.dias);

  const retentionHtml = retentionList.length > 0 ? `
    <div class="retention-radar-card">
      <div class="retention-radar-header">
        <i class="ti ti-radar"></i> Radar de Retenção (Atrasados > 30 dias)
      </div>
      <div class="retention-list">
        ${retentionList.slice(0, 5).map(r => {
          let msgAtrasado = state.configuracoes?.mensagens?.atrasado || '';
          msgAtrasado = msgAtrasado.replace('{{nome}}', r.cliente.nome).replace('{{pet}}', r.cliente.pet?.nome || 'pet');
          const waUrl = 'https://wa.me/55' + r.cliente.telefone.replace(/\\D/g, '') + '?text=' + encodeURIComponent(msgAtrasado);
          return `
            <div class="retention-item">
              <div class="rt-info">
                <span class="rt-pet">${r.cliente.pet?.nome || 'Sem pet'} (Tutor: ${r.cliente.nome})</span>
                <span class="rt-days">Há ${r.dias} dias sumido</span>
              </div>
              <a href="${waUrl}" target="_blank" class="rt-btn"><i class="ti ti-brand-whatsapp"></i> Chamar</a>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  page.innerHTML = `
    <!-- ── KPIs ── -->
    <div class="grid grid-4 mb-3">
      <div class="kpi-card" style="--kpi-color:#0ABFA3">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">Receita do Mês</div>
          <i class="ti ti-trending-up" style="color:#0ABFA3;font-size:16px;"></i>
        </div>
        <div class="kpi-value" style="color:#0ABFA3">${fmtMoney(receita)}</div>
        <div class="kpi-sub">${agendsMes.length} atendimentos</div>
        ${kpiDelta(receita, receitaPrev)}
      </div>
      <div class="kpi-card" style="--kpi-color:#4ade80">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">Lucro Líquido</div>
          <i class="ti ti-chart-bar" style="color:#4ade80;font-size:16px;"></i>
        </div>
        <div class="kpi-value" style="color:#4ade80">${fmtMoney(lucro)}</div>
        <div class="kpi-sub">Custos: ${fmtMoney(custos)}</div>
        ${kpiDelta(lucro, lucroPrev)}
      </div>
      <div class="kpi-card" style="--kpi-color:#60A5FA">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">Ticket Médio</div>
          <i class="ti ti-receipt" style="color:#60A5FA;font-size:16px;"></i>
        </div>
        <div class="kpi-value" style="color:#60A5FA">${fmtMoney(ticketMedio)}</div>
        <div class="kpi-sub">${state.clientes.length} clientes ativos</div>
        ${kpiDelta(ticketMedio, ticketPrev)}
      </div>
      <div class="kpi-card" style="--kpi-color:#E040A0">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">Atendimentos</div>
          <i class="ti ti-paw" style="color:#E040A0;font-size:16px;"></i>
        </div>
        <div class="kpi-value" style="color:#E040A0">${agendsMes.length}</div>
        <div class="kpi-sub">Este mês</div>
        ${kpiDelta(agendsMes.length, agendsPrev.length)}
      </div>
    </div>
    
    <div class="grid grid-2 mb-3" style="gap: 12px;">
      <div class="kpi-card" style="--kpi-color:${taxRetColor}; border-top: 2.5px solid ${taxRetColor};">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">Taxa de Retorno</div>
          <i class="ti ti-refresh" style="color:${taxRetColor};font-size:16px;"></i>
        </div>
        <div class="kpi-value" style="color:${taxRetColor}">${taxaRetorno}%</div>
        <div class="kpi-sub">${cliRetMes} de ${ativosMes} clientes retornaram</div>
        ${kpiDelta(Number(taxaRetorno), Number(taxaRetPrev))}
      </div>
      <div class="kpi-card" style="--kpi-color:#0ABFA3; border-top: 2.5px solid #0ABFA3;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)">Clientes Ativos</div>
          <i class="ti ti-users" style="color:#0ABFA3;font-size:16px;"></i>
        </div>
        <div class="kpi-value" style="color:#0ABFA3;">
          ${totalClientesVal === 0 ? '—' : clientesAtivosVal}
        </div>
        <div class="kpi-sub" style="font-size: 12px;">${totalClientesVal === 0 ? '—' : `${clientesAtivosVal} de ${totalClientesVal} clientes ativos`}</div>
        <div style="margin-top: 4px; font-size: 11px;">
          ${clientesNovos > 0 
            ? `<i class="ti ti-user-plus" style="font-size:11px;color:#4ade80;margin-right:4px;"></i><span style="color:#4ade80">+${clientesNovos} novo(s) este mês</span>`
            : `<span style="color:var(--text-muted)">Nenhum cliente novo este mês</span>`
          }
        </div>
        ${totalClientesVal === 0 ? '' : kpiDelta(clientesAtivosVal, clientesAtivosPrev)}
      </div>
    </div>

    <!-- ── Faixa Hoje ── -->
    <div style="background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 16px;display:flex;align-items:center;gap:24px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <i class="ti ti-sun" style="font-size:14px;color:#FBBF24;"></i>
        <span style="font-size:11px;font-weight:500;color:#FBBF24;">Hoje</span>
      </div>
      <div style="width:0.5px;height:24px;background:rgba(255,255,255,0.1);"></div>
      <div>
        <div style="font-size:14px;font-weight:500;color:#0ABFA3;">${fmtMoney(faturadoHoje)}</div>
        <div style="font-size:10px;color:var(--text-muted);">faturado hoje</div>
      </div>
      <div style="width:0.5px;height:24px;background:rgba(255,255,255,0.1);"></div>
      <div>
        <div style="font-size:14px;font-weight:500;color:#fff;">${atendimentosHoje}</div>
        <div style="font-size:10px;color:var(--text-muted);">atendimentos</div>
      </div>
      <div style="width:0.5px;height:24px;background:rgba(255,255,255,0.1);"></div>
      <div>
        <div style="font-size:14px;font-weight:500;color:#60A5FA;">${fmtMoney(ticketMedioHoje)}</div>
        <div style="font-size:10px;color:var(--text-muted);">tkt. médio</div>
      </div>
      <div style="width:0.5px;height:24px;background:rgba(255,255,255,0.1);"></div>
      <div>
        <div style="font-size:12px;color:var(--text-muted);">${nextLivre ? `próximo livre: ${nextLivre}` : 'agenda cheia hoje'}</div>
      </div>
      <div style="margin-left:auto;">
        <span onclick="navigate('agenda')" style="font-size:11px;color:#0ABFA3;cursor:pointer;font-weight:600;">Ver agenda →</span>
      </div>
    </div>


    <!-- ── Alertas ── -->
    ${retentionHtml}
    ${aniversariantes.length ? `
    <div class="card mb-3" style="border-color:rgba(224,64,160,0.35);background:rgba(224,64,160,0.05);">
      <div class="section-header" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#E040A0;">
          <i class="ti ti-cake"></i> Pets Aniversariantes Hoje
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${aniversariantes.map(c => {
          const av = avatarColor ? avatarColor(c.nome) : { bg:'rgba(224,64,160,0.12)', border:'rgba(224,64,160,0.3)', color:'#E040A0' };
          const ini = c.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
          return `<div style="display:flex;align-items:center;gap:10px;background:var(--card);border:0.5px solid rgba(224,64,160,0.25);border-radius:8px;padding:8px 12px;cursor:pointer;" onclick="openClienteDetalhe('${c.id}')">
            <div style="width:32px;height:32px;border-radius:50%;background:${av.bg};border:0.5px solid ${av.border};color:${av.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${c.pet?.foto?`<img src="${c.pet.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ini}</div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text);">${c.nome}</div>
              <div style="font-size:11px;color:#E040A0;">🎂 ${c.pet?.nome || 'Pet'}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${filaAtencao.length ? `
    <div class="card mb-3" style="border-color:rgba(251,191,36,0.3);">
      <div class="section-header" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#FBBF24;">
          <i class="ti ti-alert-triangle"></i> Atenção Necessária
          <span style="background:rgba(251,191,36,0.15);color:#FBBF24;font-size:10px;font-weight:700;padding:1px 8px;border-radius:99px;">${filaAtencao.length}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('fila')" style="font-size:11px;">Ver Fila <i class="ti ti-arrow-right"></i></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${filaAtencao.slice(0, 3).map(c => {
          const st = getContactStatus(c);
          const av = typeof avatarColor === 'function' ? avatarColor(c.nome) : { bg:'rgba(10,191,163,0.15)', border:'rgba(10,191,163,0.3)', color:'#0ABFA3' };
          const ini = c.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
          const d = c.ultimoAtendimento ? Math.round((Date.now() - new Date(c.ultimoAtendimento)) / 86400000) : null;
          const stColor = st === 'atrasado' ? '#f87171' : '#FBBF24';
          const stLabel = st === 'atrasado' ? 'Em atraso' : 'Confirmar';
          const msg = st === 'atrasado'
            ? `Olá, ${c.nome.split(' ')[0]}! Aqui é o Espaço Pet TransformaCão. Notamos que já faz um tempinho desde o último banho do(a) ${c.pet?.nome || 'Pet'}. Que tal remarcarmos?`
            : `Olá, ${c.nome.split(' ')[0]}! Passando para confirmar o atendimento do(a) ${c.pet?.nome || 'Pet'}. Tudo certo?`;
          const url = c.telefone ? `https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}` : null;
          return `<div style="display:flex;align-items:center;gap:10px;background:var(--surface);border:0.5px solid rgba(255,255,255,0.05);border-radius:8px;padding:9px 12px;">
            <div style="width:34px;height:34px;border-radius:50%;background:${av.bg};border:0.5px solid ${av.border};color:${av.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${ini}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;font-weight:600;color:var(--text);">${c.nome} <span style="color:var(--text-muted);font-weight:400;">— ${c.pet?.nome || 'Pet'}</span></div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${c.ciclo ? 'Ciclo: ' + c.ciclo : 'Sem ciclo'}${d ? ' · há ' + d + ' dias' : ''}</div>
            </div>
            <span style="background:${stColor}18;color:${stColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;">${stLabel}</span>
            ${url ? `<a href="${url}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:6px;background:rgba(224,64,160,0.1);border:0.5px solid rgba(224,64,160,0.28);color:#E040A0;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap;"><i class="ti ti-brand-whatsapp"></i></a>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <!-- ── Gráficos ── -->
    <div class="grid grid-2 mb-3">
      <!-- Receita vs Custos -->
      <div class="card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="font-size:13px;font-weight:700;color:var(--text);">Receita vs Custos</div>
          <div style="font-size:11px;color:var(--text-muted);">últimos 6 meses</div>
        </div>
        <!-- Labels de % mês a mês -->
        <div style="display:flex;gap:0;margin-bottom:8px;padding:0 2px;" id="pct-labels-row">
          ${months6.map((m, i) => {
            const p = pctLabels[i];
            if (!p) return `<div style="flex:1;text-align:center;"></div>`;
            const c = p.up ? '#4ade80' : '#f87171';
            const arrow = p.up ? '↑' : '↓';
            return `<div style="flex:1;text-align:center;font-size:10px;font-weight:700;color:${c};">${arrow}${Math.abs(p.val)}%</div>`;
          }).join('')}
        </div>
        <div style="position:relative;height:200px;">
          <canvas id="chart-receita"></canvas>
        </div>
        <!-- Legenda customizada -->
        <div style="display:flex;gap:16px;margin-top:12px;justify-content:center;">
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);"><span style="width:12px;height:12px;border-radius:3px;background:#0ABFA3;display:inline-block;"></span>Receita</div>
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);"><span style="width:12px;height:12px;border-radius:3px;background:#E040A0;display:inline-block;"></span>Custos</div>
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);"><span style="width:12px;height:3px;border-radius:3px;background:#4ade80;display:inline-block;"></span>Lucro</div>
        </div>
      </div>

      <!-- Serviços do Mês -->
      <div class="card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:var(--text);">Serviços do Mês</div>
          <div style="font-size:11px;color:var(--text-muted);">${totalSrv} atendimentos</div>
        </div>
        ${srvEntries.length === 0 ? `<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:40px 0;">Sem atendimentos este mês</div>` :
        `<div style="display:flex;gap:16px;align-items:center;">
          <div style="position:relative;width:130px;height:130px;flex-shrink:0;">
            <canvas id="chart-servicos"></canvas>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
            ${srvEntries.slice(0,5).map(([nome, count], i) => {
              const pctSrv = Math.round(count / totalSrv * 100);
              const val = srvVal[nome] || 0;
              return `<div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${CHART_COLORS[i % CHART_COLORS.length]};display:inline-block;flex-shrink:0;"></span>
                    <span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;">${nome}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:10px;color:var(--text-muted);">${count}x</span>
                    <span style="font-size:10px;color:#0ABFA3;font-weight:700;">${pctSrv}%</span>
                  </div>
                </div>
                <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;">
                  <div style="width:${pctSrv}%;height:100%;background:${CHART_COLORS[i % CHART_COLORS.length]};border-radius:99px;transition:width .4s;"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`}
      </div>
    </div>

    <!-- ── Top Clientes + Próximos Agendamentos ── -->
    <div class="grid grid-2 mb-3">
      <!-- Top Clientes -->
      ${clientRank.length ? `<div class="card" style="padding:20px;">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:8px;">
          <i class="ti ti-trophy" style="color:#FBBF24;"></i> Top Clientes
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${clientRank.map((c, i) => {
            const bar = Math.round(c.gasto / maxGasto * 100);
            const av = typeof avatarColor === 'function' ? avatarColor(c.nome) : { bg:'rgba(10,191,163,0.15)', border:'rgba(10,191,163,0.3)', color:'#0ABFA3' };
            const ini = c.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
            const medals = ['#FBBF24','#9ca3af','#cd7f32'];
            const medalColor = medals[i] || 'var(--text-muted)';
            return `<div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:13px;font-weight:800;color:${medalColor};width:16px;text-align:center;flex-shrink:0;">${i+1}</div>
              <div style="width:28px;height:28px;border-radius:50%;background:${av.bg};border:0.5px solid ${av.border};color:${av.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${c.pet?.foto?`<img src="${c.pet.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ini}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;">${c.nome}</span>
                  <span style="font-size:11px;color:#0ABFA3;font-weight:700;white-space:nowrap;">${fmtMoney(c.gasto)}</span>
                </div>
                <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;">
                  <div style="width:${bar}%;height:100%;background:linear-gradient(90deg,#0ABFA3,#60A5FA);border-radius:99px;"></div>
                </div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${c.visits} visita${c.visits !== 1 ? 's' : ''} · ${c.pet?.nome || '—'}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : '<div></div>'}

      <!-- Próximos Agendamentos -->
      <div class="card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">
            <i class="ti ti-calendar-event" style="color:#60A5FA;"></i> Próximos Agendamentos
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('agenda')" style="font-size:11px;">Ver Agenda</button>
        </div>
        ${renderProximosAgend()}
      </div>
    </div>
  `;

  // ── Charts ─────────────────────────────────────────────────────
  requestAnimationFrame(() => {
    destroyCharts();

    // Gráfico Receita vs Custos
    const ctx1 = document.getElementById('chart-receita')?.getContext('2d');
    if (ctx1) {
      dashCharts.receita = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: months6,
          datasets: [
            {
              label: 'Receita',
              data: receita6,
              backgroundColor: 'rgba(10,191,163,0.75)',
              borderColor: '#0ABFA3',
              borderWidth: 1.5,
              borderRadius: 5,
              borderSkipped: false,
              order: 2,
            },
            {
              label: 'Custos',
              data: custo6,
              backgroundColor: 'rgba(224,64,160,0.55)',
              borderColor: '#E040A0',
              borderWidth: 1.5,
              borderRadius: 5,
              borderSkipped: false,
              order: 3,
            },
            {
              label: 'Lucro',
              data: lucro6,
              type: 'line',
              borderColor: '#4ade80',
              backgroundColor: 'rgba(74,222,128,0.08)',
              borderWidth: 2,
              pointBackgroundColor: '#4ade80',
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.4,
              fill: true,
              order: 1,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1E2235',
              titleColor: '#EEF0F6',
              bodyColor: '#8B91A8',
              borderColor: '#3A4160',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${fmtMoney(ctx.raw)}`,
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#8B91A8', font: { family: 'Nunito', size: 11 } },
              grid: { color: 'rgba(58,65,96,0.3)', drawBorder: false },
              border: { display: false }
            },
            y: {
              ticks: { color: '#8B91A8', font: { family: 'Nunito', size: 11 }, callback: v => `R$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}` },
              grid: { color: 'rgba(58,65,96,0.3)', drawBorder: false },
              border: { display: false }
            }
          }
        }
      });
    }

    // Gráfico Serviços (doughnut compacto)
    const ctx2 = document.getElementById('chart-servicos')?.getContext('2d');
    if (ctx2 && srvLabels.length) {
      dashCharts.servicos = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: srvLabels,
          datasets: [{ data: srvData, backgroundColor: CHART_COLORS, borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1E2235',
              titleColor: '#EEF0F6',
              bodyColor: '#8B91A8',
              borderColor: '#3A4160',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.raw}x (${Math.round(ctx.raw/totalSrv*100)}%)`
              }
            }
          }
        }
      });
    } else if (ctx2) {
      dashCharts.servicos = new Chart(ctx2, {
        type: 'doughnut',
        data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#2D3347'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
      });
    }
  });
}

function destroyCharts() {
  Object.values(dashCharts).forEach(c => { try { c.destroy(); } catch {} });
  dashCharts = {};
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8B91A8', font: { family: 'Nunito', weight: '700', size: 12 } } },
      tooltip: { backgroundColor: '#1E2235', titleColor: '#EEF0F6', bodyColor: '#8B91A8', borderColor: '#3A4160', borderWidth: 1, padding: 12 }
    },
    scales: {
      x: { ticks: { color: '#8B91A8' }, grid: { color: 'rgba(58,65,96,0.3)' }, border: { display: false } },
      y: { ticks: { color: '#8B91A8', callback: v => `R$${v}` }, grid: { color: 'rgba(58,65,96,0.3)' }, border: { display: false } }
    }
  };
}

function renderProximosAgend() {
  const todayStr = today();
  const proximos = state.agendamentos
    .filter(a => a.data >= todayStr && a.status !== 'concluido')
    .sort((a,b) => (a.data+a.hora).localeCompare(b.data+b.hora))
    .slice(0, 5);
  if (!proximos.length) return `<div style="text-align:center;padding:32px 0;"><div style="font-size:28px;margin-bottom:8px;">📅</div><div style="font-size:12px;color:var(--text-muted);">Nenhum agendamento próximo</div></div>`;

  return proximos.map(a => {
    const c = state.clientes.find(c => c.id === a.clienteId);
    const srv = state.servicos.find(s => s.id === a.servicoId);
    const isToday = a.data === todayStr;
    const av = c && typeof avatarColor === 'function' ? avatarColor(c.nome) : { bg:'rgba(96,165,250,0.12)', border:'rgba(96,165,250,0.3)', color:'#60A5FA' };
    const ini = c ? c.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '??';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid rgba(255,255,255,0.05);">
        <div style="text-align:center;min-width:42px;">
          <div style="font-size:16px;font-weight:800;color:${isToday ? '#60A5FA' : 'var(--text)'};">${a.hora || '—'}</div>
          <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">${isToday ? 'hoje' : fmt(a.data)}</div>
        </div>
        <div style="width:30px;height:30px;border-radius:50%;background:${av.bg};border:0.5px solid ${av.border};color:${av.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${c?.pet?.foto?`<img src="${c.pet.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ini}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c ? c.nome : 'Cliente'} <span style="color:var(--text-muted);font-weight:400;">— ${c?.pet?.nome || '—'}</span></div>
          <div style="font-size:11px;color:var(--text-muted);">${srv ? srv.nome : '—'}</div>
        </div>
        <div style="font-size:12px;color:#0ABFA3;font-weight:700;white-space:nowrap;">${srv ? fmtMoney(srv.preco) : ''}</div>
      </div>`;
  }).join('');
}
// ─── AGENDA ───────────────────────────────────────────────────
let calYear, calMonth;

function renderAgenda() {
  const page = document.getElementById('page-agenda');
  const now = new Date();
  if (!calYear) calYear = now.getFullYear();
  if (calMonth === undefined) calMonth = now.getMonth();

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startDow = firstDay.getDay();

  // Build calendar days
  const days = [];
  // Previous month padding
  for (let i = 0; i < startDow; i++) {
    const d = new Date(calYear, calMonth, -startDow + i + 1);
    days.push({ date: d, cur: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(calYear, calMonth, d), cur: true });
  }
  // Fill remaining
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    days.push({ date: new Date(last.getTime() + 86400000), cur: false });
  }

  const todayStr = today();

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  const dayRows = [];
  for (let r = 0; r < days.length / 7; r++) {
    dayRows.push(days.slice(r*7, r*7+7));
  }

  const selectedDate = state._selectedDate || todayStr;
  const dayAgendamentos = state.agendamentos.filter(a => a.data === selectedDate)
    .sort((a,b) => (a.hora||'').localeCompare(b.hora||''));

  page.innerHTML = `
    <div class="grid grid-2" style="grid-template-columns:minmax(0, 1fr) 340px;gap:20px">
      <div>
        <div class="calendar-header">
          <button class="btn btn-ghost btn-sm" onclick="calNav(-1)">← Anterior</button>
          <div class="calendar-title">${MONTHS_PT[calMonth]} ${calYear}</div>
          <button class="btn btn-ghost btn-sm" onclick="calNav(1)">Próximo →</button>
        </div>
        <div class="calendar-grid">
          ${DAYS_PT.map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
          ${dayRows.flat().map(({date, cur}) => {
            const key = dateKey(date);
            const evts = state.agendamentos.filter(a => a.data === key);
            const isToday = key === todayStr;
            const isSel = key === selectedDate;
            return `<div class="calendar-day${!cur?' other-month':''}${isToday?' today':''}${isSel?' selected':''}" onclick="selectDate('${key}')">
              <div class="day-num">${date.getDate()}</div>
              ${evts.slice(0,3).map(e => {
                const c = state.clientes.find(c=>c.id===e.clienteId);
                let statusClass = e.status;
                if (!statusClass || statusClass === 'pendente') {
                  statusClass = e.data === todayStr ? 'andamento' : (e.data < todayStr ? 'andamento' : 'agendado');
                }
                if (statusClass !== 'concluido' && statusClass !== 'andamento' && statusClass !== 'agendado') {
                  statusClass = 'agendado';
                }
                
                const getEventColor = (st) => {
                  if (st === 'concluido') return '#2DD4BF';
                  if (st === 'andamento') return '#FBBF24';
                  return '#60A5FA'; // agendado
                };
                const color = getEventColor(statusClass);
                
                return `<div class="day-event" style="border-left: 3px solid ${color}; background: ${color}14; color: ${color};">
                  <span style="width:6px; height:6px; border-radius:50%; flex-shrink:0; background-color:${color};"></span>
                  <span style="flex:1; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c?.pet?.nome||'Pet'}</span>
                  <span style="font-size:10px; opacity:0.6;">${e.hora||''}</span>
                </div>`;
              }).join('')}
              ${evts.length > 3 ? `<div class="day-event agendado" style="justify-content:center;">+${evts.length-3} agendados</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div>
        <div class="section-header">
          <div class="section-title">📋 ${fmt(selectedDate)}</div>
          <button class="btn btn-primary btn-sm" onclick="openAgendamentoModal('${selectedDate}')">+ Agendar</button>
        </div>
        ${dayAgendamentos.length === 0 ? `
          <div class="empty-state" style="padding:40px 10px">
            <span class="empty-icon">🗓️</span>
            <h3>Sem agendamentos</h3>
            <p>Clique em "+ Agendar" para adicionar</p>
          </div>
        ` : `
          <div class="appt-list">
            ${dayAgendamentos.map(a => {
              const c = state.clientes.find(c=>c.id===a.clienteId);
              const srv = state.servicos.find(s=>s.id===a.servicoId);
              const isConcluido = a.status === 'concluido';
              let statusClass = a.status;
              if (!statusClass || statusClass === 'pendente') {
                statusClass = a.data === todayStr ? 'andamento' : (a.data < todayStr ? 'andamento' : 'agendado');
              }
              if (statusClass !== 'concluido' && statusClass !== 'andamento' && statusClass !== 'agendado') {
                statusClass = 'agendado';
              }
              
              const badgeContent = a.status === 'concluido' 
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>Pago`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/></svg>A pagar`;
              
              return `<div class="appt-item card-${statusClass}" style="flex-direction:column; align-items:flex-start; gap:0; padding:12px 16px; border-radius:12px; overflow:hidden; position:relative;">
                <!-- LINHA 1 -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div class="time-pill pill-${statusClass}" style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px;">${a.hora||'—'}</div>
                    <div style="font-size:14px; font-weight:600; color:var(--text); display:flex; align-items:center; gap:4px;">
                      ${c?.pet?.nome||'Pet'}
                      ${c?.pet?.tags?.length ? c.pet.tags.map(t => `<span title="${t}" style="font-size:14px; cursor:help">${t.split(' ')[0]}</span>`).join('') : ''}
                    </div>
                  </div>
                  <div style="font-size:14px; font-weight:600; color:var(--text);">${srv?fmtMoney(srv.preco):''}</div>
                </div>
                <!-- LINHA 2 -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:10px;">
                  <div style="font-size:12px; color:var(--text-muted);">Tutor: ${c?c.nome:'Cliente'}</div>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <div style="font-size:12px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">${srv?srv.nome:'—'}</div>
                  </div>
                </div>
                <!-- OBS -->
                ${a.obs?`<div style="font-size:12px;color:var(--text-muted);padding:6px 10px;background:var(--surface);border-radius:8px;width:100%;margin-bottom:10px;">📝 ${a.obs}</div>`:''}
                <!-- LINHA 3 -->
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-top:10px;">
                  <span class="status-badge badge-${statusClass}" style="font-size: 11px; padding: 4px 8px; border-radius:6px; display:flex; align-items:center; font-weight:700;">${badgeContent}</span>
                  <div style="display:flex; gap:6px;">
                    ${a.status === 'concluido' ? `<button class="btn-avisar-pronto" onclick="avisarPronto('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9"/><path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"/></svg>Avisar Pronto</button>` : ''}
                    ${a.status !== 'concluido' ? `<button class="btn btn-primary btn-sm" style="background: var(--success); box-shadow: none;" onclick="concluirAgendamento('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg> Concluir</button>` : ''}
                    ${a.status !== 'concluido' ? `<button class="btn-lixeira" title="Editar" onclick="editAgendamento('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></svg></button>` : ''}
                    <button class="btn-lixeira ${a.taxiDog ? 'btn-taxi-ativo' : ''}" title="Taxi Dog${a.taxiDog ? ' (R$ '+a.taxiDog.toFixed(2).replace('.',',')+' registrado)' : ''}" onclick="event.stopPropagation(); openTaxiDogModal('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-1l-2.5 -4.5a1 1 0 0 0 -.86 -.5h-1.64"/><path d="M15 6l0 4.5"/></svg></button>
                    <button class="btn-lixeira" onclick="deleteAgendamento('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg></button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderAgenda();
}

window.selectDate = function(d) {
  state._selectedDate = d;
  renderAgenda();
};

window.calcularHorariosLivres = function(dataStr, servicoId, editAgendId = null) {
  const srv = state.servicos.find(s => s.id === servicoId);
  const duracao = srv ? (srv.duracao || 60) : 60;
  const totalMin = duracao; // buffer removido
  
  const agendsDia = state.agendamentos.filter(a => a.data === dataStr && a.status !== 'cancelado' && a.id !== editAgendId);
  
  const blocks = agendsDia.map(a => {
    if (!a.hora) return null;
    const [h, m] = a.hora.split(':').map(Number);
    const start = h * 60 + m;
    const aSrv = state.servicos.find(s => s.id === a.servicoId);
    const aDur = aSrv ? (aSrv.duracao || 60) : 60;
    return { start, end: start + aDur };
  }).filter(b => b !== null);

  const available = [];
  const startDay = 8 * 60; // 08:00
  const endDay = 18 * 60;  // 18:00
  
  for (let m = startDay; m + totalMin <= endDay; m += 30) {
    const slotStart = m;
    const slotEnd = m + totalMin;
    let overlap = false;
    for (const b of blocks) {
      if (slotStart < b.end && slotEnd > b.start) {
        overlap = true;
        break;
      }
    }
    if (!overlap) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      available.push(`${hh}:${mm}`);
    }
  }
  return available;
};

// ─── AGENDAMENTO MODAL ────────────────────────────────────────
window.openAgendamentoModal = function(preDate) {
  const servicoOpts = state.servicos.map(s =>
    `<option value="${s.id}">${s.nome} — ${fmtMoney(s.preco)}</option>`).join('');
  
  const html = `

    
    <div class="ag-modal-header">
      <div class="ag-header-left">
        <div class="ag-icon-square">
          <i class="ti ti-calendar-plus"></i>
        </div>
        <div style="display:flex;flex-direction:column;">
          <span class="ag-header-title">Novo agendamento</span>
          <span class="ag-header-subtitle">Preencha os dados do atendimento</span>
        </div>
      </div>
      <button class="ag-close-btn" onclick="document.getElementById('modal-overlay').classList.remove('open')">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <div class="ag-body">
      <!-- Hidden input for the actual logic -->
      <input type="hidden" id="ag-cliente" value="" />
      
      <div class="ag-form-group">
        <div class="ag-form-label">CLIENTE / PET</div>
        
        <!-- Estado 1: Busca Ativa -->
        <div class="ag-search-wrap" id="ag-search-wrap">
          <input type="text" class="ag-search-input" id="ag-search-input" placeholder="Buscar por nome do cliente ou pet..." autocomplete="off" />
          <div class="ag-search-results" id="ag-search-results"></div>
        </div>
        
        <!-- Estado 2: Cliente Confirmado -->
        <div class="ag-selected-card" id="ag-selected-card">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="ag-client-avatar" id="ag-selected-avatar"></div>
            <div class="ag-client-info">
              <div class="ag-client-name" id="ag-selected-name"></div>
              <div class="ag-client-pet" id="ag-selected-pet"></div>
            </div>
          </div>
          <button class="ag-btn-trocar" id="ag-btn-trocar">Trocar</button>
        </div>
      </div>

      <div class="ag-form-row">
        <div class="ag-form-group">
          <div class="ag-form-label">DATA</div>
          <div class="ag-select-wrap">
            <input type="date" class="ag-input" id="ag-data" value="${preDate||today()}" />
          </div>
        </div>
        <div class="ag-form-group">
          <div class="ag-form-label">HORÁRIO</div>
          <div class="ag-select-wrap">
            <select class="ag-select" id="ag-hora">
              <option value="">Carregando...</option>
            </select>
            <i class="ti ti-chevron-down ag-select-icon"></i>
          </div>
        </div>
      </div>

      <div class="ag-form-group">
        <div class="ag-form-label">SERVIÇO</div>
        <div class="ag-select-wrap">
          <select class="ag-select" id="ag-servico">
            ${servicoOpts || '<option value="">Nenhum serviço cadastrado</option>'}
          </select>
          <i class="ti ti-chevron-down ag-select-icon"></i>
        </div>
      </div>

      <div class="ag-form-group">
        <div class="ag-form-label">OBSERVAÇÕES <span style="font-size:9px;color:var(--text-muted);text-transform:none;opacity:0.8;font-weight:500;">(opcional)</span></div>
        <textarea class="ag-input ag-textarea" id="ag-obs" placeholder="Estilo da tosa, cuidados específicos..."></textarea>
      </div>
    </div>

    <div class="ag-footer">
      <button class="ag-btn ag-btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancelar</button>
      <button class="ag-btn ag-btn-save" onclick="salvarAgendamento()"><i class="ti ti-calendar-check" style="font-size:14px;"></i> Salvar agendamento</button>
    </div>
  `;
  openModal('', html);

  // LOGIC FOR CLIENT SEARCH
  setTimeout(() => {
    const searchInput = document.getElementById('ag-search-input');
    const searchResults = document.getElementById('ag-search-results');
    const searchWrap = document.getElementById('ag-search-wrap');
    const selectedCard = document.getElementById('ag-selected-card');
    const hiddenInput = document.getElementById('ag-cliente');
    const btnTrocar = document.getElementById('ag-btn-trocar');
    
    // Intercept setter on hidden input so programatic setting (e.g. from Cliente Detalhe) updates the UI automatically.
    Object.defineProperty(hiddenInput, 'value', {
      get: function() { return this.getAttribute('value') || ''; },
      set: function(val) {
        this.setAttribute('value', val);
        if (val) {
          const c = state.clientes.find(x => x.id === val);
          if (c) selectClient(c);
        } else {
          searchWrap.style.display = 'block';
          selectedCard.style.display = 'none';
        }
      }
    });

    const colors = ['#0ABFA3','#E040A0','#60A5FA','#FBBF24','#A78BFA'];
    
    function renderResults(term) {
      if (!term.trim()) { searchResults.style.display = 'none'; return; }
      
      const filtered = state.clientes.filter(c => 
        c.nome.toLowerCase().includes(term.toLowerCase()) || 
        (c.pet?.nome || '').toLowerCase().includes(term.toLowerCase())
      ).slice(0, 5);
      
      if (filtered.length === 0) {
        searchResults.innerHTML = '<div class="ag-search-item" style="color:var(--text-muted);justify-content:center;font-size:12px;">Nenhum cliente encontrado</div>';
        searchResults.style.display = 'block';
        return;
      }
      
      searchResults.innerHTML = filtered.map(c => {
        const initials = c.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
        const color = colors[c.nome.length % colors.length];
        
        return `
          <div class="ag-search-item" data-id="${c.id}">
            ${c.pet?.foto 
              ? `<img src="${c.pet.foto}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
              : `<div class="ag-client-avatar" style="color:${color}; background:${color}1A; border-color:${color}4D;">${initials}</div>`
            }
            <div class="ag-client-info">
              <div class="ag-client-name">${c.nome}</div>
              <div class="ag-client-pet">${c.pet?.nome || '—'} · ${c.pet?.raca || '—'}</div>
            </div>
          </div>
        `;
      }).join('');
      searchResults.style.display = 'block';
    }
    
    searchInput.addEventListener('input', (e) => renderResults(e.target.value));
    searchInput.addEventListener('focus', () => renderResults(searchInput.value));
    
    document.addEventListener('click', (e) => {
      if (!searchWrap.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
    
    searchResults.addEventListener('click', (e) => {
      const item = e.target.closest('.ag-search-item');
      if (item && item.dataset.id) {
        const c = state.clientes.find(x => x.id === item.dataset.id);
        if (c) {
          hiddenInput.value = c.id; // invokes our interceptor
        }
      }
    });
    
    btnTrocar.addEventListener('click', () => {
      hiddenInput.value = ''; // invokes our interceptor
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 10);
    });
    
    function selectClient(c) {
      const initials = c.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
      const color = colors[c.nome.length % colors.length];
      const avatarEl = document.getElementById('ag-selected-avatar');
      
      if (c.pet?.foto) {
        avatarEl.innerHTML = `<img src="${c.pet.foto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        avatarEl.style.background = 'transparent';
        avatarEl.style.borderColor = 'transparent';
      } else {
        avatarEl.innerHTML = initials;
        avatarEl.style.color = color;
        avatarEl.style.background = color + '1A';
        avatarEl.style.borderColor = color + '4D';
      }
      
      document.getElementById('ag-selected-name').textContent = c.nome;
      document.getElementById('ag-selected-pet').textContent = `${c.pet?.nome || '—'} · ${c.pet?.raca || '—'}`;
      
      searchWrap.style.display = 'none';
      selectedCard.style.display = 'flex';
    }
    
    // Smart Scheduling logic
    const dataInput = document.getElementById('ag-data');
    const srvInput = document.getElementById('ag-servico');
    const horaSelect = document.getElementById('ag-hora');
    
    function atualizarHorarios() {
      const date = dataInput.value;
      const srvId = srvInput.value;
      if (!date || !srvId) {
        horaSelect.innerHTML = '<option value="">Selecione data e serviço</option>';
        return;
      }
      
      const horariosLivres = calcularHorariosLivres(date, srvId);
      if (horariosLivres.length === 0) {
        horaSelect.innerHTML = '<option value="">Agenda cheia neste dia</option>';
      } else {
        horaSelect.innerHTML = horariosLivres.map(h => `<option value="${h}">${h}</option>`).join('');
      }
    }
    
    dataInput.addEventListener('change', atualizarHorarios);
    srvInput.addEventListener('change', atualizarHorarios);
    
    // Initial call
    atualizarHorarios();
  }, 50);
};

window.salvarAgendamento = async function() {
  const clienteId = document.getElementById('ag-cliente')?.value;
  const data = document.getElementById('ag-data')?.value;
  const hora = document.getElementById('ag-hora')?.value;
  const servicoId = document.getElementById('ag-servico')?.value;
  const obs = document.getElementById('ag-obs')?.value;
  if (!clienteId || !data || !servicoId || !hora) { showToast('Preencha os campos obrigatórios', 'error'); return; }
  
  const servicoObj = state.servicos.find(s => s.id === servicoId);
  const duracao = servicoObj ? (servicoObj.duracao || 60) : 60;
  const [h, m] = hora.split(':').map(Number);
  const start = h * 60 + m;
  const end = start + duracao;
  
  const conflito = state.agendamentos.find(a => {
    if (a.data !== data || a.status === 'cancelado') return false;
    const [ah, am] = (a.hora||'00:00').split(':').map(Number);
    const aStart = ah * 60 + am;
    const aSrv = state.servicos.find(s => s.id === a.servicoId);
    const aDur = aSrv ? (aSrv.duracao || 60) : 60;
    const aEnd = aStart + aDur;
    return (start < aEnd && end > aStart);
  });

  if (conflito) {
    showToast(`Conflito de horário! A agenda já está ocupada nesse período.`, 'error');
    return;
  }
  
  const c = state.clientes.find(cl => cl.id === clienteId);
  const pet_id = c?.pet_id || null;
  const agId = uid();

  // O agendamento é salvo como 'pendente' por padrão
  const ag = { id: agId, clienteId, pet_id, data, hora, servicoId, obs, status: 'pendente', criadoEm: new Date().toISOString() };
  
  // DUAL WRITE: Salva no Legado
  state.agendamentos.push(ag);

  // DUAL WRITE: Salva no Postgres (V2)
  try {
    await fetch('/api/v2/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: agId,
        pet_id: pet_id,
        servico_id: servicoId,
        data_agendamento: data,
        horario: hora,
        status: 'pendente',
        observacoes: obs
      })
    });
  } catch(e) { console.error('Erro no Dual Write:', e); }

  document.getElementById('modal-overlay').classList.remove('open');
  showToast('Agendamento salvo! ✅', 'success');
  renderPage(currentPage);
  updateFilaBadge();
};

window.concluirAgendamento = function(id) {
  const a = state.agendamentos.find(a => a.id === id);
  if (!a) return;
  
  const c = state.clientes.find(c => c.id === a.clienteId);
  const srv = state.servicos.find(s => s.id === a.servicoId);

  // Verifica se o cliente tem pacote com crédito DESTE TIPO de serviço
  if (c && c.pacote && c.pacote.servicos) {
    const itemPacote = c.pacote.servicos.find(i => i.servicoId === a.servicoId);
    const restante = itemPacote ? Math.max(0, itemPacote.contratado - itemPacote.usado) : 0;

    if (restante > 0) {
      openModal('Como deseja registrar?', `
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:16px;line-height:1.5">
          ${c.pet?.nome} possui <strong style="color:var(--success)">${restante} crédito${restante > 1 ? 's' : ''} de ${srv?.nome}</strong> no pacote <em>${c.pacote.nome || ''}</em>.<br>
          Deseja usar 1 crédito (sem lançar no caixa) ou cobrar o valor avulso?
        </div>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
          <button class="btn btn-magenta" onclick="efetivarConclusao('${id}', true)" style="width:100%; white-space:normal; height:auto; padding:12px;">🎁 Usar 1 Crédito de ${srv?.nome}</button>
          <button class="btn btn-ghost" onclick="efetivarConclusao('${id}', false)" style="width:100%; white-space:normal; height:auto; padding:12px;">Cobrar Avulso ${srv ? '('+fmtMoney(srv.preco)+')' : ''}</button>
        </div>
      `);
      return;
    }
  }

  // Sem crédito compatível: lança avulso direto
  efetivarConclusao(id, false);
};

window.efetivarConclusao = async function(id, usarCredito) {
  const a = state.agendamentos.find(a => a.id === id);
  if (!a) return;

  a.status = 'concluido';
  a.concluidoEm = new Date().toISOString();
  const c = state.clientes.find(c => c.id === a.clienteId);
  
  if (c) {
    c.ultimoAtendimento = a.data;
    c.agendamentos = (c.agendamentos || 0) + 1;
    const srv = state.servicos.find(s => s.id === a.servicoId);
    
    if (usarCredito && c.pacote?.servicos) {
      const itemPacote = c.pacote.servicos.find(i => i.servicoId === a.servicoId);
      if (itemPacote) {
        itemPacote.usado += 1;
        const restante = itemPacote.contratado - itemPacote.usado;
        showToast(`Crédito de ${srv?.nome} utilizado! Restam ${restante}.`, 'success');
      }
    } else {
      if (srv) {
        const finId = uid();
        state.financeiro.push({
          id: finId,
          tipo: 'receita',
          desc: `${srv.nome} — 🐾 ${c.pet?.nome} (${c.nome})`,
          valor: srv.preco,
          data: a.data,
          categoria: 'servico',
          agendamento_id: a.id
        });
        try {
          fetch('/api/v2/financeiro', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              id: finId, data_lancamento: a.data, valor: srv.preco, tipo: 'receita', 
              descricao: `${srv.nome} — 🐾 ${c.pet?.nome} (${c.nome})`, 
              agendamento_id: a.id, metadata: { categoria: 'servico' }
            })
          });
        } catch(e) {}
        showToast('Serviço concluído e receita lançada no financeiro! 💰✅', 'success');
      } else {
        showToast('Serviço concluído!', 'success');
      }
    }
  }


  // DUAL WRITE: Postgres
  try {
    await fetch(`/api/v2/agendamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: a.pet_id,
        servico_id: a.servicoId,
        data_agendamento: a.data,
        horario: a.hora,
        status: 'concluido',
        valor_cobrado: 0,
        pago: false,
        observacoes: a.obs,
        metadata: { concluidoEm: a.concluidoEm }
      })
    });
    if (c) {
      await fetch(`/api/v2/clientes/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: c.nome, telefone: c.telefone, observacoes: c.obs,
          metadata: { ultimoAtendimento: c.ultimoAtendimento, agendamentos: c.agendamentos, pacote: c.pacote }
        })
      });
    }
  } catch(e) { console.error('Erro no Dual Write:', e); }

  // ── Gamificação: checa recorde do dia ──
  checkDayRecord(a.data);
  document.getElementById('modal-overlay').classList.remove('open');
  renderPage(currentPage);
  updateFilaBadge();
};


// ─── TAXI DOG ────────────────────────────────────────────────
window.openTaxiDogModal = function(agendId) {
  const a = state.agendamentos.find(ag => ag.id === agendId);
  if (!a) return;
  const c = state.clientes.find(cl => cl.id === a.clienteId);
  const petNome = c?.pet?.nome || 'Pet';
  const tutorNome = c?.nome || 'Cliente';
  
  let valorStr = '';
  if (a.taxiDog !== undefined && a.taxiDog !== null && a.taxiDog !== 0) {
    valorStr = Number(a.taxiDog).toFixed(2).replace('.', ',');
  }

  const histHTML = a.taxiDog ? `
    <div class="td-historico">
      ✅ Já possui taxi registrado: <strong style="color:#E040A0">${fmtMoney(a.taxiDog)}</strong> &nbsp;— adicionar novo substituirá o atual.
    </div>
  ` : '';

  const html = `
    <div class="td-wrapper">
      <div class="td-header">
        <div class="td-header-left">
          <div class="td-icon-square">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
              <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-1l-2.5 -4.5a1 1 0 0 0 -.86 -.5h-1.64"/>
              <path d="M15 6l0 4.5"/>
            </svg>
          </div>
          <div>
            <div class="td-header-title">Taxi Dog: ${petNome}</div>
            <div class="td-header-subtitle">Tutor: ${tutorNome} &nbsp;·&nbsp; ${fmt(a.data)} ${a.hora ? a.hora : ''}</div>
          </div>
        </div>
        <button class="td-close-btn" onclick="closeModal()">×</button>
      </div>
      
      <div class="td-content">
        ${histHTML}
        <div>
          <label class="td-label">Valor do Adicional (R$)</label>
          <div class="td-input-wrap">
            <span class="td-prefix">R$</span>
            <input id="taxi-valor" class="td-input" type="number" min="0" step="0.50" placeholder="0,00" value="${valorStr}" />
          </div>
        </div>
      </div>
      
      <div class="td-footer">
        <button class="td-btn td-btn-cancel" onclick="closeModal()">Cancelar</button>
        <button class="td-btn td-btn-save" onclick="confirmarTaxiDog('${agendId}')">Salvar Valor</button>
      </div>
    </div>
  `;
  
  openModal('', html);
};

window.confirmarTaxiDog = function(agendId) {
  const a = state.agendamentos.find(ag => ag.id === agendId);
  if (!a) return;

  const inp = document.getElementById('taxi-valor');
  const valor = parseFloat((inp?.value || '0').replace(',', '.'));

  if (!valor || valor <= 0) {
    showToast('Informe um valor válido para o Taxi Dog! 🚗', 'error');
    return;
  }

  const c = state.clientes.find(cl => cl.id === a.clienteId);
  const petNome = c?.pet?.nome || 'Pet';
  const tutorNome = c?.nome || 'Cliente';

  // Acumula no agendamento (para indicador visual no botão)
  a.taxiDog = (a.taxiDog || 0) + valor;

  // Lança no financeiro como receita individual
  const finId = uid();
  state.financeiro.push({
    id: finId,
    tipo: 'receita',
    desc: `Taxi Dog — 🚗 ${petNome} (${tutorNome})`,
    valor: valor,
    data: a.data,
    categoria: 'taxi_dog',
    agendamento_id: agendId
  });

  // DUAL WRITE: Salvar o financeiro na API V2 e atualizar o agendamento
  try {
    fetch('/api/v2/financeiro', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: finId, data_lancamento: a.data, valor: valor, tipo: 'receita', 
        descricao: `Taxi Dog — 🚗 ${petNome} (${tutorNome})`, 
        agendamento_id: agendId,
        metadata: { categoria: 'taxi_dog' }
      })
    });
    fetch(`/api/v2/agendamentos/${agendId}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        pet_id: a.pet_id, servico_id: a.servicoId, data_agendamento: a.data,
        horario: a.hora, status: a.status, valor_cobrado: a.valor_cobrado, pago: a.pago,
        observacoes: a.obs, metadata: { ...a.metadata, taxiDog: a.taxiDog }
      })
    });
  } catch(e) {}

  document.getElementById('modal-overlay').classList.remove('open');
  showToast(`Taxi Dog de ${fmtMoney(valor)} registrado! 🚗💰`, 'success');
  renderPage(currentPage);
};

window.deleteAgendamento = async function(id) {
  if (!confirm('Remover este agendamento?')) return;
  try {
    const res = await fetch(`/api/v2/agendamentos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir agendamento');
    state.agendamentos = state.agendamentos.filter(a => a.id !== id);
    // CASCADE LOCAL: remove lançamentos financeiros vinculados a este agendamento
    state.financeiro = state.financeiro.filter(f => f.agendamento_id !== id);
    showToast('Agendamento removido', 'info');
    renderPage(currentPage);
  } catch (err) {
    console.error(err);
    showToast('Erro ao remover agendamento', 'error');
  }
};

window.editAgendamento = function(id) {
  const a = state.agendamentos.find(a => a.id === id);
  if (!a) return;
  const clienteOpts = state.clientes.map(c =>
    `<option value="${c.id}" ${c.id===a.clienteId?'selected':''}>${c.nome} — ${c.pet?.nome||'Pet'}</option>`).join('');
  const servicoOpts = state.servicos.map(s =>
    `<option value="${s.id}" ${s.id===a.servicoId?'selected':''}>${s.nome} — ${fmtMoney(s.preco)}</option>`).join('');
  openModal('Editar Agendamento', `
    <div class="form-group">
      <label class="form-label">Cliente / Pet</label>
      <select class="form-control" id="ag-cliente">${clienteOpts}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data</label>
        <input type="date" class="form-control" id="ag-data" value="${a.data||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Horário</label>
        <input type="time" class="form-control" id="ag-hora" value="${a.hora||'09:00'}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Serviço</label>
      <select class="form-control" id="ag-servico">${servicoOpts}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Observações</label>
      <textarea class="form-control" id="ag-obs">${a.obs||''}</textarea>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
      <button class="btn btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancelar</button>
      <button class="btn btn-primary" onclick="atualizarAgendamento('${id}')">Atualizar</button>
    </div>
  `);
};

window.atualizarAgendamento = async function(id) {
  const a = state.agendamentos.find(a => a.id === id);
  if (!a) return;
  const data = document.getElementById('ag-data')?.value;
  const hora = document.getElementById('ag-hora')?.value;
  
  const conflito = state.agendamentos.find(ag => ag.id !== id && ag.data === data && ag.hora === hora && ag.status !== 'concluido');
  if (conflito) {
    showToast('Já existe um agendamento para este horário!', 'error');
    return;
  }

  a.clienteId = document.getElementById('ag-cliente')?.value;
  a.data = data;
  a.hora = hora;
  a.servicoId = document.getElementById('ag-servico')?.value;
  a.obs = document.getElementById('ag-obs')?.value;

  try {
    const res = await fetch(`/api/v2/agendamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: a.pet_id,
        servico_id: a.servicoId,
        data_agendamento: a.data,
        horario: a.hora,
        status: a.status,
        valor_cobrado: a.valor_cobrado || 0,
        pago: a.pago || false,
        observacoes: a.obs,
        metadata: a.metadata || {}
      })
    });
    if (!res.ok) throw new Error('Erro na API V2');
  } catch(e) {
    console.error('Erro ao atualizar agendamento no Postgres:', e);
  }

  document.getElementById('modal-overlay').classList.remove('open');
  showToast('Agendamento atualizado!', 'success');
  renderPage(currentPage);
};

// ─── CLIENTES ─────────────────────────────────────────────────
let clienteFilter = 'todos';
let clienteSearch = '';

function renderClientes() {
  const page = document.getElementById('page-clientes');
  page.innerHTML = `
    <div class="section-header">
      <div class="section-title">Clientes Cadastrados</div>
      <button class="btn btn-primary" onclick="openClienteModal()">+ Novo Cliente</button>
    </div>
    <div class="search-bar"><input type="text" placeholder="Buscar cliente ou pet..." oninput="handleCliSearch(this.value)" value="${clienteSearch}" /></div>
    <div class="filter-bar">
      <button id="fc-todos" class="filter-chip ${clienteFilter==='todos'?'active':''}" onclick="clienteFilter='todos';updateCliFilters();renderClientesGrid()">Todos (${state.clientes.length})</button>
      <button id="fc-aniv" class="filter-chip ${clienteFilter==='aniversariantes'?'active':''}" onclick="clienteFilter='aniversariantes';updateCliFilters();renderClientesGrid()">🎂 Aniversariantes</button>
      <button id="fc-ciclo" class="filter-chip ${clienteFilter==='ciclo'?'active':''}" onclick="clienteFilter='ciclo';updateCliFilters();renderClientesGrid()">🔁 Com Pacote</button>
    </div>
    <div id="cli-grid-wrapper"></div>
  `;
  renderClientesGrid();
}

window.handleCliSearch = function(val) {
  clienteSearch = val;
  renderClientesGrid();
};

window.updateCliFilters = function() {
  const t = document.getElementById('fc-todos');
  const a = document.getElementById('fc-aniv');
  const c = document.getElementById('fc-ciclo');
  if(t) t.className = 'filter-chip ' + (clienteFilter==='todos'?'active':'');
  if(a) a.className = 'filter-chip ' + (clienteFilter==='aniversariantes'?'active':'');
  if(c) c.className = 'filter-chip ' + (clienteFilter==='ciclo'?'active':'');
};

window.renderClientesGrid = function() {
  const container = document.getElementById('cli-grid-wrapper');
  if (!container) return;
  const filtered = state.clientes.filter(c => {
    const matchSearch = !clienteSearch ||
      c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      (c.pet?.nome||'').toLowerCase().includes(clienteSearch.toLowerCase());
    const matchFilter = clienteFilter === 'todos' ||
      (clienteFilter === 'aniversariantes' && isPetBirthdayMonth(c.pet?.aniversario)) ||
      (clienteFilter === 'ciclo' && c.pacote && c.pacote.servicos && c.pacote.servicos.length > 0);
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🐶</span>
        <h3>${state.clientes.length === 0 ? 'Nenhum cliente ainda' : 'Nenhum resultado'}</h3>
        <p>${state.clientes.length === 0 ? 'Cadastre seu primeiro cliente clicando em "+ Novo Cliente"' : 'Tente uma busca diferente'}</p>
      </div>
    `;
  } else {
    // Ordenar por urgência (prioridade menor = mais urgente)
    const sorted = filtered.map(c => ({ cliente: c, insight: getClienteInsight(c) }))
      .sort((a, b) => a.insight.prioridade - b.insight.prioridade);
    container.innerHTML = `
      <div class="grid grid-3">
        ${sorted.map(({ cliente, insight }) => renderClienteCard(cliente, insight)).join('')}
      </div>
    `;
  }
};

function renderClienteCard(c, insight) {
  if (!insight) insight = getClienteInsight(c);
  const isBday = isPetBirthday(c.pet?.aniversario);

  // ── Banner Aniversário ─────────────────────────────────────
  let aniversarioEsteMes = false;
  if (c.pet?.aniversario) {
    const bdayParts = c.pet.aniversario.split('-');
    if (bdayParts.length >= 2) {
      aniversarioEsteMes = parseInt(bdayParts[1], 10) === new Date().getMonth() + 1;
    }
  }
  let bdayBanner = '';
  let extraBorderStyle = '';
  if (aniversarioEsteMes) {
    extraBorderStyle = 'border-color: rgba(224,64,160,0.35);';
    bdayBanner = `<div style="margin:-20px -20px 14px -20px;padding:6px 20px;display:flex;align-items:center;gap:6px;background:rgba(224,64,160,0.10);border-bottom:0.5px solid rgba(224,64,160,0.28);font-size:11px;font-weight:500;color:#E040A0;"><i class="ti ti-cake" style="font-size:13px"></i> ${c.pet?.nome||'Pet'} faz aniversário este mês!</div>`;
  }

  // ── Faixa de ação (borda inferior) ─────────────────────────
  const acaoMap = {
    resgatar:  { cor: '#f87171', label: '🚨 RESGATAR', bg: 'rgba(248,113,113,0.08)' },
    agendar:   { cor: '#FBBF24', label: '📲 AGENDAR',  bg: 'rgba(251,191,36,0.08)' },
    renovar:   { cor: '#fb923c', label: '📦 RENOVAR',  bg: 'rgba(251,146,60,0.08)' },
    agendado:  { cor: '#4ade80', label: '✅ OK',        bg: 'transparent' },
    ok_ciclo:  { cor: '#4ade80', label: '✅ OK',        bg: 'transparent' },
  };
  const acaoInfo = acaoMap[insight.acao] || { cor: 'transparent', label: '', bg: 'transparent' };
  const stripStyle = insight.acao && acaoInfo.cor !== 'transparent'
    ? `border-bottom: 3px solid ${acaoInfo.cor};`
    : '';

  // ── ZONA 2 — Bloco A: Último Banho ─────────────────────────
  let blocoA = '';
  if (insight.ultimoBanho) {
    const d = insight.ultimoBanho.dias;
    let corDias;
    if (insight.ciclo) {
      // Cor baseada no progresso do ciclo
      const p = insight.ciclo.progresso;
      corDias = p <= 0.6 ? '#4ade80' : p <= 1.0 ? '#FBBF24' : '#f87171';
    } else {
      corDias = d <= 29 ? '#4ade80' : d <= 60 ? '#FBBF24' : '#f87171';
    }
    const barraHTML = insight.ciclo ? (() => {
      const pct = Math.min(insight.ciclo.progresso * 100, 100);
      const overflow = insight.ciclo.progresso > 1;
      const barColor = overflow ? '#f87171' : (pct > 80 ? '#FBBF24' : '#4ade80');
      return `<div class="ci-cycle-bar" title="Ciclo ${insight.ciclo.tipo} · ${insight.ciclo.diasRestantes > 0 ? 'Faltam '+insight.ciclo.diasRestantes+' dias' : 'Vencido há '+Math.abs(insight.ciclo.diasRestantes)+' dias'}">
        <div class="ci-cycle-bar-fill${overflow?' overflow':''}" style="width:${pct}%;background:${barColor}"></div>
      </div>`;
    })() : '';
    blocoA = `<div class="ci-info-block">
      <div class="ci-info-label"><i class="ti ti-clock" style="font-size:11px"></i> Último banho</div>
      <div class="ci-info-value" style="color:${corDias}">há ${d} dia${d!==1?'s':''}</div>
      <div class="ci-info-sub">${fmt(insight.ultimoBanho.data)}</div>
      ${barraHTML}
    </div>`;
  } else {
    blocoA = `<div class="ci-info-block">
      <div class="ci-info-label"><i class="ti ti-clock" style="font-size:11px"></i> Último banho</div>
      <div class="ci-info-value" style="color:var(--text-dim);font-style:italic;font-size:11px">Nunca atendido</div>
    </div>`;
  }

  // ── ZONA 2 — Bloco B: Próximo ──────────────────────────────
  let blocoB = '';
  if (insight.proximoAgendamento) {
    const prox = insight.proximoAgendamento;
    if (prox.isHoje) {
      blocoB = `<div class="ci-info-block">
        <div class="ci-info-label"><i class="ti ti-calendar" style="font-size:11px"></i> Próximo</div>
        <div class="ci-info-value" style="color:#60A5FA;font-weight:800">HOJE${prox.hora ? ' · '+prox.hora : ''}</div>
        <div class="ci-info-sub">${prox.servico}</div>
      </div>`;
    } else {
      blocoB = `<div class="ci-info-block">
        <div class="ci-info-label"><i class="ti ti-calendar" style="font-size:11px"></i> Próximo</div>
        <div class="ci-info-value" style="color:#4ade80">${fmt(prox.data)}${prox.hora ? ' · '+prox.hora : ''}</div>
        <div class="ci-info-sub">${prox.servico}</div>
      </div>`;
    }
  } else {
    // Sem agendamento: mostrar ação
    if (insight.acao === 'resgatar') {
      blocoB = `<div class="ci-info-block">
        <div class="ci-info-label"><i class="ti ti-calendar-x" style="font-size:11px"></i> Próximo</div>
        <div class="ci-info-value ci-action-text" style="color:#f87171">🚨 Resgatar</div>
      </div>`;
    } else if (insight.acao === 'agendar') {
      blocoB = `<div class="ci-info-block">
        <div class="ci-info-label"><i class="ti ti-calendar-x" style="font-size:11px"></i> Próximo</div>
        <div class="ci-info-value ci-action-text" style="color:#FBBF24">📲 Agendar</div>
      </div>`;
    } else if (insight.ciclo && insight.ciclo.diasRestantes > 0) {
      const p = new Date();
      p.setDate(p.getDate() + insight.ciclo.diasRestantes);
      const prevStr = String(p.getDate()).padStart(2,'0') + '/' + String(p.getMonth()+1).padStart(2,'0') + '/' + String(p.getFullYear()).slice(-2);
      blocoB = `<div class="ci-info-block" style="align-items: center; text-align: center;">
        <div class="ci-info-label" style="justify-content: center;"><i class="ti ti-calendar" style="font-size:11px"></i> Próximo</div>
        <div class="ci-info-value" style="color:var(--text-dim); font-size: 12px; margin-top: 2px;">⏳ Em ~${insight.ciclo.diasRestantes}d</div>
        <div class="ci-info-sub" style="color:rgba(255,255,255,0.4); margin-top: 12px; font-weight: 500;">${prevStr}</div>
      </div>`;


    } else {
      blocoB = `<div class="ci-info-block">
        <div class="ci-info-label"><i class="ti ti-calendar" style="font-size:11px"></i> Próximo</div>
        <div class="ci-info-value" style="color:var(--text-dim);font-size:11px">—</div>
      </div>`;
    }
  }

  // ── ZONA 2 — Bloco C: Créditos ─────────────────────────────
  let blocoC = '';
  if (insight.creditos) {
    const cr = insight.creditos;
    const corCr = cr.esgotado ? '#f87171' : cr.restantes <= 1 ? '#FBBF24' : '#4ade80';
    blocoC = `<div class="ci-info-block">
      <div class="ci-info-label"><i class="ti ti-package" style="font-size:11px"></i> Créditos</div>
      <div class="ci-info-value" style="color:${corCr}">${cr.restantes}/${cr.total}</div>
      <div class="ci-info-sub">${cr.esgotado ? '<span style="color:#f87171">Esgotado!</span>' : (cr.nome || 'Pacote')}</div>
    </div>`;
  } else {
    blocoC = `<div class="ci-info-block">
      <div class="ci-info-label"><i class="ti ti-package" style="font-size:11px"></i> Créditos</div>
      <div class="ci-info-value" style="color:var(--text-dim);font-size:10px">Sem pacote pago</div>
      <div class="ci-info-sub"><span style="color:#0ABFA3;cursor:pointer;font-size:10px" onclick="event.stopPropagation();window.abrirVenderPacote('${c.id}')">+ Criar</span></div>
    </div>`;
  }

  // ── Mini Timeline ──────────────────────────────────────────
  let timelineHTML = '';
  if (insight.timeline.length > 0) {
    timelineHTML = `<div class="ci-timeline">
      ${insight.timeline.map((t, i) => {
        const opacity = 1 - (i * 0.22);
        return `<div class="ci-timeline-dot" style="opacity:${opacity}" title="${fmt(t.data)} — ${t.servico}">
          <div class="ci-timeline-dot-circle"></div>
          <div class="ci-timeline-dot-label">${fmt(t.data).slice(0,5)}</div>
        </div>`;
      }).join('<div class="ci-timeline-line"></div>')}
    </div>`;
  }

  // ── Faixa de ação (texto no rodapé) ────────────────────────
  let acaoStrip = '';
  if (insight.acao && acaoMap[insight.acao] && acaoInfo.cor !== 'transparent' && insight.acao !== 'agendado' && insight.acao !== 'ok_ciclo') {
    acaoStrip = `<div class="ci-action-strip" style="background:${acaoInfo.bg};color:${acaoInfo.cor}">${acaoInfo.label}</div>`;
  }

  return `
    <div class="client-card${isBday?' birthday':''}" style="${extraBorderStyle}${stripStyle}" onclick="openClienteDetalhe('${c.id}')">
      ${bdayBanner}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div class="client-avatar">${c.pet?.foto ? `<img src="${c.pet.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (c.pet?.tipo === 'gato' ? '🐱' : '🐕')}</div>
        <div style="flex:1;min-width:0">
          <div class="client-name">${c.nome}</div>
          <div class="client-pet" style="display:flex;align-items:center;gap:6px">
            <span>🐾 ${c.pet?.nome||'—'} ${c.pet?.raca?`· ${c.pet.raca}`:''}</span>
            ${c.pet?.tags?.length ? c.pet.tags.map(t => `<span title="${t}" style="font-size:12px;cursor:help">${t.split(' ')[0]}</span>`).join('') : ''}
          </div>
        </div>
      </div>
      <div class="ci-info-row">
        ${blocoA}
        <div class="ci-info-divider"></div>
        ${blocoB}
        <div class="ci-info-divider"></div>
        ${blocoC}
      </div>
      ${timelineHTML}
      ${acaoStrip}
    </div>
  `;
}

// ─── CLIENTE MODAL ────────────────────────────────────────────
window.openClienteModal = function(editId) {
  const c = editId ? state.clientes.find(c => c.id === editId) : null;
  openModal(c ? 'Editar Cliente' : 'Novo Cliente', `
    <div class="tabs" id="cli-tabs">
      <button class="tab active" onclick="switchCliTab('dono',this)">👤 Tutor</button>
      <button class="tab" onclick="switchCliTab('pet',this)">🐾 Pet</button>
      <button class="tab" onclick="switchCliTab('config',this)">⚙️ Configurações</button>
    </div>

    <div id="cli-tab-dono">
      <div class="form-group">
        <label class="form-label">Nome do Tutor *</label>
        <input class="form-control" id="cli-nome" placeholder="Nome completo" value="${c?.nome||''}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telefone / WhatsApp</label>
          <input class="form-control" id="cli-tel" placeholder="(00) 00000-0000" value="${c?.telefone||''}" />
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input class="form-control" id="cli-email" type="email" placeholder="email@exemplo.com" value="${c?.email||''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Endereço</label>
        <input class="form-control" id="cli-end" placeholder="Rua, número, bairro" value="${c?.endereco||''}" />
      </div>
    </div>

    <div id="cli-tab-pet" style="display:none">
      <div class="pet-photo-upload-wrapper">
        <div class="pet-photo-preview" id="pet-photo-preview">
          ${c?.pet?.foto ? `<img src="${c.pet.foto}">` : (c?.pet?.tipo === 'gato' ? '🐱' : '🐕')}
        </div>
        <div>
          <label class="btn-upload-photo">
            <i class="ti ti-upload"></i> Escolher Foto
            <input type="file" accept="image/*" hidden onchange="handlePetPhotoUpload(this)" />
          </label>
          <button type="button" class="btn-remove-photo" onclick="removePetPhoto()" id="btn-remove-photo" style="${c?.pet?.foto ? 'display:inline-flex' : 'display:none'}">
            <i class="ti ti-trash"></i> Remover
          </button>
        </div>
        <input type="hidden" id="cli-pet-foto" value="${c?.pet?.foto || ''}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome do Pet *</label>
          <input class="form-control" id="cli-pet-nome" placeholder="Nome do pet" value="${c?.pet?.nome||''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Espécie</label>
          <select class="form-control" id="cli-pet-tipo">
            <option value="cachorro" ${c?.pet?.tipo==='cachorro'?'selected':''}>🐕 Cachorro</option>
            <option value="gato" ${c?.pet?.tipo==='gato'?'selected':''}>🐱 Gato</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Raça</label>
          <input class="form-control" id="cli-pet-raca" placeholder="Ex: Golden Retriever" value="${c?.pet?.raca||''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Porte</label>
          <select class="form-control" id="cli-pet-porte">
            <option value="pequeno" ${c?.pet?.porte==='pequeno'?'selected':''}>Pequeno</option>
            <option value="medio" ${c?.pet?.porte==='medio'?'selected':''}>Médio</option>
            <option value="grande" ${c?.pet?.porte==='grande'?'selected':''}>Grande</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">🎂 Data de Aniversário</label>
        <input class="form-control" id="cli-pet-bday" type="date" value="${c?.pet?.aniversario||''}" title="Data de aniversário para alertas" />
      </div>
      <div class="form-group">
        <label class="form-label">Tags Visuais / Alertas</label>
        <div class="tags-grid">
          ${['⚠️ Alérgico', '🐾 Agressivo', '✂️ Só Tesoura', '👴 Idoso', '🩺 Em Tratamento', '💧 Pele Sensível'].map(tag => {
            const checked = c?.pet?.tags?.includes(tag) ? 'checked' : '';
            return `<label class="tag-label"><input type="checkbox" value="${tag}" class="pet-tag-cb" ${checked}> ${tag}</label>`;
          }).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Observações Especiais</label>
        <textarea class="form-control" id="cli-pet-obs" placeholder="Cuidados especiais, temperamento, alergias...">${c?.pet?.obs||''}</textarea>
      </div>
    </div>

    <div id="cli-tab-config" style="display:none">
      <div class="form-group">
        <label class="form-label">Plano de Retorno (Pacote)</label>
        <select class="form-control" id="cli-ciclo">
          <option value="" ${!c?.ciclo?'selected':''}>Sem plano fixo</option>
          <option value="semanal" ${c?.ciclo==='semanal'?'selected':''}>🔁 Semanal (7 dias)</option>
          <option value="quinzenal" ${c?.ciclo==='quinzenal'?'selected':''}>🔁 Quinzenal (15 dias)</option>
          <option value="mensal" ${c?.ciclo==='mensal'?'selected':''}>🔁 Mensal (30 dias)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Último Atendimento</label>
        <input class="form-control" id="cli-ultimo" type="date" value="${c?.ultimoAtendimento||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Serviço Preferido</label>
        <select class="form-control" id="cli-srv-pref">
          <option value="">— Selecionar —</option>
          ${state.servicos.map(s => `<option value="${s.id}" ${c?.servicoPref===s.id?'selected':''}>${s.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Observações do Histórico</label>
        <textarea class="form-control" id="cli-hist-obs" placeholder="Preferências, histórico de serviços, notas...">${c?.histObs||''}</textarea>
      </div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarCliente('${editId||''}')">${c ? 'Atualizar Cliente' : 'Cadastrar Cliente'}</button>
    </div>
  `, true);
};

window.switchCliTab = function(tab, btn) {
  document.querySelectorAll('#cli-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['dono','pet','config'].forEach(t => {
    const el = document.getElementById(`cli-tab-${t}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
};

window.salvarCliente = async function(editId) {
  const nome = document.getElementById('cli-nome')?.value?.trim();
  if (!nome) { showToast('Nome do tutor é obrigatório', 'error'); return; }
  const petNome = document.getElementById('cli-pet-nome')?.value?.trim();
  if (!petNome) { showToast('Nome do pet é obrigatório', 'error'); return; }

  // Coleta dados extras para a coluna metadata
  const metadata = {
    email: document.getElementById('cli-email')?.value,
    endereco: document.getElementById('cli-end')?.value,
    ciclo: document.getElementById('cli-ciclo')?.value,
    ultimoAtendimento: document.getElementById('cli-ultimo')?.value,
    servicoPref: document.getElementById('cli-srv-pref')?.value,
    histObs: document.getElementById('cli-hist-obs')?.value,
  };

  const pet_metadata = {
    tipo: document.getElementById('cli-pet-tipo')?.value,
    aniversario: document.getElementById('cli-pet-bday')?.value,
    obs: document.getElementById('cli-pet-obs')?.value,
    tags: Array.from(document.querySelectorAll('.pet-tag-cb:checked')).map(cb => cb.value),
    foto: document.getElementById('cli-pet-foto')?.value || '',
  };

  let cliId = editId || uid();
  let existingClient = state.clientes.find(c => c.id === editId);
  let pet_id = existingClient?.pet_id || uid();

  const payload = {
    id: cliId,
    nome,
    telefone: document.getElementById('cli-tel')?.value,
    observacoes: '', // Observações gerais caso exista campo específico depois
    metadata,
    pet_id,
    pet_nome: petNome,
    raca: document.getElementById('cli-pet-raca')?.value,
    porte: document.getElementById('cli-pet-porte')?.value,
    pet_metadata
  };

  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `/api/v2/clientes/${editId}` : `/api/v2/clientes`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showToast(`Cliente ${editId ? 'atualizado' : 'cadastrado'}! ✅`, 'success');
      // Recarrega os dados completos da API para atualizar a interface imediatamente sem saveDB
      state = await loadDB();
      document.getElementById('modal-overlay').classList.remove('open');
      renderPage(currentPage);
      updateFilaBadge();
    } else {
      showToast('Erro ao salvar no banco', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar cliente V2:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
};

window.handlePetPhotoUpload = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('cli-pet-foto').value = e.target.result;
      document.getElementById('pet-photo-preview').innerHTML = `<img src="${e.target.result}">`;
      document.getElementById('btn-remove-photo').style.display = 'inline-flex';
    }
    reader.readAsDataURL(input.files[0]);
  }
};

window.removePetPhoto = function() {
  document.getElementById('cli-pet-foto').value = '';
  const tipo = document.getElementById('cli-pet-tipo')?.value === 'gato' ? '🐱' : '🐕';
  document.getElementById('pet-photo-preview').innerHTML = tipo;
  document.getElementById('btn-remove-photo').style.display = 'none';
};

// ─── CLIENTE DETALHE ──────────────────────────────────────────
window.openClienteDetalhe = function(id) {
  const c = state.clientes.find(c => c.id === id);
  if (!c) return;
  const isBday = isPetBirthday(c.pet?.aniversario);
  const historico = state.agendamentos.filter(a => a.clienteId === id)
    .sort((a,b) => b.data.localeCompare(a.data));
  const totalGasto = state.financeiro
    .filter(f => f.tipo === 'receita' && (f.desc || '').includes(c.nome))
    .reduce((s, f) => s + Number(f.valor || 0), 0);
  const status = getContactStatus(c);
  const pacote = c.pacote;

  const statusColors = { 'atrasado': '#f87171', 'confirmar': '#FBBF24', 'agendado': '#0ABFA3' };
  const statusLabels = { 'atrasado': 'Em atraso', 'confirmar': 'Confirmar', 'agendado': 'Em dia' };
  const stColor = statusColors[status] || '#0ABFA3';
  const stLabel = statusLabels[status] || 'Em dia';

  const iniciais = c.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

  let pacoteSection = '';
  if (pacote && pacote.servicos && pacote.servicos.length > 0) {
    const totalRestante = pacote.servicos.reduce((s, i) => s + Math.max(0, i.contratado - i.usado), 0);
    const totalContratado = pacote.servicos.reduce((s, i) => s + i.contratado, 0);
    
    let itemsHtml = pacote.servicos.map(item => {
      const srv = state.servicos.find(s => s.id === item.servicoId);
      const restante = Math.max(0, item.contratado - item.usado);
      return `<div class="cd-pacote-item"><span>${srv?.nome || 'Serviço'}</span><span class="cd-pacote-item-val">${restante}/${item.contratado}</span></div>`;
    }).join('');

    pacoteSection = `
      <div class="cd-section">
        <div class="cd-section-title"><i class="ti ti-package"></i> PACOTE</div>
        <div class="cd-pacote-ativo">
          <div class="cd-pacote-header">
            <span class="cd-pacote-nome">${pacote.nome || 'Pacote'}</span>
            <span class="cd-pacote-creditos">${totalRestante} restantes</span>
          </div>
          <div class="cd-pacote-items">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;
  } else {
    pacoteSection = `
      <div class="cd-section">
        <div class="cd-section-title"><i class="ti ti-package"></i> PACOTE</div>
        <div class="cd-pacote-vazio">
          <div class="cd-pacote-vazio-text">Nenhum pacote ativo</div>
          <div class="cd-pacote-vazio-link" onclick="abrirVenderPacote('${c.id}')">+ Criar pacote</div>
        </div>
      </div>
    `;
  }

  let tagsHtml = '';
  if (c.pet?.tags?.length) {
    tagsHtml += c.pet.tags.map(t => `<div class="cd-tag">${t.split(' ')[0]}</div>`).join('');
  }
  if (isBday || c.pet?.aniversario) {
    tagsHtml += `<div class="cd-tag cd-tag-bday"><i class="ti ti-cake"></i> ${fmt(c.pet.aniversario)}</div>`;
  }

  let histList = '';
  if (historico.length === 0) {
    histList = '<div style="font-size:12px;color:var(--text-muted);">Nenhum atendimento registrado</div>';
  } else {
    // ALTERAÇÃO: Mostrar os últimos 5 itens por padrão
    histList = historico.slice(0, 5).map(a => {
      const srv = state.servicos.find(s => s.id === a.servicoId);
      return `
        <div class="cd-hist-item">
          <div class="cd-hist-dot"></div>
          <div class="cd-hist-date">${fmt(a.data)}${a.hora ? ' · ' + a.hora : ''}</div>
          <div class="cd-hist-srv">${srv?.nome || 'Serviço'}</div>
          <div class="cd-hist-val">${srv ? fmtMoney(srv.preco) : ''}</div>
        </div>
      `;
    }).join('');
  }

  // Lógica Próximo Agendamento
  const hojeStr = new Date().toISOString().slice(0, 10);
  const agendamentosFuturos = state.agendamentos
    .filter(a => a.clienteId === c.id && a.status === 'agendado' && a.data > hojeStr)
    .sort((a, b) => {
      if (a.data === b.data) return (a.hora || '').localeCompare(b.hora || '');
      return a.data.localeCompare(b.data);
    });
  const proxAgend = agendamentosFuturos[0];

  let proximoAgendamentoHtml = '';
  if (proxAgend) {
    const srvProx = state.servicos.find(s => s.id === proxAgend.servicoId);
    proximoAgendamentoHtml = `
      <div style="background: rgba(10,191,163,0.10); border: 0.5px solid rgba(10,191,163,0.28); border-radius: 8px; padding: 10px 12px;">
        <div style="font-size: 10px; color: #0ABFA3; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">Agendado</div>
        <div style="font-size: 15px; font-weight: 500; color: #EEF2F7; margin-bottom: 2px;">${fmt(proxAgend.data)}${proxAgend.hora ? ' · ' + proxAgend.hora : ''}</div>
        <div style="font-size: 12px; color: #7A90A8;">${srvProx?.nome || 'Serviço'}</div>
      </div>
    `;
  } else {
    proximoAgendamentoHtml = `<div style="font-size: 11px; color: #7A90A8; font-style: italic;">Nenhum agendamento futuro</div>`;
  }

  const html = `

    
    <div class="cd-wrapper">
      <div class="cd-header">
        <div class="cd-avatar">${c.pet?.foto ? `<img src="${c.pet.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : iniciais}</div>
        <div class="cd-header-text">
          <div class="cd-header-name">${c.nome}</div>
          <div class="cd-header-pet">${c.pet?.nome || '—'} · ${c.pet?.raca || '—'}</div>
        </div>
        <button class="cd-close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="cd-info-grid">
        <div class="cd-info-col">
          <div class="cd-label">TUTOR</div>
          <div class="cd-val-main">${c.nome}</div>
          ${c.telefone ? `<div class="cd-val-sub"><i class="ti ti-brand-whatsapp cd-icon cd-teal-text"></i> <span class="cd-teal-text">${c.telefone}</span></div>` : ''}
        </div>
        <div class="cd-info-col">
          <div class="cd-label">PET</div>
          <div class="cd-val-main"><i class="ti ti-paw cd-icon"></i> ${c.pet?.nome || '—'}</div>
          <div class="cd-val-sub">${c.pet?.raca || '—'} · ${c.pet?.porte || '—'}</div>
          ${tagsHtml ? `<div class="cd-tags">${tagsHtml}</div>` : ''}
        </div>
      </div>

      <div class="cd-metrics-grid">
        <div class="cd-metric-col">
          <div class="cd-metric-val teal">${fmtMoney(totalGasto)}</div>
          <div class="cd-metric-label">TOTAL INVESTIDO</div>
        </div>
        <div class="cd-metric-col">
          <div class="cd-metric-val"><div class="cd-status-dot" style="background:${stColor}"></div><span style="font-size:14px">${stLabel}</span></div>
          <div class="cd-metric-label">RETORNO</div>
        </div>
        <div class="cd-metric-col">
          <div class="cd-metric-val">${c.agendamentos || historico.length}</div>
          <div class="cd-metric-label">ATENDIMENTOS</div>
        </div>
      </div>

      <div class="cd-body-grid">
        <div class="cd-body-col-left">
          ${pacoteSection}

          ${c.histObs || c.pet?.obs ? `
          <div class="cd-section">
            <div class="cd-section-title"><i class="ti ti-notes"></i> OBSERVAÇÕES</div>
            <div class="cd-obs-text">${c.histObs || ''} ${c.histObs && c.pet?.obs ? '<br><br>' : ''} ${c.pet?.obs || ''}</div>
          </div>
          ` : ''}

          <div class="cd-section">
            <div class="cd-section-title"><i class="ti ti-calendar-event"></i> PRÓXIMO AGENDAMENTO</div>
            ${proximoAgendamentoHtml}
          </div>
        </div>

        <div class="cd-body-col-right">
          <div class="cd-section">
            <div class="cd-hist-header">
              <div class="cd-section-title" style="margin:0"><i class="ti ti-history"></i> HISTÓRICO</div>
              ${historico.length > 5 ? '<div class="cd-hist-link">Ver todos</div>' : ''}
            </div>
            <div class="cd-hist-list">
              ${histList}
            </div>
          </div>
        </div>
      </div>

      <div class="cd-footer">
        <button class="cd-btn cd-btn-agendar" onclick="openAgendamentoModal();document.getElementById('ag-cliente').value='${c.id}'"><i class="ti ti-calendar"></i> Agendar</button>
        ${pacote ? `
        <button class="cd-btn cd-btn-pacote" onclick="abrirVenderPacote('${c.id}')"><i class="ti ti-package"></i> Renovar Pacote</button>
        ` : `
        <button class="cd-btn cd-btn-pacote" onclick="abrirVenderPacote('${c.id}')"><i class="ti ti-package"></i> Criar Pacote</button>
        `}
        ${c.telefone ? `<button class="cd-btn cd-btn-wpp" onclick="gerarWhatsApp('${c.id}')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
        <button class="cd-btn cd-btn-edit" onclick="openClienteModal('${c.id}')"><i class="ti ti-edit"></i> Editar</button>
        <button class="cd-btn cd-btn-remove" onclick="deleteCliente('${c.id}')"><i class="ti ti-trash"></i> Remover</button>
      </div>
    </div>
  `;
  
  openModal('', html, true);
};

// ─── VENDER / RENOVAR PACOTE (Carteira de Serviços) ──────────
window.abrirVenderPacote = function(id) {
  const c = state.clientes.find(c => c.id === id);
  if (!c) return;
  const temPacote = c.pacote && c.pacote.servicos;
  const nomePacote = c.pacote?.nome || '';
  const cicloAtual = c.pacote?.ciclo || '';

  const servicosInputs = state.servicos.map(srv => {
    const existing = c.pacote?.servicos?.find(i => i.servicoId === srv.id);
    const qtdAtual = existing ? (existing.contratado - existing.usado) : 0;
    return `
      <div class="pacote-srv-input-row">
        <span style="font-size:20px">${srv.icone || '🐾'}</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;color:var(--text)">${srv.nome}</div>
          <div style="font-size:12px;color:var(--text-dim)">${fmtMoney(srv.preco)} por sessão</div>
        </div>
        <input type="number" class="form-control pacote-qty-input" data-srvid="${srv.id}"
          value="${qtdAtual}" min="0" max="99"
          style="width:70px;text-align:center;padding:8px;"
          placeholder="0" />
      </div>`;
  }).join('');

  openModal(`${temPacote ? '🔄 Renovar Pacote' : '💰 Criar Pacote'} — ${c.pet?.nome}`, `
    <div class="form-group">
      <label class="form-label">Nome do Pacote</label>
      <input class="form-control" id="pacote-nome" placeholder="Ex: Pacote Ouro, Combo Mensal..." value="${nomePacote}" />
    </div>

    <div class="form-group">
      <label class="form-label">Frequência de Retorno</label>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${['', 'semanal', 'quinzenal', 'mensal'].map(v => {
          const label = v === '' ? 'Sem plano' : v.charAt(0).toUpperCase() + v.slice(1);
          const sel = cicloAtual === v;
          return `<button type="button" class="freq-chip${sel?' active':''}" data-freq="${v}" onclick="selectFreqChip(this)">${v===''?'—':v==='semanal'?'🔁 Semanal':v==='quinzenal'?'🔁 Quinzenal':'🔁 Mensal'}</button>`;
        }).join('')}
      </div>
      <input type="hidden" id="pacote-ciclo" value="${cicloAtual}">
    </div>

    <div style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Serviços incluídos (0 = não incluso)</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      ${servicosInputs}
    </div>

    <div class="form-group">
      <label class="form-label">Valor Total cobrado pelo Pacote (R$)</label>
      <input type="number" class="form-control" id="pacote-valor" placeholder="Ex: 200.00" value="${c.pacote?.valorPago||''}" />
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-ghost" onclick="openClienteDetalhe('${c.id}')">Cancelar</button>
      <button class="btn btn-magenta" onclick="confirmarPacote('${c.id}')">✅ Confirmar e Gerar Receita</button>
    </div>
  `);
};

window.selectFreqChip = function(btn) {
  document.querySelectorAll('.freq-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pacote-ciclo').value = btn.dataset.freq;
};

window.confirmarPacote = function(id) {
  const c = state.clientes.find(c => c.id === id);
  if (!c) return;

  const nome = document.getElementById('pacote-nome')?.value?.trim() || 'Pacote';
  const ciclo = document.getElementById('pacote-ciclo')?.value || '';
  const valor = parseFloat(document.getElementById('pacote-valor')?.value || 0);

  const itens = [];
  document.querySelectorAll('.pacote-qty-input').forEach(input => {
    const qty = parseInt(input.value || 0);
    if (qty > 0) {
      itens.push({ servicoId: input.dataset.srvid, contratado: qty, usado: 0 });
    }
  });

  if (itens.length === 0) { showToast('Adicione pelo menos 1 serviço ao pacote', 'error'); return; }
  if (valor <= 0) { showToast('Informe o valor cobrado pelo pacote', 'error'); return; }



  c.pacote = { nome, ciclo, servicos: itens, vendidoEm: today(), valorPago: valor };
  c.ciclo = ciclo; // mantém compatibilidade com CRM fila

  const finId = uid();
  state.financeiro.push({
    id: finId,
    tipo: 'receita',
    desc: `${nome} — 🐾 ${c.pet?.nome} (${c.nome})`,
    valor,
    data: today(),
    categoria: 'pacote'
  });
  
  // DUAL WRITE: financeiro V2
  fetch('/api/v2/financeiro', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      id: finId, data_lancamento: today(), valor: valor, tipo: 'receita',
      descricao: `${nome} — 🐾 ${c.pet?.nome} (${c.nome})`,
      metadata: { categoria: 'pacote' }
    })
  }).catch(e => console.error('Dual Write financeiro (pacote):', e));

  // DUAL WRITE: cliente V2 — atualiza metadata com dados do novo pacote
  fetch(`/api/v2/clientes/${c.id}`, {
    method: 'PUT', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      nome: c.nome, telefone: c.telefone, observacoes: c.obs || '',
      metadata: {
        ...(c.metadata || {}),
        pacote: c.pacote,
        ciclo: c.ciclo,
        ultimoAtendimento: c.ultimoAtendimento
      }
    })
  }).catch(e => console.error('Dual Write cliente (pacote):', e));

  showToast(`Pacote "${nome}" criado com sucesso! 🎉`, 'success');
  openClienteDetalhe(id);
  renderPage(currentPage);
  updateFilaBadge();
};

window.encerrarPacote = function(id) {
  if (!confirm('Encerrar o pacote deste pet? Os créditos restantes serão perdidos.')) return;
  const c = state.clientes.find(c => c.id === id);
  if (c) {
    delete c.pacote;
    // V2 Update
    try {
      fetch(`/api/v2/clientes/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: c.nome, telefone: c.telefone, observacoes: c.obs,
          metadata: { ...c, id: undefined, nome: undefined, telefone: undefined, obs: undefined, pet_id: undefined, pet: undefined }
        })
      });
    } catch(e) { console.error(e); }
    
    showToast('Pacote encerrado', 'info');
    openClienteDetalhe(id);
    renderPage(currentPage);
  }
};

window.adicionarOutroPet = function(id) {
  const c = state.clientes.find(c => c.id === id);
  if (!c) return;
  openClienteModal(); // Abre como novo cliente
  setTimeout(() => {
    document.getElementById('cli-nome').value = c.nome || '';
    document.getElementById('cli-tel').value = c.telefone || '';
    document.getElementById('cli-email').value = c.email || '';
    document.getElementById('cli-end').value = c.endereco || '';
    showToast('Dados do tutor preenchidos! Adicione os dados do novo Pet.', 'info');
    // Força a troca para a aba do pet para facilitar o uso
    const tabs = document.querySelectorAll('#cli-tabs .tab');
    if (tabs.length > 1) switchCliTab('pet', tabs[1]);
  }, 50);
};


window.deleteCliente = async function(id) {
  if (!confirm('Remover este cliente e todos seus dados?')) return;
  try {
    const res = await fetch(`/api/v2/clientes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir cliente');
    state.clientes = state.clientes.filter(c => c.id !== id);
    state.agendamentos = state.agendamentos.filter(a => a.clienteId !== id);
    document.getElementById('modal-overlay').classList.remove('open');
    showToast('Cliente removido', 'info');
    renderPage(currentPage);
    updateFilaBadge();
  } catch (err) {
    console.error(err);
    showToast('Erro ao remover cliente', 'error');
  }
};

// ─── FILA DE CONTATOS ─────────────────────────────────────────
let filaFilter = 'atrasado';

// ── helper: hash simples → cor do avatar ──────────────────────
function avatarColor(name) {
  const palette = [
    { bg: 'rgba(10,191,163,0.15)', border: 'rgba(10,191,163,0.35)', color: '#0ABFA3' },
    { bg: 'rgba(224,64,160,0.12)', border: 'rgba(224,64,160,0.3)',  color: '#E040A0' },
    { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)',  color: '#60A5FA' },
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function avatarInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function renderFilaAvatar(name) {
  const c = avatarColor(name);
  const ini = avatarInitials(name);
  return `<div style="width:36px;height:36px;border-radius:50%;background:${c.bg};border:0.5px solid ${c.border};color:${c.color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${ini}</div>`;
}

function renderFila() {
  const page = document.getElementById('page-fila');
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);

  // ── Em Atraso ──────────────────────────────────────────────────
  const comCiclo = state.clientes.filter(c => c.ciclo);
  const atrasados = comCiclo.filter(c => getContactStatus(c) === 'atrasado');

  // ── Confirmar: agendamentos com data entre hoje e +3 dias ─────
  const t3 = new Date(today); t3.setDate(t3.getDate() + 3);
  const t3Str = t3.toISOString().slice(0,10);
  const confirmarAgends = state.agendamentos.filter(a => {
    return a.status !== 'concluido' && a.data >= todayStr && a.data <= t3Str;
  }).sort((a,b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  // ── Pós-venda: concluídos hoje (com saída automática após 24h) ─
  const posvendaAgends = state.agendamentos.filter(a => {
    if (a.status !== 'concluido') return false;
    const concluidoEm = a.concluidoEm ? new Date(a.concluidoEm) : null;
    if (concluidoEm) {
      const diffH = (Date.now() - concluidoEm.getTime()) / 3600000;
      return diffH <= 24;
    }
    // fallback: comparar apenas a data
    return a.data === todayStr;
  }).sort((a,b) => b.data.localeCompare(a.data));

  // ── Qualificar: sem ciclo ──────────────────────────────────────
  const semCiclo = state.clientes.filter(c => !c.pacote || !c.pacote.servicos || c.pacote.servicos.length === 0);

  const tabs = [
    { id: 'atrasado', label: 'Em Atraso',  count: atrasados.length,       stripe: '#f87171' },
    { id: 'confirmar', label: 'Confirmar', count: confirmarAgends.length,  stripe: '#FBBF24' },
    { id: 'posvenda',  label: 'Pós-venda', count: posvendaAgends.length,   stripe: '#0ABFA3' },
    { id: 'qualificar',label: 'Qualificar',count: semCiclo.length,         stripe: '#E040A0' },
  ];

  page.innerHTML = `
    <div class="section-header">
      <div class="section-title">Fila de Contatos</div>
    </div>

    <div class="grid grid-4 mb-3">
      ${tabs.map(t => `
        <div class="kpi-card" style="--kpi-color:${t.stripe}; border-top: 2.5px solid ${t.stripe}; cursor:pointer; transition:.15s; ${filaFilter===t.id ? 'box-shadow:0 0 0 1.5px '+t.stripe+'44' : ''}" onclick="filaFilter='${t.id}';renderFila()">
          <div class="kpi-value" style="color:${t.stripe}">${t.count}</div>
          <div class="kpi-label">${t.label}</div>
        </div>
      `).join('')}
    </div>

    <div class="filter-bar mb-3">
      ${tabs.map(t => `
        <button class="filter-chip ${filaFilter===t.id?'active':''}" onclick="filaFilter='${t.id}';renderFila()" style="${filaFilter===t.id?'border-color:'+t.stripe+';color:'+t.stripe+';background:'+t.stripe+'18;':''}">
          ${t.label}${t.count > 0 ? ` <span style="background:${t.stripe}22;color:${t.stripe};border-radius:99px;padding:1px 7px;font-size:10px;font-weight:700;">${t.count}</span>` : ''}
        </button>
      `).join('')}
    </div>

    <div id="fila-content">
      ${renderFilaContent(filaFilter, atrasados, confirmarAgends, posvendaAgends, semCiclo, todayStr, today)}
    </div>
  `;
}

function renderFilaContent(filter, atrasados, confirmarAgends, posvendaAgends, semCiclo, todayStr, today) {
  // ── ABA 1: EM ATRASO ──────────────────────────────────────────
  if (filter === 'atrasado') {
    if (atrasados.length === 0) return emptyState('Nenhum cliente em atraso!', 'Todos os clientes estão sendo contatados dentro do ciclo.');
    return atrasados.map(c => {
      const d = c.ultimoAtendimento ? Math.round((Date.now() - new Date(c.ultimoAtendimento)) / 86400000) : null;
      const av = renderFilaAvatar(c.nome);
      const petNome = c.pet?.nome || 'Pet';
      const nomePrimeiro = c.nome.split(' ')[0];
      const msg = `Olá, ${nomePrimeiro}! Aqui é o Espaço Pet TransformaCão. Notamos que já faz um tempinho desde o último banho do(a) ${petNome}. Que tal remarcarmos? Estamos aqui para deixar o(a) ${petNome} ainda mais bonito(a)!`;
      const url = c.telefone ? `https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}` : null;
      return `
        <div style="background:var(--card);border:0.5px solid rgba(248,113,113,0.25);border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
          ${av}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--text);">${c.nome} <span style="color:var(--text-muted);font-weight:400;">— ${petNome}</span></div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Ciclo: ${c.ciclo}${c.ultimoAtendimento ? ' · Último: ' + fmt(c.ultimoAtendimento) : ''}</div>
          </div>
          ${d !== null ? `<div style="color:#f87171;font-size:11px;font-weight:600;white-space:nowrap;">há ${d} dias</div>` : ''}
          ${url ? `<a href="${url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;background:rgba(224,64,160,0.1);border:0.5px solid rgba(224,64,160,0.28);color:#E040A0;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;"><i class="ti ti-brand-whatsapp"></i>Reativar</a>` : '<span style="font-size:11px;color:var(--text-muted);">Sem telefone</span>'}
        </div>`;
    }).join('');
  }

  // ── ABA 2: CONFIRMAR ──────────────────────────────────────────
  if (filter === 'confirmar') {
    if (confirmarAgends.length === 0) return emptyState('Nenhum agendamento próximo!', 'Agendamentos nos próximos 3 dias aparecerão aqui.');
    return confirmarAgends.map(a => {
      const c = state.clientes.find(x => x.id === a.clienteId);
      if (!c) return '';
      const srv = state.servicos.find(s => s.id === a.servicoId);
      const av = renderFilaAvatar(c.nome);
      const petNome = c.pet?.nome || 'Pet';
      const nomePrimeiro = c.nome.split(' ')[0];
      const agDate = new Date(a.data + 'T00:00:00');
      const diffDays = Math.round((agDate - today) / 86400000);
      let badge = '';
      if (diffDays === 0) badge = `<span style="background:rgba(248,113,113,0.15);color:#f87171;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;">Hoje</span>`;
      else if (diffDays === 1) badge = `<span style="background:rgba(248,113,113,0.15);color:#f87171;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;">Amanhã</span>`;
      else if (diffDays === 2) badge = `<span style="background:rgba(251,191,36,0.15);color:#FBBF24;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;">2 dias</span>`;
      else badge = `<span style="background:rgba(96,165,250,0.12);color:#60A5FA;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;">3 dias</span>`;
      const diaStr = diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`;
      const msg = `Olá, ${nomePrimeiro}! Passando para confirmar o ${srv?.nome || 'atendimento'} do(a) ${petNome} ${diaStr} às ${a.hora}. Tudo certo por aí? Qualquer dúvida é só falar!`;
      const url = c.telefone ? `https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}` : null;
      return `
        <div style="background:var(--card);border:0.5px solid rgba(251,191,36,0.2);border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
          ${av}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--text);">${c.nome} <span style="color:var(--text-muted);font-weight:400;">— ${petNome}</span></div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${srv?.nome || 'Serviço'} · ${fmt(a.data)} às ${a.hora}</div>
          </div>
          ${badge}
          ${url ? `<a href="${url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;background:rgba(224,64,160,0.1);border:0.5px solid rgba(224,64,160,0.28);color:#E040A0;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;"><i class="ti ti-brand-whatsapp"></i>Confirmar</a>` : '<span style="font-size:11px;color:var(--text-muted);">Sem telefone</span>'}
        </div>`;
    }).join('');
  }

  // ── ABA 3: PÓS-VENDA ─────────────────────────────────────────
  if (filter === 'posvenda') {
    if (posvendaAgends.length === 0) return emptyState('Nenhum pós-venda pendente!', 'Atendimentos concluídos hoje aparecerão aqui automaticamente.');
    return posvendaAgends.map(a => {
      const c = state.clientes.find(x => x.id === a.clienteId);
      if (!c) return '';
      const srv = state.servicos.find(s => s.id === a.servicoId);
      const av = renderFilaAvatar(c.nome);
      const petNome = c.pet?.nome || 'Pet';
      const nomePrimeiro = c.nome.split(' ')[0];
      const msg = `Oi, ${nomePrimeiro}! Tudo bem? Passando para saber como o(a) ${petNome} chegou em casa depois do atendimento de hoje! Ficou cheirosinho(a)? Esperamos que tenha gostado do resultado! Em breve te mando uma fotinho de como ficou durante o atendimento! Qualquer feedback é muito bem-vindo — nos ajuda a cuidar cada vez melhor.`;
      const url = c.telefone ? `https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}` : null;
      return `
        <div style="background:var(--card);border:0.5px solid rgba(10,191,163,0.2);border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
          ${av}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--text);">${c.nome} <span style="color:var(--text-muted);font-weight:400;">— ${petNome}</span></div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${srv?.nome || 'Serviço'}${srv ? ' · ' + fmtMoney(srv.preco) : ''} · <span style="color:#0ABFA3;">Concluído hoje</span></div>
          </div>
          ${url ? `<a href="${url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;background:rgba(224,64,160,0.1);border:0.5px solid rgba(224,64,160,0.28);color:#E040A0;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;"><i class="ti ti-brand-whatsapp"></i>Pós-venda</a>` : '<span style="font-size:11px;color:var(--text-muted);">Sem telefone</span>'}
        </div>`;
    }).join('');
  }

  // ── ABA 4: QUALIFICAR ─────────────────────────────────────────
  if (filter === 'qualificar') {
    if (semCiclo.length === 0) return emptyState('Todos os clientes possuem pacote!', 'Novos clientes sem pacote pago aparecerão aqui.');
    return `
      <div style="margin-bottom:16px;">
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">Clientes sem pacote ativo</div>
        <div style="font-size:12px;color:var(--text-muted);">Oportunidade de venda: ofereça um pacote de banhos com desconto!</div>
      </div>
      ${semCiclo.map(c => {
        const av = renderFilaAvatar(c.nome);
        const petNome = c.pet?.nome || 'Pet';
        const nomePrimeiro = c.nome.split(' ')[0];
        const msg = `Oi, ${nomePrimeiro}! Tudo bem? Foi um prazer ter o(a) ${petNome} aqui! Temos pacotes de banhos com condições especiais para clientes frequentes! Quer saber mais? Posso te explicar como funciona e já reservar um horário para o(a) ${petNome}!`;
        const url = c.telefone ? `https://wa.me/55${c.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}` : null;
        return `
          <div style="background:var(--card);border:0.5px solid rgba(224,64,160,0.15);border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
            ${av}
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:var(--text);">${c.nome} <span style="color:var(--text-muted);font-weight:400;">— ${petNome}</span></div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Sem pacote pago · ${c.pet?.raca || c.pet?.tipo || 'Pet'}</div>
            </div>
            <button onclick="abrirVenderPacote('${c.id}')" style="background:transparent;border:0.5px solid rgba(255,255,255,0.12);color:var(--text-muted);padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer;white-space:nowrap;">Criar Pacote</button>
            ${url ? `<a href="${url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;background:rgba(224,64,160,0.1);border:0.5px solid rgba(224,64,160,0.28);color:#E040A0;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;"><i class="ti ti-brand-whatsapp"></i>Qualificar</a>` : '<span style="font-size:11px;color:var(--text-muted);">Sem telefone</span>'}
          </div>`;
      }).join('')}`;
  }

  return '';
}

function emptyState(title, sub) {
  return `<div class="empty-state"><span class="empty-icon" style="font-size:36px">✅</span><h3>${title}</h3><p>${sub}</p></div>`;
}


// ─── WHATSAPP ─────────────────────────────────────────────────
window.gerarWhatsApp = function(clienteId) {
  const c = state.clientes.find(c => c.id === clienteId);
  if (!c) return;
  const st = getContactStatus(c);
  const petNome = c.pet?.nome || 'seu pet';
  const nome = c.nome.split(' ')[0];
  
  const msgs = state.configuracoes?.mensagens || defaultDB().configuracoes.mensagens;
  let template = msgs.padrao;
  if (st === 'atrasado') template = msgs.atrasado;
  else if (st === 'confirmar') template = msgs.confirmar;
  
  const msg = template.replace(/\{\{nome\}\}/g, nome).replace(/\{\{pet\}\}/g, petNome);

  if (!c.telefone) {
    openModal('Mensagem WhatsApp', `
      <div style="background:var(--surface);border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Mensagem gerada:</div>
        <div style="font-size:14px;line-height:1.6;color:var(--text)">${msg}</div>
      </div>
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;font-size:13px;color:var(--danger)">
        ⚠️ Cliente sem telefone cadastrado. Cadastre o telefone para enviar via WhatsApp.
      </div>
      <button class="btn btn-ghost mt-2" onclick="openClienteModal('${c.id}')">Editar Cliente</button>
    `);
    return;
  }

  const phone = c.telefone.replace(/\D/g, '');
  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;

  openModal('Mensagem WhatsApp', `
    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">📱 Para: ${c.telefone}</div>
      <div style="font-size:14px;line-height:1.6;color:var(--text)">${msg}</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="btn btn-primary" href="${url}" target="_blank" onclick="document.getElementById('modal-overlay').classList.remove('open')">📱 Abrir WhatsApp</a>
      <button class="btn btn-ghost" onclick="copiarMensagem(\`${msg.replace(/`/g,"'")}\`)">📋 Copiar Mensagem</button>
    </div>
  `);
};

window.copiarMensagem = function(msg) {
  navigator.clipboard.writeText(msg).then(() => showToast('Mensagem copiada! 📋', 'success'));
};

window.avisarPronto = function(id) {
  const a = state.agendamentos.find(a => a.id === id);
  if (!a) return;
  const c = state.clientes.find(c => c.id === a.clienteId);
  if (!c || !c.telefone) { showToast('Cliente não possui telefone cadastrado!', 'error'); return; }
  
  const petNome = c.pet?.nome || 'seu pet';
  const nome = c.nome.split(' ')[0];
  
  const msgs = state.configuracoes?.mensagens || defaultDB().configuracoes.mensagens;
  const msg = msgs.pronto.replace(/\{\{nome\}\}/g, nome).replace(/\{\{pet\}\}/g, petNome);
  
  const phone = c.telefone.replace(/\D/g, '');
  const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  
  window.open(url, '_blank');
  showToast('Redirecionando para o WhatsApp...', 'success');
};

// ─── SERVIÇOS ─────────────────────────────────────────────────
function renderServicos() {
  const page = document.getElementById('page-servicos');
  const currentMonth = new Date().toISOString().slice(0, 7);

  page.innerHTML = `

    <div class="section-header">
      <div class="section-title">Catálogo de Serviços</div>
      <button class="btn btn-primary" onclick="openServicoModal()">+ Novo Serviço</button>
    </div>
    <div class="grid grid-3">
      ${state.servicos.map(s => {
        let iconName = 'ti-paw';
        const n = s.nome.toLowerCase();
        if (n.includes('simples') && n.includes('banho')) iconName = 'ti-droplet';
        else if (n.includes('banho') && n.includes('tosa')) iconName = 'ti-scissors';
        else if (n.includes('higiênica') || n.includes('higienica')) iconName = 'ti-cut';
        else if (n.includes('tesoura')) iconName = 'ti-scissors';
        else if (n.includes('spa')) iconName = 'ti-sparkles';
        else if (n.includes('hidratação') || n.includes('hidratacao')) iconName = 'ti-heart';

        const executed = state.agendamentos.filter(a => a.servicoId === s.id && a.status === 'concluido' && a.data.startsWith(currentMonth)).length;
        const revenue = state.financeiro.filter(f => f.tipo === 'receita' && f.data.startsWith(currentMonth) && (f.desc || '').includes(s.nome)).reduce((sum, f) => sum + Number(f.valor||0), 0);
        
        let statLine = '';
        if (executed > 0) {
          statLine = `
            <div style="display:flex; gap:12px; margin-top:8px; padding-top:8px; border-top:0.5px solid rgba(255,255,255,0.07);">
              <div style="display:flex; align-items:center; gap:4px; font-size:11px; color:#7A90A8;">
                <i class="ti ti-chart-bar" style="font-size:11px;"></i> ${executed}x este mês
              </div>
              <div style="display:flex; align-items:center; gap:4px; font-size:11px; color:#0ABFA3;">
                <i class="ti ti-coin" style="font-size:11px;"></i> ${fmtMoney(revenue)}
              </div>
            </div>
          `;
        } else {
          statLine = `
            <div style="display:flex; gap:12px; margin-top:8px; padding-top:8px; border-top:0.5px solid rgba(255,255,255,0.07);">
              <div style="font-size:11px; color:#7A90A8; font-style:italic;">Nenhum atendimento este mês</div>
            </div>
          `;
        }

        return `
        <div class="service-card">
          <div style="width:44px; height:44px; border-radius:10px; background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
            <i class="ti ${iconName}" style="font-size:28px; color:#7A90A8;"></i>
          </div>
          <div class="service-name">${s.nome}</div>
          <div class="service-price">${fmtMoney(s.preco)}</div>
          <div class="service-desc">${s.desc||''}</div>
          
          ${statLine}

          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="srv-btn-edit" onclick="openServicoModal('${s.id}')">
              <i class="ti ti-pencil" style="font-size:13px; margin-right:4px;"></i> Editar
            </button>
            <button class="srv-btn-delete" onclick="deleteServico('${s.id}')">
              <i class="ti ti-trash" style="font-size:14px;"></i>
            </button>
          </div>
        </div>
      `}).join('')}
    </div>
  `;
}

window.openServicoModal = function(editId) {
  const s = editId ? state.servicos.find(s => s.id === editId) : null;
  const icons = ['🛁','✂️','🪒','💆','💧','🐕','🐾','🎀','🌸','⭐'];
  openModal(s ? 'Editar Serviço' : 'Novo Serviço', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome do Serviço *</label>
        <input class="form-control" id="srv-nome" placeholder="Ex: Banho + Tosa" value="${s?.nome||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Ícone</label>
        <select class="form-control" id="srv-icon">
          ${icons.map(i => `<option value="${i}" ${s?.icone===i?'selected':''}>${i}</option>`).join('')}
        </select>
      </div>
    </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Preço (R$) *</label>
        <input class="form-control" id="srv-preco" type="number" min="0" step="0.01" placeholder="0,00" value="${s?.preco||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Duração (min) *</label>
        <input class="form-control" id="srv-duracao" type="number" min="0" step="5" placeholder="60" value="${s?.duracao||'60'}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <textarea class="form-control" id="srv-desc" placeholder="Descreva o que inclui...">${s?.desc||''}</textarea>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
      <button class="btn btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarServico('${editId||''}')">${s?'Atualizar':'Criar Serviço'}</button>
    </div>
  `);
};

window.salvarServico = async function(editId) {
  const nome = document.getElementById('srv-nome')?.value?.trim();
  const preco = document.getElementById('srv-preco')?.value;
  const duracao = document.getElementById('srv-duracao')?.value;
  if (!nome || !preco || !duracao) { showToast('Nome, preo e durao so obrigatrios', 'error'); return; }
  
  const id_serv = editId || uid();
  const dados = {
    id: id_serv,
    nome, 
    preco: parseFloat(preco),
    duracao: parseInt(duracao, 10),
    icone: document.getElementById('srv-icon')?.value,
    desc: document.getElementById('srv-desc')?.value,
  };

  try {
    const url = editId ? `/api/v2/servicos/${editId}` : `/api/v2/servicos`;
    const method = editId ? 'PUT' : 'POST';
    const dbPayload = { id: id_serv, nome: dados.nome, preco: dados.preco, duracao: dados.duracao, icone: dados.icone, descricao: dados.desc, ordem: 0 };
    
    const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbPayload) });
    if (!res.ok) throw new Error('Erro ao salvar no banco');
    
    if (editId) {
      const idx = state.servicos.findIndex(s => s.id === editId);
      if (idx >= 0) state.servicos[idx] = { ...state.servicos[idx], ...dados };
      showToast('Serviço atualizado!', 'success');
    } else {
      state.servicos.push({ ...dados });
      showToast('Serviço criado!', 'success');
    }
    document.getElementById('modal-overlay').classList.remove('open');
    renderPage(currentPage);
  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar serviço v2', 'error');
  }
};

window.deleteServico = async function(id) {
  if (!confirm('Remover este serviço?')) return;
  try {
    const res = await fetch(`/api/v2/servicos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir serviço');
    state.servicos = state.servicos.filter(s => s.id !== id);
    showToast('Serviço removido', 'info');
    renderPage(currentPage);
  } catch (err) {
    console.error(err);
    showToast('Erro ao remover serviço', 'error');
  }
};

// ─── FINANCEIRO ───────────────────────────────────────────────
let finFilter = 'todos';
let now = new Date();
let finStartDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
let finEndDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0')}`;
let finShowAll = false;

window.changeFinStartDate = function(val) {
  finStartDate = val;
  finShowAll = false;
  renderFinanceiro();
};

window.changeFinEndDate = function(val) {
  finEndDate = val;
  finShowAll = false;
  renderFinanceiro();
};

window.changeFinFilter = function(filter) {
  finFilter = filter;
  finShowAll = false;
  renderFinanceiro();
};

window.toggleFinShowAll = function() {
  finShowAll = !finShowAll;
  renderFinanceiro();
};

function renderFinanceiro() {
  const page = document.getElementById('page-financeiro');

  const isDateInRange = (d) => {
    if (!d) return false;
    return d >= finStartDate && d <= finEndDate;
  };

  const all = state.financeiro.filter(f => finFilter === 'todos' || f.tipo === finFilter)
    .filter(f => isDateInRange(f.data))
    .sort((a,b) => (b.data||'').localeCompare(a.data||''));

  const displayedTransactions = finShowAll ? all : all.slice(0, 5);

  const receita = state.financeiro.filter(f => f.tipo === 'receita' && isDateInRange(f.data))
    .reduce((s,f) => s + Number(f.valor||0), 0);
  const custos = state.financeiro.filter(f => f.tipo === 'custo' && isDateInRange(f.data))
    .reduce((s,f) => s + Number(f.valor||0), 0);

  const lucro = receita - custos;

  // Previous month logic for variation
  const prevStart = new Date(finStartDate + 'T00:00:00');
  prevStart.setMonth(prevStart.getMonth() - 1);
  const pS = `${prevStart.getFullYear()}-${String(prevStart.getMonth()+1).padStart(2,'0')}-01`;
  const pE = `${prevStart.getFullYear()}-${String(prevStart.getMonth()+1).padStart(2,'0')}-${String(new Date(prevStart.getFullYear(), prevStart.getMonth()+1, 0).getDate()).padStart(2,'0')}`;
  const isPrevDate = (d) => d && d >= pS && d <= pE;
  
  const recPrev = state.financeiro.filter(f => f.tipo === 'receita' && isPrevDate(f.data)).reduce((s,f) => s + Number(f.valor||0), 0);
  const cusPrev = state.financeiro.filter(f => f.tipo === 'custo' && isPrevDate(f.data)).reduce((s,f) => s + Number(f.valor||0), 0);
  const lucPrev = recPrev - cusPrev;
  
  const getV = (c, p) => {
    if (p === 0 && c === 0) return { val: '0.0', pos: true };
    if (p === 0) return { val: '100.0', pos: c >= 0 };
    const pct = ((c - p) / Math.abs(p)) * 100;
    return { val: Math.abs(pct).toFixed(1), pos: pct >= 0 };
  };
  const renderVar = (v) => `
    <div style="font-size:11px; color:${v.pos?'#0ABFA3':'#f87171'}; display:flex; align-items:center; gap:4px; margin-top:6px;">
      <i class="ti ${v.pos?'ti-arrow-up':'ti-arrow-down'}" style="font-size:10px;"></i> ${v.val}%
    </div>
  `;

  // Distribuição de custos por categoria
  const custoTotals = {};
  state.financeiro.filter(f => f.tipo === 'custo' && isDateInRange(f.data)).forEach(f => {
    custoTotals[f.categoria||'outros'] = (custoTotals[f.categoria||'outros'] || 0) + Number(f.valor||0);
  });

  // Distribuição de receitas por categoria/serviço
  const receitaTotals = {};
  state.financeiro.filter(f => f.tipo === 'receita' && isDateInRange(f.data)).forEach(f => {
    let label = f.desc || 'Outros';
    if (label.includes(' — ')) {
      label = label.split(' — ')[0];
    }
    receitaTotals[label] = (receitaTotals[label] || 0) + Number(f.valor||0);
  });

  const mesLabel = `${fmt(finStartDate)} a ${fmt(finEndDate)}`;

  if (!document.getElementById('financeiro-content')) {
    page.innerHTML = `


      <div class="section-header" style="flex-wrap:wrap;gap:12px;">
        <div class="section-title">Gestão Financeira</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;background:var(--surface);padding:4px 8px;border-radius:8px;border:1px solid var(--border);">
            <span style="font-size:12px;color:var(--text-muted)">De</span>
            <input type="date" id="fin-start-date" class="form-control" value="${finStartDate}" onchange="changeFinStartDate(this.value)" style="padding:4px 8px;width:120px;font-size:13px;" />
            <span style="font-size:12px;color:var(--text-muted)">Até</span>
            <input type="date" id="fin-end-date" class="form-control" value="${finEndDate}" onchange="changeFinEndDate(this.value)" style="padding:4px 8px;width:120px;font-size:13px;" />
          </div>
          <button class="btn btn-primary" onclick="openFinanceiroModal()">+ Lançamento</button>
        </div>
      </div>
      <div id="financeiro-content"></div>
    `;
  } else {
    const stEl = document.getElementById('fin-start-date');
    if (stEl && stEl.value !== finStartDate) stEl.value = finStartDate;
    const enEl = document.getElementById('fin-end-date');
    if (enEl && enEl.value !== finEndDate) enEl.value = finEndDate;
  }

  const content = document.getElementById('financeiro-content');
  content.innerHTML = `

    <div class="grid grid-3 mb-3">
      <div class="kpi-card" style="border-top-color: #0ABFA3;">
        <div class="finance-value" style="color: #0ABFA3;">${fmtMoney(receita)}</div>
        <div class="finance-label">Receitas — ${mesLabel}</div>
        ${renderVar(getV(receita, recPrev))}
      </div>
      <div class="kpi-card" style="border-top-color: #7A90A8;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div class="finance-value" style="color: #EEF2F7;">${fmtMoney(custos)}</div>
          <div style="background:rgba(74,222,128,0.08); color:#4ade80; font-size:10px; padding:3px 6px; border-radius:4px; font-weight:600; margin-top:6px;">Margem saudável</div>
        </div>
        <div class="finance-label">Custos — ${mesLabel}</div>
        ${renderVar(getV(custos, cusPrev))}
      </div>
      <div class="kpi-card" style="border-top-color: #8b5cf6;">
        <div class="finance-value" style="color: #8b5cf6;">${fmtMoney(lucro)}</div>
        <div class="finance-label">Lucro Líquido — ${mesLabel}</div>
        ${renderVar(getV(lucro, lucPrev))}
      </div>
    </div>

    <div class="grid grid-2 mb-3" style="gap:20px;">
      <div class="card" style="display:flex; flex-direction:column;">
        <div class="section-title mb-3">Origem das Receitas</div>
        <div style="display:flex; align-items:center; gap:20px; flex:1;">
          <div style="flex:1; max-width:160px; position:relative;">
            <canvas id="chart-fin-receita"></canvas>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; flex:1; max-height:160px; overflow-y:auto; padding-right:10px;">
            ${Object.entries(receitaTotals).sort((a,b)=>b[1]-a[1]).map((ent, i) => {
              const color = ['#1A9BAF','#4BBDD4','#22C55E','#F59E0B','#E8198A','#EF4444'][i%6];
              return `
              <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px;">
                <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                  <div style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></div>
                  <span style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ent[0]}</span>
                </div>
                <span style="color:#0ABFA3; font-weight:600; flex-shrink:0; margin-left:10px;">${fmtMoney(ent[1])}</span>
              </div>
              `;
            }).join('') || '<div style="font-size:11px;color:var(--text-muted)">Sem dados</div>'}
          </div>
        </div>
      </div>
      <div class="card" style="display:flex; flex-direction:column;">
        <div class="section-title mb-3">Distribuição de Custos</div>
        ${Object.keys(custoTotals).length === 1 ? `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height: 160px; gap: 10px;">
            <div style="width:48px; height:48px; border-radius:12px; background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center;">
              <i class="ti ti-package" style="font-size:24px; color:var(--text-muted)"></i>
            </div>
            <div style="font-size:14px; font-weight:500;">${Object.keys(custoTotals)[0]}</div>
            <div style="font-size:18px; font-weight:600; color:#f87171;">${fmtMoney(Object.values(custoTotals)[0])}</div>
            <div style="font-size:11px; color:var(--text-muted);">Único custo registrado</div>
          </div>
        ` : `
          <div style="display:flex; align-items:center; gap:20px; flex:1;">
            <div style="flex:1; max-width:160px; position:relative;">
              <canvas id="chart-fin-custo"></canvas>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; flex:1; max-height:160px; overflow-y:auto; padding-right:10px;">
              ${Object.entries(custoTotals).sort((a,b)=>b[1]-a[1]).map((ent, i) => {
                const color = ['#E8198A','#1A9BAF','#4BBDD4','#F59E0B','#22C55E','#EF4444'][i%6];
                return `
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px;">
                  <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                    <div style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></div>
                    <span style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ent[0]}</span>
                  </div>
                  <span style="color:#f87171; font-weight:600; flex-shrink:0; margin-left:10px;">${fmtMoney(ent[1])}</span>
                </div>
                `;
              }).join('') || '<div style="font-size:11px;color:var(--text-muted)">Sem dados</div>'}
            </div>
          </div>
        `}
      </div>
    </div>

    <div class="grid grid-2 mb-3" style="gap: 20px;">
      <div class="card">
        <div class="section-title mb-1">💰 Resumo de Receitas</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Serviço/Origem</th><th>%</th><th>Total</th></tr></thead>
            <tbody>
              ${Object.keys(receitaTotals).length === 0 ? `<tr><td colspan="3" style="color:var(--text-dim); text-align:center">Nenhuma receita registrada</td></tr>` : 
                Object.entries(receitaTotals).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
                  const pct = receita > 0 ? (v / receita) * 100 : 0;
                  return `
                  <tr>
                    <td>${k}</td>
                    <td style="color:var(--text-muted); font-size:11px;">${pct.toFixed(1)}%</td>
                    <td class="text-teal fw-bold">
                      <div style="display:flex; flex-direction:column;">
                        ${fmtMoney(v)}
                        <div style="width:100%; height:3px; border-radius:2px; background:rgba(10,191,163,0.15); margin-top:2px;">
                          <div style="width:${pct}%; height:100%; background:#0ABFA3; border-radius:2px;"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `}).join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="section-title mb-1">💸 Resumo de Custos</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Categoria</th><th>Total</th></tr></thead>
            <tbody>
              ${Object.keys(custoTotals).length === 0 ? `<tr><td colspan="2" style="color:var(--text-dim); text-align:center">Nenhum custo registrado</td></tr>` : 
                Object.entries(custoTotals).map(([k,v]) => `
                  <tr><td>${k}</td><td class="text-danger fw-bold">${fmtMoney(v)}</td></tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">Lançamentos</div>
      <div class="filter-bar" style="margin-bottom:0">
        <button class="filter-chip ${finFilter==='todos'?'active':''}" onclick="changeFinFilter('todos')">Todos</button>
        <button class="filter-chip ${finFilter==='receita'?'active':''}" onclick="changeFinFilter('receita')">💰 Receitas</button>
        <button class="filter-chip ${finFilter==='custo'?'active':''}" onclick="changeFinFilter('custo')">💸 Custos</button>
      </div>
    </div>

    <div class="card mt-2" style="display: flex; flex-direction: column; gap: 8px;">
      ${displayedTransactions.length === 0 ? `
        <div class="empty-state" style="padding:40px">
          <span class="empty-icon">💰</span>
          <h3>Nenhum lançamento</h3>
          <p>Adicione receitas e custos para acompanhar sua gestão financeira.</p>
        </div>
      ` : displayedTransactions.map(f => `
        <div class="transaction" style="display:flex; align-items:center; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; ${f.tipo === 'receita' ? 'color:#0ABFA3; background:rgba(10,191,163,0.1); border:0.5px solid rgba(10,191,163,0.3);' : 'color:#f87171; background:rgba(248,113,113,0.08); border:0.5px solid rgba(248,113,113,0.3);'}">
            <i class="ti ${f.tipo === 'receita' ? 'ti-arrow-up-circle' : 'ti-arrow-down-circle'}" style="font-size:16px;"></i>
          </div>
          <div class="transaction-info" style="margin-left:12px;">
            <div class="transaction-desc" style="font-weight:600; font-size:13px;">${f.desc||f.categoria||'—'}</div>
            <div class="transaction-date" style="font-size:11px; color:var(--text-muted);">${fmt(f.data)} · ${f.categoria||'outros'}</div>
          </div>
          <div class="transaction-amount ${f.tipo}" style="margin-left:auto; font-weight:700; font-family:'Nunito', sans-serif;">${f.tipo==='receita'?'+':'−'} ${fmtMoney(f.valor)}</div>
          ${f.agendamento_id ? '<button class="btn btn-icon btn-sm" disabled style="margin-left:12px; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.1); cursor:not-allowed; opacity:0.7;" title="Receita automática de um serviço concluído. Para remover este valor do caixa, exclua o agendamento.">🔒</button>' : '<button class="btn btn-danger btn-icon btn-sm" style="margin-left:12px;" onclick="deleteFinanceiro(\'' + f.id + '\')">🗑️</button>'}
        </div>
      `).join('')}

      ${all.length > 5 ? `
        <div style="display: flex; justify-content: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border);">
          <button class="btn btn-ghost" onclick="toggleFinShowAll()" style="width: 100%; color: var(--teal-light); font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
            ${finShowAll ? '▲ Mostrar Menos' : `▼ Ver todos os ${all.length} lançamentos`}
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Renderiza Gráficos do Financeiro
  requestAnimationFrame(() => {
    // 1. Gráfico de Receitas
    const ctxRec = document.getElementById('chart-fin-receita')?.getContext('2d');
    if (ctxRec) {
      if (dashCharts.finReceita) dashCharts.finReceita.destroy();
      const labels = Object.keys(receitaTotals);
      const data = Object.values(receitaTotals);
      let opts = { ...chartOptions(), cutout: '60%', scales: undefined };
      if (opts.plugins) opts.plugins.legend = { display: false };
      
      if (labels.length > 0) {
        dashCharts.finReceita = new Chart(ctxRec, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: ['#1A9BAF','#4BBDD4','#22C55E','#F59E0B','#E8198A','#EF4444'], borderWidth: 0 }]
          },
          options: opts
        });
      } else {
        dashCharts.finReceita = new Chart(ctxRec, {
          type: 'doughnut',
          data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#3A4160'], borderWidth: 0 }] },
          options: opts
        });
      }
    }

    // 2. Gráfico de Custos
    const ctxCus = document.getElementById('chart-fin-custo')?.getContext('2d');
    if (ctxCus && Object.keys(custoTotals).length > 1) {
      if (dashCharts.finCusto) dashCharts.finCusto.destroy();
      const labels = Object.keys(custoTotals);
      const data = Object.values(custoTotals);
      let opts = { ...chartOptions(), cutout: '60%', scales: undefined };
      if (opts.plugins) opts.plugins.legend = { display: false };
      if (labels.length > 0) {
        dashCharts.finCusto = new Chart(ctxCus, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: ['#E8198A','#1A9BAF','#4BBDD4','#F59E0B','#22C55E','#EF4444'], borderWidth: 0 }]
          },
          options: opts
        });
      } else {
        dashCharts.finCusto = new Chart(ctxCus, {
          type: 'doughnut',
          data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#3A4160'], borderWidth: 0 }] },
          options: opts
        });
      }
    }
  });
}

window.openFinanceiroModal = function() {
  const html = `

    
    <div class="ag-modal-header">
      <div class="ag-header-left">
        <div class="ag-icon-square">
          <i class="ti ti-cash"></i>
        </div>
        <div>
          <div class="ag-header-title">Novo Lançamento</div>
          <div class="ag-header-subtitle">Adicione uma receita ou custo</div>
        </div>
      </div>
      <button class="ag-close-btn" onclick="document.getElementById('modal-overlay').classList.remove('open')">
        <i class="ti ti-x"></i>
      </button>
    </div>
    
    <div class="ag-body">
      <div class="ag-form-group">
        <label class="ag-form-label">Tipo</label>
        <div class="ag-select-wrap">
          <select class="ag-select" id="fin-tipo" onchange="toggleFinCategoria(this.value)">
            <option value="receita">💰 Receita</option>
            <option value="custo">💸 Custo</option>
          </select>
          <i class="ti ti-chevron-down ag-select-icon"></i>
        </div>
      </div>
      
      <div class="ag-form-group">
        <label class="ag-form-label">Descrição</label>
        <input class="ag-input" id="fin-desc" placeholder="Ex: Banho + Tosa - Maria / Shampoo profissional" />
      </div>
      
      <div class="ag-form-row ag-form-group">
        <div>
          <label class="ag-form-label">Valor (R$)</label>
          <input class="ag-input" id="fin-valor" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div>
          <label class="ag-form-label">Data</label>
          <input class="ag-input" id="fin-data" type="date" value="${today()}" />
        </div>
      </div>
      
      <div class="ag-form-group" id="fin-cat-group" style="display:none;">
        <label class="ag-form-label">Categoria do Custo</label>
        <div class="ag-select-wrap">
          <select class="ag-select" id="fin-cat">
            <option value="produtos">🧴 Produtos / Shampoos</option>
            <option value="equipamentos">🔧 Equipamentos</option>
            <option value="cursos">📚 Cursos / Capacitação</option>
            <option value="aluguel">🏠 Aluguel / Estrutura</option>
            <option value="marketing">📣 Marketing</option>
            <option value="pessoal">👤 Pessoal / Comissões</option>
            <option value="outros">📦 Outros</option>
          </select>
          <i class="ti ti-chevron-down ag-select-icon"></i>
        </div>
      </div>
    </div>
    
    <div class="ag-footer">
      <button class="ag-btn ag-btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('open')">Cancelar</button>
      <button class="ag-btn ag-btn-save" onclick="salvarFinanceiro()">Salvar Lançamento</button>
    </div>
  `;
  openModal('Novo Lançamento', html);
  
  // Call toggleFinCategoria manually to set initial state based on default value
  setTimeout(() => {
    const el = document.getElementById('fin-tipo');
    if (el) toggleFinCategoria(el.value);
  }, 0);
};

window.toggleFinCategoria = function(tipo) {
  const g = document.getElementById('fin-cat-group');
  if (g) g.style.display = tipo === 'custo' ? 'block' : 'none';
};

window.salvarFinanceiro = async function() {
  const tipo = document.getElementById('fin-tipo')?.value;
  const desc = document.getElementById('fin-desc')?.value;
  const valor = document.getElementById('fin-valor')?.value;
  const data = document.getElementById('fin-data')?.value;
  const cat = document.getElementById('fin-cat')?.value;
  if (!valor || !data) { showToast('Preencha valor e data', 'error'); return; }
  
  const finId = uid();
  const categoria = tipo === 'custo' ? cat : 'servico';
  state.financeiro.push({ id: finId, tipo, desc, valor: parseFloat(valor), data, categoria });
  
  try {
    const res = await fetch('/api/v2/financeiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: finId,
        data_lancamento: data,
        valor: parseFloat(valor),
        tipo: tipo,
        descricao: desc,
        agendamento_id: null,
        metadata: { categoria }
      })
    });
    if (!res.ok) throw new Error('Erro na API V2');
  } catch(e) {
    console.error('Erro ao salvar financeiro no Postgres:', e);
  }

  document.getElementById('modal-overlay').classList.remove('open');
  showToast('Lançamento salvo!', 'success');
  renderPage(currentPage);
};

window.deleteFinanceiro = async function(id) {
  if (!confirm('Remover este lançamento?')) return;
  try {
    const res = await fetch(`/api/v2/financeiro/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir financeiro');
    state.financeiro = state.financeiro.filter(f => f.id !== id);
    showToast('Lançamento removido', 'info');
    renderPage(currentPage);
  } catch (err) {
    console.error(err);
    showToast('Erro ao remover financeiro', 'error');
  }
};

// ─── DEMO DATA ────────────────────────────────────────────────
function seedDemoData() {
  if (state.clientes.length > 0) return;
  const hoje = new Date();

  const clientesSeed = [
    {
      nome: 'Ana Clara Oliveira', telefone: '11991234567', email: 'ana@email.com',
      pet: { nome: 'Bolinha', tipo: 'cachorro', raca: 'Poodle', porte: 'pequeno',
        nascimento: '2020-06-23', aniversario: `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`,
        obs: 'Muito agitado no secador, prefere tesoura' },
      ciclo: 'quinzenal',
      ultimoAtendimento: new Date(hoje.getTime() - 16*86400000).toISOString().slice(0,10),
      histObs: 'Dona prefere tosa padrão poodle. Cuidado com as orelhas.'
    },
    {
      nome: 'Pedro Santos', telefone: '11987654321',
      pet: { nome: 'Thor', tipo: 'cachorro', raca: 'Labrador', porte: 'grande',
        nascimento: '2019-03-15', aniversario: '2019-03-15', obs: 'Dócil, adora água' },
      ciclo: 'mensal',
      ultimoAtendimento: new Date(hoje.getTime() - 28*86400000).toISOString().slice(0,10),
      histObs: 'Banho simples. Não faz tosa.'
    },
    {
      nome: 'Juliana Ferreira', telefone: '11934567890', email: 'ju@email.com',
      pet: { nome: 'Mel', tipo: 'cachorro', raca: 'Yorkshire', porte: 'pequeno',
        nascimento: '2021-11-05', aniversario: '2021-11-05' },
      ciclo: 'semanal',
      ultimoAtendimento: new Date(hoje.getTime() - 5*86400000).toISOString().slice(0,10),
      histObs: 'Tosa na tesoura, estilo baby face. Verniz lilás.'
    },
    {
      nome: 'Carlos Mendes', telefone: '11923456789',
      pet: { nome: 'Mia', tipo: 'gato', raca: 'Persa', porte: 'medio',
        nascimento: '2020-08-20', aniversario: '2020-08-20', obs: 'Usar luvas! Um pouco agressiva' },
      ciclo: 'mensal',
      ultimoAtendimento: new Date(hoje.getTime() - 32*86400000).toISOString().slice(0,10),
      histObs: 'Banho especial para gatos. Secar bem.'
    },
    {
      nome: 'Fernanda Lima', telefone: '11956789012',
      pet: { nome: 'Max', tipo: 'cachorro', raca: 'Shih Tzu', porte: 'pequeno',
        nascimento: '2022-01-10', aniversario: '2022-01-10' },
      ciclo: 'quinzenal',
      ultimoAtendimento: new Date(hoje.getTime() - 14*86400000).toISOString().slice(0,10),
    },
  ];

  const srvIds = state.servicos.map(s => s.id);
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  clientesSeed.forEach(cd => {
    const id = uid();
    state.clientes.push({ id, ...cd, criadoEm: new Date().toISOString(), agendamentos: 0 });

    // 3 historical appointments
    for (let i = 3; i >= 1; i--) {
      const d = new Date(hoje.getTime() - i * 20 * 86400000).toISOString().slice(0,10);
      const sId = rand(srvIds);
      const srv = state.servicos.find(s => s.id === sId);
      state.agendamentos.push({ id: uid(), clienteId: id, data: d, hora: `${9+i}:00`, servicoId: sId, obs: '', criadoEm: new Date().toISOString() });
      if (srv) state.financeiro.push({ id: uid(), tipo: 'receita', desc: `${srv.nome} — ${cd.nome}`, valor: srv.preco, data: d, categoria: 'servico' });
    }
  });

  // Some costs
  const costs = [
    { desc: 'Shampoo profissional 5L', valor: 89.90, categoria: 'produtos', data: new Date(hoje.getTime()-20*86400000).toISOString().slice(0,10) },
    { desc: 'Condicionador hidratante', valor: 65.00, categoria: 'produtos', data: new Date(hoje.getTime()-15*86400000).toISOString().slice(0,10) },
    { desc: 'Curso de tosa artesanal', valor: 350.00, categoria: 'cursos', data: new Date(hoje.getTime()-45*86400000).toISOString().slice(0,10) },
    { desc: 'Material de consumo', valor: 120.00, categoria: 'outros', data: new Date(hoje.getTime()-10*86400000).toISOString().slice(0,10) },
    { desc: 'Aluguel do espaço', valor: 800.00, categoria: 'aluguel', data: new Date(hoje.getFullYear(), hoje.getMonth(), 5).toISOString().slice(0,10) },
  ];
  costs.forEach(c => state.financeiro.push({ id: uid(), tipo: 'custo', ...c }));

}

// ─── CONFIGURAÇÕES E BACKUP ─────────────────────────────────────
window.openConfigModal = function() {
  const token = state.configuracoes?.telegramToken || '';
  const chatId = state.configuracoes?.telegramChatId || '';
  const msgs = state.configuracoes?.mensagens || defaultDB().configuracoes.mensagens;
  
  openModal('Configurações e Backup', `


    <div class="config-modal-header">
      <div class="config-header-left">
        <div class="config-icon-square">
          <i class="ti ti-settings"></i>
        </div>
        <div style="display:flex;flex-direction:column;">
          <span class="config-header-title">Configurações</span>
          <span class="config-header-subtitle">Backup e preferências do sistema</span>
        </div>
      </div>
      <button class="config-close-btn" onclick="document.getElementById('modal-overlay').classList.remove('open')">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <!-- SEÇÃO 1: BACKUP LOCAL -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="ti ti-database" style="color:#0ABFA3;font-size:14px;"></i> Backup local
      </div>
      <div class="config-section-desc">
        Baixa uma cópia do banco de dados diretamente para o seu computador.
      </div>
      <button class="config-btn config-btn-outline-teal" onclick="baixarBackup()">
        <i class="ti ti-download"></i> Baixar backup
      </button>
    </div>

    <!-- SEÇÃO 2: BACKUP TELEGRAM -->
    <div class="config-section">
      <div class="config-section-title" style="display:flex;align-items:center;gap:7px;">
        <i class="ti ti-brand-telegram" style="color:#60A5FA;font-size:14px;"></i> Backup automático via Telegram
        ${(token && chatId) ? `
          <span class="config-badge-connected">
            <i class="ti ti-check" style="font-size:11px;"></i> Conectado
          </span>
        ` : ''}
      </div>
      <div class="config-section-desc">
        Envie backups para o seu Telegram. Configure o bot pelo @BotFather e cole as credenciais abaixo.
      </div>
      
      <div class="config-field-group">
        <span class="config-field-label">Bot Token</span>
        <div class="config-field-hint">Gerado pelo @BotFather no Telegram</div>
        <input type="text" class="config-input" id="cfg-token" placeholder="123456789:ABCdefGHIjklMNO..." value="${token}" />
      </div>

      <div class="config-field-group">
        <span class="config-field-label">Chat ID</span>
        <div class="config-field-hint">Seu ID pessoal — obtenha via @userinfobot</div>
        <input type="text" class="config-input" id="cfg-chatid" placeholder="12345678" value="${chatId}" />
      </div>

      <button class="config-btn config-btn-magenta" onclick="enviarBackupTelegram()" style="margin-top:4px;">
        <i class="ti ti-brand-telegram"></i> Enviar backup agora
      </button>
    </div>
    
    <!-- SEÇÃO 2.5: MENSAGENS WHATSAPP -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="ti ti-message" style="color:#0ABFA3;font-size:14px;"></i> Mensagens Padrão (WhatsApp)
      </div>
      <div class="config-section-desc">
        Personalize as mensagens geradas pelo sistema. Use <b>{{nome}}</b> para o cliente e <b>{{pet}}</b> para o pet.
      </div>
      
      <div class="config-field-group">
        <span class="config-field-label">Agendar (Padrão)</span>
        <textarea class="config-input" id="cfg-msg-padrao" rows="3" style="resize:vertical; line-height:1.4">${msgs.padrao}</textarea>
      </div>
      <div class="config-field-group">
        <span class="config-field-label">Atrasado</span>
        <textarea class="config-input" id="cfg-msg-atrasado" rows="3" style="resize:vertical; line-height:1.4">${msgs.atrasado}</textarea>
      </div>
      <div class="config-field-group">
        <span class="config-field-label">Confirmar</span>
        <textarea class="config-input" id="cfg-msg-confirmar" rows="3" style="resize:vertical; line-height:1.4">${msgs.confirmar}</textarea>
      </div>
      <div class="config-field-group">
        <span class="config-field-label">Avisar Pronto</span>
        <textarea class="config-input" id="cfg-msg-pronto" rows="3" style="resize:vertical; line-height:1.4">${msgs.pronto}</textarea>
      </div>
    </div>

    <!-- SEÇÃO 3: GAMIFICAÇÃO -->
    <div class="config-section">
      <div class="config-section-title">
        <i class="ti ti-trophy" style="color:#7A90A8;font-size:14px;"></i> Gamificação
      </div>
      <div class="config-section-desc">
        Zera apenas os recordes do Hall da Fama. Clientes, agendamentos e histórico não são afetados.
      </div>
      <button class="config-btn config-btn-danger" onclick="resetarRecordes()">
        <i class="ti ti-trash"></i> Zerar recordes
      </button>
    </div>

    <!-- FOOTER -->
    <div style="display:flex;gap:10px;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:0.5px solid rgba(255,255,255,0.07);">
      <button class="config-btn config-btn-ghost" onclick="document.getElementById('modal-overlay').classList.remove('open')">Fechar</button>
      <button class="config-btn config-btn-save" style="margin-left:auto;" onclick="salvarConfig()">
        <i class="ti ti-device-floppy"></i> Salvar dados
      </button>
    </div>
  `);
};

window.salvarConfig = function() {
  const token = document.getElementById('cfg-token')?.value.trim();
  const chatId = document.getElementById('cfg-chatid')?.value.trim();
  
  if (!state.configuracoes) state.configuracoes = {};
  state.configuracoes.telegramToken = token;
  state.configuracoes.telegramChatId = chatId;

  if (!state.configuracoes.mensagens) state.configuracoes.mensagens = defaultDB().configuracoes.mensagens;
  
  const padrao = document.getElementById('cfg-msg-padrao')?.value.trim();
  const atrasado = document.getElementById('cfg-msg-atrasado')?.value.trim();
  const confirmar = document.getElementById('cfg-msg-confirmar')?.value.trim();
  const pronto = document.getElementById('cfg-msg-pronto')?.value.trim();
  
  if (padrao) state.configuracoes.mensagens.padrao = padrao;
  if (atrasado) state.configuracoes.mensagens.atrasado = atrasado;
  if (confirmar) state.configuracoes.mensagens.confirmar = confirmar;
  if (pronto) state.configuracoes.mensagens.pronto = pronto;
  
  saveConfigV2('configuracoes', state.configuracoes);
  showToast('Configurações salvas! ✅', 'success');
  document.getElementById('modal-overlay').classList.remove('open');
};

window.baixarBackup = function() {
  window.open('/api/backup/download', '_blank');
  showToast('Download do backup iniciado!', 'info');
};

window.enviarBackupTelegram = function() {
  // Save first to ensure we use the latest inputs if changed
  const token = document.getElementById('cfg-token')?.value.trim() || state.configuracoes?.telegramToken;
  const chatId = document.getElementById('cfg-chatid')?.value.trim() || state.configuracoes?.telegramChatId;

  if (!token || !chatId) {
    showToast('Preencha o Token e o Chat ID para usar o Telegram.', 'error');
    return;
  }

  // Auto-salva a config para não perder se esquecer de clicar em Salvar
  if (!state.configuracoes) state.configuracoes = {};
  state.configuracoes.telegramToken = token;
  state.configuracoes.telegramChatId = chatId;
  saveConfigV2('configuracoes', state.configuracoes);
  
  showToast('Enviando backup para o Telegram...', 'info');

  fetch('/api/backup/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botToken: token, chatId: chatId })
  })
  .then(async (res) => {
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Backup enviado com sucesso! 🚀', 'success');
    } else {
      showToast('Erro ao enviar: ' + (data.error || 'Falha desconhecida'), 'error');
      console.error(data);
    }
  })
  .catch(err => {
    showToast('Erro de conexão ao enviar backup.', 'error');
    console.error(err);
  });
};

window.desligarSistema = async function() {
  if (!confirm('Deseja realmente desligar o sistema? A janela do terminal será fechada.')) return;
  
  // Tentar enviar agenda de amanhã para o Telegram
  const token = state.configuracoes?.telegramToken;
  const chatId = state.configuracoes?.telegramChatId;
  
  if (token && chatId) {
    try {
      const amanhã = new Date();
      amanhã.setDate(amanhã.getDate() + 1);
      const dataStr = amanhã.toISOString().slice(0, 10);
      const dataBr = `${String(amanhã.getDate()).padStart(2,'0')}/${String(amanhã.getMonth()+1).padStart(2,'0')}`;
      
      const agendamentosAmanha = state.agendamentos
        .filter(a => a.data === dataStr && a.status !== 'concluido')
        .sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
        
      let texto = `📅 <b>Agenda de Amanhã (${dataBr})</b>nn`;
      
      if (agendamentosAmanha.length === 0) {
        texto += `Nenhum agendamento para amanhã. Dia livre! 🏖️`;
      } else {
        agendamentosAmanha.forEach(a => {
          const c = state.clientes.find(cli => cli.id === a.clienteId);
          const srv = state.servicos.find(s => s.id === a.servicoId);
          const nomeCliente = c ? c.nome.split(' ')[0] : 'Cliente';
          const nomePet = c?.pet?.nome || 'Pet';
          const nomeSrv = srv ? srv.nome : 'Serviço';
          texto += `⏰ <b>${a.hora || '--:--'}</b> - ${nomeCliente} (🐾 ${nomePet}) - ${nomeSrv}n`;
        });
      }
      
      await fetch('/api/telegram/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token, chatId: chatId, text: texto })
      });
    } catch (e) {
      console.error('Erro ao enviar agenda pro Telegram', e);
    }
  }

  fetch('/api/shutdown', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:var(--bg);color:var(--text);font-family:Nunito,sans-serif;text-align:center;">
            <div style="font-size:60px;margin-bottom:20px;">😴</div>
            <h1 style="color:var(--teal-light)">Sistema Desligado</h1>
            <p style="color:var(--text-dim);font-size:18px;">O servidor foi encerrado com sucesso.<br/>A agenda de amanhã foi enviada para o seu Telegram.<br/>Você já pode fechar esta aba.</p>
          </div>
        `;
      }
    })
    .catch(() => {
      showToast('Ocorreu um erro, mas o servidor pode já ter desligado.', 'info');
    });
};

// ─── GAMIFICAÇÃO — MOTOR DE RECORDES ──────────────────────────

/** Toca um som de celebração via Web Audio API (sem arquivo externo) */
function playCelebrationSound(level) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = level === 'gold'
      ? [523, 659, 784, 1047]   // Dó-Mi-Sol-Dó (fanfarra)
      : level === 'silver'
        ? [523, 659, 784]        // Dó-Mi-Sol
        : [523, 784];            // Dó-Sol (simples)

    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.13);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.13 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.25);
      osc.start(ctx.currentTime + i * 0.13);
      osc.stop(ctx.currentTime + i * 0.13 + 0.25);
    });
  } catch (e) { /* silencioso se não suportado */ }
}

/** Adiciona partículas ao toast */
function addParticles(toastEl, level) {
  const colors = level === 'gold'
    ? ['#FBBF24','#f97316','#FFF','#FBBF24','#eab308']
    : level === 'silver'
      ? ['#60A5FA','#a78bfa','#FFF','#60A5FA']
      : ['#0ABFA3','#22B8CF','#FFF'];

  const count = level === 'gold' ? 14 : level === 'silver' ? 9 : 5;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = level === 'gold' ? 'cel-confetti' : 'cel-sparkle';
    el.style.cssText = `
      left: ${10 + Math.random() * 80}%;
      top:  ${20 + Math.random() * 50}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      --sx: ${(Math.random() - 0.5) * 60}px;
      animation-delay: ${Math.random() * 0.5}s;
      animation-duration: ${0.9 + Math.random() * 0.6}s;
    `;
    toastEl.appendChild(el);
  }
}

/** Renderiza o Celebration Toast na tela */
function showCelebration(celebracoes) {
  if (!celebracoes || celebracoes.length === 0) return;

  // Determina nível geral (o mais alto entre todas as celebrações do card)
  const nivelMap = { bronze: 1, silver: 2, gold: 3 };
  const nivelRev = ['bronze', 'silver', 'gold'];
  const maxNivel = Math.max(...celebracoes.map(c => nivelMap[c.nivel] || 1)) - 1;
  const nivel = nivelRev[maxNivel];

  const isMultiple = celebracoes.length > 1;
  const duracao = nivel === 'gold' ? 7500 : nivel === 'silver' ? 6500 : 5500;

  // Ícone
  const iconMap = { bronze: '🏅', silver: '🥈', gold: '🏆' };
  const icon = isMultiple ? '🎊' : iconMap[nivel];

  // Label
  const labelMap = { bronze: '✨ Recorde do Dia', silver: '🔥 Recorde da Semana', gold: '🌟 Recorde do Mês' };
  const label = isMultiple ? '🎊 Recordes Simultâneos!' : labelMap[nivel];

  // Mensagens
  const msgs = celebracoes.map(c => {
    const d = c.dados;
    if (c.tipo === 'dia')    return `Dia mais cheio: <span class="cel-highlight">${d.qtd} pets atendidos</span> e <span class="cel-highlight">${fmtMoney(d.receita)}</span>`;
    if (c.tipo === 'semana') return `Semana mais movimentada: <span class="cel-highlight">${d.qtd} atendimentos</span> — <span class="cel-highlight">${fmtMoney(d.receita)}</span>`;
    if (c.tipo === 'mes')    return `Mês histórico: <span class="cel-highlight">${d.qtd} atendimentos</span> e <span class="cel-highlight">${fmtMoney(d.receita)}</span>`;
    if (c.tipo === 'totalPets') return `Marco histórico: <span class="cel-highlight">${d.total} pets</span> já foram atendidos no TransformaCão!`;
    return '';
  }).filter(Boolean);

  // Título
  const titulos = {
    dia:       'O TransformaCão nunca esteve tão cheio!',
    semana:    'Que semana incrível no TransformaCão!',
    mes:       'Mês épico no TransformaCão! 🐾',
    totalPets: 'Marcos que fazem história!'
  };
  const titulo = isMultiple ? 'Dia de celebrar no TransformaCão!' : (titulos[celebracoes[0].tipo] || 'Recorde batido!');

  const container = document.getElementById('celebration-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `celebration-toast ${nivel}`;
  toast.innerHTML = `
    ${isMultiple ? `<div class="cel-multi-badge">⚡ ${celebracoes.length} recordes ao mesmo tempo!</div>` : ''}
    <button class="cel-close-btn" title="Fechar (Esc)">✕</button>
    <div class="cel-body">
      <span class="cel-icon">${icon}</span>
      <div class="cel-content">
        <div class="cel-label">${label}</div>
        <div class="cel-title">${titulo}</div>
        ${msgs.map(m => `<div class="cel-desc">${m}</div>`).join('')}
      </div>
    </div>
  `;

  // Fechar pelo botão ✕
  const closeBtn = toast.querySelector('.cel-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissCelebrationToast(toast, escHandler);
  });

  // Fechar pelo ESC
  function escHandler(e) {
    if (e.key === 'Escape') dismissCelebrationToast(toast, escHandler);
  }
  document.addEventListener('keydown', escHandler);

  container.appendChild(toast);

  // Partículas
  requestAnimationFrame(() => addParticles(toast, nivel));

  // Som
  playCelebrationSound(nivel);
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('hiding')) return;
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 400);
}

function dismissCelebrationToast(toast, escHandler) {
  if (!toast || toast.classList.contains('hiding')) return;
  if (escHandler) document.removeEventListener('keydown', escHandler);
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 400);
}

/** Retorna a string da semana ISO de dias úteis: "YYYY-Www" */
function getWeekKey(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  // Semana contada como Seg-Sex; usamos ISO week
  const tmp = new Date(d);
  tmp.setHours(12, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const week = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

/** Retorna o início (Seg) e fim (Sex) da semana de uma data */
function getWeekBounds(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const day = d.getDay() || 7; // 1=Seg, 7=Dom
  const mon = new Date(d); mon.setDate(d.getDate() - (day - 1));
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const fmt2 = (dt) => dt.toISOString().slice(0, 10);
  return { inicio: fmt2(mon), fim: fmt2(fri) };
}

/** Checa recordes de DIA e dispara celebração imediata se bateu */
function checkDayRecord(dataAgendamento) {
  if (!state.recordes) return;
  const r = state.recordes;

  // Conta agendamentos concluídos neste dia
  const qtd = state.agendamentos.filter(a => a.data === dataAgendamento && a.status === 'concluido').length;
  const receita = state.agendamentos
    .filter(a => a.data === dataAgendamento && a.status === 'concluido')
    .reduce((s, a) => {
      const srv = state.servicos.find(sv => sv.id === a.servicoId);
      return s + (srv ? Number(srv.preco) : 0);
    }, 0);

  const prev = r.melhorDia;
  const bateuRecorde = qtd > (prev.qtd || 0) || (qtd === (prev.qtd || 0) && qtd > 0 && receita > (prev.receita || 0));
  if (!bateuRecorde) return;

  r.melhorDia = { data: dataAgendamento, qtd, receita };
  saveConfigV2('recordes', state.recordes);

  showCelebration([{ tipo: 'dia', dados: { qtd, receita }, nivel: 'bronze' }]);
}

/** Checa recordes de SEMANA e MÊS — chamado ao abrir o sistema */
function checkPeriodicRecords() {
  if (!state.recordes) return;
  const r = state.recordes;
  const todayStr = today();
  const celebrations = [];

  // ── SEMANA (Seg-Sex, apenas dias úteis) ──
  const currentWeekKey = getWeekKey(todayStr);
  if (r.ultimoCheckSemana !== currentWeekKey) {
    // Pega a semana ANTERIOR (a que acabou)
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() - 7); // semana passada
    const { inicio, fim } = getWeekBounds(d.toISOString().slice(0, 10));

    const agsSemana = state.agendamentos.filter(
      a => a.data >= inicio && a.data <= fim && a.status === 'concluido'
    );
    const qtdSemana = agsSemana.length;
    const receitaSemana = agsSemana.reduce((s, a) => {
      const srv = state.servicos.find(sv => sv.id === a.servicoId);
      return s + (srv ? Number(srv.preco) : 0);
    }, 0);

    if (qtdSemana > 0) {
      const prev = r.melhorSemana;
      const bateu = qtdSemana > (prev.qtd || 0) || (qtdSemana === (prev.qtd || 0) && receitaSemana > (prev.receita || 0));
      if (bateu) {
        r.melhorSemana = { inicio, qtd: qtdSemana, receita: receitaSemana };
        celebrations.push({ tipo: 'semana', dados: { qtd: qtdSemana, receita: receitaSemana }, nivel: 'silver' });
      }
    }
    r.ultimoCheckSemana = currentWeekKey;
  }

  // ── MÊS ──
  const d2 = new Date(todayStr + 'T12:00:00');
  d2.setDate(0); // último dia do mês anterior
  const prevMesKey = d2.toISOString().slice(0, 7);
  if (r.ultimoCheckMes !== prevMesKey) {
    const agsMes = state.agendamentos.filter(
      a => a.data && a.data.startsWith(prevMesKey) && a.status === 'concluido'
    );
    const qtdMes = agsMes.length;
    const receitaMes = agsMes.reduce((s, a) => {
      const srv = state.servicos.find(sv => sv.id === a.servicoId);
      return s + (srv ? Number(srv.preco) : 0);
    }, 0);

    if (qtdMes > 0) {
      const prev = r.melhorMes;
      const bateu = qtdMes > (prev.qtd || 0) || (qtdMes === (prev.qtd || 0) && receitaMes > (prev.receita || 0));
      if (bateu) {
        r.melhorMes = { mes: prevMesKey, qtd: qtdMes, receita: receitaMes };
        celebrations.push({ tipo: 'mes', dados: { qtd: qtdMes, receita: receitaMes }, nivel: 'gold' });
      }
    }
    r.ultimoCheckMes = prevMesKey;
  }

  // ── MARCO TOTAL DE PETS ──
  const totalConcluidos = state.agendamentos.filter(a => a.status === 'concluido').length;
  const marcos = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
  const prevTotal = r.totalPets || 0;
  for (const marco of marcos) {
    if (totalConcluidos >= marco && prevTotal < marco) {
      celebrations.push({ tipo: 'totalPets', dados: { total: marco }, nivel: 'gold' });
      r.totalPets = totalConcluidos;
      break;
    }
  }

  if (celebrations.length > 0) {
    saveConfigV2('recordes', state.recordes);
    showCelebration(celebrations);
  }
}

/** Renderiza o Hall da Fama (bloco discreto no Dashboard, só com dados) */
function renderHallFama() {
  const r = state.recordes;
  if (!r) return '';

  const hasDia    = r.melhorDia?.qtd > 0;
  const hasSemana = r.melhorSemana?.qtd > 0;
  const hasMes    = r.melhorMes?.qtd > 0;

  if (!hasDia && !hasSemana && !hasMes) return ''; // Sem dados → não exibe

  return `
    <div class="hall-fama-card mb-3">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:16px;">🏆</span>
        <div style="font-family:'Nunito',sans-serif;font-size:12px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Hall da Fama</div>
      </div>
      ${hasDia ? `
      <div class="hall-fama-item">
        <div class="hall-fama-icon">🏅</div>
        <div class="hall-fama-label">Melhor dia</div>
        <div class="hall-fama-value">${r.melhorDia.qtd} pets · ${fmtMoney(r.melhorDia.receita)}</div>
        <div class="hall-fama-date">${r.melhorDia.data ? fmt(r.melhorDia.data) : ''}</div>
      </div>` : ''}
      ${hasSemana ? `
      <div class="hall-fama-item">
        <div class="hall-fama-icon">🔥</div>
        <div class="hall-fama-label">Melhor semana</div>
        <div class="hall-fama-value">${r.melhorSemana.qtd} pets · ${fmtMoney(r.melhorSemana.receita)}</div>
        <div class="hall-fama-date">${r.melhorSemana.inicio ? fmt(r.melhorSemana.inicio) : ''}</div>
      </div>` : ''}
      ${hasMes ? `
      <div class="hall-fama-item">
        <div class="hall-fama-icon">🌟</div>
        <div class="hall-fama-label">Melhor mês</div>
        <div class="hall-fama-value">${r.melhorMes.qtd} pets · ${fmtMoney(r.melhorMes.receita)}</div>
        <div class="hall-fama-date">${r.melhorMes.mes ? r.melhorMes.mes.split('-').reverse().join('/') : ''}</div>
      </div>` : ''}
    </div>
  `;
}

/** Reseta apenas os recordes (sem apagar dados de clientes/agendamentos) */
window.resetarRecordes = function() {
  if (!confirm('Isso vai zerar todos os recordes de Hall da Fama. Clientes e agendamentos não serão afetados. Continuar?')) return;
  state.recordes = defaultDB().recordes;
  saveConfigV2('recordes', state.recordes);
  document.getElementById('modal-overlay').classList.remove('open');
  showToast('Recordes zerados com sucesso! ✅', 'success');
};

// ─── INIT ─────────────────────────────────────────────────────
async function init() {
  updateSidebarDate();
  
  // Load data from server/SQLite
  state = await loadDB();
  
  // If it's a fresh database, seed it with demo data
  if (state.clientes.length === 0) {
    seedDemoData();
  }
  
  updateFilaBadge();
  navigate('dashboard');

  // ── Gamificação: checa recordes de semana/mês ao abrir ──
  // Pequeno delay para a UI estar pronta antes de exibir o toast
  setTimeout(() => checkPeriodicRecords(), 1200);

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.getElementById('modal-overlay').classList.remove('open');
  });

  // Lógica PWA: Voltar abas e Modal
  const overlay = document.getElementById('modal-overlay');
  
  if (!window.history.state?.page) {
    history.replaceState({ page: 'dashboard' }, '', '#dashboard');
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isOpen = overlay.classList.contains('open');
        if (isOpen && window.location.hash !== '#modal') {
          history.pushState({ modal: true, page: currentPage }, '', '#modal');
        } else if (!isOpen && window.location.hash === '#modal' && window.history.state?.modal) {
          history.back();
        }
      }
    });
  });
  if (overlay) observer.observe(overlay, { attributes: true });

  window.addEventListener('popstate', (e) => {
    if (overlay && overlay.classList.contains('open') && window.location.hash !== '#modal') {
      overlay.classList.remove('open');
    }
    
    if (e.state && e.state.page && e.state.page !== currentPage) {
      navigate(e.state.page, true);
    } else if (!e.state) {
      if (window.exitTimeout) {
        history.back();
      } else {
        showToast('Pressione voltar novamente para sair', 'info');
        history.pushState({ page: currentPage }, '', `#${currentPage}`);
        window.exitTimeout = setTimeout(() => {
          window.exitTimeout = null;
        }, 2000);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

// ── EXPERIÊNCIA DO OPERADOR: Busca Global ──
window.handleGlobalSearch = function(event) {
  const query = event.target.value.toLowerCase().trim();
  const resultsContainer = document.getElementById('global-search-results');
  
  if (!query || query.length < 2) {
    resultsContainer.classList.remove('active');
    return;
  }

  const results = state.clientes.filter(c => {
    const nomePet = (c.pet?.nome || '').toLowerCase();
    const nomeTutor = (c.nome || '').toLowerCase();
    const telefone = (c.telefone || '');
    return nomePet.includes(query) || nomeTutor.includes(query) || telefone.includes(query);
  }).slice(0, 5); // Limita a 5 resultados

  if (results.length === 0) {
    resultsContainer.innerHTML = `<div class="search-result-item"><span class="sr-tutor">Nenhum resultado</span></div>`;
  } else {
    resultsContainer.innerHTML = results.map(c => `
      <div class="search-result-item" onclick="openClienteFromSearch('${c.id}')">
        <span class="sr-pet">🐾 ${c.pet?.nome || 'Sem pet'}</span>
        <span class="sr-tutor">👤 ${c.nome} ${c.telefone ? '• '+c.telefone : ''}</span>
      </div>
    `).join('');
  }
  resultsContainer.classList.add('active');
};

window.openClienteFromSearch = function(id) {
  document.getElementById('global-search-input').value = '';
  document.getElementById('global-search-results').classList.remove('active');
  openClienteDetalhe(id);
};

// Esconder busca ao clicar fora
document.addEventListener('click', (e) => {
  const container = document.querySelector('.global-search-container');
  if (container && !container.contains(e.target)) {
    document.getElementById('global-search-results')?.classList.remove('active');
  }
});
