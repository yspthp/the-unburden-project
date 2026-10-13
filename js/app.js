(() => {
'use strict';

const { SCREENS, LOOK, CUES, K, $, later, brew, aroma } = window.Unburden;
const paper = $('#paper'), text = $('#text'), cardText = $('#cardText'), btn = $('#btn'), lbl = btn.querySelector('.lbl');

/* ===== 紙紋（卡片與備援用） ===== */
const svgURL = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const fine = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .32  0 0 0 0 .22  0 0 0 0 .13  0 0 0 .55 -.17'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
document.documentElement.style.setProperty('--grain-fine', svgURL(fine));
$('.grain').style.backgroundImage = svgURL(fine);

/* ===== 進度記號 ===== */
const marks = $('#marks');
SCREENS.forEach(() => marks.appendChild(document.createElement('i')));
const setMarks = i => [...marks.children].forEach((m, k) => { m.className = k < i ? 'on' : k === i ? 'now' : ''; });

/* ===== 流程 ===== */
let cur = -1, busy = true;
const norm = L => typeof L === 'string' ? {t:L} : L;

function build(target, sc){
  target.textContent = '';
  target.classList.toggle('dense', !!sc.dense);
  sc.lines.map(norm).forEach(o => {
    const p = document.createElement('p');
    p.className = 'ln' + (o.gap ? ' gap' : '') + (o.k ? ' ' + o.k : '');
    if (o.k === 'verse'){
      p.setAttribute('aria-label', o.t);
      [...o.t].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch;
        p.appendChild(s);
      });
    } else p.textContent = o.t;
    target.appendChild(p);
  });
}

function reveal(target, sc){
  const els = [...target.children], L = sc.lines.map(norm), pace = sc.pace * K, cues = CUES[sc.id] || {};
  let t = 0;
  els.forEach((el, i) => {
    if (i > 0){
      const prev = L[i - 1], o = L[i];
      t += Math.min(2800, 520 + prev.t.length * 62) * pace;
      if (o.gap) t += 520 * pace;
      if (o.k === 'verse') t += 1500 * pace;
      if (prev.k === 'verse') t += prev.t.length * 125 * pace;
      if (prev.k === 'ref') t += 1800 * pace;
    }
    later(() => {
      el.classList.add('in');
      if (L[i].k === 'verse') [...el.children].forEach((s, j) => later(() => s.classList.add('in'), j * 125 * pace));
      if (cues[i]){
        brew.to(cues[i].u, cues[i].dur);
        if (cues[i].cls) paper.classList.add(cues[i].cls);
      }
    }, t);
  });
  const lastL = L[L.length - 1];
  const end = t + (1000 + lastL.t.length * 40 + (lastL.k === 'verse' ? lastL.t.length * 125 : 0)) * pace;
  if (sc.button) later(() => showBtn(sc.button), end);
  else later(() => { busy = false; }, end);
}

function showBtn(label){ lbl.textContent = label; btn.classList.add('show'); busy = false; }

function reserve(sc){
  if (sc.card){ brew.to({clrA:0}, 3000); return; }
  const P = paper.getBoundingClientRect(), r = $('.inner').getBoundingClientRect(), pad = 10;
  const box = [(r.left - pad - P.left) / P.width, 1 - (r.bottom + pad - P.top) / P.height,
               (r.right + pad - P.left) / P.width, 1 - (r.top - pad - P.top) / P.height];
  brew.to({clr:box, clrA:1}, 3200);
}

function enter(i){
  cur = i;
  const sc = SCREENS[i], look = LOOK[sc.id];
  paper.dataset.s = sc.id;
  setMarks(i);
  if (look) brew.to(look.u, look.dur);
  if (sc.id === 2){
    later(() => brew.to({sweet:1}, 1600), 600 * K);
    later(() => brew.splash(.17, .8, 1.15), 2050 * K);
    later(() => brew.to({bitter:1}, 2600), 2600 * K);
    later(() => brew.to({sweet:0}, 5200), 6200 * K);
  }
  if (sc.id === 5) aroma.start();
  if (sc.id === 6) later(() => aroma.toMotes(), 1800 * K);
  if (sc.id === 7){ paper.classList.remove('epi'); later(() => aroma.stop(), 3800); }
  if (sc.id === 1) dripLoop();
  let target = text, wait = 900;
  if (sc.id === 6) wait = 2800;
  if (sc.card){ paper.classList.add('final'); target = cardText; wait = 2200; }
  build(target, sc);
  reserve(sc);
  later(() => reveal(target, sc), wait * K);
}

/* 第一至四屏：苦飲不時從上方滴入液面 */
function dripLoop(){
  if (cur < 0 || SCREENS[cur].id > 4) return;
  brew.drip();
  later(dripLoop, 2400 + Math.random() * 2600);
}

function leave(cb){
  text.classList.add('out');
  later(() => { text.classList.remove('out', 'held'); cb(); }, 1250 * K);
}

/* 「我喝下了」：液面泛起漣漪、被溫暖接住，然後慢慢被紙吸去，只留下潮線 */
function catchMoment(){
  const pr = paper.getBoundingClientRect(), br = btn.getBoundingClientRect();
  const P = brew.toP(br.left + br.width * .35 - pr.left, br.top + br.height / 2 - pr.top);
  brew.ripple(P);
  brew.setHold(P);
  brew.to({hold:.55, ringDraw:1}, 1400);
  later(() => brew.to({hold:.14}, 4200), 1400 * K);
  later(() => brew.to({pool:0}, 3800), 300 * K);
  later(() => brew.to({wet:0, flow:0}, 4600), 600 * K);
  later(() => brew.to({level:.25}, 4200), 900 * K);
  later(() => brew.to({tideA:1}, 2200), 900 * K);
  later(() => brew.to({tideB:.75}, 2500), 2600 * K);
  if (navigator.vibrate) navigator.vibrate(14);
  text.classList.add('held');
  later(() => leave(() => enter(cur + 1)), 3800 * K);
}

btn.addEventListener('click', () => {
  if (busy || cur < 0) return;
  busy = true;
  btn.classList.remove('show');
  if (SCREENS[cur].catch) catchMoment();
  else leave(() => enter(cur + 1));
});

function boot(){
  if (!brew.init()) paper.classList.add('nogl');
  setTimeout(() => enter(0), 500);
}
const ready = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot, boot);
if (document.readyState === 'complete') ready();
else window.addEventListener('load', ready);
})();
