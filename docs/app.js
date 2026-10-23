import {cachedTime,timeReference,formatCompletionTime,freshTime,loadTimes} from './completion-times.mjs?v=1';
import { finishCandidates, remainingRarity, resolveFinishSort } from './finish-next.mjs?v=9';
import { cachedAvailability, freshAvailability, loadAvailability } from './availability-cache.mjs?v=1';
import { cachedPlayers, loadPlayers, PLAYER_TTL } from './players.mjs';
import { reviewedAt, rulesFor, achievementIssues, gameFindings, libraryAvailability, sourceCoverage } from './availability.mjs?v=3';
import { backend } from './connection.js';
import { demo } from './demo.js';
import { REFRESH_COOLDOWN, matchesProfile, mergeLibrary, readProfile, saveProfile, forgetProfile } from './profile-cache.mjs?v=3';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
 chevron:'M9 5l7 7-7 7',
 library:'M3 4h6v16H3z M12 4h4v16h-4z M19 4l3 1-3 15-3-1',
 flag:'M5 22V3m0 1c5-5 9 5 14 0v11c-5 5-9-5-14 0',
 chart:'M4 20V12m8 8V4m8 16v-9 M2 23h21',
 trophy:'M7 3h10v6a5 5 0 0 1-10 0V3z M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4m-4 2v6m-4 2h8',
 search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 arrow:'M5 12h14m-5-5 5 5-5 5',
 close:'M6 6l12 12M18 6 6 18',
 pin:'M8 3h8l-1 7 4 4H5l4-4-1-7zm4 11v8',
 check:'M5 12l4 4L19 6',
 clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 circle:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M7 12l3 3 7-7',
 info:'M12 11v6m0-11v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 lock:'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3',
 external:'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',
 refresh:'M20 7a9 9 0 1 0 1 9 M20 2v6h-6',
 spark:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z'
};
const icon = (name,cls='') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.trophy}"/></svg>`;
const sheetToolbar = (id,label) => `<div class="sheet-toolbar"><button class="icon-button sheet-close" data-close="${id}" aria-label="${label}">${icon('close')}</button></div>`;
const storage = { get(key,fallback) { try {return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;} }, set(key,value) {try{localStorage.setItem(key,JSON.stringify(value));}catch{ toast('Your browser could not save this preference.'); }} };
let data = structuredClone(demo), tab = ['library','finish','insights'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'library';
let filter='all',query='',sort='recent',configured=false,busy=false,epoch=0,selected=null,achFilter='remaining',achQuery='',revealed=new Set();
let toastTimer, cacheTimer, cacheWarning=false, cacheDirty=false;
let availabilityRun=null, timesBusy=false;
let finishSort=resolveFinishSort(storage.get('checkpoint:finish-sort',null));
function persistProfile(){
 clearTimeout(cacheTimer);cacheTimer=null;
 if(data.mode!=='live'||!cacheDirty)return Promise.resolve();
 cacheDirty=false;
 return saveProfile(data).then(saved=>{if(!saved&&!cacheWarning){cacheWarning=true;toast('Browser storage is unavailable. This library cannot be saved for next time.');}});
}
function scheduleCache(){cacheDirty=true;if(!cacheTimer)cacheTimer=setTimeout(()=>{cacheTimer=null;persistProfile();},2000);}
function savedTime(){return data.fetchedAt?new Date(data.fetchedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'earlier';}
function refreshWait(){const shared=storage.get(`checkpoint:refresh:${data.profile.id}`,0);return Math.max(0,Math.ceil((Math.max(data.refreshStartedAt||0,Number(shared)||0)+REFRESH_COOLDOWN-Date.now())/60000));}
function markRefresh(){cacheDirty=true;data.refreshStartedAt=Date.now();storage.set(`checkpoint:refresh:${data.profile.id}`,data.refreshStartedAt);}
const pinKey = () => `checkpoint:pins:${data.profile.id}`;
const pins = () => { const p=storage.get(pinKey(),data.mode==='demo'?[1145360,504230,1332010]:[]);return Array.isArray(p)?p.filter(Number.isInteger):[]; };
const isSaved = id => pins().includes(id);
const image = (id,hero=false) => `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${Number(id)}/${hero?'library_hero.jpg':'header.jpg'}`;
const safeImage = value => {try {const u=new URL(value);return u.protocol==='https:'?esc(u.href):'';}catch{return '';} };
const hours = minutes => `${new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(minutes/60)}h`;
const ring = percent => `<svg class="ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="track" cx="20" cy="20" r="16" pathLength="100"/><circle class="value" cx="20" cy="20" r="16" pathLength="100" stroke-dashoffset="${100-percent}"/></svg>`;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function derived(){const ready=data.games.filter(g=>g.status==='ready');const total=ready.reduce((n,g)=>n+g.total,0);const unlocked=ready.reduce((n,g)=>n+g.unlocked,0);return {ready,total,unlocked,percent:total?Math.round(unlocked/total*100):0,complete:ready.filter(g=>g.total>0&&g.unlocked===g.total).length,checked:data.games.filter(g=>g.status!=='pending'&&!g.needsRefresh).length,pending:data.games.filter(g=>g.status==='pending'||g.needsRefresh).length,failed:data.games.filter(g=>g.status==='error'||g.refreshError).length};}
function updateShell(){
 const labels={library:'Library',finish:'Finish next',insights:'Your stats'};
 const nav=Object.entries(labels).map(([key,label])=>`<a class="nav-item ${tab===key?'active':''}" href="#${key}" ${tab===key?'aria-current="page"':''}>${icon(key==='library'?'library':key==='finish'?'flag':'chart')}<span>${label}</span>${key==='finish'&&pins().length?`<span class="nav-count">${pins().length}</span>`:''}</a>`).join('');
 $('#desktop-nav').innerHTML=nav;$('#mobile-nav').innerHTML=nav;$('#breadcrumb').textContent=labels[tab];
 $('#profile-name').textContent=data.profile.name;$('#profile-mode').textContent=data.mode==='demo'?'Exploring the demo':'Public Steam profile';
 $('#source-badge').innerHTML=`<i></i> ${data.mode==='demo'?'Demo profile':'Steam profile'}`;
 $('#connect-label').textContent=data.mode==='demo'?'Connect Steam':'Manage profile';
 $('#avatar').innerHTML=data.profile.avatar?`<img src="${safeImage(data.profile.avatar)}" alt="">`:'p1';
 document.title=`${labels[tab]} · Checkpoint`;
}
function stats(){const s=derived();return `<div class="stats" aria-label="${data.mode==='demo'?'Sample ':''}Library statistics"><div class="stat"><div class="stat-label">${icon('trophy')} Achievements</div><div class="stat-value">${s.unlocked.toLocaleString()}<em>of ${s.total.toLocaleString()}</em></div></div><div class="stat"><div class="stat-label">${icon('circle')} Perfect games</div><div class="stat-value">${s.complete}<em>at 100%</em></div></div><div class="stat"><div class="stat-label">${icon('chart')} Completion</div><div class="stat-value">${s.percent}<span style="font-size:.65em">%</span><em>overall</em></div></div><div class="stat"><div class="stat-label">${icon('library')} In your library</div><div class="stat-value">${data.games.length.toLocaleString()}<em>games</em></div></div></div>`;}
function syncNote(){const s=derived();if(data.mode==='demo')return '';return `<div class="loading-notice">${busy&&s.pending?'<span class="loading-dot"></span>':''}${busy&&s.pending?`Updating ${s.pending} games · saved progress stays visible.`:`Saved on this device · ${savedTime()}. No automatic refresh.`}${!busy&&s.pending?` ${s.pending} games still to check. Refresh Steam to continue.`:''}${s.failed?` ${s.failed} unavailable.<button class="retry-button" data-action="retry">Retry</button>`:''}</div>`;}
function issueBadge(g){const count=gameFindings(g).filter(item=>!item.achievement.unlocked).length;return count?`<span class="availability-badge">${icon('info')} ${count} availability ${count===1?'issue':'issues'}</span>`:'';}
function issueSources(rule){return rule.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.title)} ${icon('external')}</a>`).join('');}
function achievementWarning(g,a){return achievementIssues(g,a).map(rule=>`<details class="achievement-warning" data-warning="${g.id}:${esc(a.id)}:${esc(rule.key)}"><summary>${icon('info')}<span>${esc(rule.label)}${a.unlocked?' · already unlocked':''}</span>${icon('chevron')}</summary><div><p>${esc(rule.reason)}</p>${issueSources(rule)}</div></details>`).join('');}
function showAvailability(){
 const report=libraryAvailability(data.mode==='live'?data.games:[]);
 const games=data.mode==='live'?data.games:[];
 const coverage=sourceCoverage(games);
 const pendingSource=games.filter(g=>!freshAvailability(cachedAvailability(g.id))).length;
 const affected=[...new Set(report.remaining.map(item=>item.game.id))].length;
 const dialog=$('#availability-dialog'),scroll=dialog.scrollTop;
 const openResults=new Set([...dialog.querySelectorAll('.availability-result[open]')].map(el=>el.dataset.availabilityResult));
 const unknownOpen=dialog.querySelector('.availability-unknown')?.open;
 const focusAction=dialog.contains(document.activeElement)?document.activeElement.dataset.action:null;
 const running=availabilityRun?.running&&availabilityRun.profile===data.profile.id;
 const failed=availabilityRun?.profile===data.profile.id?availabilityRun.failed:0;
 const unknown=games.filter(g=>{const value=cachedAvailability(g.id);return !value||value.achievementCount!==(g.total||0)||!['ready','none'].includes(g.status)||value.flags.some(flag=>!(g.achievements||[]).some(a=>a.id===flag.apiName));});
 dialog.innerHTML=`${sheetToolbar('availability-dialog','Close availability check')}<div class="dialog-padding"><div class="dialog-top"><span class="dialog-logo">${icon('info')}</span></div><h2 id="availability-title">Achievement availability</h2><p class="dialog-description">Known unobtainable, conditional and broken achievements, checked against your saved library. No Steam requests.</p><div class="availability-summary"><strong>${report.remaining.length} locked ${report.remaining.length===1?'achievement':'achievements'} to review</strong><span>Across ${affected} ${affected===1?'game':'games'} · ${report.findings.filter(item=>item.achievement.unlocked).length} flagged ${report.findings.filter(item=>item.achievement.unlocked).length===1?'achievement':'achievements'} already unlocked</span><span class="availability-types">${report.remaining.filter(x=>['unobtainable','reported'].includes(x.rule.kind)).length} reported unobtainable · ${report.remaining.filter(x=>x.rule.kind==='conditional').length} conditional · ${report.remaining.filter(x=>x.rule.kind==='broken').length} broken but obtainable</span></div><div class="availability-check-status"><div><strong>${coverage.checked} of ${games.length} games checked</strong><span>${coverage.unknown} unknown · ${coverage.stale} saved checks older than 24 hours</span></div>${data.mode==='live'?`<button class="secondary-button" data-action="${running?'pause-availability':'scan-availability'}" ${!running&&!pendingSource?'disabled':''}>${icon(running?'close':!pendingSource?'check':'refresh')}${running?'Pause check':!pendingSource?'All checks saved':'Check remaining games'}</button>`:''}</div>${running?`<div class="loading-notice" role="status"><span class="loading-dot"></span>Checking SteamHunters · ${availabilityRun.done} of ${availabilityRun.total}. You can close this sheet.</div>`:''}${failed?`<p class="availability-coverage">${failed} source requests failed.${availabilityRun?.outage?' The check paused to avoid repeated requests.':''} Saved results are kept; failed games remain unknown. Try again later.</p>`:''}<p class="availability-coverage">Community availability from <a href="https://steamhunters.com" target="_blank" rel="noreferrer">SteamHunters</a>, cached for 24 hours. No Steam scan and no automatic refresh. “No reported flags” does not guarantee every achievement is obtainable. Additional sourced notes reviewed ${reviewedAt}.</p>${unknown.length?`<details class="availability-unknown"><summary>${unknown.length} ${unknown.length===1?'game needs':'games need'} a matching source check</summary><p>${unknown.map(g=>esc(g.name)).join(' · ')}</p><p>Missing source data, mismatched achievement totals and unavailable Steam progress stay unknown.</p></details>`:''}${data.mode==='demo'?'<p class="availability-coverage">Connect a real Steam profile to check your own library.</p>':''}<div class="availability-results">${report.listed.length?report.listed.map(g=>{const findings=gameFindings(g);return `<details class="availability-result" data-availability-result="${g.id}"><summary><span>${esc(g.name)}</span><small>${findings.some(item=>!item.achievement.unlocked)?`${findings.filter(item=>!item.achievement.unlocked).length} locked`:`${findings.length} already unlocked`}</small>${icon('chevron')}</summary><div class="availability-result-body">${rulesFor(g).map(rule=>{const matches=findings.filter(item=>item.rule.key===rule.key);return `<span class="availability-badge">${esc(rule.label)}</span><p>${esc(rule.reason)}</p><p class="availability-caveat">${esc(rule.caveat)}</p><ul>${matches.map(({achievement:a})=>`<li><strong>${a.hidden&&!a.unlocked&&!revealed.has(a.id)?'Hidden achievement':esc(a.name)}</strong><span>${a.unlocked?'Already unlocked':'Locked · review condition'}</span></li>`).join('')}</ul>${!matches.length?'<p class="availability-caveat">No matching achievement in the saved data. This does not confirm the issue is resolved.</p>':''}<div class="availability-sources">${issueSources(rule)}</div>`;}).join('')}<button class="secondary-button" data-availability-game="${g.id}">View game achievements ${icon('arrow')}</button></div></details>`;}).join(''):'<p class="availability-coverage">No availability flags found in the checked games. Unchecked games remain unknown.</p>'}</div><p class="stats-note">Availability notes do not change your real Steam completion totals. Low unlock rates, hidden achievements and API errors are never treated as proof of an unobtainable achievement.</p></div>`;
 for(const el of dialog.querySelectorAll('.availability-result'))el.open=openResults.has(el.dataset.availabilityResult);
 if(unknownOpen&&dialog.querySelector('.availability-unknown'))dialog.querySelector('.availability-unknown').open=true;
 if(!dialog.open)dialog.showModal();
 if(focusAction)dialog.querySelector(`[data-action="${focusAction}"]`)?.focus({preventScroll:true});
 dialog.scrollTop=scroll;
}
async function scanAvailability(){
 if(data.mode!=='live'||availabilityRun?.running)return;
 const games=data.games.filter(g=>!freshAvailability(cachedAvailability(g.id)));
 if(!games.length){showAvailability();return;}
 const key=`checkpoint:availability-check:${data.profile.id}`;
 if(!availabilityRun?.paused&&Number(storage.get(key,0))+120000>Date.now()){toast('Availability was checked recently. Try again in a moment.');return;}
 storage.set(key,Date.now());
 const run={profile:data.profile.id,running:true,done:0,total:games.length,failed:0};availabilityRun=run;showAvailability();
 let next=0,lastPaint=0;
 const worker=async()=>{
  while(run.running&&data.profile.id===run.profile&&next<games.length){
   const game=games[next++];
   try{await loadAvailability(game.id,request);run.consecutive=0;}catch{run.failed++;run.consecutive=(run.consecutive||0)+1;if(run.consecutive>=3){run.running=false;run.outage=true;}}
   run.done++;
   if($('#availability-dialog').open&&Date.now()-lastPaint>400){lastPaint=Date.now();showAvailability();}
   await new Promise(resolve=>setTimeout(resolve,650));
  }
 };
 await worker();run.running=false;
 if(data.profile.id!==run.profile)return;
 render();if($('#detail-dialog').open)renderDetail();if($('#availability-dialog').open)showAvailability();
 toast(run.failed?`Availability check saved · ${run.failed} unavailable.`:'Availability checks saved.');
}
function demoNote(){return data.mode==='demo'?`<div class="demo-note">${icon('info')}<span>You’re exploring a demo. Progress is fictional and achievement lists are curated samples. <button data-action="connect">Make it yours with Steam</button></span></div>`:'';}
function empty(title,body,action='reset',label='Reset filters'){return `<div class="empty">${icon('flag')}<h3>${esc(title)}</h3><p>${esc(body)}</p>${action?`<button class="secondary-button" data-action="${action}">${esc(label)}</button>`:''}</div>`;}
function progress(g){if(g.status==='pending')return `<span class="unknown">Checking achievements…</span>`;if(g.status==='error')return `<span class="unknown">Progress unavailable · open to retry</span>`;if(g.status==='none')return `<span class="unknown">No achievements listed</span>`;return `<div class="progress-label"><span>${g.unlocked} / ${g.total} achievements</span><strong>${g.percent}%</strong></div><div class="progress-track" style="--progress:${g.percent}%"><span></span></div>`;}
const rateText=value=>value===0?'0%':value<0.1?'<0.1%':`${value.toFixed(1)}%`;
function raritySummary(g){
 if(g.status!=='ready'||g.total<=g.unlocked)return '';
 const r=remainingRarity(g);
 return `<div class="remaining-rarity"><span>Remaining rarity${data.mode==='demo'?' · sample':''}</span>${r.known?`<strong>Avg ${esc(rateText(r.average))}</strong><small>Rarest ${esc(rateText(r.rarest))}</small>`:'<small>Rates unavailable</small>'}${r.known&&!r.complete?`<small class="rarity-coverage">${r.known} of ${r.total} rates available</small>`:''}</div>`;
}
function completionTimeSummary(g){
 if(data.mode==='demo'||g.status!=='ready'||g.total<=g.unlocked)return '';
 const ref=timeReference(g);
 return `<div class="completion-time"><span>100% time</span><strong>${ref?formatCompletionTime(ref.medianMinutes):'Unavailable'}</strong><small>${ref?(ref.reliable?'Community median · full game':'Limited community data'):'No matching community estimate'}</small></div>`;
}
async function updateTimeReferences(){
 if(timesBusy||data.mode!=='live')return;
 timesBusy=true;render();
 try{await loadTimes(data.games.map(g=>g.id),request);toast('Community time references saved.');}catch(error){toast(error.message||'Time references are unavailable. Saved data was kept.');}
 finally{timesBusy=false;render();}
}
function card(g){return `<article class="game-card"><button class="game-open" data-game="${g.id}" aria-label="View ${esc(g.name)} achievements"><div class="game-image"><img src="${image(g.id)}" alt="" loading="lazy">${g.total>0&&g.percent===100?`<span class="complete-tag">${icon('check')} Perfect game</span>`:''}</div><div class="game-body"><h3 class="game-title">${esc(g.name)}</h3><div class="game-meta">${g.genre?`${esc(g.genre)} <i></i> `:''}${hours(g.minutes)} played</div>${tab==='finish'&&g.status==='ready'?`<div class="finish-remaining"><strong>${(g.total-g.unlocked).toLocaleString()}</strong> ${g.total-g.unlocked===1?'achievement':'achievements'} left</div>`:''}${progress(g)}${raritySummary(g)}${completionTimeSummary(g)}${issueBadge(g)}</div></button><button class="pin-button ${isSaved(g.id)?'saved':''}" data-pin="${g.id}" aria-label="${isSaved(g.id)?'Remove':'Add'} ${esc(g.name)} ${isSaved(g.id)?'from':'to'} finish next" aria-pressed="${isSaved(g.id)}">${icon('pin')}</button></article>`;}
function filtered(){return data.games.filter(g=>g.name.toLowerCase().includes(query.toLowerCase())&&(filter==='all'||filter==='progress'&&g.status==='ready'&&g.unlocked<g.total||filter==='complete'&&g.total>0&&g.percent===100)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='completion'?(b.percent??-1)-(a.percent??-1):sort==='playtime'?b.minutes-a.minutes:b.lastPlayed-a.lastPlayed||b.minutes-a.minutes);}
function focusSection(){const incomplete=finishCandidates(data.games,{demo:data.mode==='demo'});const pinned=pins().map(id=>incomplete.find(g=>g.id===id)).filter(Boolean);const focus=pinned[0]||incomplete[0];if(!focus)return data.mode==='live'?`<div class="shortlist-intro">${icon('info')}<span>No eligible suggestions yet. Suggestions need matching availability data and no locked unobtainable, conditional or workaround-dependent achievements. <button class="text-button" data-action="availability">View availability</button></span></div>`:'';const queue=[...pinned.filter(g=>g.id!==focus.id),...incomplete.filter(g=>!pinned.includes(g)&&g.id!==focus.id)].slice(0,3);return `<div class="section-heading"><h2>Continue playing</h2><a class="text-button" href="#finish">Finish next ${icon('arrow')}</a></div><div class="focus-layout"><button class="hero" data-game="${focus.id}" aria-label="Continue with ${esc(focus.name)}"><img class="hero-art" src="${image(focus.id,true)}" alt=""><span class="pill">Suggested</span><h3>${esc(focus.name)}</h3><p>${focus.total-focus.unlocked} achievements left.</p><div class="hero-bottom"><span class="primary-button">See what’s left ${icon('arrow')}</span><span class="hero-progress">${ring(focus.percent)}<strong>${focus.percent}%</strong></span></div></button><div class="queue-card"><div class="queue-heading"><h3>Next up</h3><span>Availability checked</span></div>${queue.map(g=>`<div class="queue-row"><button class="queue-open" data-game="${g.id}"><img class="queue-thumb" src="${image(g.id)}" alt=""><span class="queue-copy"><strong>${esc(g.name)}</strong><small>${g.total-g.unlocked} achievements left</small></span><span class="queue-percent">${g.percent}%</span></button></div>`).join('')}</div></div>`;}
function library(){return `<section class="page-enter"><div class="intro"><div><h1>Library</h1><p>Your Steam games and achievements.</p></div><div class="intro-aside">${data.mode==='demo'?'A space for your next 100%.<br><span>Let’s make a little progress.</span>':`<span>Read-only · public profile</span>`}</div></div>${syncNote()}<div class="availability-entry"><button class="secondary-button" data-action="availability">${icon('info')} Check availability</button><span>Checks your saved library</span>${data.mode==='live'?`<button class="sync-button" data-action="refresh" ${busy?'disabled aria-disabled="true"':''}>${icon('refresh',busy?'spinning':'')} Refresh Steam</button>`: ''}</div>${stats()}${focusSection()}<div class="section-heading library-heading"><h2>Your library <span>${data.games.length}</span></h2><span class="text-button" id="result-count">${filtered().length} ${filtered().length===1?'game':'games'}</span></div><div class="toolbar"><div class="segmented" aria-label="Filter games">${[['all','All games'],['progress','In progress'],['complete','Completed']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="filter-controls"><label class="search">${icon('search')}<input id="game-search" type="search" placeholder="Find a game…" aria-label="Search games" value="${esc(query)}"></label><div class="select-wrap"><select id="sort" aria-label="Sort games"><option value="recent">Recently played</option><option value="completion">Closest to 100%</option><option value="name">Name A–Z</option><option value="playtime">Most played</option></select></div></div></div><div id="games-container">${renderGames()}</div>${demoNote()}</section>`;}
function renderGames(){const list=filtered();return list.length?`<div class="game-grid">${list.map(card).join('')}</div>`:data.games.length?empty('No games here yet.','Try a different search or filter.'):empty('No games.','This public Steam library has no visible games.','connect','Try another profile');}
function finish(){
 const list=pins().map(id=>data.games.find(g=>g.id===id)).filter(Boolean);
 const suggestions=finishCandidates(data.games,{demo:data.mode==='demo',sort:finishSort});
 const staleTimes=data.mode==='live'?data.games.filter(g=>!freshTime(cachedTime(g.id))).length:0;
 const explanation=finishSort==='time'?'Sorted by community full-completion time. This is not the time left for your save.':finishSort==='easiest'?'Balances achievements left, their unlock rates and community completion time. Shorter games receive a moderate boost. This is an estimate, not a difficulty rating.':finishSort==='rarity'?'Ranks games by their rarest remaining achievement, with more common unlocks first. Unlock rates are not a difficulty rating.':finishSort==='remaining'?'Sorted by achievements left, then completion percentage.':'Sorted by exact achievement completion percentage.';
 return `<section class="page-enter finish-page"><div class="intro app-intro"><div><h1>Finish next</h1><p>${suggestions.length} games to consider</p></div></div>${busy?syncNote():''}${list.length?`<div class="section-heading"><h2>Saved <span>${list.length}</span></h2></div><div class="shortlist-grid">${list.map(card).join('')}</div>`:''}<div class="section-heading finish-heading"><h2>Recommended</h2><label class="select-wrap"><select id="finish-sort" aria-label="Sort Finish next"><option value="easiest" ${finishSort==='easiest'?'selected':''}>Easiest to finish</option><option value="completion" ${finishSort==='completion'?'selected':''}>Closest to 100%</option><option value="remaining" ${finishSort==='remaining'?'selected':''}>Fewest remaining</option><option value="rarity" ${finishSort==='rarity'?'selected':''}>Most common remaining</option><option value="time" ${finishSort==='time'?'selected':''}>Shortest 100% time</option></select></label></div><details class="recommendation-info"><summary>About recommendations ${icon('chevron')}</summary><div><p>${explanation}${['easiest','rarity','time'].includes(finishSort)?' Missing or limited data comes last.':''}</p><p>Games with locked unobtainable, conditional or workaround-dependent achievements are excluded. Saved games stay on your shortlist.</p><p>Time references are <a href="https://steamhunters.com" target="_blank" rel="noreferrer">SteamHunters</a> full-completion medians, not remaining hours. Cached for 7 days. Steam progress stays saved on this device until you refresh it.</p><button class="text-button" data-action="availability">View availability</button>${staleTimes?`<button class="text-button" data-action="update-times" ${timesBusy?'disabled':''}>${timesBusy?'Updating…':'Update time references'}</button>`:''}</div></details>${suggestions.length?`<div class="game-grid finish-suggestions">${suggestions.map(card).join('')}</div>`:empty('No recommendations yet.','Check availability or start a game to see it here.','availability','View availability')}${demoNote()}</section>`;
}
function insights(){const s=derived();const groups=[['Perfect games',s.complete],['Almost there · 75–99%',s.ready.filter(g=>g.percent>=75&&g.percent<100).length],['Making progress · 1–74%',s.ready.filter(g=>g.percent>0&&g.percent<75).length],['A fresh start · 0%',s.ready.filter(g=>g.total>0&&g.percent===0).length]];return `<section class="page-enter"><div class="intro"><div><h1>Stats</h1><p>Your achievement progress.</p></div></div>${syncNote()}${stats()}<div class="insight-grid"><div class="insight-panel"><h2>Completion</h2><p>Games grouped by progress.</p>${groups.map(([name,count])=>`<div class="distribution-row"><div class="distribution-label"><span>${name}</span><strong>${count} ${count===1?'game':'games'}</strong></div><div class="progress-track" style="--progress:${s.ready.length?count/s.ready.length*100:0}%"><span></span></div></div>`).join('')}</div><div class="insight-panel"><h2>Overall completion</h2><p>Achievement completion across checked games.</p><div class="big-ring">${ring(s.percent)}<div class="ring-label">${s.percent}%<small>of achievements unlocked</small></div></div><div class="insight-foot">${s.unlocked.toLocaleString()} unlocked · ${(s.total-s.unlocked).toLocaleString()} remaining</div></div></div><p class="stats-note">Completion = unlocked achievements ÷ total achievements in games with available data. Games without achievements and unavailable progress are excluded. ${data.mode==='demo'?'These are sample statistics.':`${s.checked} of ${data.games.length} games checked; ${s.failed} unavailable.`}</p>${demoNote()}</section>`;}
function render(animate=false){const infoOpen=$('.recommendation-info')?.open;const focused=document.activeElement;const focusId=focused?.id;const position=focused?.selectionStart;updateShell();$('#main').innerHTML=tab==='finish'?finish():tab==='insights'?insights():library();if(!animate)$('#main').firstElementChild?.classList.remove('page-enter');if($('#sort'))$('#sort').value=sort;if(infoOpen&&$('.recommendation-info'))$('.recommendation-info').open=true;if(focusId&&$('#'+focusId)){const el=$('#'+focusId);el.focus({preventScroll:true});if(typeof position==='number'&&el.setSelectionRange)el.setSelectionRange(position,position);}}
function updateGames(){ $('#games-container').innerHTML=renderGames();$('#result-count').textContent=`${filtered().length} ${filtered().length===1?'game':'games'}`; }
function togglePin(id){const list=pins();const had=list.includes(id);storage.set(pinKey(),had?list.filter(x=>x!==id):[...list,id]);render();if(selected===id&&$('#detail-dialog').open)renderDetail();toast(had?'Removed from Finish next':'Saved to Finish next');}
function showConnect(){const dialog=$('#connect-dialog');dialog.innerHTML=`${sheetToolbar('connect-dialog','Close profile connection')}<div class="dialog-padding"><div class="dialog-top"><span class="dialog-logo">${icon('library')}</span></div><h2 id="connect-title">Connect Steam</h2><p class="dialog-description">View achievements from a public Steam profile.</p>${!configured?`<div class="setup-note"><strong>One small setup first</strong>The secure Steam connection is deployed. Its owner needs to add the server-side Steam API key before profiles can load. No API key should be entered in this page.<br><a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer">Get a Steam API key ↗</a></div>`:''}<form id="profile-form"><label class="field-label" for="profile-input">Your public Steam profile</label><input class="profile-input" id="profile-input" name="profile" placeholder="steamcommunity.com/id/yourname" required maxlength="180" autocomplete="off" value="${data.mode==='live'?esc(data.profile.id):''}"><p class="form-help">Profile URL, custom name, or SteamID64. Set Profile and Game details to Public in Steam’s Privacy Settings.</p><div id="profile-error" role="alert"></div><button class="primary-button wide" type="submit" id="submit-profile">View my library ${icon('arrow')}</button></form><div class="dialog-footer"><button data-action="demo">${data.mode==='live'?'Disconnect & explore the demo':'Keep exploring the demo'}</button></div><p class="privacy">No Steam password. No account changes. This reads a public profile; it does not sign you in or verify ownership. Your library, achievements, shortlist and last profile are saved on this device. Returning does not refresh Steam automatically. Disconnect clears the saved Steam library.</p></div>`;if(!dialog.open)dialog.showModal();}
async function request(path,params){
 const url = new URL(backend.url);
 url.search = new URLSearchParams({endpoint:path,...params});
 const response = await fetch(url,{headers:{Authorization:`Bearer ${backend.anonKey}`,apikey:backend.anonKey},credentials:'omit',signal:AbortSignal.timeout(30000)});
 let result; try {result=await response.json();} catch {throw new Error('The Steam connection returned an unreadable response. Please try again.');}
 if(!response.ok)throw new Error(result.error||result.message||'Steam could not be reached. Please try again shortly.');
 return result;
}

async function connect(input,{refresh=false}={}){
 if(busy)return;
 if(!refresh&&data.mode==='live'&&matchesProfile(data,input)){ $('#connect-dialog').close();toast('Your saved library is already loaded. Use Refresh Steam to update it.');return;}
 if(refresh&&refreshWait()){toast(`Steam was checked recently. Try again in ${refreshWait()} minutes.`);return;}
 const button=$('#submit-profile');if(button){button.disabled=true;button.textContent='Finding your library…';}
 const previous=data.mode==='live'?data:null;
 const ticket=++epoch;busy=true;
 if(refresh){markRefresh();await persistProfile();}
 try{
  const next=await request('library',{profile:input});if(ticket!==epoch)return;
  data=mergeLibrary(next,previous);data.aliases=[...new Set([input,...(previous?.profile.id===next.profile.id?previous.aliases||[]:[])])];markRefresh();
  storage.set('checkpoint:profile',data.profile.id);filter='all';query='';tab='library';location.hash='library';
  $('#connect-dialog').close();$('#detail-dialog').close();render();await persistProfile();
  toast(refresh?'Updating changed games. Saved progress stays visible.':`Welcome, ${data.profile.name}. Your games are here.`);
  await hydrate(ticket);
 }catch(error){
  if(ticket!==epoch)return;
  const message=error.name==='TimeoutError'?'Steam took a little too long. Your saved data is still here.':error.message;
  if($('#profile-error')&&$('#connect-dialog').open)$('#profile-error').innerHTML=`<div class="form-error">${esc(message)}</div>`;else toast(message);
 }finally{if(ticket===epoch){busy=false;render();}if(button?.isConnected){button.disabled=false;button.innerHTML=`View my library ${icon('arrow')}`;}}
}
let renderTimer;
function scheduleRender(){if(renderTimer)return;renderTimer=setTimeout(()=>{renderTimer=null;render();if($('#detail-dialog').open)renderDetail();},750);}
const loadingGames = new Map();
function loadGame(g,ticket){
 const jobKey = `${ticket}:${g.id}`;
 if(loadingGames.has(jobKey))return loadingGames.get(jobKey);
 const job = (async()=>{
  try{const details=await request('achievements',{profile:data.profile.id,appid:g.id});if(ticket!==epoch)return;Object.assign(g,details);g.checkedAt=Date.now();delete g.needsRefresh;delete g.refreshError;delete g.error;scheduleCache();}
  catch(error){if(ticket!==epoch)return;if(g.status==='ready'||g.status==='none')g.refreshError=error.message;else{g.status='error';g.error=error.message;}delete g.needsRefresh;scheduleCache();}
  if(ticket===epoch)scheduleRender();
 })().finally(()=>loadingGames.delete(jobKey));
 loadingGames.set(jobKey,job);return job;
}

async function hydrate(ticket=epoch,onlyFailed=false){
 const queue=data.games.filter(g=>onlyFailed?g.status==='error'||g.refreshError:g.status==='pending'||g.needsRefresh);
 const worker=async()=>{while(queue.length&&ticket===epoch){const g=queue.shift();if(g.status==='pending'||g.needsRefresh||g.status==='error'||g.refreshError)await loadGame(g,ticket);if(queue.length)await new Promise(resolve=>setTimeout(resolve,650));}};
 await Promise.all([worker(),worker()]);
 if(ticket===epoch){busy=false;await persistProfile();render();if($('#detail-dialog').open)renderDetail();}
}
const playerLoading=new Set(),playerErrors=new Set();
function playerPanel(g){
 if(data.mode!=='live')return '';
 const value=cachedPlayers(g.id),stale=value&&value.fetchedAt+PLAYER_TTL<=Date.now();
 const status=value?`Checked ${new Date(value.fetchedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}${stale?' · saved count':''}`:playerErrors.has(g.id)?'Temporarily unavailable':playerLoading.has(g.id)?'Checking Steam…':'Not checked';
 return `<div class="players-panel"><div><span class="player-caption"><i></i> STEAM ACTIVITY</span><strong>${value?`${value.count.toLocaleString()} <em>players online</em>`:'Players online'}</strong><small>${status} · cached for 15 minutes</small></div><a href="https://steamcharts.com/app/${g.id}" target="_blank" rel="noreferrer">SteamCharts ${icon('external')}</a></div>`;
}
function checkPlayers(id){
 if(data.mode!=='live')return;
 const saved=cachedPlayers(id);if(saved&&saved.fetchedAt+PLAYER_TTL>Date.now())return;
 playerLoading.add(id);playerErrors.delete(id);
 loadPlayers(id,request).catch(()=>playerErrors.add(id)).finally(()=>{playerLoading.delete(id);if(data.mode==='live'&&selected===id&&$('#detail-dialog').open)renderDetail();});
}
function renderDetail(){const g=data.games.find(g=>g.id===selected);if(!g)return;const dialog=$('#detail-dialog');dialog.classList.add('detail-dialog');const focused=document.activeElement?.id;const position=document.activeElement?.selectionStart;const scroll=dialog.scrollTop;const openWarnings=new Set([...dialog.querySelectorAll('[data-warning][open]')].map(el=>el.dataset.warning));const all=g.achievements||[];const achievements=all.filter(a=>(achFilter==='all'||achFilter==='unlocked'&&a.unlocked||achFilter==='remaining'&&!a.unlocked||achFilter==='issues'&&achievementIssues(g,a).length>0)&&(a.hidden&&!a.unlocked&&!revealed.has(a.id)?!achQuery:`${a.name} ${a.description}`.toLowerCase().includes(achQuery.toLowerCase()))).sort((a,b)=>achFilter==='unlocked'?b.unlockedAt-a.unlockedAt:(b.rarity??0)-(a.rarity??0));
 dialog.innerHTML=`${sheetToolbar('detail-dialog','Close game detail')}<div class="detail-hero"><img src="${image(g.id,true)}" alt=""><div class="eyebrow">${data.mode==='demo'?'DEMO · CURATED SAMPLE':'YOUR STEAM PROGRESS'}</div><h2 id="detail-title">${esc(g.name)}</h2><p class="detail-sub">${hours(g.minutes)} played ${g.status==='ready'?`· ${g.unlocked} of ${g.total} ${data.mode==='demo'?'sample ':''}achievements unlocked`:''}</p>${g.status==='ready'?`<div class="detail-progress"><div class="progress-track" style="--progress:${g.percent}%"><span></span></div><strong>${g.percent}%</strong></div>`:''}</div><div class="detail-content">${playerPanel(g)}${data.mode==='live'&&g.status==='ready'&&g.total>g.unlocked?`<div class="time-detail">${completionTimeSummary(g)}<a href="https://steamhunters.com/apps/${g.id}/achievements" target="_blank" rel="noreferrer">Time source ${icon('external')}</a><p>Full-completion median, not your remaining time. No progress-based hours are inferred.</p></div>`:''}<div class="availability-detail-note"><button data-action="availability">${icon('info')}<span><strong>Achievement availability</strong><small>${rulesFor(g).length?'View sourced issues & conditions':sourceCoverage([g]).checked?'No reported flags · view coverage':'Incomplete check · availability unknown'}</small></span>${icon('chevron')}</button><a href="https://steamhunters.com/apps/${g.id}/achievements" target="_blank" rel="noreferrer">${icon('external')}<span>Research on SteamHunters</span>${icon('chevron')}</a></div><div class="detail-actions"><button class="secondary-button" data-pin="${g.id}" aria-pressed="${isSaved(g.id)}">${icon(isSaved(g.id)?'check':'pin')} ${isSaved(g.id)?'Saved to Finish next':'Add to Finish next'}</button><a class="secondary-button" href="https://steamcommunity.com/app/${g.id}/guides/" target="_blank" rel="noreferrer">Community guides ${icon('external')}</a></div>${g.status==='pending'?'<div class="loading-notice"><span class="loading-dot"></span>Checking your achievements with Steam…</div>':g.status==='error'?`<div class="form-error">${esc(g.error||'Progress is unavailable.')}<br><button class="text-button" data-retry-game="${g.id}">Try again ${icon('refresh')}</button></div>`:g.status==='none'?empty('No achievements.','Steam lists no achievements for this game.','', ''):`<div class="achievement-toolbar"><div class="segmented" aria-label="Filter achievements">${[['remaining','Remaining'],['unlocked','Unlocked'],['all','All'],...(gameFindings(g).length?[["issues","Availability"]]:[])].map(([key,label])=>`<button data-ach-filter="${key}" class="${achFilter===key?'active':''}" aria-pressed="${achFilter===key}">${label} ${key==='remaining'?g.total-g.unlocked:key==='unlocked'?g.unlocked:key==='issues'?gameFindings(g).length:g.total}</button>`).join('')}</div><label class="search">${icon('search')}<input id="achievement-search" type="search" value="${esc(achQuery)}" placeholder="Find an achievement…" aria-label="Search achievements"></label></div><div class="achievement-list">${achievements.length?achievements.map(a=>{const hidden=a.hidden&&!a.unlocked&&!revealed.has(a.id);return `<article class="achievement"><div class="achievement-icon ${a.unlocked?'':'locked'}">${!hidden&&(a.unlocked?a.icon:a.iconGray)?`<img src="${safeImage(a.unlocked?a.icon:a.iconGray)}" alt="" loading="lazy">`:icon(a.unlocked?'trophy':'lock')}</div><div class="achievement-copy"><h3>${hidden?'Hidden achievement':esc(a.name)}</h3><p>${hidden?'There’s something left to discover.':esc(a.description||'Steam has no description for this achievement.')}</p>${!hidden?achievementWarning(g,a):''}${hidden?`<button class="hidden-reveal" data-reveal="${esc(a.id)}">Reveal spoiler</button>`:''}</div><div class="rarity">${a.rarity!==null?`${a.rarity.toFixed(1)}%`:'—'}<small>${data.mode==='demo'?'sample rarity':'of players'}</small>${a.unlocked?`<small>${new Date(a.unlockedAt*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>`:''}</div></article>`;}).join(''):empty(achQuery?'Nothing matches that search.':achFilter==='remaining'?'All unlocked.':'No achievements here yet.',achQuery?'Try another achievement name.':achFilter==='remaining'?'Every achievement in this list is unlocked.':'Play the game to unlock achievements.','', '')}</div>`}${data.mode==='demo'?'<p class="stats-note">Demo only. This curated list and fictional progress do not represent a real account or the game’s complete Steam achievement list.</p>':''}</div>`;
 if(focused==='achievement-search'){$('#achievement-search')?.focus({preventScroll:true});$('#achievement-search')?.setSelectionRange(position,position);}for(const el of dialog.querySelectorAll('[data-warning]'))if(openWarnings.has(el.dataset.warning))el.open=true;dialog.scrollTop=scroll;
}
function openGame(id){selected=id;achFilter='remaining';achQuery='';revealed.clear();checkPlayers(id);$('#detail-dialog').scrollTop=0;renderDetail();$('#detail-dialog').showModal();$('#detail-dialog').scrollTop=0;const game=data.games.find(g=>g.id===id);if(data.mode==='live'&&game?.status==='pending'&&!busy)loadGame(game,epoch);}
const closingSheets=new WeakSet();
async function closeSheet(dialog){
 if(!dialog?.open||closingSheets.has(dialog))return;
 closingSheets.add(dialog);
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const mobile=window.matchMedia('(max-width: 760px)').matches;
  try{await dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:mobile?'translateY(36px)':'translateY(8px) scale(.985)'}],{duration:160,easing:'cubic-bezier(.4,0,1,1)'}).finished;}catch{}
 }
 dialog.close();closingSheets.delete(dialog);
}
function navigate(){if(location.hash==='#main'){$('#main').focus();return;}const next=location.hash.slice(1);tab=['library','finish','insights'].includes(next)?next:'library';render(true);window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',navigate);
document.addEventListener('click',async event=>{
 const availabilityGame=event.target.closest('[data-availability-game]');if(availabilityGame){$('#availability-dialog').close();if($('#detail-dialog').open)$('#detail-dialog').close();openGame(Number(availabilityGame.dataset.availabilityGame));return;}
 const close=event.target.closest('[data-close]');if(close){await closeSheet(document.getElementById(close.dataset.close));return;}
 const pin=event.target.closest('[data-pin]');if(pin){togglePin(Number(pin.dataset.pin));return;}
 const game=event.target.closest('[data-game]');if(game){openGame(Number(game.dataset.game));return;}
 const filterButton=event.target.closest('[data-filter]');if(filterButton){filter=filterButton.dataset.filter;render();return;}
 const achievementFilter=event.target.closest('[data-ach-filter]');if(achievementFilter){achFilter=achievementFilter.dataset.achFilter;renderDetail();return;}
 const reveal=event.target.closest('[data-reveal]');if(reveal){revealed.add(reveal.dataset.reveal);renderDetail();return;}
 const retryGame=event.target.closest('[data-retry-game]');if(retryGame){if(busy||refreshWait()){toast('Please wait before retrying Steam.');return;}markRefresh();await persistProfile();const g=data.games.find(g=>g.id===Number(retryGame.dataset.retryGame));g.status='pending';renderDetail();await loadGame(g,epoch);return;}
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='availability')showAvailability();
 if(action==='update-times')updateTimeReferences();
 if(action==='scan-availability')scanAvailability();
 if(action==='pause-availability'&&availabilityRun){availabilityRun.running=false;availabilityRun.paused=true;showAvailability();}
 if(action==='connect'){try{configured=(await request('config',{})).configured;}catch{}showConnect();}
 if(action==='demo'){epoch++;busy=false;clearTimeout(renderTimer);renderTimer=null;clearTimeout(cacheTimer);cacheTimer=null;await forgetProfile();data=structuredClone(demo);storage.set('checkpoint:profile',null);$('#connect-dialog').close();$('#detail-dialog').close();selected=null;render();}
 if(action==='reset'){filter='all';query='';render();}
 if(action==='library')location.hash='library';
 if(action==='refresh'&&!busy)await connect(data.profile.id,{refresh:true});
 if(action==='retry'&&!busy){if(refreshWait()){toast(`Please wait ${refreshWait()} minutes before retrying Steam.`);return;}markRefresh();busy=true;await persistProfile();render();await hydrate(epoch,true);}
});
document.addEventListener('input',event=>{if(event.target.id==='game-search'){query=event.target.value;updateGames();}if(event.target.id==='achievement-search'){achQuery=event.target.value;renderDetail();}});
document.addEventListener('change',event=>{if(event.target.id==='finish-sort'){finishSort=resolveFinishSort(event.target.value);storage.set('checkpoint:finish-sort',finishSort);render();return;}if(event.target.id==='sort'){sort=event.target.value;updateGames();}});
document.addEventListener('submit',event=>{if(event.target.id==='profile-form'){event.preventDefault();$('#profile-error').innerHTML='';connect($('#profile-input').value);}});
for(const dialog of document.querySelectorAll('dialog')){dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeSheet(dialog);}});dialog.addEventListener('cancel',event=>{event.preventDefault();closeSheet(dialog);});}
// Artwork has a calm local fallback when Steam's CDN cannot be reached.
document.addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.style.opacity='0';event.target.setAttribute('aria-hidden','true');}},true);
const linkedProfile = new URLSearchParams(location.search).get('profile');
const lastProfile=storage.get('checkpoint:profile',null);
const cached = await readProfile();
if(cached&&matchesProfile(cached,linkedProfile||lastProfile)){
 data=cached;configured=true;render();
 // No config request, library request, polling, or background scan on a cached visit.
}else{
 render();
 try{configured=(await request('config',{})).configured;}catch{}
 if(linkedProfile&&configured)connect(linkedProfile);
 else if(typeof lastProfile==='string'&&/^7656119\d{10}$/.test(lastProfile)&&configured)connect(lastProfile);
}
window.addEventListener('pagehide',()=>{persistProfile();});
