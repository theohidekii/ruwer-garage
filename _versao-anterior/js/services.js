/* ==========================================================
   SERVIÇOS — a foto ao lado troca conforme a linha em foco
   Cada .row tem data-photo="<chave>"; cada <img> da .svc-photo tem data-key.
   ========================================================== */
(() => {
  const imgs = $$('.svc-photo img');
  if (!imgs.length) return;
  const show = key => imgs.forEach(i => i.classList.toggle('on', i.dataset.key === key));
  $$('.row[data-photo]').forEach(row => {
    const on = () => show(row.dataset.photo);
    row.addEventListener('mouseenter', on);
    row.addEventListener('focus', on);
  });
})();
