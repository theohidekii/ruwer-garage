/* ==========================================================
   CAMINHADA — o galpão em perspectiva (canvas 2D), câmera ligada ao scroll
   Mundo: x = largura (−11…11), y = altura, z = profundidade (0…100)
   Planta: lavagem à esquerda na frente, dyno na 1ª divisória da esquerda,
   baias à direita, colunas vermelhas, telhado de treliças.
   ► Para usar uma foto real no lugar do desenho: troque o <canvas> por <img>
     e mantenha os botões .hs (pontos clicáveis).
   ========================================================== */
(() => {
  const cv = $('#cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, f = 0, cx = 0, cy = 0, camX = 0, camY = 1.7, camZ = -6;

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    f = Math.max(W * .62, H * 1.0); cx = W * .5; cy = H * .47;
  }
  addEventListener('resize', size); size();

  const NEAR = .4, WALL = 11, HT = 9, APEX = 11.6, ZFAR = 100;
  const proj = (x, y, z) => { const d = Math.max(z - camZ, NEAR); return [cx + (x - camX) * f / d, cy - (y - camY) * f / d, d]; };

  function poly(pts, fill, alpha = 1) {
    ctx.beginPath();
    pts.forEach((p, i) => { const [sx, sy] = proj(p[0], p[1], p[2]); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.closePath(); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1;
  }
  function seg(a, b, color, w, alpha = 1) {
    const A = proj(...a), B = proj(...b);
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
    ctx.lineWidth = Math.max(.6, w * f / ((A[2] + B[2]) / 2)); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1;
  }
  const clampZ = z => Math.max(z, camZ + NEAR);

  function car(items, side, z0, color) {
    const xs = side * 5.2, L = 4.6;
    items.push({ z: z0 + L, fn: () => {
      const a = clampZ(z0), b = clampZ(z0 + L);
      if (z0 + L < camZ + NEAR) return;
      poly([[xs, .28, a], [xs, .95, a], [xs, .95, b], [xs, .28, b]], color);                                                  // lataria
      poly([[xs, .95, clampZ(z0 + .9)], [xs, 1.5, clampZ(z0 + 1.5)], [xs, 1.5, clampZ(z0 + 3.2)], [xs, .95, clampZ(z0 + 3.8)]], color);   // cabine
      poly([[xs, 1.0, clampZ(z0 + 1.1)], [xs, 1.42, clampZ(z0 + 1.6)], [xs, 1.42, clampZ(z0 + 3.1)], [xs, 1.0, clampZ(z0 + 3.6)]], '#17181a'); // vidros
      poly([[xs, .12, a], [xs, .3, a], [xs, .3, b], [xs, .12, b]], '#000');                                                   // saia
      for (const wz of [z0 + .95, z0 + L - .95]) {
        if (wz < camZ + NEAR) continue;
        const [sx, sy, d] = proj(xs, .34, wz), r = .36 * f / d;
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx, sy, r * .55, r, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#8d9096'; ctx.beginPath(); ctx.ellipse(sx, sy, r * .28, r * .52, 0, 0, 7); ctx.fill();
      }
    } });
  }

  function drawScene() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const z0 = camZ + NEAR;

    /* fundo: parede do fundo com portão iluminado */
    poly([[-WALL, 0, ZFAR], [-WALL, HT, ZFAR], [WALL, HT, ZFAR], [WALL, 0, ZFAR]], '#1d1e20');
    poly([[-3, 0, ZFAR], [-3, 5.2, ZFAR], [3, 5.2, ZFAR], [3, 0, ZFAR]], '#f4f4f4');

    /* telhado (duas águas) */
    poly([[-WALL, HT, z0], [0, APEX, z0], [0, APEX, ZFAR], [-WALL, HT, ZFAR]], '#101112');
    poly([[WALL, HT, z0], [0, APEX, z0], [0, APEX, ZFAR], [WALL, HT, ZFAR]], '#161718');

    /* paredes */
    poly([[-WALL, 0, z0], [-WALL, HT, z0], [-WALL, HT, ZFAR], [-WALL, 0, ZFAR]], '#232426');
    poly([[WALL, 0, z0], [WALL, HT, z0], [WALL, HT, ZFAR], [WALL, 0, ZFAR]], '#2c2d30');

    /* piso polido */
    const g = ctx.createLinearGradient(0, cy, 0, H); g.addColorStop(0, '#232427'); g.addColorStop(1, '#8f9298');
    poly([[-WALL, 0, z0], [WALL, 0, z0], [WALL, 0, ZFAR], [-WALL, 0, ZFAR]], g);
    /* faixas de sinalização */
    for (const x of [-3.4, 3.6]) poly([[x - .07, 0, z0], [x + .07, 0, z0], [x + .07, 0, ZFAR], [x - .07, 0, ZFAR]], '#f2f2f2', .85);
    /* área de lavagem (piso diferente, à esquerda na frente) */
    poly([[-WALL, 0, 2], [-4.6, 0, 2], [-4.6, 0, 10], [-WALL, 0, 10]], '#3a0b0f');
    poly([[-WALL, 0, 2], [-4.6, 0, 2], [-4.6, 0, 2.25], [-WALL, 0, 2.25]], '#e10b17');

    /* partições brancas à esquerda + porta do dyno */
    poly([[-WALL + .2, 0, 14], [-WALL + .2, 4.6, 14], [-WALL + .2, 4.6, 36], [-WALL + .2, 0, 36]], '#ececec');
    poly([[-WALL + .19, 0, 21.2], [-WALL + .19, 3.6, 21.2], [-WALL + .19, 3.6, 26.8], [-WALL + .19, 0, 26.8]], '#0d0d0e');
    seg([-WALL + .18, 3.65, 21.2], [-WALL + .18, 3.65, 26.8], '#e10b17', .2);
    for (let z = 14; z <= 36; z += 2.75) seg([-WALL + .18, 0, z], [-WALL + .18, 4.6, z], '#bdbdbd', .04);

    /* terças do telhado */
    for (const [x, y] of [[-5.5, 10.3], [5.5, 10.3], [0, APEX]]) seg([x, y, z0], [x, y, ZFAR], '#4d4f54', .09, .8);

    const items = [];
    /* tesouras e luminárias */
    for (let z = 0; z <= 96; z += 8) {
      if (z < camZ + .8) continue;
      items.push({ z, fn: () => {
        const c = '#74777d', w = .16;
        seg([-WALL, HT, z], [0, APEX, z], c, w); seg([0, APEX, z], [WALL, HT, z], c, w); seg([-WALL, HT, z], [WALL, HT, z], c, w * .8);
        seg([0, HT, z], [0, APEX, z], c, w * .7); seg([-5.5, 10.3, z], [0, HT, z], c, w * .7); seg([5.5, 10.3, z], [0, HT, z], c, w * .7);
      } });
      for (const sx of [-5, 5]) items.push({ z: z + 1.2, fn: () => { seg([sx, 8.3, z], [sx, 8.3, z + 2.6], '#fff', .1, .25); seg([sx, 8.3, z], [sx, 8.3, z + 2.6], '#fff', .34, .12); } });
    }
    /* colunas: vermelhas à direita, cinza à esquerda */
    for (let z = 6; z <= 96; z += 12) {
      if (z < camZ + .6) continue;
      items.push({ z, fn: () => {
        poly([[10.1, 0, z], [10.7, 0, z], [10.7, HT, z], [10.1, HT, z]], '#e10b17');
        poly([[10.1, 0, z], [10.1, 0, z + .6], [10.1, HT, z + .6], [10.1, HT, z]], '#a30810');
        poly([[10.1, 0, z], [10.7, 0, z], [10.7, -3, z], [10.1, -3, z]], '#e10b17', .16);               // reflexo no piso
        poly([[-10.7, 0, z], [-10.1, 0, z], [-10.1, HT, z], [-10.7, HT, z]], '#3b3d41');
      } });
    }
    /* carros */
    car(items, 1, 6, '#f2f2f2'); car(items, 1, 17, '#e9e9eb'); car(items, 1, 29, '#f2f2f2'); car(items, 1, 43, '#dedfe2');
    car(items, -1, 38, '#0a0a0b');

    items.sort((a, b) => b.z - a.z).forEach(it => it.fn());
  }

  /* ---------- pontos clicáveis projetados ---------- */
  const hs = $$('.hs').map(el => ({ el, x: +el.dataset.x, y: +el.dataset.y, z: +el.dataset.z }));
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  function placeHotspots(p) {
    hs.forEach(h => {
      const [sx, sy, d] = proj(h.x, h.y, h.z);
      const behind = h.z - camZ < NEAR + 1;
      const vis = ss(.14, .26, p) * ss(3, 7, d) * (1 - ss(20, 30, d)) * (behind ? 0 : 1) * (sx > -40 && sx < W + 40 ? 1 : 0);
      h.el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
      h.el.style.opacity = vis.toFixed(3);
      h.el.style.pointerEvents = vis > .5 ? 'auto' : 'none';
      h.el.tabIndex = vis > .5 ? 0 : -1;
    });
  }

  /* ---------- scroll → câmera ---------- */
  let target = 0, cur = 0;
  ScrollTrigger.create({ trigger: '#walk', start: 'top top', end: 'bottom bottom', onUpdate: s => target = s.progress });
  const mouse = { x: 0, sx: 0 };
  addEventListener('pointermove', e => mouse.x = e.clientX / innerWidth * 2 - 1);

  const heroCopy = $('#heroCopy'), endcard = $('#endcard'), cue = $('#cue');
  let last = performance.now(), running = true;
  new IntersectionObserver(([e]) => running = e.isIntersecting).observe($('#walk'));

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (running) {
      cur = RUWER.REDUCED ? target : cur + (target - cur) * (1 - Math.exp(-dt * 5));
      mouse.sx += (mouse.x - mouse.sx) * .05;
      camZ = -6 + 46 * cur;
      camX = mouse.sx * .7 + Math.sin(now / 1800) * .06;
      camY = 1.7 + Math.sin(now / 1300) * .025;
      drawScene(); placeHotspots(cur);

      const h = 1 - ss(.03, .17, cur);
      heroCopy.style.opacity = h; heroCopy.style.transform = `translateY(${(1 - h) * -40}px)`; heroCopy.style.pointerEvents = h > .4 ? 'auto' : 'none';
      cue.style.opacity = 1 - ss(.01, .06, cur);
      const e = ss(.84, .94, cur);
      endcard.style.opacity = e; endcard.style.pointerEvents = e > .5 ? 'auto' : 'none';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
