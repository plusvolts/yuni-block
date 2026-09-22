# 윤이 블록 자동 테스트: 저장소 폴더에서 python3 -m http.server 8765 (다른 포트는 PORT=8781), test 폴더에서 python3 flow.py tab 1280 800 0 / phone 390 844 1
# 점검: 하루 흐름(인사→복습→새 블록→미션→자유 만들기→하루 끝), 공통 요구사항(별 64·암호 61·통계 62·탭 63·이전 17·저장키 16), 미션 60개 정답 예시 자동 풀이
import asyncio, sys, json, os
from playwright.async_api import async_playwright
URL = 'http://localhost:%s/' % os.environ.get('PORT', '8765')
MOCK = r"""
window.speechSynthesis.speak = function(u){ window.__said=(window.__said||[]); window.__said.push(u.text); setTimeout(()=>u.onend&&u.onend(), 5); };
window.speechSynthesis.cancel = function(){};
window.__KO_LOG = [];
// 공통 65: 한국어 녹음은 실제로 요청하되 빨리 끝내기 (테스트 시간 줄이기)
const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function(){ const p = _play.call(this); if (/audio-ko\//.test(this.src)) { const a = this; const end = () => setTimeout(()=>{ try{ a.pause(); }catch(e){} a.dispatchEvent(new Event('ended')); }, 60); if (a.readyState >= 4) end(); else { a.addEventListener('canplaythrough', end, {once:true}); a.addEventListener('error', end, {once:true}); setTimeout(end, 800); } } return p; };
if(!localStorage.getItem("yuni-block-v1")) localStorage.setItem("yuni-block-v1", JSON.stringify({settings:{}}));
"""

