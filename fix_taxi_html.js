const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const bad = `      }
      #taxi-dog-modal-wrap #taxi-valor {
        flex:1; border:none; background:transparent; padding:10px 12px;
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
            <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-1l-2.5 -4.5a1 1 0 0 0 -.86 -.5h-1.64"/>
            <path d="M15 6l0 4.5"/>
          </svg>
        </div>`;

const good = `      }
      #taxi-dog-modal-wrap .taxi-info .taxi-icon {
        width:36px; height:36px; border-radius:50%;
        background:rgba(224,64,160,0.15); border:1px solid rgba(224,64,160,0.3);
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      #taxi-dog-modal-wrap .taxi-info .taxi-pet { font-size:14px; font-weight:700; color:var(--text); }
      #taxi-dog-modal-wrap .taxi-info .taxi-tutor { font-size:12px; color:var(--text-muted); margin-top:2px; }
      #taxi-dog-modal-wrap .taxi-label { font-size:13px; color:var(--text-muted); font-weight:600; }
      #taxi-dog-modal-wrap .taxi-valor-wrap {
        display:flex; align-items:center; gap:0;
        border:1px solid var(--border); border-radius:8px; overflow:hidden;
        background:var(--surface);
      }
      #taxi-dog-modal-wrap .taxi-prefix {
        padding:10px 12px; font-size:14px; font-weight:700;
        color:var(--text-muted); background:rgba(255,255,255,0.03);
        border-right:1px solid var(--border);
      }
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
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
            <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6a1 1 0 0 0 -1 -1h-1l-2.5 -4.5a1 1 0 0 0 -.86 -.5h-1.64"/>
            <path d="M15 6l0 4.5"/>
          </svg>
        </div>`;

if (code.includes(bad)) {
  code = code.replace(bad, good);
  fs.writeFileSync('app.js', code, 'utf8');
  console.log('Fixed taxi dog HTML!');
} else {
  console.log('Could not find the bad chunk. Searching via regex...');
  
  // Just in case carriage returns are messing it up, let's normalize
  const normalizedCode = code.replace(/\\r\\n/g, '\\n');
  const normalizedBad = bad.replace(/\\r\\n/g, '\\n');
  
  if (normalizedCode.includes(normalizedBad)) {
    code = normalizedCode.replace(normalizedBad, good.replace(/\\r\\n/g, '\\n'));
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('Fixed taxi dog HTML (with CRLF normalization)!');
  } else {
    console.log('Still not found. Need exact line splicing.');
  }
}
