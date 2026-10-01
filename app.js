const $ = s => document.querySelector(s);
const TYPES = { note: '学习笔记', journal: '日常日志', link: '文章收藏' };
const KEY = 'shiye-v1:' + location.pathname.replace(/index\.html$/, '');
let remote = [], drafts = {}, config = {}, token = '', filter = 'all', tag = '', currentId = null, editingId = null, busy = false;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Date().toLocaleDateString('sv-SE');
const safeURL = s => { try { const u = new URL(s); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 5000); }
function confirmAction(title, message) { $('#confirm-title').textContent = title; $('#confirm-text').textContent = message; $('#confirm').showModal(); return new Promise(resolve => { const done = value => { $('#confirm').close(); resolve(value); }; $('#confirm-yes').onclick = () => done(true); $('#confirm-no').onclick = () => done(false); $('#confirm').oncancel = e => { e.preventDefault(); done(false); }; }); }
function persist(next) { const serialized = JSON.stringify(next); if (new Blob([serialized]).size > 4000000) throw new Error('本机草稿超过 4 MB，请先导出备份并发布部分草稿。'); try { localStorage.setItem(KEY + ':drafts', serialized); } catch { throw new Error('浏览器存储不可用或已满。请先导出备份；当前内容尚未保存。'); } drafts = next; }
function entries() { const map = new Map(remote.map(e => [e.id,e])); for (const [id,d] of Object.entries(drafts)) { if(d.deleted) map.delete(id); else map.set(id,d.entry); } return [...map.values()]; }
function normalize(data) { if (!data || data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 10000) throw new Error('数据格式不正确：需要拾页导出的 JSON 备份。'); return data.entries.map(e => { if (!e || typeof e.id !== 'string' || !e.id || e.id.length>100 || !Object.hasOwn(TYPES,e.type) || typeof e.title !== 'string' || !e.title.trim() || e.title.length>160 || typeof e.content !== 'string' || e.content.length>200000 || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !Number.isFinite(Date.parse(e.updatedAt))) throw new Error('发现无效记录，未导入任何内容。'); if (e.type === 'link' && !safeURL(e.url)) throw new Error('文章链接必须以 https:// 或 http:// 开头。'); return {id:e.id,type:e.type,title:e.title,date:e.date,content:e.content,url:safeURL(e.url),tags:Array.isArray(e.tags)?e.tags.filter(x=>typeof x==='string').slice(0,8).map(x=>x.slice(0,30)):[],updatedAt:e.updatedAt}; }); }
function render() {
 const all=entries(), query=$('#search').value.trim().toLowerCase();
 $('#count-all').textContent=all.length; for(const type of Object.keys(TYPES)) $('#count-'+type).textContent=all.filter(e=>e.type===type).length;
 const names=['all',...Object.keys(TYPES)]; for(const name of names) document.querySelector(`[data-filter="${name}"]`).classList.toggle('active',filter===name);
 $('#section-title').textContent=$('#breadcrumb').textContent=filter==='all'?'全部记录':TYPES[filter];
 const available=[...new Set(all.filter(e=>filter==='all'||e.type===filter).flatMap(e=>e.tags))];
 if(!available.includes(tag)) tag='';
 $('#tag-filters').innerHTML=`<button class="${tag?'':'selected'}" data-tag="">全部标签</button>`+available.slice(0,12).map(t=>`<button class="${t===tag?'selected':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
 const visible=all.filter(e=>(filter==='all'||e.type===filter)&&(!tag||e.tags.includes(tag))&&(!query||[e.title,e.content,e.url,...e.tags].join(' ').toLowerCase().includes(query)));
 const sort=$('#sort').value; visible.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'zh-CN'):sort==='old'?a.date.localeCompare(b.date):b.updatedAt.localeCompare(a.updatedAt));
 $('#result-count').textContent=`${visible.length} 篇`; $('#entries').innerHTML=visible.map(e=>`<article class="card"><div class="card-top"><span class="pill ${e.type}">${e.type==='note'?'▤':e.type==='journal'?'◷':'↗'} ${TYPES[e.type]}</span><time datetime="${e.date}">${e.date.replaceAll('-','.')}</time></div><h3><button data-read="${esc(e.id)}">${esc(e.title)}</button></h3><p>${esc(e.content.replace(/[#>*\x60]/g,'').replace(/\n+/g,' ').slice(0,150)||e.url)}</p><div class="card-bottom"><span class="card-tags">${e.tags.slice(0,3).map(t=>`<span># ${esc(t)}</span>`).join('')}</span><span class="${drafts[e.id]?'draft-mark':''}">${drafts[e.id]?'本机草稿':e.type==='link'?'文章收藏':Math.max(1,Math.ceil(e.content.length/400))+' 分钟阅读'}</span></div></article>`).join('');
 $('#empty').hidden=visible.length>0; $('#empty h3').textContent=query||tag?'没有找到这条记录':'这里，留给下一次灵感'; $('#empty p').textContent=query||tag?'试试其他关键词，或清除标签筛选。':'写下第一篇笔记，或收藏一篇值得再读的文章。';
 const pending=Object.keys(drafts).length; $('#sync-open').textContent=config.owner&&config.repo?pending?`${pending} 项待发布`:'已连接 GitHub':pending?`${pending} 篇本机草稿`:'本机草稿模式'; $('#sync-open').classList.toggle('connected',Boolean(config.owner&&config.repo)); $('#footer-count').textContent=`${all.length} 条记录 · 拾页`;
}
function inline(text) { return esc(text).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>'); }
function markdown(text) { let code=false, block=[], out=[], list=false; const closeList=()=>{if(list){out.push('</ul>');list=false;}}; for(const line of text.split('\n')) { if(line.startsWith('```')) { closeList(); if(code){out.push('<pre><code>'+esc(block.join('\n'))+'</code></pre>');block=[];}code=!code;continue; } if(code){block.push(line);continue;} const heading=/^(#{1,4})\s+(.+)$/.exec(line); if(heading){closeList();out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);}else if(/^[-*] /.test(line)){if(!list){out.push('<ul>');list=true;}out.push('<li>'+inline(line.slice(2))+'</li>');}else{closeList();if(line.startsWith('> '))out.push('<blockquote>'+inline(line.slice(2))+'</blockquote>');else if(line.trim())out.push('<p>'+inline(line)+'</p>');} } closeList(); if(code)out.push('<pre><code>'+esc(block.join('\n'))+'</code></pre>'); return out.join(''); }
function read(id) { const e=entries().find(x=>x.id===id); if(!e)return;currentId=id;$('#reader-title').textContent=e.title;$('#reader-kind').textContent=TYPES[e.type];$('#reader-kind').className='pill '+e.type;$('#reader-meta').textContent=e.date+' · '+(drafts[id]?'本机草稿，尚未公开':'已公开');$('#reader-tags').innerHTML=e.tags.map(t=>`<span class="tag"># ${esc(t)}</span>`).join('');$('#reader-body').innerHTML=markdown(e.content);$('#reader-url').hidden=!safeURL(e.url);$('#reader-url').href=safeURL(e.url)||'#';$('#publish-entry').hidden=!drafts[id];if(!$('#reader').open)$('#reader').showModal(); }
function openEditor(type='note',entry=null) { editingId=entry?.id||null;$('#editor-form').reset();$('#editor-heading').textContent=entry?'编辑记录':'留住这一刻的思考';$('#entry-type').value=entry?.type||type;$('#entry-title').value=entry?.title||'';$('#entry-date').value=entry?.date||today();$('#entry-tags').value=entry?.tags.join('，')||'';$('#entry-content').value=entry?.content||'';$('#entry-url').value=entry?.url||'';$('#editor-message').textContent='';typeChanged();$('#editor').showModal(); }
function typeChanged() { const link=$('#entry-type').value==='link';$('#url-field').hidden=!link;$('#entry-url').required=link; }
function putDraft(entry) { const base=drafts[entry.id]?.base ?? remote.find(e=>e.id===entry.id) ?? null; persist({...drafts,[entry.id]:{entry,base}}); }
async function api(path,options={}) { const headers={'Accept':'application/vnd.github+json',...options.headers};if(token)headers.Authorization='Bearer '+token;let response;try{response=await fetch('https://api.github.com'+path,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{throw new Error('无法连接 GitHub，请检查网络。草稿仍保存在本机。');}if(!response.ok){const messages={401:'访问令牌无效或已过期，请在设置中重新填写。',403:'没有写入权限或 API 请求过于频繁，请检查令牌权限后重试。',404:'未找到仓库或 data.json，请检查用户名、仓库名称和分支。',409:'其他设备刚刚更新了仓库。请重新尝试发布以检查冲突。',422:'GitHub 未接受此次保存，请检查分支和仓库设置。'};throw new Error(messages[response.status]||`GitHub 请求失败（${response.status}），草稿尚未发布。`);}return response; }
const repoPath=()=>`/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/data.json`;
// Reading and publishing use the same decoder. A missing inline body is not a size error.
const CLOUD_READ_ERROR = 'GitHub 返回的文件数据不完整或格式异常。本机草稿已保留，请稍后重试。';
function cloudReadPath(format) {
 return repoPath()+'?ref='+encodeURIComponent(config.branch)+'&_shiye='+format+'-'+crypto.randomUUID();
}
async function readCloudJSON(response) {
 const bytes=new Uint8Array(await response.arrayBuffer());
 try { return {bytes,data:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}; }
 catch { throw new Error(CLOUD_READ_ERROR); }
}
async function gitBlobSha(bytes) {
 const header=new TextEncoder().encode('blob '+bytes.byteLength+'\0');
 const blob=new Uint8Array(header.length+bytes.length);
 blob.set(header);blob.set(bytes,header.length);
 const digest=await crypto.subtle.digest('SHA-1',blob);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function decodeCloudFile(payload) {
 const {data}=payload;
 if(data?.version===1&&Array.isArray(data.entries)) {
   // Preserve the exact UTF-8 bytes, including BOM/newlines, for Git's concurrency check.
   return {entries:normalize(data),sha:await gitBlobSha(payload.bytes)};
 }
 if(!data||Array.isArray(data)||! /^[a-f0-9]{40}$/i.test(data.sha||'')) throw new Error(CLOUD_READ_ERROR);
 if(data.encoding!=='base64'||typeof data.content!=='string'||!data.content.trim()) return null;
 let bytes,parsed;
 try {
   bytes=Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
   parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 } catch { throw new Error(CLOUD_READ_ERROR); }
 const sha=await gitBlobSha(bytes);
 if(sha!==data.sha.toLowerCase()) throw new Error('GitHub 返回的正文与文件版本不一致。本机草稿已保留，请重试。');
 return {entries:normalize(parsed),sha};
}
async function readCloudSnapshot() {
 const payload=await readCloudJSON(await api(cloudReadPath('object'),{headers:{Accept:'application/vnd.github.object+json'}}));
 const snapshot=await decodeCloudFile(payload);
 if(snapshot) return snapshot;
 // GitHub can omit inline content. Read the body separately and verify the same blob version.
 const raw=await readCloudJSON(await api(cloudReadPath('raw'),{headers:{Accept:'application/vnd.github.raw+json'}}));
 const fallback=await decodeCloudFile(raw);
 if(!fallback) throw new Error(CLOUD_READ_ERROR);
 if(fallback.sha!==payload.data.sha.toLowerCase()) throw new Error('读取期间云端内容已更新。本机草稿已保留，请重新发布。');
 return fallback;
}
async function loadCloud() { return (await readCloudSnapshot()).entries; }
function encode(text) { const bytes=new TextEncoder().encode(text);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s); }
function sameEntry(a,b) { return a===null||b===null?a===b:JSON.stringify(normalize({version:1,entries:[a]})[0])===JSON.stringify(normalize({version:1,entries:[b]})[0]); }
function decode(text) { return new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0))); }
async function publish(ids) {
 if(busy)return;if(!config.owner||!config.repo||!token){toast('请先连接 GitHub，并填写发布用的访问令牌。');if($('#reader').open)$('#reader').close();openSettings();return;}
 const changes=ids.filter(id=>drafts[id]);if(!changes.length){toast('没有需要发布的草稿。');return;}
 if(!await confirmAction('公开发布',`将 ${changes.length} 项修改发布到 ${config.owner}/${config.repo}。发布内容可以被所有人阅读。`))return;
 busy=true;document.querySelectorAll('#publish-all,#publish-entry').forEach(b=>b.disabled=true);
 const batch=JSON.parse(JSON.stringify(Object.fromEntries(changes.map(id=>[id,drafts[id]]))));
 try { const {entries:fresh,sha}=await readCloudSnapshot();
   const map=new Map(fresh.map(e=>[e.id,e]));
   for(const id of changes){const d=batch[id],server=map.get(id)||null;if(!sameEntry(server,d.base)){throw new Error(`「${d.entry?.title||d.base?.title||id}」已在其他设备修改。请导出备份，刷新后核对内容；为避免覆盖，本次未发布。`);}if(d.deleted)map.delete(id);else map.set(id,d.entry);}
   const next={version:1,entries:[...map.values()]},content=JSON.stringify(next,null,2),size=new Blob([content]).size;
   if(size>900000)throw new Error(`全部公开内容合计 ${(size/1000).toFixed(1)} KB，超过本博客 900 KB 的发布上限。本机草稿已保留；把同样的内容拆成多篇不会减少总量。`);
   await api(repoPath(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'更新拾页学习记录',branch:config.branch,sha,content:encode(content)})});
   remote=next.entries;const remaining={...drafts};changes.forEach(id=>{if(JSON.stringify(remaining[id])===JSON.stringify(batch[id]))delete remaining[id];else if(remaining[id])remaining[id]={...remaining[id],base:map.get(id)||null};});persist(remaining);render();if($('#reader').open&&currentId)read(currentId);toast('已发布到 GitHub。其他设备刷新页面即可查看。');
 }catch(err){toast(err.message);$('#settings-message').textContent=err.message;}finally{busy=false;document.querySelectorAll('#publish-all,#publish-entry').forEach(b=>b.disabled=false);}
}
function openSettings(){ $('#gh-owner').value=config.owner||'';$('#gh-repo').value=config.repo||'';$('#gh-branch').value=config.branch||'main';$('#gh-token').value=token;$('#settings-message').textContent='';if(!$('#settings').open)$('#settings').showModal(); }
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;tag='';render();});
$('#tag-filters').onclick=e=>{const b=e.target.closest('[data-tag]');if(b){tag=b.dataset.tag;render();}};
$('#entries').onclick=e=>{const b=e.target.closest('[data-read]');if(b)read(b.dataset.read);};
$('#new-note').onclick=$('#empty-new').onclick=()=>openEditor('note');$('#new-journal').onclick=()=>openEditor('journal');$('#new-link').onclick=()=>openEditor('link');
$('#search').oninput=render;$('#sort').onchange=render;$('#entry-type').onchange=typeChanged;
$('#editor-form').onsubmit=e=>{e.preventDefault();try{const type=$('#entry-type').value,url=$('#entry-url').value.trim();if(type==='link'&&!safeURL(url))throw new Error('请输入以 https:// 或 http:// 开头的有效链接。');const title=$('#entry-title').value.trim();if(!title)throw new Error('请填写标题。');const entry={id:editingId||crypto.randomUUID(),type,title,date:$('#entry-date').value,tags:[...new Set($('#entry-tags').value.split(/[,，]/).map(t=>t.trim().slice(0,30)).filter(Boolean))].slice(0,8),content:$('#entry-content').value,url:type==='link'?safeURL(url):'',updatedAt:new Date().toISOString()};putDraft(entry);$('#editor').close();render();toast('草稿已保存在当前浏览器。发布后可跨设备查看。');}catch(err){$('#editor-message').textContent=err.message;}};
$('#edit-entry').onclick=()=>{const e=entries().find(e=>e.id===currentId);$('#reader').close();openEditor(e.type,e);};
$('#delete-entry').onclick=async()=>{if(busy)return;const id=currentId;if(!await confirmAction('删除这条记录？','本机内容将移除；已公开的记录需要发布删除操作后，才会从博客页面移除。'))return;try{const next={...drafts};const base=next[id]?.base??remote.find(e=>e.id===id)??null;if(base)next[id]={deleted:true,base};else delete next[id];persist(next);$('#reader').close();render();toast(base?'已标记删除，请在设置中发布修改。':'本机草稿已删除。');}catch(err){toast(err.message);}};
$('#publish-entry').onclick=()=>publish([currentId]);$('#publish-all').onclick=()=>publish(Object.keys(drafts));
$('#settings-open').onclick=$('#sync-open').onclick=openSettings;
$('#settings-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const next={owner:$('#gh-owner').value.trim(),repo:$('#gh-repo').value.trim(),branch:$('#gh-branch').value.trim()};if((next.owner!==config.owner||next.repo!==config.repo||next.branch!==config.branch)&&Object.keys(drafts).length){$('#settings-message').textContent='切换仓库前请先导出备份。现有草稿会保留，发布前会检查冲突。';}const old=config,oldToken=token;config=next;token=$('#gh-token').value.trim();const submit=$('#settings-form button[type=submit]');submit.disabled=true;$('#settings-message').textContent='正在连接…';try{const cloud=await loadCloud();localStorage.setItem(KEY+':config',JSON.stringify(config));remote=cloud;render();$('#settings-message').textContent='连接成功。可以阅读云端内容，并发布本机草稿。';$('#gh-token').value='';toast('GitHub 仓库已连接。');}catch(err){config=old;token=oldToken;$('#settings-message').textContent=err.message;}finally{submit.disabled=false;}};
$('#disconnect').onclick=()=>{token='';$('#gh-token').value='';$('#settings-message').textContent='已清除本次会话的发布权限，公开内容仍然可以阅读。';};
$('#import-open').onclick=()=>$('#file-input').click();
$('#file-input').onchange=async e=>{try{const files=[...e.target.files];if(files.length>30)throw new Error('每次最多上传 30 个文件。');const next={...drafts};for(const file of files){if(!/\.(md|markdown|txt)$/i.test(file.name))throw new Error('目前支持 Markdown 和 TXT 文件。');if(file.size>200000)throw new Error(`「${file.name}」超过 200 KB，请拆分后上传。`);const entry={id:crypto.randomUUID(),type:'note',title:file.name.replace(/\.[^.]+$/,'').slice(0,160)||'未命名笔记',date:today(),tags:['导入笔记'],content:await file.text(),url:'',updatedAt:new Date().toISOString()};next[entry.id]={entry,base:null};}persist(next);filter='note';tag='';$('#search').value='';render();toast(`已导入 ${files.length} 篇笔记，保存在本机草稿中。`);}catch(err){toast(err.message);}finally{e.target.value='';}};
$('#export-data').onclick=()=>{const data={version:1,entries:entries(),pendingDeletions:Object.entries(drafts).filter(([,d])=>d.deleted).map(([id])=>id),exportedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='拾页备份-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import-data').onclick=()=>$('#backup-input').click();$('#backup-input').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>5000000)throw new Error('备份文件不能超过 5 MB。');const incoming=normalize(JSON.parse(await f.text()));if(!await confirmAction('导入备份',`导入 ${incoming.length} 条记录为本机草稿。同一条记录的本机内容将被替换，云端内容需发布后更新。`))return;const next={...drafts};for(const entry of incoming)next[entry.id]={entry:{...entry,updatedAt:new Date().toISOString()},base:drafts[entry.id]?.base??remote.find(e=>e.id===entry.id)??null};persist(next);render();toast('备份已导入为本机草稿。');}catch(err){toast(err.message);}finally{e.target.value='';}};
window.addEventListener('storage',e=>{if(e.key===KEY+':drafts'){try{drafts=JSON.parse(e.newValue||'{}');render();}catch{toast('另一个标签页的数据无效，请导出备份后重试。');}}});
const now=new Date();$('#today-day').textContent=String(now.getDate()).padStart(2,'0');$('#today-month').textContent=now.toLocaleDateString('en-US',{month:'short'}).toUpperCase()+' / '+now.getFullYear();$('#today-week').textContent=now.toLocaleDateString('zh-CN',{weekday:'long'});
async function start(){try{try{drafts=JSON.parse(localStorage.getItem(KEY+':drafts')||'{}');config=JSON.parse(localStorage.getItem(KEY+':config')||'null')||{};}catch{toast('无法读取本机数据，请检查浏览器是否允许存储。');}if(!config.owner){const r=await fetch('./config.json',{cache:'no-store'});if(r.ok)config=await r.json();}if(!config.owner&&location.hostname.endsWith('.github.io')){config={owner:location.hostname.split('.')[0],repo:location.pathname.split('/').filter(Boolean)[0]||location.hostname,branch:'main'};}const r=await fetch('./data.json',{cache:'no-store'});if(!r.ok)throw new Error('无法读取博客内容。');remote=normalize(await r.json());render();$('#loading').hidden=true;if(config.owner&&config.repo){try{remote=await loadCloud();}catch(err){toast('暂时显示已部署的内容。'+err.message);}}}catch(err){toast(err.message);}finally{$('#loading').hidden=true;render();}}
start();

