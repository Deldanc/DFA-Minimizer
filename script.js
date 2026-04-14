// ─────────────────────────────────────────────
//  DFA Minimization Visualizer — script.js
// ─────────────────────────────────────────────

// ─── STATE ───────────────────────────────────
let gStates = [], gAlpha = [], gStart = '', gFinal = new Set();
let gDelta = {}; // gDelta[state][sym] = nextState
let gTable = {}; // key = "X,Y" (X < Y) → { marked, reason, pass }
let gLog = [];

// ─── SAMPLE DATA ─────────────────────────────
const SAMPLE = {
  states: 'A,B,C,D,E,F',
  alpha: '0,1',
  start: 'A',
  final: 'C,D,E',
  delta: {
    A: { '0': 'B', '1': 'C' },
    B: { '0': 'A', '1': 'D' },
    C: { '0': 'E', '1': 'F' },
    D: { '0': 'E', '1': 'F' },
    E: { '0': 'E', '1': 'F' },
    F: { '0': 'F', '1': 'F' }
  }
};

function loadSample() {
  document.getElementById('inp-states').value = SAMPLE.states;
  document.getElementById('inp-alpha').value = SAMPLE.alpha;
  document.getElementById('inp-start').value = SAMPLE.start;
  document.getElementById('inp-final').value = SAMPLE.final;
  gStates = SAMPLE.states.split(',').map(s => s.trim());
  gAlpha = SAMPLE.alpha.split(',').map(s => s.trim());
  gFinal = new Set(SAMPLE.final.split(',').map(s => s.trim()));
  rebuildTransTable();
  const tbody = document.getElementById('trans-body');
  gStates.forEach(st => {
    const row = tbody.querySelector(`tr[data-state="${st}"]`);
    if (!row) return;
    gAlpha.forEach(sym => {
      const inp = row.querySelector(`input[data-sym="${sym}"]`);
      if (inp) inp.value = SAMPLE.delta[st]?.[sym] || '';
    });
  });
}

