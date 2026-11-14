/* ==========================================================
   CARROSSEL DE SERVIÇOS + FORMULÁRIO (abre o WhatsApp com a mensagem pronta)
   ========================================================== */
(function () {
const { $, waLink } = RUWER;
const svcTrack=$('#svcTrack'),svcStep=()=>svcTrack.querySelector('.scard').offsetWidth+16;
$('#svPrev').addEventListener('click',()=>svcTrack.scrollBy({left:-svcStep(),behavior:'smooth'}));
$('#svNext').addEventListener('click',()=>svcTrack.scrollBy({left:svcStep(),behavior:'smooth'}));
$('#ctaForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);
  const t='Olá! Vim pelo site da Ruwer Garage e gostaria de agendar uma avaliação.\nNome: '+(f.get('nome')||'')+'\nTelefone: '+(f.get('tel')||'')+'\nServiço: '+(f.get('srv')||'')+'\nRelato: '+(f.get('msg')||'não informado');
  window.open(waLink(t),'_blank','noopener')});
})();
