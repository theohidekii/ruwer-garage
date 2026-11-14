/* ==========================================================
   CONFIG — edite aqui os dados da oficina
   ========================================================== */
window.RUWER = {
  WHATSAPP: '5500000000000',     // ← número real (DDI + DDD + número)
  REDUCED: matchMedia('(prefers-reduced-motion:reduce)').matches,
  lenis: null,

  /* Resultados reais exibidos na seção "Resultados" (potência em whp, na roda) */
  CASES: [
    { id:'up',     car:'Up! 170 TSI',          tag:'Remap',                 before:107, after:127, img:'res-up' },
    { id:'virtus', car:'Virtus 1.4 TSI',       tag:'Stage 1',               before:134, after:151, img:'res-virtus' },
    { id:'f30',    car:'BMW 320i F30',         tag:'Stage 2',               before:176, after:251, img:'res-f30' },
    { id:'bmw',    car:'BMW preparada',        tag:'Preparação exclusiva',  before:null, after:281, img:'res-281' }
  ]
};
