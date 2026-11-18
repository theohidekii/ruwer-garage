/* ==========================================================
   MÓDULO 3D: oficina em Three.js (criada só no primeiro clique em "Entrar na Oficina 3D", a landing fica leve)
   Cenário: galpão escuro, piso de epóxi espelhado, fitas de LED em "V" no teto, rasgos de luz na parede
   do fundo, letreiro neon, fumaça e o carro da Ruwer no centro. Bloom por EffectComposer + UnrealBloomPass.
   A câmera é guiada por RUWER.st (coordenadas polares ao redor do carro), animado em transition.js.
   ========================================================== */
(function () {
const { $, reduce, st, mouse } = RUWER;

/* qualidade x desempenho */
const Q = {
  MAX_DPR: 1.5,          // limite do pixel ratio: telas 3x renderizam como 1,5x (grande ganho de FPS)
  MIRROR_SCALE: 0.5,     // o reflexo do piso é renderizado na metade da resolução
  BLOOM: { strength: 0.7, radius: 0.6, threshold: 0.15 },
  SMOKE: 14,             // quantidade de nuvens de fumaça
  DUST: 260              // partículas de poeira nos feixes de luz
};
/* celular e tablet (toque): menos pixels e menos partículas, para manter a fluidez */
if (matchMedia('(pointer: coarse)').matches || innerWidth < 860) {
  Q.MAX_DPR = 1.25; Q.MIRROR_SCALE = 0.35; Q.SMOKE = 8; Q.DUST = 120;
}

  let renderer, scene, camera, composer = null, mirror = null;
  let W = innerWidth, H = innerHeight, DPR = 1, portrait = false;
  const animated = [];                         // funções chamadas a cada quadro (fumaça, neon, poeira)

  /* three r128 não faz gestão de cor sozinho: convertemos as cores da marca de sRGB para linear,
     e o passe final de gamma devolve para sRGB. Assim o #E61C1C na tela é o #E61C1C da marca. */
  const col = hex => new THREE.Color(hex).convertSRGBToLinear();
  const RED = 0xE61C1C, WHITE = 0xFFFFFF, BLACK = 0x050505;

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    DPR = Math.min(devicePixelRatio || 1, Q.MAX_DPR);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(col(BLACK));

    scene = new THREE.Scene();
    scene.background = col(BLACK);
    scene.fog = new THREE.FogExp2(col(BLACK).getHex(), 0.021);      // névoa: profundidade e atmosfera esfumaçada

    camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 140);

    buildHall();
    buildFloor();
    buildNeon();
    buildBackWall();
    buildLights();
    buildSmoke();
    buildCar();
    buildPost();
    resize();
  }

  /* materiais compartilhados (menos programas de shader = menos trabalho para a GPU) */
  const M = {};
  function materials() {
    M.dark  = new THREE.MeshStandardMaterial({ color: col(0x0b0b0d), roughness: 0.72, metalness: 0.35 });
    M.neonW = new THREE.MeshBasicMaterial({ color: col(WHITE) });      // MeshBasic = "emissivo": é o que o bloom captura
    M.neonR = new THREE.MeshBasicMaterial({ color: col(RED) });
    M.warm  = new THREE.MeshBasicMaterial({ color: col(0xa89684) });
  }

  /* helper: caixa simples */
  function box(w, h, d, x, y, z, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); (parent || scene).add(m); return m;
  }
  /* helper: InstancedMesh — dezenas de peças iguais em UMA chamada de desenho */
  function instances(geo, mat, list) {            // list: [{p:[x,y,z], r:[rx,ry,rz]}]
    const mesh = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D();
    list.forEach((it, i) => {
      d.position.set(it.p[0], it.p[1], it.p[2]);
      d.rotation.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0);
      d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    });
    scene.add(mesh); return mesh;
  }

  /* ---------- B1. Galpão industrial: paredes, teto, pilastras e vigas ----------
     Eixos: o carro fica na origem; o corredor de entrada vem de +Z; a parede do letreiro fica em -Z. */
  const HALL = { halfW: 11, height: 9, zFront: 46, zBack: -13 };
  function buildHall() {
    materials();
    const len = HALL.zFront - HALL.zBack, zc = (HALL.zFront + HALL.zBack) / 2;
    box(0.4, HALL.height, len, -HALL.halfW, HALL.height / 2, zc, M.dark);     // parede esquerda
    box(0.4, HALL.height, len,  HALL.halfW, HALL.height / 2, zc, M.dark);     // parede direita
    box(HALL.halfW * 2, 0.4, len, 0, HALL.height, zc, M.dark);                // teto
    box(HALL.halfW * 2, HALL.height, 0.4, 0, HALL.height / 2, HALL.zBack, M.dark);   // parede do fundo
    box(HALL.halfW * 2, HALL.height, 0.4, 0, HALL.height / 2, HALL.zFront, M.dark);  // parede da entrada

    const pil = [], beams = [], bars = [];
    for (let z = HALL.zFront - 3; z > HALL.zBack; z -= 4) {
      pil.push({ p: [-HALL.halfW + 0.35, HALL.height / 2, z] }, { p: [HALL.halfW - 0.35, HALL.height / 2, z] });
      /* barras de LED verticais nas paredes, como no galpão real da Ruwer */
      bars.push({ p: [-HALL.halfW + 0.28, 3.2, z + 2] }, { p: [HALL.halfW - 0.28, 3.2, z + 2] });
    }
    for (let z = HALL.zFront - 4; z > HALL.zBack; z -= 6) beams.push({ p: [0, HALL.height - 0.45, z] });
    instances(new THREE.BoxGeometry(0.5, HALL.height, 0.6), M.dark, pil);
    instances(new THREE.BoxGeometry(HALL.halfW * 2, 0.5, 0.45), M.dark, beams);
    instances(new THREE.BoxGeometry(0.05, 4.2, 0.07), M.warm, bars);
  }

  /* ---------- B2. Piso de epóxi hiper-reflexivo ----------
     Reflector = espelho real da cena (renderizado em resolução reduzida).
     Por cima, um plano escuro semitransparente e polido escurece o reflexo: é o que dá o aspecto de epóxi molhado. */
  function buildFloor() {
    const len = HALL.zFront - HALL.zBack, zc = (HALL.zFront + HALL.zBack) / 2;
    const geo = new THREE.PlaneGeometry(HALL.halfW * 2, len);
    if (THREE.Reflector) {
      mirror = new THREE.Reflector(geo, {
        color: 0x6f6f6f, clipBias: 0.003,
        textureWidth: Math.floor(W * DPR * Q.MIRROR_SCALE), textureHeight: Math.floor(H * DPR * Q.MIRROR_SCALE)
      });
      mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, zc); scene.add(mirror);
    }
    const sheen = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: col(0x030304), roughness: 0.08, metalness: 0.9, transparent: true, opacity: mirror ? 0.6 : 1
    }));
    sheen.rotation.x = -Math.PI / 2; sheen.position.set(0, 0.004, zc); scene.add(sheen);

    /* aro neon no piso, marcando a baia do carro */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.03, 8, 120), M.neonR);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.035; scene.add(ring);
  }

  /* ---------- B3. Neon do teto: linhas contínuas + fitas diagonais (chevrons) ---------- */
  function buildNeon() {
    const len = HALL.zFront - HALL.zBack - 2, zc = (HALL.zFront + HALL.zBack) / 2, y = HALL.height - 0.3;
    /* linhas contínuas: levam o olhar até o fundo */
    box(0.1, 0.08, len, -HALL.halfW + 1.2, y, zc, M.neonR);
    box(0.1, 0.08, len,  HALL.halfW - 1.2, y, zc, M.neonR);
    box(0.07, 0.07, len, -HALL.halfW + 0.3, 0.14, zc, M.neonR);    // rodapé
    box(0.07, 0.07, len,  HALL.halfW - 0.3, 0.14, zc, M.neonR);
    /* fitas diagonais: cada vão do galpão recebe um "V" de LED, alternando branco e vermelho */
    const white = [], red = [], L = 8.4, ang = 0.52;
    let i = 0;
    for (let z = HALL.zFront - 7; z > HALL.zBack + 4; z -= 5.5, i++) {
      const pair = [{ p: [-4.3, y, z], r: [0, ang, 0] }, { p: [4.3, y, z], r: [0, -ang, 0] }];
      (i % 2 ? red : white).push(...pair);
    }
    const strip = new THREE.BoxGeometry(L, 0.07, 0.12);
    instances(strip, M.neonW, white);
    instances(strip, M.neonR, red);
  }

  /* ---------- B4. Parede do fundo: rasgos de luz diagonais (como nas fotos) + letreiro neon ---------- */
  let signMat = null;
  function buildBackWall() {
    const z = HALL.zBack + 0.3;
    /* rasgo branco à esquerda, rasgos vermelhos à direita */
    const slash = (w, x, rot, mat) => { const m = box(w, 13, 0.06, x, 4.4, z, mat); m.rotation.z = rot; return m; };
    slash(0.55, -7.6, 0.62, M.neonW);
    slash(0.16, -6.2, 0.62, M.neonW);
    slash(0.7, 7.4, -0.62, M.neonR);
    slash(0.2, 5.9, -0.62, M.neonR);
    /* linhas horizontais baixas, que o piso duplica */
    box(8, 0.06, 0.06, -6.5, 0.9, z, M.neonW);
    box(8, 0.06, 0.06, 6.5, 0.9, z, M.neonR);

    /* letreiro: texto desenhado em canvas 2D e usado como textura (repinta quando a fonte Archivo carrega) */
    const c = document.createElement('canvas'); c.width = 1024; c.height = 384;
    const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    function paint() {
      g.clearRect(0, 0, 1024, 384); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.font = 'italic 800 230px "Archivo",Impact,sans-serif';
      g.shadowColor = '#E61C1C'; g.shadowBlur = 50; g.lineWidth = 14; g.strokeStyle = '#E61C1C'; g.strokeText('RUWER', 512, 150);
      g.shadowBlur = 10; g.lineWidth = 4; g.strokeStyle = '#FFFFFF'; g.strokeText('RUWER', 512, 150);   // núcleo branco = tubo aceso
      g.font = '700 54px "Archivo",Impact,sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '46px';
      g.shadowBlur = 24; g.fillStyle = '#E61C1C'; g.fillText('GARAGE', 512, 318);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      tex.needsUpdate = true;
    }
    paint(); if (document.fonts && document.fonts.load) document.fonts.load('italic 800 100px "Archivo"').then(paint).catch(() => {});
    signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.1), signMat);
    sign.position.set(0, 5.9, z + 0.05); scene.add(sign);
    /* o neon cintila de leve; de vez em quando falha por um quadro, como um tubo de verdade */
    animated.push(t => { signMat.opacity = (0.94 + 0.06 * Math.sin(t * 3)) * (!reduce && Math.random() > 0.992 ? 0.55 : 1); });
  }

  /* ---------- B5. Iluminação ---------- */
  function buildLights() {
    scene.add(new THREE.AmbientLight(col(0x2a0a0a), 0.9));
    /* vermelho se espalhando pelo corredor e pelas paredes */
    [[0, 6.5, 34], [0, 6.5, 20], [7, 4, -8], [-2, 6, -9]].forEach(p => {
      const l = new THREE.PointLight(col(RED), 1.0, 30, 2); l.position.set(p[0], p[1], p[2]); scene.add(l);
    });
    const rim = new THREE.PointLight(col(WHITE), 1.1, 22, 2); rim.position.set(-8, 4, -7); scene.add(rim);   // contraluz branca
    /* holofote principal sobre o carro */
    const spot = new THREE.SpotLight(col(WHITE), 2.2, 30, 0.6, 0.85, 1.4);
    spot.position.set(1.5, 8.6, 4); spot.target.position.set(0, 0.5, 0); scene.add(spot, spot.target);
  }

  /* ---------- B6. Fumaça e poeira ----------
     Fumaça = poucos sprites grandes com uma textura de nuvem gerada em canvas; derivam e giram devagar.
     Metade puxa para o vermelho (como a fumaça iluminada das fotos). */
  function buildSmoke() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 46; i++) {
      const x = 128 + (Math.random() - 0.5) * 120, y = 128 + (Math.random() - 0.5) * 120, r = 26 + Math.random() * 44;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.085)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(c), puffs = [];
    for (let i = 0; i < Q.SMOKE; i++) {
      const red = i % 2 === 0;
      const mat = new THREE.SpriteMaterial({ map: tex, color: col(red ? 0xff3a3a : 0xbfc4cc), transparent: true,
        opacity: red ? 0.075 : 0.05, depthWrite: false, rotation: Math.random() * 6.28 });
      const s = new THREE.Sprite(mat), near = i < Q.SMOKE * 0.65;     // a maioria fica ao redor do carro
      const ang = Math.random() * 6.28, rr = 3.5 + Math.random() * 6;
      s.position.set(near ? Math.cos(ang) * rr : (Math.random() - 0.5) * 14, 0.7 + Math.random() * 1.6,
                     near ? Math.sin(ang) * rr - 2 : 10 + Math.random() * 26);
      const k = 6 + Math.random() * 7; s.scale.set(k, k * 0.62, 1);
      s.userData = { x: s.position.x, sp: 0.04 + Math.random() * 0.06, ph: Math.random() * 6.28, rot: (Math.random() - 0.5) * 0.02 };
      scene.add(s); puffs.push(s);
    }
    if (!reduce) animated.push(t => {
      for (let i = 0; i < puffs.length; i++) { const s = puffs[i], u = s.userData;
        s.position.x = u.x + Math.sin(t * u.sp + u.ph) * 1.6; s.material.rotation += u.rot * 0.05; }
    });

    /* poeira suspensa nos feixes */
    const N = reduce ? 0 : Q.DUST, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 18; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = Math.random() * 52 - 12; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: col(WHITE), transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })));
    if (N) animated.push(t => {
      for (let i = 0; i < N; i++) { pos[i * 3 + 1] += 0.003; if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] = 0; pos[i * 3] += Math.sin(t + i) * 0.001; }
      dg.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- B7. Carro: BMW M4 CSL (modelo .glb) com a logo Ruwer Garage nas laterais ----------
     Modelo: "BMW M4csl", de Mpgs Studios (sketchfab.com/mpgs.studio), licença CC BY 4.0 — manter o crédito no rodapé.
     O arquivo original (70 MB, ~1 milhão de triângulos) foi reduzido para ~1,3 MB e ~120 mil triângulos.
     Se o modelo não carregar (sem GLTFLoader ou sem rede), entra o carro estilizado feito em código. */
  const CAR_URL_FALLBACK = 'assets/models/bmw-m4csl.glb';
  function buildCar() {
    const car = new THREE.Group();
    const env = buildEnvMap();
    car.rotation.y = -0.6;            // 3/4 de frente para quem entra pelo corredor
    scene.add(car);
    if (!THREE.GLTFLoader) { buildPlaceholderCar(car, env); return; }
    /* o caminho do modelo parte da pasta da logo, assim funciona em qualquer pasta/hospedagem */
    const logoEl = document.querySelector('.brand img');
    const url = logoEl ? (logoEl.currentSrc || logoEl.src).replace(/img\/[^/]+$/, 'models/bmw-m4csl.glb') : CAR_URL_FALLBACK;
    new THREE.GLTFLoader().load(url, g => { dressCar(g.scene, env); car.add(g.scene); applyDecals(car, g.scene, logoEl); },
      undefined, () => buildPlaceholderCar(car, env));
  }

  /* materiais do modelo: pintura cinza metálica, vidros escuros, pinças e luzes; tudo refletindo o neon do galpão */
  function dressCar(root, env) {
    const paint = new THREE.MeshPhysicalMaterial({ color: col(0x2b2e33), metalness: 0.9, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.1, envMap: env, envMapIntensity: 0.42 });
    const glass = new THREE.MeshStandardMaterial({ color: col(0x040506), metalness: 1, roughness: 0.06, envMap: env, envMapIntensity: 0.55 });   // opaco: esconde o interior e poupa a GPU
    const lampW = new THREE.MeshBasicMaterial({ color: col(WHITE) }), lampR = new THREE.MeshBasicMaterial({ color: col(RED) });
    root.traverse(o => {
      if (!o.isMesh) return;
      /* o arquivo guarda as posições compactadas em inteiros de 16 bits; aqui voltam a ser float,
         porque o raycaster e o DecalGeometry do three r128 leem os valores brutos */
      const pos = o.geometry.attributes.position;
      if (pos.normalized) {
        const src = pos.array, k = 1 / (src instanceof Int16Array ? 32767 : src instanceof Uint16Array ? 65535 : src instanceof Int8Array ? 127 : 255);
        const f = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) { f[i * 3] = pos.getX(i) * k; f[i * 3 + 1] = pos.getY(i) * k; f[i * 3 + 2] = pos.getZ(i) * k; }
        o.geometry.setAttribute('position', new THREE.BufferAttribute(f, 3));
        o.geometry.boundingSphere = null; o.geometry.boundingBox = null;
      }
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();   // as normais não vêm no arquivo: são calculadas aqui
      const n = o.material.name || '';
      if (/^Car_Paint$/.test(n)) { o.material = paint; o.userData.paint = true; }
      else if (/^Glass/i.test(n)) o.material = glass;
      else if (n === 'lightt') o.material = lampW;
      else if (n === 'Red_Light') o.material = lampR;
      else { o.material.envMap = env; o.material.envMapIntensity = 0.35; o.material.side = THREE.FrontSide;
             if (o.material.emissive) o.material.emissiveIntensity = Math.min(o.material.emissiveIntensity, 0.4); }
    });
    root.position.x = -0.13;          // centraliza o carro na baia (o modelo vem deslocado 13 cm)
    root.updateMatrixWorld(true);
  }

  /* adesivo lateral: a logo oficial é projetada sobre a lataria (DecalGeometry), acompanhando a curva da porta */
  const DECAL = { x: -0.25, y: 0.66, w: 1.5 };          // posição no carro (m) e largura do adesivo
  function applyDecals(car, root, logoEl) {
    if (!THREE.DecalGeometry || !logoEl) return;
    const tex = new THREE.TextureLoader().load(logoEl.currentSrc || logoEl.src); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: col(WHITE), emissiveIntensity: 0.14, transparent: true,
      roughness: 0.45, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const panels = []; root.traverse(o => { if (o.userData.paint) panels.push(o); });
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(), size = new THREE.Vector3(DECAL.w, DECAL.w * 265 / 965, 0.5);
    [1, -1].forEach(side => {
      /* raio lançado de fora para dentro, no espaço do carro, para achar o ponto exato da lataria */
      const from = car.localToWorld(new THREE.Vector3(DECAL.x, DECAL.y, 3 * side));
      const to = car.localToWorld(new THREE.Vector3(DECAL.x, DECAL.y, 0));
      ray.set(from, to.sub(from).normalize());
      const hit = ray.intersectObjects(panels, false)[0]; if (!hit) return;
      const rot = new THREE.Euler(0, car.rotation.y + (side < 0 ? Math.PI : 0), 0);
      const m = new THREE.Mesh(new THREE.DecalGeometry(hit.object, hit.point, rot, size), mat);
      scene.add(m);                  // a geometria do adesivo já sai em coordenadas do mundo
    });
  }

  /* mapa de ambiente: uma mini-cena só com as luzes de neon, pré-filtrada pelo PMREM.
     É o que faz a pintura metálica e os vidros refletirem as fitas de LED sem custo por quadro. */
  function buildEnvMap() {
    const es = new THREE.Scene(); es.background = col(0x020202);
    const add = (w, h, d, x, y, z, hex, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col(hex) })); m.position.set(x, y, z); m.rotation.y = ry || 0; es.add(m); };
    add(14, 0.5, 0.5, 0, 8, 0, WHITE, 0.5); add(14, 0.5, 0.5, 0, 8, 6, RED, -0.5); add(14, 0.5, 0.5, 0, 8, -6, WHITE, -0.5);
    add(0.6, 7, 4, -10, 3, 0, WHITE); add(0.6, 7, 4, 10, 3, 0, RED); add(6, 3, 0.4, 0, 4, -11, RED); add(8, 0.4, 0.4, 0, 1.2, 11, WHITE);
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(es, 0.03);
    pm.dispose(); return rt.texture;
  }

  function buildPlaceholderCar(car, env) {
    const paint = new THREE.MeshPhysicalMaterial({ color: col(0x3a3d43), metalness: 0.9, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: 0.55 });
    const glass = new THREE.MeshStandardMaterial({ color: col(0x050608), metalness: 1, roughness: 0.05, envMap: env, envMapIntensity: 0.7 });
    const trim  = new THREE.MeshStandardMaterial({ color: col(0x0a0a0b), metalness: 0.6, roughness: 0.5, envMap: env, envMapIntensity: 0.5 });
    const tire  = new THREE.MeshStandardMaterial({ color: col(0x0c0c0d), metalness: 0.1, roughness: 0.9 });
    const rimM  = new THREE.MeshStandardMaterial({ color: col(0x8d9096), metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 0.6 });
    const calM  = new THREE.MeshStandardMaterial({ color: col(RED), emissive: col(RED), emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.4 });
    const halfW = 0.9, ext = { depth: halfW * 2, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 20 };

    /* carroceria: perfil lateral (x = comprimento, y = altura) extrudado na largura, com caixas de roda recortadas */
    const WX = 1.42, WR = 0.345, AR = 0.43;                 // posição das rodas, raio da roda, raio do arco
    const s = new THREE.Shape();
    s.moveTo(-2.26, 0.36);
    s.lineTo(-WX - AR, 0.3);  s.absarc(-WX, WR, AR, Math.PI, 0, true);
    s.lineTo(WX - AR, 0.3);   s.absarc(WX, WR, AR, Math.PI, 0, true);
    s.lineTo(2.18, 0.3);
    s.quadraticCurveTo(2.36, 0.34, 2.33, 0.62);             // para-choque dianteiro
    s.quadraticCurveTo(2.2, 0.8, 1.2, 0.93);                // capô
    s.lineTo(0.95, 0.97);
    s.lineTo(-1.52, 1.01);                                  // linha de cintura
    s.quadraticCurveTo(-2.1, 1.02, -2.3, 0.94);             // tampa do porta-malas
    s.quadraticCurveTo(-2.38, 0.7, -2.26, 0.36);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, ext), paint);
    body.position.z = -halfW; car.add(body);

    /* cabine: vidros escuros e um teto na cor da carroceria */
    const g = new THREE.Shape();
    g.moveTo(1.0, 0.95); g.quadraticCurveTo(0.55, 1.36, 0.18, 1.4);
    g.lineTo(-0.82, 1.4); g.quadraticCurveTo(-1.3, 1.34, -1.72, 0.99); g.lineTo(1.0, 0.95);
    const cab = new THREE.Mesh(new THREE.ExtrudeGeometry(g, Object.assign({}, ext, { depth: 1.5, bevelSize: 0.05, bevelThickness: 0.05 })), glass);
    cab.position.z = -0.75; car.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.035, 1.42), paint); roof.position.set(-0.32, 1.445, 0); car.add(roof);
    [-0.42].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 1.62), trim); p.position.set(x, 1.19, 0); car.add(p); });   // coluna B

    /* rodas: pneu, aro de 5 raios, disco e pinça de freio vermelha */
    function wheel(x, zSide) {
      const w = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, 0.25, 36), tire); t.rotation.x = Math.PI / 2; w.add(t);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.018, 8, 40), rimM); lip.position.z = 0.125 * zSide; w.add(lip);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 28), trim); disc.rotation.x = Math.PI / 2; disc.position.z = 0.07 * zSide; w.add(disc);
      for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.05, 0.03), rimM), a = i / 5 * 6.283 + 0.3;
        sp.position.set(Math.cos(a) * 0.125, Math.sin(a) * 0.125, 0.12 * zSide); sp.rotation.z = a; w.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), rimM); hub.rotation.x = Math.PI / 2; hub.position.z = 0.125 * zSide; w.add(hub);
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.19, 0.06), calM); cal.position.set(0.16, 0.06, 0.085 * zSide); cal.rotation.z = -0.35; w.add(cal);
      w.position.set(x, WR, 0.86 * zSide); car.add(w);
    }
    wheel(WX, 1); wheel(WX, -1); wheel(-WX, 1); wheel(-WX, -1);

    /* faróis e lanternas: MeshBasic para brilhar no bloom */
    const hl = new THREE.MeshBasicMaterial({ color: col(WHITE) }), tl = new THREE.MeshBasicMaterial({ color: col(RED) });
    [0.62, -0.62].forEach(z => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.38), hl); m.position.set(2.33, 0.7, z); car.add(m); });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 1.66), tl); tail.position.set(-2.36, 0.86, 0); car.add(tail);
    const lipF = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 1.8), trim); lipF.position.set(2.24, 0.25, 0); car.add(lipF);       // spoiler dianteiro
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.05, 2.0), trim); sideL.position.set(0, 0.27, 0); car.add(sideL);      // saias

    /* logo lateral RUWER GARAGE: usa a logo oficial que já está carregada no cabeçalho do site (nos dois lados do carro) */
    const logoEl = document.querySelector('.brand img');
    if (logoEl) {
      const tex = new THREE.TextureLoader().load(logoEl.currentSrc || logoEl.src); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      const gm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: col(WHITE), emissiveIntensity: 0.16, transparent: true, roughness: 0.4, metalness: 0.2, depthWrite: false });
      [1, -1].forEach(side => { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6 * 265 / 965), gm);   // proporção da logo: 965 x 265
        p.position.set(-0.15, 0.66, (halfW + 0.075) * side); if (side < 0) p.rotation.y = Math.PI; car.add(p); });
    }
  }

  /* ---------- B8. Pós-processamento: bloom ----------
     RenderPass -> UnrealBloomPass (glow do neon, do letreiro e dos faróis) -> correção de gamma (sRGB final).
     Se algum script de pós-processamento não carregar, cai para o render direto sem quebrar a página. */
  function buildPost() {
    if (!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass)) { renderer.outputEncoding = THREE.sRGBEncoding; return; }
    try {
      /* WebGL2: alvo com multisampling, para ter anti-aliasing mesmo dentro do composer */
      const rt = renderer.capabilities.isWebGL2 ? new THREE.WebGLMultisampleRenderTarget(W * DPR, H * DPR) : undefined;
      composer = new THREE.EffectComposer(renderer, rt);
      composer.addPass(new THREE.RenderPass(scene, camera));
      const b = Q.BLOOM;
      composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), b.strength, b.radius, b.threshold));
      if (THREE.GammaCorrectionShader) composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    } catch (e) { composer = null; renderer.outputEncoding = THREE.sRGBEncoding; }
  }

  function resize() {
    W = innerWidth; H = innerHeight; portrait = W / H < 1;
    renderer.setSize(W, H, false);
    if (composer) composer.setSize(W, H);
    if (mirror) mirror.getRenderTarget().setSize(Math.floor(W * DPR * Q.MIRROR_SCALE), Math.floor(H * DPR * Q.MIRROR_SCALE));
    camera.aspect = W / H; camera.fov = portrait ? 58 : 40; camera.updateProjectionMatrix();
  }

  /* um quadro: posiciona a câmera a partir de RUWER.st (animado em transition.js) e renderiza */
  function frame(t) {
    const a = st.a + mouse.x * 0.06;                         // parallax leve do mouse
    const rad = st.rad * (portrait && st.rad < 20 ? 1.3 : 1);
    camera.position.set(Math.sin(a) * rad, st.h + mouse.y * 0.22, Math.cos(a) * rad);
    camera.lookAt(0, st.ty, 0);
    for (let i = 0; i < animated.length; i++) animated[i](t);
    composer ? composer.render() : renderer.render(scene, camera);
  }

/* ---------- API usada por transition.js ---------- */
let ready = false;
function init3D() {                                          // devolve false se o navegador não tiver WebGL
  if (ready) return true;
  try { if (!window.THREE) return false; init($('#gl')); ready = true; } catch (e) { return false; }
  return true;
}
addEventListener('resize', () => { if (ready) resize(); });

RUWER.world3d = {
  init3D,
  step: t => { if (ready) frame(t); },
  ready: () => ready,
  get camera() { return camera; }
};
})();
