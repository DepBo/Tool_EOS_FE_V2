(async function(){
  'use strict';
  const C=QuizCore,$=id=>document.getElementById(id),app=$('app'),modal=$('modal');
  const boot=document.getElementById('embedded-data');
  const embedded=boot?JSON.parse(boot.textContent):null;
  const paths={book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M13 7a3 3 0 0 1 3-3h5v15h-5a4 4 0 0 0-3 2',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',plus:'M12 5v14M5 12h14',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',arrow:'M5 12h14m-5-5 5 5-5 5',back:'M19 12H5m5-5-5 5 5 5',clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',history:'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l3 2',chart:'M4 20V10h4v10 M10 20V4h4v16 M16 20v-7h4v7',folder:'M3 5h6l2 3h10v12H3z',refresh:'M20 7v5h-5M4 17v-5h5M20 12a8 8 0 0 0-14-5M4 12a8 8 0 0 0 14 5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',check:'m5 12 4 4L19 6',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',play:'m8 4 12 8-12 8z',flag:'M5 22V3m0 1c5-5 9 5 15 0v10c-6 5-10-5-15 0',volume:'M11 5 6 9H2v6h4l5 4z M15.5 8.5a5 5 0 0 1 0 7 M18.5 5.5a9 9 0 0 1 0 13',volumeOff:'M11 5 6 9H2v6h4l5 4z M22 9l-6 6 M16 9l6 6',moon:'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',sun:'M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4',fire:'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'};
  const icon=name=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.book}"/></svg>`;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SUPA_URL='https://ghbnoojsxdqqbecszqas.supabase.co/rest/v1';
  const SUPA_KEY='sb_publishable_iQtscvMNv_UmjmSP30vkRw_7Pq7k6PU';
  let db,exams=[],history=[],sessions=[],settings={name:'',endpoint:'',sync:false,sound:true,theme:'light'},session=null,subject=null,view='library',search='',libraryStatus='all',studiedFilter={status:'studied',subject:'',search:''},importing=false,rememberedRoot=null;
  let renderToken=0,timer,autoTimer,toastTimer,comboTimer=null,audioCtx=null,cloudSyncStatus='idle',leaderboardUsers=[];
  let questionTimerKey=null,questionReadyAt=null,navLockUntil=0,lastSpeedResult=null;
  const questionLbCache=new Map(),rootHandles=new Map();
  const urls=new Map();
  async function supaFetch(path,options={}){const headers={'apikey':SUPA_KEY,'Content-Type':'application/json',...(options.headers||{})};const res=await fetch(SUPA_URL+path,{...options,headers,signal:options.signal||AbortSignal.timeout(10000)});if(!res.ok){const text=await res.text().catch(()=>'');throw Error('Cloud HTTP '+res.status+(text?': '+text:''));}const ct=res.headers.get('content-type')||'';return ct.includes('application/json')?res.json():null;}
  async function syncUserToCloud(nick,extraStats={}){
    if(!nick||nick==='Người học')return null;
    try{
      const existing=await supaFetch('/users?nickname=eq.'+encodeURIComponent(nick)+'&limit=1');
      const row=existing?.[0];
      if(!row){
        const created=await supaFetch('/users',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify({nickname:nick,display_name:nick,total_attempts:extraStats.addAttempts||0,total_correct:extraStats.addCorrect||0,best_streak:extraStats.best_streak||0,last_active_at:new Date().toISOString()})});
        return created?.[0]||null;
      }else{
        const nextAttempts=(row.total_attempts||0)+(extraStats.addAttempts||0);
        const nextCorrect=(row.total_correct||0)+(extraStats.addCorrect||0);
        const nextStreak=Math.max(row.best_streak||0,extraStats.best_streak||0);
        const updated=await supaFetch('/users?nickname=eq.'+encodeURIComponent(nick),{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify({display_name:nick,total_attempts:nextAttempts,total_correct:nextCorrect,best_streak:nextStreak,last_active_at:new Date().toISOString()})});
        return updated?.[0]||row;
      }
    }catch{return null;}
  }
  async function pushHistoryToCloud(record){
    if(!record||!record.name||record.name==='Người học')return;
    try{
      await syncUserToCloud(record.name,{addAttempts:1,addCorrect:record.correct||0,best_streak:record.maxStreak||0});
      await supaFetch('/study_history',{method:'POST',headers:{'Prefer':'resolution=ignore-duplicates'},body:JSON.stringify({id:record.id,nickname:record.name,exam_id:record.examId||'',exam_title:record.exam||'',subject:record.subject||'KHÁC',mode:record.mode==='eos'?'eos':'practice',score:record.score,correct:record.correct||0,wrong:record.wrong||0,unknown:record.unknown||0,graded:record.graded||0,duration_seconds:record.durationSeconds||0,max_streak:record.maxStreak||0,created_at:new Date(record.createdAt||Date.now()).toISOString()})});
      cloudSyncStatus='synced';
    }catch{cloudSyncStatus='offline';}
  }
  async function fetchQuestionLeaderboard(examId,qIndex){
    const key=examId+':'+qIndex;
    try{
      const rows=await supaFetch('/question_records?exam_id=eq.'+encodeURIComponent(examId)+'&question_index=eq.'+Number(qIndex)+'&order=duration_ms.asc,updated_at.asc&limit=5');
      if(Array.isArray(rows)){
        questionLbCache.set(key,rows);
        updateMiniLeaderboardDOM(examId,qIndex);
      }
    }catch{}
  }
  async function saveQuestionSpeed(examId,qIndex,nick,durationMs){
    const key=examId+':'+qIndex;
    try{
      const rows=await supaFetch('/rpc/record_question_speed',{method:'POST',body:JSON.stringify({p_exam_id:examId,p_question_index:Number(qIndex),p_nickname:nick,p_duration_ms:Math.round(durationMs)})});
      if(Array.isArray(rows)){
        questionLbCache.set(key,rows);
        updateMiniLeaderboardDOM(examId,qIndex);
      }
    }catch{}
  }
  function formatSpeedMs(ms){return (ms/1000).toFixed(2)+'s';}
  function updateMiniLeaderboardDOM(examId,qIndex){
    const el=$('miniLb');
    if(!el||!session||session.exam.id!==examId||session.exam.questions[session.current]?.index!==qIndex)return;
    const key=examId+':'+qIndex,rows=questionLbCache.get(key),me=nickname();
    const myBadge=lastSpeedResult&&lastSpeedResult.key===key?`<span class="badge done">⚡ ${formatSpeedMs(lastSpeedResult.ms)}</span>`:'';
    const body=rows===undefined?'<p class="small muted" style="margin:6px 0 0">Đang tải top tốc độ…</p>':rows.length?`<div class="mini-lb-list">${rows.map((r,i)=>`<div class="mini-lb-row ${r.nickname===me?'is-me':''}"><span class="mini-lb-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.'}</span><span class="mini-lb-name">${esc(r.nickname)}</span><span class="mini-lb-time">${formatSpeedMs(r.duration_ms)}</span></div>`).join('')}</div>`:'<p class="small muted" style="margin:6px 0 0">Chưa có kỷ lục đúng nào cho câu này.</p>';
    el.innerHTML=`<div class="row space"><h3 style="margin:0">⚡ Top tốc độ · Câu ${qIndex}</h3>${myBadge}</div>${body}`;
  }
  async function syncCloudHistory(){
    const nick=settings.name?.trim();
    cloudSyncStatus='syncing';
    try{
      const usersData=await supaFetch('/users?order=total_correct.desc,best_streak.desc&limit=50');
      if(Array.isArray(usersData))leaderboardUsers=usersData;
      if(nick&&nick!=='Người học'){
        await syncUserToCloud(nick);
        const cloudRows=await supaFetch('/study_history?nickname=eq.'+encodeURIComponent(nick)+'&order=created_at.desc&limit=500');
        if(Array.isArray(cloudRows)){
          const localIds=new Set(history.map(h=>h.id));
          const cloudIds=new Set(cloudRows.map(r=>r.id));
          let added=0;
          for(const r of cloudRows){
            if(!localIds.has(r.id)){
              const item={id:r.id,examId:r.exam_id,exam:r.exam_title,subject:r.subject,mode:r.mode,name:r.nickname,createdAt:Date.parse(r.created_at)||Date.now(),durationSeconds:r.duration_seconds||0,score:r.score!==null&&r.score!==undefined?Number(r.score):null,correct:r.correct||0,wrong:r.wrong||0,unknown:r.unknown||0,graded:r.graded||0,maxStreak:r.max_streak||0};
              history.push(item);
              if(!embedded&&db)await put('history',item).catch(()=>{});
              added++;
            }
          }
          for(const h of history)if(h.name===nick&&!cloudIds.has(h.id))await pushHistoryToCloud(h);
          if(added>0){const u2=await supaFetch('/users?order=total_correct.desc,best_streak.desc&limit=50');if(Array.isArray(u2))leaderboardUsers=u2;}
        }
      }
      cloudSyncStatus='synced';
    }catch{cloudSyncStatus='offline';}
  }
  async function fetchQuestionLeaderboard(examId,qIndex){
    const key=examId+':'+qIndex;
    try{
      const rows=await supaFetch('/question_records?exam_id=eq.'+encodeURIComponent(examId)+'&question_index=eq.'+Number(qIndex)+'&order=duration_ms.asc,updated_at.asc&limit=5');
      if(Array.isArray(rows)){
        questionLbCache.set(key,rows);
        updateMiniLeaderboardDOM(examId,qIndex);
      }
    }catch{}
  }
  async function saveQuestionSpeed(examId,qIndex,nick,durationMs){
    const key=examId+':'+qIndex;
    try{
      const rows=await supaFetch('/rpc/record_question_speed',{method:'POST',body:JSON.stringify({p_exam_id:examId,p_question_index:Number(qIndex),p_nickname:nick,p_duration_ms:Math.round(durationMs)})});
      if(Array.isArray(rows)){
        questionLbCache.set(key,rows);
        updateMiniLeaderboardDOM(examId,qIndex);
      }
    }catch{}
  }
  function formatSpeedMs(ms){return (ms/1000).toFixed(2)+'s';}
  function updateMiniLeaderboardDOM(examId,qIndex){
    const el=$('miniLb');
    if(!el||!session||session.exam.id!==examId||session.exam.questions[session.current]?.index!==qIndex)return;
    const key=examId+':'+qIndex,rows=questionLbCache.get(key),me=nickname();
    const myBadge=lastSpeedResult&&lastSpeedResult.key===key?`<span class="badge done">⚡ ${formatSpeedMs(lastSpeedResult.ms)}</span>`:'';
    const body=rows===undefined?'<p class="small muted" style="margin:6px 0 0">Đang tải top tốc độ…</p>':rows.length?`<div class="mini-lb-list">${rows.map((r,i)=>`<div class="mini-lb-row ${r.nickname===me?'is-me':''}"><span class="mini-lb-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.'}</span><span class="mini-lb-name">${esc(r.nickname)}</span><span class="mini-lb-time">${formatSpeedMs(r.duration_ms)}</span></div>`).join('')}</div>`:'<p class="small muted" style="margin:6px 0 0">Chưa có kỷ lục đúng nào cho câu này.</p>';
    el.innerHTML=`<div class="row space"><h3 style="margin:0">⚡ Top tốc độ · Câu ${qIndex}</h3>${myBadge}</div>${body}`;
  }
  async function checkNicknameExists(nick){
    const clean=nick.trim();
    if(!clean)return {exists:false,exact:null};
    try{
      const rows=await supaFetch('/users?or=(nickname.eq.'+encodeURIComponent(clean)+',nickname.ilike.'+encodeURIComponent(clean)+')&limit=5');
      if(Array.isArray(rows)&&rows.length){
        const exact=rows.find(r=>r.nickname.toLowerCase()===clean.toLowerCase())||rows[0];
        return {exists:true,user:exact};
      }
      return {exists:false,user:null};
    }catch{return {exists:false,user:null,offline:true};}
  }
  function promptNickname(isFirstTime=false){
    const chips=leaderboardUsers.slice(0,8).map(u=>`<button type="button" class="chip-nick" data-pick="${esc(u.nickname)}">${esc(u.nickname)} (${u.total_correct} đúng)</button>`).join('');
    openModal(`<span class="eyebrow">TÀI KHOẢN CLOUD</span><h2>${isFirstTime?'Chào mừng đến Studyroom!':'Chọn hoặc đổi Nickname'}</h2><p>Nhập Nickname của bạn để lưu và đồng bộ toàn bộ lịch sử làm bài & bảng xếp hạng lên Supabase Cloud (không cần mật khẩu).</p><label class="form-field">Nickname của bạn<input id="quickNick" maxlength="60" value="${esc(settings.name)}" placeholder="Ví dụ: Reaper hoặc Alibaba"></label><div id="nickStatus" class="nick-status small"></div>${chips?`<div class="nick-chips"><span class="small muted">Chọn nhanh tài khoản đã có:</span><div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${chips}</div></div>`:''}<div class="modal-actions">${isFirstTime?'':'<button id="cancelNick">Đóng</button>'}<button id="saveNick" class="primary">Lưu & Đồng bộ</button></div>`);
    let checkTimer=null,lastChecked={nick:'',exists:false,user:null},pickedExisting=false,confirmOverwrite=false;
    const renderStatus=(msg,cls='')=>{const el=$('nickStatus');if(el){el.className='nick-status small '+cls;el.textContent=msg;}};
    const runCheck=async(val)=>{
      const clean=val.trim();
      if(!clean){renderStatus('');lastChecked={nick:'',exists:false,user:null};return lastChecked;}
      if(settings.name&&clean.toLowerCase()===settings.name.trim().toLowerCase()){renderStatus('✓ Đang sử dụng Nickname này.','ok');lastChecked={nick:clean,exists:false,user:null,isSelf:true};return lastChecked;}
      renderStatus('Đang kiểm tra tên trên hệ thống…','muted');
      const res=await checkNicknameExists(clean);
      if($('quickNick')?.value.trim()!==clean)return res;
      lastChecked={nick:clean,...res};
      if(res.offline)renderStatus('Không kiểm tra được Cloud lúc này (vẫn có thể lưu cục bộ).','muted');
      else if(res.exists)renderStatus(`⚠️ Tên "${res.user.nickname}" đã tồn tại (${res.user.total_attempts||0} lượt · ${res.user.total_correct||0} câu đúng). Nếu không phải bạn, hãy chọn tên khác!`,'warn');
      else renderStatus(`✓ Nickname "${clean}" chưa có ai dùng, có thể tạo mới.`,'ok');
      return lastChecked;
    };
    $('quickNick').oninput=()=>{pickedExisting=false;confirmOverwrite=false;$('saveNick').textContent='Lưu & Đồng bộ';clearTimeout(checkTimer);const val=$('quickNick').value;checkTimer=setTimeout(()=>runCheck(val),300);};
    if($('quickNick').value.trim())runCheck($('quickNick').value);
    modal.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{pickedExisting=true;confirmOverwrite=false;$('quickNick').value=b.dataset.pick;runCheck(b.dataset.pick);});
    if($('cancelNick'))bind('cancelNick',closeModal);
    bind('saveNick',async()=>{
      const nick=$('quickNick').value.trim();
      if(!nick){notify('Vui lòng nhập Nickname (1–60 ký tự).');return;}
      const res=lastChecked.nick===nick?lastChecked:await runCheck(nick);
      if(res.exists&&!res.isSelf&&!pickedExisting&&!confirmOverwrite){
        confirmOverwrite=true;
        $('saveNick').textContent='Đúng là tôi, dùng tên này';
        renderStatus(`⚠️ Tên "${res.user.nickname}" đã tồn tại! Bấm lại nút bên dưới nếu đây là tài khoản của bạn, hoặc nhập tên khác.`,'warn');
        return;
      }
      const finalNick=res.exists&&res.user?res.user.nickname:nick;
      settings={...settings,name:finalNick};
      try{localStorage.setItem('studyroom-nickname',finalNick);}catch{}
      if(!embedded&&db)await put('settings',{...settings,id:'preferences'}).catch(()=>{});
      closeModal();
      notify('Đang đồng bộ dữ liệu cho '+finalNick+'…');
      await syncCloudHistory();
      if(session)renderSession();else if(view==='history')renderHistory();else if(view==='studied')renderStudied();else renderLibrary();
      notify('Đã đồng bộ tài khoản '+finalNick+'!');
    });
  }
  const safeName=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,100)||'Bo de';
  function applyTheme(theme){const next=theme==='dark'?'dark':'light';settings.theme=next;document.documentElement.dataset.theme=next;try{localStorage.setItem('studyroom-theme',next);}catch{}}
  applyTheme((()=>{try{return localStorage.getItem('studyroom-theme');}catch{return null;}})()||'light');
  async function toggleTheme(){applyTheme(settings.theme==='dark'?'light':'dark');if(!embedded)await put('settings',{...settings,id:'preferences'}).catch(()=>{});if(session)renderSession();else if(view==='history')renderHistory();else if(view==='studied')renderStudied();else renderLibrary();}
  function getComboOverlay(){let el=$('comboOverlay');if(!el){el=document.createElement('div');el.id='comboOverlay';el.className='combo-overlay';el.setAttribute('aria-live','polite');document.body.appendChild(el);}return el;}
  function showComboAnimation(streak){
    if(streak<2)return;
    const overlay=getComboOverlay();
    let title='',subtitle='',cls='combo-fire';
    if(streak===2){title='🔥 COMBO x2!';subtitle='Khởi động tốt!';}
    else if(streak===3){title='🔥 COMBO x3!';subtitle='Đang vào guồng!';}
    else if(streak===4){title='⚡ COMBO x4!';subtitle='Tập trung cao độ!';cls='combo-electric';}
    else if(streak===5){title='⚡ SIÊU COMBO x5!';subtitle='Bốc hỏa tư duy lý luận!';cls='combo-super';}
    else if(streak<10){title=`⚡ RỰC RỠ x${streak}!`;subtitle='Không thể cản phá!';cls='combo-hyper';}
    else if(streak<15){title=`💥 THẦN TRIẾT x${streak}!`;subtitle='Trí nhớ siêu phàm!';cls='combo-god';}
    else{title=`👑 VÔ ĐỊCH x${streak}!`;subtitle='Mác & Lênin cũng phải nể!';cls='combo-legend';}
    overlay.innerHTML=`<div class="combo-bubble ${cls}"><span class="combo-title">${title}</span><span class="combo-sub">${subtitle}</span></div>`;
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    clearTimeout(comboTimer);
    comboTimer=setTimeout(()=>overlay.classList.remove('active'),1400);
  }
  function showStreakLostAnimation(streak){
    if(streak<2)return;
    const overlay=getComboOverlay();
    overlay.innerHTML=`<div class="combo-bubble combo-lost"><span class="combo-title">💔 Đứt chuỗi x${streak}!</span><span class="combo-sub">Cùng phục thù chuỗi mới nào!</span></div>`;
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    clearTimeout(comboTimer);
    comboTimer=setTimeout(()=>overlay.classList.remove('active'),1200);
  }
  function playTing(streak=1){
    if(settings.sound===false)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!audioCtx)audioCtx=new AC();
      if(audioCtx.state==='suspended')audioCtx.resume();
      const steps=[0,2,4,7,9,12,14,16,19,21,24];
      const sIdx=Math.min(steps.length-1,Math.max(0,(streak||1)-1));
      const ratio=Math.pow(2,steps[sIdx]/12);
      const t=audioCtx.currentTime+0.005,master=audioCtx.createGain();
      master.gain.setValueAtTime(0.65,t);
      master.connect(audioCtx.destination);
      const tone=(freq,decay,gainVal,attack,delay=0)=>{
        const osc=audioCtx.createOscillator(),g=audioCtx.createGain();
        osc.type='sine';
        osc.frequency.setValueAtTime(freq,t+delay);
        g.gain.setValueAtTime(0.0001,t+delay);
        g.gain.linearRampToValueAtTime(gainVal,t+delay+attack);
        g.gain.exponentialRampToValueAtTime(0.0001,t+delay+decay);
        osc.connect(g).connect(master);
        osc.start(t+delay);
        osc.stop(t+delay+decay+0.04);
      };
      const baseF=1046.5*ratio;
      tone(baseF,0.44,0.45,0.006);
      tone(baseF*2,0.198,0.45*0.24,0.004);
      tone(baseF*3,0.07,0.45*0.08,0.002);
      if(streak>=3)tone(baseF*1.5,0.25,0.14,0.008,0.02);
      if(streak>=5)tone(baseF*2,0.32,0.22,0.005,0.07);
      if(streak>=10)tone(baseF*2.5,0.38,0.18,0.004,0.14);
    }catch{}
  }
  async function toggleSound(){settings.sound=settings.sound===false;if(!embedded)await put('settings',{...settings,id:'preferences'}).catch(()=>{});else try{localStorage.setItem('studyroom-portable-sound',settings.sound?'1':'0');}catch{}renderSession();notify(settings.sound?'Đã bật tiếng ting khi trả lời đúng.':'Đã tắt âm thanh.');}
  function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5000);}
  function openModal(html){modal.innerHTML=html;if(!modal.open)modal.showModal();}
  function closeModal(){modal.close();}
  function bind(id,fn){const el=$(id);if(el)el.onclick=fn;}
  function requestPromise(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function openDB(){
    const database=await new Promise((resolve,reject)=>{const r=indexedDB.open('studyroom-library',1);r.onupgradeneeded=()=>{for(const name of ['exams','assets','history','settings','handles','sessions'])r.result.createObjectStore(name,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    database.onclose=()=>{if(db===database)db=null;};
    database.onversionchange=()=>{database.close();if(db===database)db=null;};
    db=database;
    return database;
  }
  async function ensureDB(){return db||openDB();}
  async function withDB(fn){
    let database=await ensureDB();
    try{return await fn(database);}
    catch(e){
      if(e?.name==='InvalidStateError'||String(e?.message||'').includes('closing')){
        db=null;database=await openDB();return await fn(database);
      }
      throw e;
    }
  }
  async function get(store,key){return withDB(database=>requestPromise(database.transaction(store).objectStore(store).get(key)));}
  async function all(store){return withDB(database=>requestPromise(database.transaction(store).objectStore(store).getAll()));}
  async function transaction(stores,fn){return withDB(database=>new Promise((resolve,reject)=>{const tx=database.transaction(stores,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Không lưu được dữ liệu'));try{fn(tx);}catch(e){tx.abort();reject(e);}}));}
  async function put(store,value){await transaction([store],tx=>tx.objectStore(store).put(value));}
  async function initStorage(){await openDB();exams=await all('exams');
    for(const exam of exams){let changed=false;for(const q of exam.questions){if(q.answer)continue;const result=C.recoverAnswer(q);if(result.answer){q.answer=result.answer;q.answerMethod=result.method;q.community.status='community_plurality';if(q.answer.length>1)q.type='multi';for(const a of q.answer)if(!q.options.includes(a))q.options.push(a);changed=true;}}if(changed){exam.unknown=exam.questions.filter(q=>!q.answer).length;await put('exams',exam);}}
    history=await all('history');sessions=await all('sessions');const saved=await get('settings','preferences');if(saved){settings={...settings,...saved};if(saved.theme)applyTheme(saved.theme);}if(!settings.name){try{const savedNick=localStorage.getItem('studyroom-nickname');if(savedNick)settings.name=savedNick;}catch{}}const allHandles=await all('handles');for(const h of allHandles)if(h?.handle){rootHandles.set(h.id,h);if(h.id==='root'||!rememberedRoot)rememberedRoot=h.handle;}try{await navigator.storage?.persist?.();}catch{}await syncCloudHistory();}
  function elapsed(){if(!session)return 0;return session.elapsedBase+(session.running?Math.floor((Date.now()-session.resumedAt)/1000):0);}
  function time(value){const h=Math.floor(value/3600),m=Math.floor(value/60)%60,s=value%60;return(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
  async function readFileFromRoot(handle,relFolder,relPath){
    const parts=[...(relFolder?relFolder.split('/'):[]),...String(relPath||'').split('/')].filter(Boolean);
    if(!parts.length)return null;
    let cur=handle;
    for(let i=0;i<parts.length-1;i++)cur=await cur.getDirectoryHandle(parts[i]);
    const fh=await cur.getFileHandle(parts[parts.length-1]);
    return fh.getFile();
  }
  async function getPendingRoots(){
    const pending=[];
    for(const item of rootHandles.values()){
      try{if(await item.handle.queryPermission({mode:'read'})!=='granted')pending.push(item);}catch{}
    }
    return pending;
  }
  async function grantAllRoots(){
    let grantedAny=false;
    for(const item of rootHandles.values()){
      try{
        if(await item.handle.queryPermission({mode:'read'})==='granted'){grantedAny=true;continue;}
        if(await item.handle.requestPermission({mode:'read'})==='granted')grantedAny=true;
      }catch{}
    }
    if(grantedAny){urls.clear();if(session)renderSession();else if(view==='library')renderLibrary();}
  }
  async function getImageBlob(exam,path){
    if(!path)return null;
    if(exam?.storageMode==='fs'&&exam.rootId){
      const entry=rootHandles.get(exam.rootId);
      if(entry?.handle){
        try{
          if(await entry.handle.queryPermission({mode:'read'})==='granted'){
            return await readFileFromRoot(entry.handle,exam.relFolder||'',path);
          }
        }catch{}
      }
    }
    const stored=await get('assets',exam.id+':'+path);
    return stored?.blob||null;
  }
  async function imageURL(exam,path){if(!path)return '';const key=exam.id+':'+path;if(urls.has(key))return urls.get(key);if(embedded){const data=embedded.assets[path];if(data){urls.set(key,data);return data;}return '';}
    const blob=await getImageBlob(exam,path);if(!blob)return '';const url=URL.createObjectURL(blob);urls.set(key,url);return url;
  }
  async function mountImage(img,exam,path,token=renderToken,onReady=null){try{const url=await imageURL(exam,path);if(token!==renderToken||!img.isConnected)return;if(url){const done=()=>{if(token===renderToken)onReady?.();};img.onload=done;img.onerror=()=>{img.alt='Không đọc được ảnh. Hãy nhập lại thư mục đề.';done();};img.src=url;if(img.complete)done();}else{img.alt='Thiếu file ảnh — hãy nhập lại thư mục đề';if(token===renderToken)onReady?.();}}catch{img.alt='Không đọc được ảnh';if(token===renderToken)onReady?.();}}
  function clearExamURLs(id){for(const [key,url] of urls)if(key.startsWith(id+':')){if(url.startsWith('blob:'))URL.revokeObjectURL(url);urls.delete(key);}}
  function nickname(){return settings.name||'Người học';}
  function isStartedSession(s){return Boolean(s&&!s.submitted&&(Object.keys(s.answers||{}).length>0||Object.keys(s.checked||{}).length>0));}
  function modeLabel(mode){return mode==='eos'?'EOS':'Luyện tập';}
  function examStudyInfo(exam){
    const attempts=history.filter(h=>h.examId===exam.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const active=sessions.filter(s=>(s.id===exam.id+':practice'||s.id===exam.id+':eos')&&s.examFingerprint===exam.fingerprint&&isStartedSession(s));
    const modes=[...new Set([...attempts.map(a=>a.mode),...active.map(s=>s.mode)])];
    const lastAt=Math.max(0,...attempts.map(a=>a.createdAt||0),...active.map(s=>s.updatedAt||0));
    const status=attempts.length?'done':active.length?'progress':'new';
    const best=attempts.reduce((m,a)=>a.score!==null&&a.score!==undefined&&a.score>m?a.score:m,-1);
    return {attempts,active,modes,lastAt,status,last:attempts[0]||null,best:best>=0?best:null};
  }
  function shell(content){const isDark=settings.theme==='dark';const cloudBadge=cloudSyncStatus==='synced'?'<span class="badge cloud-ok" title="Đã kết nối Supabase Cloud">● Cloud DB</span>':cloudSyncStatus==='syncing'?'<span class="badge">↻ Đang đồng bộ</span>':'<span class="badge" title="Chưa đồng bộ được Cloud">● Offline</span>';return `<div class="shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">${icon('book')}</span>studyroom<span class="small muted">.</span></div><nav><button class="nav-btn ${view==='library'?'active':''}" id="navLibrary">${icon('grid')}Thư viện đề thi</button><button class="nav-btn ${view==='studied'?'active':''}" id="navStudied">${icon('history')}Lịch sử đã học</button><button class="nav-btn ${view==='history'?'active':''}" id="navHistory">${icon('chart')}Kết quả & xếp hạng</button><button class="nav-btn" id="navSettings">${icon('settings')}Cài đặt</button></nav><div class="sidebar-footer"><strong>Không gian học của bạn</strong><br>Đề thi lưu cục bộ, điểm & BXH đồng bộ Cloud.<br><span class="muted">Studyroom · v1.2</span></div></aside><main class="main"><header class="topbar"><span class="crumb">Thư viện${subject?' / '+esc(subject):view==='studied'?' / Lịch sử đã học':view==='history'?' / Kết quả & xếp hạng':''}</span><div class="profile"><button id="toggleTheme" class="ghost sound-btn" type="button" title="${isDark?'Chuyển giao diện sáng':'Chuyển giao diện tối'}" aria-label="Đổi giao diện sáng tối">${icon(isDark?'sun':'moon')}<span>${isDark?'Sáng':'Tối'}</span></button>${cloudBadge}<button id="profileBtn" class="profile-btn" type="button" title="Đổi Nickname"><span class="avatar">${esc(nickname()[0].toUpperCase())}</span><span class="name">${esc(nickname())}</span></button></div></header><div class="content">${content}</div></main></div>`;}
  function bindShell(){bind('toggleTheme',toggleTheme);bind('profileBtn',()=>promptNickname(false));bind('navLibrary',()=>{view='library';subject=null;search='';libraryStatus='all';renderLibrary();});bind('navStudied',()=>{view='studied';subject=null;studiedFilter={status:'studied',subject:'',search:''};renderStudied();});bind('navHistory',()=>{view='history';subject=null;renderHistory();});bind('navSettings',showSettings);bind('addExams',showImport);bind('rescan',scanAgain);}
  function statsHtml(list){const count=list.reduce((n,e)=>n+e.questions.length,0),studiedCount=list.filter(e=>examStudyInfo(e).status!=='new').length;return `<div class="stats"><div class="stat"><span class="stat-icon">${icon('book')}</span><div><strong>${list.length}</strong><small>Bộ đề trong thư viện</small></div></div><div class="stat"><span class="stat-icon">${icon('grid')}</span><div><strong>${count.toLocaleString('vi-VN')}</strong><small>Câu hỏi sẵn sàng</small></div></div><button class="stat stat-clickable" id="openStudiedStat" type="button"><span class="stat-icon">${icon('history')}</span><div><strong>${studiedCount} / ${list.length}</strong><small>${subject?'Đề đã học trong môn':'Bộ đề đã từng học'}</small></div></button></div>`;}
  function renderLibrary(){renderToken++;const token=renderToken;view='library';
    const list=subject?exams.filter(e=>e.subject===subject):exams;
    const heading=`<div class="page-heading"><div>${subject?'<button class="back" id="backSubjects">'+icon('back')+'Tất cả môn học</button>':'<span class="eyebrow">YOUR LEARNING SPACE</span>'}<h1>${subject?esc(subject):'Hôm nay, học gì nào?'}</h1><p>${subject?'Các bộ đề được sắp xếp theo năm. Chọn đề và bắt đầu theo cách của bạn.':'Tất cả môn học và bộ đề của bạn, trong một không gian gọn gàng.'}</p></div><button class="primary btn-icon" id="addExams">${icon('plus')}Thêm đề</button></div>`;
    const hero=subject?'':`<div class="hero"><div><span class="eyebrow">MỖI NGÀY MỘT CHÚT TIẾN BỘ</span><h2>Ôn chắc từng câu.<br>Tự tin bước vào phòng thi.</h2><p>Chọn luyện tập để hiểu từng đáp án, hoặc thử sức với một bài thi EOS hoàn chỉnh.</p></div><div class="hero-art"><div class="paper"><div class="paper-check">✓</div><div class="paper-line"></div><div class="paper-line" style="width:75%"></div><div class="paper-line" style="width:90%"></div></div></div></div>`;
    const filtered=list.filter(e=>(!search||(e.title+' '+e.subject+' '+e.year).toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&(!subject||libraryStatus==='all'||examStudyInfo(e).status===libraryStatus));
    let body='';
    if(subject){for(const [year,items] of C.groups(filtered))body+=`<section><div class="year-heading"><h2>${esc(year)}</h2><span class="badge">${items.length} bộ đề</span><span class="line"></span></div><div class="cards">${items.sort((a,b)=>a.title.localeCompare(b.title,'vi')).map(examCard).join('')}</div></section>`;}
    else{const subjects=[...new Set(filtered.map(e=>e.subject))].sort();body=`<div class="cards">${subjects.map(code=>{const group=filtered.filter(e=>e.subject===code),years=group.map(e=>e.year).filter(Boolean),doneCount=group.filter(e=>examStudyInfo(e).status==='done').length,progCount=group.filter(e=>examStudyInfo(e).status==='progress').length;return `<button class="subject-card" data-subject="${esc(code)}"><span class="subject-code">${icon('book')}</span><h3>${esc(code)}</h3><p>${group.length} bộ đề · ${group.reduce((n,e)=>n+e.questions.length,0)} câu hỏi<br><span class="subject-progress">Đã học ${doneCount}/${group.length} đề${progCount?' · '+progCount+' đang làm':''}</span></p><span class="card-foot"><span>${years.length?Math.min(...years)+(Math.min(...years)!==Math.max(...years)?' — '+Math.max(...years):''):'Chưa rõ năm'}</span>${icon('arrow')}</span></button>`;}).join('')}</div>`;}
    if(!filtered.length)body=`<div class="empty">${icon('folder')}<h3>${exams.length?'Chưa có đề phù hợp':'Thư viện đang chờ bộ đề đầu tiên'}</h3><p>${exams.length?(subject&&libraryStatus!=='all'?'Không có đề nào ở trạng thái đã chọn. Thử đổi bộ lọc trạng thái.':'Thử tìm tên môn hoặc tên đề khác.'):'Chọn một thư mục đề, hoặc thư mục cha chứa nhiều môn. Trang sẽ quét manifest và nhập cả hai chế độ học.'}</p>${exams.length?'':'<button class="primary" id="emptyAdd">'+icon('plus')+' Thêm thư mục đề</button>'}</div>`;
    const statusSelect=subject?'<select id="libraryStatus" aria-label="Lọc trạng thái học"><option value="all">Tất cả trạng thái</option><option value="new">Chưa học</option><option value="progress">Đang làm dở</option><option value="done">Đã học</option></select>':'';
    app.innerHTML=shell(heading+hero+'<div id="permBannerMount"></div>'+statsHtml(list)+`<div class="toolbar"><h3 style="font-size:15px;margin:0">${subject?'Danh sách đề thi':'Môn học của bạn'}</h3><div class="row"><div class="search-wrap">${icon('search')}<input id="search" placeholder="Tìm môn, tên đề, năm…" value="${esc(search)}" aria-label="Tìm môn hoặc đề"></div>${statusSelect}<button id="rescan" class="btn-icon small">${icon('refresh')}Quét lại</button></div></div>`+body);
    bindShell();bind('backSubjects',()=>{subject=null;search='';libraryStatus='all';renderLibrary();});bind('emptyAdd',showImport);bind('openStudiedStat',()=>{studiedFilter={status:'studied',subject:subject||'',search:''};subject=null;renderStudied();});
    getPendingRoots().then(pending=>{if(token!==renderToken||!pending.length)return;const m=$('permBannerMount');if(!m)return;m.innerHTML=`<div class="perm-banner"><div><strong>🔒 Cần xác nhận quyền đọc thư mục đề</strong><p class="small muted" style="margin:2px 0 0">Trình duyệt tạm khóa quyền đọc ổ đĩa (${pending.map(p=>esc(p.name||p.handle?.name||'Thư mục')).join(', ')}) sau khi mở lại trang. Bấm 1 lần để hiển thị lại toàn bộ ảnh.</p></div><button id="grantRootsBtn" class="primary">🔓 Mở quyền đọc thư mục</button></div>`;bind('grantRootsBtn',grantAllRoots);});
    if($('libraryStatus')){$('libraryStatus').value=libraryStatus;$('libraryStatus').onchange=e=>{libraryStatus=e.target.value;renderLibrary();};}
    $('search').oninput=e=>{const pos=e.target.selectionStart;search=e.target.value;renderLibrary();$('search').focus();$('search').setSelectionRange(pos,pos);};
    app.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>{subject=b.dataset.subject;search='';libraryStatus='all';renderLibrary();});
    app.querySelectorAll('[data-exam]').forEach(b=>b.onclick=()=>showExam(b.dataset.exam));
    app.querySelectorAll('img[data-preview]').forEach(img=>{const exam=exams.find(e=>e.id===img.dataset.preview);mountImage(img,exam,exam.questions[0].image,token);});
  }
  function examCard(e){const info=examStudyInfo(e),statusBadge=info.status==='done'?`<span class="badge done">✓ Đã học (${info.attempts.length} lượt)</span>`:info.status==='progress'?'<span class="badge progress">Đang làm dở</span>':'<span class="badge fresh">Chưa học</span>';const modeBadge=info.modes.length?`<span class="badge">${info.modes.map(modeLabel).join(' + ')}</span>`:'<span class="badge good">Luyện tập + EOS</span>';const summaryText=info.status==='done'?'Lần gần nhất: '+(info.last.score===null?'Chưa chấm':info.last.score+'/10')+' ('+modeLabel(info.last.mode)+')'+(info.last.createdAt?' · '+new Date(info.last.createdAt).toLocaleDateString('vi-VN'):'')+(info.active.length?' · Đang làm tiếp':''):info.status==='progress'?'Đang làm dở: '+info.active.map(s=>modeLabel(s.mode)+' '+Object.keys(s.answers||{}).length+'/'+e.questions.length+' câu').join(' · '):'Chưa có lượt học nào';const btnText=info.status==='progress'?'Tiếp tục học':info.status==='done'?'Xem / học lại':'Mở bộ đề';return `<article class="exam-card ${info.status==='done'?'studied':info.status==='progress'?'in-progress':''}"><div class="thumb"><img data-preview="${esc(e.id)}" alt="Xem trước ${esc(e.questions[0].label)}" loading="lazy"><span class="badge">${e.questions.length} câu</span></div><div class="exam-body"><div class="row">${statusBadge}${modeBadge}${e.unknown?'<span class="badge warning">'+e.unknown+' câu chưa rõ</span>':''}</div><h3>${esc(e.title)}</h3><p>${e.missing?'Thiếu '+e.missing+' ảnh · ':''}${summaryText}</p><div class="exam-actions"><button class="primary" data-exam="${esc(e.id)}">${btnText} ${icon('arrow')}</button></div></div></article>`;}
  function showImport(){if(importing)return;openModal(`<span class="eyebrow">THÊM VÀO THƯ VIỆN</span><h2>Đưa bộ đề của bạn vào đây.</h2><p>Chọn một đề hoặc thư mục cha chứa nhiều đề / nhiều môn (hỗ trợ thêm nhiều thư mục từ bất kỳ ổ nào). Trang tự tìm manifest, bỏ qua đề trùng và cập nhật đề đã thay đổi.</p><div class="file-note">Cần giữ nguyên thư mục ảnh và <strong>manifest.json</strong>. Khi chọn bằng nút chính, ảnh sẽ được đọc trực tiếp từ máy (Zero-Copy) giúp bộ nhớ trình duyệt siêu nhẹ và không bị xóa mất đề.</div><div class="stack" style="margin-top:24px"><button id="pickRoot" class="primary btn-icon">${icon('folder')}Chọn thư mục (Zero-Copy khuyên dùng)</button><button id="pickFallback" class="btn-icon">${icon('plus')}Chọn bằng hộp chọn cổ điển (copy ảnh)</button></div><p class="small" style="margin-top:15px">Chế độ Zero-Copy chỉ lưu thông tin nhẹ và đọc ảnh trực tiếp từ thư mục gốc trên máy bạn.</p><div class="modal-actions"><button id="closeImport">Đóng</button></div>`);bind('pickRoot',pickRoot);bind('pickFallback',()=>{$('folderInput').click();});bind('closeImport',closeModal);}
  async function collect(handle,prefix='',result=[]){for await(const entry of handle.values()){if(entry.kind==='directory'){if(!['.git','node_modules','.venv'].includes(entry.name))await collect(entry,prefix+entry.name+'/',result);}else result.push({path:C.norm(prefix+entry.name),file:await entry.getFile()});}return result;}
  async function pickRoot(){
    if(!window.showDirectoryPicker){$('folderInput').click();return;}
    try{
      const handle=await showDirectoryPicker({mode:'read'});
      let rootId=null;
      for(const [id,item] of rootHandles){try{if(await item.handle.isSameEntry(handle)){rootId=id;break;}}catch{}}
      if(!rootId){rootId='root:'+crypto.randomUUID();const rec={id:rootId,name:handle.name,handle};rootHandles.set(rootId,rec);try{await put('handles',rec);}catch{}}
      rememberedRoot=handle;
      const prefix=handle.name+'/';
      await importFiles(await collect(handle,prefix),rootId,prefix);
    }catch(e){if(e.name!=='AbortError')notify(e.message);}
  }
  async function scanAgain(){
    if(importing)return;
    if(!rootHandles.size&&!rememberedRoot){showImport();return;}
    try{
      const targets=rootHandles.size?[...rootHandles.entries()]:[['root',{id:'root',name:rememberedRoot.name,handle:rememberedRoot}]];
      for(const [id,item] of targets){
        let granted=await item.handle.queryPermission({mode:'read'});
        if(granted!=='granted')granted=await item.handle.requestPermission({mode:'read'});
        if(granted!=='granted')continue;
        const prefix=item.handle.name+'/';
        await importFiles(await collect(item.handle,prefix),id,prefix);
      }
    }catch(e){notify('Không mở lại được thư mục. Chọn lại trong Thêm đề. '+e.message);}
  }
  $('folderInput').onchange=async e=>{const files=[...e.target.files].map(file=>({file,path:C.norm(file.webkitRelativePath||file.name)}));e.target.value='';if(files.length)await importFiles(files,null,'');};
  async function digest(value){const bytes=new TextEncoder().encode(value);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  async function chooseCandidates(candidates){
    const list=[...candidates];const labels=[];
    for(const [folder,entry] of list){let title=folder.split('/').filter(Boolean).pop(),exists=false;try{const data=JSON.parse(await entry.file.text());title=data.title||title;exists=exams.some(e=>data.source&&e.source===data.source||e.title===String(title).replace(/\u00a0/g,' '));}catch{}labels.push({title,folder,exists});}
    openModal('<span class="eyebrow">KẾT QUẢ QUÉT THƯ MỤC</span><h2>Chọn đề muốn thêm</h2><p>Tìm thấy '+list.length+' đề. Tick một hoặc nhiều đề; đề đã có sẽ được kiểm tra thay đổi trước khi cập nhật.</p><div class="row"><button id="pickAllCandidates" class="text-btn">Chọn tất cả</button><button id="clearCandidates" class="text-btn">Bỏ chọn</button></div><div class="candidate-list">'+labels.map((item,i)=>'<label class="check-label candidate"><input type="checkbox" data-candidate="'+i+'" checked><span><strong>'+esc(item.title)+'</strong> '+(item.exists?'<span class="badge">Đã có</span>':'<span class="badge good">Mới</span>')+'<small>'+esc(item.folder)+'</small></span></label>').join('')+'</div><div class="modal-actions"><button id="cancelCandidates">Hủy</button><button id="confirmCandidates" class="primary">Thêm / cập nhật đề đã chọn</button></div>');
    return new Promise(resolve=>{const checks=()=>[...modal.querySelectorAll('[data-candidate]')];bind('pickAllCandidates',()=>checks().forEach(x=>x.checked=true));bind('clearCandidates',()=>checks().forEach(x=>x.checked=false));const cancel=()=>{modal.removeEventListener('cancel',cancel);resolve(null);};modal.addEventListener('cancel',cancel,{once:true});bind('cancelCandidates',()=>{closeModal();cancel();});bind('confirmCandidates',()=>{const selected=checks().filter(x=>x.checked).map(x=>list[Number(x.dataset.candidate)]);if(!selected.length){notify('Chọn ít nhất một đề.');return;}modal.removeEventListener('cancel',cancel);resolve(new Map(selected));});});
  }
  async function importFiles(entries,rootId=null,rootPrefix=''){
    if(importing)return;importing=true;let added=0,updated=0,skipped=0,failed=0;const logs=[];
    openModal('<h2>Đang quét thư mục…</h2><p id="importProgress">Đang tìm manifest và ảnh câu hỏi.</p><progress id="importBar" class="progressbar"></progress><pre id="importLog" class="import-log"></pre>');
    try{
      let candidates=new Map();
      for(const e of entries){const name=e.path.split('/').pop();if(!/^(manifest(?:-\d+)?|quiz_data)\.json$/i.test(name))continue;const folder=e.path.slice(0,-name.length);const rank=name.toLowerCase()==='manifest.json'?3:name.toLowerCase()==='quiz_data.json'?2:1;const old=candidates.get(folder);if(!old||rank>old.rank||rank===old.rank&&e.path>old.path)candidates.set(folder,{...e,rank});}
      if(!candidates.size)throw Error('Không thấy manifest.json hoặc quiz_data.json. Hãy chọn thư mục đề đã xuất, hoặc thư mục cha của nó.');
      candidates=await chooseCandidates(candidates);if(!candidates)return;
      openModal('<h2>Đang thêm đề vào thư viện…</h2><p id="importProgress">Đang chuẩn bị hai chế độ.</p><progress id="importBar" class="progressbar"></progress><pre id="importLog" class="import-log"></pre>');
      $('importBar').max=candidates.size;let done=0;
      for(const [folder,entry] of candidates){
        $('importProgress').textContent=`Đang nhập ${++done}/${candidates.size}: ${folder}`;$('importBar').value=done;
        try{
          const text=await entry.file.text(),data=JSON.parse(text),files=new Map(entries.filter(x=>x.path.startsWith(folder)).map(x=>[x.path.slice(folder.length),x.file]));
          const exam=C.normalizeManifest(data,{folder:folder.replace(/\/$/,''),files});exam.id=await digest(C.identity(exam,folder.replace(/\/$/,'')));
          const needed=[...new Set(exam.questions.flatMap(q=>[q.image,q.full].filter(Boolean)))];
          exam.fingerprint=await digest('normalizer-v3\n'+text+'\n'+needed.map(path=>path+':'+files.get(path).size+':'+files.get(path).lastModified).join('\n'));
          const old=await get('exams',exam.id);
          const targetMode=rootId?'fs':'idb';
          const relFolder=rootId?(folder.startsWith(rootPrefix)?folder.slice(rootPrefix.length):folder).replace(/\/$/,''):'';
          if(old?.fingerprint===exam.fingerprint&&old?.storageMode===targetMode&&(!rootId||(old?.rootId===rootId&&old?.relFolder===relFolder))){skipped++;logs.push('Đã có · '+exam.title);continue;}
          // Keep an explicit correction when the corresponding image is unchanged.
          for(const previous of old?.questions||[]){if(previous.answerMethod!=='manual')continue;const q=exam.questions.find(q=>q.index===previous.index&&q.image===previous.image);if(!q)continue;const prevStat=old?.imageStats?.[q.image];const original=!prevStat?await get('assets',exam.id+':'+q.image):null;const file=files.get(q.image);const same=prevStat?(prevStat.size===file.size&&prevStat.lastModified===file.lastModified):(original?.blob.size===file.size&&original.blob.lastModified===file.lastModified);if(same){q.answer=previous.answer;q.answerMethod='manual';q.manualConfirmedAt=previous.manualConfirmedAt;q.community={...q.community,status:q.answer?'manual':'unknown',verified:false};q.type=previous.type;q.options=[...new Set([...q.options,...(q.answer||[])])];}}
          exam.unknown=exam.questions.filter(q=>!q.answer).length;
          exam.importedAt=Date.now();
          exam.storageMode=targetMode;
          if(rootId){
            exam.rootId=rootId;
            exam.relFolder=relFolder;
            exam.assetKeys=[];
            exam.imageStats=Object.fromEntries(needed.map(p=>[p,{size:files.get(p).size,lastModified:files.get(p).lastModified}]));
            await transaction(['exams','assets'],tx=>{const assets=tx.objectStore('assets');for(const key of old?.assetKeys||[])assets.delete(key);tx.objectStore('exams').put(exam);});
          }else{
            const assetKeys=needed.map(path=>exam.id+':'+path);exam.assetKeys=assetKeys;
            await transaction(['exams','assets'],tx=>{const assets=tx.objectStore('assets');for(const key of old?.assetKeys||[])assets.delete(key);for(const path of needed)assets.put({id:exam.id+':'+path,blob:files.get(path)});tx.objectStore('exams').put(exam);});
          }
          clearExamURLs(exam.id);if(old)updated++;else added++;
          logs.push((old?'Cập nhật':'Đã thêm')+(rootId?' (Zero-Copy)':'')+' · '+exam.title+` · ${exam.questions.length} câu`+(exam.unknown?` · ${exam.unknown} chưa rõ đáp án`:'')+(exam.missing?` · thiếu ${exam.missing} ảnh`:''));
        }catch(e){failed++;logs.push('Lỗi · '+folder+' · '+(e.name==='QuotaExceededError'?'Bộ nhớ trình duyệt đã đầy. Giải phóng dung lượng rồi quét lại.':e.message));}
        finally{$('importLog').textContent=logs.join('\n');await new Promise(r=>setTimeout(r,0));}
      }
      exams=await all('exams');try{await navigator.storage?.persist?.();}catch{}
      $('importProgress').textContent='Đã chuẩn bị cả chế độ Luyện tập và EOS.';
      const actions=document.createElement('div');actions.className='modal-actions';actions.innerHTML='<button class="primary" id="finishImport">Về thư viện</button>';modal.append(actions);const summary=document.createElement('p');summary.className='import-summary';summary.textContent=`${added} đề mới · ${updated} cập nhật · ${skipped} đã có · ${failed} lỗi`;actions.before(summary);bind('finishImport',()=>{closeModal();renderLibrary();});
    }catch(e){modal.innerHTML='<h2>Chưa nhập được thư mục</h2><p>'+esc(e.message)+'</p><div class="modal-actions"><button id="closeImportError">Đóng</button></div>';bind('closeImportError',closeModal);}finally{importing=false;}
  }
  function showExam(id){const e=exams.find(e=>e.id===id);if(!e)return;openModal(`<span class="eyebrow">${esc(e.subject)} · ${e.year||'CHƯA RÕ NĂM'}</span><h2 style="font-size:21px;line-height:1.5">${esc(e.title)}</h2><p>${e.questions.length} câu có ảnh · ${e.unknown} câu chưa rõ đáp án${e.missing?' · '+e.missing+' ảnh còn thiếu':''}</p><div class="mode-cards"><button class="mode-card" id="practiceMode">${icon('play')}<strong>Luyện tập</strong><small>Kiểm tra từng câu. Đúng tự chuyển, sai xem giải thích và bình luận.</small></button><button class="mode-card" id="eosMode">${icon('clock')}<strong>Thi thử EOS</strong><small>Làm toàn bộ bài, nộp và chấm điểm. Xem lại các câu làm sai.</small></button></div><p class="small">Điểm tính trên câu có đáp án. Đáp án cộng đồng được giữ nguyên nguồn; câu hòa hoặc thiếu dữ liệu không tự chấm.</p><div class="row space"><button id="exportPair" class="btn-icon small">${icon('download')}Xuất cả hai trang HTML</button><button id="exportDownload" class="text-btn">Tải HTML trực tiếp</button><button class="text-btn danger" id="removeExam">Xóa khỏi thư viện</button></div><div class="modal-actions"><button id="closeExam">Đóng</button></div>`);
    bind('practiceMode',()=>startSession(e,'practice'));bind('eosMode',()=>startSession(e,'eos'));bind('closeExam',closeModal);bind('exportPair',()=>exportExam(e));bind('exportDownload',()=>exportExam(e,true));bind('removeExam',()=>removeExam(e));
  }
  async function removeExam(e){if(!confirm('Xóa '+e.title+' khỏi bộ nhớ trình duyệt? Thư mục gốc vẫn giữ nguyên.'))return;await transaction(['exams','assets','sessions'],tx=>{tx.objectStore('exams').delete(e.id);for(const key of e.assetKeys||[])tx.objectStore('assets').delete(key);tx.objectStore('sessions').delete(e.id+':practice');tx.objectStore('sessions').delete(e.id+':eos');});clearExamURLs(e.id);exams=exams.filter(x=>x.id!==e.id);sessions=sessions.filter(x=>x.id!==e.id+':practice'&&x.id!==e.id+':eos');closeModal();if(view==='studied')renderStudied();else renderLibrary();}
  function sessionKey(){return session.exam.id+':'+session.mode;}
  async function saveSession(){if(!session||embedded||!db)return;const saved={...session,exam:undefined,id:sessionKey(),examFingerprint:session.exam.fingerprint,elapsedBase:elapsed(),resumedAt:0,running:false,updatedAt:Date.now()};const idx=sessions.findIndex(x=>x.id===saved.id);if(idx>=0)sessions[idx]=saved;else sessions.push(saved);await put('sessions',saved);}
  async function startSession(exam,mode,fresh=false){
    if(exam?.storageMode==='fs'&&exam.rootId){const item=rootHandles.get(exam.rootId);if(item?.handle){try{if(await item.handle.queryPermission({mode:'read'})!=='granted')await item.handle.requestPermission({mode:'read'});}catch{}}}
    const saved=!fresh&&!embedded?await get('sessions',exam.id+':'+mode):null;
    if(saved&&saved.examFingerprint===exam.fingerprint&&!saved.submitted&&(Object.keys(saved.answers).length||saved.elapsedBase)){
      openModal(`<h2>Tiếp tục lượt đang học?</h2><p>${esc(exam.title)} · ${mode==='eos'?'EOS':'Luyện tập'}<br>Đã chọn ${Object.keys(saved.answers).length}/${exam.questions.length} câu · ${time(saved.elapsedBase)}</p><div class="modal-actions"><button id="restartSaved">Làm lượt mới</button><button class="primary" id="resumeSaved">Tiếp tục</button></div>`);bind('restartSaved',()=>launch(null));bind('resumeSaved',()=>launch(saved));
    }else launch(null);
    function launch(previous){closeModal();clearTimeout(autoTimer);clearInterval(timer);questionTimerKey=null;questionReadyAt=null;navLockUntil=0;lastSpeedResult=null;session=previous?{...previous,exam,resumedAt:Date.now(),running:true,filter:'all',streak:previous.streak||0,maxStreak:previous.maxStreak||0}:{exam,mode,answers:{},checked:{},current:0,filter:'all',submitted:false,elapsedBase:0,resumedAt:Date.now(),running:true,recorded:false,zoom:false,streak:0,maxStreak:0};renderSession();timer=setInterval(()=>{if($('clock'))$('clock').textContent=time(elapsed());},1000);}
  }
  function indices(){if(!session)return [];return session.exam.questions.flatMap((q,i)=>{if(session.filter==='all')return [i];const checked=session.submitted||session.checked[q.index];if(session.filter==='wrong')return checked&&C.grade(q,session.answers[q.index])==='wrong'?[i]:[];if(session.filter==='unknown')return !q.answer?[i]:[];return !(session.answers[q.index]?.length)?[i]:[];});}
  function feedbackVisible(q){return session.submitted||session.mode==='practice'&&session.checked[q.index];}
  function renderSession(){
    renderToken++;const token=renderToken,s=session,e=s.exam,q=e.questions[s.current],isReview=feedbackVisible(q),summary=C.summarize(e.questions,s.answers,s.mode==='practice'?s.checked:null),answered=Object.values(s.answers).filter(a=>a.length).length;
    const score=s.submitted?`<div class="result-banner"><div><h2>${s.mode==='eos'?'Kết quả thi EOS':'Kết quả luyện tập'}</h2><span>Đúng ${summary.correct}/${summary.graded} câu có đáp án</span><p>${summary.wrong} sai · ${summary.unknown} chưa rõ đáp án · ${time(elapsed())}</p></div><strong>${summary.score===null?'—':summary.score}<small style="font-size:15px"> / 10</small></strong></div>`:'';
    const status=!isReview?'':C.grade(q,s.answers[q.index]);
    const isMulti=q.type==='multi',requiredCount=isMulti&&q.answer?.length>1?q.answer.length:null,selectedCount=(s.answers[q.index]||[]).length,multiLabel=requiredCount?'Chọn '+requiredCount+' đáp án':'Chọn nhiều đáp án';
    const multiBanner=isMulti?`<div class="multi-callout ${requiredCount&&selectedCount===requiredCount?'ready':''}"><strong>${multiLabel.toUpperCase()}</strong><span>${requiredCount?`Đã chọn ${selectedCount}/${requiredCount}`:`Đã chọn ${selectedCount}`}</span></div>`:'<span class="eyebrow">MỘT LỰA CHỌN</span>';
    const opts=q.options.map((letter,i)=>{const selected=s.answers[q.index]?.includes(letter);return `<button class="option ${isMulti?'multi':''} ${selected?'selected':''} ${isReview&&q.answer?.includes(letter)?'correct':isReview&&selected&&status==='wrong'?'wrong':''}" data-option="${letter}" ${isReview?'disabled':''}>${isMulti?`<span class="multi-box" aria-hidden="true">${selected?'✓':''}</span>`:''}<span class="letter">${letter}</span><span>Đáp án ${letter}</span><span class="key">${i+1}</span></button>`;}).join('');
    const unknownControls=!q.answer&&!isReview?'<p class="small muted">Chưa có đáp án trong dữ liệu. Bạn vẫn làm được câu này; kết quả sẽ được ghi là chưa chấm.</p>':'';
    const feedback=isReview?feedbackHTML(q,status):'';
    const isDark=settings.theme==='dark';
    const themeBtn=`<button id="toggleTheme" class="ghost sound-btn" type="button" title="${isDark?'Chuyển giao diện sáng':'Chuyển giao diện tối'}" aria-label="Đổi giao diện sáng tối">${icon(isDark?'sun':'moon')}</button>`;
    const soundBtn=s.mode==='practice'?`<button id="toggleSound" class="ghost sound-btn ${settings.sound===false?'muted':''}" title="${settings.sound!==false?'Tắt tiếng ting':'Bật tiếng ting'}" aria-label="Bật tắt âm thanh">${icon(settings.sound!==false?'volume':'volumeOff')}</button>`:'';
    const streakCount=s.streak||0;
    const streakClass=streakCount>=10?'streak-god':streakCount>=5?'streak-super':streakCount>=3?'streak-fire':streakCount>0?'streak-active':'streak-idle';
    const streakBadge=s.mode==='practice'?`<div class="streak-pill ${streakClass}" title="Chuỗi trả lời đúng liên tiếp: ${streakCount} câu (Kỷ lục: ${s.maxStreak||0})">${icon('fire')}<span class="streak-num">${streakCount}</span><small>streak</small></div>`:'';
    const kbdHints=s.mode==='practice'?'<kbd>A–F</kbd> / <kbd>1–6</kbd> chọn<br><kbd>Enter</kbd> / <kbd>→</kbd> kiểm tra & tiếp · <kbd>←</kbd> câu trước<br><kbd>R</kbd> làm lại câu':'<kbd>A–F</kbd> / <kbd>1–6</kbd> chọn<br><kbd>←</kbd> <kbd>→</kbd> chuyển câu · <kbd>R</kbd> làm lại câu';
    const miniLbHtml=s.mode==='practice'?'<div id="miniLb" class="side-panel mini-lb"></div>':'';
    app.innerHTML=`<div class="session-page"><header class="session-header"><div class="row"><button id="exitSession" class="btn-icon ghost">${icon('back')}Thư viện</button><div class="session-title"><h1>${esc(e.title)}</h1><p>${s.mode==='eos'?'THI THỬ EOS':'LUYỆN TẬP'} · ${e.questions.length} CÂU · ${esc(nickname())}</p></div></div><div class="row">${streakBadge}${themeBtn}${soundBtn}<span id="clock" class="clock">${time(elapsed())}</span><button id="restart" class="btn-icon">${icon('refresh')}Làm lại</button><button id="submit" class="primary">${s.submitted?'Bảng điểm':'Nộp bài'}</button></div></header><div class="session-layout"><aside class="session-side"><div class="side-panel ${isMulti?'is-multi':''}">${multiBanner}<h3 style="margin-top:12px">Chọn đáp án của bạn</h3><div class="options">${opts}</div>${unknownControls}${s.mode==='practice'&&!s.submitted?'<button id="editAnswer" class="text-btn" style="margin-top:12px">Xác nhận / sửa đáp án</button>':''}<div class="row" style="margin-top:16px"><button id="questionType" class="text-btn">${isMulti?'Đổi sang chọn một':'Đổi sang chọn nhiều'}</button><select id="optionCount" aria-label="Số phương án" style="font-size:11px;padding:5px" ${isReview?'disabled':''}>${[4,5,6].map(n=>`<option value="${n}" ${q.options.length===n?'selected':''}>${n} phương án</option>`).join('')}</select></div>${s.mode==='practice'?'<button id="checkAnswer" class="primary" style="width:100%;margin-top:15px" '+(s.submitted?'disabled':'')+'>'+(isReview?'Câu tiếp theo →':'Kiểm tra · Enter / →')+'</button>':''}<p class="kbd-hints">${kbdHints}</p></div><div class="side-panel"><div class="row space"><h3>Điều hướng câu hỏi</h3><span class="badge">${answered}/${e.questions.length}</span></div><select id="questionFilter" class="session-filter" aria-label="Lọc câu hỏi"><option value="all">Tất cả câu hỏi</option><option value="wrong">Câu làm sai</option><option value="unanswered">Chưa trả lời</option><option value="unknown">Chưa rõ đáp án</option></select><div class="nav-grid">${e.questions.map((n,i)=>{const reveal=feedbackVisible(n),st=reveal?C.grade(n,s.answers[n.index]):s.answers[n.index]?.length?'answered':'';return `<button data-jump="${i}" class="${i===s.current?'current':''} ${st} ${n.type==='multi'?'multi':''}" aria-label="Câu ${n.index}${n.type==='multi'?' (chọn nhiều đáp án)':''}" ${n.type==='multi'?'title="Câu chọn nhiều đáp án"':''}>${n.index}</button>`;}).join('')}</div><p class="session-summary" style="margin-top:16px;margin-bottom:0">${s.mode==='practice'?`Đúng ${summary.correct} · Sai ${summary.wrong}<br>Đã kiểm tra ${Object.keys(s.checked).length}/${e.questions.length}${s.streak>=2?`<br><span class="streak-inline">${icon('fire')} Đang đúng ${s.streak} câu liên tiếp!</span>`:''}`:`Đã chọn ${answered} · Còn ${e.questions.length-answered}`}<br>${e.unknown} câu chưa có đáp án chấm</p>${miniLbHtml}</div></aside><main class="session-main">${score}<section class="question-panel"><div class="question-bar"><div class="row"><strong>${q.label}</strong><span class="muted small">Câu ${s.current+1} / ${e.questions.length}</span>${isMulti?`<span class="badge multi-badge">${esc(multiLabel)}</span>`:''}${!q.answer?'<span class="badge warning">Chưa rõ đáp án</span>':''}</div><button id="zoomQuestion" class="image-open">${s.zoom?'Thu vừa khung':'Phóng ảnh 150%'}</button></div><div class="question-image ${s.zoom?'zoom':''}"><img id="questionImage" alt="Ảnh câu hỏi ${q.index}"></div></section><div class="session-footer"><button id="previous" class="btn-icon">${icon('back')}Câu trước</button><span class="small muted">${s.mode==='eos'&&!s.submitted?'Đáp án được mở sau khi nộp bài.':s.mode==='practice'&&!s.submitted?'Kiểm tra xong mới sang câu tiếp theo.':'Dữ liệu đáp án theo manifest của bộ đề.'}</span><button id="next" class="btn-icon">${s.mode==='practice'&&!s.submitted&&!isReview?'Kiểm tra & tiếp':'Câu tiếp'}${icon('arrow')}</button></div>${feedback}</main></div></div>`;
    const leftPanel=app.querySelector('.session-side'),navigation=leftPanel.lastElementChild;navigation.classList.add('session-navigation');app.querySelector('.session-layout').append(navigation);
    $('questionFilter').value=s.filter;
    const curKey=e.id+':'+q.index;
    const shouldTime=s.mode==='practice'&&!s.submitted&&!isReview;
    if(shouldTime&&questionTimerKey!==curKey){questionTimerKey=curKey;questionReadyAt=null;lastSpeedResult=null;}
    else if(!shouldTime&&questionTimerKey===curKey&&isReview){questionReadyAt=null;}
    mountImage($('questionImage'),e,q.image,token,()=>{
      if(!shouldTime||token!==renderToken)return;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(token===renderToken&&session&&!session.submitted&&!feedbackVisible(q)&&questionTimerKey===curKey&&questionReadyAt===null){
          questionReadyAt=performance.now();
        }
      }));
    });
    if($('fullReviewImage'))mountImage($('fullReviewImage'),e,q.full,token);
    if(s.mode==='practice'){updateMiniLeaderboardDOM(e.id,q.index);fetchQuestionLeaderboard(e.id,q.index);}
    app.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>choose(b.dataset.option));app.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.jump)));
    bind('toggleTheme',toggleTheme);bind('toggleSound',toggleSound);bind('editAnswer',editAnswer);bind('exitSession',exitSession);bind('previous',()=>navigate(-1));bind('next',()=>{if(s.mode==='practice'&&!s.submitted)checkAnswer();else navigate(1);});bind('checkAnswer',checkAnswer);bind('zoomQuestion',()=>{s.zoom=!s.zoom;renderSession();});bind('submit',()=>s.submitted?showResult():confirmSubmit());bind('restart',()=>{if(confirm('Bắt đầu lượt mới cho bộ đề này?')){session.running=false;startSession(e,s.mode,true);}});bind('resetQuestion',resetQuestion);
    bind('questionType',()=>{if(isReview)return;q.type=q.type==='multi'?'single':'multi';s.answers[q.index]=[];renderSession();saveSession().catch(()=>{});});
    $('optionCount').onchange=evt=>{const n=Number(evt.target.value);if(q.answer?.some(x=>x.charCodeAt(0)-65>=n)){notify('Không thể bỏ phương án có trong đáp án của manifest.');renderSession();return;}q.options=Array.from({length:n},(_,i)=>String.fromCharCode(65+i));s.answers[q.index]=(s.answers[q.index]||[]).filter(x=>q.options.includes(x));renderSession();};
    $('questionFilter').onchange=evt=>{s.filter=evt.target.value;const list=indices();if(!list.length){notify('Không có câu nào trong bộ lọc này.');s.filter='all';}else s.current=list[0];renderSession();saveSession().catch(()=>{});};
    if($('toggleDiscussion'))$('toggleDiscussion').onclick=()=>{$('discussion').hidden=!$('discussion').hidden;};
  }
  function feedbackHTML(q,status){const label=status==='correct'?'Chính xác. Tiếp tục nào!':status==='wrong'?'Chưa đúng — cùng xem lại.':'Câu này chưa có đáp án để chấm.';const answer=q.answer?q.answer.join(', '):'Chưa xác định';const counts=Object.entries(q.community.counts).map(([k,v])=>k+': '+v).join(' · ');return `<section class="answer-feedback ${status}"><div class="row space"><h3>${label}</h3>${!session.submitted?'<button id="resetQuestion" class="text-btn">Làm lại câu · R</button>':''}</div><p>${q.answer?'Đáp án trong dữ liệu: <strong>'+answer+'</strong>. ':''}${q.community.verified?'Đã đánh dấu xác minh trong dữ liệu.':q.answerMethod==='manual'?'Đáp án do bạn xác nhận trong thư viện.':'Tham khảo từ dữ liệu cộng đồng; chưa được xác minh.'}</p>${counts?'<p class="muted">Số người chọn: '+esc(counts)+'</p>':''}${q.explanation?'<p style="margin-top:10px">'+esc(q.explanation)+'</p>':''}<button id="toggleDiscussion" class="text-btn" style="margin-top:12px">Xem / ẩn bình luận và ảnh thảo luận</button><div id="discussion" class="comments-panel"><h4>BÌNH LUẬN TRONG DỮ LIỆU</h4>${q.comments.length?q.comments.slice(0,30).map(c=>'<div class="comment"><strong>'+esc(c.author||'Bình luận')+'</strong>'+esc(c.text)+'</div>').join(''):'<p class="small">Không có bình luận.</p>'}${q.comments.length>30?'<p class="small">Hiển thị 30/'+q.comments.length+' bình luận. Toàn bộ vẫn có trong manifest.</p>':''}${q.full?'<img id="fullReviewImage" class="full-image" alt="Ảnh ghép và bình luận gốc">':''}</div></section>`;}
  function editAnswer(){
    if(!session||session.mode!=='practice'||session.submitted)return;
    const q=session.exam.questions[session.current];clearTimeout(autoTimer);
    openModal('<span class="eyebrow">ĐÁP ÁN BẠN XÁC NHẬN</span><h2>'+q.label+' · Xác nhận đáp án</h2><p>Nếu bộ đề cũ chỉ có bình luận trong ảnh, nhập đáp án bạn đã đối chiếu tại đây. Có thể nhập nhiều lựa chọn như A,C. Trang sẽ lưu vào thư viện của trình duyệt.</p><label class="form-field">Đáp án A–F<input id="manualAnswer" maxlength="20" value="'+esc((q.answer||[]).join(','))+'" placeholder="Ví dụ: B hoặc A,C"></label><div class="modal-actions"><button id="cancelManual">Đóng</button><button id="saveManual" class="primary">Lưu đáp án</button></div>');
    bind('cancelManual',closeModal);bind('saveManual',async()=>{
      const value=$('manualAnswer').value.trim(),answer=C.letters(value);
      if(value&&!answer){notify('Nhập chữ A–F, ví dụ B hoặc A,C. Để trống để đánh dấu chưa rõ.');return;}
      q.answer=answer;q.answerMethod='manual';q.community={...q.community,status:answer?'manual':'unknown',verified:false};q.manualConfirmedAt=new Date().toISOString();q.type=answer?.length>1?'multi':'single';if(answer)for(const a of answer)if(!q.options.includes(a))q.options.push(a);
      session.exam.unknown=session.exam.questions.filter(x=>!x.answer).length;delete session.checked[q.index];
      if(!embedded)await put('exams',session.exam);await saveSession();closeModal();renderSession();notify('Đã lưu đáp án '+q.label+' trong thư viện.');
    });
  }
  function choose(letter){if(!session)return;const q=session.exam.questions[session.current];if(feedbackVisible(q)||!q.options.includes(letter))return;session.answers[q.index]=C.selection(session.exam,q,letter,session.answers[q.index]);renderSession();saveSession().catch(()=>{});}
  function jump(index,force=false){if(!session)return;const now=performance.now();if(!force&&now<navLockUntil)return;clearTimeout(autoTimer);navLockUntil=now+220;questionTimerKey=null;questionReadyAt=null;lastSpeedResult=null;session.current=index;renderSession();saveSession().catch(()=>{});}
  function navigate(step,force=false){const now=performance.now();if(!force&&now<navLockUntil)return;clearTimeout(autoTimer);const list=indices();if(!list.length){notify('Không có câu phù hợp.');return;}const at=list.indexOf(session.current);jump(list[(at+step+list.length)%list.length],force);}
  async function checkAnswer(){
    if(!session||session.mode!=='practice'||session.submitted)return;
    const now=performance.now();
    if(now<navLockUntil)return;
    const q=session.exam.questions[session.current];
    if(session.checked[q.index]){navigate(1);return;}
    if(!session.answers[q.index]?.length){notify('Chọn đáp án và kiểm tra trước khi sang câu tiếp theo.');return;}
    const answerMs=questionReadyAt!==null?Math.max(50,Math.round(now-questionReadyAt)):null;
    navLockUntil=now+450;
    clearTimeout(autoTimer);
    session.checked[q.index]=true;
    const isCorrect=C.grade(q,session.answers[q.index])==='correct';
    if(isCorrect){
      session.streak=(session.streak||0)+1;
      session.maxStreak=Math.max(session.maxStreak||0,session.streak);
      playTing(session.streak);
      showComboAnimation(session.streak);
      if(answerMs!==null){
        lastSpeedResult={key:session.exam.id+':'+q.index,ms:answerMs};
        if(nickname()!=='Người học')saveQuestionSpeed(session.exam.id,q.index,nickname(),answerMs);
      }
    }else{
      if(session.streak>=2)showStreakLostAnimation(session.streak);
      session.streak=0;
    }
    renderSession();
    await saveSession();
    if(Object.keys(session.checked).length===session.exam.questions.length){await finish();showResult();return;}
    if(isCorrect){
      const expectedIdx=session.current;
      autoTimer=setTimeout(()=>{if(session&&!session.submitted&&session.current===expectedIdx)navigate(1,true);},650);
    }
  }
  function resetQuestion(){if(!session||session.submitted)return;clearTimeout(autoTimer);questionTimerKey=null;questionReadyAt=null;lastSpeedResult=null;const q=session.exam.questions[session.current];delete session.answers[q.index];delete session.checked[q.index];renderSession();saveSession().catch(()=>{});}
  function confirmSubmit(){const s=session,unanswered=s.exam.questions.length-Object.values(s.answers).filter(a=>a.length).length;openModal(`<h2>${s.mode==='eos'?'Nộp bài thi EOS?':'Kết thúc lượt luyện tập?'}</h2><p>${unanswered?'Bạn còn '+unanswered+' câu chưa chọn đáp án. ':''}${s.exam.unknown} câu chưa rõ đáp án sẽ được tách riêng, không tính vào điểm. ${s.mode==='practice'?'Chấm các câu bạn đã chọn, kể cả chưa bấm Kiểm tra.':''}</p><div class="modal-actions"><button id="cancelSubmit">Làm tiếp</button><button id="confirmSubmit" class="primary">Nộp bài</button></div>`);bind('cancelSubmit',closeModal);bind('confirmSubmit',async()=>{closeModal();await finish();showResult();});}
  async function finish(){clearTimeout(autoTimer);if(session.submitted)return;session.elapsedBase=elapsed();session.running=false;session.submitted=true;clearInterval(timer);const summary=C.summarize(session.exam.questions,session.answers);session.checked=Object.fromEntries(session.exam.questions.map(q=>[q.index,true]));
    if(!session.recorded){const record={id:crypto.randomUUID(),examId:session.exam.id,exam:session.exam.title,subject:session.exam.subject,mode:session.mode,name:nickname(),createdAt:Date.now(),durationSeconds:elapsed(),maxStreak:session.maxStreak||0,...summary};history.push(record);if(!embedded)await put('history',record);else try{const key='studyroom-portable-results';const records=JSON.parse(localStorage.getItem(key)||'[]');records.push(record);localStorage.setItem(key,JSON.stringify(records));}catch{}session.recorded=true;pushHistoryToCloud(record).catch(()=>{});if(settings.sync&&settings.endpoint)sendScore(record).catch(e=>notify(e.message));}
    await saveSession();renderSession();
  }
  function showResult(){const summary=C.summarize(session.exam.questions,session.answers);const streakRow=session.mode==='practice'&&session.maxStreak?`<p class="streak-result">${icon('fire')} Chuỗi đúng dài nhất lượt này: <strong>${session.maxStreak} câu liên tiếp</strong></p>`:'';openModal(`<span class="eyebrow">ĐÃ LƯU KẾT QUẢ</span><h2>${summary.score===null?'Chưa có câu để chấm':summary.score+' / 10'}</h2><p>${summary.correct} đúng · ${summary.wrong} sai · ${summary.unknown} chưa rõ đáp án<br>Thời gian ${time(elapsed())}. Điểm tính trên ${summary.graded} câu có đáp án.</p>${streakRow}<div class="modal-actions"><button id="closeResult">Xem toàn bài</button><button id="wrongResult" class="primary">Ôn câu làm sai</button></div>`);bind('closeResult',closeModal);bind('wrongResult',()=>{closeModal();const s=session;s.filter='wrong';const list=indices();if(list.length)s.current=list[0];else{s.filter='all';notify('Không có câu làm sai.');}renderSession();});}
  async function exitSession(){clearTimeout(autoTimer);session.elapsedBase=elapsed();session.running=false;clearInterval(timer);await saveSession();session=null;if(embedded){app.innerHTML='<main class="content"><span class="eyebrow">BỘ ĐỀ OFFLINE</span><h1>'+esc(embedded.exam.title)+'</h1><div class="mode-cards"><button id="portablePractice" class="mode-card"><strong>Luyện tập</strong><small>Kiểm tra từng câu</small></button><button id="portableEOS" class="mode-card"><strong>Thi thử EOS</strong><small>Nộp và chấm toàn bộ bài</small></button></div></main>';bind('portablePractice',()=>startSession(embedded.exam,'practice',true));bind('portableEOS',()=>startSession(embedded.exam,'eos',true));}else if(view==='studied')renderStudied();else renderLibrary();}
  function showSettings(){openModal(`<span class="eyebrow">CÀI ĐẶT THƯ VIỆN</span><h2>Hồ sơ & bảng điểm</h2><label class="form-field">Tên / nickname<input id="settingName" maxlength="60" value="${esc(settings.name)}" placeholder="Tên của bạn"></label><label class="check-label"><input id="settingTheme" type="checkbox" ${settings.theme==='dark'?'checked':''}><span>Bật giao diện tối (Dark mode).</span></label><label class="check-label"><input id="settingSound" type="checkbox" ${settings.sound!==false?'checked':''}><span>Phát tiếng "ting" khi trả lời đúng trong chế độ Luyện tập.</span></label><label class="form-field">Google Apps Script Web App URL (tùy chọn)<input id="settingEndpoint" type="url" value="${esc(settings.endpoint)}" placeholder="https://script.google.com/macros/s/…/exec"></label><label class="check-label"><input id="settingSync" type="checkbox" ${settings.sync?'checked':''}><span>Tự gửi nickname, tên đề, điểm và thời gian làm bài đến URL này sau khi nộp bài.</span></label><p class="small">Bảng điểm trên máy luôn hoạt động. URL online phải do bạn quản lý; không dùng sẵn endpoint của repo tham khảo. Chế độ gửi no-cors không xác nhận được máy chủ đã lưu.</p><div class="modal-actions"><button id="cancelSettings">Đóng</button><button id="saveSettings" class="primary">Lưu cài đặt</button></div>`);bind('cancelSettings',closeModal);bind('saveSettings',async()=>{const endpoint=$('settingEndpoint').value.trim();if(endpoint&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint)){notify('Nhập URL Web App Google Apps Script dạng https://script.google.com/macros/s/…/exec');return;}if($('settingSync').checked&&!endpoint){notify('Cần nhập URL trước khi bật gửi điểm.');return;}applyTheme($('settingTheme').checked?'dark':'light');const oldName=settings.name;const newName=$('settingName').value.trim();settings={...settings,name:newName,endpoint,sync:$('settingSync').checked,sound:$('settingSound').checked};try{if(newName)localStorage.setItem('studyroom-nickname',newName);}catch{}if(!embedded)await put('settings',{...settings,id:'preferences'});closeModal();if(newName&&newName!==oldName){await syncCloudHistory();}if(session)renderSession();else if(view==='history')renderHistory();else if(view==='studied')renderStudied();else renderLibrary();notify('Đã lưu cài đặt');});}
  async function sendScore(record){try{await fetch(settings.endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({name:record.name,exam:record.exam,score:record.score,correct:record.correct+'/'+record.graded,duration:time(record.durationSeconds),durationSeconds:record.durationSeconds})});notify('Đã gửi yêu cầu lưu điểm online; trình duyệt không xác nhận được kết quả.');}catch{throw Error('Không gửi được điểm online. Kết quả vẫn được lưu trên máy.');}}
  function renderStudied(){
    renderToken++;view='studied';
    const byId=new Map(exams.map(e=>[e.id,e]));
    const items=exams.map(e=>({id:e.id,title:e.title,subject:e.subject,year:e.year,questionsCount:e.questions.length,inLibrary:true,...examStudyInfo(e)}));
    const orphanIds=[...new Set(history.map(h=>h.examId).filter(id=>id&&!byId.has(id)))];
    for(const id of orphanIds){
      const attempts=history.filter(h=>h.examId===id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      const last=attempts[0];if(!last)continue;
      const best=attempts.reduce((m,a)=>a.score!==null&&a.score!==undefined&&a.score>m?a.score:m,-1);
      items.push({id,title:last.exam||'Bộ đề đã xóa',subject:last.subject||'KHÁC',year:null,questionsCount:null,inLibrary:false,attempts,active:[],modes:[...new Set(attempts.map(a=>a.mode))],lastAt:last.createdAt||0,status:'done',last,best:best>=0?best:null});
    }
    items.sort((a,b)=>{
      if(a.lastAt!==b.lastAt)return b.lastAt-a.lastAt;
      const rank=s=>s==='progress'?1:s==='done'?2:3;
      if(rank(a.status)!==rank(b.status))return rank(a.status)-rank(b.status);
      return a.title.localeCompare(b.title,'vi');
    });
    const doneCount=items.filter(x=>x.status==='done').length,progCount=items.filter(x=>x.status==='progress').length,newCount=items.filter(x=>x.status==='new').length;
    const subjects=[...new Set(items.map(x=>x.subject).filter(Boolean))].sort();
    app.innerHTML=shell(`<div class="page-heading"><div><span class="eyebrow">STUDY LOG</span><h1>Lịch sử đề đã học</h1><p>Theo dõi các bộ đề đã hoàn thành, đang làm dở hoặc chưa đụng tới để tránh học trùng.</p></div><button class="primary btn-icon" id="goLibrary">${icon('grid')}Về thư viện</button></div><div class="stats"><div class="stat"><span class="stat-icon">${icon('check')}</span><div><strong>${doneCount}</strong><small>Đề đã hoàn thành</small></div></div><div class="stat"><span class="stat-icon">${icon('clock')}</span><div><strong>${progCount}</strong><small>Đề đang làm dở</small></div></div><div class="stat"><span class="stat-icon">${icon('book')}</span><div><strong>${newCount}</strong><small>Đề chưa học</small></div></div></div><div class="toolbar"><h3 id="studiedCountLabel" style="margin:0;font-size:15px"></h3><div class="row"><div class="search-wrap">${icon('search')}<input id="studiedSearch" placeholder="Tìm tên đề, môn…" value="${esc(studiedFilter.search)}" aria-label="Tìm đề trong lịch sử"></div><select id="studiedSubject" aria-label="Lọc theo môn"><option value="">Tất cả môn</option>${subjects.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select><select id="studiedStatus" aria-label="Lọc theo trạng thái"><option value="studied">Đã từng học</option><option value="done">Đã hoàn thành</option><option value="progress">Đang làm dở</option><option value="new">Chưa học</option><option value="all">Tất cả đề</option></select></div></div><div id="studiedRows"></div>`);
    bindShell();bind('goLibrary',()=>{view='library';subject=null;renderLibrary();});
    $('studiedSubject').value=subjects.includes(studiedFilter.subject)?studiedFilter.subject:'';
    studiedFilter.subject=$('studiedSubject').value;
    $('studiedStatus').value=studiedFilter.status||'studied';
    const show=()=>{
      const q=studiedFilter.search.trim().toLocaleLowerCase(),sub=studiedFilter.subject,st=studiedFilter.status;
      const rows=items.filter(x=>{
        if(sub&&x.subject!==sub)return false;
        if(st==='studied'&&x.status==='new')return false;
        else if(st!=='all'&&st!=='studied'&&x.status!==st)return false;
        if(q&&!(x.title+' '+x.subject+' '+(x.year||'')).toLocaleLowerCase().includes(q))return false;
        return true;
      });
      $('studiedCountLabel').textContent=rows.length+' bộ đề';
      if(!rows.length){
        const emptyAction=st==='studied'&&!q&&!sub&&newCount?'<button class="primary" id="switchToNew">Xem '+newCount+' đề chưa học</button>':'';
        $('studiedRows').innerHTML=`<div class="empty">${icon('history')}<h3>${st==='studied'?'Chưa có đề nào trong lịch sử học':'Không có đề phù hợp bộ lọc'}</h3><p>${st==='studied'?'Khi bạn trả lời câu hỏi hoặc nộp bài, đề đó sẽ hiện tại đây để bạn dễ phân biệt với đề chưa học.':'Thử đổi trạng thái, môn học hoặc từ khóa tìm kiếm.'}</p>${emptyAction}</div>`;
        bind('switchToNew',()=>{studiedFilter.status='new';$('studiedStatus').value='new';show();});
        return;
      }
      $('studiedRows').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Bộ đề</th><th>Trạng thái</th><th>Chế độ & tiến độ</th><th>Kết quả</th><th>Học gần nhất</th><th>Thao tác</th></tr></thead><tbody>${rows.map(x=>{
        const statusBadge=x.status==='done'?'<span class="badge done">✓ Đã học</span>':x.status==='progress'?'<span class="badge progress">Đang làm dở</span>':'<span class="badge fresh">Chưa học</span>';
        const activeText=x.active.map(s=>`${modeLabel(s.mode)} (${Object.keys(s.answers||{}).length}/${x.questionsCount} câu)`).join(' · ');
        const modeText=activeText?(x.attempts.length?`${x.modes.map(modeLabel).join(' + ')} · Đang dở: ${activeText}`:activeText):(x.modes.length?x.modes.map(modeLabel).join(' + '):'—');
        const scoreText=x.attempts.length?`${x.attempts.length} lượt · Gần nhất ${x.last.score===null?'Chưa chấm':x.last.score+'/10'}${x.attempts.length>1&&x.best!==null?' · Cao nhất '+x.best+'/10':''}`:'—';
        const timeText=x.lastAt?new Date(x.lastAt).toLocaleString('vi-VN'):(x.status==='progress'?'Đã lưu tiến độ':'—');
        const action=x.inLibrary?`<button class="small ${x.status==='new'?'primary':''}" data-open-exam="${esc(x.id)}">${x.status==='progress'?'Học tiếp':'Mở đề'}</button>`:'<span class="small muted">Đã xóa</span>';
        return `<tr><td class="wrap-cell"><strong>${esc(x.title)}</strong><small>${esc(x.subject)}${x.year?' · '+esc(x.year):''}${x.questionsCount?' · '+x.questionsCount+' câu':''}${x.inLibrary?'':' · Đã xóa khỏi thư viện'}</small></td><td>${statusBadge}</td><td>${esc(modeText)}</td><td>${esc(scoreText)}</td><td>${esc(timeText)}</td><td>${action}</td></tr>`;
      }).join('')}</tbody></table></div>`;
      $('studiedRows').querySelectorAll('[data-open-exam]').forEach(b=>b.onclick=()=>showExam(b.dataset.openExam));
    };
    $('studiedSearch').oninput=e=>{studiedFilter.search=e.target.value;show();};
    $('studiedSubject').onchange=e=>{studiedFilter.subject=e.target.value;show();};
    $('studiedStatus').onchange=e=>{studiedFilter.status=e.target.value;show();};
    show();
  }
  function renderHistory(){
    renderToken++;view='history';
    const sorted=[...history].sort((a,b)=>(b.score??-1)-(a.score??-1)||a.durationSeconds-b.durationSeconds);
    const me=nickname();
    const lbRows=[...leaderboardUsers].sort((a,b)=>(b.total_correct||0)-(a.total_correct||0)||(b.best_streak||0)-(a.best_streak||0)||(b.total_attempts||0)-(a.total_attempts||0));
    const lbHtml=lbRows.length?`<div class="leaderboard-section"><div class="toolbar"><h3 style="margin:0;font-size:15px">🏆 Bảng xếp hạng thành viên (${lbRows.length})</h3><span class="small muted">Đồng bộ tự động qua Supabase Cloud</span></div><div class="table-wrap"><table><thead><tr><th>Hạng</th><th>Thành viên</th><th>Số lượt làm</th><th>Tổng câu đúng</th><th>Best Streak</th><th>Hoạt động gần nhất</th></tr></thead><tbody>${lbRows.map((u,i)=>`<tr class="${u.nickname===me?'is-me':''}"><td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td><td><strong>${esc(u.nickname)}</strong>${u.nickname===me?' <span class="badge done">Bạn</span>':''}</td><td>${u.total_attempts||0}</td><td class="rank-score">${u.total_correct||0}</td><td>${u.best_streak?'🔥 '+u.best_streak:'—'}</td><td>${u.last_active_at?new Date(u.last_active_at).toLocaleString('vi-VN'):'—'}</td></tr>`).join('')}</tbody></table></div></div>`:'';
    app.innerHTML=shell(`<div class="page-heading"><div><span class="eyebrow">CLOUD PROGRESS & LEADERBOARD</span><h1>Kết quả & bảng xếp hạng</h1><p>Lịch sử làm bài và bảng xếp hạng được đồng bộ an toàn trên Cloud DB (chỉ lưu điểm & lịch sử, không lưu file đề).</p></div><div class="row"><button id="syncCloudBtn" class="primary">↻ Đồng bộ Cloud</button><button id="onlineScores">Apps Script</button></div></div>${lbHtml}<div class="toolbar"><h3 style="margin:0;font-size:15px">${sorted.length} lượt đã hoàn thành</h3><div class="row"><select id="historyScope" aria-label="Lọc theo người dùng"><option value="all">Tất cả mọi người</option><option value="mine">Chỉ của tôi (${esc(me)})</option></select><select id="historyExam" aria-label="Lọc kết quả theo đề"><option value="">Tất cả đề</option>${[...new Set(sorted.map(h=>h.exam).filter(Boolean))].sort().map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('')}</select></div></div><div id="historyRows"></div>`);
    bindShell();
    const show=()=>{
      const examTitle=$('historyExam').value,scope=$('historyScope').value;
      const rows=sorted.filter(h=>(!examTitle||h.exam===examTitle)&&(scope==='all'||h.name===me));
      $('historyRows').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Hạng</th><th>Người học</th><th>Bộ đề</th><th>Chế độ</th><th>Điểm</th><th>Đúng / chấm</th><th>Max Streak</th><th>Thời gian</th><th>Ngày</th></tr></thead><tbody>${rows.map((h,i)=>`<tr class="${h.name===me?'is-me':''}"><td>${i+1}</td><td>${esc(h.name)}</td><td>${esc(h.exam)}</td><td>${h.mode==='eos'?'EOS':'Luyện tập'}</td><td class="rank-score">${h.score??'—'}</td><td>${h.correct}/${h.graded}</td><td>${h.maxStreak?'🔥 '+h.maxStreak:'—'}</td><td>${time(h.durationSeconds)}</td><td>${new Date(h.createdAt).toLocaleString('vi-VN')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h3>Chưa có lượt học hoàn thành</h3><p>Kết quả xuất hiện ở đây sau khi bạn nộp bài.</p></div>';
    };
    $('historyExam').onchange=show;$('historyScope').onchange=show;show();
    bind('syncCloudBtn',async()=>{await syncCloudHistory();renderHistory();notify(cloudSyncStatus==='synced'?'Đã đồng bộ dữ liệu Cloud!':'Không thể kết nối Cloud, đang dùng dữ liệu cục bộ.');});
    bind('onlineScores',loadOnlineScores);
  }
  async function loadOnlineScores(){if(!settings.endpoint){showSettings();return;}openModal('<h2>Bảng điểm online</h2><p id="onlineStatus">Đang đọc từ URL bạn cấu hình…</p><div id="onlineRows"></div><div class="modal-actions"><button id="closeOnline">Đóng</button></div>');bind('closeOnline',closeModal);try{const response=await fetch(settings.endpoint,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);const rows=await response.json();if(!Array.isArray(rows))throw Error('API phải trả mảng kết quả');$('onlineStatus').textContent=rows.length+' kết quả';$('onlineRows').innerHTML='<div class="table-wrap"><table><tr><th>Tên</th><th>Đề</th><th>Điểm</th></tr>'+rows.slice(0,100).map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.exam)+'</td><td>'+esc(r.score)+'</td></tr>').join('')+'</table></div>';}catch(e){$('onlineStatus').textContent='Chưa tải được bảng điểm online: '+e.message;}}
  async function blobData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
  async function exportExam(exam,downloadOnly=false){
    try{const dir=!downloadOnly&&window.showDirectoryPicker?await showDirectoryPicker({mode:'readwrite'}):null;openModal('<h2>Đang tạo hai chế độ…</h2><p id="exportProgress">Đang đóng gói ảnh, không OCR lại.</p>');
      const assets={};for(const path of [...new Set(exam.questions.flatMap(q=>[q.image,q.full].filter(Boolean)))]){const blob=await getImageBlob(exam,path);if(!blob)throw Error('Thiếu ảnh '+path);assets[path]=await blobData(blob);}
      const [css,core,js]=await Promise.all(['styles.css','core.js','app.js'].map(path=>fetch(path).then(r=>{if(!r.ok)throw Error('Không đọc được mã giao diện để xuất');return r.text();})));
      const downloads=[];
      for(const [mode,name] of [['eos','index.html'],['practice','luyen_tap.html']]){
        const html=C.portableDocument(exam,assets,mode,{css,core,app:js});
        const blob=new Blob([html],{type:'text/html;charset=utf-8'});
        if(dir)await writeExport(dir,name,blob);else downloads.push({name,url:URL.createObjectURL(blob)});
      }
      if(dir){closeModal();notify('Đã xuất index.html và luyen_tap.html, mỗi file có ảnh bên trong để chạy độc lập.');}
      else{openModal('<h2>Hai chế độ đã sẵn sàng</h2><p>Bấm từng liên kết để lưu. Mỗi file chứa cả ảnh và dữ liệu, mở offline bằng trình duyệt.</p><div class="stack">'+downloads.map(d=>'<a download="'+d.name+'" href="'+d.url+'">Tải '+d.name+'</a>').join('')+'</div><div class="modal-actions"><button id="closeDownloads">Xong</button></div>');bind('closeDownloads',()=>{closeModal();setTimeout(()=>downloads.forEach(d=>URL.revokeObjectURL(d.url)),60000);});}
    }catch(e){closeModal();if(e.name!=='AbortError')notify(e.message);}
  }
  async function writeExport(dir,name,blob){let exists=false;try{await dir.getFileHandle(name);exists=true;}catch(e){if(e.name!=='NotFoundError')throw e;}if(exists&&!confirm('Ghi đè '+name+' trong thư mục xuất?'))throw Error('Đã dừng xuất, giữ file cũ.');const handle=await dir.getFileHandle(name,{create:true}),stream=await handle.createWritable();await stream.write(blob);await stream.close();}
  function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  document.addEventListener('keydown',e=>{if(e.repeat||!session||modal.open||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const key=e.key.toUpperCase();if(/^[1-6]$/.test(key)){e.preventDefault();choose(String.fromCharCode(64+Number(key)));}else if(/^[A-F]$/.test(key)){e.preventDefault();choose(key);}else if(e.key==='ArrowRight'){e.preventDefault();if(session.mode==='practice'&&!session.submitted)checkAnswer();else navigate(1);}else if(e.key==='ArrowLeft'){e.preventDefault();navigate(-1);}else if(key==='ENTER'&&session.mode==='practice'){e.preventDefault();checkAnswer();}else if(key==='R'){e.preventDefault();resetQuestion();}});
  window.addEventListener('beforeunload',()=>{if(session)saveSession().catch(()=>{});});
  try{
    if(embedded){exams=[embedded.exam];settings.name=localStorage.getItem('studyroom-portable-name')||'';const savedSound=localStorage.getItem('studyroom-portable-sound');if(savedSound!==null)settings.sound=savedSound==='1';const label=embedded.mode==='eos'?'Thi thử EOS':'Luyện tập';openModal(`<h2>${esc(embedded.exam.title)}</h2><p>${label} · ${embedded.exam.questions.length} câu. File này chạy độc lập offline.</p><label class="form-field">Tên / nickname<input id="portableName" maxlength="60" placeholder="Tên của bạn" value="${esc(settings.name)}"></label><div class="modal-actions"><button id="startPortable" class="primary">Bắt đầu ${label}</button></div>`);bind('startPortable',()=>{settings.name=$('portableName').value.trim();try{localStorage.setItem('studyroom-portable-name',settings.name);}catch{}startSession(embedded.exam,embedded.mode,true);});app.innerHTML='<div class="loading">Bộ đề đã sẵn sàng. Bấm Bắt đầu để làm bài.</div>';}
    else{await initStorage();renderLibrary();if(!settings.name)promptNickname(true);}
  }catch(e){app.innerHTML='<main class="content"><h1>Chưa mở được bộ nhớ trình duyệt</h1><p>'+esc(e.message)+'</p><p>Hãy mở bằng start.cmd, dùng Edge/Chrome ở chế độ thường và cho phép lưu dữ liệu trang web.</p></main>';}
})();
