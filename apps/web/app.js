const T={ar:{h1:'ارسم وخمّن… وتحدّى صاحبك!',sub:'لعبة رسم وتخمين سريعة بين لاعبين. اكتب اسمك وابدأ في ثواني.',s1:'أنشئ غرفة وشارك الكود',s2:'صاحبك يدخل بالكود',s3:'بدّلوا الرسم والتخمين واجمعوا النقاط',
 name:'اسمك',wordsLang:'لغة الكلمات',code:'كود الغرفة',guess:'اكتب تخمينك واضغط Enter',create:'إنشاء غرفة',or:'أو',join:'دخول',eraser:'ممحاة',players:'اللاعبون',chat:'الشات',room:'الغرفة',copy:'نسخ',copied:'تم ✓',you:'أنت',
 round:'جولة',pick:'اختر كلمة للرسم: ',draw:'ارسم: ',word:'الكلمة كانت: ',winner:'🏆 الفائز: ',tie:'🤝 تعادل!',again:'العب مرة تانية',guessed:' خمّن الكلمة!',wait:'في انتظار اللاعب التاني…',waitSub:'شارك كود الغرفة: ',
 choosing:'الخصم بيختار كلمة…',yourTurn:'دورك ترسم!',guessNow:'خمّن الرسمة!',noserver:'تعذّر الاتصال بالسيرفر. تأكد أن السيرفر شغّال أو من إعداد config.js',
 not_found:'الغرفة غير موجودة',full:'الغرفة ممتلئة (لاعبين اتنين فقط)',started:'المباراة بدأت بالفعل',LOBBY:'في الانتظار',WORD_SELECTION:'اختيار الكلمة',DRAWING:'الرسم',ROUND_END:'نهاية الجولة',MATCH_END:'نهاية المباراة'},
en:{h1:'Draw it. Guess it. Beat your friend!',sub:'A fast two-player drawing and guessing game. Enter your name and play in seconds.',s1:'Create a room and share the code',s2:'Your friend joins with the code',s3:'Take turns drawing and guessing to collect points',
 name:'Your name',wordsLang:'Words language',code:'Room code',guess:'Type your guess and press Enter',create:'Create room',or:'or',join:'Join',eraser:'Eraser',players:'Players',chat:'Chat',room:'Room',copy:'Copy',copied:'Copied ✓',you:'you',
 round:'Round',pick:'Pick a word to draw: ',draw:'Draw: ',word:'The word was: ',winner:'🏆 Winner: ',tie:'🤝 It\'s a tie!',again:'Play again',guessed:' guessed it!',wait:'Waiting for your opponent…',waitSub:'Share the room code: ',
 choosing:'Opponent is choosing a word…',yourTurn:'Your turn to draw!',guessNow:'Guess the drawing!',noserver:'Cannot reach the game server. Make sure it is running or check config.js',
 not_found:'Room not found',full:'Room is full (two players only)',started:'Match already started',LOBBY:'Waiting',WORD_SELECTION:'Choosing word',DRAWING:'Drawing',ROUND_END:'Round over',MATCH_END:'Match over'}};
const $=id=>document.getElementById(id);let L=(()=>{try{return localStorage.lang}catch(e){}})()||'ar';const t=k=>T[L][k]??k;
let s,st=null,me=null,secret='',erase=false,drawing=false,buf=[],last=0,n=0,color='#111111',tmp;
const COLORS=['#111111','#e63946','#f77f00','#ffb703','#2a9d8f','#1d8cf8','#6c4cf1','#e056a0','#8d5a3b','#ffffff'];
const cv=$('cv'),cx=cv.getContext('2d');
function applyLang(){document.documentElement.lang=L;document.documentElement.dir=L=='ar'?'rtl':'ltr';$('ui').textContent=L=='ar'?'EN':'عربي';$('lang').value=L;
 document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));document.querySelectorAll('[data-p]').forEach(e=>e.placeholder=t(e.dataset.p));if(st)render(st)}
function setLang(l){L=l;try{localStorage.lang=l}catch(e){}applyLang()}
$('ui').onclick=()=>setLang(L=='ar'?'en':'ar');$('lang').onchange=()=>setLang($('lang').value);
COLORS.forEach((c,i)=>{const b=document.createElement('button');b.style.background=c;b.setAttribute('aria-label',c);if(!i)b.className='on';
 b.onclick=()=>{color=c;erase=false;[...$('sw').children].forEach(x=>x.className='');b.className='on'};$('sw').append(b)});
$('eraser').onclick=()=>{erase=!erase;$('eraser').style.background=erase?'#6c4cf1':'';$('eraser').style.color=erase?'#fff':''};
applyLang();
const sc=document.createElement('script');sc.src=(window.SERVER_URL||'')+'/socket.io/socket.io.js';sc.onload=boot;sc.onerror=()=>($('err').textContent=t('noserver'));document.head.append(sc);
function log(x,sys){const d=document.createElement('div');d.textContent=x;if(sys)d.className='sys';$('chat').append(d);$('chat').scrollTop=1e9}
function overlay(html,btn){const o=$('overlay');o.replaceChildren();if(!html){o.style.display='none';return}o.style.display='flex';
 const p=document.createElement('div');p.textContent=html;o.append(p);if(btn){const b=document.createElement('button');b.className='secondary';b.textContent=t('again');b.onclick=()=>location.reload();o.append(b)}}
