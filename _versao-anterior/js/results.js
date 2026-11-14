/* ==========================================================
   RESULTADOS — casos reais medidos no dinamômetro (antes x depois, em whp)
   Os dados ficam em js/config.js (RUWER.CASES).
   ========================================================== */
(() => {
  const MAX = 300;                                   // escala comum das barras (whp)
  const tabs = $$('#tabs .tab'), photos = $$('#resPhoto img');
  const rowB = $('#rowB'), rowA = $('#rowA'), fillB = $('#fillB'), fillA = $('#fillA');
  const valB = $('#valB'), valA = $('#valA'), gain = $('#gain'), gainTxt = $('#gainTxt');
  const num = { b: 0, a: 0 };

  function paint() {
    valB.firstChild.textContent = Math.round(num.b);
    valA.firstChild.textContent = Math.round(num.a);
  }

  function select(i) {
    const c = RUWER.CASES[i];
    tabs.forEach((t, k) => t.setAttribute('aria-pressed', k === i));
    photos.forEach(p => p.classList.toggle('on', p.dataset.key === c.img));

    const hasBefore = c.before != null;
    rowB.classList.toggle('off', !hasBefore);
    fillB.style.transform = `scaleX(${hasBefore ? c.before / MAX : 0})`;
    fillA.style.transform = `scaleX(${c.after / MAX})`;

    const to = { b: hasBefore ? c.before : 0, a: c.after };
    RUWER.REDUCED
      ? (Object.assign(num, to), paint())
      : gsap.to(num, { ...to, duration: 1, ease: 'power3.out', onUpdate: paint });

    if (hasBefore) {
      const d = c.after - c.before;
      gain.textContent = `+${d} whp`;
      gainTxt.textContent = `${Math.round(d / c.before * 100)}% a mais de potência na roda, depois do ${c.tag}.`;
    } else {
      gain.textContent = `${c.after} whp`;
      gainTxt.textContent = 'Projeto de preparação completa, medido no dinamômetro.';
    }
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  select(0);
})();
