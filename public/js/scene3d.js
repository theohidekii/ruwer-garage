/* ==========================================================
   MÓDULO 3D: oficina em Three.js (criada só no primeiro clique, a landing fica leve)
   ========================================================== */
(function () {
const { $, reduce, st, mouse } = RUWER;
let renderer = null, camera = null, portrait = false, step = () => {}, resize = () => {};
const DPR = Math.min(devicePixelRatio, 1.5);   // limite de DPR protege os 60 FPS

function init3D(){
  if(renderer) return true;
  try{renderer=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,powerPreference:'high-performance'})}catch(e){renderer=null;return false}
  renderer.setPixelRatio(DPR); renderer.setClearColor(0x000000);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x000000);
  scene.fog=new THREE.FogExp2(0x000000,.017);
  camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,160);
  camera.position.set(0,2.5,46);

  /* ================================================================
     // CARREGAR MODELO .GLB DA OFICINA AQUI
     // 1) inclua GLTFLoader (examples/js/loaders/GLTFLoader.js, r128)
     // 2) new THREE.GLTFLoader().load('oficina.glb', g => scene.add(g.scene))
     // 3) a estrutura abaixo (corredor, piso reflexivo, luzes neon vermelhas,
     //    pedestal e letreiro) é a base procedural até o modelo ficar pronto.
     ================================================================ */
  const RED=0xe61c1c;
  const neon=new THREE.MeshBasicMaterial({color:RED});   // materiais "emissivos": o bloom pega estes
  const white=new THREE.MeshBasicMaterial({color:0xffffff});
  const dark=new THREE.MeshStandardMaterial({color:0x0b0b0e,roughness:.65,metalness:.35});

  /* ---- Estrutura: paredes, teto, parede do fundo e porta ---- */
  function slab(w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||dark);o.position.set(x,y,z);scene.add(o);return o}
  slab(.4,8.4,120,-8.2,4.2,-10); slab(.4,8.4,120,8.2,4.2,-10);      // paredes laterais
  slab(16.8,.4,120,0,8.4,-10);                                        // teto
  slab(17,9,.5,0,4.5,-52.5);                                          // parede do fundo
  slab(3.7,8.4,.5,-6.35,4.2,30); slab(3.7,8.4,.5,6.35,4.2,30);       // frente: lados da porta
  slab(9,2.9,.5,0,6.95,30);                                           // verga da porta
  // contorno neon da porta (abertura 9 x 5,5)
  slab(.14,5.5,.14,-4.5,2.75,29.8,neon); slab(.14,5.5,.14,4.5,2.75,29.8,neon); slab(9.14,.14,.14,0,5.5,29.8,neon);

  /* ---- Helper: InstancedMesh (centenas de peças em 1 draw call) ---- */
  function inst(geo,mat,pts){const m=new THREE.InstancedMesh(geo,mat,pts.length),d=new THREE.Object3D();
    pts.forEach((p,i)=>{d.position.set(p[0],p[1],p[2]);d.updateMatrix();m.setMatrixAt(i,d.matrix)});scene.add(m)}
  const zs=[];for(let z=26;z>=-48;z-=6)zs.push(z);
  const zs2=[];for(let z=28;z>=-50;z-=4)zs2.push(z);
  // pilastras nas paredes e vigas no teto: dão escala e ritmo ao corredor
  inst(new THREE.BoxGeometry(.5,8,.6),dark,zs2.flatMap(z=>[[-7.8,4,z],[7.8,4,z]]));
  inst(new THREE.BoxGeometry(16,.4,.5),dark,zs.map(z=>[0,8,z-3]));
  // LUZES DO TETO: fileiras brancas segmentadas + linhas vermelhas contínuas que levam o olhar ao fundo
  inst(new THREE.BoxGeometry(.3,.12,3.4),white,zs.flatMap(z=>[[-2,7.9,z],[2,7.9,z]]));
  slab(.14,.14,110,-5.2,7.9,-10,neon); slab(.14,.14,110,5.2,7.9,-10,neon);
  slab(.12,.12,110,-7.5,.18,-10,neon); slab(.12,.12,110,7.5,.18,-10,neon);   // rodapé neon
  slab(.08,.02,110,-3.2,.03,-10,neon); slab(.08,.02,110,3.2,.03,-10,neon);   // trilhos LED no piso

  /* ---- Piso hiper-reflexivo (epóxi molhado) ----
     Reflector = espelho real da cena; por cima, um plano preto semitransparente com
     roughness mínimo escurece o reflexo e cria o aspecto de epóxi polido. */
  const FG=new THREE.PlaneGeometry(16.4,130); let mir=null;
  if(THREE.Reflector){
    mir=new THREE.Reflector(FG,{color:0x888888,clipBias:.003,textureWidth:Math.floor(innerWidth*DPR*.5),textureHeight:Math.floor(innerHeight*DPR*.5)});
    mir.rotation.x=-Math.PI/2; mir.position.set(0,0,-10); scene.add(mir)}
  const sheen=new THREE.Mesh(FG,new THREE.MeshStandardMaterial({color:0x020203,roughness:.07,metalness:.92,transparent:true,opacity:mir?.5:1}));
  sheen.rotation.x=-Math.PI/2; sheen.position.set(0,.004,-10); scene.add(sheen);

  /* ---- Iluminação ---- */
  scene.add(new THREE.AmbientLight(0x200000,.9));
  [24,4,-16,-36].forEach(z=>{const p=new THREE.PointLight(RED,1.1,28,2);p.position.set(0,6.4,z);scene.add(p)}); // vermelho se espalha nas paredes
  const spot=new THREE.SpotLight(0xffffff,4.2,48,.42,.7,1.5);   // holofote sobre o pedestal
  spot.position.set(0,13,-38); spot.target.position.set(0,0,-38); scene.add(spot,spot.target);
  const gc=document.createElement('canvas');gc.width=4;gc.height=256;const gx=gc.getContext('2d'),gg=gx.createLinearGradient(0,0,0,256);
  gg.addColorStop(0,'#fff');gg.addColorStop(1,'#000');gx.fillStyle=gg;gx.fillRect(0,0,4,256);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(6.4,13,48,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,alphaMap:new THREE.CanvasTexture(gc)}));
  cone.position.set(0,6.5,-38); scene.add(cone);                  // feixe volumétrico falso

  /* ---- Pedestal central (para parar a câmera aqui) ---- */
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.8,.25,64),new THREE.MeshStandardMaterial({color:0x08080a,roughness:.25,metalness:.9}));
  base.position.set(0,.125,-38); scene.add(base);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(4.7,.045,8,96),neon);       // aro neon do pedestal
  halo.rotation.x=Math.PI/2; halo.position.set(0,.27,-38); scene.add(halo);
  // baia demarcada no piso:
  slab(14,.03,.1,0,.03,-34.2,neon); slab(14,.03,.1,0,.03,-41.8,neon); slab(.1,.03,7.6,-7,.03,-38,neon); slab(.1,.03,7.6,7,.03,-38,neon);

  /* ============================================================
     // INSERIR MODELO 3D DO CARRO AQUI
     // 1) carregue GLTFLoader (examples/js/loaders/GLTFLoader.js, r128)
     // 2) new THREE.GLTFLoader().load('carro.glb', g => car.add(g.scene))
     // 3) apague as partes do placeholder abaixo e mantenha o grupo "car"
     ============================================================ */
  const car=new THREE.Group();
  const pm=new THREE.MeshStandardMaterial({color:0x07070a,metalness:.95,roughness:.18});
  const em=new THREE.LineBasicMaterial({color:RED});
  function part(geo,x,y,z){const m=new THREE.Mesh(geo,pm);m.position.set(x,y,z);m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),em));car.add(m)}
  part(new THREE.BoxGeometry(4.8,.7,2.1),0,.8,0); part(new THREE.BoxGeometry(2.5,.62,1.8),-.3,1.45,0);
  [[1.6,.38,1.05],[1.6,.38,-1.05],[-1.6,.38,1.05],[-1.6,.38,-1.05]].forEach(p=>{
    const w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.34,24),pm);w.rotation.x=Math.PI/2;w.position.set(p[0],p[1],p[2]);car.add(w)});
  car.position.set(0,.25,-38); scene.add(car);

  /* ---- Letreiro neon RUWER na parede do fundo ---- */
  const sc=document.createElement('canvas');sc.width=1024;sc.height=400;
  const sx=sc.getContext('2d'),tex=new THREE.CanvasTexture(sc);tex.encoding=THREE.sRGBEncoding;
  function paint(){
    sx.clearRect(0,0,1024,400);sx.textAlign='center';sx.textBaseline='middle';sx.lineJoin='round';
    sx.font='800 270px "Archivo",Impact,sans-serif';if('letterSpacing' in sx)sx.letterSpacing='16px';
    sx.shadowColor='#e61c1c';sx.shadowBlur=60;sx.lineWidth=16;sx.strokeStyle='#e61c1c';sx.strokeText('RUWER',512,150);
    sx.shadowBlur=14;sx.lineWidth=5;sx.strokeStyle='#fff';sx.strokeText('RUWER',512,150);   // núcleo branco = tubo aceso
    sx.font='700 64px "Archivo",Impact,sans-serif';if('letterSpacing' in sx)sx.letterSpacing='34px';
    sx.shadowBlur=30;sx.fillStyle='#e61c1c';sx.fillText('GARAGE',512,330);tex.needsUpdate=true}
  paint(); if(document.fonts)document.fonts.load('800 100px "Archivo"').then(paint);
  const signMat=new THREE.MeshBasicMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(20,7.8),signMat);sign.position.set(0,5.6,-52);scene.add(sign);
  const glow=new THREE.PointLight(RED,2.4,34,2);glow.position.set(0,5,-48);scene.add(glow);

  /* ---- Poeira nos feixes de luz ---- */
  const N=reduce?0:300,pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*14;pos[i*3+1]=Math.random()*7.5;pos[i*3+2]=Math.random()*80-50}
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(dg,new THREE.PointsMaterial({size:.06,color:0xffffff,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending})));

  /* ---- BLOOM: EffectComposer + UnrealBloomPass ----
     RenderPass -> UnrealBloomPass (glow do neon) -> GammaCorrection (sRGB final).
     Se algum script não carregar, cai para render direto, sem quebrar a página. */
  let composer=null,bloom=null;
  if(THREE.EffectComposer&&THREE.UnrealBloomPass&&THREE.RenderPass&&THREE.ShaderPass){
    try{
      const rt=new THREE.WebGLMultisampleRenderTarget(innerWidth*DPR,innerHeight*DPR); // MSAA dentro do composer
      composer=new THREE.EffectComposer(renderer,rt);
      composer.addPass(new THREE.RenderPass(scene,camera));
      bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),1.15,.6,.12); // força, raio, limiar
      composer.addPass(bloom);
      if(THREE.GammaCorrectionShader)composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    }catch(e){composer=null}}
  if(!composer)renderer.outputEncoding=THREE.sRGBEncoding;



  let lastFov=0;
  resize=function(){
    const w=innerWidth,h=innerHeight;portrait=w/h<1;
    renderer.setSize(w,h,false);if(composer)composer.setSize(w,h);
    if(mir)mir.getRenderTarget().setSize(Math.floor(w*DPR*.5),Math.floor(h*DPR*.5));
    camera.aspect=w/h;camera.updateProjectionMatrix()};
  step=function(t){
    camera.position.x=mouse.x*.6; camera.position.y=st.y+mouse.y*.25;      // parallax do mouse
    const f=st.fov+(portrait?20:0); if(f!==lastFov){camera.fov=f;camera.updateProjectionMatrix();lastFov=f}
    camera.lookAt(0,st.ly,camera.position.z-st.ld);
    car.rotation.y+=.0035;
    signMat.opacity=(.95+.05*Math.sin(t*3))*(Math.random()>.99?.6:1);       // cintilar do neon
    for(let i=0;i<N;i++){pos[i*3+1]+=.004;if(pos[i*3+1]>7.5)pos[i*3+1]=0;pos[i*3]+=Math.sin(t+i)*.0012}
    if(N)dg.attributes.position.needsUpdate=true;
    composer?composer.render():renderer.render(scene,camera)};
  resize();
  return true;
}
addEventListener('resize',()=>{if(renderer)resize()});

RUWER.world3d = {
  init3D,
  step: t => step(t),
  ready: () => !!renderer,
  get camera() { return camera; }
};
})();
