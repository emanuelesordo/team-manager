import { supabase } from './supabase.js';

const TEAM_ID='d0c3210b-6a8a-4a1b-93c8-e2400029006e';
const app=document.querySelector('#app');
const toastRoot=document.querySelector('#toast-root');

const state={
  view:'home',loading:true,busy:false,session:null,role:null,
  players:[],seasons:[],competitions:[],opponents:[],matches:[],stats:[],scores:[],
  profiles:[],userRoles:[],settings:{community_confirmations_required:3,team_logo_url:null,theme_mode:'auto',theme_primary:'#2f96c8',theme_secondary:'#153b5b',theme_accent:'#78c8e8',theme_surface_tint:'#dceff8'},
  selectedPlayerId:null,playerEditorOpen:false,matchEditorOpen:false,selectedMatchId:null,matchDetailId:null,matchTab:'lineup',matchPlayers:[],matchEvents:[],tacticalChanges:[],adminTab:'competitions'
};

const labels={
  P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante',
  fan:'Fan',player:'Giocatore',coach:'Mister',manager:'Dirigente',admin:'Admin',
  league:'Campionato',cup:'Coppa',friendly:'Amichevole',tournament:'Torneo',other:'Altro',
  scheduled:'Programmata',live:'Live',finished:'Conclusa',postponed:'Rinviata',cancelled:'Annullata'
};
const icons={"home":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3.5 10.8 12 4l8.5 6.8v8.7a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z\"/></svg>","calendar":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17\"/></svg>","live":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"7\"/><path d=\"M8.7 8.7a4.7 4.7 0 0 0 0 6.6M15.3 8.7a4.7 4.7 0 0 1 0 6.6\"/><circle cx=\"12\" cy=\"12\" r=\"1.4\" class=\"fill\"/></svg>","roster":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3.8 19c.5-3.3 2.1-5.2 5.2-5.2s4.7 1.9 5.2 5.2M16 7.2a2.5 2.5 0 1 1 0 4.9M16 14.2c2.5.2 3.8 1.8 4.2 4.8\"/></svg>","stats":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M5 20V11M12 20V4M19 20v-7\"/></svg>","profile":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5 20c.6-4 2.8-6 7-6s6.4 2 7 6\"/></svg>","admin":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18\"/></svg>"};

const isStaff=()=>['manager','admin'].includes(state.role);
const isAdmin=()=>state.role==='admin';
const season=()=>state.seasons.find(s=>s.status==='active')||state.seasons[0]||null;
const player=id=>state.players.find(p=>p.id===id);
const stat=id=>state.stats.find(s=>s.player_id===id)||{};
const opponent=id=>state.opponents.find(o=>o.id===id);
const competition=id=>state.competitions.find(c=>c.id===id);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const initials=(a='',b='')=>(`${a?.[0]||''}${b?.[0]||''}`.toUpperCase()||'TM');
const fmt=v=>v?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'Da programmare';
const num=v=>Number(v||0);
const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;

function hexRgb(hex){const h=String(hex||'').replace('#','');if(!/^[0-9a-f]{6}$/i.test(h))return [47,150,200];return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbHex(r,g,b){return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function mixHex(a,b,t){const A=hexRgb(a),B=hexRgb(b);return rgbHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)}
function applyTheme(){
 const s=state.settings||{},root=document.documentElement;
 const primary=s.theme_primary||'#2f96c8',secondary=s.theme_secondary||'#153b5b',accent=s.theme_accent||mixHex(primary,'#ffffff',.38),surface=s.theme_surface_tint||mixHex(primary,'#ffffff',.84);
 root.style.setProperty('--brand-primary',primary);root.style.setProperty('--brand-secondary',secondary);root.style.setProperty('--brand-accent',accent);root.style.setProperty('--brand-surface',surface);
 root.style.setProperty('--brand-primary-rgb',hexRgb(primary).join(','));root.style.setProperty('--brand-secondary-rgb',hexRgb(secondary).join(','));root.style.setProperty('--brand-accent-rgb',hexRgb(accent).join(','));
 root.style.setProperty('--accent',primary);root.style.setProperty('--accent2',secondary);
}
async function extractLogoPalette(file){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url});
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d',{willReadFrequently:true});cv.width=cv.height=72;ctx.clearRect(0,0,72,72);ctx.drawImage(img,0,0,72,72);
  const d=ctx.getImageData(0,0,72,72).data,map=new Map();
  for(let i=0;i<d.length;i+=4){if(d[i+3]<180)continue;const r=d[i],g=d[i+1],b=d[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max-min,light=(max+min)/2;if(light>242||light<18||sat<18)continue;const q=[r,g,b].map(v=>Math.round(v/24)*24);const k=q.join(',');map.set(k,(map.get(k)||0)+1+(sat/255))}
  const colors=[...map.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k.split(',').map(Number));
  const primary=colors[0]||[47,150,200];let secondary=colors.find(x=>Math.hypot(x[0]-primary[0],x[1]-primary[1],x[2]-primary[2])>105);
  if(!secondary)secondary=primary.map(v=>Math.round(v*.42));
  let accent=colors.find(x=>x!==secondary&&Math.hypot(x[0]-primary[0],x[1]-primary[1],x[2]-primary[2])>55);
  if(!accent)accent=primary.map(v=>Math.min(255,Math.round(v+(255-v)*.38)));
  const p=rgbHex(...primary),s=rgbHex(...secondary),a=rgbHex(...accent);
  return {primary:p,secondary:s,accent:a,surface:mixHex(p,'#ffffff',.84)};
 }finally{URL.revokeObjectURL(url)}
}

function toast(message,type='ok'){
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;toastRoot.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),220)},2500);
}
function title(){return ({home:'Home',calendar:'Calendario',live:'Partite',roster:'Rosa',stats:'Statistiche',profile:'Profilo',admin:'Amministrazione'})[state.view]||'Team Manager';}
function subtitle(){return ({home:'Panoramica della squadra',calendar:'Partite, competizioni e risultati',live:'Gestione operativa delle partite',roster:'Giocatori, ruoli e dettagli',stats:'Rendimento della squadra e dei giocatori',profile:'Gestione account e preferenze',admin:'Configurazione del club'})[state.view]||'';}
function nav(){return [['home','Home'],['calendar','Calendario'],['roster','Rosa'],['live','Partite'],['stats','Statistiche']];}
function teamMark(name,url,extra=''){return `<span class="club-mark ${extra}">${url?`<img src="${esc(url)}" alt="">`:`<b>${esc(initials(name,''))}</b>`}</span>`;}
function shell(content){
 const items=nav(),logo=state.settings.team_logo_url?'<img src="'+esc(state.settings.team_logo_url)+'" alt="Calcio Caselle">':'CC';
 const roleName=esc(labels[state.role]||'Ospite');
 app.innerHTML=`<div class="app-shell view-${state.view}">
   <aside class="sidebar">
     <div class="brand"><div class="brand-mark">${logo}</div><div><strong>TEAM MANAGER</strong><span>CALCIO CASELLE</span></div></div>
     <nav class="side-nav">${items.map(([id,l])=>`<button data-view="${id}" class="${state.view===id?'active':''}"><span class="nav-glyph">${icons[id]}</span><span>${l}</span></button>`).join('')}
       ${isStaff()?'<button data-view="admin" class="'+(state.view==='admin'?'active':'')+'"><span class="nav-glyph">'+icons.admin+'</span><span>Amministrazione</span></button>':''}
     </nav>
     <button class="side-settings" data-view="${isStaff()?'admin':'profile'}"><span class="nav-glyph">${icons.admin}</span><span>Impostazioni</span></button>
   </aside>
   <main class="main">
     <header class="topbar">
       <div class="mobile-greeting"><button class="avatar avatar-small" data-view="profile">${state.session?'ME':'TM'}</button><div><small>Buongiorno</small><strong>${roleName}</strong></div></div>
       <div class="page-heading"><h1>${title()}</h1><p>${subtitle()}</p></div>
       <div class="topbar-tools"><label class="desktop-search"><span>⌕</span><input type="search" placeholder="Cerca…"></label><button class="top-icon" type="button" aria-label="Notifiche">♢</button><button class="profile-trigger" data-view="profile"><span class="avatar avatar-small">${state.session?'ME':'TM'}</span><span class="profile-copy"><strong>${roleName}</strong><small>${esc(season()?.name||'Stagione')}</small></span></button></div>
     </header>
     <section class="content">${content}</section>
   </main>
   <nav class="bottom-nav">${items.map(([id,l])=>`<button data-view="${id}" class="${state.view===id?'active':''}"><span class="nav-icon">${icons[id]}</span><span>${l}</span></button>`).join('')}<button data-view="profile" class="${state.view==='profile'?'active':''}"><span class="nav-icon">${icons.profile}</span><span>Altro</span></button></nav>
   ${state.playerEditorOpen?playerEditor():''}
 </div>`;
}
function kpi(label,value,sub='',icon=''){return `<article class="metric">${icon?`<span class="metric-icon">${icon}</span>`:''}<div><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></article>`;}

