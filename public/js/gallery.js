/* ==========================================================
   GALERIA: filtro por categoria + LIGHTBOX (placeholders data-ph continuam suportados)
   ========================================================== */
(function () {
const { $, reduce } = RUWER;
function ph(label){
  const svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1a1a1f'/><stop offset='1' stop-color='#09090b'/></linearGradient></defs><rect width='800' height='800' fill='url(#g)'/><path d='M0 590 L800 430' stroke='#E61C1C' stroke-opacity='.4' stroke-width='2'/><text x='48' y='708' fill='#fff' fill-opacity='.9' font-family='Inter,Arial,sans-serif' font-size='34' font-weight='600'>"+label+"</text><text x='48' y='750' fill='#E61C1C' font-family='Inter,Arial,sans-serif' font-size='22'>Inserir foto da oficina aqui</text></svg>";
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
document.querySelectorAll('img[data-ph]').forEach(im=>{if(!im.getAttribute('src'))im.src=ph(im.dataset.ph)});

const gItems=[...document.querySelectorAll('.g')];
const lb=$('#lb'),lbImg=$('#lbimg'),lbCap=$('#lbcap'),lbCount=$('#lbc'),lbX=$('#lbx'),lbP=$('#lbp'),lbN=$('#lbn');
let vis=gItems.slice(),cur=0,lastFocus=null;

/* filtro por categoria */
document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{
  document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x===c));
  const f=c.dataset.f;gItems.forEach(it=>{it.hidden=!(f==='all'||it.dataset.c===f)});
  vis=gItems.filter(it=>!it.hidden)}));

/* lightbox */
function paintLB(){const it=vis[cur],im=it.querySelector('img');
  lbImg.src=im.currentSrc||im.src;lbImg.alt=im.alt;
  lbCap.textContent=it.querySelector('figcaption').textContent;
  lbCount.textContent=(cur+1)+' / '+vis.length}
function swapLB(){lbImg.style.opacity=0;setTimeout(()=>{paintLB();lbImg.style.opacity=1},reduce?0:220)}
function openLB(i){cur=i;lastFocus=document.activeElement;paintLB();lbImg.style.opacity=1;
  lb.classList.add('on');document.documentElement.style.overflow='hidden';lbX.focus()}
function closeLB(){lb.classList.remove('on');document.documentElement.style.overflow='';
  if(lastFocus)lastFocus.focus({preventScroll:true})}
function stepLB(d){cur=(cur+d+vis.length)%vis.length;swapLB()}
gItems.forEach(it=>it.querySelector('.gb').addEventListener('click',()=>openLB(vis.indexOf(it))));
lbX.addEventListener('click',closeLB);
lbP.addEventListener('click',()=>stepLB(-1));
lbN.addEventListener('click',()=>stepLB(1));
lb.addEventListener('click',e=>{if(e.target===lb||e.target.classList.contains('lb-f'))closeLB()});
addEventListener('keydown',e=>{
  if(!lb.classList.contains('on'))return;
  if(e.key==='Escape')closeLB();
  else if(e.key==='ArrowRight')stepLB(1);
  else if(e.key==='ArrowLeft')stepLB(-1);
  else if(e.key==='Tab'){const f=[lbX,lbP,lbN],i=f.indexOf(document.activeElement);
    e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}});
/* deslizar no celular */
let swipeX=null;
lb.addEventListener('pointerdown',e=>{swipeX=e.clientX});
lb.addEventListener('pointerup',e=>{if(swipeX===null)return;const dx=e.clientX-swipeX;swipeX=null;if(Math.abs(dx)>60)stepLB(dx<0?1:-1)});
})();
