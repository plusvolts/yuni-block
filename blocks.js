/* 윤이 블록 — 블록 엔진: 프로그램 표현, 블록판(끌어다 붙이기), 무대 실행 (의존성 없음, CREQ-52·54) */
window.BLOCKS = (() => {
  'use strict';
  const C = window.CONTENT; const B = C.blocks; const W = C.W, H = C.H;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 프로그램: 문자열 ↔ 노드 ('right:3', 'repeat:3[right:1,up:1]', 'say:🎉') ---------- */
  function parse(s) {
    s = String(s).trim();
    const m = s.match(/^([a-z]+)(?::([^\[]*))?(?:\[(.*)\])?$/u);
    if (!m) return null;
    const t = m[1]; if (!B[t]) return null;
    const node = { t };
    if (B[t].n) node.n = Math.max(1, Math.min(5, parseInt(m[2], 10) || 1));
    if (t === 'say') node.v = (m[2] || '💬').trim() || '💬';
    if (B[t].c) node.body = m[3] ? splitTop(m[3]).map(parse).filter(Boolean) : [];
    return node;
  }
  function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '[') d++; if (ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }
  const parseProg = arr => (arr || []).map(parse).filter(Boolean);
  const toStr = nodes => nodes.map(n => n.t + (n.n ? ':' + n.n : '') + (n.v ? ':' + n.v : '') + (n.body ? '[' + toStr(n.body) + ']' : '')).join(',');
  const clone = nodes => JSON.parse(JSON.stringify(nodes));
  const countBlocks = nodes => nodes.reduce((s, n) => s + 1 + (n.body ? countBlocks(n.body) : 0), 0);
  const typesIn = nodes => { const out = new Set(); (function walk(ns) { for (const n of ns) { out.add(n.t); if (n.body) walk(n.body); } })(nodes); return out; };
  const isHat = t => B[t] && B[t].cat === 'start';
  const hatOf = nodes => (nodes[0] && isHat(nodes[0].t) ? nodes[0].t : null);
  const bodyOf = nodes => (hatOf(nodes) ? nodes.slice(1) : nodes);
  // 두 프로그램이 같은가 (따라 놓기 판정)
  const normalize = nodes => { const out = []; for (const n of nodes) { const p = out[out.length - 1]; if (p && p.t === n.t && n.n && !n.body && ['right', 'left', 'up', 'down', 'wait'].includes(n.t)) p.n += n.n; else out.push({ ...n, body: n.body ? normalize(n.body) : undefined }); } return out.map(n => { if (n.body === undefined) delete n.body; return n; }); };
  const same = (a, b) => toStr(normalize(clone(a))) === toStr(normalize(clone(b)));

  /* ---------- 블록 그리기 ---------- */
  const SAY_EMO = ['💬', '🎉', '❤️', '😊', '⭐', '🔥', '👋', '🍎'];
  function blockHtml(n, path, opts = {}) {
    const d = B[n.t]; const cls = `blk ${d.cat}${d.c ? ' c' : ''}${isHat(n.t) ? ' hat' : ''}${opts.ghost ? ' ghost' : ''}`;
    const num = d.n ? `<button class="num" data-num="${path}" aria-label="숫자 바꾸기">${n.n}</button>` : '';
    const val = n.t === 'say' ? `<button class="num emo" data-emo="${path}" aria-label="말풍선 바꾸기">${esc(n.v)}</button>` : '';
    if (d.c) return `<div class="${cls}" data-path="${path}" data-t="${n.t}" title="${esc(d.name)}"><span class="ic">${d.icon}</span>${num}<div class="prog-row c-body" data-body="${path}">${(n.body || []).map((x, i) => blockHtml(x, path + '.' + i, opts)).join('')}<span class="c-gap"></span></div><span class="c-end"></span></div>`;
    return `<div class="${cls}" data-path="${path}" data-t="${n.t}" title="${esc(d.name)}"><span class="ic">${d.icon}</span>${num}${val}</div>`;
  }
  const palHtml = t => { const d = B[t]; return `<div class="blk pal ${d.cat}${d.c ? ' c' : ''}${isHat(t) ? ' hat' : ''}" data-pal="${t}" title="${esc(d.name)}"><span class="ic">${d.icon}</span>${d.n ? '<span class="num">1</span>' : ''}${d.c ? '<span class="c-mini"></span>' : ''}</div>`; };

  /* 경로로 노드 찾기 */
  function at(prog, path) { const p = String(path).split('.').map(Number); let list = prog, node = null; for (const i of p) { node = list[i]; if (!node) return null; list = node.body || []; } return node; }
  function parentList(prog, path) { const p = String(path).split('.').map(Number); let list = prog; for (let i = 0; i < p.length - 1; i++) list = list[p[i]].body; return { list, idx: p[p.length - 1] }; }
  function listAt(prog, bodyPath) { if (bodyPath === '' || bodyPath == null) return prog; return at(prog, bodyPath).body; }

  /* ---------- 블록판 (팔레트 + 코딩판) ---------- */
  function Workspace(root, cfg) {
    // cfg: { palette:[types], prog:[nodes], lockHat:bool, onChange(prog), onSpeak(type), locked:bool }
    const ws = { prog: clone(cfg.prog || []), palette: cfg.palette || [], locked: !!cfg.locked };
    let dragging = null; // {node, from:'pal'|'prog', path, ghost, startX,startY, moved}
    function render() {
      root.innerHTML = `<div class="prog-wrap"><div class="prog-row main" data-body="">${ws.prog.map((n, i) => blockHtml(n, String(i))).join('')}<span class="prog-hint">${ws.prog.length ? '' : '아래 블록을 여기로 끌어와요'}</span></div></div>
        <div class="blk-tools" hidden><span class="muted">고른 블록:</span><button class="btn small" data-tool="left" aria-label="앞으로">◀ 앞으로</button><button class="btn small" data-tool="right" aria-label="뒤로">뒤로 ▶</button><button class="btn small" data-tool="del" aria-label="지우기">🗑 지우기</button><button class="btn small" data-tool="close" aria-label="닫기">✕</button></div>
        <div class="palette">${ws.palette.map(palHtml).join('')}</div><div class="numpick" hidden></div>`;
      root.classList.toggle('locked', ws.locked);
      if (ws.sel != null) { const el = root.querySelector(`.prog-row [data-path="${ws.sel}"]`); if (el) { el.classList.add('selected'); root.querySelector('.blk-tools').hidden = false; } else ws.sel = null; }
    }
    // 블록을 톡 하면 고르기 → ◀ ▶ 🗑 버튼으로 옮기거나 지우기 (끌기가 어려운 아이용)
    function select(path) { ws.sel = (ws.sel === path ? null : path); render(); }
    function tool(k) {
      if (ws.sel == null) return;
      if (k === 'close') { ws.sel = null; render(); return; }
      const { list, idx } = parentList(ws.prog, ws.sel); const n = list[idx]; if (!n) { ws.sel = null; render(); return; }
      const top = ws.sel.indexOf('.') < 0; const min = top && hatOf(ws.prog) && !isHat(n.t) ? 1 : 0;
      if (k === 'del') { if (cfg.lockHat && isHat(n.t) && top) return; list.splice(idx, 1); ws.sel = null; if (cfg.onDelete) cfg.onDelete(n); }
      else if (k === 'left' && idx > min && !isHat(n.t)) { list.splice(idx, 1); list.splice(idx - 1, 0, n); ws.sel = ws.sel.replace(/\d+$/, idx - 1); }
      else if (k === 'right' && idx < list.length - 1 && !isHat(n.t)) { list.splice(idx, 1); list.splice(idx + 1, 0, n); ws.sel = ws.sel.replace(/\d+$/, idx + 1); }
      else return;
      render(); emit();
    }
    const emit = () => { if (cfg.onChange) cfg.onChange(ws.prog); };
    function setNum(path, v) { const n = at(ws.prog, path); if (n) { n.n = v; render(); emit(); } }
    function showPicker(btn, path, isEmo) {
      const pk = root.querySelector('.numpick'); const vals = isEmo ? SAY_EMO : [1, 2, 3, 4, 5];
      pk.innerHTML = vals.map(v => `<button class="btn small${(isEmo ? at(ws.prog, path).v : at(ws.prog, path).n) === v ? ' primary' : ''}" data-v="${esc(v)}">${v}</button>`).join('');
      pk.hidden = false;
      const r = btn.getBoundingClientRect(), rr = root.getBoundingClientRect();
      pk.style.left = Math.max(8, Math.min(rr.width - pk.offsetWidth - 8, r.left - rr.left - 20)) + 'px'; pk.style.top = (r.bottom - rr.top + 6) + 'px';
      pk.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; e.stopPropagation(); const n = at(ws.prog, path); if (isEmo) n.v = b.dataset.v; else n.n = +b.dataset.v; pk.hidden = true; render(); emit(); };
    }
    root.addEventListener('click', e => {
      const tl = e.target.closest('[data-tool]'); if (tl) { e.stopPropagation(); return tool(tl.dataset.tool); }
      const num = e.target.closest('[data-num]'); if (num && !ws.locked) { e.stopPropagation(); return showPicker(num, num.dataset.num, false); }
      const emo = e.target.closest('[data-emo]'); if (emo && !ws.locked) { e.stopPropagation(); return showPicker(emo, emo.dataset.emo, true); }
      const pk = root.querySelector('.numpick'); if (pk && !pk.hidden && !e.target.closest('.numpick')) pk.hidden = true;
    });
    // 길게 누르면 설명 읽어주기 (CREQ-67)
    let pressTimer = null;
    root.addEventListener('pointerdown', e => {
      if (ws.locked) return;
      const pal = e.target.closest('[data-pal]'); const pb = e.target.closest('.prog-row [data-path]');
      if (e.target.closest('[data-num],[data-emo],.numpick')) return;
      if (!pal && !pb) return;
      e.preventDefault();
      const type = pal ? pal.dataset.pal : pb.dataset.t;
      const src = pal || pb;
      dragging = { from: pal ? 'pal' : 'prog', path: pb ? pb.dataset.path : null, type, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, src };
      clearTimeout(pressTimer); pressTimer = setTimeout(() => { if (dragging && !dragging.moved && cfg.onSpeak) cfg.onSpeak(type); }, 600);
      try { root.setPointerCapture(e.pointerId); } catch (x) { /* */ }
    });
    root.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - dragging.x0, dy = e.clientY - dragging.y0;
      if (!dragging.moved && Math.hypot(dx, dy) < 8) return;
      if (!dragging.moved) {
        dragging.moved = true; clearTimeout(pressTimer);
        // 하트(시작) 블록은 잠겨 있으면 못 움직여요
        if (dragging.from === 'prog' && cfg.lockHat && isHat(dragging.type) && dragging.path.indexOf('.') < 0) { dragging = null; return; }
        let node;
        if (dragging.from === 'pal') node = parse(dragging.type + (B[dragging.type].n ? ':1' : ''));
        else { const { list, idx } = parentList(ws.prog, dragging.path); node = list.splice(idx, 1)[0]; render(); }
        dragging.node = node;
        const g = document.createElement('div'); g.className = 'drag-ghost'; g.innerHTML = blockHtml(node, 'g', { ghost: true }); document.body.appendChild(g); dragging.ghost = g;
      }
      const g = dragging.ghost; g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px';
      root.querySelectorAll('.prog-row.over').forEach(x => x.classList.remove('over')); root.querySelectorAll('.drop-mark').forEach(x => x.remove());
      const tgt = dropTarget(e.clientX, e.clientY, dragging);
      if (tgt && tgt.row) { tgt.row.classList.add('over'); const mk = document.createElement('span'); mk.className = 'drop-mark'; const ref = tgt.kids[tgt.idx]; if (ref) tgt.row.insertBefore(mk, ref); else { const hint = tgt.row.querySelector('.prog-hint, .c-gap'); tgt.row.insertBefore(mk, hint); } }
    });
    function dropTarget(x, y, d) {
      const g = d.ghost; if (!g) return null; g.style.display = 'none';
      const el = document.elementFromPoint(x, y); g.style.display = '';
      if (!el || !root.contains(el)) return null;
      if (el.closest('.palette')) return { del: true };
      let row = el.closest('.prog-row');
      if (!row) { if (el.closest('.prog-wrap')) row = root.querySelector('.prog-row.main'); else return null; }
      // C 블록 안에 C 블록은 넣지 않아요 (초1용 단순화)
      if (row.classList.contains('c-body') && d.node && d.node.body) row = root.querySelector('.prog-row.main');
      const kids = [...row.children].filter(k => k.matches('[data-path]'));
      let idx = kids.length;
      for (let i = 0; i < kids.length; i++) { const r = kids[i].getBoundingClientRect(); if (y < r.top - 6 || (y <= r.bottom + 6 && x < r.left + r.width / 2)) { idx = i; break; } }
      return { row, bodyPath: row.dataset.body, idx, kids };
    }
    const finish = e => {
      clearTimeout(pressTimer);
      if (!dragging) return;
      const d = dragging; dragging = null;
      root.querySelectorAll('.prog-row.over').forEach(x => x.classList.remove('over')); root.querySelectorAll('.drop-mark').forEach(x => x.remove());
      if (!d.moved) { if (d.from === 'prog' && !ws.locked) select(d.path); return; }
      ws.sel = null;
      let tgt = null; try { tgt = dropTarget(e.clientX, e.clientY, d); } catch (x) { tgt = null; }
      if (d.ghost) d.ghost.remove(); document.querySelectorAll('.drag-ghost').forEach(x => x.remove());
      if (tgt && !tgt.del) {
        let list = listAt(ws.prog, tgt.bodyPath); let idx = tgt.idx;
        if (isHat(d.node.t)) { // 시작 블록은 맨 앞에만, 하나만
          if (tgt.bodyPath !== '') { render(); emit(); return; }
          if (hatOf(ws.prog)) ws.prog.shift(); idx = 0; list = ws.prog;
        } else if (tgt.bodyPath === '' && hatOf(ws.prog) && idx === 0) idx = 1;
        list.splice(idx, 0, d.node);
        if (cfg.onDrop) cfg.onDrop(d.node);
      } else if (cfg.onDelete && d.from === 'prog') cfg.onDelete(d.node);
      render(); emit();
    };
    root.addEventListener('pointerup', finish); root.addEventListener('pointercancel', finish);
    ws.render = render; ws.set = p => { ws.prog = clone(p); ws.sel = null; render(); }; ws.select = select; ws.tool = tool; ws.get = () => clone(ws.prog);
    ws.setPalette = p => { ws.palette = p; render(); }; ws.lock = v => { ws.locked = v; render(); };
    ws.highlight = t => { root.querySelectorAll('[data-pal]').forEach(el => el.classList.toggle('glow', el.dataset.pal === t)); };
    ws.showGhost = prog => { // 힌트 2단계·정답: 놓을 자리를 흰 윤곽으로
      const row = root.querySelector('.prog-row.main'); if (!row) return;
      row.querySelectorAll('.ghost-slot').forEach(x => x.remove());
      const hint = document.createElement('div'); hint.className = 'ghost-slot'; hint.innerHTML = prog.map((n, i) => blockHtml(n, 'h' + i, { ghost: true })).join('');
      row.appendChild(hint);
    };
    render();
    return ws;
  }

  /* ---------- 무대 ---------- */
  function Stage(root, cfg) {
    // cfg: { map:[rows], legend:{a:'🍎'}, chars:[{id,x,y,img,name,color}], theme, dark, order:[letters], onCollect, onBump, onSay, speed(ms/칸), free:bool }
    const st = { items: {}, rocks: {}, chars: {}, collected: [], executed: {}, running: 0, stopped: false, speed: cfg.speed || 450, baseSpeed: cfg.speed || 450, painted: {}, planted: {} };
    const key = (x, y) => `${x},${y}`;
    (cfg.map || []).forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') st.rocks[key(x, y)] = 1; else if (/[a-z]/.test(ch)) st.items[key(x, y)] = { id: ch, img: (cfg.legend || {})[ch] || '⭐' }; }));
    cfg.chars.forEach(c => { st.chars[c.id] = { ...c, sx: c.x, sy: c.y, dir: 'right', size: 1, visible: true, bubble: '' }; });
    function render() {
      const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = key(x, y); cells.push(`<div class="cell${st.rocks[k] ? ' rock' : ''}${(x + y) % 2 ? ' alt' : ''}${st.painted[k] != null ? ' painted' : ''}" data-x="${x}" data-y="${y}"${st.painted[k] != null ? ` style="--hue:${st.painted[k]}deg"` : ''}>${st.rocks[k] ? '🪨' : st.items[k] ? `<span class="item" data-k="${k}">${st.items[k].img}</span>` : st.planted[k] ? `<span class="planted">${st.planted[k]}</span>` : ''}</div>`); }
      root.innerHTML = `<div class="grid-stage${cfg.dark ? ' dark' : ''}" style="background:${cfg.theme || '#e9f5db'}">${cells.join('')}
        ${Object.values(st.chars).map(c => `<div class="actor" data-char="${c.id}" style="--x:${c.x};--y:${c.y};--s:${c.size};--hue:${c.hue || 0}deg;opacity:${c.visible ? 1 : .15}"><span class="bub${c.bubble ? '' : ' off'}">${esc(c.bubble)}</span><span class="face">${c.img}</span></div>`).join('')}
        <div class="tray">${cfg.tray !== false ? st.collected.map(i => `<span>${i.img}</span>`).join('') : ''}</div></div>`;
    }
    function actorEl(id) { return root.querySelector(`[data-char="${id}"]`); }
    function moveEl(c) { const el = actorEl(c.id); if (el) { el.style.setProperty('--x', c.x); el.style.setProperty('--y', c.y); el.style.setProperty('--s', c.size); el.style.opacity = c.visible ? 1 : .15; } }
    function collect(c, trigger) {
      const k = key(c.x, c.y); const it = st.items[k]; if (!it) return;
      delete st.items[k]; st.collected.push({ ...it, by: c.id, trigger });
      const el = root.querySelector(`.item[data-k="${k}"]`); if (el) { el.classList.add('taken'); setTimeout(() => el.remove(), 400); }
      const tray = root.querySelector('.tray'); if (tray && cfg.tray !== false) tray.insertAdjacentHTML('beforeend', `<span>${it.img}</span>`);
      if (cfg.onCollect) cfg.onCollect(it, st);
    }
    const DIRS = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
    const free = (x, y) => x >= 0 && x < W && y >= 0 && y < H && !st.rocks[key(x, y)];
    async function bump(c) { const el = actorEl(c.id); if (el) { el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 400); } if (cfg.onBump) cfg.onBump(c); await sleep(st.speed); }
    async function exec(c, nodes, trigger, depth) {
      for (const n of nodes) {
        if (st.stopped) return;
        st.executed[n.t] = (st.executed[n.t] || 0) + 1;
        if (cfg.onStep) cfg.onStep(c, n);
        if (DIRS[n.t]) {
          c.dir = n.t; const [dx, dy] = DIRS[n.t];
          for (let i = 0; i < n.n; i++) {
            if (st.stopped) return;
            if (!free(c.x + dx, c.y + dy)) { await bump(c); break; }
            c.x += dx; c.y += dy; moveEl(c); await sleep(st.speed); collect(c, trigger);
          }
        } else if (n.t === 'jump') {
          const [dx, dy] = DIRS[c.dir]; const el = actorEl(c.id);
          if (el) { el.classList.add('hop'); setTimeout(() => el.classList.remove('hop'), 500); }
          const tx = c.x + dx * 2, ty = c.y + dy * 2;
          if (tx >= 0 && tx < W && ty >= 0 && ty < H && !st.rocks[key(tx, ty)]) { c.x = tx; c.y = ty; moveEl(c); }
          await sleep(st.speed + 150); collect(c, trigger);
        } else if (n.t === 'home') { c.x = c.sx; c.y = c.sy; moveEl(c); await sleep(st.speed + 100); if (cfg.onHome) cfg.onHome(c); }
        else if (n.t === 'say') { c.bubble = n.v; const el = actorEl(c.id); if (el) { const b = el.querySelector('.bub'); b.textContent = n.v; b.classList.remove('off'); } if (cfg.onSay) cfg.onSay(c, n.v); await sleep(900); if (el) el.querySelector('.bub').classList.add('off'); c.bubble = ''; }
        else if (n.t === 'grow') { c.size = Math.min(2.2, c.size * 1.3); moveEl(c); await sleep(450); }
        else if (n.t === 'shrink') { c.size = Math.max(0.5, c.size / 1.3); moveEl(c); await sleep(450); }
        else if (n.t === 'hide') { c.visible = false; moveEl(c); await sleep(450); }
        else if (n.t === 'show') { c.visible = true; moveEl(c); await sleep(450); }
        else if (n.t === 'pop') { if (cfg.onPop) cfg.onPop(c); const el = actorEl(c.id); if (el) { const b = el.querySelector('.bub'); b.textContent = '뿅!'; b.classList.remove('off'); setTimeout(() => b.classList.add('off'), 500); } await sleep(500); }
        else if (n.t === 'rec') { if (cfg.onRec) await cfg.onRec(c); else await sleep(400); }
        else if (n.t === 'wait') { const el = actorEl(c.id); if (el) { const b = el.querySelector('.bub'); b.textContent = '⏳'; b.classList.remove('off'); } await sleep(n.n * 500); if (el) el.querySelector('.bub').classList.add('off'); }
        else if (n.t === 'repeat') { for (let i = 0; i < n.n; i++) { if (st.stopped) return; await exec(c, n.body || [], trigger, depth + 1); } }
        else if (n.t === 'send') { if (cfg.onSend) cfg.onSend(c); await sleep(300); }
        /* v1.1.0 새 블록 */
        else if (n.t === 'dash') { const [dx, dy] = DIRS[c.dir]; const el = actorEl(c.id); if (el) el.classList.add('dash'); let moved = 0; while (free(c.x + dx, c.y + dy) && moved < 8) { c.x += dx; c.y += dy; moved++; moveEl(c); await sleep(Math.max(90, st.speed / 3)); collect(c, trigger); if (st.stopped) break; } if (el) el.classList.remove('dash'); if (!moved) await bump(c); await sleep(200); }
        else if (n.t === 'spin') { const el = actorEl(c.id); if (el) { el.classList.add('spin'); setTimeout(() => el.classList.remove('spin'), 700); } await sleep(750); }
        else if (n.t === 'color') { c.hue = ((c.hue || 0) + 90) % 360; const el = actorEl(c.id); if (el) el.style.setProperty('--hue', c.hue + 'deg'); await sleep(450); }
        else if (n.t === 'flash') { const el = actorEl(c.id); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900); } await sleep(900); }
        else if (n.t === 'dance') { const el = actorEl(c.id); if (el) { el.classList.add('dance'); setTimeout(() => el.classList.remove('dance'), 1000); } if (cfg.onDance) cfg.onDance(c); await sleep(1000); }
        else if (n.t === 'paint') { const k = key(c.x, c.y); st.painted[k] = (c.hue || 0); const cell = root.querySelector(`.cell[data-x="${c.x}"][data-y="${c.y}"]`); if (cell) { cell.classList.add('painted'); cell.style.setProperty('--hue', (c.hue || 0) + 'deg'); } await sleep(350); }
        else if (n.t === 'plant') { const k = key(c.x, c.y); if (!st.items[k] && !st.rocks[k]) { st.planted[k] = cfg.plantImg || '🌸'; const cell = root.querySelector(`.cell[data-x="${c.x}"][data-y="${c.y}"]`); if (cell) cell.insertAdjacentHTML('beforeend', `<span class="planted">${st.planted[k]}</span>`); } await sleep(350); }
        else if (n.t === 'drum' || n.t === 'clap' || n.t === 'music') { const txt = { drum: '둥둥!', clap: '짝짝!', music: '🎵' }[n.t]; if (cfg.onSound) cfg.onSound(n.t, c); const el = actorEl(c.id); if (el) { const b = el.querySelector('.bub'); b.textContent = txt; b.classList.remove('off'); setTimeout(() => b.classList.add('off'), n.t === 'music' ? 1400 : 600); el.classList.add('bop'); setTimeout(() => el.classList.remove('bop'), 600); } await sleep(n.t === 'music' ? 1500 : 650); }
        else if (n.t === 'fast') { st.speed = Math.max(120, Math.round(st.baseSpeed / 2.2)); await sleep(150); }
        else if (n.t === 'slow') { st.speed = Math.round(st.baseSpeed * 1.8); await sleep(150); }
        else if (n.t === 'stop') { const el = actorEl(c.id); if (el) { const b = el.querySelector('.bub'); b.textContent = '🛑'; b.classList.remove('off'); setTimeout(() => b.classList.add('off'), 700); } await sleep(400); st.stopped = true; return; }
        else if (n.t === 'forever') { if (depth === 0) { for (let i = 0; i < 12; i++) { if (st.stopped) return; await exec(c, nodes.filter(x => x !== n && !isHat(x.t)), trigger, 1); } } }
        else if (n.t === 'page') { await sleep(300); }
      }
    }
    // 프로그램 실행: trigger = 'flag' | 'tap' | 'recv'. 캐릭터별 프로그램 {id: nodes}
    async function run(programs, trigger) {
      st.stopped = false; st.running++; st.speed = st.baseSpeed;
      const jobs = [];
      for (const [id, prog] of Object.entries(programs)) {
        const c = st.chars[id]; if (!c) continue;
        const hat = hatOf(prog) || 'flag';
        if (hat !== trigger) continue;
        const el = actorEl(id); if (el) el.classList.add('run');
        jobs.push(exec(c, bodyOf(prog), trigger, 0).then(() => { if (el) el.classList.remove('run'); }));
      }
      await Promise.all(jobs); st.running--;
      return st;
    }
    async function runOne(id, programs, trigger) { const p = {}; if (programs[id]) p[id] = programs[id]; return run(p, trigger); }
    function stop() { st.stopped = true; }
    function reset() {
      st.stopped = true; st.items = {}; st.collected = []; st.executed = {}; st.homed = false; st.painted = {}; st.planted = {}; st.speed = st.baseSpeed;
      (cfg.map || []).forEach((row, y) => [...row].forEach((ch, x) => { if (/[a-z]/.test(ch)) st.items[key(x, y)] = { id: ch, img: (cfg.legend || {})[ch] || '⭐' }; }));
      Object.values(st.chars).forEach(c => { c.x = c.sx; c.y = c.sy; c.dir = 'right'; c.size = 1; c.visible = true; c.bubble = ''; c.hue = 0; });
      render();
    }
    st.render = render; st.run = run; st.runOne = runOne; st.stop = stop; st.reset = reset; st.root = root;
    st.setChars = list => { st.chars = {}; list.forEach(c => { st.chars[c.id] = { ...c, sx: c.x, sy: c.y, dir: 'right', size: 1, visible: true, bubble: '' }; }); render(); };
    render();
    return st;
  }

  /* ---------- 미션 판정 (CREQ-54): 목표 물건을 다 모았나, 순서, 꼭 써야 하는 블록, 톡 해서 모아야 하는 물건 ---------- */
  function judge(mission, st, progs) {
    const total = Object.keys(mission.legend || {}).length;
    const got = st.collected;
    if (got.length < total) return { ok: false, why: 'more', left: total - got.length };
    if (mission.order) { const ids = got.map(g => g.id); for (let i = 0; i < mission.order.length; i++) if (ids[i] !== mission.order[i]) return { ok: false, why: 'order' }; }
    for (const t of mission.need || []) if (!st.executed[t]) return { ok: false, why: 'need', need: t };
    if (mission.chars) for (const ch of mission.chars) if (ch.hat === 'tap') { const mine = got.filter(g => g.by === ch.id); if (mine.some(g => g.trigger !== 'tap')) return { ok: false, why: 'tap', who: ch.id }; }
    if (mission.max) { const n = countBlocks(bodyOf(progs.lead || [])); if (n > mission.max) return { ok: false, why: 'max', max: mission.max, n }; }
    return { ok: true };
  }
  // 미션에 필요한 팔레트: 정답에 쓰인 블록 + 해금된 블록 중 1~2개 (CREQ-53: 3~6개)
  function paletteFor(mission, unlocked) {
    const need = new Set(); for (const p of [mission.sol].concat((mission.chars || []).map(c => c.sol))) for (const t of typesIn(parseProg(p))) if (!isHat(t)) need.add(t);
    const out = [...need]; const extra = unlocked.filter(t => !need.has(t) && !isHat(t));
    for (const t of extra) { if (out.length >= Math.max(3, need.size + 2)) break; out.push(t); }
    const order = ['motion', 'looks', 'sound', 'control', 'end', 'start'];
    return out.sort((a, b) => order.indexOf(B[a].cat) - order.indexOf(B[b].cat) || Object.keys(B).indexOf(a) - Object.keys(B).indexOf(b));
  }

  return { parse, parseProg, toStr, clone, normalize, countBlocks, typesIn, isHat, hatOf, bodyOf, same, blockHtml, palHtml, Workspace, Stage, judge, paletteFor, SAY_EMO };
})();