/* HOME */
function homeView(){
 const matches=[...state.matches].sort((a,b)=>new Date(a.kickoff_at||0)-new Date(b.kickoff_at||0));
 const live=matches.find(m=>m.status==='live');
 const next=live||matches.find(m=>m.status==='scheduled')||[...matches].reverse().find(m=>m.status==='finished');
 const upcoming=matches.filter(m=>m.status==='scheduled').slice(0,4),ownLogo=state.settings.team_logo_url||'';
 const featured=next,o=featured?opponent(featured.opponent_id):null,home=featured?.home_away==='home';
 const ownScore=featured?num(home?featured.home_score:featured.away_score):0,oppScore=featured?num(home?featured.away_score:featured.home_score):0;
 const top=[...state.stats].sort((a,b)=>num(b.goals)-num(a.goals)).slice(0,5);
 const matchCard=m=>{const op=opponent(m.opponent_id),hm=m.home_away==='home';return `<button class="league-match-card" data-match="${m.id}"><div class="league-venue"><small>${esc(m.venue||competition(m.competition_id)?.name||'Partita')}</small><b>${m.kickoff_at?new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit'}).format(new Date(m.kickoff_at)):'—'}</b></div><div class="league-teams"><span>${teamMark(hm?'Calcio Caselle':op?.name||'Avversario',hm?ownLogo:op?.logo_url||'','large')}<strong>${esc(hm?'Calcio Caselle':op?.name||'Avversario')}</strong></span><i>VS</i><span>${teamMark(hm?op?.name||'Avversario':'Calcio Caselle',hm?op?.logo_url||'':ownLogo,'large')}<strong>${esc(hm?op?.name||'Avversario':'Calcio Caselle')}</strong></span></div></button>`};
 return `<div class="mock-home-layout">
 <section class="feature-match"><div class="feature-match-art"><div class="feature-glow"></div><div class="feature-meta"><span>${featured?.status==='live'?'● Live':esc(competition(featured?.competition_id)?.name||'Prossima partita')}</span><small>${featured?fmt(featured.kickoff_at):'Da programmare'}</small></div><div class="feature-clubs"><div>${teamMark('Calcio Caselle',ownLogo,'feature')}<strong>Calcio Caselle</strong></div><span class="feature-vs">${featured?.status==='live'||featured?.status==='finished'?ownScore+' : '+oppScore:'VS'}</span><div>${teamMark(o?.name||'Avversario',o?.logo_url||'','feature')}<strong>${esc(o?.name||'Avversario')}</strong></div></div><div class="feature-pager"><i class="active"></i><i></i><i></i></div></div></section>
 <section class="sport-switch mobile-only"><button class="active">⚽ <span>Football</span></button><button>●</button><button>●</button><button>●</button></section>
 <section class="home-feed"><div class="feed-title"><h2>${live?'Live Games':'Prossime partite'}</h2><button data-view="calendar">Vedi tutte</button></div><div class="match-feed">${(live?[live,...upcoming.filter(x=>x.id!==live.id)]:upcoming).slice(0,4).map(m=>{const op=opponent(m.opponent_id),hm=m.home_away==='home';return `<button class="score-match-card" data-match="${m.id}"><div class="score-live">${m.status==='live'?'● Live':esc(competition(m.competition_id)?.name||'Partita')}</div><div class="score-clubs"><span>${teamMark(hm?'Calcio Caselle':op?.name||'Avversario',hm?ownLogo:op?.logo_url||'','large')}<b>${esc(hm?'Calcio Caselle':op?.name||'Avversario')}</b></span><strong>${m.status==='scheduled'?'VS':num(m.home_score)+' : '+num(m.away_score)}</strong><span>${teamMark(hm?op?.name||'Avversario':'Calcio Caselle',hm?op?.logo_url||'':ownLogo,'large')}<b>${esc(hm?op?.name||'Avversario':'Calcio Caselle')}</b></span></div><div class="score-footer"><span>${m.kickoff_at?new Intl.DateTimeFormat('it-IT',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(m.kickoff_at)):'—'}</span><span>›</span></div></button>`}).join('')||'<div class="empty-card">Nessuna partita programmata.</div>'}</div></section>
 <aside class="desktop-league"><div class="feed-title"><h2>League Center</h2><button data-view="calendar">Calendario</button></div><div class="week-strip">${[-3,-2,-1,0,1,2,3].map((d,i)=>{const x=new Date();x.setDate(x.getDate()+d);return `<span class="${i===3?'active':''}"><b>${x.getDate()}</b><small>${new Intl.DateTimeFormat('it-IT',{weekday:'short'}).format(x)}</small></span>`}).join('')}</div><div class="league-stack">${upcoming.slice(0,3).map(matchCard).join('')||'<div class="empty-card">Nessuna partita futura.</div>'}</div></aside>
 <section class="desktop-summary"><div class="summary-card"><span>Rosa</span><strong>${state.players.length}</strong><small>giocatori</small></div><div class="summary-card"><span>Partite</span><strong>${state.matches.length}</strong><small>stagione</small></div><div class="summary-card"><span>Gol</span><strong>${state.stats.reduce((a,x)=>a+num(x.goals),0)}</strong><small>segnati</small></div><div class="summary-card"><span>Top scorer</span><strong>${esc(top[0]?.last_name||'—')}</strong><small>${num(top[0]?.goals)} gol</small></div></section>
 </div>`;
}

