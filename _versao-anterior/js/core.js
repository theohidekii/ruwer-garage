/* ==========================================================
   CORE — helpers, scroll macio, navegação por âncora, parallax das fotos
   ========================================================== */
gsap.registerPlugin(ScrollTrigger);

window.$  = (s, c = document) => c.querySelector(s);
window.$$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- Scroll macio (Lenis) ---------- */
if (!RUWER.REDUCED) {
  RUWER.lenis = new Lenis({ lerp: .085 });
  RUWER.lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => RUWER.lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Âncoras (links e pontos do galpão) ---------- */
$$('a[href^="#"],button[data-go]').forEach(a => a.addEventListener('click', e => {
  const h = a.getAttribute('href') || a.dataset.go;
  if (!h || h.length < 2) return;
  const t = $(h);
  if (!t) return;
  e.preventDefault();
  RUWER.lenis ? RUWER.lenis.scrollTo(t, { duration: 1.6, offset: -60 }) : t.scrollIntoView();
}));

/* ---------- Parallax suave das faixas de foto ---------- */
if (!RUWER.REDUCED) {
  $$('.band img').forEach(img => gsap.fromTo(img, { yPercent: -7 }, {
    yPercent: 7, ease: 'none',
    scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
  }));
}

/* ---------- Vídeo: toca só quando está na tela ---------- */
$$('video[data-inview]').forEach(v => {
  if (RUWER.REDUCED) { v.controls = true; return; }
  new IntersectionObserver(([e]) => e.isIntersecting ? v.play().catch(() => {}) : v.pause(), { threshold: .35 }).observe(v);
});
