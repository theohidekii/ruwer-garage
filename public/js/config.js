/* ==========================================================
   CONFIG: dados da oficina e estado compartilhado (window.RUWER)
   ========================================================== */
window.RUWER = (function () {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* WhatsApp: TROQUE O NÚMERO (DDI 55 + DDD + número) */
  const NUM = '5561999999999';
  const WA = 'https://api.whatsapp.com/send?phone=' + NUM + '&text=' + encodeURIComponent('Olá! Vim pelo site da Ruwer Garage e quero agendar uma avaliação.');
  const waLink = t => 'https://api.whatsapp.com/send?phone=' + NUM + '&text=' + encodeURIComponent(t);
  document.querySelectorAll('[data-wa]').forEach(a => { a.href = WA; a.target = '_blank'; a.rel = 'noopener'; });

  return {
    $, reduce, NUM, WA, waLink,
    state: { mode: 'site', busy: false, savedY: 0 },        // site | 3d
    mouse: { x: 0, y: 0, tx: 0, ty: 0 },                    // parallax da câmera 3D
    st: { y: 2.5, ly: 2.4, ld: 34, fov: 42 }                // estado extra da câmera (Z é animado direto)
  };
})();
