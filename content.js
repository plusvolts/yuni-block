/* 윤이 블록 — 콘텐츠 (블록·단원·미션·등장인물). 앱 로직은 app.js, 블록 엔진은 blocks.js */
window.CONTENT = (() => {
  /* ---------- 리딩 캐릭터 (아빠 화면에서 고르기, CREQ-59) ---------- */
  const leaders = [
    { id: 'dino', name: '디노', img: '🦖', color: '#4caf50' },
    { id: 'robot', name: '로보', img: '🤖', color: '#5c7cfa' },
    { id: 'car', name: '카봇', img: '🚗', color: '#ff7043' },
    { id: 'fairy', name: '핑핑', img: '🧚', color: '#ec407a' },
    { id: 'cat', name: '냐옹', img: '🐱', color: '#ffb300' },
    { id: 'fish', name: '물고기', img: '🐠', color: '#26c6da' },
  ];
  /* ---------- 등장인물 (공통 06: 은후는 나오지 않아요). call = 윤이를 부르는 호칭 (현이·초록이는 남동생 → 형, 미소는 여동생 → 오빠) ---------- */
  const friends = {
    hyun: { name: '현이', img: '👦', color: '#42a5f5', role: '남동생', call: '형' },
    chorok: { name: '초록이', img: '👦', color: '#66bb6a', role: '친척 남동생', call: '형' },
    miso: { name: '미소', img: '👧', color: '#ff8a80', role: '친척 여동생', call: '오빠' },
    imo: { name: '이모', img: '👩', color: '#ab47bc', role: '어른' },
    samchon: { name: '삼촌', img: '🧔', color: '#8d6e63', role: '어른' },
  };
  const kids = ['hyun', 'chorok', 'miso'];

  /* ---------- 블록 22개 (CREQ-52). cat: start·motion·looks·sound·control·end ---------- */
  const blocks = {
    flag: { cat: 'start', icon: '🚩', name: '출발 버튼을 누르면', d: '출발 버튼을 누르면 시작해요' },
    tap: { cat: 'start', icon: '👆', name: '나를 톡 하면', d: '캐릭터를 손가락으로 톡 하면 시작해요' },
    touch: { cat: 'start', icon: '🤝', name: '친구와 닿으면', d: '다른 캐릭터와 닿으면 시작해요' },
    recv: { cat: 'start', icon: '📩', name: '편지를 받으면', d: '색 편지를 받으면 시작해요' },
    right: { cat: 'motion', icon: '➡️', name: '오른쪽으로', n: true, d: '오른쪽으로 칸 수만큼 가요' },
    left: { cat: 'motion', icon: '⬅️', name: '왼쪽으로', n: true, d: '왼쪽으로 칸 수만큼 가요' },
    up: { cat: 'motion', icon: '⬆️', name: '위로', n: true, d: '위로 칸 수만큼 가요' },
    down: { cat: 'motion', icon: '⬇️', name: '아래로', n: true, d: '아래로 칸 수만큼 가요' },
    jump: { cat: 'motion', icon: '🦘', name: '점프', d: '앞에 있는 돌을 폴짝 뛰어넘어요' },
    home: { cat: 'motion', icon: '🏠', name: '집으로', d: '처음 자리로 돌아가요' },
    say: { cat: 'looks', icon: '💬', name: '말하기', d: '말풍선으로 말해요' },
    grow: { cat: 'looks', icon: '🔼', name: '커지기', d: '몸이 커져요' },
    shrink: { cat: 'looks', icon: '🔽', name: '작아지기', d: '몸이 작아져요' },
    hide: { cat: 'looks', icon: '🫥', name: '숨기', d: '스르륵 사라져요' },
    show: { cat: 'looks', icon: '😀', name: '나타나기', d: '다시 나타나요' },
    pop: { cat: 'sound', icon: '🔔', name: '뿅 소리', d: '뿅 소리를 내요' },
    rec: { cat: 'sound', icon: '🎤', name: '내 목소리', d: '녹음한 내 목소리를 틀어요' },
    wait: { cat: 'control', icon: '⏳', name: '기다리기', n: true, d: '숫자만큼 잠깐 기다려요' },
    repeat: { cat: 'control', icon: '🔁', name: '반복', n: true, c: true, d: '안에 있는 블록을 숫자만큼 반복해요' },
    send: { cat: 'control', icon: '📨', name: '편지 보내기', d: '친구에게 색 편지를 보내요' },
    forever: { cat: 'end', icon: '♾️', name: '계속 반복', d: '앞의 블록을 계속 반복해요' },
    page: { cat: 'end', icon: '📖', name: '다음 장면', d: '다음 장면으로 넘어가요' },
    /* v1.1.0 추가 (다른 블록코딩 앱 참고: ScratchJr 모양·소리, Scratch 펜·효과, Lightbot 끝까지 가기) */
    dash: { cat: 'motion', icon: '🏃', name: '끝까지 달리기', d: '가던 방향으로 막힐 때까지 달려요' },
    spin: { cat: 'motion', icon: '🔄', name: '빙글 돌기', d: '제자리에서 한 바퀴 돌아요' },
    color: { cat: 'looks', icon: '🎨', name: '색 바꾸기', d: '몸 색깔이 바뀌어요' },
    flash: { cat: 'looks', icon: '✨', name: '반짝이기', d: '반짝반짝 빛나요' },
    dance: { cat: 'looks', icon: '💃', name: '춤추기', d: '신나게 춤을 춰요' },
    paint: { cat: 'looks', icon: '🖍️', name: '칠하기', d: '서 있는 칸을 색칠해요' },
    plant: { cat: 'looks', icon: '🌱', name: '놓기', d: '서 있는 칸에 물건을 놓아요' },
    drum: { cat: 'sound', icon: '🥁', name: '북 소리', d: '둥둥 북 소리를 내요' },
    music: { cat: 'sound', icon: '🎵', name: '음악', d: '짧은 노래를 틀어요' },
    clap: { cat: 'sound', icon: '👏', name: '박수', d: '짝짝 박수를 쳐요' },
    fast: { cat: 'control', icon: '🐇', name: '빨리', d: '이제부터 빨리 움직여요' },
    slow: { cat: 'control', icon: '🐢', name: '천천히', d: '이제부터 천천히 움직여요' },
    stop: { cat: 'control', icon: '🛑', name: '멈추기', d: '모두 멈춰요' },
  };
  const catName = { start: '시작', motion: '움직임', looks: '모양', sound: '소리', control: '제어', end: '끝' };

  /* ---------- 단원 12개 × 5일 (CREQ-51). v1.0.0은 1~6단원, 7~12는 v1.1.0 ----------
     미션: map(8칸×5줄) S=시작, #=돌(못 지나감), a~z=legend의 물건. sol=정답 예시(블록 순서가 달라도 목표에 닿으면 정답)
     order=순서대로 모아야 하는 물건, need=꼭 실행해야 하는 블록, given=고치기 문제의 틀린 프로그램, max=블록 수 제한(반복 연습)
     chars=캐릭터 여러 명(id, x, y, sol, trigger=tap이면 톡 해서 모아야 함) */
  const U = [];
  U.push({
    title: '우리 집 마당', bg: '🏡', theme: 'linear-gradient(#bde0fe,#e9f5db)', thing: '빨래 널기', sticker: '🧺', props: ['🧦', '👕', '🧺', '🌳', '🐶'],
    days: [
      { unlock: ['flag', 'right'], sticker: '🧦', m: [
        { name: '양말을 널자', say: '{F}: 형, 양말이 저기 있어! 빨랫줄까지 가 줘.', f: 'hyun', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🧦' }, sol: ['right:3'] },
        { name: '현이가 놓은 블록 고치기', say: '{F}: 내가 만들었는데 안 가… 뭐가 틀렸지?', f: 'hyun', map: ['........', '........', 'S...a...', '........', '........'], legend: { a: '👕' }, sol: ['right:4'], given: ['right:2'] },
      ] },
      { unlock: ['left'], sticker: '👕', m: [
        { name: '왼쪽 빨랫줄', say: '{F}: 이번엔 왼쪽이야!', f: 'chorok', map: ['........', '........', '.a...S..', '........', '........'], legend: { a: '👕' }, sol: ['left:4'] },
        { name: '초록이 블록 고치기', say: '{F}: 왼쪽으로 갔는데 옷이 없어…', f: 'chorok', map: ['........', '........', '..S...a.', '........', '........'], legend: { a: '🩳' }, sol: ['right:4'], given: ['left:4'] },
      ] },
      { unlock: ['drum'], sticker: '🩳', m: [
        { name: '두 개를 한 번에', say: '{F}: 가는 길에 있는 빨래를 다 걷어 줘! 다 걷으면 북을 둥둥 쳐 줘!', f: 'imo', map: ['........', '........', 'S.a..b..', '........', '........'], legend: { a: '🧦', b: '🧦' }, sol: ['right:5'] },
        { name: '미소 블록 고치기', say: '{F}: 오빠, 이거 왜 반대로 가?', f: 'miso', map: ['........', '........', 'a..S....', '........', '........'], legend: { a: '👕' }, sol: ['left:3'], given: ['right:3'] },
      ] },
      { unlock: ['dance'], sticker: '🧣', m: [
        { name: '양쪽 빨래', say: '{F}: 오른쪽 먼저, 그다음 왼쪽! 다 하면 춤도 한 번!', f: 'samchon', map: ['........', '........', '.b.S.a..', '........', '........'], legend: { a: '🧣', b: '🧤' }, sol: ['right:2', 'left:4'] },
        { name: '현이 블록 고치기', say: '{F}: 하나는 되는데 하나가 안 돼…', f: 'hyun', map: ['........', '........', '.b.S.a..', '........', '........'], legend: { a: '🧣', b: '🧤' }, sol: ['right:2', 'left:4'], given: ['right:2', 'left:1'] },
      ] },
      { unlock: ['clap'], sticker: '🧺', m: [
        { name: '빨래 다 걷기', say: '{F}: 비 온다! 빨래 세 개 다 걷어 줘! 다 걷으면 박수 짝짝!', f: 'imo', map: ['........', '........', 'ca.S.b..', '........', '........'], legend: { a: '🧦', b: '👕', c: '🩳' }, sol: ['left:2', 'right:4', 'left:5'] },
        { name: '초록이 블록 고치기', say: '{F}: 마지막 하나를 못 걷어…', f: 'chorok', map: ['........', '........', 'ca.S.b..', '........', '........'], legend: { a: '🧦', b: '👕', c: '🩳' }, sol: ['left:2', 'right:4', 'left:5'], given: ['left:2', 'right:4', 'left:2'] },
      ] },
    ],
  });
  U.push({
    title: '주방 1: 샌드위치', bg: '🍳', theme: 'linear-gradient(#fff3b0,#ffe0b2)', thing: '샌드위치 만들기', sticker: '🥪', props: ['🍞', '🥬', '🧀', '🍅', '🥪'],
    days: [
      { unlock: ['up'], sticker: '🍞', m: [
        { name: '빵을 가져와', say: '{F}: 위 선반에 빵이 있어. 올라가서 가져와!', f: 'imo', map: ['........', '..a.....', '........', '........', '..S.....'], legend: { a: '🍞' }, sol: ['up:3'] },
        { name: '현이 블록 고치기', say: '{F}: 빵까지 안 닿아…', f: 'hyun', map: ['..a.....', '........', '........', '........', '..S.....'], legend: { a: '🍞' }, sol: ['up:4'], given: ['up:2'] },
      ] },
      { unlock: ['color'], sticker: '🥬', m: [
        { name: '빵 위에 양상추', say: '{F}: 빵 먼저, 그다음 양상추! 순서대로. 양상추를 올리면 색을 바꿔 봐!', f: 'imo', map: ['...b....', '........', '...a....', '........', '...S....'], legend: { a: '🍞', b: '🥬' }, order: ['a', 'b'], sol: ['up:4'] },
        { name: '미소 블록 고치기', say: '{F}: 양상추가 남았어…', f: 'miso', map: ['...b....', '........', '...a....', '........', '...S....'], legend: { a: '🍞', b: '🥬' }, order: ['a', 'b'], sol: ['up:4'], given: ['up:2'] },
      ] },
      { unlock: ['down'], sticker: '🧀', m: [
        { name: '순서가 중요해', say: '{F}: 빵 → 양상추 순서야. 양상추를 먼저 집으면 이상한 샌드위치!', f: 'imo', map: ['........', '........', 'S.b.....', '........', '..a.....'], legend: { a: '🍞', b: '🥬' }, order: ['a', 'b'], sol: ['down:2', 'right:2', 'up:2'] },
        { name: '초록이 블록 고치기', say: '{F}: 양상추가 먼저 올라갔어… 이상해!', f: 'chorok', map: ['........', '........', 'S.b.....', '........', '..a.....'], legend: { a: '🍞', b: '🥬' }, order: ['a', 'b'], sol: ['down:2', 'right:2', 'up:2'], given: ['right:2', 'down:2', 'up:2'] },
      ] },
      { unlock: ['flash'], sticker: '🍅', m: [
        { name: '세 겹 샌드위치', say: '{F}: 빵, 양상추, 치즈! 순서대로 모아 줘. 치즈까지 올리면 반짝!', f: 'samchon', map: ['..a.....', '........', '..S.b...', '........', '....c...'], legend: { a: '🍞', b: '🥬', c: '🧀' }, order: ['a', 'b', 'c'], sol: ['up:2', 'down:2', 'right:2', 'down:2'] },
        { name: '현이 블록 고치기', say: '{F}: 치즈까지 안 가…', f: 'hyun', map: ['..a.....', '........', '..S.b...', '........', '....c...'], legend: { a: '🍞', b: '🥬', c: '🧀' }, order: ['a', 'b', 'c'], sol: ['up:2', 'down:2', 'right:2', 'down:2'], given: ['up:2', 'down:2', 'right:2', 'up:2'] },
      ] },
      { unlock: ['music'], sticker: '🥪', m: [
        { name: '샌드위치 완성!', say: '{F}: 빵, 양상추, 치즈, 그리고 다시 빵! 완성해 보자. 완성하면 노래를 틀어 줘!', f: 'imo', map: ['S.......', '........', 'a.b.....', '........', '..c..d..'], legend: { a: '🍞', b: '🥬', c: '🧀', d: '🍞' }, order: ['a', 'b', 'c', 'd'], sol: ['down:2', 'right:2', 'down:2', 'right:3'] },
        { name: '미소 블록 고치기', say: '{F}: 마지막 빵이 없어!', f: 'miso', map: ['S.......', '........', 'a.b.....', '........', '..c..d..'], legend: { a: '🍞', b: '🥬', c: '🧀', d: '🍞' }, order: ['a', 'b', 'c', 'd'], sol: ['down:2', 'right:2', 'down:2', 'right:3'], given: ['down:2', 'right:2', 'down:2', 'left:3'] },
      ] },
    ],
  });
  U.push({
    title: '하천: 물고기 잡기', bg: '🏞️', theme: 'linear-gradient(#a2d2ff,#caf0f8)', thing: '물고기 잡기', sticker: '🐟', props: ['🐟', '🦐', '🐸', '🪨', '🪣'],
    days: [
      { unlock: ['pop'], sticker: '🐟', m: [
        { name: '뿅! 잡았다', say: '{F}: 물고기 옆에 가서 뿅 소리로 잡아 봐!', f: 'samchon', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🐟' }, need: ['pop'], sol: ['right:3', 'pop'] },
        { name: '삼촌 블록 고치기', say: '{F}: 어? 물고기 앞에서 멈췄네.', f: 'samchon', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🐟' }, need: ['pop'], sol: ['right:3', 'pop'], given: ['right:2', 'pop'] },
      ] },
      { unlock: ['dash'], sticker: '🦐', m: [
        { name: '돌을 돌아서', say: '{F}: 돌은 못 지나가. 위로 돌아가자! 끝까지 달리기로 한 번에 가 봐.', f: 'hyun', map: ['........', '........', 'S.#.a...', '........', '........'], legend: { a: '🦐' }, need: ['pop', 'dash'], sol: ['up:1', 'right:1', 'dash', 'left:3', 'down:1', 'pop'] },
        { name: '현이 블록 고치기', say: '{F}: 돌에 쿵 부딪혀…', f: 'hyun', map: ['........', '........', 'S.#.a...', '........', '........'], legend: { a: '🦐' }, need: ['pop'], sol: ['up:1', 'right:4', 'down:1', 'pop'], given: ['right:4', 'pop'] },
      ] },
      { unlock: ['spin'], sticker: '🐸', m: [
        { name: '위아래 물고기', say: '{F}: 위에 하나, 아래에 하나! 둘 다 잡아. 물고기를 다 잡으면 빙글 돌기!', f: 'chorok', map: ['...a....', '........', '...S....', '........', '...b....'], legend: { a: '🐟', b: '🐟' }, need: ['pop'], sol: ['up:2', 'pop', 'down:4', 'pop'] },
        { name: '초록이 블록 고치기', say: '{F}: 아래 물고기까지 안 가…', f: 'chorok', map: ['...a....', '........', '...S....', '........', '...b....'], legend: { a: '🐟', b: '🐟' }, need: ['pop'], sol: ['up:2', 'pop', 'down:4', 'pop'], given: ['up:2', 'pop', 'down:2', 'pop'] },
      ] },
      { unlock: ['fast'], sticker: '🪣', m: [
        { name: '돌 사이로', say: '{F}: 돌이 많아! 길을 잘 찾아 봐. 빨리 블록으로 서둘러!', f: 'miso', map: ['........', '.#.#....', 'S.#.a...', '.#.#....', '........'], legend: { a: '🐟' }, need: ['pop'], sol: ['up:2', 'right:4', 'down:2', 'pop'] },
        { name: '미소 블록 고치기', say: '{F}: 돌에 막혔어!', f: 'miso', map: ['........', '.#.#....', 'S.#.a...', '.#.#....', '........'], legend: { a: '🐟' }, need: ['pop'], sol: ['up:2', 'right:4', 'down:2', 'pop'], given: ['up:1', 'right:4', 'down:1', 'pop'] },
      ] },
      { unlock: ['slow'], sticker: '🐠', m: [
        { name: '물고기 세 마리', say: '{F}: 오늘 저녁은 생선구이! 세 마리 잡아 줘. 천천히 블록으로 조용히 다가가!', f: 'samchon', map: ['....b...', '........', 'S.a.....', '........', '......c.'], legend: { a: '🐟', b: '🐟', c: '🐟' }, need: ['pop'], sol: ['right:2', 'pop', 'right:2', 'up:2', 'pop', 'down:4', 'right:2', 'pop'] },
        { name: '삼촌 블록 고치기', say: '{F}: 한 마리를 놓쳤어!', f: 'samchon', map: ['....b...', '........', 'S.a.....', '........', '......c.'], legend: { a: '🐟', b: '🐟', c: '🐟' }, need: ['pop'], sol: ['right:2', 'pop', 'right:2', 'up:2', 'pop', 'down:4', 'right:2', 'pop'], given: ['right:2', 'pop', 'right:2', 'up:2', 'pop', 'down:2', 'right:2', 'pop'] },
      ] },
    ],
  });
  U.push({
    title: '캠핑 1: 모닥불', bg: '🏕️', theme: 'linear-gradient(#2b2d42,#5c677d)', dark: true, thing: '장작 모아 모닥불', sticker: '🔥', props: ['🪵', '🔥', '🪨', '🌲', '🌙'],
    days: [
      { unlock: ['jump'], sticker: '🪵', m: [
        { name: '돌을 뛰어넘어', say: '{F}: 돌이 길을 막았네. 점프로 뛰어넘자!', f: 'samchon', map: ['........', '........', 'S.#.a...', '........', '........'], legend: { a: '🪵' }, sol: ['right:1', 'jump', 'right:1'] },
        { name: '현이 블록 고치기', say: '{F}: 점프를 너무 빨리 했나 봐…', f: 'hyun', map: ['........', '........', 'S.#.a...', '........', '........'], legend: { a: '🪵' }, sol: ['right:1', 'jump', 'right:1'], given: ['jump', 'right:2'] },
      ] },
      { unlock: ['say'], sticker: '💬', m: [
        { name: '찾았다! 말하기', say: '{F}: 장작을 찾으면 "찾았다!" 하고 말해 줘.', f: 'miso', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🪵' }, need: ['say'], sol: ['right:3', 'say:🎉'] },
        { name: '미소 블록 고치기', say: '{F}: 말풍선이 안 나와…', f: 'miso', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🪵' }, need: ['say'], sol: ['right:3', 'say:🎉'], given: ['right:3', 'pop'] },
      ] },
      { unlock: ['paint'], sticker: '🪨', m: [
        { name: '장작 두 개', say: '{F}: 돌 너머에 장작이 두 개 있어! 장작을 주운 자리는 칠하기로 표시해 줘!', f: 'chorok', map: ['........', '........', 'S#a.#.b.', '........', '........'], legend: { a: '🪵', b: '🪵' }, sol: ['jump', 'right:1', 'jump', 'right:1'] },
        { name: '초록이 블록 고치기', say: '{F}: 두 번째 돌에 막혔어.', f: 'chorok', map: ['........', '........', 'S#a.#.b.', '........', '........'], legend: { a: '🪵', b: '🪵' }, sol: ['jump', 'right:1', 'jump', 'right:1'], given: ['jump', 'right:1', 'right:2'] },
      ] },
      { unlock: ['home'], sticker: '🏠', m: [
        { name: '장작 들고 집으로', say: '{F}: 장작을 주워서 모닥불 자리(처음 자리)로 돌아와!', f: 'samchon', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🪵' }, need: ['home'], sol: ['right:3', 'home'] },
        { name: '삼촌 블록 고치기', say: '{F}: 장작은 주웠는데 돌아오질 않네.', f: 'samchon', map: ['........', '........', 'S..a....', '........', '........'], legend: { a: '🪵' }, need: ['home'], sol: ['right:3', 'home'], given: ['right:3', 'left:1'] },
      ] },
      { unlock: ['stop'], sticker: '🔥', m: [
        { name: '모닥불 완성!', say: '{F}: 장작 세 개를 모아 돌아오면 모닥불이 활활! 모닥불이 켜지면 멈추기!', f: 'imo', map: ['....b...', '........', 'S#a.....', '........', '....c...'], legend: { a: '🪵', b: '🪵', c: '🪵' }, need: ['home', 'say'], sol: ['jump', 'right:2', 'up:2', 'down:4', 'home', 'say:🔥'] },
        { name: '현이 블록 고치기', say: '{F}: 하나 빠뜨렸어!', f: 'hyun', map: ['....b...', '........', 'S#a.....', '........', '....c...'], legend: { a: '🪵', b: '🪵', c: '🪵' }, need: ['home', 'say'], sol: ['jump', 'right:2', 'up:2', 'down:4', 'home', 'say:🔥'], given: ['jump', 'right:2', 'up:2', 'down:2', 'home', 'say:🔥'] },
      ] },
    ],
  });
  U.push({
    title: '캠핑 2: 텐트 설치', bg: '🌲', theme: 'linear-gradient(#b7e4c7,#95d5b2)', thing: '텐트 세우기', sticker: '⛺', props: ['⛺', '🥢', '🟦', '📌', '🌲'],
    days: [
      { unlock: ['tap'], sticker: '🥢', m: [
        { name: '미소를 톡!', say: '{F}: 나도 도울래! 나를 톡 하면 폴대를 가져올게.', f: 'miso', map: ['........', 'S..a....', '........', 'M..b....', '........'], legend: { a: '🥢', b: '🥢' }, chars: [{ id: 'lead', at: 'S', sol: ['right:3'] }, { id: 'miso', at: 'M', hat: 'tap', sol: ['tap', 'right:3'] }], sol: ['right:3'] },
        { name: '미소 블록 고치기', say: '{F}: 톡 했는데 안 움직여…', f: 'miso', map: ['........', 'S..a....', '........', 'M..b....', '........'], legend: { a: '🥢', b: '🥢' }, chars: [{ id: 'lead', at: 'S', sol: ['right:3'], given: ['right:3'] }, { id: 'miso', at: 'M', hat: 'tap', sol: ['tap', 'right:3'], given: ['tap', 'left:3'] }], sol: ['right:3'] },
      ] },
      { unlock: ['plant'], sticker: '🟦', m: [
        { name: '천을 가져와', say: '{F}: 이번엔 현이를 톡 해서 천을 가져오자. 천을 가져오면 그 자리에 놓기!', f: 'hyun', map: ['........', 'S....a..', '........', 'H..b....', '........'], legend: { a: '🟦', b: '🟦' }, chars: [{ id: 'lead', at: 'S', sol: ['right:5'] }, { id: 'hyun', at: 'H', hat: 'tap', sol: ['tap', 'right:3'] }], sol: ['right:5'] },
        { name: '현이 블록 고치기', say: '{F}: 내 천이 저기 있는데…', f: 'hyun', map: ['........', 'S....a..', '........', 'H..b....', '........'], legend: { a: '🟦', b: '🟦' }, chars: [{ id: 'lead', at: 'S', sol: ['right:5'], given: ['right:5'] }, { id: 'hyun', at: 'H', hat: 'tap', sol: ['tap', 'right:3'], given: ['tap', 'right:1'] }], sol: ['right:5'] },
      ] },
      { unlock: ['wait'], sticker: '⏳', m: [
        { name: '잠깐 기다렸다가', say: '{F}: 폴대를 세우고, 잠깐 기다렸다가 천을 덮어야 해.', f: 'samchon', map: ['........', '........', 'S.a.b...', '........', '........'], legend: { a: '🥢', b: '🟦' }, order: ['a', 'b'], need: ['wait'], sol: ['right:2', 'wait:1', 'right:2'] },
        { name: '삼촌 블록 고치기', say: '{F}: 기다리는 걸 잊었네!', f: 'samchon', map: ['........', '........', 'S.a.b...', '........', '........'], legend: { a: '🥢', b: '🟦' }, order: ['a', 'b'], need: ['wait'], sol: ['right:2', 'wait:1', 'right:2'], given: ['right:2', 'pop', 'right:2'] },
      ] },
      { unlock: [], sticker: '📌', m: [
        { name: '폴대 → 천 → 팻말', say: '{F}: 순서대로! 폴대, 천, 마지막에 팻말.', f: 'imo', map: ['..c.....', '........', 'S.a.....', '........', '..b.....'], legend: { a: '🥢', b: '🟦', c: '📌' }, order: ['a', 'b', 'c'], sol: ['right:2', 'down:2', 'up:4'] },
        { name: '초록이 블록 고치기', say: '{F}: 팻말을 먼저 박았더니 텐트가 무너졌어…', f: 'chorok', map: ['..c.....', '........', 'S.a.....', '........', '..b.....'], legend: { a: '🥢', b: '🟦', c: '📌' }, order: ['a', 'b', 'c'], sol: ['right:2', 'down:2', 'up:4'], given: ['right:2', 'up:2', 'down:4'] },
      ] },
      { unlock: [], sticker: '⛺', m: [
        { name: '텐트 완성!', say: '{F}: 나를 톡 해서 팻말을 가져다줘. 오빠는 폴대와 천!', f: 'miso', map: ['S.a.....', '........', '....b...', '........', 'M....c..'], legend: { a: '🥢', b: '🟦', c: '📌' }, order: ['a', 'b', 'c'], chars: [{ id: 'lead', at: 'S', sol: ['right:2', 'down:2', 'right:2'] }, { id: 'miso', at: 'M', hat: 'tap', sol: ['tap', 'right:5'] }], sol: ['right:2', 'down:2', 'right:2'] },
        { name: '미소 블록 고치기', say: '{F}: 팻말까지 조금 모자라!', f: 'miso', map: ['S.a.....', '........', '....b...', '........', 'M....c..'], legend: { a: '🥢', b: '🟦', c: '📌' }, order: ['a', 'b', 'c'], chars: [{ id: 'lead', at: 'S', sol: ['right:2', 'down:2', 'right:2'], given: ['right:2', 'down:2', 'right:2'] }, { id: 'miso', at: 'M', hat: 'tap', sol: ['tap', 'right:5'], given: ['tap', 'right:3'] }], sol: ['right:2', 'down:2', 'right:2'] },
      ] },
    ],
  });
  U.push({
    title: '주방 2: 김밥', bg: '🍙', theme: 'linear-gradient(#ffe5ec,#ffc2d1)', thing: '김밥 말기', sticker: '🍙', props: ['🍚', '🥕', '🥒', '🥚', '🍙'],
    days: [
      { unlock: ['repeat'], sticker: '🍚', m: [
        { name: '반복으로 짧게', say: '{F}: 재료 올리고 말고, 재료 올리고 말고… 반복 블록 하나로 해 보자!', f: 'imo', map: ['........', '........', 'S.a.b.c.', '........', '........'], legend: { a: '🍚', b: '🥕', c: '🥒' }, max: 2, sol: ['repeat:3[right:2]'] },
        { name: '현이 블록 고치기', say: '{F}: 두 번만 반복했더니 하나가 남았어.', f: 'hyun', map: ['........', '........', 'S.a.b.c.', '........', '........'], legend: { a: '🍚', b: '🥕', c: '🥒' }, max: 2, sol: ['repeat:3[right:2]'], given: ['repeat:2[right:2]'] },
      ] },
      { unlock: [], sticker: '🥕', m: [
        { name: '계단처럼', say: '{F}: 오른쪽, 위, 오른쪽, 위… 반복 안에 블록 두 개!', f: 'chorok', map: ['........', '...c....', '..b.....', '.a......', 'S.......'], legend: { a: '🍚', b: '🥕', c: '🥒' }, max: 3, sol: ['repeat:3[right:1,up:1]'] },
        { name: '초록이 블록 고치기', say: '{F}: 계단이 이상해…', f: 'chorok', map: ['........', '...c....', '..b.....', '.a......', 'S.......'], legend: { a: '🍚', b: '🥕', c: '🥒' }, max: 3, sol: ['repeat:3[right:1,up:1]'], given: ['repeat:3[right:1,down:1]'] },
      ] },
      { unlock: ['grow'], sticker: '🔼', m: [
        { name: '김밥이 커져요', say: '{F}: 재료를 다 넣고 커지기! 왕김밥이야.', f: 'samchon', map: ['........', '........', 'S.a.b...', '........', '........'], legend: { a: '🍚', b: '🥚' }, need: ['grow'], sol: ['right:4', 'grow'] },
        { name: '삼촌 블록 고치기', say: '{F}: 커지지가 않네?', f: 'samchon', map: ['........', '........', 'S.a.b...', '........', '........'], legend: { a: '🍚', b: '🥚' }, need: ['grow'], sol: ['right:4', 'grow'], given: ['right:4', 'pop'] },
      ] },
      { unlock: ['shrink'], sticker: '🔽', m: [
        { name: '한입 크기로', say: '{F}: 동생 먹기 좋게 작아지기!', f: 'miso', map: ['........', '........', 'S.a.b...', '........', '........'], legend: { a: '🍚', b: '🥒' }, need: ['shrink'], sol: ['right:4', 'shrink'] },
        { name: '미소 블록 고치기', say: '{F}: 더 커졌어! 반대야.', f: 'miso', map: ['........', '........', 'S.a.b...', '........', '........'], legend: { a: '🍚', b: '🥒' }, need: ['shrink'], sol: ['right:4', 'shrink'], given: ['right:4', 'grow'] },
      ] },
      { unlock: [], sticker: '🍙', m: [
        { name: '김밥 완성!', say: '{F}: 재료 네 개를 반복으로 모으고, 커졌다가 작게! 김밥 완성.', f: 'imo', map: ['........', '........', 'S.a.b.c.', '........', '........'], legend: { a: '🍚', b: '🥕', c: '🥒' }, need: ['grow', 'shrink'], max: 4, sol: ['repeat:3[right:2]', 'grow', 'shrink'] },
        { name: '현이 블록 고치기', say: '{F}: 반복 숫자가 이상해!', f: 'hyun', map: ['........', '........', 'S.a.b.c.', '........', '........'], legend: { a: '🍚', b: '🥕', c: '🥒' }, need: ['grow', 'shrink'], max: 4, sol: ['repeat:3[right:2]', 'grow', 'shrink'], given: ['repeat:1[right:2]', 'grow', 'shrink'] },
      ] },
    ],
  });
  /* 7~12단원은 v1.1.0에서 미션을 넣어요 (지금은 자유 만들기 배경·스티커만) */
  const soon = (title, bg, theme, thing, sticker, props, unlocks) => ({ title, bg, theme, thing, sticker, props, soon: true, days: Array.from({ length: 5 }, (_, i) => ({ unlock: unlocks[i] || [], sticker, m: [] })) });
  U.push(soon('바다: 해루질', '🌊', 'linear-gradient(#023e8a,#0096c7)', '갯벌 생물 채집', '🦀', ['🐚', '🦀', '🐙', '🔦', '🪣'], [['forever'], ['hide'], ['show'], [], []]));
  U.push(soon('곤충 숨바꼭질', '🦋', 'linear-gradient(#d8f3dc,#95d5b2)', '꽃 피우기', '🦋', ['🦋', '🐞', '🐝', '🌸', '🌻'], [['touch'], [], [], [], []]));
  U.push(soon('주방 3: 생일 케이크', '🎂', 'linear-gradient(#fde2e4,#fad2e1)', '생일 케이크', '🎂', ['🎂', '🕯️', '🍓', '🎈', '🎁'], [['rec'], [], [], [], []]));
  U.push(soon('우주정거장', '🚀', 'linear-gradient(#10002b,#3c096c)', '로켓 발사', '🚀', ['🚀', '🪐', '⭐', '👩‍🚀', '🛸'], [['send'], ['recv'], [], [], []]));
  U.push(soon('그림책: 오늘 캠핑 이야기', '📖', 'linear-gradient(#fff1e6,#fde2e4)', '2장짜리 이야기', '📖', ['🏕️', '🐟', '🔥', '🌙', '⭐'], [['page'], [], [], [], []]));
  U.push(soon('과학실험실', '🧪', 'linear-gradient(#e0fbfc,#c2dfe3)', '내가 만드는 실험', '🧪', ['🧪', '⚗️', '🔬', '🧲', '💥'], [[], [], [], [], []]));

  /* 앱이 읽는 말 */
  const lines = {
    praise: ['잘했어!', '멋져!', '대단해!', '정말 잘했어!', '와, 해냈다!', '최고야!'],
    retry: ['다시 해 볼까?', '괜찮아, 한 번 더!', '조금만 바꿔 볼까?'],
  };
  return { leaders, friends, kids, blocks, catName, units: U, lines, W: 8, H: 5 };
})();
