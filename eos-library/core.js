(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QuizCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const norm=s=>String(s||'').normalize('NFC').replace(/\\/g,'/').replace(/^\.\//,'');
  function relative(path){const s=norm(path);if(!s||s.startsWith('/')||/^[a-z]+:/i.test(s)||s.split('/').includes('..'))throw Error('Đường dẫn ảnh không hợp lệ: '+s);return s;}
  function year(title){const f=title.match(/(?:^|\D)(20\d{2})(?!\d)/);if(f)return +f[1];const m=title.match(/(?:SP|SU|FA|SPRING|SUMMER|FALL)[\s_-]*(\d{2})(?!\d)/i);return m?2000+Number(m[1]):null;}
  function subject(title,folder){const m=(title+' '+folder).match(/(?:^|[^a-z0-9])([a-z]{2,5}\d{3}[a-z]?)(?=$|[^a-z0-9])/i);return m?m[1].toUpperCase():'KHÁC';}
  function letters(value){if(Array.isArray(value))value=value.join('');if(typeof value!=='string')return null;const s=value.toUpperCase().replace(/[\s,;+&/]/g,'');if(!/^[A-F]{1,6}$/.test(s))return null;return [...new Set(s)].sort();}
  function commentChoice(text){
    if(typeof text!=='string')return null;
    const clean=text.trim().replace(/[.!]+$/,'').trim();
    const explicit=clean.match(/^(?:(?:đáp\s*án|answer|chọn|key|chốt)\s*(?:là\s*)?[:：]?\s*|(?:=>|->)\s*)?([a-f](?:[\s,;+&/]*[a-f]){0,5})(?:\s+(?:nha|nhé|nhá|đúng|chuẩn))?$/iu);
    return explicit?letters(explicit[1]):null;
  }
  function recoverAnswer(row){
    const state=row.community?.status;
    if(state==='tie')return {answer:null,method:'tie'};
    const counts=row.community?.counts||row.votes;
    if(counts&&typeof counts==='object'){
      const entries=Object.entries(counts).filter(([key,n])=>letters(key)&&Number(n)>0);
      if(entries.length){const max=Math.max(...entries.map(([,n])=>Number(n))),best=entries.filter(([,n])=>Number(n)===max);return {answer:best.length===1?letters(best[0][0]):null,method:best.length===1?'vote_counts':'tie'};}
    }
    const comments=Array.isArray(row.comments)?row.comments:[];
    const latest=new Map();
    for(let i=0;i<comments.length;i++){const c=comments[i],id=typeof c==='object'?(c.authorId||c.author||'comment-'+i):'comment-'+i;const previous=latest.get(id);if(!previous||(Date.parse(c.date)||0)>(Date.parse(previous.date)||0))latest.set(id,c);}
    const votes=new Map();for(const c of latest.values()){const choice=commentChoice(typeof c==='string'?c:c.text);if(!choice)continue;const key=choice.join('');votes.set(key,(votes.get(key)||0)+1);}
    if(!votes.size)return {answer:null,method:'unknown'};
    const max=Math.max(...votes.values()),best=[...votes].filter(([,n])=>n===max);
    return {answer:best.length===1?letters(best[0][0]):null,method:best.length===1?'structured_comments':'tie'};
  }
  function canonicalSource(value){try{const u=new URL(value);const match=u.pathname.match(/^\/threads\/[^/]+\.\d+\//);return match?u.origin+match[0]:null;}catch{return null;}}
  function normalizeManifest(data,{folder='',files=new Map(),title:providedTitle}={}){
    const title=String(data.title||providedTitle||folder.split('/').pop()||'Bộ đề').replace(/\u00a0/g,' ');
    const rows=Array.isArray(data)?data:Array.isArray(data.questions)?data.questions:data.report;
    if(!Array.isArray(rows)||!rows.length)throw Error('Manifest chưa có questions/report hoặc quiz_data rỗng.');
    const resolve=p=>{try{const path=relative(p);return files.has(path)?path:null;}catch{return null;}};
    const questions=[],warnings=[],seen=new Set();
    for(let order=0;order<rows.length;order++){
      const r=rows[order],index=Number(r.index??r.id??order+1);
      if(!Number.isInteger(index)||index<1||seen.has(index)){warnings.push('Bỏ câu có số thứ tự lỗi/trùng tại dòng '+(order+1));continue;}
      seen.add(index);const base='Q'+String(index).padStart(3,'0');
      const candidates=[r.questionImage,r.question_img,r.original,'originals/'+base+'.png','questions/'+base+'.png','originals/'+base+'.webp'];
      let image=candidates.map(resolve).find(Boolean);
      const full=[r.composite,r.full_img,base+'.png'].map(resolve).find(Boolean)||null;
      const usesComposite=!image&&!!full;if(!image)image=full;
      if(!image){warnings.push('Q'+index+': thiếu ảnh'+(r.error?' · '+r.error:''));continue;}
      if(usesComposite)warnings.push('Q'+index+': dùng ảnh ghép vì không có ảnh câu hỏi riêng');
      const community=r.community||{};
      const unresolved=['tie','unknown','error'].includes(community.status)||/mặc định\s*a|chưa có bình luận|default\s*a/i.test((r.vote_summary||'')+' '+(r.explanation||''));
      const direct=unresolved?null:letters(community.answer??r.correct??r.answer);
      const recovered=direct?{answer:direct,method:'manifest'}:recoverAnswer(r);
      const answer=recovered.answer;
      const explicit=Array.isArray(r.options)?r.options.filter(x=>/^[A-F]$/i.test(x)).map(x=>x.toUpperCase()):[];
      const largest=Math.max(3,...(answer||[]).map(a=>a.charCodeAt(0)-65),...Object.keys(community.counts||{}).filter(a=>/^[A-F]$/.test(a)).map(a=>a.charCodeAt(0)-65));
      const options=explicit.length?[...new Set(explicit)]:Array.from({length:largest+1},(_,i)=>String.fromCharCode(65+i));
      if(answer)for(const a of answer)if(!options.includes(a))options.push(a);
      const comments=(Array.isArray(r.comments)?r.comments:[]).map(c=>typeof c==='string'?{author:'',text:c}:{author:String(c.author||''),text:String(c.text||''),date:String(c.date||'')});
      questions.push({index,label:'Q'+index,image,full,usesComposite,answer,answerMethod:recovered.method,options,type:r.type==='multi'||answer?.length>1?'multi':'single',comments,community:{counts:community.counts||r.votes||{},status:recovered.method==='structured_comments'?'community_plurality':recovered.method==='vote_counts'?'community_plurality':recovered.method==='tie'?'tie':community.status||(answer?'provided':'unknown'),verified:community.verified===true},explanation:typeof r.explanation==='string'?r.explanation:'',error:r.error||null});
    }
    questions.sort((a,b)=>a.index-b.index);
    if(!questions.length)throw Error('Không có câu nào có ảnh hợp lệ. Cần chọn cả thư mục đề chứa manifest và originals/.');
    const total=Number(data.totalQuestions)||rows.length;
    return {title,subject:subject(title,folder),year:year(title),source:canonicalSource(data.source),questions,totalQuestions:total,warnings,missing:Math.max(0,total-questions.length),unknown:questions.filter(q=>!q.answer).length};
  }
  function grade(question,selection){if(!question.answer)return 'unknown';const a=letters(selection)||[];return a.join('')===question.answer.join('')?'correct':'wrong';}
  function summarize(questions,answers,checked){let correct=0,wrong=0,unknown=0,pending=0;for(const q of questions){if(checked&&!checked[q.index]){pending++;continue;}const result=grade(q,answers[q.index]);if(result==='correct')correct++;else if(result==='wrong')wrong++;else unknown++;}return {correct,wrong,unknown,pending,graded:correct+wrong,score:correct+wrong?Number((correct/(correct+wrong)*10).toFixed(1)):null};}
  function selection(exam,q,letter,current){const a=[...(current||[])];if(q.type==='multi')return a.includes(letter)?a.filter(x=>x!==letter):[...a,letter].sort();return a[0]===letter?[]:[letter];}
  function identity(exam,folder){return exam.source||[exam.subject,exam.title.normalize('NFKC').trim().toLocaleLowerCase(),folder.split('/').pop().normalize('NFKC').trim().toLocaleLowerCase()].join('|');}
  function groups(exams){const map=new Map();for(const exam of exams){const key=exam.year||'Chưa rõ năm';if(!map.has(key))map.set(key,[]);map.get(key).push(exam);}return [...map].sort(([a],[b])=>a==='Chưa rõ năm'?1:b==='Chưa rõ năm'?-1:Number(b)-Number(a));}
  function portableDocument(exam,assets,mode,{css,core,app}){
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const data=JSON.stringify({exam,assets,mode}).replace(/</g,'\\u003c');
    const script=s=>s.replace(/<\/script/gi,'<\\/script');
    return '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(exam.title)+'</title><style>'+css+'</style><body><div id="app"></div><div id="toast" role="status"></div><div id="comboOverlay" class="combo-overlay" aria-live="polite"></div><dialog id="modal"></dialog><input id="folderInput" type="file" hidden><script id="embedded-data" type="application/json">'+data+'</script><script>'+script(core)+'</script><script>'+script(app)+'</script></body></html>';
  }
  return {norm,relative,year,subject,letters,commentChoice,recoverAnswer,normalizeManifest,grade,summarize,selection,identity,groups,portableDocument};
});
