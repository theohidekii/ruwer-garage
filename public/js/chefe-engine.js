/* ==========================================================
   MOTOR DO CHEFE DE OFICINA (mock de LLM): memória, intenção e tolerância a erro de digitação
   ========================================================== */
(function () {
/*ENGINE_START*/
/* ---------- memória da conversa (estado do "Chefe de Oficina") ---------- */
const mem={sintomas:new Map(),sistema:null,urg:0,topic:null,qIndex:0,veic:null,detalhes:new Map(),alerts:new Set(),pending:null,offered:false,askedVeic:false};
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(.)\1{2,}/g,'$1').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const PROTECT={frio:1,fria:1,frios:1,frias:1};   // "frio" nunca pode virar "freio" por erro de digitação
/* tolerância a erro de digitação: prefixo exato OU distância de edição pequena (por tamanho da raiz) */
function tm(tok,root){
  if(tok.length<3)return false;
  if(tok.startsWith(root))return true;
  if(root.length<5||PROTECT[tok])return false;
  const t=root.length>=7?2:1;
  return lev(tok.slice(0,root.length+1),root)<=t||lev(tok,root)<=t}
const hit=(n,toks,root)=>root.indexOf(' ')>-1?n.indexOf(root)>-1:toks.some(t=>tm(t,root));
/* intenções (preço, agendar, saudação...) usam correspondência estrita: evita "quando" virar "quanto" */
const hx=(n,toks,root)=>root.indexOf(' ')>-1?n.indexOf(root)>-1:toks.some(t=>t===root||(root.length>=4&&t.startsWith(root)));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;

/* ---------- base de engenharia (hipóteses por sintoma) ---------- */
const KB=[
 {id:'homocinetica',nome:'junta homocinética',sistema:'Direção e transmissão',urg:2,
  kw:{estal:2,clique:2,toc:1,esterc:2,curva:2,volante:2,direcao:1,barulho:1,ruido:1,'viro ':0},
  hip:'Esse estalo metálico ao esterçar geralmente indica desgaste na junta homocinética, às vezes com folga em terminais da direção',
  q:['O estalo aparece só em curva fechada ou também em curvas leves?','Você percebe mais para um dos lados?'],
  refino:{curva:'Estalo que aparece em curva costuma vir da junta do lado oposto ao da curva, que é a que recebe mais carga.',esq:'Se acontece virando para a esquerda, a suspeita recai sobre a junta do lado direito.',dir:'Se acontece virando para a direita, a suspeita recai sobre a junta do lado esquerdo.',reta:'Se o ruído também aparece em linha reta, vale olhar terminais e buchas além da junta.'},
  acao:'Na avaliação levantamos o carro, checamos folga e capas de proteção e confirmamos qual lado está comprometido.'},
 {id:'freio_ruido',nome:'desgaste no sistema de freio',sistema:'Freios',urg:2,
  kw:{freio:2,frear:2,frenag:2,freand:2,chia:2,rangid:2,apit:2,barulho:1,ruido:1,vibra:1},
  hip:'Chiado ou rangido ao frear costuma vir de pastilhas no fim da vida útil ou de disco com desgaste irregular',
  seg:'Freio é item de segurança, então não deixe para depois se o ruído estiver piorando.',
  q:['O ruído acontece em toda frenagem ou só nas primeiras do dia?','O volante ou o pedal vibram quando você freia?'],
  refino:{frear:'Isso combina com desgaste de pastilha ou de disco.',frio:'Ruído só nas primeiras frenagens do dia pode ser umidade no disco, mas vale confirmar a espessura das pastilhas.',vel:'Vibração em frenagem de velocidade alta costuma indicar disco empenado ou irregular.'},
  acao:'Medimos a espessura de pastilhas e discos e testamos o fluido, com registro fotográfico de cada item.'},
 {id:'freio_pedal',nome:'falha hidráulica no freio',sistema:'Freios',urg:3,
  kw:{pedal:2,afund:3,esponj:3,baixo:1,freio:1,'nao freia':3,'sem freio':3,'nao esta freando':3,demora:1},
  hip:'Pedal baixo, esponjoso ou que afunda costuma indicar ar no sistema, fluido comprometido ou vazamento',
  seg:'Se o carro está demorando para parar, evite dirigir. Chame um guincho e traga o carro até nós, é o caminho mais seguro.',
  q:['O pedal afunda devagar quando você mantém o pé pressionado?','Notou alguma poça de fluido embaixo do carro?'],
  refino:{frear:'Isso reforça a hipótese de problema na parte hidráulica.'},
  acao:'Inspecionamos reservatório, mangueiras, cilindros e pinças, e sangramos o sistema se necessário.'},
 {id:'injecao_luz',nome:'falha registrada na central do motor',sistema:'Injeção eletrônica',urg:2,
  kw:{luz:1,injecao:3,check:2,engine:2,painel:1,acesa:2,pisc:1,anomalia:1},
  hip:'Luz de injeção acesa significa que a central registrou uma falha em algum sensor ou atuador do motor, e só a leitura dos códigos mostra qual',
  q:['A luz fica fixa ou pisca?','O carro perdeu força ou ficou irregular junto com a luz?'],
  refino:{acel:'Se a falha aparece ao acelerar, sensores de fluxo de ar e bobinas entram na lista de suspeitos.',lenta:'Se acontece em marcha lenta, olhamos corpo de borboleta e válvula de marcha lenta.'},
  acao:'Lemos todas as centrais, acompanhamos os parâmetros em tempo real e entregamos o laudo com a causa identificada.'},
 {id:'perda_potencia',nome:'falha de ignição ou alimentação',sistema:'Motor e ignição',urg:2,
  kw:{potencia:2,forca:2,falhand:2,engasg:3,morr:2,fraco:1,retomad:2,solavanc:2,tranco:1,perd:1},
  hip:'Perda de força e falhas costumam vir da ignição (velas e bobinas), da alimentação (filtros, bicos e bomba) ou de um sensor desregulando a mistura',
  q:['A falta de força aparece em qualquer rotação ou só ao acelerar forte?','O consumo de combustível mudou nas últimas semanas?'],
  refino:{acel:'Falta de força ao acelerar forte costuma apontar para ignição ou alimentação.',frio:'Se piora com o motor frio, sensores de temperatura e de mistura entram na lista.',lenta:'Irregularidade em marcha lenta reforça a hipótese de ignição ou admissão.'},
  acao:'Lemos a central, medimos a pressão de combustível e testamos ignição e bicos com instrumento.'},
 {id:'vibracao',nome:'desbalanceamento ou alinhamento',sistema:'Rodas e alinhamento',urg:1,
  kw:{vibra:3,trepid:3,tremen:2,tremer:2,tremid:2,balanc:2,volante:1,velocidade:1,pneu:1,roda:1},
  hip:'Vibração em velocidade geralmente vem de desbalanceamento das rodas, pneu com deformação ou alinhamento fora da medida',
  q:['A vibração começa em qual velocidade, mais ou menos?','Você sente no volante ou no banco?'],
  refino:{vel:'Vibração que aparece em faixa de velocidade alta costuma ser balanceamento.',frear:'Se aparece só ao frear, o foco passa para os discos.'},
  acao:'Fazemos balanceamento e alinhamento e inspecionamos pneus, pivôs e terminais.'},
 {id:'superaquecimento',nome:'falha no arrefecimento',sistema:'Arrefecimento',urg:3,
  kw:{superaquec:3,temperatura:2,ferv:3,radiador:2,ventoinha:2,ponteiro:1,vermelh:1,esquent:3,aquec:2,agua:1},
  hip:'Temperatura alta costuma estar ligada ao arrefecimento: nível do líquido, ventoinha, válvula termostática, radiador ou bomba d’água',
  seg:'Pare em local seguro, desligue o motor e espere esfriar antes de abrir o reservatório. Rodar assim pode causar danos graves ao motor.',
  q:['O ponteiro sobe no trânsito parado ou também em velocidade?','Você notou o nível do reservatório baixando?'],
  refino:{lenta:'Esquentar parado e normalizar em movimento aponta para a ventoinha.',vel:'Esquentar em velocidade pode indicar radiador obstruído ou bomba d’água.'},
  acao:'Testamos a pressão do sistema, a ventoinha e o termostato e verificamos vazamentos.'},
 {id:'suspensao_ruido',nome:'folga na suspensão',sistema:'Suspensão',urg:1,
  kw:{lombada:2,buraco:2,suspens:2,amortec:3,pancada:2,batida:2,bate:1,barulho:1,estal:1},
  hip:'Barulho em lombadas e buracos costuma vir de amortecedores, batentes, buchas ou pivôs desgastados',
  q:['O ruído vem da frente ou da traseira?','Parece um toc seco ou um rangido contínuo?'],
  refino:{lomb:'Isso combina com componentes de suspensão com folga.'},
  acao:'Levantamos o carro e verificamos folgas, coifas e amortecedores no elevador.'},
 {id:'partida_bateria',nome:'bateria ou sistema de partida',sistema:'Partida e carga',urg:1,
  kw:{partid:2,'nao liga':3,'nao pega':3,'nao da partida':3,bateria:3,arranque:3,giro:1,morta:2,fraca:1,clique:1},
  hip:'Dificuldade para ligar costuma apontar para bateria fraca, terminais oxidados, motor de arranque ou sistema de carga',
  q:['Ao girar a chave, o painel acende e o motor de arranque tenta girar?','A bateria tem quanto tempo de uso, mais ou menos?'],
  refino:{frio:'Se piora de manhã ou com o carro parado há dias, bateria e terminais ficam no topo da lista.'},
  acao:'Testamos bateria, alternador e arranque com instrumento antes de recomendar qualquer troca.'},
 {id:'consumo_fumaca',nome:'mistura, consumo de óleo ou arrefecimento',sistema:'Combustão e escapamento',urg:2,
  kw:{consum:3,combustivel:2,gasolina:1,bebend:2,fumaca:3,escapament:2,azulad:2,branca:2,preta:2,oleo:2,cheiro:2,queimad:2},
  hip:'Consumo alto ou fumaça no escapamento costuma ter origem na mistura (sensores e injeção), no consumo de óleo ou em vazamento de líquido de arrefecimento, e a cor da fumaça ajuda a separar essas causas',
  q:['Qual é a cor da fumaça: azulada, branca ou preta?','Você tem precisado completar o óleo entre as trocas?'],
  refino:{},
  acao:'Lemos a central, avaliamos a combustão e verificamos vazamentos e nível de óleo.'}
];
const KBX={};KB.forEach(e=>KBX[e.id]=e);

/* detalhes que o cliente menciona e que a IA "anota" na memória */
const DET=[
 {k:'frio',l:'com o motor frio',r:['frio','fria','manha']},
 {k:'quente',l:'com o motor quente',r:['quente','esquent','aquec']},
 {k:'curva',l:'em curvas',r:['curva','esterc','viro','vira']},
 {k:'reta',l:'em linha reta',r:['reta','retilinea']},
 {k:'frear',l:'ao frear',r:['frenag','frear','freand','freio']},
 {k:'acel',l:'ao acelerar',r:['aceler']},
 {k:'lomb',l:'em lombadas e buracos',r:['lombada','buraco','ondulac','paralelep']},
 {k:'vel',l:'em velocidade alta',r:['rodovia','estrada','velocidade','alta vel']},
 {k:'lenta',l:'em marcha lenta',r:['marcha lenta','parado']},
 {k:'esq',l:'do lado esquerdo',r:['esquerd']},
 {k:'dir',l:'do lado direito',r:['direit']}];
/* sinais de risco: elevam a urgência e disparam orientação de segurança */
const ALERTAS=[
 {k:'pisc',r:['piscand'],u:1,t:'Luz piscando indica falha de combustão. Evite dirigir longas distâncias, porque isso pode danificar o catalisador.'},
 {k:'fuma',r:['fumegand','fumaca'],u:0,t:'Se a fumaça estiver saindo do capô, não abra o capô enquanto o motor estiver quente.'},
 {k:'quei',r:['queimad'],u:1,t:'Cheiro de queimado pede atenção imediata. Pare em local seguro e desligue o motor.'},
 {k:'vaza',r:['vazand','vazament','poca'],u:1,t:'Vazamento de fluido pede atenção. Evite rodar até a causa ser identificada.'}];
const MODELOS=['civic','corolla','onix','hb20','gol','polo','golf','jetta','tiguan','tcross','compass','renegade','toro','hilux','ranger','s10','amarok','fusion','focus','fiesta','uno','palio','argo','cronos','mobi','kwid','sandero','duster','captur','creta','tucson','kicks','versa','sentra','city','fit','hrv','crv','bmw','audi','mercedes','volvo','mini','mustang','camaro','cruze','tracker','spin','prisma','celta','corsa','ecosport','fox','virtus','nivus','pulse','strada','saveiro','montana','gla','x1','x3','a3','a4','q3','q5'];
const WORRY=['preocup','medo','assust','aflit','desesper','urgente','socorro','nervos','ansios'];

function scoreAll(n,toks){
  return KB.map(e=>{let s=Object.keys(e.kw).reduce((a,r)=>a+(e.kw[r]&&hit(n,toks,r)?e.kw[r]:0),0);
    if(s>0&&e.id===mem.topic)s+=2;            // continuidade: quem já está em pauta ganha prioridade
    return{e,s}}).sort((a,b)=>b.s-a.s)}
function veicTxt(){const v=mem.veic;if(!v)return'';if(v.raw)return v.mod;
  const m=v.mod?(v.mod.length<=4&&/\d/.test(v.mod)?v.mod.toUpperCase():cap(v.mod)):'';return(m+(v.ano?' '+v.ano:'')).trim()}
function absorb(msg,n,toks){
  let newVeic=false;
  const mod=toks.find(t=>MODELOS.indexOf(t)>-1),ano=(msg.match(/\b(19[89]\d|20[0-3]\d)\b/)||[])[0];
  if(mod||ano){if(!mem.veic||mem.veic.raw)mem.veic={mod:null,ano:null};
    if(mod&&mem.veic.mod!==mod){mem.veic.mod=mod;newVeic=true}
    if(ano&&mem.veic.ano!==ano){mem.veic.ano=ano;newVeic=true}}
  else if(mem.pending==='veiculo'&&msg.trim().length<=40&&!mem.veic){mem.veic={mod:msg.trim(),ano:null,raw:true};newVeic=true}
  const newDet=[];
  DET.forEach(d=>{if(d.r.some(r=>hit(n,toks,r))&&!mem.detalhes.has(d.k)){mem.detalhes.set(d.k,d.l);newDet.push(d)}});
  if(/\b(8|9|10|11|12|13)0\b/.test(n)&&!mem.detalhes.has('vel')){mem.detalhes.set('vel','em velocidade alta');newDet.push(DET.find(d=>d.k==='vel'))}
  const alerts=[];
  ALERTAS.forEach(a=>{if(a.r.some(r=>hit(n,toks,r))&&!mem.alerts.has(a.k)){mem.alerts.add(a.k);alerts.push(a.t);if(a.u)mem.urg=3}});
  return{newVeic,newDet,alerts}}
function setTopic(e){mem.topic=e.id;mem.sintomas.set(e.id,e.nome);mem.sistema=e.sistema;mem.urg=Math.max(mem.urg,e.urg);mem.qIndex=0;mem.pending=null}

const OP_WORRY=['Entendo a preocupação.','Obrigado por contar, isso já ajuda bastante.','Faz sentido você querer resolver isso logo.'];
const OP_NEUTRAL=['Certo, vamos por partes.','Anotado.','Boa, isso já me dá uma direção.'];
const FALLBACK=['Rs, aqui eu só entendo de carro. Se o assunto for barulho, luz acesa no painel ou falta de força, me conta que eu ajudo.','Essa fugiu da minha especialidade, que é mecânica e engenharia de motor. Descreva o que o carro está fazendo e eu começo por aí.','Não consegui ligar isso a um sintoma do carro. Pode contar em outras palavras o que você percebe: barulho, vibração, cheiro ou luz no painel?'];

function replyNew(e,worry,ab){
  let t=(e.urg>=3?'Isso pede atenção imediata.':(worry?pick(OP_WORRY):pick(OP_NEUTRAL)))+' '+e.hip+'.';
  if(e.seg)t+=' '+e.seg;
  if(ab.alerts.length)t+=' '+ab.alerts.join(' ');
  if(mem.veic)t+=' Vou considerar que é um '+veicTxt()+'.';
  t+=' Para afinar a hipótese: '+e.q[0].charAt(0).toLowerCase()+e.q[0].slice(1);
  mem.qIndex=1;mem.pending='detalhe';mem.offered=true;
  return{text:t+' A confirmação é feita com instrumento na avaliação física, e eu já deixo o resumo pronto para o consultor.',actions:['wa']}}
function replyRefine(e,ab){
  let t='';
  if(ab.newVeic)t+='Obrigado, '+veicTxt()+' anotado. ';
  if(ab.newDet.length)t+='Anotei: '+ab.newDet.map(d=>d.l).join(', ')+'. ';
  const r=ab.newDet.map(d=>e.refino[d.k]).filter(Boolean)[0];
  t+=(r||pick(['Isso se encaixa na hipótese.','Esse detalhe ajuda a estreitar o caminho.','Faz sentido com o que você descreveu.']))+' ';
  if(ab.alerts.length)t+=ab.alerts.join(' ')+' ';
  while(mem.qIndex<e.q.length&&/lados?\b/.test(e.q[mem.qIndex])&&(mem.detalhes.has('esq')||mem.detalhes.has('dir')))mem.qIndex++;   // não repete pergunta já respondida
  let actions;
  if(!mem.veic&&!mem.askedVeic){t+='Qual é o modelo e o ano do carro? Cada plataforma tem pontos fracos conhecidos.';mem.askedVeic=true;mem.pending='veiculo'}
  else if(mem.qIndex<e.q.length){t+=e.q[mem.qIndex++];mem.pending='detalhe'}
  else{t+=e.acao+' Posso montar o resumo para o consultor?';mem.pending=null;mem.offered=true;actions=['wa']}
  return{text:t.trim(),actions}}

/* ---------- mock do LLM: memória + intenção + tolerância a erro de digitação ---------- */
function mockChefe(history){
  const msg=history[history.length-1].content,n=norm(msg),toks=n.split(' ').filter(Boolean);
  const worry=WORRY.some(w=>hit(n,toks,w));
  let sc=scoreAll(n,toks),top=sc[0];
  if(top.s<3&&!mem.topic){   // sintomas contados em partes: considera as últimas 3 mensagens do cliente
    const ctx=norm(history.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join(' ')),sc2=scoreAll(ctx,ctx.split(' ').filter(Boolean));
    if(sc2[0].s>=3){sc=sc2;top=sc2[0]}}
  const h=(...r)=>r.some(x=>hx(n,toks,x));
  const changed=top.s>=3&&mem.topic!==top.e.id;
  if(changed)mem.detalhes.clear();
  const ab=absorb(msg,n,toks);

  if(top.s>=3){ if(changed){setTopic(top.e);return replyNew(top.e,worry,ab)} return replyRefine(top.e,ab)}

  if(h('voce e um robo','voce e robo','e um robo','voce e humano','voce e uma pessoa','e uma ia','com quem falo','quem e voce','e real'))
    return{text:'Sou o Chefe de Oficina virtual da Ruwer Garage, uma inteligência artificial. Eu organizo o seu relato e aponto hipóteses para você chegar preparado. Quem confirma e executa tudo é a equipe técnica, na avaliação física.'};
  if(toks.length<=4&&h('oi','ola','opa','eae','bom dia','boa tarde','boa noite'))
    return{text:pick(['Oi! Que bom ter você aqui.','Olá! Pode contar comigo.'])+' O que o seu carro está fazendo? Se souber, me diga também o modelo e o ano.'};
  if(h('obrigad','valeu','agradec','brigad'))
    return{text:'Por nada. Se aparecer outro sintoma, é só descrever aqui. Quando quiser, deixo o resumo pronto para o consultor.',actions:mem.topic?['wa']:undefined};
  if(h('endereco','como chegar','onde fica','localizacao','mapa','onde voces ficam'))
    return{text:'Ficamos no Complexo Automotivo, em Vicente Pires, Brasília - DF. O botão abaixo abre a rota no mapa.',actions:['maps']};
  if(h('garantia'))
    return{text:'Cada serviço sai com garantia descrita no orçamento, com prazo e cobertura informados antes da aprovação. O consultor detalha as condições para o seu caso.',actions:['wa']};
  if(h('preco','valor','quanto','custa','custo','orcamento','barato'))
    return{text:'Valor eu só passo depois de ver o carro, porque o orçamento sai por item, com laudo e fotos, e você aprova o que fizer sentido. Agora posso organizar o seu relato para a avaliação ser objetiva.'+(mem.topic?'':' O que o carro está apresentando?'),actions:mem.topic?['wa']:undefined};
  if(h('agendar','marcar','agenda','horario','visita','avaliacao','quero ir','levar')||(mem.offered&&!mem.pending&&toks.length<=3&&h('sim','pode','quero','bora','vamos','claro','ok','combinado','fechado','topo')))
    return mem.topic?{text:'Combinado. O resumo da nossa conversa está pronto para o consultor, com sintomas e veículo. Toque no botão para abrir o WhatsApp e escolher o melhor horário.',actions:['wa']}
                    :{text:'Posso deixar tudo pronto. Antes, me conta o que o carro está fazendo? Assim o consultor já recebe o contexto.'};
  if(h('remap','stage','potencia a mais','mais potencia','aumentar potencia','ganhar potencia','preparar o motor','chip')){mem.pending='veiculo';
    return{text:'Calibração de software de motor é uma das nossas frentes. Antes de qualquer proposta avaliamos a viabilidade do carro, guardamos o arquivo original e validamos o resultado em uso real. Qual é o modelo, o ano e o motor?'}}
  if(h('polimento','risco','riscado','pintura','cristaliz','vitrific','estetica','enceramento','lavagem'))
    return{text:'Cuidamos de pintura e interior com produtos profissionais e iluminação de inspeção, e o nível de correção é definido depois de medir a pintura. Me diga o que incomoda, como riscos, opacidade ou manchas, e o modelo do carro.'};
  if(h('revisao','preventiva','troca de oleo','quilometragem','manutencao'))
    return{text:'A revisão preventiva sai com checklist por quilometragem, fotos e recomendações por ordem de urgência. Quantos quilômetros o carro tem e qual é o modelo?'};

  if(ab.newVeic&&!mem.topic)return{text:'Anotei: '+veicTxt()+'. O que ele está apresentando? Pode descrever barulho, cheiro, luz no painel ou o que mais você percebeu.'};
  if(mem.topic&&(ab.newDet.length||ab.newVeic||mem.pending||(top.s>0&&top.e.id===mem.topic)))return replyRefine(KBX[mem.topic],ab);
  if(top.s>0){const pre=(top.s>=2&&top.s>sc[1].s)?'Parece algo ligado a '+top.e.sistema.toLowerCase()+', mas quero acertar a hipótese. ':'Quero acertar a hipótese antes de opinar. ';
    return{text:pre+'Onde você percebe isso, na frente, atrás ou no motor? E acontece em alguma situação específica, como frear, virar ou acelerar?'}}
  return{text:pick(FALLBACK)}}
/*ENGINE_END*/

RUWER.engine = { mem, KBX, veicTxt, mockChefe };
})();
