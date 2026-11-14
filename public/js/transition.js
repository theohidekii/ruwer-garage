/* ==========================================================
   TRANSIÇÃO: botão explode, porta de garagem sobe, entra no 3D (GSAP) + loop principal
   ========================================================== */
(function () {
const { $, reduce, state: S, st, mouse } = RUWER;
const w3 = RUWER.world3d;

const site=$('#site'),world=$('#world'),door=$('#door'),slats=[...door.children],burst=$('#burst'),portal=$('#portal');
const wui=$('#wui'),wcta=$('#wcta'),toast=$('#toast');
const dp={d:0};   // dp.d = quanto a porta já subiu (px)
/* porta de rolo: cada lâmina sobe junto e se empilha no topo (acordeão) */
function doorUpdate(){const sh=innerHeight/slats.length;slats.forEach((s,i)=>{s.style.transform='translate3d(0,'+(-Math.min(dp.d,(i+1)*sh*1.02))+'px,0)'})}
function showToast(msg){toast.textContent=msg;gsap.fromTo(toast,{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.3});gsap.to(toast,{autoAlpha:0,delay:3.4,duration:.4})}

function toWorld(){            // troca de cena enquanto a tela está coberta
  S.savedY=scrollY; site.style.display='none';
  document.documentElement.style.overflow='hidden';
  world.classList.add('on');
  if(!w3.init3D()) return false;
  w3.camera.position.z=46; Object.assign(st,{y:2.5,ly:2.4,ld:34,fov:42});
  S.mode='3d'; return true}
function toSite(){
  S.mode='site'; world.classList.remove('on'); site.style.display='';
  document.documentElement.style.overflow=''; scrollTo(0,S.savedY)}

function dolly(){              // câmera caminha da porta até o pedestal
  const d=reduce?.01:7;
  gsap.to(w3.camera.position,{z:-27,duration:d,ease:'power2.inOut'});
  gsap.to(st,{y:1.6,ly:1.25,ld:11,fov:36,duration:d,ease:'power2.inOut'});
  gsap.to(wcta,{autoAlpha:1,y:0,duration:.8,delay:reduce?0:d-1.6});}

function enter(){
  if(S.busy||S.mode==='3d')return; S.busy=true;
  gsap.killTweensOf([wui,wcta]); gsap.set([wui,wcta],{autoAlpha:0});
  if(reduce){ if(!toWorld()){S.busy=false;toSite();showToast('Não foi possível iniciar o 3D neste navegador.');return}
    gsap.set(slats,{clearProps:'transform'});gsap.to(wui,{autoAlpha:1,duration:.3});dolly();S.busy=false;$('#back').focus();return}
  const b=portal.getBoundingClientRect(), tl=gsap.timeline();
  gsap.set(burst,{left:b.left,top:b.top,width:b.width,height:b.height,borderRadius:b.height/2,scale:1,autoAlpha:1});
  gsap.set(door,{autoAlpha:0}); dp.d=0; doorUpdate();
  tl
    /* 1) o botão se expande até cobrir a tela */
    .to(burst,{scaleX:innerWidth*2.4/b.width,scaleY:innerHeight*2.8/b.height,duration:.85,ease:'expo.in'})
    /* 2) com a tela coberta: troca para o mundo 3D e fecha a porta de garagem por cima */
    .add(()=>{
      gsap.set(portal,{scale:1}); gsap.set(door,{autoAlpha:1});
      if(!toWorld()){ tl.kill(); gsap.set([burst,door],{autoAlpha:0}); toSite(); S.busy=false; showToast('Não foi possível iniciar o 3D neste navegador.'); return }
    })
    .to(burst,{autoAlpha:0,duration:.3})
    /* 3) a porta de rolo sobe, revelando a cena em tela cheia */
    .to(dp,{d:innerHeight*1.05,duration:1.4,ease:'power3.inOut',onUpdate:doorUpdate},'+=.2')
    .add(dolly,'<.25')
    .to(wui,{autoAlpha:1,duration:.6},'-=.5')
    .add(()=>{gsap.set(door,{autoAlpha:0});S.busy=false;$('#back').focus()});
}

function leave(){
  if(S.busy||S.mode!=='3d')return; S.busy=true;
  gsap.killTweensOf([w3.camera.position,st]);
  gsap.to([wui,wcta],{autoAlpha:0,duration:.3});
  if(reduce){toSite();S.busy=false;portal.focus();return}
  const tl=gsap.timeline();
  gsap.set(door,{autoAlpha:1}); dp.d=innerHeight*1.05; doorUpdate();
  tl.to(dp,{d:0,duration:1,ease:'power3.inOut',onUpdate:doorUpdate})          // porta desce sobre o 3D
    .add(toSite)                                                              // volta à landing, por trás da porta
    .to(dp,{d:innerHeight*1.05,duration:1.1,ease:'power3.inOut',onUpdate:doorUpdate},'+=.15') // porta sobe e revela o site
    .add(()=>{gsap.set(door,{autoAlpha:0});S.busy=false;portal.focus({preventScroll:true})});
}
portal.addEventListener('click',enter);
$('#back').addEventListener('click',leave);
addEventListener('keydown',e=>{if(e.key==='Escape')leave()});

/* mouse: alimenta o parallax da câmera 3D (não move nenhum botão) */
addEventListener('pointermove',e=>{mouse.tx=(e.clientX/innerWidth-.5)*2;mouse.ty=-(e.clientY/innerHeight-.5)*2});

/* LOOP ÚNICO (requestAnimationFrame): o 3D só renderiza dentro do mundo */
(function loop(now){
  mouse.x+=(mouse.tx-mouse.x)*.05;mouse.y+=(mouse.ty-mouse.y)*.05;
  if(S.mode==='3d'&&w3.ready())w3.step(now/1000);
  requestAnimationFrame(loop)})(0);
})();
