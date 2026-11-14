/* ==========================================================
   AGENDAR — monta a mensagem e abre o WhatsApp
   ========================================================== */
$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const msg = `Olá, Ruwer Garage! Sou ${$('#fName').value} e tenho um ${$('#fCar').value}. Preciso de: ${$('#fSvc').value}. Quero agendar uma avaliação.`;
  window.open(`https://wa.me/${RUWER.WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
});