async def run(name, vw, vh, mobile):
    REQ = {}
    src = open('../app.js', encoding='utf-8').read()
    REQ['공통 11 밤 잠금 없음'] = 'nightHour' not in src
    REQ['공통 16 저장 키 yuni-block-v1'] = "const KEY = 'yuni-block-v1'" in src
    REQ['공통 34 타이머 없음'] = 'setTimeout(() => { if (my === actToken && !micBusy' not in src
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1.5 if not mobile else 2, is_mobile=mobile, has_touch=True, locale='ko-KR')
        await ctx.add_init_script(MOCK)
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        REQ['CREQ-52 블록 22개·6색'] = await pg.evaluate("Object.keys(CONTENT.blocks).length===22 && new Set(Object.values(CONTENT.blocks).map(b=>b.cat)).size===6")
        REQ['CREQ-51 12단원×5일, 1~6단원 미션 2개/일'] = await pg.evaluate("CONTENT.units.length===12 && CONTENT.units.every(u=>u.days.length===5) && CONTENT.units.slice(0,6).every(u=>u.days.every(d=>d.m.length===2))")
        REQ['공통 06 은후 없음·현이/초록이/미소/이모/삼촌'] = await pg.evaluate("!Object.values(CONTENT.friends).some(f=>f.name.includes('은후')) && ['hyun','chorok','miso','imo','samchon'].every(k=>CONTENT.friends[k])")
        await pg.screenshot(path=f'../shots/{name}-1-home.png')
        stars = lambda: pg.evaluate("YUNI.state.stars")
        cur = lambda: pg.evaluate("JSON.stringify([YUNI.lesson.s, YUNI.lesson.i])")
        async def moved_from(k, timeout=30000):
            await pg.wait_for_function("!YUNI.lesson || JSON.stringify([YUNI.lesson.s, YUNI.lesson.i]) !== %s || document.querySelector('.reward .big-stars')" % json.dumps(k), timeout=timeout)
            await pg.wait_for_timeout(300)
        async def solve(lead_sol, chars=None):
            # 정답 예시를 블록판에 넣고 실행 (톡 캐릭터는 톡까지)
            if chars:
                for c in chars: await pg.evaluate("YUNI.lesson.setProg(%s, %s)" % (json.dumps(c['id']), json.dumps(c['sol'])))
            else: await pg.evaluate("YUNI.lesson.setProg('lead', %s)" % json.dumps(lead_sol))
            await pg.evaluate("YUNI.lesson.run('flag')")
            await pg.wait_for_function("!YUNI.stage || YUNI.stage.running===0", timeout=30000); await pg.wait_for_timeout(200)
            if chars:
                for c in chars:
                    if c.get('hat') == 'tap':
                        await pg.evaluate("YUNI.lesson.run('tap', %s)" % json.dumps(c['id']))
                        await pg.wait_for_function("!YUNI.stage || YUNI.stage.running===0", timeout=30000); await pg.wait_for_timeout(200)
        # ---- 하루 흐름 (1단원 1일차) ----
        await pg.click('[data-act=go]'); await pg.wait_for_timeout(400)
        seen = set(); T64 = {}; prev_tested = False; wrong_done = False
        for step in range(400):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("!!document.querySelector('.reward .big-stars')"):
                await pg.screenshot(path=f'../shots/{name}-9-reward.png')
                day_stars = await stars(); REQ['공통 18 하루 별 50개 이하'] = 0 < day_stars <= 50
                REQ['CREQ-58 스티커 받음'] = await pg.evaluate("Object.keys(YUNI.state.stickers).length>=1")
                REQ['CREQ-57 레벨(배운 블록) 올라감'] = await pg.evaluate("YUNI.level()>=2")
                break
            act = await pg.evaluate("(()=>{const a=YUNI.act; if(!a) return null; return {type:a.type, t:a.t, sol:a.m&&a.m.sol, chars:a.m&&a.m.chars, fix:a.fix, review:a.review}})()")
            if not act: continue
            t = act['type']
            if t not in seen: seen.add(t); await pg.wait_for_timeout(600); await pg.screenshot(path=f'../shots/{name}-2-{t}.png')
            if t == 'greet': await pg.click('[data-act=next]'); await pg.wait_for_timeout(300)
            elif t == 'msg': await pg.evaluate("YUNI.act && YUNI.act.type==='msg' && document.querySelector('[data-act=next]')?.click()")
            elif t == 'learn':
                if not prev_tested:
                    prev_tested = True
                    await pg.click('[data-act=prev]'); await pg.wait_for_timeout(300)
                    back = await pg.evaluate("JSON.stringify([YUNI.act.type, YUNI.state.pos.s])"); print(' prev from learn ->', back)
                    REQ['공통 17 이전 버튼'] = back.startswith('["greet"') or back.startswith('["msg"')
                    await pg.click('[data-act=next]'); await pg.wait_for_timeout(300); continue
                k = await cur(); s0 = await stars()
                if 'drag' not in REQ:
                    # CREQ-52 실제 끌어다 붙이기: 팔레트 블록을 코딩판으로 끌어 놓고, 다시 팔레트로 끌어 지우기
                    n0 = await pg.evaluate("YUNI.ws.get().length")
                    src = await pg.locator('[data-pal]').last.bounding_box(); dst = await pg.locator('.prog-row.main').bounding_box()
                    await pg.mouse.move(src['x'] + src['width'] / 2, src['y'] + src['height'] / 2); await pg.mouse.down()
                    for i in range(1, 11): await pg.mouse.move(src['x'] + (dst['x'] + dst['width'] - 40 - src['x']) * i / 10, src['y'] + (dst['y'] + dst['height'] / 2 - src['y']) * i / 10)
                    await pg.mouse.up(); await pg.wait_for_timeout(200)
                    n1 = await pg.evaluate("YUNI.ws.get().length"); ghosts = await pg.locator('.drag-ghost').count()
                    blk = await pg.locator('.prog-row.main [data-path]').last.bounding_box(); pal = await pg.locator('.palette').bounding_box()
                    await pg.mouse.move(blk['x'] + blk['width'] / 2, blk['y'] + blk['height'] / 2); await pg.mouse.down()
                    for i in range(1, 11): await pg.mouse.move(blk['x'] + (pal['x'] + 30 - blk['x']) * i / 10, blk['y'] + (pal['y'] + pal['height'] / 2 - blk['y']) * i / 10)
                    await pg.mouse.up(); await pg.wait_for_timeout(200)
                    n2 = await pg.evaluate("YUNI.ws.get().length"); ghosts2 = await pg.locator('.drag-ghost').count()
                    print(' drag: prog', n0, '->', n1, '-> delete', n2, ' ghosts', ghosts, ghosts2)
                    REQ['CREQ-52 끌어다 붙이기·팔레트로 끌어 삭제, 남는 유령 없음'] = n1 == n0 + 1 and n2 == n0 and ghosts == 0 and ghosts2 == 0
                    # 1칸 블록 두 개 = 2칸 (따라 놓기 정답 인정)
                    REQ['CREQ-52 1칸 블록 두 개 = 2칸'] = await pg.evaluate("BLOCKS.same(BLOCKS.parseProg(['flag','right:1','right:1']), BLOCKS.parseProg(['flag','right:2']))")
                if not wrong_done:
                    # 공통 64: 틀린 걸 놓고 실행 → 별 0, 다시 맞게 놓으면 별 1 (빨간 X·땡 없음)
                    wrong_done = True
                    await pg.evaluate("YUNI.lesson.setProg('lead', ['flag','right:1'])"); await pg.click('[data-act=run]')
                    await pg.wait_for_function("!YUNI.stage || YUNI.stage.running===0"); await pg.wait_for_timeout(600)
                    body = await pg.inner_text('body'); s1 = await stars()
                    await pg.screenshot(path=f'../shots/{name}-3-wrong.png')
                    calm = '땡' not in body and await pg.locator('.wrong').count() == 0
                await pg.evaluate("YUNI.lesson.setProg('lead', YUNI.lesson.target)"); await pg.click('[data-act=run]')
                await moved_from(k); s2 = await stars()
                if 'learn' not in T64: T64['learn'] = calm and s1 == s0 and s2 == s0 + 1; print(' 64 learn: wrong', s0, '->', s1, ' correct', s2, calm)
            elif t == 'mission':
                k = await cur(); s0 = await stars()
                if act['fix'] and 'fix' not in T64:
                    # 고치기 미션: 주어진 틀린 프로그램 그대로 실행 → 실패(별 0) → 3번 실패 뒤 정답 보여주고 "다음 ▶" → 넘어가면 별 0, 이전으로 와서 맞혀도 별 0
                    for _ in range(3):
                        await pg.click('[data-act=run]'); await pg.wait_for_function("!YUNI.stage || YUNI.stage.running===0"); await pg.wait_for_timeout(500)
                    btn = await pg.locator('[data-act=skipnext]').count(); ghost = await pg.locator('.ghost-slot').count(); s1 = await stars()
                    body = await pg.inner_text('body'); calm = '땡' not in body
                    await pg.screenshot(path=f'../shots/{name}-4-reveal.png')
                    await pg.click('[data-act=skipnext]'); await moved_from(k); s2 = await stars()
                    await pg.click('[data-act=prev]'); await pg.wait_for_timeout(400); back = await cur() == k
                    await solve(act['sol'], act['chars']); await moved_from(k); s3 = await stars()
                    T64['fix'] = btn == 1 and ghost == 1 and calm and s1 == s0 and s2 == s0 and back and s3 == s0
                    print(' 64 fix: reveal', btn, ghost, calm, ' stars', s0, s1, '-> skip', s2, '-> prev+correct', s3, back)
                    continue
                await solve(act['sol'], act['chars']); await moved_from(k); s1 = await stars()
                if 'mission' not in T64: T64['mission'] = s1 == s0 + 1; print(' mission solved: stars', s0, '->', s1)
            elif t == 'free':
                await pg.wait_for_timeout(500)
                await pg.click('[data-act=addchar][data-arg=hyun]'); await pg.wait_for_timeout(200)
                await pg.click('[data-act=addprop]'); await pg.wait_for_timeout(200)
                await pg.evaluate("YUNI.lesson.setProg('hyun', ['tap','right:2','say:🎉'])")
                await pg.click('[data-act=run]'); await pg.wait_for_function("!YUNI.stage || YUNI.stage.running===0"); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'../shots/{name}-5-free.png')
                s0 = await stars(); await pg.click('[data-act=done]'); await pg.wait_for_timeout(800); s1 = await stars()
                REQ['CREQ-56 자유 만들기 저장 → 내 작품·별 2'] = await pg.evaluate("YUNI.state.works.length===1") and s1 >= s0 + 2
        print(' 64', T64)
        REQ['공통 64 새 블록: 틀리면 0, 다시 맞히면 별 1, 땡 없음'] = T64.get('learn') is True
        REQ['공통 64 고치기 미션: 3번 실패 뒤 정답·다음▶, 넘어가면 0, 이전으로 맞혀도 0'] = T64.get('fix') is True
        REQ['CREQ-54 미션 정답이면 별 1'] = T64.get('mission') is True
        # 공통 65: 하루 흐름에서 ko()가 읽은 문장이 녹음 목록(audio-ko/index.json)에 얼마나 있는지 (문장 . ! ? 단위, app.js ko()와 같은 규칙)
        cov = await pg.evaluate("""fetch('audio-ko/index.json').then(r=>r.json()).then(idx=>{ const key=t=>String(t).replace(/\\s+/g,' ').trim();
          const sen=t=>String(t).split(/(?<=[.!?])\\s+/).map(x=>x.trim()).filter(Boolean); const all=new Set(), miss=new Set();
          for (const t of window.__KO_LOG) { const parts = idx[key(t)] ? [t] : sen(t); for (const p of parts) { all.add(key(p)); if (!idx[key(p)]) miss.add(key(p)); } }
          return {n:all.size, miss:[...miss], files:Object.keys(idx).length}; })""")
        pct = 100 * (cov['n'] - len(cov['miss'])) / max(1, cov['n'])
        print(f" 65 한국어 녹음: 읽은 문장 {cov['n']}개 중 녹음 있음 {pct:.1f}% (녹음 목록 {cov['files']}개), 빠진 문장:", cov['miss'])
        REQ['공통 65 읽은 한국어 문장 95% 이상 녹음'] = cov['n'] > 0 and pct >= 95
        # ---- 미션 60개 정답 예시 자동 풀이 (진도 코드로 각 일차 미션 단계 진입) ----
        fails = []
        for u in range(6):
            for d in range(1, 6):
                await pg.evaluate("YUNI.state.pos={u:%d,d:%d,s:3}; YUNI.state.log={}; localStorage.setItem('yuni-block-v1', JSON.stringify(YUNI.state))" % (u, d))  # 하루 별 50개 제한에 안 걸리게 그날 기록 비움
                await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('[data-act=go]'); await pg.wait_for_timeout(300)
                for i in range(2):
                    act = await pg.evaluate("(()=>{const a=YUNI.act; return a && {type:a.type, sol:a.m&&a.m.sol, chars:a.m&&a.m.chars, name:a.m&&a.m.name}})()")
                    if not act or act['type'] != 'mission': fails.append(f'{u+1}-{d} #{i}: 미션 아님 {act}'); break
                    k = await cur(); s0 = await stars()
                    await solve(act['sol'], act['chars'])
                    try: await moved_from(k, 8000)
                    except Exception: fails.append(f'{u+1}-{d} {act["name"]}: 정답 예시로 못 풀음 (힌트: {await pg.inner_text("#hint")})'); break
                    if await stars() != s0 + 1 and not await pg.evaluate("!!document.querySelector('.reward .big-stars')"): fails.append(f'{u+1}-{d} {act["name"]}: 별 안 오름')
        REQ['CREQ-54 미션 60개 정답 예시로 모두 풀림'] = not fails
        if fails: print(' 미션 실패:', fails)
        # ---- 아빠 화면: 암호(61)·통계(62)·탭(63) ----
        await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.click('[data-act=parent]'); await pg.wait_for_timeout(200)
        await pg.fill('#ans', '9999'); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(200)
        no_open = await pg.locator('.ptabs').count() == 0
        await pg.fill('#ans', '1234'); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(300)
        REQ['공통 61 암호 1234로 열림, 틀리면 안 열림'] = no_open and await pg.locator('.ptabs').count() == 1
        REQ['공통 63 탭 6개, 패널 1개만 보임'] = await pg.evaluate("document.querySelectorAll('.ptab').length===6 && [...document.querySelectorAll('.ppanel')].filter(p=>!p.hidden).length===1")
        await pg.click('[data-act=ptab][data-arg=stats]'); await pg.wait_for_timeout(200)
        REQ['공통 62 통계 탭 날짜별 7줄'] = await pg.evaluate("document.querySelectorAll('.stat-row').length===7 && document.querySelector('.stat-row.today')!==null")
        await pg.screenshot(path=f'../shots/{name}-7-parent-stats.png')
        await pg.click('[data-act=ptab][data-arg=settings]'); await pg.wait_for_timeout(200)
        REQ['CREQ-59 리딩 캐릭터 고르기 6종'] = await pg.evaluate("document.querySelector('[data-set=leader]').options.length===6")
        await pg.select_option('[data-set=leader]', 'robot'); await pg.wait_for_timeout(200)
        await pg.click('[data-act=home]'); await pg.wait_for_timeout(300)
        REQ['CREQ-59 캐릭터 바꾸면 홈에 반영'] = '🤖' in await pg.inner_text('.robot')
        await pg.click('[data-act=stickers]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{name}-8-stickers.png')
        REQ['CREQ-58 스티커북 12페이지'] = '/ 12 페이지' in await pg.inner_text('body')
        await b.close()
    print(f'=== {name} ===')
    for k, v in REQ.items(): print(('OK  ' if v else 'FAIL'), k)
    if errs: print(' page errors:', errs[:5])
    return all(REQ.values()) and not errs

if __name__ == '__main__':
    a = sys.argv[1:] or ['tab', '1280', '800', '0']
    ok = asyncio.run(run(a[0], int(a[1]), int(a[2]), a[3] == '1'))
    print('ALL OK' if ok else 'SOME FAILED'); sys.exit(0 if ok else 1)