/* CALENDAR */
function calendarView(){
 const filters=[['all','Tutte'],['league','Campionato'],['cup','Coppa'],['friendly','Amichevoli']];
 return `<div class="page-tools"><div class="segmented compact">${filters.map(([id,l])=>`<button class="${id==='all'?'active':''}">${l}</button>`).join('')}</div><div class="toolbar-actions"><span class="season-chip">${esc(season()?.name||'Stagione')}</span>${isStaff()?'<button class="primary small" data-new-match>+ Partita</button>':''}</div></div>
 <section class="ui-panel data-panel calendar-table"><div class="data-head calendar-head"><span>Data</span><span>Orario</span><span>Competizione</span><span>Casa</span><span>Risultato</span><span>Trasferta</span><span>Stato</span><span>Azioni</span></div><div class="data-body">${state.matches.map(m=>{const o=opponent(m.opponent_id),home=m.home_away==='home',d=m.kickoff_at?new Date(m.kickoff_at):null;return `<button class="data-row calendar-row" data-match="${m.id}"><span><b>${d?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(d):'—'}</b></span><span>${d?new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit'}).format(d):'—'}</span><span>${esc(competition(m.competition_id)?.name||'Partita')}</span><span class="team-cell">${teamMark(home?'Calcio Caselle':o?.name||'Avversario',home?state.settings.team_logo_url:o?.logo_url||'','tiny')}<b>${esc(home?'Calcio Caselle':o?.name||'Avversario')}</b></span><strong class="table-score">${m.status==='scheduled'?'– : –':num(m.home_score)+' : '+num(m.away_score)}</strong><span class="team-cell">${teamMark(home?o?.name||'Avversario':'Calcio Caselle',home?o?.logo_url||'':state.settings.team_logo_url,'tiny')}<b>${esc(home?o?.name||'Avversario':'Calcio Caselle')}</b></span><span><i class="status ${m.status}">${esc(labels[m.status]||m.status)}</i></span><span class="row-menu">⋮</span></button>`}).join('')||'<div class="empty-card">Nessuna partita.</div>'}</div></section>
 ${state.matchEditorOpen?matchEditor():''}${state.matchDetailId?matchDetail():''}`;
}

function matchEditor(){
 const m=state.selectedMatchId?state.matches.find(x=>x.id===state.selectedMatchId):null;
 const local=m?.kickoff_at?new Date(new Date(m.kickoff_at).getTime()-new Date(m.kickoff_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
 return `<div class="sheet-backdrop"><section class="player-sheet editor"><button class="sheet-close" data-close-match>×</button><span class="eyebrow">CALENDARIO</span><h2>${m?'Modifica partita':'Nuova partita'}</h2><form id="match-form" data-id="${m?.id||''}"><div class="form-grid">
 <label>Competizione<select name="competition_id"><option value="">Nessuna</option>${state.competitions.map(x=>`<option value="${x.id}" ${m?.competition_id===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
 <label>Avversario<select name="opponent_id" required><option value="">Seleziona…</option>${state.opponents.map(x=>`<option value="${x.id}" ${m?.opponent_id===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
 <label>Data e ora<input type="datetime-local" name="kickoff_at" value="${local}" required></label>
 <label>Casa / trasferta<select name="home_away"><option value="home" ${m?.home_away!=='away'?'selected':''}>Casa</option><option value="away" ${m?.home_away==='away'?'selected':''}>Trasferta</option></select></label>
 <label>Campo<input name="venue" value="${esc(m?.venue||'')}" placeholder="Es. Campo Caselle"></label>
 <label>Giornata / turno<input name="round_label" value="${esc(m?.round_label||'')}" placeholder="Es. 5ª giornata"></label>
 <label>Stato<select name="status">${['scheduled','live','finished','postponed','cancelled'].map(v=>`<option value="${v}" ${m?.status===v?'selected':''}>${labels[v]}</option>`).join('')}</select></label>
 <label>Note<input name="notes" value="${esc(m?.notes||'')}"></label></div>
 <div class="editor-actions"><button class="primary" type="submit">${m?'Salva modifiche':'Crea partita'}</button>${m?'<button class="ghost danger" type="button" data-delete-match="'+m.id+'">Elimina partita</button>':''}</div></form></section></div>`;
}
async function saveMatch(e){
 e.preventDefault();const f=new FormData(e.currentTarget),id=e.currentTarget.dataset.id;
 const row={season_id:season()?.id,competition_id:f.get('competition_id')||null,opponent_id:f.get('opponent_id'),kickoff_at:new Date(f.get('kickoff_at')).toISOString(),home_away:f.get('home_away'),venue:f.get('venue')||null,round_label:f.get('round_label')||null,status:f.get('status'),notes:f.get('notes')||null};
 if(!row.season_id)return toast('Crea o attiva prima una stagione','err');
 const {error}=id?await supabase.from('app_matches').update(row).eq('id',id):await supabase.from('app_matches').insert(row);
 if(error)return toast(error.message,'err');state.matchEditorOpen=false;state.selectedMatchId=null;toast(id?'Partita aggiornata':'Partita creata');await load();
}
async function deleteMatch(id){if(!confirm('Eliminare definitivamente questa partita e i dati collegati?'))return;const {error}=await supabase.from('app_matches').delete().eq('id',id);if(error)return toast(error.message,'err');state.matchEditorOpen=false;state.selectedMatchId=null;toast('Partita eliminata');await load();}

async function loadMatchDetail(){
 if(!state.matchDetailId){state.matchPlayers=[];state.matchEvents=[];return}
 const [mp,ev,tc]=await Promise.all([
  supabase.from('app_match_players').select('*').eq('match_id',state.matchDetailId),
  supabase.from('app_match_events').select('*').eq('match_id',state.matchDetailId).order('minute',{ascending:true}),
  supabase.from('app_match_tactical_changes').select('*').eq('match_id',state.matchDetailId).order('minute',{ascending:true})
 ]);
 state.matchPlayers=mp.data||[];state.matchEvents=ev.data||[];state.tacticalChanges=tc.data||[];
}
function matchDetail(){
 const m=state.matches.find(x=>x.id===state.matchDetailId);if(!m)return '';
 const o=opponent(m.opponent_id),tabs=[['lineup','Formazione'],['events','Eventi']];
 const comp=competition(m.competition_id)?.name||'Partita',home=m.home_away==='home',ownLogo=state.settings.team_logo_url||'',oppLogo=o?.logo_url||'',dt=m.kickoff_at?new Date(m.kickoff_at):null;
 const day=dt?String(dt.getDate()).padStart(2,'0'):'—',mon=dt?new Intl.DateTimeFormat('it-IT',{month:'short'}).format(dt).replace('.','').toUpperCase():'';
 const leftTeam=home?'Calcio Caselle':(o?.name||'Avversario'),rightTeam=home?(o?.name||'Avversario'):'Calcio Caselle',leftLogo=home?ownLogo:oppLogo,rightLogo=home?oppLogo:ownLogo;
 return `<div class="sheet-backdrop match-detail-backdrop"><section class="match-detail match-ui">
  <header class="match-detail-header"><div class="strip-date"><strong>${day}</strong><span>${mon}</span></div><div class="match-detail-copy"><div><h2>${esc(leftTeam)} – ${esc(rightTeam)}</h2><span class="status ${m.status}">${esc(labels[m.status]||m.status)}</span></div><p>${esc(comp)}${m.round_label?' · '+esc(m.round_label):''}${m.kickoff_at?' · '+fmt(m.kickoff_at):''}${m.venue?' · '+esc(m.venue):''}</p></div><div class="match-detail-score">${teamMark(leftTeam,leftLogo,'tiny')}<b>${m.status==='scheduled'?'– : –':num(m.home_score)+' : '+num(m.away_score)}</b>${teamMark(rightTeam,rightLogo,'tiny')}</div><button class="match-actions-btn" data-close-detail>×</button></header>
  <div class="match-toolbar-row"><nav class="match-tabs">${tabs.map(([id,l])=>`<button data-match-tab="${id}" class="${state.matchTab===id?'active':''}">${l}</button>`).join('')}</nav>${state.matchTab==='lineup'&&isStaff()?`<div class="match-formation-actions"><select id="formation-select-top">${Object.keys(formationSlots).map(x=>`<option ${(m.formation||'4-4-2')===x?'selected':''}>${x}</option>`).join('')}</select><button class="primary" data-save-lineup>Salva partita</button></div>`:''}</div>
  <div class="match-detail-body">${state.matchTab==='lineup'?lineupTab(m):eventsTab(m)}</div>
 </section></div>`;
}

function lineupTab(m){return formationWorkspace(m)}
const formationSlots={
 '4-4-2':[[50,89],[12,70],[37,70],[63,70],[88,70],[12,44],[37,44],[63,44],[88,44],[35,18],[65,18]],
 '4-3-3':[[50,89],[12,70],[37,70],[63,70],[88,70],[24,46],[50,46],[76,46],[15,18],[50,14],[85,18]],
 '4-2-3-1':[[50,89],[12,70],[37,70],[63,70],[88,70],[35,50],[65,50],[15,31],[50,31],[85,31],[50,12]],
 '3-5-2':[[50,89],[22,69],[50,69],[78,69],[8,44],[29,45],[50,42],[71,45],[92,44],[35,17],[65,17]],
 '3-4-3':[[50,89],[22,69],[50,69],[78,69],[12,44],[37,44],[63,44],[88,44],[15,18],[50,14],[85,18]],
 '4-3-1-2':[[50,89],[12,70],[37,70],[63,70],[88,70],[24,47],[50,47],[76,47],[50,29],[35,14],[65,14]],
 '4-1-4-1':[[50,89],[12,70],[37,70],[63,70],[88,70],[50,55],[12,37],[37,37],[63,37],[88,37],[50,13]]
};
const unavailabilityLabels={injury:'Infortunio',work:'Lavoro',personal:'Personale',suspension:'Squalifica',illness:'Malattia',travel:'Viaggio',technical_choice:'Scelta tecnica',other:'Altro'};
const unusedSubLabels={technical_choice:'Scelta tecnica',disciplinary:'Motivo disciplinare',injury:'Infortunio'};
const substitutionReasonLabels={technical_choice:'Scelta tecnica',injury_prevention:'Prevenzione infortunio',disciplinary_prevention:'Prevenzione disciplinare',injury:'Infortunio',standing_ovation:'Standing ovation',give_teammates_time:'Spazio ai compagni'};
function formationWorkspace(m){
 const mp=new Map(state.matchPlayers.map(x=>[x.player_id,x])),formation=m.formation||'4-4-2',slots=formationSlots[formation]||formationSlots['4-4-2'];
 const starters=state.matchPlayers.filter(x=>x.selection_status==='starter'||x.started).sort((x,y)=>(x.tactical_slot||99)-(y.tactical_slot||99));
 const bySlot=new Map(starters.map((x,i)=>[x.tactical_slot||i+1,x]));
 const bench=state.matchPlayers.filter(x=>x.selection_status==='bench');
 const absent=state.matchPlayers.filter(x=>x.selection_status==='absent');
 const starterIds=new Set(starters.map(x=>x.player_id)),benchIds=new Set(bench.map(x=>x.player_id)),absentIds=new Set(absent.map(x=>x.player_id));
 const roleOrder={P:1,D:2,C:3,A:4};
 const leftPlayers=state.players.filter(p=>!benchIds.has(p.id)&&!absentIds.has(p.id)).sort((a,b)=>{
  const as=starterIds.has(a.id)?0:1,bs=starterIds.has(b.id)?0:1;
  if(as!==bs)return as-bs;
  return (roleOrder[a.generic_role_manual]||9)-(roleOrder[b.generic_role_manual]||9)||String(a.last_name||'').localeCompare(String(b.last_name||''),'it');
 });
 const roleBox=p=>`<span class="role-pill role-${p.generic_role_manual||'x'}">${p.generic_role_manual||'–'}</span>`;
 const squadRow=p=>{const x=mp.get(p.id),inXI=starterIds.has(p.id);return `<div class="squad-row ${inXI?'is-starter':''}" draggable="${isStaff()?'true':'false'}" data-drag-player="${p.id}"><button class="shirt-btn compact" data-shirt-picker="${p.id}" title="Numero maglia"><b>${x?.shirt_number||'–'}</b></button>${roleBox(p)}<div class="squad-person"><strong>${esc(p.last_name)}</strong><small>${labels[p.generic_role_manual]||'Ruolo n/d'}</small></div>${isStaff()?`<div class="squad-actions"><button class="quick-assign ${inXI?'selected':''}" data-quick-starter="${p.id}" title="Titolare"></button><button class="quick-assign" data-quick-bench="${p.id}" title="Panchina"></button></div>`:''}</div>`};
 const benchRow=x=>{const p=player(x.player_id);return `<div class="bench-row" draggable="${isStaff()?'true':'false'}" data-drag-player="${p.id}"><button class="shirt-btn" data-shirt-picker="${p.id}" title="Numero maglia"><b>${x.shirt_number||'–'}</b></button>${roleBox(p)}<div class="squad-person"><strong>${esc(p.last_name)}</strong><small>${labels[p.generic_role_manual]||'Ruolo n/d'}</small></div>${isStaff()?`<div class="bench-actions"><button class="event-shortcut sub-icon" data-player-event="${p.id}" data-event-kind="substitution" title="Cambio">⇄</button><button class="event-shortcut goal-icon" data-player-event="${p.id}" data-event-kind="goal" title="Gol">●</button><button class="event-shortcut card-icon" data-player-event="${p.id}" data-event-kind="yellow_card" title="Cartellino"></button></div><select class="bench-reason" data-unused-reason="${x.player_id}" title="Motivo se non entra"><option value="">—</option>${Object.entries(unusedSubLabels).map(([v,l])=>`<option value="${v}" ${x.unused_sub_reason===v?'selected':''}>${l}</option>`).join('')}</select>`:''}</div>`};
 const absentRow=x=>{const p=player(x.player_id);return `<div class="noncalled-row">${roleBox(p)}<div class="squad-person"><strong>${esc(p.last_name)}</strong><small>${labels[p.generic_role_manual]||'Ruolo n/d'}</small></div>${isStaff()?`<button class="unavailable-reason-btn" data-unavailable="${p.id}" title="Dettaglio">!</button><span>${unavailabilityLabels[x.unavailability_reason]||'Da indicare'}</span>`:`<span>${unavailabilityLabels[x.unavailability_reason]||'—'}</span>`}</div>`};
 const captain=starters.find(x=>x.is_captain),captainP=captain?player(captain.player_id):null;
 return `<div class="formation-workspace reference-layout">
 <aside class="match-roster-panel" data-drop-zone="available"><div class="workspace-head"><div><h3>Rosa squadra</h3><span>${leftPlayers.length}</span></div></div><div class="match-roster-scroll">${leftPlayers.map(squadRow).join('')}</div><div class="noncalled-section roster-noncalled"><div class="workspace-head"><div><h3>Non convocati</h3><span>${absent.length}</span></div></div><div class="noncalled-list">${absent.map(absentRow).join('')||'<small>Nessuno</small>'}</div>${isStaff()?'<button class="ghost tiny" data-mark-unavailable>+ Non convocato</button>':''}</div></aside>
 <main class="starters-pitch-panel" data-drop-zone="starterlist"><div class="workspace-head"><div><h3>Titolari <span>(${starters.length})</span></h3>${captainP?`<small class="captain-inline"><b>C</b> Capitano: ${esc(captainP.last_name)}</small>`:''}</div></div><div class="football-pitch reference-pitch"><div class="pitch-line half"></div><div class="pitch-circle"></div><div class="box top"></div><div class="box bottom"></div>${slots.map((pos,i)=>{const x=bySlot.get(i+1),p=x?player(x.player_id):null;return `<div class="tactical-slot ref-slot ${p?'filled':''}" style="left:${pos[0]}%;top:${pos[1]}%" data-slot="${i+1}" data-drop-zone="slot">${p?`<div class="pitch-player ref-player" draggable="${isStaff()?'true':'false'}" data-drag-player="${p.id}"><span class="ref-number">${x.shirt_number||'–'}</span><strong>${esc(p.last_name)}</strong>${roleBox(p)}${x.is_captain?'<i class="captain-bubble">C</i>':''}${isStaff()?`<button class="pitch-event-btn" data-player-event="${p.id}" title="Evento">•••</button>`:''}</div>`:'<span class="empty-dot"></span>'}</div>`}).join('')}</div>${isStaff()?`<label class="captain-select captain-bottom">Capitano<select id="captain-select"><option value="">—</option>${starters.map(x=>{const p=player(x.player_id);return `<option value="${x.player_id}" ${x.is_captain?'selected':''}>${esc(p?.last_name||'')}</option>`}).join('')}</select></label>`:''}</main>
 <aside class="match-bench-panel" data-drop-zone="bench"><div class="workspace-head"><div><h3>Panchina <span>(${bench.length})</span></h3></div></div><div class="bench-scroll">${bench.map(benchRow).join('')||'<div class="empty-callup">Trascina qui</div>'}</div></aside>
 </div>`;
}
function shirtPicker(playerId){
 const current=state.matchPlayers.find(x=>x.player_id===playerId)?.shirt_number;
 const used=new Map(state.matchPlayers.filter(x=>x.shirt_number&&x.player_id!==playerId).map(x=>[x.shirt_number,x.player_id]));
 return `<div class="shirt-popover-backdrop" data-close-shirt><div class="shirt-popover" onclick="event.stopPropagation()"><div><span class="eyebrow">NUMERO MAGLIA</span><strong>${esc(player(playerId)?.last_name||'')}</strong></div><div class="shirt-grid">${Array.from({length:24},(_,i)=>i+1).map(n=>`<button data-pick-shirt="${n}" data-player="${playerId}" class="${current===n?'current':''} ${used.has(n)?'occupied':''}" title="${used.has(n)?'Assegnato a '+esc(player(used.get(n))?.last_name||''):''}">${n}</button>`).join('')}</div><small>I numeri sbiaditi sono occupati: selezionandoli verranno scambiati.</small></div></div>`;
}
async function pickShirt(playerId,num){
 const target=state.matchPlayers.find(x=>x.player_id===playerId);if(!target)return;
 const other=state.matchPlayers.find(x=>x.player_id!==playerId&&x.shirt_number===num),old=target.shirt_number||null;target.shirt_number=num;if(other)other.shirt_number=old;
 document.querySelector('.shirt-popover-backdrop')?.remove();render();
}
function pitchTab(m){return formationWorkspace(m)}
function unavailableDialog(playerId=null){
 const existing=playerId?state.matchPlayers.find(x=>x.player_id===playerId):null;
 return `<div class="mini-modal-backdrop" data-close-unavailable><form id="unavailable-form" class="mini-modal" data-player-id="${playerId||''}" onclick="event.stopPropagation()"><h3>Non convocato</h3>${playerId?'':'<label>Giocatore<select name="player_id" required><option value="">Seleziona…</option>'+state.players.filter(p=>!state.matchPlayers.some(x=>x.player_id===p.id&&x.selection_status==='absent')).map(p=>'<option value="'+p.id+'">'+esc(p.last_name)+' '+esc(p.first_name)+'</option>').join('')+'</select></label>'}<label>Motivo<select name="reason" required>${Object.entries(unavailabilityLabels).map(([v,l])=>`<option value="${v}" ${existing?.unavailability_reason===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Nota<input name="note" value="${esc(existing?.unavailability_note||'')}" placeholder="Facoltativa"></label><button class="primary">Salva</button></form></div>`;
}
async function saveUnavailable(e){
 e.preventDefault();const f=new FormData(e.currentTarget),id=e.currentTarget.dataset.playerId||f.get('player_id');let x=state.matchPlayers.find(r=>r.player_id===id);
 const row={match_id:state.matchDetailId,player_id:id,selection_status:'absent',started:false,tactical_slot:null,shirt_number:x?.shirt_number||null,minutes_played:null,unavailability_reason:f.get('reason'),unavailability_note:f.get('note')||null};
 const {error}=await supabase.from('app_match_players').upsert(row,{onConflict:'match_id,player_id'});if(error)return toast(error.message,'err');document.querySelector('.mini-modal-backdrop')?.remove();await loadMatchDetail();render();toast('Indisponibilità salvata');
}
async function moveFormationPlayer(playerId,target,slot){
 let rows=state.matchPlayers.map(x=>({...x}));let x=rows.find(r=>r.player_id===playerId);
 if(!x){x={match_id:state.matchDetailId,player_id:playerId,selection_status:'available',started:false,shirt_number:null,minutes_played:null,tactical_slot:null};rows.push(x)}
 const changed=[x];
 if(target==='slot'){
  const occupied=rows.find(r=>r.tactical_slot===slot&&r.player_id!==playerId);
  if(occupied){occupied.selection_status='available';occupied.started=false;occupied.tactical_slot=null;changed.push(occupied)}
  x.selection_status='starter';x.started=true;x.tactical_slot=slot;x.unavailability_reason=null;x.unavailability_note=null;
 }else if(target==='bench'){x.selection_status='bench';x.started=false;x.tactical_slot=null;x.unavailability_reason=null;x.unavailability_note=null}
 else if(target==='starterlist'){const free=Array.from({length:11},(_,i)=>i+1).find(n=>!rows.some(r=>r.player_id!==playerId&&r.tactical_slot===n));if(!free)return toast('Gli 11 slot titolari sono già occupati','err');x.selection_status='starter';x.started=true;x.tactical_slot=free;x.unavailability_reason=null;x.unavailability_note=null}
 else{x.selection_status='available';x.started=false;x.tactical_slot=null;x.unavailability_reason=null;x.unavailability_note=null}
 state.matchPlayers=rows;render();
 const payload=changed.map(r=>({match_id:state.matchDetailId,player_id:r.player_id,selection_status:r.selection_status,started:r.started,shirt_number:r.shirt_number||null,minutes_played:r.minutes_played??null,tactical_slot:r.tactical_slot||null,unavailability_reason:r.unavailability_reason||null,unavailability_note:r.unavailability_note||null,is_captain:r.player_id===(document.querySelector('#captain-select')?.value||null),unused_sub_reason:document.querySelector(`[data-unused-reason="${r.player_id}"]`)?.value||r.unused_sub_reason||null}));
 const {error}=await supabase.from('app_match_players').upsert(payload,{onConflict:'match_id,player_id'});
 if(error){toast('Spostamento non salvato: '+error.message,'err');await loadMatchDetail();render();return}
 toast(target==='slot'?'Titolare aggiornato':target==='bench'?'Panchina aggiornata':'Giocatore rimosso');
}
function bindFormationDnD(){
 let dragged=null;
 const getId=e=>{try{return e.dataTransfer.getData('text/plain')||dragged}catch(_){return dragged}};
 document.querySelectorAll('[data-drag-player]').forEach(el=>{
  el.ondragstart=e=>{dragged=el.dataset.dragPlayer;el.classList.add('dragging');e.dataTransfer.setData('text/plain',dragged);e.dataTransfer.effectAllowed='move'};
  el.ondragend=()=>{el.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));dragged=null};
 });
 document.querySelectorAll('[data-drop-zone]').forEach(z=>{
  z.ondragenter=e=>{e.preventDefault();z.classList.add('drag-over')};
  z.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
  z.ondragleave=e=>{if(!z.contains(e.relatedTarget))z.classList.remove('drag-over')};
  z.ondrop=e=>{e.preventDefault();e.stopPropagation();z.classList.remove('drag-over');const id=getId(e);if(id)moveFormationPlayer(id,z.dataset.dropZone,Number(z.dataset.slot)||null)};
 });
 const squad=document.querySelector('.squad-panel');
 if(squad){squad.ondragover=e=>e.preventDefault();squad.ondrop=e=>{e.preventDefault();const id=getId(e);if(id)moveFormationPlayer(id,'available',null)}}
}
const eventLabels={tactical_change:'Cambio modulo',goal:'Gol',assist:'Assist',yellow_card:'Giallo',red_card:'Rosso',substitution:'Cambio',own_goal:'Autogol',penalty_scored:'Rigore segnato',penalty_missed:'Rigore sbagliato',other:'Altro'};
const HALF_MINUTES=40;
function matchMinute(period,minute){const m=Math.max(0,Number(minute)||0);return period==='2'?HALF_MINUTES+m:m}
function displayMatchMinute(total){if(total===null||total===undefined)return '—';const n=Number(total);if(n<=HALF_MINUTES)return `1T ${n}'`;return `2T ${n-HALF_MINUTES}'`}
function periodMinuteFields(prefix=''){return `<label>Tempo<select name="${prefix}period" required><option value="1">1° tempo</option><option value="2">2° tempo</option></select></label><label>Minuto del tempo<input name="${prefix}minute_in_half" type="number" min="0" max="60" step="1" placeholder="0–40+" required></label>`}
function eventsTab(m){
 return `${isStaff()?`<section class="card event-admin"><div class="form-title"><strong>Aggiungi evento</strong><span>Partita da 80' · 2 × 40' + recupero</span></div><form id="retro-event-form" class="event-grid"><label>Tipo<select name="event_type">${Object.entries(eventLabels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>${periodMinuteFields()}<label>Giocatore<select name="player_id"><option value="">—</option>${state.players.map(p=>`<option value="${p.id}">${esc(p.last_name)} ${esc(p.first_name)}</option>`).join('')}</select></label><label>Secondo giocatore<select name="secondary_player_id"><option value="">—</option>${state.players.map(p=>`<option value="${p.id}">${esc(p.last_name)} ${esc(p.first_name)}</option>`).join('')}</select></label><label class="sub-reason-field">Motivo cambio<select name="substitution_reason"><option value="">—</option>${Object.entries(substitutionReasonLabels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>Squadra<select name="team_side"><option value="team">Caselle</option><option value="opponent">Avversario</option></select></label><button class="primary">Aggiungi</button></form></section>`:''}
 ${isStaff()?`<section class="card tactical-admin"><form id="tactical-change-form" class="tactical-form"><strong>Cambio modulo</strong>${periodMinuteFields('tactical_')}<label>Nuovo modulo<select name="formation_to">${Object.keys(formationSlots).map(x=>`<option>${x}</option>`).join('')}</select></label><button class="ghost">Storicizza assetto</button></form></section>`:''}
 <div class="event-history">${[...state.matchEvents.map(e=>({...e,_kind:'event'})),...state.tacticalChanges.map(t=>({...t,_kind:'tactical'}))].sort((a,b)=>(a.minute||0)-(b.minute||0)).map(e=>{if(e._kind==='tactical')return `<article class="history-event tactical-history"><div class="event-minute">${displayMatchMinute(e.minute)}</div><div class="grow"><strong>Cambio modulo · ${esc(e.formation_from||'—')} → ${esc(e.formation_to)}</strong><small>${Array.isArray(e.positions)?e.positions.length:0} posizioni storicizzate</small></div><span class="event-status">Tattica</span></article>`;const p=player(e.player_id),p2=player(e.secondary_player_id);return `<article class="history-event"><div class="event-minute">${displayMatchMinute(e.minute)}</div><div class="grow"><strong>${eventLabels[e.event_type]||e.event_type}</strong><small>${e.team_side==='opponent'?'Avversario':esc(p?.first_name||'')+' '+esc(p?.last_name||'')}${p2?' · '+esc(p2.last_name):''}</small></div><span class="event-status">${e.validation_status}</span>${isStaff()?`<button class="icon-btn danger" data-delete-event="${e.id}">×</button>`:''}</article>`}).join('')||'<div class="empty-card">Nessun evento registrato.</div>'}</div>`;
}
async function saveLineup(){
 const m=state.matches.find(x=>x.id===state.matchDetailId),formation=document.querySelector('#formation-select-top')?.value||document.querySelector('#formation-select')?.value||m.formation||'4-4-2';
 const captainId=document.querySelector('#captain-select')?.value||null;
 const rows=state.matchPlayers.map(x=>({
  ...x,
  shirt_number:x.shirt_number||null,
  minutes_played:x.minutes_played??null,
  is_captain:captainId?x.player_id===captainId:false,
  unused_sub_reason:document.querySelector(`[data-unused-reason="${x.player_id}"]`)?.value||x.unused_sub_reason||null
 }));
 if(rows.length){
  const clean=rows.map(({id,...x})=>x);
  const {error}=await supabase.from('app_match_players').upsert(clean,{onConflict:'match_id,player_id'});
  if(error)return toast(error.message,'err')
 }
 const {error:me}=await supabase.from('app_matches').update({formation}).eq('id',m.id);
 if(me)return toast(me.message,'err');
 toast('Formazione salvata');await load();await loadMatchDetail();render();
}
async function saveRetroEvent(e){
 e.preventDefault();const f=new FormData(e.currentTarget);
 const row={match_id:state.matchDetailId,event_type:f.get('event_type'),minute:matchMinute(f.get('period'),f.get('minute_in_half')),player_id:f.get('player_id')||null,secondary_player_id:f.get('secondary_player_id')||null,substitution_reason:f.get('event_type')==='substitution'?(f.get('substitution_reason')||null):null,team_side:f.get('team_side'),proposed_by:state.session.user.id,validation_status:'official',officialized_by:state.session.user.id,officialized_at:new Date().toISOString()};
 const {error}=await supabase.from('app_match_events').insert(row);if(error)return toast(error.message,'err');toast('Evento registrato');await loadMatchDetail();render();
}
async function saveTacticalChange(e){e.preventDefault();const f=new FormData(e.currentTarget),m=state.matches.find(x=>x.id===state.matchDetailId);const positions=state.matchPlayers.filter(x=>x.selection_status==='starter'||x.started).map(x=>({player_id:x.player_id,tactical_slot:x.tactical_slot,shirt_number:x.shirt_number}));const row={match_id:m.id,minute:matchMinute(f.get('tactical_period'),f.get('tactical_minute_in_half')),formation_from:m.formation||null,formation_to:f.get('formation_to'),positions,created_by:state.session.user.id};const {error}=await supabase.from('app_match_tactical_changes').insert(row);if(error)return toast(error.message,'err');const {error:me}=await supabase.from('app_matches').update({formation:f.get('formation_to')}).eq('id',m.id);if(me)return toast(me.message,'err');toast('Cambio modulo storicizzato');await load();await loadMatchDetail();render();}
async function deleteEvent(id){if(!confirm('Eliminare questo evento?'))return;const {error}=await supabase.from('app_match_events').delete().eq('id',id);if(error)return toast(error.message,'err');toast('Evento eliminato');await loadMatchDetail();render();}
function liveView(){
 const rows=[...state.matches].sort((a,b)=>new Date(b.kickoff_at||0)-new Date(a.kickoff_at||0));
 return `<section class="ui-panel match-ops"><div class="panel-head"><h3>Partite</h3><span>${rows.length} totali</span></div><div class="ops-list">${rows.map(m=>{const o=opponent(m.opponent_id),home=m.home_away==='home';return `<button class="ops-row" data-match="${m.id}"><span class="status ${m.status}">${esc(labels[m.status]||m.status)}</span><div><strong>${esc(home?'Calcio Caselle':o?.name||'Avversario')} – ${esc(home?o?.name||'Avversario':'Calcio Caselle')}</strong><small>${fmt(m.kickoff_at)} · ${esc(competition(m.competition_id)?.name||'Partita')}</small></div><b>${m.status==='scheduled'?'VS':num(m.home_score)+' : '+num(m.away_score)}</b><span class="row-menu">›</span></button>`}).join('')||'<div class="empty-card">Nessuna partita.</div>'}</div></section>${state.matchDetailId?matchDetail():''}`;
}

/* ROSTER */
function rosterView(){
 const tabs=[['all','Giocatori'],['P','Portieri'],['D','Difensori'],['C','Centrocampisti'],['A','Attaccanti']];
 return `<div class="page-tools"><div class="segmented compact">${tabs.map(([id,l],i)=>`<button data-role-filter="${id}" class="${i===0?'active':''}">${l}</button>`).join('')}</div><div class="toolbar-actions"><span class="muted-count">${state.players.length} giocatori</span>${isStaff()?'<button class="primary small" data-new-player>+ Aggiungi giocatore</button>':''}</div></div>
 <section class="ui-panel data-panel roster-table" id="roster-grid"><div class="data-head roster-head"><span>#</span><span>Ruolo</span><span>Giocatore</span><span>Nato il</span><span>Presenze</span><span>Gol</span><span>Stato</span><span>Azioni</span></div><div class="data-body">${state.players.map((p,i)=>{const s=stat(p.id);return `<button class="data-row roster-row player-profile-card" data-player="${p.id}" data-role="${p.generic_role_manual||''}"><span class="row-index">${i+1}</span><span class="role-square role-${p.generic_role_manual||'x'}">${p.generic_role_manual||'–'}</span><span class="player-cell"><span class="player-avatar xs">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:initials(p.first_name,p.last_name)}</span><span><strong>${esc(p.last_name)} ${esc(p.first_name)}</strong><small>${labels[p.generic_role_manual]||'Ruolo n/d'}</small></span></span><span>${esc(p.birth_date||'—')}</span><span>${num(s.appearances)}</span><span class="strong-stat">${num(s.goals)}</span><span><i class="status active-player">Attivo</i></span><span class="row-menu">⋮</span></button>`}).join('')||'<div class="empty-card">Nessun giocatore.</div>'}</div></section>`;
}

function playerCard(p){
  const s=stat(p.id);
  return `<button class="player-profile-card" data-player="${p.id}" data-role="${p.generic_role_manual||''}"><div class="player-avatar xl">${initials(p.first_name,p.last_name)}</div><div class="player-main"><strong>${esc(p.first_name)} ${esc(p.last_name)}</strong><span>${labels[p.generic_role_manual]||'Ruolo n/d'} · ${esc(p.preferred_foot||'piede n/d')}</span></div><div class="mini-kpis"><span><b>${num(s.appearances)}</b>PG</span><span><b>${num(s.goals)}</b>G</span><span><b>${num(s.assists)}</b>A</span></div></button>`;
}
function playerSheet(p){
  const s=stat(p.id);
  return `<div class="sheet-backdrop" data-close-sheet><section class="player-sheet" onclick="event.stopPropagation()"><button class="sheet-close" data-close-sheet>×</button>
    <div class="sheet-head"><div class="player-avatar xl">${initials(p.first_name,p.last_name)}</div><div><span class="eyebrow">${labels[p.generic_role_manual]||'GIOCATORE'}</span><h2>${esc(p.first_name)} ${esc(p.last_name)}</h2><p>${esc(p.nationality_code||'')} ${p.height_cm?'· '+p.height_cm+' cm':''}</p></div></div>
    <div class="metric-grid">${kpi('Presenze',num(s.appearances))}${kpi('Minuti',num(s.minutes))}${kpi('Gol',num(s.goals))}${kpi('Assist',num(s.assists))}</div>
    <div class="detail-grid"><div><span>Piede</span><strong>${esc(p.preferred_foot||'—')}</strong></div><div><span>Nascita</span><strong>${esc(p.birth_date||'—')}</strong></div><div><span>Media voto</span><strong>${s.avg_rating??'—'}</strong></div><div><span>Cartellini</span><strong>${num(s.yellow_cards)} G · ${num(s.red_cards)} R</strong></div></div>
    ${isStaff()?`<div class="sheet-actions"><button class="ghost" data-edit-player="${p.id}">Modifica</button><button class="ghost danger" data-delete-player="${p.id}">Elimina</button></div>`:''}
  </section></div>`;
}
const nationalities=['Albania','Algeria','Argentina','Australia','Austria','Belgio','Bolivia','Bosnia ed Erzegovina','Brasile','Bulgaria','Camerun','Canada','Cile','Cina','Colombia','Corea del Sud','Costa d’Avorio','Costa Rica','Croazia','Danimarca','Ecuador','Egitto','Finlandia','Francia','Germania','Ghana','Giappone','Grecia','India','Inghilterra','Iran','Irlanda','Islanda','Israele','Italia','Kosovo','Marocco','Messico','Montenegro','Nigeria','Norvegia','Paesi Bassi','Paraguay','Perù','Polonia','Portogallo','Repubblica Ceca','Romania','Russia','Scozia','Senegal','Serbia','Slovacchia','Slovenia','Spagna','Stati Uniti','Svezia','Svizzera','Tunisia','Turchia','Ucraina','Ungheria','Uruguay','Venezuela'];
function playerEditor(){
  const p=state.selectedPlayerId?player(state.selectedPlayerId):null;
  return `<div class="sheet-backdrop"><section class="player-sheet editor"><button class="sheet-close" data-close-editor>×</button><h2>${p?'Modifica giocatore':'Nuovo giocatore'}</h2>
    <form id="player-form" data-id="${p?.id||''}"><div class="form-grid">
      <label>Nome<input name="first_name" required value="${esc(p?.first_name||'')}"></label>
      <label>Cognome<input name="last_name" required value="${esc(p?.last_name||'')}"></label>
      <label>Ruolo<select name="generic_role_manual"><option value="">—</option>${['P','D','C','A'].map(r=>`<option value="${r}" ${p?.generic_role_manual===r?'selected':''}>${labels[r]}</option>`).join('')}</select></label>
      <label>Piede<select name="preferred_foot"><option value="">—</option>${['right','left','both'].map(v=>`<option value="${v}" ${p?.preferred_foot===v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label>Data nascita<input type="date" name="birth_date" value="${p?.birth_date||''}"></label>
      <label>Altezza cm<input type="number" name="height_cm" value="${p?.height_cm||''}"></label>
      <label>Nazionalità<div class="nationality-picker"><input id="nationality-search" autocomplete="off" placeholder="Cerca nazionalità…" value="${esc(p?.nationality_code||'')}"><input type="hidden" name="nationality_code" value="${esc(p?.nationality_code||'')}"><div id="nationality-options" class="nationality-options"></div></div></label>
      <label>Foto URL<input name="photo_url" value="${esc(p?.photo_url||'')}"></label>
    </div><button class="primary" type="submit">Salva giocatore</button></form></section></div>`;
}

/* ANALYTICS */
function statsView(){
 const rows=[...state.stats],goals=rows.reduce((a,x)=>a+num(x.goals),0),assists=rows.reduce((a,x)=>a+num(x.assists),0),mins=rows.reduce((a,x)=>a+num(x.minutes),0);
 const ratings=rows.map(x=>Number(x.avg_rating)).filter(Boolean),topGoals=[...rows].sort((a,b)=>num(b.goals)-num(a.goals)).slice(0,6),topMins=[...rows].sort((a,b)=>num(b.minutes)-num(a.minutes)).slice(0,6);
 const roles=['P','D','C','A'].map(r=>({r,n:state.players.filter(p=>p.generic_role_manual===r).length})),maxG=Math.max(1,...topGoals.map(x=>num(x.goals))),maxM=Math.max(1,...topMins.map(x=>num(x.minutes)));
 return `<div class="page-tools"><div class="segmented compact"><button class="active">Panoramica</button><button>Giocatori</button><button>Squadra</button><button>Competizioni</button></div><span class="season-chip">${esc(season()?.name||'—')}</span></div>
 <div class="stats-summary-grid">${kpi('Gol',goals,'totali',icons.live)}${kpi('Assist',assists,'totali',icons.roster)}${kpi('Minuti',mins,'registrati',icons.calendar)}${kpi('Media voto',ratings.length?avg(ratings).toFixed(2):'—','squadra',icons.stats)}</div>
 <div class="analytics-grid"><section class="dash-panel"><div class="panel-head"><h3>Top marcatori</h3><span>Gol</span></div>${barList(topGoals,'goals',maxG)}</section><section class="dash-panel"><div class="panel-head"><h3>Più utilizzati</h3><span>Minuti</span></div>${barList(topMins,'minutes',maxM)}</section><section class="dash-panel"><div class="panel-head"><h3>Composizione rosa</h3><span>Ruoli</span></div><div class="role-bars">${roles.map(x=>`<div><span>${labels[x.r]}</span><div class="role-track"><i style="width:${state.players.length?Math.round(x.n/state.players.length*100):0}%"></i></div><b>${x.n}</b></div>`).join('')}</div></section><section class="dash-panel"><div class="panel-head"><h3>Disciplina</h3><span>Cartellini</span></div><div class="discipline"><div><strong>${rows.reduce((a,x)=>a+num(x.yellow_cards),0)}</strong><span>Gialli</span></div><div><strong>${rows.reduce((a,x)=>a+num(x.red_cards),0)}</strong><span>Rossi</span></div><div><strong>${rows.filter(x=>num(x.appearances)>0).length}</strong><span>Impiegati</span></div></div></section></div>
 <section class="dash-panel stats-detail"><div class="panel-head"><h3>Dettaglio giocatori</h3><span>${rows.length} record</span></div><div class="stats-table"><div class="stats-row header"><span>Giocatore</span><span>PG</span><span>MIN</span><span>G</span><span>A</span><span>V</span></div>${rows.sort((a,b)=>num(b.goals)-num(a.goals)).map(x=>`<button class="stats-row" data-player="${x.player_id}"><span class="player-cell"><span class="player-avatar xs">${initials(x.first_name,x.last_name)}</span><span><strong>${esc(x.last_name)} ${esc(x.first_name)}</strong><small>${labels[x.position_group]||'—'}</small></span></span><span>${num(x.appearances)}</span><span>${num(x.minutes)}</span><span class="strong-stat">${num(x.goals)}</span><span>${num(x.assists)}</span><span>${x.avg_rating??'—'}</span></button>`).join('')}</div></section>`;
}

function barList(rows,key,max){
  return `<div class="bar-list">${rows.map(x=>`<button data-player="${x.player_id}"><span>${esc(x.last_name)} ${esc(x.first_name)}</span><div class="bar-track"><i style="width:${Math.max(4,Math.round(num(x[key])/max*100))}%"></i></div><b>${num(x[key])}</b></button>`).join('')||'<div class="empty-card">Nessun dato.</div>'}</div>`;
}

/* PROFILE */
function profileView(){
  if(!state.session)return `<div class="auth-card glass"><div class="brand-mark large">TM</div><h2>Accedi</h2><p>Usa username e password esistenti.</p><form id="login-form"><label>Username<input name="username" required></label><label>Password<input name="password" type="password" required></label><button class="primary">Accedi</button><div id="auth-msg" class="form-msg"></div></form></div>`;
  return `<div class="profile-card glass"><div class="player-avatar xl">ME</div><h2>Account Team Manager</h2><span class="role-chip">${labels[state.role]||state.role}</span><button id="logout" class="ghost danger">Esci</button></div>`;
}

/* ADMIN */
function adminView(){
  if(!isStaff())return '<div class="empty-card">Area riservata.</div>';
  const tabs=[['competitions','Competizioni'],['opponents','Avversari'],['users','Utenti'],['settings','Impostazioni']];
  return `<div class="admin-tabs">${tabs.map(([id,l])=>`<button data-admin-tab="${id}" class="${state.adminTab===id?'active':''}">${l}</button>`).join('')}</div>${({competitions:adminCompetitions,opponents:adminOpponents,users:adminUsers,settings:adminSettings})[state.adminTab]()}`;
}
function adminCompetitions(){
  return `<div class="admin-split"><section class="card"><h3>Nuova competizione</h3><form id="competition-form" class="form-grid"><input type="hidden" name="id"><label>Nome<input name="name" required></label><label>Tipo<select name="kind">${['league','cup','friendly','tournament','other'].map(v=>`<option value="${v}">${labels[v]}</option>`).join('')}</select></label><button class="primary">Salva</button></form></section><section class="compact-list">${state.competitions.map(c=>`<article class="crud-row"><div><strong>${esc(c.name)}</strong><span>${labels[c.kind]||c.kind}</span></div><div><button class="icon-btn" data-edit-comp="${c.id}">✎</button><button class="icon-btn danger" data-delete-comp="${c.id}">×</button></div></article>`).join('')||'<div class="empty-card">Nessuna competizione.</div>'}</section></div>`;
}
function adminOpponents(){
  return `<div class="admin-split"><section class="card"><h3>Nuovo avversario</h3><form id="opponent-form" class="form-grid"><input type="hidden" name="id"><label>Nome<input name="name" required></label><label>Nome breve<input name="short_name"></label><label>Logo URL<input name="logo_url"></label><button class="primary">Salva</button></form></section><section class="compact-list">${state.opponents.map(o=>`<article class="crud-row"><div><strong>${esc(o.name)}</strong><span>${esc(o.short_name||'')}</span></div><div><button class="icon-btn" data-edit-opp="${o.id}">✎</button><button class="icon-btn danger" data-delete-opp="${o.id}">×</button></div></article>`).join('')||'<div class="empty-card">Nessun avversario.</div>'}</section></div>`;
}
function adminUsers(){
  if(!isAdmin())return '<div class="empty-card">Gestione utenti riservata all’admin.</div>';
  return `<div class="admin-split"><section class="card"><h3>Nuovo utente</h3><form id="user-form" class="form-grid"><label>Username<input name="username" required></label><label>Nome visualizzato<input name="display_name" required></label><label>Password iniziale<input name="password" type="password" minlength="8" required></label><label>Ruolo<select name="role">${['fan','player','coach','manager','admin'].map(v=>`<option value="${v}">${labels[v]}</option>`).join('')}</select></label><button class="primary">Crea account</button></form></section><section class="compact-list">${state.profiles.map(p=>{const r=state.userRoles.find(x=>x.user_id===p.id);return `<article class="crud-row"><div><strong>${esc(p.display_name||p.username)}</strong><span>@${esc(p.username)} · ${p.is_active===false?'disattivo':'attivo'}</span></div><div><select data-user-role="${p.id}">${['fan','player','coach','manager','admin'].map(v=>`<option value="${v}" ${r?.role===v?'selected':''}>${labels[v]}</option>`).join('')}</select><button class="icon-btn danger" data-disable-user="${p.id}">×</button></div></article>`}).join('')}</section></div>`;
}
function adminSettings(){
 const s=state.settings;
 return `<div class="settings-layout">
 <section class="card branding-card"><div class="settings-title"><div><span class="eyebrow">IDENTITÀ VISIVA</span><h3>Branding</h3><p>Carica il logo: la palette viene proposta automaticamente e applicata a tutta l'app.</p></div><div class="brand-preview" id="brand-preview">${s.team_logo_url?`<img src="${esc(s.team_logo_url)}" alt="Logo">`:'TM'}</div></div>
 <form id="branding-form">
   <label class="logo-upload"><input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><span>Carica logo</span><small>PNG, JPG, WebP o SVG</small></label>
   <div class="theme-mode"><label><input type="radio" name="theme_mode" value="auto" ${s.theme_mode!=='manual'?'checked':''}> Auto dal logo</label><label><input type="radio" name="theme_mode" value="manual" ${s.theme_mode==='manual'?'checked':''}> Manuale</label></div>
   <div class="palette-editor">
    <label><span>Primario</span><input type="color" name="theme_primary" value="${esc(s.theme_primary||'#2f96c8')}"><b data-color-value="theme_primary">${esc(s.theme_primary||'#2f96c8')}</b></label>
    <label><span>Secondario</span><input type="color" name="theme_secondary" value="${esc(s.theme_secondary||'#153b5b')}"><b data-color-value="theme_secondary">${esc(s.theme_secondary||'#153b5b')}</b></label>
    <label><span>Accento</span><input type="color" name="theme_accent" value="${esc(s.theme_accent||'#78c8e8')}"><b data-color-value="theme_accent">${esc(s.theme_accent||'#78c8e8')}</b></label>
    <label><span>Superficie</span><input type="color" name="theme_surface_tint" value="${esc(s.theme_surface_tint||'#dceff8')}"><b data-color-value="theme_surface_tint">${esc(s.theme_surface_tint||'#dceff8')}</b></label>
   </div>
   <div class="branding-actions"><button type="button" class="ghost" data-regenerate-palette ${s.team_logo_url?'':'disabled'}>Rigenera palette</button><button class="primary">Salva branding</button></div>
 </form></section>
 <section class="card settings-card"><span class="eyebrow">LIVE</span><h3>Livescore collaborativo</h3><form id="settings-form"><label>Conferme necessarie<input type="number" min="1" max="20" name="threshold" value="${s.community_confirmations_required}"></label><button class="primary">Salva</button></form></section>
 </div>`;
}

/* CRUD */
async function savePlayer(e){
  e.preventDefault();const f=new FormData(e.currentTarget),id=e.currentTarget.dataset.id;
  const row={team_id:TEAM_ID,first_name:f.get('first_name'),last_name:f.get('last_name'),generic_role_manual:f.get('generic_role_manual')||null,preferred_foot:f.get('preferred_foot')||null,birth_date:f.get('birth_date')||null,height_cm:f.get('height_cm')?Number(f.get('height_cm')):null,nationality_code:f.get('nationality_code')||null,photo_url:f.get('photo_url')||null};
  const q=id?supabase.from('players').update(row).eq('id',id):supabase.from('players').insert(row).select().single(); const {data,error}=await q;
  if(error)return toast(error.message,'err');
  if(!id&&data&&season())await supabase.from('app_roster').insert({season_id:season().id,player_id:data.id});
  state.playerEditorOpen=false;state.selectedPlayerId=null;toast('Giocatore salvato');await load();
}
async function deletePlayer(id){if(!confirm('Eliminare definitivamente questo giocatore?'))return;const {error}=await supabase.from('players').delete().eq('id',id);if(error)return toast(error.message,'err');state.selectedPlayerId=null;toast('Giocatore eliminato');await load();}
async function saveCompetition(e){e.preventDefault();const f=new FormData(e.currentTarget),id=f.get('id'),row={season_id:season().id,name:f.get('name'),kind:f.get('kind')};const {error}=id?await supabase.from('app_competitions').update(row).eq('id',id):await supabase.from('app_competitions').insert(row);if(error)return toast(error.message,'err');toast('Competizione salvata');await load();}
async function saveOpponent(e){e.preventDefault();const f=new FormData(e.currentTarget),id=f.get('id'),row={name:f.get('name'),short_name:f.get('short_name')||null,logo_url:f.get('logo_url')||null};const {error}=id?await supabase.from('app_opponents').update(row).eq('id',id):await supabase.from('app_opponents').insert(row);if(error)return toast(error.message,'err');toast('Avversario salvato');await load();}
async function createUser(e){
 e.preventDefault();const f=new FormData(e.currentTarget);const role=f.get('role');const {data,error}=await supabase.functions.invoke('admin-create-user',{body:{team_id:TEAM_ID,season_id:season()?.id,username:f.get('username'),display_name:f.get('display_name'),password:f.get('password'),roles:role==='admin'?['admin']:[],must_change_password:true,start_date:new Date().toISOString().slice(0,10)}});if(error||data?.ok===false)return toast(data?.error||error?.message||'Errore creazione utente','err');
 await supabase.from('app_user_roles').upsert({user_id:data.user_id,role},{onConflict:'user_id'});toast('Utente creato');await load();
}
async function changeRole(id,role){const {error}=await supabase.from('app_user_roles').upsert({user_id:id,role},{onConflict:'user_id'});if(error)return toast(error.message,'err');toast('Ruolo aggiornato');await load();}
async function disableUser(id){if(!confirm('Eliminare definitivamente questo account? Il giocatore eventualmente collegato resterà in rosa.'))return;const {data,error}=await supabase.functions.invoke('admin-delete-user',{body:{user_id:id}});if(error||data?.ok===false)return toast(data?.error||error?.message||'Errore eliminazione','err');toast('Account eliminato');await load();}
async function saveSettings(e){e.preventDefault();const n=Number(new FormData(e.currentTarget).get('threshold'));const {error}=await supabase.from('app_settings').update({community_confirmations_required:n}).eq('id',true);if(error)return toast(error.message,'err');toast('Impostazioni salvate');await load();}
async function saveBranding(e){
 e.preventDefault();const form=e.currentTarget,f=new FormData(form),file=document.querySelector('#logo-file')?.files?.[0];let logoUrl=state.settings.team_logo_url||null;
 if(file){
  const ext=(file.name.split('.').pop()||'png').toLowerCase(),path=`${TEAM_ID}/branding/logo-${Date.now()}.${ext}`;
  const {error:upErr}=await supabase.storage.from('team-assets').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(upErr)return toast(upErr.message,'err');
  logoUrl=supabase.storage.from('team-assets').getPublicUrl(path).data.publicUrl;
 }
 const row={team_logo_url:logoUrl,theme_mode:f.get('theme_mode')||'auto',theme_primary:f.get('theme_primary'),theme_secondary:f.get('theme_secondary'),theme_accent:f.get('theme_accent'),theme_surface_tint:f.get('theme_surface_tint')};
 const {error}=await supabase.from('app_settings').update(row).eq('id',true);if(error)return toast(error.message,'err');
 state.settings={...state.settings,...row};applyTheme();toast('Branding aggiornato');await load();
}
function bindBranding(){
 const form=document.querySelector('#branding-form'),file=document.querySelector('#logo-file');if(!form)return;form.onsubmit=saveBranding;
 const paint=()=>{const row={theme_primary:form.theme_primary.value,theme_secondary:form.theme_secondary.value,theme_accent:form.theme_accent.value,theme_surface_tint:form.theme_surface_tint.value};state.settings={...state.settings,...row};applyTheme();Object.entries(row).forEach(([k,v])=>{const b=form.querySelector(`[data-color-value="${k}"]`);if(b)b.textContent=v})};
 form.querySelectorAll('input[type="color"]').forEach(x=>x.oninput=()=>{const manual=form.querySelector('input[name="theme_mode"][value="manual"]');if(manual)manual.checked=true;paint()});
 const usePalette=async selected=>{const pal=await extractLogoPalette(selected);form.theme_primary.value=pal.primary;form.theme_secondary.value=pal.secondary;form.theme_accent.value=pal.accent;form.theme_surface_tint.value=pal.surface;const auto=form.querySelector('input[name="theme_mode"][value="auto"]');if(auto)auto.checked=true;paint()};
 if(file)file.onchange=async()=>{const selected=file.files?.[0];if(!selected)return;const preview=document.querySelector('#brand-preview');if(preview){const u=URL.createObjectURL(selected);preview.innerHTML=`<img src="${u}" alt="Logo">`;preview.querySelector('img').onload=()=>URL.revokeObjectURL(u)}try{await usePalette(selected)}catch(err){toast('Logo caricato, palette automatica non disponibile','err')}};
 const regen=document.querySelector('[data-regenerate-palette]');if(regen)regen.onclick=async()=>{const selected=file?.files?.[0];if(selected)return usePalette(selected);toast('Seleziona nuovamente il logo per rigenerare la palette','err')};
}

/* BIND */
function bind(){
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;state.selectedPlayerId=null;render()});
 document.querySelectorAll('[data-admin-tab]').forEach(b=>b.onclick=()=>{state.adminTab=b.dataset.adminTab;render()});
 document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>{state.selectedPlayerId=b.dataset.player;render();document.body.insertAdjacentHTML('beforeend',playerSheet(player(state.selectedPlayerId)));bindOverlay()});
 document.querySelectorAll('[data-match-tab]').forEach(x=>x.onclick=()=>{state.matchTab=x.dataset.matchTab;render()});
 document.querySelectorAll('[data-close-detail]').forEach(x=>x.onclick=()=>{state.matchDetailId=null;render()});
 document.querySelectorAll('[data-save-lineup]').forEach(sl=>sl.onclick=saveLineup);bindFormationDnD();
 document.querySelectorAll('[data-quick-starter]').forEach(x=>x.onclick=e=>{e.stopPropagation();moveFormationPlayer(x.dataset.quickStarter,'starterlist',null)});
 document.querySelectorAll('[data-quick-bench]').forEach(x=>x.onclick=e=>{e.stopPropagation();moveFormationPlayer(x.dataset.quickBench,'bench',null)});
 document.querySelectorAll('[data-shirt-picker]').forEach(x=>x.onclick=e=>{e.preventDefault();e.stopPropagation();document.body.insertAdjacentHTML('beforeend',shirtPicker(x.dataset.shirtPicker));bindShirtPicker()});
 const mu=document.querySelector('[data-mark-unavailable]');if(mu)mu.onclick=()=>{document.body.insertAdjacentHTML('beforeend',unavailableDialog());bindUnavailable()};
 document.querySelectorAll('[data-unavailable]').forEach(x=>x.onclick=e=>{e.stopPropagation();document.body.insertAdjacentHTML('beforeend',unavailableDialog(x.dataset.unavailable));bindUnavailable()});
 const ref=document.querySelector('#retro-event-form');if(ref)ref.onsubmit=saveRetroEvent;const tf=document.querySelector('#tactical-change-form');if(tf)tf.onsubmit=saveTacticalChange;
 document.querySelectorAll('[data-delete-event]').forEach(x=>x.onclick=()=>deleteEvent(x.dataset.deleteEvent));
 document.querySelectorAll('[data-player-event]').forEach(x=>x.onclick=e=>{e.stopPropagation();state.matchTab='events';render();setTimeout(()=>{const type=document.querySelector('#retro-event-form [name="event_type"]');if(type)type.value=x.dataset.eventKind||'substitution';const p=document.querySelector('#retro-event-form [name="player_id"]');if(p)p.value=x.dataset.playerEvent||''},0)});
 const nm=document.querySelector('[data-new-match]');if(nm)nm.onclick=()=>{state.selectedMatchId=null;state.matchEditorOpen=true;render()};
 document.querySelectorAll('[data-match]').forEach(x=>x.onclick=async()=>{state.matchDetailId=x.dataset.match;state.matchTab='lineup';await loadMatchDetail();render()});
 const mf=document.querySelector('#match-form');if(mf)mf.onsubmit=saveMatch;
 document.querySelectorAll('[data-close-match]').forEach(x=>x.onclick=()=>{state.matchEditorOpen=false;state.selectedMatchId=null;render()});
 document.querySelectorAll('[data-delete-match]').forEach(x=>x.onclick=()=>deleteMatch(x.dataset.deleteMatch));
 const np=document.querySelector('[data-new-player]');if(np)np.onclick=()=>{state.selectedPlayerId=null;state.playerEditorOpen=true;render()};
 document.querySelectorAll('[data-role-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-role-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.player-profile-card').forEach(c=>c.style.display=b.dataset.roleFilter==='all'||c.dataset.role===b.dataset.roleFilter?'':'none')});
 const pf=document.querySelector('#player-form');if(pf){pf.onsubmit=savePlayer;bindNationalityPicker();}
 const cf=document.querySelector('#competition-form');if(cf)cf.onsubmit=saveCompetition;
 const of=document.querySelector('#opponent-form');if(of)of.onsubmit=saveOpponent;
 const uf=document.querySelector('#user-form');if(uf)uf.onsubmit=createUser;
 const sf=document.querySelector('#settings-form');if(sf)sf.onsubmit=saveSettings;bindBranding();
 document.querySelectorAll('[data-edit-comp]').forEach(b=>b.onclick=()=>{const c=competition(b.dataset.editComp),f=document.querySelector('#competition-form');f.id.value=c.id;f.name.value=c.name;f.kind.value=c.kind});
 document.querySelectorAll('[data-delete-comp]').forEach(b=>b.onclick=async()=>{if(confirm('Eliminare la competizione?')){const {error}=await supabase.from('app_competitions').delete().eq('id',b.dataset.deleteComp);if(error)toast(error.message,'err');else{toast('Competizione eliminata');await load()}}});
 document.querySelectorAll('[data-edit-opp]').forEach(b=>b.onclick=()=>{const o=opponent(b.dataset.editOpp),f=document.querySelector('#opponent-form');f.id.value=o.id;f.name.value=o.name;f.short_name.value=o.short_name||'';f.logo_url.value=o.logo_url||''});
 document.querySelectorAll('[data-delete-opp]').forEach(b=>b.onclick=async()=>{if(confirm('Eliminare l’avversario?')){const {error}=await supabase.from('app_opponents').delete().eq('id',b.dataset.deleteOpp);if(error)toast(error.message,'err');else{toast('Avversario eliminato');await load()}}});
 document.querySelectorAll('[data-user-role]').forEach(s=>s.onchange=()=>changeRole(s.dataset.userRole,s.value));
 document.querySelectorAll('[data-disable-user]').forEach(b=>b.onclick=()=>disableUser(b.dataset.disableUser));
 const login=document.querySelector('#login-form');if(login)login.onsubmit=async e=>{e.preventDefault();const f=new FormData(login),msg=document.querySelector('#auth-msg');msg.textContent='Accesso…';const {data,error}=await supabase.functions.invoke('auth-login',{body:{username:f.get('username'),password:f.get('password')}});if(error||!data?.session)return msg.textContent=data?.error||error?.message||'Accesso fallito';await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});};
 const logout=document.querySelector('#logout');if(logout)logout.onclick=()=>supabase.auth.signOut();
 document.querySelectorAll('[data-close-editor]').forEach(b=>b.onclick=()=>{state.playerEditorOpen=false;state.selectedPlayerId=null;render()});
}
function bindShirtPicker(){const b=document.querySelector('.shirt-popover-backdrop');if(!b)return;b.onclick=()=>b.remove();b.querySelectorAll('[data-pick-shirt]').forEach(x=>x.onclick=()=>pickShirt(x.dataset.player,Number(x.dataset.pickShirt)));}
function bindUnavailable(){const b=document.querySelector('.mini-modal-backdrop');if(!b)return;b.onclick=()=>b.remove();const f=b.querySelector('#unavailable-form');if(f)f.onsubmit=saveUnavailable;}
function bindNationalityPicker(){
 const input=document.querySelector('#nationality-search'),hidden=document.querySelector('input[name="nationality_code"]'),box=document.querySelector('#nationality-options');if(!input||!hidden||!box)return;
 const draw=()=>{const q=input.value.trim().toLocaleLowerCase('it');const rows=nationalities.filter(n=>!q||n.toLocaleLowerCase('it').includes(q)).slice(0,12);box.innerHTML=rows.map(n=>`<button type="button" data-nationality="${esc(n)}">${esc(n)}</button>`).join('');box.classList.toggle('open',document.activeElement===input);box.querySelectorAll('[data-nationality]').forEach(b=>b.onclick=()=>{input.value=b.dataset.nationality;hidden.value=b.dataset.nationality;box.classList.remove('open')})};
 input.onfocus=draw;input.oninput=()=>{hidden.value='';draw()};input.onblur=()=>setTimeout(()=>{box.classList.remove('open');if(!nationalities.includes(input.value)){input.value=hidden.value||''}},120);
}
function bindOverlay(){
 document.querySelectorAll('[data-close-sheet]').forEach(x=>x.onclick=()=>{document.querySelector('.sheet-backdrop')?.remove();state.selectedPlayerId=null});
 const e=document.querySelector('[data-edit-player]');if(e)e.onclick=()=>{document.querySelector('.sheet-backdrop')?.remove();state.selectedPlayerId=e.dataset.editPlayer;state.playerEditorOpen=true;render()};
 const d=document.querySelector('[data-delete-player]');if(d)d.onclick=()=>deletePlayer(d.dataset.deletePlayer);
}

function render(){
 applyTheme();
 if(state.loading){shell('<div class="loading"><div class="spinner"></div><span>Caricamento…</span></div>');bind();return;}
 const fn={home:homeView,calendar:calendarView,live:liveView,roster:rosterView,stats:statsView,profile:profileView,admin:adminView}[state.view]||homeView;
 shell(fn());bind();
}
async function load(){
 state.loading=true;render();
 const {data:{session:s}}=await supabase.auth.getSession();state.session=s;
 if(s){const {data:r}=await supabase.from('app_user_roles').select('role').eq('user_id',s.user.id).maybeSingle();state.role=r?.role||'fan'}else state.role=null;
 const [players,seasons,comps,opps,matches,scores,settings]=await Promise.all([
  supabase.from('players').select('id,first_name,last_name,birth_date,preferred_foot,photo_url,nationality_code,generic_role_manual,height_cm').order('last_name'),
  supabase.from('app_seasons').select('*').order('start_date',{ascending:false}),
  supabase.from('app_competitions').select('*').order('name'),
  supabase.from('app_opponents').select('*').order('name'),
  supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true}),
  supabase.from('app_match_score').select('*'),
  supabase.from('app_settings').select('*').eq('id',true).maybeSingle()
 ]);
 state.players=players.data||[];state.seasons=seasons.data||[];state.competitions=comps.data||[];state.opponents=opps.data||[];state.matches=matches.data||[];state.scores=scores.data||[];state.settings=settings.data||state.settings;
 const cs=season();if(cs){const {data}=await supabase.from('app_player_season_stats').select('*').eq('season_id',cs.id);state.stats=data||[]}
 if(s&&isAdmin()){
   const [p,r]=await Promise.all([supabase.from('profiles').select('id,username,display_name,is_active').order('display_name'),supabase.from('app_user_roles').select('*')]);
   state.profiles=p.data||[];state.userRoles=r.data||[];
 }
 state.loading=false;render();
}
supabase.auth.onAuthStateChange(()=>setTimeout(load,0));
load();
