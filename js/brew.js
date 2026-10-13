(() => {
'use strict';

const { RM, K, $, SHADERS } = window.Unburden;
const { VS, COMMON, FIELD, MAIN } = SHADERS;
const paper = $('#paper');

/* ===== 苦飲與紙（WebGL 渲染控制器） ===== */
const brew = (() => {
  const c = $('#brew');
  const U = {paper:[.953,.929,.882], level:0, pool:0, wet:0, flow:0, ring:0, ringDraw:0, ringR:1, sweet:0, bitter:0,
             light:0, gold:0, fade:0, vig:0, hold:0, tideA:0, tideB:0, clr:[.1,.3,.9,.8], clrA:0};
  const NAMES = {level:'uLevel', pool:'uPool', wet:'uWet', flow:'uFlow', ring:'uRing', ringDraw:'uRingDraw', ringR:'uRingR',
                 sweet:'uSweet', bitter:'uBitter', light:'uLight', gold:'uGold', fade:'uFade', vig:'uVig', hold:'uHold'};
  const tw = {};
  let gl = null, pf = null, pm = null, tex = null, fb = null, W = 0, H = 0, loc = {};
  let raf = 0, last = 0, T = 0, ripT = 0, ripOn = false, rip = [0, 0], holdC = [0, 0];

  function shader(type, src){
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ paper.dataset.gl = 'shader: ' + gl.getShaderInfoLog(s); return null; }
    return s;
  }
  function program(fs){
    const v = shader(gl.VERTEX_SHADER, VS), f = shader(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }
  function init(){
    try { gl = c.getContext('webgl', {alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'low-power'}); } catch (e) { gl = null; }
    if (!gl) return false;
    const deriv = gl.getExtension('OES_standard_derivatives');
    pf = program(COMMON + FIELD);
    pm = program((deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV\n' : '') + COMMON + MAIN);
    if (!pf || !pm){ gl = null; return false; }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ['uF','uRes','uAsp','uT','uPaper','uTide','uRip','uHoldC','uClr','uClrA', ...Object.values(NAMES)].forEach(n => loc[n] = gl.getUniformLocation(pm, n));
    tex = gl.createTexture(); fb = gl.createFramebuffer();
    c.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; paper.classList.add('nogl'); });
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    paper.dataset.gl = 'ok';
    return true;
  }
  function resize(){
    if (!gl) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(paper.clientWidth * dpr), h = Math.round(paper.clientHeight * dpr);
    if (w === W && h === H) return;
    W = c.width = w; H = c.height = h;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, W, H);
    gl.useProgram(pf);
    gl.uniform2f(gl.getUniformLocation(pf, 'uRes'), W, H);
    gl.uniform1f(gl.getUniformLocation(pf, 'uAsp'), W / H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    draw(performance.now());
  }
  function draw(now){
    if (!gl) return;
    gl.viewport(0, 0, W, H);
    gl.useProgram(pm);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc.uF, 0);
    gl.uniform2f(loc.uRes, W, H);
    gl.uniform1f(loc.uAsp, W / H);
    gl.uniform1f(loc.uT, T);
    gl.uniform3fv(loc.uPaper, U.paper);
    for (const k in NAMES) gl.uniform1f(loc[NAMES[k]], U[k]);
    gl.uniform4f(loc.uTide, .34, U.tideA, .295, U.tideB);
    gl.uniform4fv(loc.uClr, U.clr);
    gl.uniform1f(loc.uClrA, U.clrA);
    const age = (now - ripT) / 1000;
    gl.uniform3f(loc.uRip, rip[0], rip[1], ripOn && age < 7 ? age : -1);
    gl.uniform2f(loc.uHoldC, holdC[0], holdC[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const ease = e => e < .5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
  function step(now){
    for (const k in tw){
      const w = tw[k];
      if (w.a === null) w.a = Array.isArray(U[k]) ? U[k].slice() : U[k];
      const r = Math.min(1, (now - w.t0) / w.d), e = ease(r);
      U[k] = Array.isArray(w.b) ? w.b.map((v, i) => w.a[i] + (v - w.a[i]) * e) : w.a + (w.b - w.a) * e;
      if (r >= 1) delete tw[k];
    }
  }
  function frame(now){
    raf = 0;
    if (!gl) return;
    if (!last || now - last >= 30){
      const dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      if (!RM) T += dt * U.wet;
      last = now;
      step(now); draw(now);
    }
    const moving = Object.keys(tw).length || (!RM && U.wet > .01 && U.flow > .01) || (ripOn && now - ripT < 7000);
    if (moving && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function kick(){ if (gl && !raf) raf = requestAnimationFrame(frame); }
  function to(obj, dur){
    const t0 = performance.now();
    for (const k in obj) tw[k] = {a:null, b:obj[k], t0, d:Math.max(16, dur * K)};
    kick();
  }
  function toP(x, y){ return [x / paper.clientWidth * (paper.clientWidth / paper.clientHeight), 1 - y / paper.clientHeight]; }
  function ripple(P){ if (RM) return; rip = P; ripT = performance.now(); ripOn = true; kick(); }
  function setHold(P){ holdC = P; }
  return {init, to, toP, ripple, setHold};
})();

window.Unburden.brew = brew;
})();
