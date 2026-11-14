/* ==========================================================
   CHEFE DE OFICINA: interface do chat + camada de API (troque o mock por um LLM real em LLM.endpoint)
   ========================================================== */
(function () {
const { $, waLink } = RUWER;
const { mem, KBX, veicTxt, mockChefe } = RUWER.engine;
const iaLog=$('#iaLog'),iaForm=$('#iaForm'),iaIn=$('#iaIn'),iaBtn=$('#iaSend'),iaProg=$('#iaBar').firstElementChild;
const chatHist=[];   // memória da conversa: [{role:'user'|'assistant', content}]

/* >>> PARA USAR UM LLM REAL: aponte LLM.endpoint para o SEU backend (ex.: '/api/chefe-de-oficina').
   Esse backend chama OpenAI/Anthropic com a chave guardada no servidor. NUNCA coloque chave de API neste arquivo. <<< */
const LLM={endpoint:null};
const SYSTEM_PROMPT='Você é o Chefe de Oficina virtual da Ruwer Garage, complexo automotivo em Vicente Pires, Brasília. '+
  'Acolha o cliente, investigue o sintoma com perguntas curtas, entregue um pré-diagnóstico técnico sempre como hipótese (nunca definitivo) '+
  'e convide para a avaliação física. Priorize a segurança quando houver risco. Nunca invente preços, prazos ou garantias. '+
  'Se perguntarem, diga que é uma inteligência artificial.';

/* ÚNICO ponto de contato com a "inteligência". Troque o mock por fetch sem mexer no resto da interface.
   Contrato: recebe o histórico e devolve { text, actions? } (actions: 'wa' | 'maps'). */
async function askChefe(hist){
  if(LLM.endpoint){
    const r=await fetch(LLM.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({system:SYSTEM_PROMPT,messages:hist.map(m=>({role:m.role,content:m.content}))})});
    if(!r.ok)throw new Error('LLM '+r.status);
    const d=await r.json();
    return{text:d.reply,actions:d.actions};
  }
  return mockChefe(hist);      // mock avançado: memória + intenção + tolerância a erro de digitação
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URGS=['Aguardando','Baixa','Média','Alta'];
function tele(){   // painel de telemetria reflete a memória da IA
  $('#tSint').textContent=mem.sintomas.size;
  $('#tSist').textContent=mem.sistema||'Aguardando';
  const u=$('#tUrg');u.textContent=URGS[mem.urg];u.dataset.l=mem.urg}
function resumo(){
  const e=mem.topic?KBX[mem.topic]:null,d=[...mem.detalhes.values()].join(', ');
  return 'Olá! Fiz o pré-diagnóstico no site da Ruwer Garage e gostaria de agendar uma avaliação física.\n'+
    'Veículo: '+(veicTxt()||'não informado')+'\n'+
    'Sistema: '+(e?e.sistema:'não informado')+'\n'+
    'Hipótese inicial: '+(e?e.nome:'não definida')+(d?' ('+d+')':'')+'\n'+
    'Urgência estimada: '+URGS[mem.urg]}

/* AUTO-SCROLL: sempre que entra mensagem (do cliente ou da IA) ou o indicador de análise, a caixa desce até o fim */
function toEnd(){iaLog.scrollTop=iaLog.scrollHeight;requestAnimationFrame(()=>{iaLog.scrollTop=iaLog.scrollHeight})}

function addMsg(who,text,actions){
  const el=document.createElement('div');el.className='m '+(who==='user'?'me':'bot');
  const p=document.createElement('p');p.textContent=text;el.appendChild(p);       // textContent: o texto do cliente nunca vira HTML
  if(actions&&actions.length){const row=document.createElement('div');row.className='act';
    actions.forEach(a=>{const b=document.createElement('a');b.className='btn sm';b.target='_blank';b.rel='noopener';
      if(a==='wa'){b.href=waLink(resumo());b.textContent='Enviar resumo ao consultor'}
      else{b.href='https://www.google.com/maps/search/?api=1&query=Complexo+Automotivo+Vicente+Pires+Bras%C3%ADlia';b.textContent='Abrir no mapa'}
      row.appendChild(b)});el.appendChild(row)}
  iaLog.appendChild(el);toEnd();return el}

function showAnalysis(ms){
  const el=document.createElement('div');el.className='m sys';
  el.innerHTML='<span class="dots"><i></i><i></i><i></i></span><span class="st">Analisando banco de dados de engenharia...</span>';
  iaLog.appendChild(el);toEnd();
  iaProg.style.transition='none';iaProg.style.width='0';void iaProg.offsetWidth;
  iaProg.style.transition='width '+ms+'ms linear';iaProg.style.width='100%';
  setTimeout(()=>{const s=el.querySelector('.st');if(s)s.textContent='Cruzando sintomas e montando o pré-diagnóstico...'},ms*.55);
  return el}
function lock(on){iaIn.disabled=on;iaBtn.disabled=on;iaLog.setAttribute('aria-busy',on)}

async function handleSend(text){
  lock(true);
  addMsg('user',text);chatHist.push({role:'user',content:text});
  const DELAY=1500+Math.random()*500;                  // 1,5 a 2 s de "análise"
  const el=showAnalysis(DELAY),t0=performance.now();
  let reply;
  try{reply=await askChefe(chatHist)}
  catch(e){reply={text:'Tive uma instabilidade aqui do meu lado. Pode repetir o que o carro está fazendo? Se preferir, o consultor atende você agora pelo WhatsApp.',actions:['wa']}}
  await sleep(Math.max(0,DELAY-(performance.now()-t0)));
  el.remove();iaProg.style.transition='none';iaProg.style.width='0';
  addMsg('assistant',reply.text,reply.actions);chatHist.push({role:'assistant',content:reply.text});
  tele();lock(false);if(matchMedia('(hover:hover)').matches)iaIn.focus()}

iaForm.addEventListener('submit',e=>{e.preventDefault();const t=iaIn.value.trim();if(!t||iaIn.disabled)return;iaIn.value='';handleSend(t)});
document.querySelectorAll('.sg').forEach(b=>b.addEventListener('click',()=>{if(!iaIn.disabled)handleSend(b.dataset.t)}));
addMsg('assistant','Oi, eu sou o Chefe de Oficina virtual da Ruwer Garage. Descreva o que o carro está fazendo e, se puder, me diga o modelo e o ano. Eu analiso o seu relato e digo por onde a nossa equipe começaria.');
tele();
})();