function clearAll() {
  ['inp-states', 'inp-alpha', 'inp-start', 'inp-final'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('trans-head').innerHTML = '';
  document.getElementById('trans-body').innerHTML = '';
  document.getElementById('results').style.display = 'none';
  hideError();
}

// ─── TRANSITION TABLE BUILD ───────────────────
function rebuildTransTable() {
  gStates = document.getElementById('inp-states').value.split(',').map(s => s.trim()).filter(Boolean);
  gAlpha = document.getElementById('inp-alpha').value.split(',').map(s => s.trim()).filter(Boolean);
  const thead = document.getElementById('trans-head');
  const tbody = document.getElementById('trans-body');

  const oldVals = {};
  tbody.querySelectorAll('tr').forEach(tr => {
    const st = tr.dataset.state;
    oldVals[st] = {};
    tr.querySelectorAll('input').forEach(inp => {
      oldVals[st][inp.dataset.sym] = inp.value;
    });
  });

  thead.innerHTML = '<th>State</th>' + gAlpha.map(s => `<th>δ(${s})</th>`).join('');
  tbody.innerHTML = '';
  gStates.forEach(st => {
    const tr = document.createElement('tr');
    tr.dataset.state = st;
    tr.innerHTML = `<td>${st}</td>` + gAlpha.map(sym =>
      `<td><input type="text" data-sym="${sym}" value="${(oldVals[st]?.[sym]) || ''}" placeholder="—"></td>`
    ).join('');
    tbody.appendChild(tr);
  });
}

document.getElementById('inp-states').addEventListener('input', rebuildTransTable);
document.getElementById('inp-alpha').addEventListener('input', rebuildTransTable);

// ─── READ TRANSITIONS ─────────────────────────
function readDelta() {
  gDelta = {};
  gStates.forEach(st => { gDelta[st] = {}; });
  document.getElementById('trans-body').querySelectorAll('tr').forEach(tr => {
    const st = tr.dataset.state;
    tr.querySelectorAll('input').forEach(inp => {
      const v = inp.value.trim();
      if (v) gDelta[st][inp.dataset.sym] = v;
    });
  });
}

// ─── UTILITIES ────────────────────────────────
function pairKey(a, b) { return [a, b].sort().join(','); }
function showError(msg) {
  const el = document.getElementById('error-box');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}
function hideError() { document.getElementById('error-box').style.display = 'none'; }

// ─── TABLE FILLING ALGORITHM ──────────────────
function runMinimization() {
  hideError();
  gStates = document.getElementById('inp-states').value.split(',').map(s => s.trim()).filter(Boolean);
  gAlpha = document.getElementById('inp-alpha').value.split(',').map(s => s.trim()).filter(Boolean);
  gStart = document.getElementById('inp-start').value.trim();
  gFinal = new Set(document.getElementById('inp-final').value.split(',').map(s => s.trim()).filter(Boolean));

  if (gStates.length < 2) { showError('Need at least 2 states.'); return; }
  if (gAlpha.length < 1) { showError('Need at least 1 symbol.'); return; }
  if (!gStates.includes(gStart)) { showError(`Start state "${gStart}" not in states list.`); return; }
  for (const f of gFinal) {
    if (!gStates.includes(f)) { showError(`Final state "${f}" not in states list.`); return; }
  }

  readDelta();
  gTable = {};
  gLog = [];

  // Generate all pairs (i < j by index)
  for (let i = 0; i < gStates.length; i++) {
    for (let j = i + 1; j < gStates.length; j++) {
      const k = pairKey(gStates[i], gStates[j]);
      gTable[k] = { marked: false, reason: [], pass: -1 };
    }
  }

  // Pass 0: mark (final, non-final) pairs
  gLog.push({ type: 'pass', pass: 0, msg: 'Pass 0 — Mark (final, non-final) pairs' });
  for (const k of Object.keys(gTable)) {
    const [a, b] = k.split(',');
    const aF = gFinal.has(a), bF = gFinal.has(b);
    if (aF !== bF) {
      const reason = {
        label: 'Base Case',
        text: `One of {${a}, ${b}} is a final state and the other is not.\n→ ${a} is ${aF ? '' : 'NOT '}final, ${b} is ${bF ? '' : 'NOT '}final.`
      };
      gTable[k].marked = true;
      gTable[k].pass = 0;
      gTable[k].reason = [reason];
      gLog.push({ type: 'mark', pair: k, pass: 0, reason });
    }
  }

  // Iterative passes
  let changed = true, passNum = 1;
  while (changed) {
    changed = false;
    gLog.push({ type: 'pass', pass: passNum, msg: `Pass ${passNum} — Propagate marks` });
    for (const k of Object.keys(gTable)) {
      if (gTable[k].marked) continue;
      const [a, b] = k.split(',');
      for (const sym of gAlpha) {
        const da = gDelta[a]?.[sym], db = gDelta[b]?.[sym];
        if (!da || !db || da === db) continue;
        const pk = pairKey(da, db);
        if (gTable[pk] && gTable[pk].marked) {
          const reason = {
            label: `Pass ${passNum} — Symbol '${sym}'`,
            text: `δ(${a}, ${sym}) = ${da}, δ(${b}, ${sym}) = ${db}\nPair {${da}, ${db}} is already marked.\n→ So {${a}, ${b}} must also be distinguishable.`
          };
          gTable[k].marked = true;
          gTable[k].pass = passNum;
          gTable[k].reason = [...(gTable[k].reason || []), reason];
          gLog.push({ type: 'mark', pair: k, pass: passNum, reason });
          changed = true;
          break;
        }
      }
    }
    passNum++;
    if (passNum > 20) break;
  }

  // Label unmarked (indistinguishable)
  for (const k of Object.keys(gTable)) {
    if (!gTable[k].marked) {
      const [a, b] = k.split(',');
      gTable[k].reason = [{
        label: 'Indistinguishable',
        text: `After all passes, no input sequence distinguishes ${a} from ${b}.\nThey behave identically for all inputs → can be merged.`
      }];
      gLog.push({ type: 'merge', pair: k });
    }
  }

  renderResults();
}

// ─── RENDER RESULTS ───────────────────────────
function renderResults() {
  document.getElementById('results').style.display = 'block';
  renderFillTable();
  renderLog();
  renderEquivClasses();
  renderDiagrams();
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function renderFillTable() {
  const table = document.getElementById('fill-table');
  const n = gStates.length;
  let html = '<thead><tr><th></th>';
  for (let j = 0; j < n - 1; j++) html += `<th>${gStates[j]}</th>`;
  html += '</tr></thead><tbody>';

  for (let i = 1; i < n; i++) {
    html += `<tr><td class="row-header">${gStates[i]}</td>`;
    for (let j = 0; j < n - 1; j++) {
      if (j >= i) {
        html += `<td class="cell-diag">—</td>`;
      } else {
        const k = pairKey(gStates[i], gStates[j]);
        const info = gTable[k];
        if (info.marked) {
          html += `<td class="cell-marked" title="Click for details" onclick="showPairInfo('${k}')">✗</td>`;
        } else {
          html += `<td class="cell-unmarked" onclick="showPairInfo('${k}')">✓</td>`;
        }
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;

  const total = Object.keys(gTable).length;
  const marked = Object.values(gTable).filter(v => v.marked).length;
  document.getElementById('stat-row').innerHTML = `
    <div class="stat">Total pairs: <span>${total}</span></div>
    <div class="stat">Marked ✗: <span style="color:var(--marked)">${marked}</span></div>
    <div class="stat">Unmarked ✓: <span style="color:var(--unmarked)">${total - marked}</span></div>
  `;
}

function renderLog() {
  const el = document.getElementById('steps-log');
  let html = '', stepN = 0;
  for (const entry of gLog) {
    if (entry.type === 'pass') {
      html += `<div class="log-entry"><span class="pass-label">── ${entry.msg} ──</span></div>`;
    } else if (entry.type === 'mark') {
      stepN++;
      html += `<div class="log-entry"><span class="step-num">[${stepN}]</span> <span class="mark-action">MARK {${entry.pair}}</span> — ${entry.reason.label}</div>`;
    } else if (entry.type === 'merge') {
      html += `<div class="log-entry"><span class="merge-action">EQUIV {${entry.pair}}</span> — indistinguishable</div>`;
    }
  }
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

function renderEquivClasses() {
  const parent = {};
  gStates.forEach(s => parent[s] = s);
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(x, y) { parent[find(x)] = find(y); }

  for (const [k, v] of Object.entries(gTable)) {
    if (!v.marked) {
      const [a, b] = k.split(',');
      union(a, b);
    }
  }

  const classes = {};
  gStates.forEach(s => {
    const root = find(s);
    if (!classes[root]) classes[root] = [];
    classes[root].push(s);
  });

  const wrap = document.getElementById('equiv-wrap');
  const colorPalette = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
  let html = '', cIdx = 0;
  for (const [, members] of Object.entries(classes)) {
    const col = colorPalette[cIdx % colorPalette.length];
    html += `<div class="equiv-class" style="border-color:${col}40">
      <span class="class-id" style="color:${col}">Q${cIdx}</span>{${members.join(', ')}}
    </div>`;
    cIdx++;
  }
  wrap.innerHTML = html;
  return classes;
}

// ─── DFA DIAGRAM RENDERING ────────────────────
function renderDiagrams() {
  const { minStates, minDelta, minStart, minFinal } = buildMinDFA();
  drawDFA(document.getElementById('svg-orig'), gStates, gAlpha, gDelta, gStart, gFinal, null);
  drawDFA(document.getElementById('svg-min'), minStates, gAlpha, minDelta, minStart, minFinal, null);
}

function buildMinDFA() {
  const parent = {};
  gStates.forEach(s => parent[s] = s);
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(x, y) { parent[find(x)] = find(y); }

  for (const [k, v] of Object.entries(gTable)) {
    if (!v.marked) {
      const [a, b] = k.split(',');
      union(a, b);
    }
  }

  const classMap = {};
  gStates.forEach(s => {
    const r = find(s);
    if (!classMap[r]) classMap[r] = [];
    classMap[r].push(s);
  });

  const stateMap = {};
  for (const [, members] of Object.entries(classMap)) {
    const name = members.sort().join('/');
    members.forEach(m => stateMap[m] = name);
  }

  const minStates = [...new Set(Object.values(stateMap))];
  const minStart = stateMap[gStart];
  const minFinal = new Set([...gFinal].map(f => stateMap[f]));
  const minDelta = {};
  minStates.forEach(ms => { minDelta[ms] = {}; });

  for (const st of gStates) {
    const ms = stateMap[st];
    for (const sym of gAlpha) {
      const nxt = gDelta[st]?.[sym];
      if (nxt && stateMap[nxt]) minDelta[ms][sym] = stateMap[nxt];
    }
  }

  return { stateMap, minStates, minDelta, minStart, minFinal };
}

function drawDFA(svgEl, states, alpha, delta, startState, finalStates) {
  svgEl.innerHTML = '';
  const W = svgEl.clientWidth || 560;
  const H = 460;
  const cx = W / 2, cy = H / 2;
  const n = states.length;
  const r = Math.min(cx - 80, cy - 80, 170);
  const nodeR = 26;
  const pos = {};

  if (n === 1) {
    pos[states[0]] = { x: cx, y: cy };
  } else {
    states.forEach((s, i) => {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2;
      pos[s] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }

  const uid = svgEl.id;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <marker id="arrow-${uid}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/>
    </marker>
    <marker id="arrow-start-${uid}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#10b981"/>
    </marker>
  `;
  svgEl.appendChild(defs);

  // Group edges
  const edgeMap = {};
  states.forEach(st => {
    alpha.forEach(sym => {
      const nxt = delta[st]?.[sym];
      if (!nxt) return;
      const key = `${st}→${nxt}`;
      if (!edgeMap[key]) edgeMap[key] = { from: st, to: nxt, syms: [] };
      edgeMap[key].syms.push(sym);
    });
  });

  // Draw edges
  for (const [, edge] of Object.entries(edgeMap)) {
    const { from, to, syms } = edge;
    const p1 = pos[from], p2 = pos[to];
    if (!p1 || !p2) continue;
    const label = syms.join(', ');

    if (from === to) {
      const lx = p1.x, ly = p1.y - nodeR;
      const cr = nodeR * 1.4;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${lx-cr*0.6},${ly} C${lx-cr},${ly-cr*1.5} ${lx+cr},${ly-cr*1.5} ${lx+cr*0.6},${ly}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#475569');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('marker-end', `url(#arrow-${uid})`);
      svgEl.appendChild(path);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly - cr * 1.2);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#94a3b8');
      txt.setAttribute('font-size', '11');
      txt.setAttribute('font-family', 'JetBrains Mono, monospace');
      txt.textContent = label;
      svgEl.appendChild(txt);
    } else {
      const revKey = `${to}→${from}`;
      const hasCurve = edgeMap[revKey] !== undefined;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const ux = dx/dist, uy = dy/dist;
      const px = -uy, py = ux;
      const curve = hasCurve ? 30 : 0;
      const mx = (p1.x+p2.x)/2 + px*curve;
      const my = (p1.y+p2.y)/2 + py*curve;
      const startX = p1.x + ux*nodeR, startY = p1.y + uy*nodeR;
      const endX = p2.x - ux*nodeR, endY = p2.y - uy*nodeR;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${startX},${startY} Q${mx},${my} ${endX},${endY}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#475569');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('marker-end', `url(#arrow-${uid})`);
      svgEl.appendChild(path);

      const lx = (startX + mx*2 + endX)/4;
      const ly = (startY + my*2 + endY)/4;
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly - 6);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#94a3b8');
      txt.setAttribute('font-size', '11');
      txt.setAttribute('font-family', 'JetBrains Mono, monospace');
      txt.textContent = label;
      svgEl.appendChild(txt);
    }
  }

  // Start arrow
  if (pos[startState]) {
    const p = pos[startState];
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    arrow.setAttribute('x1', p.x - nodeR*2.2); arrow.setAttribute('y1', p.y);
    arrow.setAttribute('x2', p.x - nodeR);   arrow.setAttribute('y2', p.y);
    arrow.setAttribute('stroke', '#10b981');
    arrow.setAttribute('stroke-width', '2');
    arrow.setAttribute('marker-end', `url(#arrow-start-${uid})`);
    svgEl.appendChild(arrow);
  }

  // Draw nodes
  states.forEach(st => {
    if (!pos[st]) return;
    const { x, y } = pos[st];
    const isFinal = finalStates.has(st);
    const isStart = st === startState;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    if (isFinal) {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', x); glow.setAttribute('cy', y); glow.setAttribute('r', nodeR+5);
      glow.setAttribute('fill', 'none'); glow.setAttribute('stroke', '#f59e0b');
      glow.setAttribute('stroke-width', '2'); glow.setAttribute('opacity', '0.4');
      g.appendChild(glow);

      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('cx', x); outer.setAttribute('cy', y); outer.setAttribute('r', nodeR+5);
      outer.setAttribute('fill', 'none'); outer.setAttribute('stroke', '#f59e0b');
      outer.setAttribute('stroke-width', '1.5');
      g.appendChild(outer);
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y); circle.setAttribute('r', nodeR);
    circle.setAttribute('fill', isStart ? 'rgba(16,185,129,0.15)' : (isFinal ? 'rgba(245,158,11,0.12)' : 'rgba(30,45,69,0.9)'));
    circle.setAttribute('stroke', isStart ? '#10b981' : (isFinal ? '#f59e0b' : '#00d4ff'));
    circle.setAttribute('stroke-width', isStart ? '2.5' : '1.5');
    g.appendChild(circle);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', x); txt.setAttribute('y', y+5);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', '#e2e8f0');
    txt.setAttribute('font-size', st.length > 3 ? '9' : '13');
    txt.setAttribute('font-weight', '700');
    txt.setAttribute('font-family', 'JetBrains Mono, monospace');
    txt.textContent = st;
    g.appendChild(txt);
    svgEl.appendChild(g);
  });

  // Legend
  const legG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  legG.setAttribute('transform', `translate(8, ${H - 60})`);
  legG.innerHTML = `
    <circle cx="10" cy="8" r="7" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="2"/>
    <text x="22" y="13" fill="#94a3b8" font-size="10" font-family="JetBrains Mono, monospace">Start</text>
    <circle cx="10" cy="28" r="7" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" stroke-width="1.5"/>
    <circle cx="10" cy="28" r="11" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.4"/>
    <text x="26" y="33" fill="#94a3b8" font-size="10" font-family="JetBrains Mono, monospace">Final</text>
  `;
  svgEl.appendChild(legG);
}

// ─── MODAL ────────────────────────────────────
function showPairInfo(key) {
  const info = gTable[key];
  if (!info) return;
  const [a, b] = key.split(',');
  const isMarked = info.marked;

  document.getElementById('modal-title').textContent = isMarked ? '✗ Distinguishable Pair' : '✓ Indistinguishable Pair';
  document.getElementById('modal-title').className = isMarked ? 'is-marked' : 'is-unmarked';
  document.getElementById('modal-pair').textContent = `{ ${a}, ${b} }`;

  let html = '';
  info.reason.forEach(r => {
    html += `<div class="reason-step">
      <div class="reason-label">${r.label}</div>
      <div>${r.text.replace(/\n/g, '<br>')}</div>
    </div>`;
  });

  if (!isMarked) {
    html += `<div class="reason-step">
      <div class="reason-label" style="color:var(--unmarked)">Result</div>
      <div style="color:var(--unmarked)">These states can be <strong>merged</strong> in the minimized DFA.</div>
    </div>`;
  } else {
    html += `<div class="reason-step">
      <div class="reason-label" style="color:var(--marked)">Result</div>
      <div style="color:var(--marked)">These states are <strong>distinguishable</strong> — must remain separate.</div>
    </div>`;
    if (info.pass >= 0) {
      html += `<div class="reason-step">
        <div class="reason-label">Marked in Pass</div>
        <div>Pass <strong>${info.pass}</strong> of the table-filling algorithm</div>
      </div>`;
    }
  }

  document.getElementById('modal-reason').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('show');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalDirect();
});

// ─── INIT ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  rebuildTransTable();
  loadSample();
});
