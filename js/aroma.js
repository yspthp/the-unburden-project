(() => {
'use strict';

const { RM, $ } = window.Unburden;
const paper = $('#paper');

/* ===== 香氣：上升的煙縷，第六屏化為光中的微塵 ===== */
const aroma = (() => {
  const c = $('#aroma'), ctx = c.getContext('2d');
  const sprite = rgb => {
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const g = s.getContext('2d'), gr = g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.45, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
  };
  const steamS = sprite('146,96,54'), moteS = sprite('214,160,72');
  let w = 0, h = 0, ps = [], motes = [], T = 0, raf = 0, last = 0, running = false, steam = 1, moteOn = false, cloudAcc = 0;
  const emitters = [.36, .5, .64].map((x, i) => ({x0:x, k:.016 + i * .004, om:.55 + i * .17, amp:14 + i * 6, ph:i * 2.1, drift:(i - 1) * 22, acc:0}));
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = paper.clientWidth; h = paper.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function step(dt){
    T += dt;
    emitters.forEach(e => {
      e.acc += dt;
      while (e.acc > .15){ e.acc -= .15;
        if (Math.random() < steam) ps.push({e, y:h + 12, vy:h * (.052 + Math.random() * .016), age:0, life:9 + Math.random() * 2, s0:5 + Math.random() * 6, a:.15});
      }
    });
    cloudAcc += dt;
    if (cloudAcc > .7){ cloudAcc = 0;
      if (Math.random() < steam) ps.push({e:null, x:w * (.2 + Math.random() * .6), y:h * (.75 + Math.random() * .3), vy:h * .025, age:0, life:12, s0:60 + Math.random() * 90, a:.035});
    }
    for (const p of ps){
      p.age += dt; p.y -= p.vy * dt;
      const pr = p.age / p.life;
      if (p.e){
        const e = p.e;
        p.x = e.x0 * w + e.amp * (.25 + pr * 1.5) * Math.sin(e.k * (h - p.y) - e.om * T + e.ph) + pr * e.drift;
        p.s = p.s0 + pr * pr * 50;
      } else p.s = p.s0 * (1 + pr * .6);
      p.al = p.a * Math.pow(Math.sin(Math.PI * Math.min(1, pr)), 1.2);
    }
    ps = ps.filter(p => p.age < p.life);
    if (moteOn && motes.length < 34 && Math.random() < dt * 6)
      motes.push({x:w * Math.random(), y:h * (.25 + Math.random() * .75), vx:(Math.random() - .5) * 4, vy:-(4 + Math.random() * 7),
                  s:2.5 + Math.random() * 4, ph:Math.random() * 6.28, age:0, life:9 + Math.random() * 7});
    for (const m of motes){
      m.age += dt; m.x += (m.vx + Math.sin(T * .4 + m.ph) * 3) * dt; m.y += m.vy * dt;
      m.al = .5 * Math.sin(Math.PI * Math.min(1, m.age / m.life)) * (.65 + .35 * Math.sin(T * 1.3 + m.ph));
    }
    motes = motes.filter(m => m.age < m.life);
  }
  function draw(){
    ctx.clearRect(0, 0, w, h);
    for (const p of ps){ if (p.al > .002){ ctx.globalAlpha = p.al; ctx.drawImage(steamS, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); } }
    for (const m of motes){ if (m.al > .002){ ctx.globalAlpha = m.al; const s = m.s * 3; ctx.drawImage(moteS, m.x - s / 2, m.y - s / 2, s, s); } }
    ctx.globalAlpha = 1;
  }
  function frame(now){
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 32) return;
    const dt = last ? Math.min(.06, (now - last) / 1000) : .033;
    last = now; step(dt); draw();
  }
  function start(){
    resize(); steam = 1;
    if (RM){ for (let i = 0; i < 170; i++) step(.05); draw(); return; }
    if (running) return;
    running = true; last = 0; raf = requestAnimationFrame(frame);
  }
  function toMotes(){ steam = 0; moteOn = true; if (RM){ for (let i = 0; i < 120; i++) step(.05); draw(); } }
  function stop(){ running = false; cancelAnimationFrame(raf); ps = []; motes = []; ctx.clearRect(0, 0, w, h); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running){ last = 0; raf = requestAnimationFrame(frame); }
  });
  window.addEventListener('resize', () => { if (running) resize(); });
  return {start, toMotes, stop};
})();

window.Unburden.aroma = aroma;
})();