function seg(e){cx.lineCap=cx.lineJoin='round';cx.strokeStyle=e.erase?'#fff':e.color;cx.lineWidth=e.size;cx.beginPath();e.points.forEach((p,i)=>i?cx.lineTo(...p):cx.moveTo(...p));if(e.points.length==1)cx.lineTo(e.points[0][0]+.1,e.points[0][1]);cx.stroke()}
function render(x){$('home').style.display='none';$('game').style.display='grid';$('rc').textContent=x.id;const me_=x.drawerId==me,pl=$('players');pl.replaceChildren();
 x.players.forEach(p=>{const d=document.createElement('div');d.className='pl'+(p.id==x.drawerId?' on':'');const a=document.createElement('span');a.className='av';a.textContent=[...p.name][0]||'?';
  const nm=document.createElement('span');nm.className='nm';nm.textContent=p.name+(p.id==me?' ('+t('you')+')':'')+(p.guessed?' ✅':'')+(p.id==x.drawerId&&x.phase!='LOBBY'?' ✏️':'');const b=document.createElement('b');b.textContent=p.score;d.append(a,nm,b);pl.append(d)});
 $('hint').textContent=x.phase=='DRAWING'?(me_?secret:x.hint):'';
 $('status').textContent=x.phase=='LOBBY'?'':x.phase=='WORD_SELECTION'?(me_?t('yourTurn'):t('choosing')):x.phase=='DRAWING'?(me_?t('yourTurn'):t('guessNow')):t(x.phase);
 $('status').textContent+=x.phase!='LOBBY'?'  •  '+t('round')+' '+x.round+'/'+x.rounds:'';
 $('tools').style.display=x.phase=='DRAWING'&&me_?'flex':'none';if(x.phase!='WORD_SELECTION'||!me_)$('opts').replaceChildren();
 if(x.phase=='LOBBY')overlay(t('wait')+' '+t('waitSub')+x.id);else if(x.phase!='MATCH_END')overlay('')}
function boot(){s=io(window.SERVER_URL||undefined);s.on('connect',()=>me=s.id);s.on('connect_error',()=>($('err').textContent=t('noserver')));
 const nm=()=>$('name').value.trim()||(L=='ar'?'لاعب':'Player');
 $('create').onclick=()=>{$('err').textContent='';s.emit('room:create',{name:nm(),lang:$('lang').value})};
 $('join').onclick=()=>{$('err').textContent='';s.emit('room:join',{roomId:$('code').value.trim(),name:nm()})};
 $('code').onkeydown=e=>{if(e.key=='Enter')$('join').click()};
 $('copy').onclick=()=>{navigator.clipboard?.writeText($('rc').textContent);$('copy').textContent=t('copied');setTimeout(()=>($('copy').textContent=t('copy')),1500)};
 s.on('error:msg',m=>($('err').textContent=t(m)));
 s.on('canvas:snapshot',a=>{cx.clearRect(0,0,800,600);a.forEach(seg)});s.on('canvas:clear',()=>cx.clearRect(0,0,800,600));s.on('stroke',seg);
 s.on('word:options',o=>{const b=$('opts');b.textContent=t('pick');o.forEach(w=>{const k=document.createElement('button');k.textContent=w;k.onclick=()=>{s.emit('word:choose',w);b.replaceChildren()};b.append(k)})});
 s.on('word:secret',w=>{secret=w;if(st)render(st)});
 s.on('round:end',d=>log(t('word')+d.word,1));
 s.on('match:end',r=>{const tie=r.length>1&&r[0].score==r[1].score;overlay(tie?t('tie'):t('winner')+r[0].name,true)});
 s.on('chat',m=>log(m.key?m.name+t(m.key):(m.from?m.from+': ':'')+m.text,m.system));
 s.on('room:state',x=>{st=x;render(x)});
 $('msg').onkeydown=e=>{if(e.key=='Enter'&&e.target.value.trim()){s.emit('guess',e.target.value);e.target.value=''}};
 setInterval(()=>{if(st&&st.endsAt&&st.phase!='LOBBY')$('timer').textContent=Math.max(0,Math.ceil((st.endsAt-Date.now())/1000))+'s';else $('timer').textContent=''},250);
 const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*800/r.width,(e.clientY-r.top)*600/r.height]};
 const can=()=>st&&st.phase=='DRAWING'&&st.drawerId==me;
 function flush(id){if(!buf.length)return;const e={id,color,size:+$('size').value,erase,points:buf};seg(e);s.emit('stroke',e);buf=buf.slice(-1)}
 cv.onpointerdown=e=>{if(!can())return;drawing=true;cv.setPointerCapture(e.pointerId);buf=[pos(e)];tmp=me+Date.now()+(n++)};
 cv.onpointermove=e=>{if(!drawing)return;buf.push(pos(e));if(Date.now()-last>30||buf.length>150)flush(tmp+'_'+(last=Date.now()))};
 cv.onpointerup=()=>{if(drawing){flush(tmp+'_end');drawing=false;buf=[]}}}
