import re
with open('app.js','r',encoding='utf-8') as f:
  d = f.read()

bad_str = '<button class="btn btn-icon btn-sm" disabled style="margin-left:12px; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.1); cursor:not-allowed; opacity:0.7;" title="Gerado automático. Para remover, exclua o agendamento respectivo.">🔒</button><span style="color:#f87171; font-weight:600; flex-shrink:0; margin-left:10px;">'
good_str = '<span style="color:#f87171; font-weight:600; flex-shrink:0; margin-left:10px;">'

d = d.replace(bad_str, good_str)

# Now apply the correct change for line 3701
d = d.replace('<span style="margin-left:12px;font-size:10px;color:var(--text-muted);white-space:nowrap;" title="Gerado por agendamento. Para remover, exclua o agendamento.">🔒 auto</span>', '<button class="btn btn-icon btn-sm" disabled style="margin-left:12px; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.1); cursor:not-allowed; opacity:0.7;" title="Receita automática de um serviço concluído. Para remover este valor do caixa, exclua o agendamento.">🔒</button>')

with open('app.js','w',encoding='utf-8') as f:
  f.write(d)
