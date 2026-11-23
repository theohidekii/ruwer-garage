/* ==========================================================
   CARROSSEL DE SERVIÇOS + FORMULÁRIO (abre o WhatsApp com a mensagem pronta)
   ========================================================== */
(function () {
const { $, waLink } = RUWER;
const svcTrack=$('#svcTrack'),svcStep=()=>svcTrack.querySelector('.scard').offsetWidth+16;
$('#svPrev').addEventListener('click',()=>svcTrack.scrollBy({left:-svcStep(),behavior:'smooth'}));
$('#svNext').addEventListener('click',()=>svcTrack.scrollBy({left:svcStep(),behavior:'smooth'}));
$('#ctaForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const nome=(f.get('nome')||'').toString().trim();
  const srv=(f.get('srv')||'').toString();
  const obs=(f.get('msg')||'').toString().trim();
  const t='Olá! Vim pelo site da Ruwer Garage e quero agendar uma avaliação.\n\n'+
    '*Nome:* '+nome+'\n'+
    '*Serviço:* '+srv+'\n'+
    '*Observação:* '+(obs||'não informada');
  window.open(waLink(t),'_blank','noopener');
});

})();
