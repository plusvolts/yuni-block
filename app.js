/* 윤이 블록 — 앱 로직 (의존성 없음). 영어 앱 v1.3.3 뼈대 + 세 앱 공통 코드(아빠 화면·별·한국어 녹음) */
(() => {
  'use strict';
  const APP_VERSION = '1.0.0';
  const C = window.CONTENT; const BK = window.BLOCKS; const B = C.blocks;
  const U = C.units;
  const DAYS = 5;
  const STEPS = [
    { id: 'greet', name: '인사', icon: '👋' },
    { id: 'review', name: '복습 미션', icon: '🔁' },
    { id: 'new', name: '새 블록', icon: '✨' },
    { id: 'mission', name: '미션', icon: '🧩' },
    { id: 'free', name: '자유 만들기', icon: '🎨' },
  ];
  const KEY = 'yuni-block-v1';
  const $app = document.getElementById('app');

  /* ================= 저장소 (공통 16: 저장 키 고정, 새 항목은 defaults에) ================= */
  function defaults() {
    return {
      settings: { parentPin: '1234', leader: 'dino', leaderName: '', childName: '윤이', dailyLimit: 20, koVoice: '', koVoiceMode: 'rec', koRate: 0.9, goalStars: 50, goalText: '아빠와 약속한 선물', speed: 'normal', hintAt: 2 },
      pos: { u: 0, d: 1, s: 0 }, done: {}, stars: 0, goalBase: 0,
      days: [], log: {}, stickers: {}, override: '', rewards: [],
      learned: {}, weak: {}, hints: {}, works: [], freeDay: '', level: 0,
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = defaults(); const o = JSON.parse(raw); return Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) }); }
    } catch (e) { /* 저장소 사용 불가 */ }
    return defaults();
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  /* ================= 날짜 ================= */
  const pad = n => String(n).padStart(2, '0');
  const ymd = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const today = () => ymd(new Date());
  const addDays = (n, from) => { const d = from ? new Date(from + 'T12:00:00') : new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  function todayLog() { const k = today(); S.log[k] = S.log[k] || { sec: 0, stars: 0 }; return S.log[k]; }
  function streak() { const set = new Set(S.days); let n = 0; let d = today(); if (!set.has(d)) d = addDays(-1); while (set.has(d)) { n++; d = addDays(-1, d); } return n; }

  /* ================= 유틸 ================= */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }
  const leader = () => C.leaders.find(l => l.id === S.settings.leader) || C.leaders[0];
  const leaderName = () => S.settings.leaderName || leader().name;
  const childName = () => S.settings.childName || '윤이';
  const friendHtml = (id, lg) => { const f = C.friends[id]; return `<span class="friend${lg ? ' lg' : ''}" style="background:${f.color}"><span class="fimg">${f.img}</span>${esc(f.name)}</span>`; };
  const fillSay = (text, fid) => String(text).replace('{F}', fid ? C.friends[fid].name : leaderName()).replace(/\{NAME\}/g, childName());
  const praise = () => pick(C.lines.praise);

  /* ================= 소리 (기기 음성) ================= */
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const koVoices = () => voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  function voiceFor() {
    const ks = koVoices();
    const chosen = S.settings.koVoice && ks.find(v => v.voiceURI === S.settings.koVoice || v.name === S.settings.koVoice);
    return chosen || ks.find(v => /google/i.test(v.name)) || ks.find(v => /samsung/i.test(v.name)) || ks[0] || null;
  }
  let sayToken = 0;
  function speak(text, rate) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || !text) return resolve();
      const my = sayToken;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = rate; u.pitch = 1.0;
      const v = voiceFor(); if (v) u.voice = v;
      let done = false; const fin = () => { if (!done) { done = true; resolve(my === sayToken); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1500 + text.length * 180 / rate);
      try { speechSynthesis.speak(u); } catch (e) { fin(); }
    });
  }
  async function speakDevice(t, rate) {
    const parts = String(t).split(/(?<=[.!?,])\s+/).map(x => x.trim()).filter(Boolean);
    const my = sayToken;
    for (let i = 0; i < parts.length; i++) { if (my !== sayToken) return; await speak(parts[i], rate); if (i < parts.length - 1) await sleep(120); }
  }
  /* ================= 한국어 녹음 재생 (공통 65번) — 세 앱 같은 코드 (plan/0_COMMON_spec.md 5-2) ================= */
  let KO_IDX = null; let koAudio = null; let koDone = null; let koChain = Promise.resolve();
  const koKey = t => String(t).replace(/\s+/g, ' ').trim();
  fetch('audio-ko/index.json').then(r => (r.ok ? r.json() : {})).then(j => { KO_IDX = j || {}; }).catch(() => { KO_IDX = {}; });
  const koRec = t => (S.settings.koVoiceMode !== 'device' && KO_IDX && KO_IDX[koKey(t)]) || null;
  const koSentences = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
  function koStop() { const d = koDone; if (koAudio) { try { koAudio.pause(); } catch (e) { /* */ } koAudio = null; } if (d) d(false); }
  function playKo(file, rate) {
    const my = sayToken;
    const p = koChain.then(() => (my !== sayToken ? false : new Promise(resolve => {
      const a = new Audio('audio-ko/' + file); koAudio = a;
      a.playbackRate = Math.max(0.7, Math.min(1.3, (Number(rate) || 0.9) / 0.9));
      let fin = false;
      const done = ok => { if (fin) return; fin = true; if (koAudio === a) koAudio = null; if (koDone === done) koDone = null; resolve(ok); };
      koDone = done;
      a.onended = () => done(true); a.onerror = () => done(false);
      a.play().catch(() => done(false));
      setTimeout(() => done(true), 20000);
    })));
    koChain = p.catch(() => false); return p;
  }
  async function ko(t) {
    t = String(t).replace(/\{F\}/g, leaderName());
    if (window.__KO_LOG) window.__KO_LOG.push(String(t));
    const my = sayToken; const rate = Number(S.settings.koRate) || 0.9;
    const whole = koRec(t);
    if (whole) { if (await playKo(whole, rate)) return; if (my !== sayToken) return; }
    const parts = koSentences(t);
    for (let i = 0; i < parts.length; i++) {
      if (my !== sayToken) return;
      const f = koRec(parts[i]);
      if (!(f && await playKo(f, rate))) { if (my !== sayToken) return; await speakDevice(parts[i].replace(/[\p{Extended_Pictographic}]/gu, ''), rate); }
      if (i < parts.length - 1) await sleep(120);
    }
  }
  function hush() { sayToken++; koStop(); try { speechSynthesis.cancel(); } catch (e) { /* */ } }

  let actx = null;
  function tone(freqs, dur) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(); const g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        const t0 = actx.currentTime + i * dur;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      });
    } catch (e) { /* */ }
  }
  const ding = () => tone([880, 1320], 0.14);
  const boop = () => tone([300, 220], 0.16);
  const popSound = () => tone([700, 1100, 1500], 0.07);

  /* ================= 화면 관리 ================= */
  let H = {}; let screen = ''; let actToken = 0;
  let stage = null, ws = null; // 지금 화면의 무대·블록판 (테스트용)
  function render(name, html, handlers) {
    screen = name; hush(); actToken++; if (stage) { try { stage.stop(); } catch (e) { /* */ } } stage = null; ws = null;
    document.querySelectorAll('.confetti,.feedback,.drag-ghost').forEach(x => x.remove());
    $app.innerHTML = html; H = handlers || {}; window.scrollTo(0, 0);
  }
  $app.addEventListener('click', e => {
    const say = e.target.closest('[data-say]');
    if (say) { e.stopPropagation(); hush(); ko(say.dataset.say); return; }
    const b = e.target.closest('[data-act]');
    if (b && H[b.dataset.act]) H[b.dataset.act](b.dataset.arg, b, e);
  });

  /* ================= 잠금 (시간 제한, 공통 11: 밤 잠금 없음) ================= */
  function lockReason() {
    if (S.override === today()) return '';
    if (todayLog().sec >= Number(S.settings.dailyLimit) * 60) return 'time';
    return '';
  }
  function lockedScreen() {
    render('locked', `<div class="screen"><div class="reward">
      <div class="robot">😴</div>
      <div class="bubble">오늘 블록 놀이는 여기까지! 정말 잘했어요.<small>${esc(leaderName())}도 이제 쉬러 가요</small></div>
      <div class="home-links"><button class="btn" data-act="home">처음으로</button><button class="btn small" data-act="parent">아빠 화면</button></div>
    </div></div>`, { home: homeScreen, parent: () => gateScreen(parentScreen) });
    ko('오늘 블록 놀이는 여기까지! 정말 잘했어요.');
  }
  setInterval(() => { if (screen === 'lesson' && !document.hidden) { todayLog().sec += 10; save(); } }, 10000);

  /* ================= 블록 해금·레벨 (CREQ-53·57) ================= */
  const dayUnlocks = (u, d) => ((U[u].days[d - 1] || {}).unlock || []);
  function unlockedUpTo(u, d) { // 이 단원·일차까지 배운 블록 (앞 단원 전부 + 이 단원 d일차까지)
    const out = []; for (let ui = 0; ui <= u; ui++) for (let di = 1; di <= (ui === u ? d : DAYS); di++) for (const t of dayUnlocks(ui, di)) if (!out.includes(t)) out.push(t);
    return out;
  }
  const level = () => Object.keys(S.learned).length;

  /* ================= 홈 ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (screen === 'home') homeScreen(); });
  function posLabel() { const { u, d, s } = S.pos; const up = U[u]; return `${up.bg} ${up.title} ${d}일차 · ${STEPS[s].name}${s > 0 ? '부터 이어하기' : ''}`; }
  const stickerCount = () => Object.keys(S.stickers).length;
  function homeScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const pct = Math.min(100, Math.round(g / goal * 100)); const st = streak(); const ld = leader();
    render('home', `<div class="screen">
      <div class="topbar">
        <div class="stars">⭐ ${S.stars}</div>
        <div class="stars lv">🏅 레벨 ${level()}</div>
        ${st ? `<div class="stars">🔥 ${st}일 연속</div>` : ''}
        <div class="spacer"></div>
        ${installEvt ? '<button class="btn small" data-act="install">📲 앱 설치</button>' : ''}
        <button class="icon-btn" data-act="parent" aria-label="아빠 화면">⚙️</button>
      </div>
      <div class="home-main">
        <div class="bubble">안녕, ${esc(childName())}!<small>나는 ${esc(leaderName())}야. 오늘도 블록으로 놀자!</small></div>
        <div class="robot" data-act="hello">${ld.img}</div>
        <div class="friends">${Object.keys(C.friends).map(id => friendHtml(id)).join('')}</div>
        <button class="btn primary go-btn" data-act="go">오늘 하기<small>${esc(posLabel())}</small></button>
        <div class="home-links">
          <button class="btn" data-act="picker">🧭 단계 고르기</button>
          <button class="btn" data-act="stickers">📒 스티커북 <small>${stickerCount()}</small></button>
          <button class="btn" data-act="works">🎨 내 작품 <small>${S.works.length}</small></button>
        </div>
        <button class="goal card" data-act="rewards" style="text-align:left"><div class="row"><b>🎁 ${esc(S.settings.goalText)}</b><div class="spacer"></div><span class="muted">${g >= goal ? '달성! 🎉' : `${g} / ${goal}`}</span></div>
          <div class="goal-bar"><i style="width:${pct}%"></i></div>
          <div class="row" style="margin-top:8px"><span class="muted">받은 보상 ${S.rewards.length}개${rwCount().left ? ` · 안 쓴 보상 ${rwCount().left}개` : ''}</span><div class="spacer"></div><span class="muted">보상 목록 보기 ›</span></div></button>
      </div>
    </div>`, {
      go: () => startLesson(S.pos.u, S.pos.d, S.pos.s),
      picker: () => pickerScreen('units'),
      stickers: stickerScreen, works: worksScreen, rewards: rewardScreen,
      parent: () => gateScreen(parentScreen),
      hello: () => { hush(); ko(`안녕, ${childName()}! 오늘도 블록으로 놀자!`); },
      install: async () => { if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* */ } installEvt = null; homeScreen(); } },
    });
  }

  /* ================= 단계 고르기 (공통 09) ================= */
  const doneCount = u => { let n = 0; for (let d = 1; d <= DAYS; d++) if (S.done[`${u}-${d}`]) n++; return n; };
  function parseCode(code) {
    const m = String(code).trim().match(/^(\d{1,2})\s*-\s*(\d{1,2})(?:\s*-\s*(\d))?$/);
    if (!m) return null;
    const u = +m[1] - 1, d = +m[2], s = m[3] ? +m[3] - 1 : 0;
    if (u < 0 || u >= U.length || d < 1 || d > DAYS || s < 0 || s >= STEPS.length) return null;
    return { u, d, s };
  }
  function pickerScreen(lv, u, d) {
    let body = '';
    if (lv === 'units') {
      body = `<h2 class="title">어떤 단원을 할까?</h2>
        <div class="grid">${U.map((up, i) => `<button class="tile${up.soon ? ' locked' : ''}${S.pos.u === i ? ' now' : ''}" data-act="unit" data-arg="${i}">
          <span class="em">${up.bg}</span><b>${i + 1}. ${esc(up.title)}</b><small>${up.soon ? '준비 중' : `${doneCount(i)} / ${DAYS}일`}</small></button>`).join('')}</div>
        <div class="card code-row"><b>진도 코드</b><input id="code" inputmode="numeric" placeholder="예: 3-2"><button class="btn small primary" data-act="code">바로 가기</button>
          <span class="muted">단원-일차(-단계). 다른 기기에서 하던 곳부터 시작해요.</span></div>`;
    } else if (lv === 'days') {
      const up = U[u];
      body = `<h2 class="title">${up.bg} ${esc(up.title)} — 며칠째 할까?</h2>
        <div class="days">${Array.from({ length: DAYS }, (_, i) => i + 1).map(dd => `<button class="day${S.done[`${u}-${dd}`] ? ' done' : ''}${S.pos.u === u && S.pos.d === dd ? ' now' : ''}" data-act="day" data-arg="${dd}">${dd}<small>${(up.days[dd - 1].unlock || []).map(t => B[t].icon).join('') || '&nbsp;'}</small></button>`).join('')}</div>`;
    } else {
      const up = U[u];
      body = `<h2 class="title">${up.bg} ${esc(up.title)} ${d}일차 — 어디부터 할까?</h2>
        <div class="steps">${STEPS.map((st, i) => `<button class="tile" data-act="step" data-arg="${i}"><span class="em">${st.icon}</span><b>${i + 1}. ${st.name}</b></button>`).join('')}</div>`;
    }
    render('picker', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="뒤로">⬅️</button><div class="spacer"></div><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button></div>
      ${body}</div>`, {
      back: () => lv === 'units' ? homeScreen() : lv === 'days' ? pickerScreen('units') : pickerScreen('days', u),
      home: homeScreen,
      unit: a => { if (U[+a].soon) { hush(); ko('이 단원은 아직 준비 중이야. 다음 버전에서 만나!'); return toast('준비 중이에요'); } pickerScreen('days', +a); },
      day: a => pickerScreen('steps', u, +a),
      step: a => startLesson(u, d, +a),
      code: () => { const p = parseCode(document.getElementById('code').value); if (!p) return toast('예: 3-2 처럼 적어주세요'); startLesson(p.u, p.d, p.s); },
    });
  }

  /* ================= 받은 보상 (공통 15·60) ================= */
  function rwCount() { const n = S.rewards.length, u = S.rewards.filter(r => r.used).length; return { n, u, left: n - u }; }
  function rwHeadText() { const c = rwCount(); return `받은 보상 ${c.n}개 · 안 쓴 보상 ${c.left}개 · 사용완료 ${c.u}개`; }
  function rwSummary() { const c = rwCount(); return `아직 안 쓴 보상 ${c.left}개 · 사용완료 ${c.u}개`; }
  function rewardScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const list = S.rewards.slice().reverse();
    render('rewards', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">🎁 받은 보상</h2></div>
      <div class="card goal" style="width:100%"><div class="row"><b>지금 목표: ${esc(S.settings.goalText)}</b><div class="spacer"></div><span class="muted">${Math.min(g, goal)} / ${goal}</span></div>
        <div class="goal-bar"><i style="width:${Math.min(100, Math.round(g / goal * 100))}%"></i></div>
        ${g >= goal ? '<p style="margin:10px 0 0;font-weight:800">목표 달성! 아빠에게 보여줘요 🎉</p>' : `<p class="muted" style="margin:10px 0 0">별 ${goal - g}개만 더 모으면 돼요!</p>`}</div>
      ${list.length ? `<p class="muted" style="margin:0;font-weight:800">${rwSummary()}</p>` : ''}
      ${list.length ? `<div class="grid">${list.map((r, i) => `<div class="tile${r.used ? ' used' : ''}"><span class="em">${r.used ? '✅' : '🎁'}</span><b>${esc(r.text)}</b><small>${esc(r.date)} · 별 ${r.stars}개</small><small>${list.length - i}번째 보상</small><span class="rw-tag${r.used ? ' done' : ''}">${r.used ? `사용완료 · ${esc(r.used)}` : '아직 안 썼어요'}</span></div>`).join('')}</div>`
        : '<p class="muted">아직 받은 보상이 없어요. 별을 모아서 첫 보상을 받아봐요!</p>'}
    </div>`, { home: homeScreen });
    if (g >= goal) ko('목표 달성! 아빠에게 보여줘요!');
  }

  /* ================= 스티커북 (CREQ-58): 단원마다 한 페이지, 미션에서 완성한 것이 스티커 ================= */
  let stPage = 0;
  function stickerScreen(page) {
    if (page != null) stPage = page; stPage = Math.max(0, Math.min(U.length - 1, stPage));
    const up = U[stPage]; const keys = up.days.map((_, i) => `${stPage}-${i + 1}`).concat([`${stPage}-x`]);
    const got = keys.filter(k => S.stickers[k]).length; const full = got === keys.length;
    render('stickers', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">📒 스티커북</h2><div class="spacer"></div><span class="muted">${stickerCount()}장</span></div>
      <div class="stbook${full ? ' gold' : ''}">
        <div class="row"><button class="icon-btn" data-act="pg" data-arg="-1"${stPage === 0 ? ' disabled style="opacity:.3"' : ''}>◀</button>
          <div class="spacer" style="text-align:center"><b class="title">${up.bg} ${esc(up.title)}</b><div class="muted">${stPage + 1} / ${U.length} 페이지 · ${got} / ${keys.length}장${full ? ' · 다 모았어요! 🏆' : ''}</div></div>
          <button class="icon-btn" data-act="pg" data-arg="1"${stPage === U.length - 1 ? ' disabled style="opacity:.3"' : ''}>▶</button></div>
        <div class="stgrid">${up.days.map((dy, i) => { const k = `${stPage}-${i + 1}`; const s = S.stickers[k]; return `<button class="sticker${s ? '' : ' empty'}" data-act="st" data-arg="${k}"><span class="em">${s ? s.img : dy.sticker}</span><small>${i + 1}일차${s ? '' : ' · 아직'}</small></button>`; }).join('')}
          ${(() => { const k = `${stPage}-x`; const s = S.stickers[k]; return `<button class="sticker big${s ? '' : ' empty'}" data-act="st" data-arg="${k}"><span class="em">${up.sticker}</span><small>${esc(up.thing)}${s ? '' : ' · 5일 다 하면'}</small></button>`; })()}
        </div>
      </div>
      <p class="muted">미션에서 완성한 것이 스티커로 붙어요. 스티커를 누르면 언제 받았는지 읽어 줘요.</p>
    </div>`, {
      home: homeScreen, pg: a => stickerScreen(stPage + Number(a)),
      st: k => { hush(); const s = S.stickers[k]; if (!s) return ko(k.endsWith('x') ? `${up.title}을 5일 다 하면 받을 수 있어` : '이 미션을 끝내면 받을 수 있어'); ko(`${s.name}. ${s.date.replace(/-/g, '월 ').replace(/^(\d+)월 /, '')}일에 ${s.from}에서 받았어!`); },
    });
  }

  /* ================= 내 작품 (CREQ-56) ================= */
  function worksScreen() {
    const list = S.works.map((w, i) => ({ w, i })).reverse();
    render('works', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">🎨 내 작품</h2><div class="spacer"></div><span class="muted">${S.works.length}개</span></div>
      ${list.length ? `<div class="grid">${list.map(({ w, i }) => `<button class="tile work" data-act="open" data-arg="${i}" style="background:${U[w.u].theme}"><span class="em">${U[w.u].bg}</span><b>${esc(w.title || U[w.u].title)}</b><small>${esc(w.date)} · 캐릭터 ${w.chars.length}</small></button>`).join('')}</div>`
        : '<p class="muted">아직 작품이 없어요. 하루 마지막 “자유 만들기”에서 만든 작품이 여기에 모여요.</p>'}
    </div>`, { home: homeScreen, open: i => freeScreen({ work: S.works[+i], idx: +i }) });
  }

  /* ================= 수업 만들기 ================= */
  const missionsOf = (u, d) => ((U[u].days[d - 1] || {}).m || []);
  function reviewMission(u, d) { // 앞 일차(없으면 앞 단원 마지막 일차) 첫 미션 — 약한 블록이 든 미션 우선 (CREQ-66)
    const cands = [];
    for (let ui = u; ui >= 0; ui--) for (let di = (ui === u ? d - 1 : DAYS); di >= 1; di--) for (const m of missionsOf(ui, di)) if (!m.given) cands.push({ u: ui, d: di, m });
    if (!cands.length) return null;
    const weak = t => S.weak[t] || 0;
    const score = x => [...BK.typesIn(BK.parseProg(x.m.sol))].reduce((s, t) => s + weak(t), 0);
    const best = cands.slice(0, 6).sort((a, b) => score(b) - score(a));
    return best[0].m && score(best[0]) > 0 ? best[0] : cands[0];
  }
  function buildStep(u, d, s) {
    if (L && L.u === u && L.d === d && L.built) { if (!L.built[s]) L.built[s] = makeStep(u, d, s); return L.built[s]; }
    return makeStep(u, d, s);
  }
  function makeStep(u, d, s) {
    const id = STEPS[s].id; const day = U[u].days[d - 1];
    if (id === 'greet') return [{ type: 'greet' }];
    if (id === 'review') { const r = reviewMission(u, d); return r ? [{ type: 'mission', m: r.m, u: r.u, d: r.d, review: true }] : [{ type: 'msg', text: '오늘은 첫날! 복습 없이 바로 새 블록으로 가요 🚀' }]; }
    if (id === 'new') { const ts = day.unlock || []; return ts.length ? ts.map(t => ({ type: 'learn', t })) : [{ type: 'msg', text: '오늘은 새 블록 없이 연습하는 날! 바로 미션으로 가요 🧩' }]; }
    if (id === 'mission') return missionsOf(u, d).map((m, i) => ({ type: 'mission', m, u, d, fix: !!m.given, idx: i }));
    return [{ type: 'free' }];
  }

  /* ================= 수업 진행 ================= */
  let L = null;
  function startLesson(u, d, s) {
    const lr = lockReason(); if (lr) return lockedScreen(lr);
    if (!(u >= 0 && u < U.length)) u = 0;
    if (U[u].soon) { render('soon', `<div class="screen"><div class="reward"><div class="robot">${U[u].bg}</div><div class="bubble">${esc(U[u].title)}은 준비 중이에요!<small>다음 버전에서 만나요. 앞 단원을 다시 해 볼까요?</small></div><div class="home-links"><button class="btn" data-act="picker">🧭 단계 고르기</button><button class="btn primary" data-act="home">처음으로</button></div></div></div>`, { home: homeScreen, picker: () => pickerScreen('units') }); ko('이 단원은 아직 준비 중이야. 다음 버전에서 만나!'); return; }
    S.pos = { u, d, s }; if (!S.days.includes(today())) S.days.push(today()); save();
    L = { u, d, s, acts: [], i: 0, earned: 0, heard: {}, awarded: {}, built: {}, levelBefore: level() };
    L.acts = buildStep(u, d, s);
    showAct();
  }
  function stepIntro() {
    const st = STEPS[L.s]; L.intro = true;
    render('lesson', `<div class="screen"><div class="reward"><div class="robot">${st.icon}</div><div class="bubble">다음은 ${st.name}!</div></div></div>`);
    const my = actToken;
    ko(`다음은 ${st.name}!`).then(() => sleep(300)).then(() => { if (my === actToken) showAct(); });
  }
  function nextAct() {
    L.i++;
    if (L.i < L.acts.length) return showAct();
    L.s++; S.pos.s = L.s; save();
    if (L.s >= STEPS.length) return finishDay();
    const lr = lockReason(); if (lr) return lockedScreen(lr);
    L.acts = buildStep(L.u, L.d, L.s); L.i = 0;
    stepIntro();
  }
  // 별 (공통 18·64): 스스로 정답을 넣으면 1개(시도 횟수 무관), 못 넣고 넘어가면 0개, 문제당 한 번, 하루 끝 보너스 3, 하루 최대 50
  const DAY_STAR_MAX = 50, DAY_BONUS = 3;
  function giveStars(n) { if (!n) return 0; n = Math.min(n, Math.max(0, DAY_STAR_MAX - DAY_BONUS - todayLog().stars)); if (n > 0) { S.stars += n; L && (L.earned += n); todayLog().stars += n; save(); const el = document.querySelector('.stars'); if (el) el.textContent = `⭐ ${S.stars}`; } return n; }
  function award(solved) {
    const key = `${L.s}:${L.i}`;
    let n = solved ? 1 : 0;
    if (L.awarded[key]) n = 0;
    L.awarded[key] = 1;
    return giveStars(n);
  }
  function flash(emoji) { const f = document.createElement('div'); f.className = 'feedback'; f.innerHTML = `<span>${emoji}</span>`; document.body.appendChild(f); setTimeout(() => f.remove(), 950); }
  function markWeak(prog, n) { for (const t of BK.typesIn(BK.parseProg(prog))) if (!BK.isHat(t)) S.weak[t] = (S.weak[t] || 0) + n; save(); }

  function lessonFrame(inner, opts = {}) {
    const total = L.acts.length; const p = Math.round(L.i / total * 100);
    return `<div class="screen lesson${opts.wide ? ' wide' : ''}">
      <div class="topbar">
        <button class="icon-btn" data-act="quit" aria-label="처음으로">🏠</button>
        <button class="icon-btn" data-act="prev" aria-label="이전 문제"${L.s === 0 && L.i === 0 ? ' disabled style="opacity:.35"' : ''}>◀</button>
        <div class="train">${STEPS.map((st, i) => `<div class="car${i < L.s ? ' done' : i === L.s ? ' now' : ''}" style="--p:${p}%">${i === L.s ? '<i></i>' : ''}</div>`).join('')}</div>
        <div class="stars">⭐ ${S.stars}</div>
      </div>
      <div class="step-name">${U[L.u].bg} ${esc(U[L.u].title)} ${L.d}일차 · ${STEPS[L.s].name}</div>
      ${inner}
    </div>`;
  }
  const baseHandlers = () => ({ quit: homeScreen, prev: prevAct });
  function prevAct() { // 이전 문제로 (단계 첫 문제면 앞 단계 마지막 문제로, 공통 17)
    hush();
    let s = L.s, i = L.i, acts = L.acts;
    do {
      if (i > 0) i--;
      else if (s > 0) { s--; acts = buildStep(L.u, L.d, s); i = acts.length - 1; }
      else return;
    } while (acts[i].type === 'msg' && (i > 0 || s > 0));
    if (acts[i].type === 'msg') return;
    L.s = s; L.i = i; L.acts = acts; S.pos.s = s; save();
    showAct();
  }
  function showAct() {
    L.intro = false; const a = L.acts[L.i];
    ({ greet: actGreet, msg: actMsg, learn: actLearn, mission: actMission, free: actFree })[a.type](a);
  }

  function actMsg(a) {
    render('lesson', lessonFrame(`<div class="stage"><div class="prompt"><div class="robot">${leader().img}</div><div class="bubble">${esc(a.text)}</div></div>
      <div class="next-row"><button class="btn primary" data-act="next">좋아요 ▶</button></div></div>`), { ...baseHandlers(), next: nextAct });
    const my = actToken; ko(a.text.replace(/[^\p{L}\p{N}\s!?.,]/gu, '')).then(() => sleep(600)).then(() => { if (my === actToken) nextAct(); });
  }

  /* --- 1. 인사: 오늘 이야기 --- */
  function actGreet() {
    const up = U[L.u]; const day = up.days[L.d - 1]; const m0 = (day.m || [])[0]; const f = m0 && m0.f;
    const story = m0 ? fillSay(m0.say, f) : `오늘은 ${up.thing}!`;
    const nb = (day.unlock || []).map(t => B[t].icon + ' ' + B[t].name).join(', ');
    render('lesson', lessonFrame(`<div class="stage"><div class="prompt">
        <div class="robot">${up.bg}</div>
        <div class="bubble">${esc(up.title)} ${L.d}일차<small>${esc(story)}</small></div>
        <div class="row" style="flex-wrap:wrap;justify-content:center">${f ? friendHtml(f, true) : ''}<span class="chip">🏅 레벨 ${level()}</span><span class="chip">🧩 미션 ${missionsOf(L.u, L.d).length + (reviewMission(L.u, L.d) ? 1 : 0)}개</span>${nb ? `<span class="chip">✨ 새 블록: ${esc(nb)}</span>` : ''}</div>
      </div>
      <div class="next-row"><button class="btn primary" data-act="next">시작! ▶</button></div></div>`), { ...baseHandlers(), next: nextAct });
    const my = actToken;
    (async () => { await ko(`안녕, ${childName()}! 오늘은 ${up.title} ${L.d}일차야.`); if (my !== actToken) return; await ko(story); })();
  }

  /* --- 3. 새 블록: 보여주고 따라 놓기 (CREQ-50·67) --- */
  function actLearn(a) {
    const t = a.t; const d = B[t]; const isHat = BK.isHat(t);
    const demoProg = isHat ? [t, 'right:2'] : t === 'repeat' ? ['flag', 'repeat:3[right:1]'] : d.n ? ['flag', t + ':2'] : ['flag', 'right:2', t];
    const target = BK.parseProg(demoProg);
    const distract = unlockedUpTo(L.u, L.d).filter(x => x !== t && !BK.isHat(x) && x !== 'right').slice(-1);
    const palette = [t, 'right', ...distract].filter((x, i, arr) => arr.indexOf(x) === i);
    const mapDemo = ['........', '........', 'S.......', '........', '........'];
    let fails = 0, closed = false;
    render('lesson', lessonFrame(`<div class="mz">
        <div class="mcol">
          <div class="say"><span class="who">${leader().img}</span><span class="text">새 블록! <b>${d.icon} ${esc(d.name)}</b><br><small>${esc(d.d)}</small></span></div>
          <div class="stage-box" id="stage"></div>
          <div class="row" style="justify-content:center;gap:10px"><button class="btn small" data-act="demo">▶ 보여줘</button><button class="btn small" data-act="say">🔊 설명 듣기</button></div>
        </div>
        <div class="mcol">
          <div class="bubble sm">똑같이 놓아 봐! <span class="muted">(정답: ${target.map(n => n.t === 'flag' ? '🚩' : B[n.t].icon + (n.n ? n.n : '')).join(' ')})</span></div>
          <div class="ws" id="ws"></div>
          <div class="row" style="justify-content:center;gap:10px"><button class="btn primary" data-act="run">▶ 실행</button><div class="hint" id="hint"></div></div>
        </div>
      </div>`, { wide: true }), {
      ...baseHandlers(),
      demo: async () => { hush(); stage.reset(); await stage.run({ lead: target }, isHat ? t : 'flag'); },
      say: () => { hush(); ko(`${d.name}. ${d.d}`); },
      run: async () => {
        if (closed) return; hush(); const my = actToken;
        const prog = ws.get();
        stage.reset(); await stage.run({ lead: prog }, BK.hatOf(prog) || 'flag'); if (my !== actToken) return;
        if (BK.same(prog, target)) {
          closed = true; ding(); const n = award(true); flash(n ? '⭐' : '👍');
          S.learned[t] = S.learned[t] || today(); S.level = level(); save();
          await ko(`${praise()} ${d.name} 블록을 배웠어!`); if (my === actToken) nextAct();
        } else {
          fails++; boop(); markWeak([t], 1);
          if (fails === 1) { ws.highlight(t); setHint(`${d.icon} 블록을 끌어와요`); await ko(`${d.name} 블록을 찾아서 끌어와 봐`); }
          else { ws.showGhost(target); setHint('흰 자리와 똑같이 놓아요'); await ko('흰 자리를 보고 똑같이 놓아 봐'); if (fails >= 3) revealNext(() => { award(false); nextAct(); }); }
        }
      },
    });
    stage = BK.Stage(document.getElementById('stage'), { map: mapDemo, legend: {}, chars: [{ id: 'lead', x: 0, y: 2, img: leader().img }], theme: U[L.u].theme, dark: U[L.u].dark, tray: false, speed: speedMs(), onPop: popSound, onBump: boop });
    ws = BK.Workspace(document.getElementById('ws'), { palette: palette, prog: isHat ? [] : BK.parseProg(['flag']), lockHat: !isHat, onSpeak: speakBlock });
    L.setProg = (id, arr) => ws.set(BK.parseProg(arr)); L.target = demoProg; // 테스트용
    const my = actToken;
    (async () => { await ko(`새 블록이야! ${d.name}. ${d.d}`); if (my !== actToken) return; stage.reset(); await stage.run({ lead: target }, isHat ? t : 'flag'); if (my !== actToken) return; await ko('이제 똑같이 놓아 봐!'); })();
  }
  function setHint(t) { const h = document.getElementById('hint'); if (h) h.textContent = t; }
  function speakBlock(t) { hush(); ko(`${B[t].name}. ${B[t].d}`); }
  const speedMs = () => (S.settings.speed === 'slow' ? 650 : 420);
  function revealNext(onSkip) { // 공통 64: 정답을 보여준 뒤 "다음 ▶" (넘어가면 별 0)
    const row = document.querySelector('.ws'); if (!row || document.querySelector('[data-act=skipnext]')) return;
    row.insertAdjacentHTML('afterend', '<div class="next-row reveal-next"><span class="muted">정답대로 놓고 실행하면 별을 받아요</span><button class="btn primary" data-act="skipnext">다음 ▶</button></div>');
    H.skipnext = () => { hush(); onSkip(); };
  }

  /* --- 2·4. 미션 (CREQ-54·55·64) --- */
  function actMission(a) {
    const m = a.m; const up = U[a.u]; const f = m.f;
    const chars = (m.chars || [{ id: 'lead', at: 'S', sol: m.sol }]);
    const findAt = ch => { for (let y = 0; y < C.H; y++) { const x = (m.map[y] || '').indexOf(ch); if (x >= 0) return { x, y }; } return { x: 0, y: 2 }; };
    const charDefs = chars.map(c => { const p = findAt(c.at); const fr = C.friends[c.id]; return { id: c.id, x: p.x, y: p.y, img: c.id === 'lead' ? leader().img : fr.img, name: c.id === 'lead' ? leaderName() : fr.name }; });
    const map = m.map.map(r => r.replace(/[A-Z]/g, '.'));
    const sols = {}; chars.forEach(c => { sols[c.id] = BK.parseProg(c.sol); });
    const progs = {}; chars.forEach(c => { progs[c.id] = a.fix && c.given ? BK.parseProg(c.given) : BK.parseProg([c.hat || 'flag']); });
    if (a.fix && !m.chars) progs.lead = BK.parseProg(m.given);
    const palette = BK.paletteFor(m, unlockedUpTo(L.u, L.d));
    let cur = chars[0].id; let fails = 0, closed = false;
    const title = a.review ? '🔁 복습 미션' : a.fix ? '🔧 고치기 미션' : '🧩 미션';
    const say = fillSay(m.say, f);
    render('lesson', lessonFrame(`<div class="mz">
        <div class="mcol">
          <div class="say">${f ? friendHtml(f, true) : `<span class="who">${leader().img}</span>`}<span class="text"><b>${title} · ${esc(m.name)}</b><br>${esc(say)}</span><button class="listen sm" data-say="${esc(say)}">🔊</button></div>
          <div class="stage-box" id="stage"></div>
          <div class="goalbar">${m.order ? `<span class="muted">순서:</span>${m.order.map(k => `<span class="gi">${m.legend[k]}</span>`).join('<span class="muted">→</span>')}` : `<span class="muted">모을 것:</span>${Object.values(m.legend).map(v => `<span class="gi">${v}</span>`).join('')}`}${(m.need || []).map(t => `<span class="gi">${B[t].icon}</span>`).join('')}${m.max ? `<span class="muted">· 블록 ${m.max}개로</span>` : ''}</div>
        </div>
        <div class="mcol">
          ${chars.length > 1 ? `<div class="ctabs">${charDefs.map(c => `<button class="ctab${c.id === cur ? ' on' : ''}" data-act="ctab" data-arg="${c.id}">${c.img} ${esc(c.name)}</button>`).join('')}</div>` : ''}
          <div class="ws" id="ws"></div>
          <div class="row" style="justify-content:center;gap:10px"><button class="btn primary" data-act="run">▶ 실행</button><button class="btn" data-act="reset">↺ 다시</button><div class="hint" id="hint"></div></div>
        </div>
      </div>`, { wide: true }), {
      ...baseHandlers(),
      ctab: id => { progs[cur] = ws.get(); cur = id; document.querySelectorAll('.ctab').forEach(b => b.classList.toggle('on', b.dataset.arg === id)); ws.set(progs[cur]); ws.lockHat = true; },
      reset: () => { hush(); stage.reset(); setHint(''); },
      run: () => runMission('flag'),
    });
    stage = BK.Stage(document.getElementById('stage'), { map, legend: m.legend, chars: charDefs, theme: up.theme, dark: up.dark, speed: speedMs(), onPop: popSound, onBump: boop, onCollect: () => tone([660, 990], 0.08) });
    ws = BK.Workspace(document.getElementById('ws'), { palette, prog: progs[cur], lockHat: true, onSpeak: speakBlock, onChange: p => { progs[cur] = p; } });
    // 무대 캐릭터 톡 → 그 캐릭터의 "나를 톡 하면" 프로그램 실행
    stage.root.addEventListener('click', e => { const el = e.target.closest('[data-char]'); if (el && !closed) runMission('tap', el.dataset.char); });
    L.setProg = (id, arr) => { progs[id] = BK.parseProg(arr); if (id === cur) ws.set(progs[cur]); }; L.run = runMission; // 테스트용
    async function runMission(trigger, who) {
      if (closed) return; hush(); const my = actToken; progs[cur] = ws.get();
      if (trigger === 'flag') { stage.reset(); setHint(''); }
      if (trigger === 'tap') { if (!progs[who] || BK.hatOf(progs[who]) !== 'tap') return; await stage.runOne(who, progs, 'tap'); }
      else await stage.run(progs, 'flag');
      if (my !== actToken) return;
      const r = BK.judge(m, stage, progs);
      if (r.ok) {
        closed = true; ding(); const n = award(true); flash(n ? '⭐' : '👍'); confettiSmall();
        if (!a.review) { const key = `${a.u}-${a.d}`; if (!S.stickers[key] && a.idx === missionsOf(a.u, a.d).length - 1) { S.stickers[key] = { img: up.days[a.d - 1].sticker, name: `${up.title} ${a.d}일차 · ${m.name}`, date: today(), from: m.name }; } }
        save();
        await ko(`${praise()} ${up.thing}에 한 걸음 더!`); if (my === actToken) nextAct();
        return;
      }
      // 톡 미션: 아직 톡 안 한 친구가 있으면 기다려요 (실패 아님)
      if (r.why === 'more' && trigger === 'flag' && chars.some(c => c.hat === 'tap')) { setHint(`${charDefs.find(c => c.id !== 'lead').name}를 톡 해 봐!`); await ko('이제 친구를 톡 해 봐!'); return; }
      if (r.why === 'more' && trigger === 'tap') { return; }
      fails++; boop(); const at = Number(S.settings.hintAt) || 2;
      if (fails >= at) { markWeak(m.sol, 1); S.hints[a.u] = (S.hints[a.u] || 0) + 1; save(); }
      const why = r.why === 'order' ? '순서가 달라! 순서를 잘 봐.' : r.why === 'need' ? `${B[r.need].name} 블록을 꼭 써야 해.` : r.why === 'tap' ? '친구는 톡 해서 움직여야 해.' : r.why === 'max' ? `블록 ${r.max}개로 해 볼까? 반복 블록을 써 봐.` : pick(C.lines.retry);
      setHint(why);
      if (fails === 1) { const need = firstMissing(sols[cur], progs[cur]); if (need) ws.highlight(need); await ko(why); }
      else if (fails === 2) { ws.showGhost(sols[cur]); await ko(`${why} 흰 자리를 보고 놓아 봐`); }
      else { ws.showGhost(sols[cur]); revealNext(() => { award(false); nextAct(); }); await ko('정답을 보여줄게. 똑같이 놓고 실행하면 별을 받아!'); }
    }
    const my = actToken;
    (async () => { if (!L.heard.mission) { L.heard.mission = 1; await ko('블록을 끌어다 붙이고 실행을 눌러 봐!'); } if (my !== actToken) return; await ko(say); })();
  }
  function firstMissing(sol, prog) { const have = BK.typesIn(prog); for (const t of BK.typesIn(sol)) if (!have.has(t) && !BK.isHat(t)) return t; return null; }
  function confettiSmall() { const em = ['⭐', '✨']; for (let i = 0; i < 10; i++) { const c = document.createElement('div'); c.className = 'confetti'; c.textContent = pick(em); c.style.left = Math.random() * 100 + 'vw'; c.style.animationDuration = 1.2 + Math.random() + 's'; document.body.appendChild(c); setTimeout(() => c.remove(), 2600); } }

  /* --- 5. 자유 만들기 (CREQ-56): 오늘 무대 + 캐릭터 + 소품 + 해금 블록 전부 --- */
  function actFree() { freeScreen({ lesson: true }); }
  function freeScreen(opt) {
    const w = opt.work; const u = w ? w.u : L.u;
    const up = U[u]; const unlocked = w ? unlockedUpTo(u, DAYS) : unlockedUpTo(L.u, L.d);
    const palette = unlocked.filter(t => !['recv', 'send', 'page', 'touch', 'rec'].includes(t) || unlocked.includes(t));
    let chars = w ? w.chars.map(c => ({ ...c })) : [{ id: 'lead', x: 1, y: 2 }];
    const progs = w ? Object.fromEntries(Object.entries(w.progs).map(([k, v]) => [k, BK.parseProg(v)])) : { lead: BK.parseProg(['flag']) };
    let items = w ? w.items.slice() : [];
    let cur = chars[0].id; let saved = !!w;
    const imgOf = id => (id === 'lead' ? leader().img : C.friends[id].img);
    const nameOf = id => (id === 'lead' ? leaderName() : C.friends[id].name);
    const build = () => {
      const html = `<div class="mz free">
        <div class="mcol">
          <div class="say"><span class="who">${leader().img}</span><span class="text"><b>🎨 자유 만들기 · ${esc(up.title)}</b><br>${w ? '내 작품이야. 고쳐서 다시 저장할 수도 있어.' : '오늘 무대에서 마음대로 만들어 봐! 친구와 소품을 넣고, 블록을 붙이고, 실행!'}</span></div>
          <div class="stage-box" id="stage"></div>
          <div class="proprow"><span class="muted">친구:</span>${Object.keys(C.friends).map(id => `<button class="pchip${chars.some(c => c.id === id) ? ' on' : ''}" data-act="addchar" data-arg="${id}">${C.friends[id].img}</button>`).join('')}<span class="muted">소품:</span>${up.props.map(p => `<button class="pchip" data-act="addprop" data-arg="${esc(p)}">${p}</button>`).join('')}</div>
        </div>
        <div class="mcol">
          <div class="ctabs">${chars.map(c => `<button class="ctab${c.id === cur ? ' on' : ''}" data-act="ctab" data-arg="${c.id}">${imgOf(c.id)} ${esc(nameOf(c.id))}</button>`).join('')}</div>
          <div class="ws" id="ws"></div>
          <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap"><button class="btn primary" data-act="run">▶ 실행</button><button class="btn" data-act="reset">↺ 처음 자리</button>
            ${opt.lesson ? '<button class="btn good" data-act="done">💾 다 만들었어요</button>' : '<button class="btn good" data-act="save">💾 저장</button>'}<div class="hint" id="hint"></div></div>
        </div>
      </div>`;
      if (opt.lesson) render('lesson', lessonFrame(html, { wide: true }), handlers());
      else render('free', `<div class="screen lesson wide"><div class="topbar"><button class="icon-btn" data-act="quit" aria-label="내 작품으로">⬅️</button><h2 class="title">🎨 ${esc(w && w.title || up.title)}</h2><div class="spacer"></div><div class="stars">⭐ ${S.stars}</div></div>${html}</div>`, handlers());
      mount();
    };
    const mapFree = () => { const rows = Array.from({ length: C.H }, () => '.'.repeat(C.W).split('')); const legend = {}; items.forEach((it, i) => { const ch = String.fromCharCode(97 + (i % 26)); rows[it.y][it.x] = ch; legend[ch] = it.img; }); return { map: rows.map(r => r.join('')), legend }; };
    const mount = () => {
      const mf = mapFree();
      stage = BK.Stage(document.getElementById('stage'), { map: mf.map, legend: mf.legend, chars: chars.map(c => ({ ...c, img: imgOf(c.id), name: nameOf(c.id) })), theme: up.theme, dark: up.dark, tray: false, speed: speedMs(), onPop: popSound, onBump: boop });
      ws = BK.Workspace(document.getElementById('ws'), { palette: [...palette, 'flag', 'tap'].filter((x, i, a) => a.indexOf(x) === i && unlocked.includes(x)), prog: progs[cur], lockHat: false, onSpeak: speakBlock, onChange: p => { progs[cur] = p; saved = false; } });
      stage.root.addEventListener('click', e => { const el = e.target.closest('[data-char]'); if (!el) return; const id = el.dataset.char; if (progs[id] && BK.hatOf(progs[id]) === 'tap') { hush(); stage.runOne(id, progs, 'tap'); } else { cur = id; document.querySelectorAll('.ctab').forEach(b => b.classList.toggle('on', b.dataset.arg === id)); ws.set(progs[cur]); } });
      if (L) L.setProg = (id, arr) => { progs[id] = BK.parseProg(arr); if (id === cur) ws.set(progs[cur]); }; // 테스트용
    };
    const emptyCell = () => { const used = new Set(chars.map(c => `${c.x},${c.y}`).concat(items.map(i => `${i.x},${i.y}`))); const free = []; for (let y = 0; y < C.H; y++) for (let x = 0; x < C.W; x++) if (!used.has(`${x},${y}`)) free.push({ x, y }); return free.length ? pick(free) : null; };
    const doSave = async () => {
      progs[cur] = ws.get();
      const rec = { date: today(), u, title: `${up.title} ${w ? '' : L.d + '일차'}`.trim(), chars: chars.map(c => ({ id: c.id, x: c.x, y: c.y })), progs: Object.fromEntries(Object.entries(progs).map(([k, v]) => [k, BK.toStr(v).split(',').filter(Boolean)])), items };
      // toStr는 반복 안을 ,로 잇기 때문에 대괄호 단위로 다시 나눠요
      rec.progs = Object.fromEntries(Object.entries(progs).map(([k, v]) => [k, splitProg(BK.toStr(v))]));
      if (opt.idx != null) S.works[opt.idx] = rec; else S.works.push(rec);
      saved = true;
      let n = 0; if (S.freeDay !== today()) { S.freeDay = today(); n = giveStars(2); }
      save(); ding(); flash(n ? '⭐⭐' : '💾');
      await ko(n ? '작품을 저장했어! 별 두 개!' : '작품을 저장했어!');
    };
    const handlers = () => ({
      ...(opt.lesson ? baseHandlers() : { quit: worksScreen }),
      ctab: id => { progs[cur] = ws.get(); cur = id; document.querySelectorAll('.ctab').forEach(b => b.classList.toggle('on', b.dataset.arg === id)); ws.set(progs[cur]); },
      addchar: id => { progs[cur] = ws.get(); const i = chars.findIndex(c => c.id === id); if (i >= 0) { if (chars.length <= 1) return; chars.splice(i, 1); delete progs[id]; if (cur === id) cur = chars[0].id; } else { if (chars.length >= 4) { toast('캐릭터는 4명까지예요'); return; } const p = emptyCell(); if (!p) return; chars.push({ id, ...p }); progs[id] = BK.parseProg(['tap']); cur = id; } saved = false; build(); },
      addprop: img => { const p = emptyCell(); if (!p) return; items.push({ ...p, img }); if (items.length > 12) items.shift(); saved = false; progs[cur] = ws.get(); build(); },
      reset: () => { hush(); stage.reset(); },
      run: async () => { hush(); progs[cur] = ws.get(); stage.reset(); await stage.run(progs, 'flag'); },
      save: doSave,
      done: async () => { const my = actToken; await doSave(); if (my === actToken) nextAct(); },
    });
    build();
    if (opt.lesson && !L.heard.free) { L.heard.free = 1; ko('마지막은 자유 만들기! 친구랑 소품을 넣고 마음대로 만들어 봐. 다 만들면 저장 버튼!'); }
  }
  function splitProg(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '[') d++; if (ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; }

  /* ================= 하루 끝 ================= */
  function confetti() {
    const em = ['⭐', '🌟', '🎉', '✨'];
    for (let i = 0; i < 24; i++) { const c = document.createElement('div'); c.className = 'confetti'; c.textContent = pick(em); c.style.left = Math.random() * 100 + 'vw'; c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * .6 + 's'; document.body.appendChild(c); setTimeout(() => c.remove(), 4200); }
  }
  function finishDay() {
    const { u, d } = L; const up = U[u];
    S.done[`${u}-${d}`] = today();
    const dk = `${u}-${d}`; if (!S.stickers[dk]) S.stickers[dk] = { img: up.days[d - 1].sticker, name: `${up.title} ${d}일차`, date: today(), from: `${d}일차 미션` };
    let unitSticker = false;
    if (doneCount(u) >= DAYS && !S.stickers[`${u}-x`]) { S.stickers[`${u}-x`] = { img: up.sticker, name: `${up.thing} 완성`, date: today(), from: up.title }; unitSticker = true; }
    let nu = u, nd = d + 1; if (nd > DAYS) { nd = 1; nu = (u + 1) % U.length; }
    S.pos = { u: nu, d: nd, s: 0 };
    const bonus = Math.max(0, Math.min(DAY_BONUS, DAY_STAR_MAX - todayLog().stars));
    S.stars += bonus; L.earned += bonus; todayLog().stars += bonus;
    const lvUp = level() > L.levelBefore; S.level = level(); save();
    render('reward', `<div class="screen"><div class="reward">
      <div class="friends">${Object.keys(C.friends).map(id => friendHtml(id, true)).join('')}</div>
      <div class="bubble">오늘 블록 놀이 끝! 정말 잘했어, ${esc(childName())}!<small>내일 또 만나요 👋</small></div>
      <div class="big-stars">⭐ +${L.earned}</div>
      ${bonus ? `<div class="muted" style="font-weight:800;margin-top:-10px">끝까지 한 보너스 ⭐${bonus} 포함</div>` : ''}
      ${lvUp ? `<div class="sticker-new">🏅</div><div class="bubble">레벨 ${level()}이 됐어요!<small>배운 블록 ${level()}개</small></div>` : ''}
      <div class="sticker-new">${S.stickers[dk].img}</div><div class="bubble">${esc(up.title)} ${d}일차 스티커를 받았어요!</div>
      ${unitSticker ? `<div class="sticker-new">${up.sticker}</div><div class="bubble">${esc(up.thing)} 완성! 단원 스티커도 받았어요 🏆</div>` : ''}
      <div class="home-links">
        <button class="btn" data-act="stickers">📒 스티커북</button>
        <button class="btn" data-act="works">🎨 내 작품</button>
        <button class="btn primary" data-act="home">끝!</button>
      </div>
    </div></div>`, { home: homeScreen, stickers: () => stickerScreen(u), works: worksScreen });
    confetti(); tone([523, 659, 784, 1046], 0.16);
    ko(`오늘 블록 놀이 끝! 정말 잘했어, ${childName()}. ${lvUp ? `레벨 ${level()}이 됐어!` : ''} 스티커도 받았어! ${unitSticker ? `${up.thing} 완성!` : '내일 또 만나!'}`);
  }

  /* ================= 아빠 화면 공통: 암호(61)·통계(62)·탭(63) — 세 앱 같은 코드 (plan/0_COMMON_spec.md 5-1) ================= */
  const DEFAULT_PIN = '1234';
  const parentPin = () => String(S.settings.parentPin || DEFAULT_PIN);
  const PARENT_SCREENS = ['gate', 'pinreset', 'parent', 'rewardadmin', 'spec'];
  setInterval(() => { if (!document.hidden && screen && !PARENT_SCREENS.includes(screen)) { const l = todayLog(); l.app = (l.app || 0) + 10; save(); } }, 10000);
  const gateFocus = () => setTimeout(() => { const i = document.getElementById('ans'); if (i) { i.focus(); i.addEventListener('keydown', e => { if (e.key === 'Enter') H.ok(); }); } }, 50);
  function gateScreen(next) {
    render('gate', `<div class="screen"><div class="topbar"><button class="icon-btn" data-act="home">🏠</button></div>
      <div class="gate"><div class="card"><b>🔒 아빠 화면 암호</b><p class="muted">암호를 입력하세요</p>
      <input id="ans" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" aria-label="암호">
      <button class="btn primary" data-act="ok">확인</button>
      <button class="btn small" data-act="forgot">암호를 잊었어요</button></div></div></div>`, {
      home: homeScreen,
      ok: () => {
        const i = document.getElementById('ans');
        if (i && i.value.trim() && i.value.trim() === parentPin()) { pTab = 'summary'; const t = document.getElementById('toast'); if (t) t.classList.remove('show'); next(); }
        else { toast('암호가 달라요'); if (i) { i.value = ''; i.focus(); } }
      },
      forgot: () => pinResetScreen(next),
    });
    gateFocus();
  }
  function pinResetScreen(next) {
    const a = 12 + Math.floor(Math.random() * 28), b = 12 + Math.floor(Math.random() * 18);
    render('pinreset', `<div class="screen"><div class="topbar"><button class="icon-btn" data-act="home">🏠</button></div>
      <div class="gate"><div class="card"><b>암호 되돌리기 (어른 확인)</b><p class="muted">맞히면 암호가 ${DEFAULT_PIN}로 돌아가요</p>
      <div style="font-size:40px;font-weight:900">${a} × ${b} = ?</div>
      <input id="ans" inputmode="numeric" autocomplete="off"><button class="btn primary" data-act="ok">확인</button>
      <button class="btn small" data-act="back">암호 입력으로</button></div></div></div>`, {
      home: homeScreen, back: () => gateScreen(next),
      ok: () => {
        if (+document.getElementById('ans').value === a * b) { S.settings.parentPin = DEFAULT_PIN; save(); pTab = 'settings'; next(); toast(`암호를 ${DEFAULT_PIN}로 되돌렸어요. 새 암호로 바꿔 주세요`); }
        else { toast('다시 계산해 보세요'); pinResetScreen(next); }
      },
    });
    gateFocus();
  }
  const PTABS = [['summary', '📊', '요약'], ['stats', '📈', '통계'], ['reward', '🎁', '보상·별'], ['progress', '📚', '학습·진도'], ['settings', '⚙️', '설정'], ['manage', '🛠️', '백업·업데이트']];
  let pTab = 'summary';
  const ptabBar = () => `<nav class="ptabs" role="tablist" aria-label="아빠 화면 메뉴">${PTABS.map(([k, i, n]) => `<button class="ptab${pTab === k ? ' on' : ''}" role="tab" aria-selected="${pTab === k}" data-act="ptab" data-arg="${k}"><span aria-hidden="true">${i}</span>${n}</button>`).join('')}</nav>`;
  const ptabPanel = (k, html) => `<section class="ppanel" role="tabpanel" data-panel="${k}"${pTab === k ? '' : ' hidden'}>${html}</section>`;
  function ptabSwitch(k) {
    if (!PTABS.some(t => t[0] === k)) return; pTab = k;
    document.querySelectorAll('.ptab').forEach(b => { const on = b.dataset.arg === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    document.querySelectorAll('.ppanel').forEach(p => { p.hidden = p.dataset.panel !== k; });
    window.scrollTo(0, 0); ptabReveal(true);
  }
  function ptabReveal(smooth) { const on = document.querySelector('.ptab.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' }); }
  let statDays = 7;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function statRows(n) { const out = []; for (let i = 0; i < n; i++) { const d = addDays(-i); const l = S.log[d] || {}; out.push({ d, min: Math.round((l.sec || 0) / 60), app: l.app != null ? Math.round(l.app / 60) : null, stars: l.stars || 0 }); } return out; }
  function statsCard() {
    const rows = statRows(statDays); const act = rows.filter(r => r.min > 0 || r.stars > 0); const td = today();
    const totMin = rows.reduce((s, r) => s + r.min, 0), totStar = rows.reduce((s, r) => s + r.stars, 0), maxStar = Math.max(0, ...rows.map(r => r.stars));
    const avg = act.length ? Math.round(totMin / act.length) : 0;
    const maxMin = Math.max(Number(S.settings.dailyLimit) || 20, ...rows.map(r => r.min), 1);
    const dl = d => { const x = new Date(d + 'T12:00:00'); return `${x.getMonth() + 1}/${x.getDate()} (${WD[x.getDay()]})`; };
    return `<div class="card" id="statsCard"><h3>📈 날짜별 학습 시간·얻은 별</h3>
      <div class="row stat-range">${[7, 14, 30].map(n => `<button class="btn small${statDays === n ? ' primary' : ''}" data-act="statdays" data-arg="${n}">최근 ${n}일</button>`).join('')}</div>
      <div class="kv" style="margin-top:12px"><div>학습한 날<b>${act.length}일</b></div><div>총 학습 시간<b>${totMin}분</b></div><div>하루 평균<b>${avg}분</b></div><div>얻은 별<b>${totStar}개</b></div><div>하루 최고 별<b>${maxStar}개</b></div></div>
      <ul class="stat-list">${rows.map(r => `<li class="stat-row${r.d === td ? ' today' : ''}${r.min || r.stars ? '' : ' empty'}" data-date="${r.d}"><span class="stat-date">${dl(r.d)}${r.d === td ? ' · 오늘' : ''}</span>
        <div class="stat-bars"><div class="stat-bar min"><i style="width:${Math.min(100, Math.round(r.min / maxMin * 100))}%"></i><b>⏱️ ${r.min}분</b>${r.app != null && r.app > r.min ? `<small>앱 켠 시간 ${r.app}분</small>` : ''}</div>
        <div class="stat-bar star"><i style="width:${Math.min(100, Math.round(r.stars / DAY_STAR_MAX * 100))}%"></i><b>⭐ ${r.stars}개</b></div></div></li>`).join('')}</ul>
      <p class="muted">학습 시간은 문제 푸는 화면에 있던 시간이에요 (하루 시간 제한 ${esc(S.settings.dailyLimit)}분과 같은 기준). “앱 켠 시간”은 아빠 화면을 뺀 전체 시간이에요. 별은 그날 미션·자유 만들기·하루 끝 보너스로 얻은 별이에요 (하루 최대 ${DAY_STAR_MAX}개, 아빠가 조정한 별은 빼요).</p></div>`;
  }
  function pinCard() {
    const isDef = parentPin() === DEFAULT_PIN;
    return `<div class="card" id="pinCard"><h3>🔒 아빠 화면 암호</h3>
      <p>${isDef ? `⚠️ 지금은 기본 암호(<b>${DEFAULT_PIN}</b>)예요. 윤이가 모르는 암호로 바꿔 주세요.` : '✅ 새 암호가 설정되어 있어요.'}</p>
      <div class="form"><label>새 암호 (숫자 4~8자리)<input id="pinNew" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label>
        <label>새 암호 한 번 더<input id="pinNew2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label></div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn small primary" data-act="setpin">암호 바꾸기</button></div>
      <p class="muted">암호를 잊으면 암호 화면의 “암호를 잊었어요”에서 어른용 곱셈 문제를 풀어 ${DEFAULT_PIN}로 되돌릴 수 있어요. 전체 초기화를 해도 ${DEFAULT_PIN}로 돌아가요.</p></div>`;
  }
  function setPin() {
    const a = ((document.getElementById('pinNew') || {}).value || '').trim(), b = ((document.getElementById('pinNew2') || {}).value || '').trim();
    if (!/^\d{4,8}$/.test(a)) return toast('숫자 4~8자리로 적어주세요');
    if (a !== b) return toast('두 번 적은 암호가 달라요');
    S.settings.parentPin = a; save(); parentScreen(); toast('암호를 바꿨어요');
  }
  const parentCommonHandlers = () => ({ ptab: k => ptabSwitch(k), statdays: n => { statDays = +n || 7; parentScreen(); }, setpin: setPin });
  function restore(txt) {
    txt = String(txt || '').trim(); let o = null;
    try { o = JSON.parse(txt); } catch (e) { try { o = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e2) { o = null; } }
    if (!o || !o.pos) return false;
    const d = defaults(); S = Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) }); save(); return true;
  }
  /* 새 버전 확인·적용 (공통 23) */
  const verNum = v => String(v || '0').split('.').map(Number);
  const isNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  let latestVer = null;
  async function checkUpdate() {
    const r = await fetch('app.js?check=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('fetch');
    const m = (await r.text()).match(/APP_VERSION = '([\d.]+)'/);
    latestVer = m ? m[1] : null; return latestVer;
  }
  async function applyUpdate() {
    toast('새 버전을 받는 중이에요…');
    const files = ['./', 'index.html', 'app.js', 'blocks.js', 'content.js', 'style.css', 'sw.js', 'manifest.webmanifest', 'audio-ko/index.json', '기획서.md'];
    try { await Promise.all(files.map(u => fetch(encodeURI(u), { cache: 'reload' }).catch(() => {}))); } catch (e) { /* */ }
    try { if (navigator.serviceWorker) for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister(); } catch (e) { /* */ }
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* */ }
    location.replace(location.pathname + '?v=' + Date.now());
  }
  /* 기획·변경 기록 (공통 21): 앱 안의 기획서.md */
  function mdToHtml(md) {
    const inl = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
    const out = []; const lines = md.split('\n'); let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l.startsWith('```')) { const buf = []; i++; while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]); i++; out.push(`<pre class="spec-code">${esc(buf.join('\n'))}</pre>`); continue; }
      if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; out.push(`<h${n + 1}>${inl(l.replace(/^#+ /, ''))}</h${n + 1}>`); i++; continue; }
      if (l.startsWith('|')) {
        const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const body = rows.filter((r, k) => k !== 1);
        out.push(`<div class="spec-table"><table>${body.map((r, k) => `<tr>${cells(r).map(c => k === 0 ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</table></div>`); continue;
      }
      if (/^(- |\d+\. )/.test(l)) {
        const ol = /^\d+\. /.test(l); const items = [];
        while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, ''));
        out.push(`<${ol ? 'ol' : 'ul'} class="list">${items.map(x => `<li>${inl(x)}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`); continue;
      }
      if (l.trim()) out.push(`<p>${inl(l)}</p>`);
      i++;
    }
    return out.join('');
  }
  /* 아빠: 받은 보상 관리 (공통 60) */
  function rewardAdminScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const rows = S.rewards.map((r, i) => ({ r, i })).reverse();
    const row = ({ r, i }) => `<li class="rw-row${r.used ? ' rw-used' : ''}">
        <div class="rw-info"><b>${r.used ? '✅' : '🎁'} ${esc(r.text)}</b><small>${esc(r.date)} 받음 · 별 ${r.stars}개${r.used ? ` · ${esc(r.used)} 사용` : ''}</small></div>
        <button class="btn small rw-check${r.used ? ' on' : ''}" data-act="usedrw" data-arg="${i}" aria-pressed="${r.used ? 'true' : 'false'}">${r.used ? '✅ 사용완료 (취소하려면 누르기)' : '☐ 사용완료 체크'}</button>
        <button class="btn small" data-act="delrw" data-arg="${i}">삭제</button></li>`;
    render('rewardadmin', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="아빠 화면으로">⬅️</button><h2 class="title">🎁 받은 보상 관리</h2></div>
      <div class="card"><h3>지금 목표: ${esc(S.settings.goalText)}</h3>
        <div class="goal-bar"><i style="width:${Math.min(100, Math.round(g / goal * 100))}%"></i></div>
        <p class="muted">모은 별 ${Math.min(g, goal)} / ${goal}${g >= goal ? ' · 목표 달성! 보상을 주고 아래 버튼으로 기록해요' : ''}</p>
        <button class="btn small${g >= goal ? ' primary' : ''}" data-act="gave">🎁 보상 줬어요 (기록하고 목표 새로 시작)</button></div>
      <div class="card"><h3 id="rwHead">${rwHeadText()}</h3>
        ${rows.length ? `<ul class="rw-rows">${rows.map(row).join('')}</ul><p class="muted">보상을 실제로 쓰면 “사용완료 체크”를 눌러 주세요. 윤이의 보상 목록에도 사용완료로 보여요. 다시 누르면 취소돼요.</p>`
          : '<p class="muted">아직 기록된 보상이 없어요. 윤이에게 보상을 주면 위의 “🎁 보상 줬어요”를 눌러 기록하세요.</p>'}
      </div></div></div>`, {
      back: parentScreen,
      usedrw: i => { const r = S.rewards[+i]; if (!r) return; r.used = r.used ? null : today(); save(); const y = window.scrollY; rewardAdminScreen(); window.scrollTo(0, y); toast(r.used ? '사용완료로 표시했어요' : '사용 전으로 되돌렸어요'); },
      delrw: (i, btn) => { if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '한 번 더 누르면 삭제'; return; } S.rewards.splice(+i, 1); save(); const y = window.scrollY; rewardAdminScreen(); window.scrollTo(0, y); },
      gave: () => { S.rewards.push({ date: today(), text: S.settings.goalText, stars: Number(S.settings.goalStars) }); S.goalBase = S.stars; save(); toast('보상을 기록했어요. 새 목표를 시작해요!'); rewardAdminScreen(); },
    });
  }
  function specScreen() {
    render('spec', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="아빠 화면으로">⬅️</button><h2 class="title">📋 기획·변경 기록</h2><div class="spacer"></div><span class="muted">v${APP_VERSION}</span></div>
      <div class="card spec" id="spec">불러오는 중…</div></div></div>`, { back: parentScreen });
    const show = md => { const el = document.getElementById('spec'); if (el) el.innerHTML = mdToHtml(md); };
    if (window.__SPEC_INLINE) return show(window.__SPEC_INLINE);
    fetch(encodeURI('기획서.md')).then(r => { if (!r.ok) throw 0; return r.text(); }).then(show)
      .catch(() => { const el = document.getElementById('spec'); if (el) el.textContent = '기획서.md 파일을 찾지 못했어요. 앱 폴더에 기획서.md가 있는지 확인해 주세요.'; });
  }
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function parentScreen() {
    const td = today(); const weekAgo = addDays(-6);
    const days7 = S.days.filter(d => d >= weekAgo).length;
    const learned7 = Object.values(S.learned).filter(d => d >= weekAgo).length;
    const weak = Object.entries(S.weak).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `<li>${B[t].icon} ${esc(B[t].name)} — 힌트 ${n}번</li>`).join('');
    const hints = U.map((up, i) => S.hints[i] ? `<li>${up.bg} ${esc(up.title)} — 힌트 ${S.hints[i]}번</li>` : '').join('');
    const min = Math.round(todayLog().sec / 60);
    const st = S.settings; const code = `${S.pos.u + 1}-${S.pos.d}-${S.pos.s + 1}`;
    const unlocked = unlockedUpTo(S.pos.u, S.pos.d);
    render('parent', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="home">🏠</button><h2 class="title">아빠 화면</h2><div class="spacer"></div><button class="btn small" data-act="rewardadmin">🎁 보상</button><button class="btn small" data-act="spec">📋 기획·변경 기록</button><span class="muted">v${APP_VERSION}</span></div>
      ${ptabBar()}
      ${ptabPanel('summary', `
      <div class="card"><h3>이번 주 (최근 7일)</h3><div class="kv">
        <div>학습한 날<b>${days7}일</b></div><div>새로 배운 블록<b>${learned7}개</b></div><div>오늘 사용<b>${min}분</b></div><div>연속<b>${streak()}일</b></div>
      </div>
      <h3 style="margin-top:14px">힌트를 많이 본 블록 (약한 블록)</h3>${weak ? `<ol class="list">${weak}</ol>` : '<p class="muted">아직 없어요</p>'}
      <h3 style="margin-top:14px">단원별 힌트 횟수</h3>${hints ? `<ul class="list">${hints}</ul>` : '<p class="muted">아직 없어요</p>'}</div>
      <div class="card"><h3>전체</h3><div class="kv">
        <div>누적 학습일<b>${S.days.length}일</b></div><div>레벨 (배운 블록)<b>${level()} / ${Object.keys(B).length}</b></div><div>별<b>${S.stars}개</b></div><div>스티커<b>${stickerCount()}장</b></div><div>내 작품<b>${S.works.length}개</b></div><div>끝낸 일차<b>${Object.keys(S.done).length} / ${U.filter(x => !x.soon).length * DAYS}</b></div>
      </div></div>
      `)}
      ${ptabPanel('stats', `${statsCard()}`)}
      ${ptabPanel('reward', `
      <div class="card"><h3>🎁 받은 보상 관리</h3>
        <p>받은 보상 <b>${rwCount().n}개</b> · 아직 안 쓴 보상 <b>${rwCount().left}개</b> · 사용완료 ${rwCount().u}개</p>
        <button class="btn primary" data-act="rewardadmin">🎁 보상 목록 · 사용완료 체크</button>
      </div>
      <div class="card"><h3>별 조정</h3>
        <p>지금 별: <b style="font-size:24px">${S.stars}개</b> <span class="muted">(현재 목표에 모은 별 ${Math.max(0, S.stars - S.goalBase)}개 · 오늘 ${todayLog().stars}개 / 하루 최대 ${DAY_STAR_MAX}개)</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="star" data-arg="-10">−10</button><button class="btn small" data-act="star" data-arg="-1">−1</button><button class="btn small" data-act="star" data-arg="1">+1</button><button class="btn small" data-act="star" data-arg="10">+10</button></div>
        <div class="code-row" style="margin-top:10px"><input id="starSet" type="number" min="0" placeholder="개수"><button class="btn small primary" data-act="starset">이 개수로 맞추기</button></div>
      </div>
      `)}
      ${ptabPanel('progress', `
      <div class="card"><h3>진도 조정</h3>
        <p>지금 진도: <b>${esc(U[S.pos.u].title)} ${S.pos.d}일차 · ${STEPS[S.pos.s].name}</b> <span class="muted">(코드 ${code})</span></p>
        <div class="form">
          <label>단원<select id="adjU">${U.map((up, i) => `<option value="${i}"${S.pos.u === i ? ' selected' : ''}${up.soon ? ' disabled' : ''}>${i + 1}. ${esc(up.title)} (${doneCount(i)}/${DAYS}일)${up.soon ? ' — 준비 중' : ''}</option>`).join('')}</select></label>
          <label>일차<select id="adjD">${Array.from({ length: DAYS }, (_, i) => `<option value="${i + 1}"${S.pos.d === i + 1 ? ' selected' : ''}>${i + 1}일차</option>`).join('')}</select></label>
          <label>단계<select id="adjS">${STEPS.map((x, i) => `<option value="${i}"${S.pos.s === i ? ' selected' : ''}>${i + 1}. ${x.name}</option>`).join('')}</select></label>
          <label style="grid-template-columns:auto 1fr"><input type="checkbox" id="adjMark" style="width:24px;min-height:24px">앞 일차는 완료, 뒤 일차는 미완료로 맞추기 (배운 블록·스티커도 함께)</label>
        </div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn small primary" data-act="adjpos">이 진도로 바꾸기</button>
          <button class="btn small" data-act="resetprog" id="resetProgBtn">진도 초기화</button></div>
        <p class="muted">진도 초기화: 진도·완료한 날·배운 블록(레벨)·약한 블록 기록을 처음으로 돌려요. 별·받은 보상·스티커·내 작품·설정은 그대로예요.</p>
      </div>
      <div class="card"><h3>블록 해금 현황</h3><p>${Object.keys(B).map(t => `<span class="chip${unlocked.includes(t) ? '' : ' off'}${S.learned[t] ? ' done' : ''}">${B[t].icon} ${esc(B[t].name)}</span>`).join(' ')}</p><p class="muted">색: 배웠어요(진하게) · 지금 진도까지 열림 · 아직(흐리게)</p></div>
      <div class="card"><h3>내 작품 · 스티커북</h3><p>작품 ${S.works.length}개 · 스티커 ${stickerCount()}장</p><div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="works">🎨 내 작품 보기</button><button class="btn small" data-act="stickers">📒 스티커북 보기</button></div></div>
      `)}
      ${ptabPanel('settings', `
      <div class="card"><h3>설정</h3><div class="form">
        <label>아이 이름<input data-set="childName" value="${esc(st.childName)}"></label>
        <label>리딩 캐릭터<select data-set="leader">${C.leaders.map(l => `<option value="${l.id}"${st.leader === l.id ? ' selected' : ''}>${l.img} ${esc(l.name)}</option>`).join('')}</select></label>
        <label>캐릭터 이름 (비우면 기본)<input data-set="leaderName" value="${esc(st.leaderName || '')}" placeholder="${esc(leader().name)}"></label>
        <label>한국어 읽기<select data-set="koVoiceMode">${[['rec', '녹음 목소리 (추천)'], ['device', '기기 음성']].map(([v, n]) => `<option value="${v}"${(st.koVoiceMode || 'rec') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>한국어 목소리 (기기 음성)<select data-set="koVoice"><option value="">자동 (구글 음성 우선)</option>${koVoices().map(v => `<option value="${esc(v.voiceURI || v.name)}"${st.koVoice === (v.voiceURI || v.name) ? ' selected' : ''}>${esc(v.name)}${v.localService ? '' : ' (온라인)'}</option>`).join('')}</select></label>
        <label>한국어 말 속도<select data-set="koRate">${[['0.8', '천천히'], ['0.9', '보통 (추천)'], ['1', '빠르게']].map(([v, n]) => `<option value="${v}"${Number(st.koRate) === Number(v) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="kotest">🔈 한국어 들어보기</button><span class="muted">${koVoices().length ? `이 기기의 한국어 목소리 ${koVoices().length}개` : '⚠️ 한국어 목소리를 못 찾았어요. 아래 안내를 보세요'}</span></div>
        <label>캐릭터 이동 속도<select data-set="speed">${[['normal', '보통'], ['slow', '느리게']].map(([v, n]) => `<option value="${v}"${st.speed === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>힌트 기록 기준<select data-set="hintAt">${[[2, '2번 틀리면 (기본)'], [1, '1번 틀리면'], [3, '3번 틀리면']].map(([v, n]) => `<option value="${v}"${Number(st.hintAt) === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>하루 최대 시간(분)<input data-set="dailyLimit" type="number" min="5" max="120" value="${st.dailyLimit}"></label>
        <label>별 목표(개)<input data-set="goalStars" type="number" min="5" max="999" value="${st.goalStars}"></label>
        <label>목표 보상<input data-set="goalText" value="${esc(st.goalText)}"></label>
      </div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn small" data-act="unlock">오늘 시간 잠금 풀기</button>
        <button class="btn small" data-act="gave">🎁 보상 줬어요 (목표 새로 시작)</button>
        <button class="btn small" data-act="reset" id="resetBtn">전체 초기화 (별·보상·설정까지)</button>
      </div></div>
      ${pinCard()}
      `)}
      ${ptabPanel('manage', `
      <div class="card"><h3>앱 업데이트</h3>
        <p>이 기기의 앱: <b>v${APP_VERSION}</b> <span id="verInfo" class="muted">${latestVer ? (isNewer(latestVer, APP_VERSION) ? `· 새 버전 v${latestVer}이 있어요!` : '· 최신 버전이에요') : ''}</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="checkver">🔄 새 버전 확인</button>
          <button class="btn small primary" data-act="doupdate" id="updBtn"${latestVer && isNewer(latestVer, APP_VERSION) ? '' : ' hidden'}>⬇️ 지금 업데이트</button></div>
        <p class="muted">업데이트해도 진도·별·보상·작품·설정은 그대로 남아요. 인터넷이 연결돼 있어야 해요.</p>
      </div>
      <div class="card"><h3>진도 옮기기 (기기끼리 연동이 안 될 때)</h3>
        <p>이 기기의 현재 진도 코드: <b style="font-size:24px">${code}</b> <span class="muted">(단원-일차-단계)</span></p>
        <div class="code-row"><input id="pcode" placeholder="예: 3-2-1"><button class="btn small primary" data-act="setpos">이 진도로 맞추기</button></div>
        <p class="muted">별·스티커·작품까지 모두 옮기려면 아래 백업 코드를 복사해 다른 기기의 같은 칸에 붙여넣고 “가져오기”를 누르세요.</p>
        <textarea id="backup" placeholder="백업 코드"></textarea>
        <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn small" data-act="export">내보내기(복사)</button><button class="btn small" data-act="import">가져오기</button>
          <button class="btn small" data-act="savefile">💾 백업 파일 저장</button><label class="btn small" style="cursor:pointer">📂 백업 파일 불러오기<input type="file" id="loadFile" accept=".json,application/json,text/plain" hidden></label></div>
        <p class="muted">앱을 지웠다 다시 설치하기 전에는 “백업 파일 저장”을 꼭 눌러두세요.</p>
      </div>
      <div class="card"><h3>안내</h3><ul class="list">
        <li>미션·단원 수정은 <b>content.js</b>, 블록 동작은 <b>blocks.js</b>에서 해요. 고친 뒤 <b>sw.js</b>의 VERSION을 올리면 설치된 앱에 반영돼요.</li>
        <li>한국어가 잘 안 들리면: 태블릿 <b>설정 → 일반 → 글자 읽어주기(TTS) → 기본 엔진</b>을 <b>Google 음성 인식 및 합성</b>으로 바꾸고, 한국어 음성 데이터(고품질)를 설치한 뒤 앱을 다시 켜세요.</li>
        <li>불편한 점·개선 아이디어는 기획서의 “앞으로 할 일” 표에 적어주세요.</li>
      </ul></div>
      `)}
    </div></div>`, {
      ...parentCommonHandlers(),
      home: homeScreen, works: worksScreen, stickers: () => stickerScreen(0),
      setpos: () => { const p = parseCode(document.getElementById('pcode').value); if (!p) return toast('예: 3-2-1 처럼 적어주세요'); S.pos = p; save(); toast(`진도를 ${p.u + 1}-${p.d}-${p.s + 1}로 맞췄어요`); parentScreen(); },
      export: async () => { const c = exportCode(); const ta = document.getElementById('backup'); ta.value = c; ta.select(); try { await navigator.clipboard.writeText(c); toast('복사했어요. 다른 기기에 붙여넣으세요'); } catch (e) { toast('코드를 길게 눌러 복사하세요'); } },
      import: () => { if (restore(document.getElementById('backup').value)) { toast('가져왔어요!'); parentScreen(); } else toast('백업 코드가 올바르지 않아요'); },
      savefile: () => {
        try {
          const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `yuni-block-backup-${today()}.json`;
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          toast('백업 파일을 저장했어요 (다운로드 폴더)');
        } catch (e) { toast('저장하지 못했어요. 내보내기(복사)를 이용하세요'); }
      },
      adjpos: () => {
        const u = +document.getElementById('adjU').value, d = +document.getElementById('adjD').value, sIdx = +document.getElementById('adjS').value;
        if (document.getElementById('adjMark').checked) {
          S.done = {}; S.learned = {};
          for (let ui = 0; ui < U.length; ui++) for (let di = 1; di <= DAYS; di++) if (ui < u || (ui === u && di < d)) { S.done[`${ui}-${di}`] = today(); for (const t of dayUnlocks(ui, di)) S.learned[t] = today(); const k = `${ui}-${di}`; if (!S.stickers[k]) S.stickers[k] = { img: U[ui].days[di - 1].sticker, name: `${U[ui].title} ${di}일차`, date: today(), from: '아빠 화면 진도 조정' }; }
          for (let ui = 0; ui < u; ui++) if (!S.stickers[`${ui}-x`]) S.stickers[`${ui}-x`] = { img: U[ui].sticker, name: `${U[ui].thing} 완성`, date: today(), from: '아빠 화면 진도 조정' };
          S.level = level();
        }
        S.pos = { u, d, s: sIdx }; save(); toast(`진도를 ${U[u].title} ${d}일차 · ${STEPS[sIdx].name}(으)로 바꿨어요`); parentScreen();
      },
      resetprog: (x, btn) => {
        if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '정말 진도 초기화? 한 번 더 누르기'; return; }
        S.pos = { u: 0, d: 1, s: 0 }; S.done = {}; S.learned = {}; S.weak = {}; S.hints = {}; S.level = 0; save(); toast('진도를 처음으로 돌렸어요'); parentScreen();
      },
      star: a => { S.stars = Math.max(0, S.stars + Number(a)); S.goalBase = Math.min(S.goalBase, S.stars); save(); parentScreen(); },
      starset: () => { const v = parseInt(document.getElementById('starSet').value, 10); if (!(v >= 0)) return toast('0 이상의 숫자를 적어주세요'); S.stars = v; S.goalBase = Math.min(S.goalBase, S.stars); save(); toast(`별을 ${v}개로 맞췄어요`); parentScreen(); },
      spec: specScreen, rewardadmin: rewardAdminScreen,
      checkver: async () => {
        const info = document.getElementById('verInfo'); if (info) info.textContent = '· 확인 중…';
        try {
          const v = await checkUpdate(); const nw = v && isNewer(v, APP_VERSION);
          if (info) info.textContent = nw ? `· 새 버전 v${v}이 있어요!` : `· 최신 버전이에요 (서버 v${v || '?'})`;
          const b = document.getElementById('updBtn'); if (b) b.hidden = !nw;
        } catch (e) { if (info) info.textContent = '· 확인하지 못했어요. 인터넷 연결을 확인해 주세요'; }
      },
      doupdate: applyUpdate,
      kotest: () => { hush(); ko('블록을 끌어다 붙이고 실행을 눌러 봐! 오늘 블록 놀이 끝! 정말 잘했어, 윤이.'); },
      unlock: () => { S.override = today(); save(); toast('오늘은 시간 제한 없이 할 수 있어요'); },
      gave: () => { S.rewards.push({ date: today(), text: S.settings.goalText, stars: Number(S.settings.goalStars) }); S.goalBase = S.stars; save(); toast('보상을 기록했어요. 새 목표를 시작해요!'); parentScreen(); },
      reset: (x, btn) => { if (btn.dataset.sure) { S = defaults(); save(); toast('초기화했어요'); homeScreen(); } else { btn.dataset.sure = 1; btn.textContent = '정말 초기화? 한 번 더 누르기'; } },
    });
    ptabReveal();
    const lf = document.getElementById('loadFile');
    if (lf) lf.addEventListener('change', () => { const f = lf.files[0]; if (!f) return; f.text().then(txt => { if (restore(txt)) { toast('백업을 불러왔어요!'); parentScreen(); } else toast('백업 파일이 올바르지 않아요'); }); });
    document.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.set; S.settings[k] = el.type === 'number' ? Number(el.value) : el.value.trim(); save(); toast('저장했어요');
    }));
  }

  /* ================= 시작 ================= */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* */ }
  document.addEventListener('visibilitychange', () => { if (document.hidden) hush(); });
  window.YUNI = { get state() { return S; }, get act() { return L && !L.intro ? L.acts[L.i] : null; }, get lesson() { return L; }, get stage() { return stage; }, get ws() { return ws; }, buildStep: s => buildStep(L.u, L.d, s), parseCode, unlockedUpTo, level, screen: () => screen, click: a => H[a] && H[a]() }; // 테스트용
  homeScreen();
  setTimeout(() => { if (!/^https?:/.test(location.protocol) || window.__SPEC_INLINE || navigator.onLine === false) return;
    checkUpdate().then(v => { if (v && isNewer(v, APP_VERSION) && screen === 'home') toast(`새 버전 v${v}이 있어요. 아빠 화면에서 업데이트하세요`); }).catch(() => {}); }, 3000);
})();
