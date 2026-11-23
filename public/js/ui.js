/* ==========================================================
   NAV (estado compacto) + REVELAÇÃO AO ROLAR
   ========================================================== */
(function () {
const { $ } = RUWER;
const navEl=$('#nav');let navMin=false;
addEventListener('scroll',()=>{const m=scrollY>60;if(m!==navMin){navMin=m;navEl.classList.toggle('min',m)}},{passive:true});
const rvEls=[...document.querySelectorAll('.sec-head,.scard,.step3,.feat,.pillar,.ia-note,.ia-sugg,.ia-panel,.cta-card,.chips')].filter(el=>!el.closest('#processo'));
rvEls.forEach(el=>el.classList.add('rv'));
const rvIO=new IntersectionObserver(es=>{es.forEach((e,k)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('in'),Math.min(k,4)*80);rvIO.unobserve(e.target)}})},{threshold:.12});
rvEls.forEach(el=>rvIO.observe(el));
/* garantia: se o observador falhar (rolagem muito rápida, aba em segundo plano), revela pelo scroll */
let rvT=0;function rvSweep(){rvT=0;rvEls.forEach(el=>{if(!el.classList.contains('in')&&el.getBoundingClientRect().top<innerHeight*.92){el.classList.add('in');rvIO.unobserve(el)}})}
const rvKick=()=>{if(!rvT)rvT=setTimeout(rvSweep,120)};
addEventListener('scroll',rvKick,{passive:true});addEventListener('resize',rvKick);setInterval(rvSweep,1000);

/* menu: destaca o botão da seção que está na tela (aria-current) */
const spy=[...document.querySelectorAll('.links a.pill[href^="#"]'),document.querySelector('.dd .pill')]
  .filter(Boolean).map(a=>({a,s:document.querySelector(a.getAttribute('href')||'#servicos')})).filter(x=>x.s);
function spyUpdate(){
  const y=scrollY+150;let cur=null;
  spy.forEach(x=>{if(x.s.getBoundingClientRect().top+scrollY<=y)cur=x});
  spy.forEach(x=>x.a.setAttribute('aria-current',x===cur?'true':'false'))}
addEventListener('scroll',spyUpdate,{passive:true});addEventListener('resize',spyUpdate);spyUpdate();
})();
