// 한국어 녹음이 필요한 문장 목록 (공통 65번): node tools/ko_sentences.js > tools/ko_sentences.json
// key = app.js ko()가 받는 글을 koSentences()와 똑같이 문장(. ! ?)으로 나눈 것(공백 정리), say = 실제로 읽을 글
// app.js·content.js의 한국어 문장을 고치면 이 파일도 맞추고 tools/make_ko_audio.py로 녹음을 다시 만들어요 (영어 앱과 같은 도구)
global.window = {}; require('../content.js'); const C = window.CONTENT;
const koKey = t => String(t).replace(/\s+/g, ' ').trim();
const koSentences = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
const sayOf = k => koKey(k.replace(/\p{Extended_Pictographic}|️|‍/gu, '').replace(/['"‘’“”\[\]()]/g, '').replace(/·/g, ', ').replace(/:/g, ','));
const out = new Map();
const add = t => { if (!t) return; const all = koSentences(t).map(koKey); for (const k of all) if (k && !out.has(k) && /[가-힣]/.test(k)) out.set(k, sayOf(k)); };
const names = C.leaders.map(l => l.name); const child = '윤이';
// 1) app.js 고정 문장
['오늘 블록 놀이는 여기까지! 정말 잘했어요.', '목표 달성! 아빠에게 보여줘요!', '이 단원은 아직 준비 중이야. 다음 버전에서 만나!', '블록을 끌어다 붙이고 실행을 눌러 봐!',
  '이제 똑같이 놓아 봐!', '흰 자리를 보고 똑같이 놓아 봐', '이제 친구를 톡 해 봐!', '정답을 보여줄게. 똑같이 놓고 실행하면 별을 받아!',
  '작품을 저장했어! 별 두 개!', '작품을 저장했어!', '마지막은 자유 만들기! 친구랑 소품을 넣고 마음대로 만들어 봐. 다 만들면 저장 버튼!',
  '이 미션을 끝내면 받을 수 있어', '블록을 끌어다 붙이고 실행을 눌러 봐! 오늘 블록 놀이 끝! 정말 잘했어, 윤이.',
  '오늘은 첫날! 복습 없이 바로 새 블록으로 가요', '오늘은 새 블록 없이 연습하는 날! 바로 미션으로 가요',
  '순서가 달라! 순서를 잘 봐.', '친구는 톡 해서 움직여야 해.', '흰 자리를 보고 놓아 봐', '이제 똑같이 놓아 봐!', '처음부터 다시!'].forEach(add);
for (const n of [2, 3, 4, 5]) { add(`이제 똑같이 놓아 봐! 블록을 놓고 숫자를 눌러 ${n}로 바꿔.`); add(`블록은 맞아! 블록의 숫자를 눌러서 ${n}로 바꿔 봐`); }
C.lines.praise.forEach(add); C.lines.retry.forEach(add);
['인사', '복습 미션', '새 블록', '미션', '자유 만들기'].forEach(n => add(`다음은 ${n}!`));
add(`안녕, ${child}! 오늘도 블록으로 놀자!`);
// 2) 블록 설명
for (const [t, b] of Object.entries(C.blocks)) { add(`${b.name}. ${b.d}`); add(`새 블록이야! ${b.name}. ${b.d}`); add(`${b.name} 블록을 찾아서 끌어와 봐`); add(`${b.name} 블록을 배웠어!`); add(`${b.name} 블록을 꼭 써야 해.`); for (const n of [2, 3, 4]) add(`블록 ${n}개로 해 볼까? 반복 블록을 써 봐.`); }
for (const p of C.lines.praise) for (const [, b] of Object.entries(C.blocks)) add(`${p} ${b.name} 블록을 배웠어!`);
// 3) 단원·미션 문장
C.units.forEach((u, ui) => {
  for (let d = 1; d <= 5; d++) add(`안녕, ${child}! 오늘은 ${u.title} ${d}일차야.`);
  add(`${u.title}을 5일 다 하면 받을 수 있어`);
  for (const p of C.lines.praise) add(`${p} ${u.thing}에 한 걸음 더!`);
  for (const lv of ['']) add(`오늘 블록 놀이 끝! 정말 잘했어, ${child}. 스티커도 받았어! ${u.thing} 완성!`);
  add(`오늘 블록 놀이 끝! 정말 잘했어, ${child}. 스티커도 받았어! 내일 또 만나!`);
  for (let lv = 1; lv <= 22; lv++) { const j = [2, 4, 5, 9].includes(lv % 10) ? '가' : '이'; add(`레벨 ${lv}${j} 됐어!`); }
  for (const day of u.days) for (const m of day.m) { for (const n of names) add(m.say.replace('{F}', m.f ? C.friends[m.f].name : n)); }
  Object.values(C.friends).forEach(f => add(`${f.name}를 톡 해 봐!`));
});
process.stdout.write(JSON.stringify([...out].map(([key, say]) => (say === key ? { key } : { key, say })), null, 0));
