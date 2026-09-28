import { supabase } from './supabase.js';

const TEAM_ID='d0c3210b-6a8a-4a1b-93c8-e2400029006e';
const app=document.querySelector('#app');
const toastRoot=document.querySelector('#toast-root');

const state={
  view:'home', loading:true, busy:false, session:null, role:null, rolePlayerId:null,
  players:[], seasons:[], competitions:[], opponents:[], matches:[], scores:[], stats:[],
  selectedMatchId:null, liveEvents:[], confirmations:[], matchPlayers:[], ratings:[],
  adminTab:'matches', profiles:[], userRoles:[], settings:{community_confirmations_required:3},
  realtime:null
};

const labels={
  scheduled:'Programmata',live:'Live',finished:'Conclusa',postponed:'Rinviata',cancelled:'Annullata',
  proposed:'Proposto',community_confirmed:'Confermato',official:'Ufficiale',disputed:'Contestato',rejected:'Rifiutato',
  goal:'Gol',assist:'Assist',yellow_card:'Ammonizione',red_card:'Espulsione',substitution:'Sostituzione',
  own_goal:'Autogol',penalty_scored:'Rigore segnato',penalty_missed:'Rigore sbagliato',other:'Altro',
  fan:'Fan',player:'Giocatore',coach:'Mister',manager:'Dirigente',admin:'Admin',
  P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante'
};

const icons={home:'⌂',calendar:'◫',live:'●',stats:'⌁',profile:'○',admin:'⚙'};
const isStaff=()=>['manager','admin'].includes(state.role);
const isAdmin=()=>state.role==='admin';
const currentSeason=()=>state.seasons.find(s=>s.status==='active')||state.seasons[0]||null;
const selectedMatch=()=>state.matches.find(m=>m.id===state.selectedMatchId)||state.matches.find(m=>m.status==='live')||state.matches.find(m=>m.status==='scheduled')||state.matches[0]||null;
const opponent=m=>state.opponents.find(o=>o.id===m?.opponent_id);
const competition=m=>state.competitions.find(c=>c.id===m?.competition_id);
const player=id=>state.players.find(p=>p.id===id);
const scoreFor=id=>state.scores.find(s=>s.match_id===id)||{team_score_live:0,opponent_score_live:0,team_score_confirmed:0,opponent_score_confirmed:0};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const initials=(a='',b='')=>(`${a?.[0]||''}${b?.[0]||''}`.toUpperCase()||'TM');
const fmtDate=v=>v?new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'Da programmare';
const fmtDay=v=>v?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short'}).format(new Date(v)):'—';
const roleName=r=>labels[r]||r||'Ospite';
const eventName=e=>labels[e]||e;

function toast(message,type='ok'){
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;toastRoot.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},2600);
}
function setBusy(v){state.busy=v;render();}
function option(value,text,selected=false){return `<option value="${esc(value)}" ${selected?'selected':''}>${esc(text)}</option>`;}

function pageTitle(){return ({home:'Squadra',calendar:'Calendario',live:'Livescore',stats:'Statistiche',profile:'Profilo',admin:'Amministrazione'})[state.view]||'Team Manager';}
function shell(content){
  const nav=[['home','Home'],['calendar','Calendario'],['live','Live'],['stats','Stats'],['profile','Profilo']];
  app.innerHTML=`<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">TM</div><div><strong>Team Manager</strong><span>Calcio Caselle</span></div></div>
      <nav class="side-nav">${nav.map(([id,l])=>`<button data-view="${id}" class="${state.view===id?'active':''}"><span>${icons[id]}</span>${l}</button>`).join('')}
        ${isStaff()?`<div class="side-separator"></div><button data-view="admin" class="${state.view==='admin'?'active':''}"><span>⚙</span>Amministrazione</button>`:''}
      </nav>
      <div class="side-foot"><span class="role-chip">${roleName(state.role)}</span><small>${currentSeason()?.name||'Nessuna stagione'}</small></div>
    </aside>
    <main class="main">
      <header class="topbar"><div><div class="eyebrow">CALCIO CASELLE</div><h1>${pageTitle()}</h1></div>
      <button class="avatar" data-view="profile">${state.session?initials(state.session.user.user_metadata?.first_name,state.session.user.user_metadata?.last_name):'TM'}</button></header>
      <section class="content">${content}</section>
    </main>
    <nav class="bottom-nav">${nav.map(([id,l])=>`<button data-view="${id}" class="${state.view===id?'active':''}"><span class="nav-icon">${icons[id]}</span><span>${l}</span></button>`).join('')}</nav>
    ${state.busy?'<div class="busy"><div class="spinner"></div></div>':''}
  </div>`;
}

function homeView(){
  const next=state.matches.find(m=>m.status==='live')||state.matches.find(m=>m.status==='scheduled');
  const opp=opponent(next);const sc=next?scoreFor(next.id):null;
  const topGoals=[...state.stats].sort((a,b)=>(b.goals||0)-(a.goals||0)).slice(0,3);
  return `<div class="hero glass">
    <div class="hero-copy"><div class="pill">${next?.status==='live'?'<span class="live-dot"></span> LIVE':'PROSSIMA PARTITA'}</div>
    <h2>${next?`Caselle <span class="muted-vs">vs</span> ${esc(opp?.name||'Avversario')}`:'Stagione 2026/27'}</h2>
    <div class="hero-score">${next?`${sc.team_score_live} <span>:</span> ${sc.opponent_score_live}`:'—'}</div>
    <p>${next?`${fmtDate(next.kickoff_at)} · ${esc(next.venue||'Campo da definire')}`:'Crea la prima partita dal pannello amministrativo.'}</p>
    <button class="primary" data-view="${next?.status==='live'?'live':'calendar'}">${next?.status==='live'?'Apri livescore':'Vai al calendario'}</button></div>
    <div class="hero-orb"></div></div>
    <div class="metric-grid section-gap">
      <article class="metric"><span>Rosa</span><strong>${state.players.length}</strong><small>giocatori</small></article>
      <article class="metric"><span>Partite</span><strong>${state.matches.length}</strong><small>stagione</small></article>
      <article class="metric"><span>Competizioni</span><strong>${state.competitions.length}</strong><small>attive</small></article>
      <article class="metric"><span>Conferme live</span><strong>${state.settings.community_confirmations_required}</strong><small>soglia community</small></article>
    </div>
    <div class="section-head"><h3>Top marcatori</h3><button class="text-btn" data-view="stats">Tutte le stats</button></div>
    <div class="podium-list">${topGoals.length?topGoals.map((s,i)=>`<article><span class="rank">${i+1}</span><div class="player-avatar sm">${initials(s.first_name,s.last_name)}</div><div class="grow"><strong>${esc(s.first_name)} ${esc(s.last_name)}</strong><small>${s.assists||0} assist · ${s.minutes||0}'</small></div><b>${s.goals||0}</b></article>`).join(''):'<div class="empty-card">Le statistiche si popoleranno con le partite.</div>'}</div>`;
}

function calendarView(){
  const season=currentSeason();
  const rows=state.matches.filter(m=>!season||m.season_id===season.id);
  return `<div class="toolbar glass"><div><span class="eyebrow">STAGIONE</span><strong>${esc(season?.name||'—')}</strong></div>${isStaff()?'<button class="primary small" data-admin-tab="matches" data-view="admin">+ Partita</button>':''}</div>
  <div class="timeline">${rows.length?rows.map(m=>{const o=opponent(m);const s=scoreFor(m.id);return `<button class="match-card" data-match="${m.id}"><div class="date-chip"><strong>${fmtDay(m.kickoff_at).split(' ')[0]}</strong><span>${fmtDay(m.kickoff_at).split(' ')[1]||''}</span></div><div class="match-copy"><span class="status ${m.status}">${labels[m.status]}</span><strong>${m.home_away==='away'?`${esc(o?.name||'Avversario')} – Caselle`:`Caselle – ${esc(o?.name||'Avversario')}`}</strong><small>${esc(competition(m)?.name||'Partita')} · ${fmtDate(m.kickoff_at)}</small></div><div class="mini-score">${s.team_score_live}:${s.opponent_score_live}</div></button>`}).join(''):'<div class="empty-card">Nessuna partita programmata.</div>'}</div>`;
}

function eventForm(match){
  if(!state.session)return `<div class="login-hint">Accedi dal Profilo per segnalare eventi.</div>`;
  const opts=state.players.map(p=>option(p.id,`${p.last_name} ${p.first_name}`)).join('');
  return `<form id="event-form" class="event-form card"><div class="form-title"><strong>Nuovo evento</strong><span>può inserirlo chiunque</span></div>
    <div class="form-grid compact"><label>Evento<select name="event_type" required><option value="goal">Gol</option><option value="assist">Assist</option><option value="yellow_card">Ammonizione</option><option value="red_card">Espulsione</option><option value="substitution">Sostituzione</option><option value="own_goal">Autogol</option><option value="penalty_scored">Rigore segnato</option><option value="penalty_missed">Rigore sbagliato</option><option value="other">Altro</option></select></label>
    <label>Squadra<select name="team_side"><option value="team">Caselle</option><option value="opponent">Avversario</option></select></label>
    <label>Minuto<input name="minute" type="number" min="0" max="150" placeholder="es. 34"></label>
    <label>Giocatore<select name="player_id"><option value="">Nessuno</option>${opts}</select></label>
    <label>Secondo giocatore<select name="secondary_player_id"><option value="">Nessuno</option>${opts}</select></label></div>
    <button class="primary" type="submit">Invia evento</button></form>`;
}

function liveView(){
  const m=selectedMatch();if(!m)return `<div class="empty-card">Crea una partita per usare il livescore.</div>`;
  const o=opponent(m),s=scoreFor(m.id);
  const events=state.liveEvents.filter(e=>e.match_id===m.id);
  return `<div class="live-score glass"><div class="live-top"><div class="pill">${m.status==='live'?'<span class="live-dot"></span> LIVE':labels[m.status]}</div>${isStaff()?`<div class="staff-actions">${m.status!=='live'?`<button class="ghost" data-match-state="live">Avvia live</button>`:''}${m.status==='live'?`<button class="ghost" data-period="halftime">Intervallo</button><button class="ghost" data-period="second_half">2° tempo</button><button class="primary small" data-finalize>Finalizza</button>`:''}</div>`:''}</div>
    <div class="score-row"><div><div class="team-badge">CC</div><strong>Caselle</strong></div><div class="score-main"><b>${s.team_score_live}</b><span>:</span><b>${s.opponent_score_live}</b><small>${esc(m.live_period||'pre').replace('_',' ')}</small></div><div><div class="team-badge muted">${initials(o?.name,'')}</div><strong>${esc(o?.short_name||o?.name||'Avversario')}</strong></div></div>
    <div class="match-meta">${fmtDate(m.kickoff_at)} · ${esc(m.venue||'Campo da definire')}</div></div>
    ${eventForm(m)}
    <div class="section-head"><h3>Timeline</h3><span>Realtime</span></div>
    <div class="feed">${events.length?events.map(eventCard).join(''):'<div class="empty-card">Nessun evento registrato.</div>'}</div>`;
}

function eventCard(e){
  const p=player(e.player_id),p2=player(e.secondary_player_id);
  const cs=state.confirmations.filter(c=>c.event_id===e.id);const conf=cs.filter(c=>c.decision==='confirm').length;const disp=cs.filter(c=>c.decision==='dispute').length;const mine=cs.find(c=>c.user_id===state.session?.user?.id);
  return `<article class="event-card ${e.validation_status}"><div class="event-minute">${e.minute??'—'}'</div><div class="event-body"><div class="event-head"><strong>${eventName(e.event_type)}</strong><span class="event-status">${labels[e.validation_status]}</span></div><span>${e.team_side==='team'?'Caselle':'Avversario'}${p?` · ${esc(p.first_name)} ${esc(p.last_name)}`:''}${p2?` → ${esc(p2.first_name)} ${esc(p2.last_name)}`:''}</span><small>✓ ${conf} · ! ${disp}</small></div><div class="event-actions">${state.session&&e.validation_status!=='official'&&e.validation_status!=='rejected'?`<button class="icon-btn ${mine?.decision==='confirm'?'selected':''}" data-confirm="${e.id}" title="Conferma">✓</button><button class="icon-btn danger ${mine?.decision==='dispute'?'selected':''}" data-dispute="${e.id}" title="Contesta">!</button>`:''}${isStaff()&&e.validation_status!=='official'?`<button class="icon-btn" data-official="${e.id}" title="Ufficializza">★</button><button class="icon-btn danger" data-reject="${e.id}" title="Rifiuta">×</button>`:''}</div></article>`;
}

function statsView(){
  const season=currentSeason();const rows=[...state.stats].filter(s=>!season||s.season_id===season.id).sort((a,b)=>(b.goals||0)-(a.goals||0)||(b.assists||0)-(a.assists||0)||(b.minutes||0)-(a.minutes||0));
  return `<div class="stats-head glass"><div><span class="eyebrow">${esc(season?.name||'STAGIONE')}</span><h2>Statistiche giocatori</h2></div><div class="big-number">${rows.length}</div></div>
  <div class="stats-table"><div class="stats-row header"><span>Giocatore</span><span>PG</span><span>MIN</span><span>G</span><span>A</span><span>V</span></div>${rows.map(s=>`<div class="stats-row"><div class="player-cell"><div class="player-avatar xs">${initials(s.first_name,s.last_name)}</div><div><strong>${esc(s.last_name)} ${esc(s.first_name)}</strong><small>${labels[s.position_group]||'—'}</small></div></div><span>${s.appearances||0}</span><span>${s.minutes||0}</span><span class="strong-stat">${s.goals||0}</span><span>${s.assists||0}</span><span>${s.avg_rating??'—'}</span></div>`).join('')}</div>`;
}

function profileView(){
  if(!state.session)return `<div class="auth-card glass"><div class="brand-mark large">TM</div><h2>Accedi</h2><p>Usa lo stesso username e password della precedente versione.</p><form id="login-form"><label>Username<input name="username" required autocomplete="username" placeholder="es. emasordo"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button class="primary" type="submit">Accedi</button><div id="auth-msg" class="form-msg"></div></form></div>`;
  const linked=player(state.rolePlayerId);
  return `<div class="profile-card glass"><div class="player-avatar xl">${linked?initials(linked.first_name,linked.last_name):'TM'}</div><h2>${linked?`${esc(linked.first_name)} ${esc(linked.last_name)}`:'Account Team Manager'}</h2><span class="role-chip">${roleName(state.role)}</span><p>${state.session.user.email?.endsWith('@users.invalid')?'Account con login username':'Account autenticato'}</p><button id="logout" class="ghost danger">Esci</button></div>
    ${state.matches.filter(m=>m.status==='finished').length?`<div class="section-head"><h3>Vota ultima partita</h3></div>${ratingsPanel(state.matches.filter(m=>m.status==='finished').at(-1))}`:''}`;
}

function ratingsPanel(match){
  if(!state.session||!match)return '';
  const rows=state.matchPlayers.filter(mp=>mp.match_id===match.id&&['starter','bench'].includes(mp.selection_status));
  if(!rows.length)return '<div class="empty-card">Nessuna formazione registrata per questa partita.</div>';
  return `<form id="ratings-form" data-match-id="${match.id}" class="ratings-list">${rows.map(mp=>{const p=player(mp.player_id);const mine=state.ratings.find(r=>r.match_id===match.id&&r.player_id===mp.player_id&&r.voter_id===state.session.user.id);return `<label><span>${esc(p?.last_name||'')} ${esc(p?.first_name||'')}</span><select name="rate_${mp.player_id}"><option value="">—</option>${Array.from({length:19},(_,i)=>1+i*.5).map(v=>option(v,v.toFixed(1),mine?.rating==v)).join('')}</select></label>`}).join('')}<button class="primary" type="submit">Salva voti</button></form>`;
}

function adminView(){
  if(!isStaff())return '<div class="empty-card">Area riservata a dirigenti e admin.</div>';
  const tabs=[['matches','Partite'],['competitions','Competizioni'],['roster','Rosa'],['users','Utenti'],['settings','Impostazioni']];
  return `<div class="admin-tabs">${tabs.map(([id,l])=>`<button data-admin-tab="${id}" class="${state.adminTab===id?'active':''}">${l}</button>`).join('')}</div>${({matches:adminMatches,competitions:adminCompetitions,roster:adminRoster,users:adminUsers,settings:adminSettings})[state.adminTab]()}`;
}

function adminMatches(){
  const s=currentSeason();
  return `<div class="admin-layout"><div class="card"><div class="form-title"><strong>Nuova partita</strong><span>${esc(s?.name||'')}</span></div><form id="match-form" class="form-grid"><label>Avversario<select name="opponent_id" required><option value="">Seleziona</option>${state.opponents.map(o=>option(o.id,o.name)).join('')}</select></label><label>Competizione<select name="competition_id"><option value="">Nessuna</option>${state.competitions.filter(c=>!s||c.season_id===s.id).map(c=>option(c.id,c.name)).join('')}</select></label><label>Data e ora<input type="datetime-local" name="kickoff_at"></label><label>Casa/trasferta<select name="home_away"><option value="home">Casa</option><option value="away">Trasferta</option><option value="neutral">Campo neutro</option></select></label><label>Campo<input name="venue"></label><label>Giornata<input name="round_label"></label><button class="primary" type="submit">Crea partita</button></form></div>
  <div><div class="section-head"><h3>Partite</h3></div><div class="compact-list">${state.matches.map(m=>`<button data-admin-match="${m.id}"><div><strong>${esc(opponent(m)?.name||'Avversario')}</strong><span>${fmtDate(m.kickoff_at)} · ${labels[m.status]}</span></div><b>›</b></button>`).join('')||'<div class="empty-card">Nessuna partita.</div>'}</div></div></div>${state.selectedMatchId?adminMatchEditor(selectedMatch()):''}`;
}

function adminMatchEditor(m){
  if(!m)return '';
  const rows=state.players.map(p=>{const mp=state.matchPlayers.find(x=>x.match_id===m.id&&x.player_id===p.id);return `<div class="lineup-row"><div class="player-cell"><div class="player-avatar xs">${initials(p.first_name,p.last_name)}</div><strong>${esc(p.last_name)} ${esc(p.first_name)}</strong></div><select data-lineup-player="${p.id}" data-match-id="${m.id}">${['available','starter','bench','absent'].map(v=>option(v,({available:'Disponibile',starter:'Titolare',bench:'Panchina',absent:'Assente'})[v],mp?.selection_status===v)).join('')}</select><input data-minutes-player="${p.id}" data-match-id="${m.id}" type="number" min="0" max="150" placeholder="min" value="${mp?.minutes_played??''}"></div>`}).join('');
  return `<div class="drawer-card card"><div class="form-title"><strong>Gestisci partita · ${esc(opponent(m)?.name||'')}</strong><button class="icon-btn" data-close-editor>×</button></div><div class="drawer-actions"><button class="ghost" data-match-state="scheduled">Programmata</button><button class="ghost" data-match-state="live">Avvia live</button><button class="primary small" data-finalize>Finalizza</button></div><div class="section-head"><h3>Formazione</h3><button class="ghost small" data-fill-roster="${m.id}">Carica rosa</button></div><div class="lineup-list">${rows}</div></div>`;
}

function adminCompetitions(){
  const s=currentSeason();
  return `<div class="admin-layout"><div class="card"><div class="form-title"><strong>Nuova competizione</strong><span>${esc(s?.name||'')}</span></div><form id="competition-form" class="form-grid"><label>Nome<input name="name" required></label><label>Tipo<select name="kind"><option value="league">Campionato</option><option value="cup">Coppa</option><option value="friendly">Amichevoli</option><option value="tournament">Torneo</option><option value="other">Altro</option></select></label><button class="primary" type="submit">Aggiungi</button></form></div><div class="card"><div class="form-title"><strong>Nuovo avversario</strong></div><form id="opponent-form" class="form-grid"><label>Nome<input name="name" required></label><label>Nome breve<input name="short_name"></label><button class="primary" type="submit">Aggiungi</button></form></div></div><div class="section-head"><h3>Competizioni</h3></div><div class="compact-list">${state.competitions.map(c=>`<div class="list-row"><div><strong>${esc(c.name)}</strong><span>${labels[c.kind]||c.kind}</span></div></div>`).join('')||'<div class="empty-card">Nessuna competizione.</div>'}</div>`;
}

function adminRoster(){
  const s=currentSeason();return `<div class="toolbar glass"><div><span class="eyebrow">ROSA STAGIONALE</span><strong>${esc(s?.name||'—')}</strong></div><span>${state.players.length} giocatori</span></div><div class="roster-grid">${state.players.map(p=>`<article class="player-card"><div class="player-avatar">${initials(p.first_name,p.last_name)}</div><strong>${esc(p.first_name)} ${esc(p.last_name)}</strong><span>${labels[p.generic_role_manual]||'Ruolo n/d'} · ${p.preferred_foot||'piede n/d'}</span></article>`).join('')}</div>`;
}

function adminUsers(){
  if(!isAdmin())return '<div class="empty-card">Solo l’admin può modificare i ruoli.</div>';
  const rows=state.profiles.map(p=>{const r=state.userRoles.find(x=>x.user_id===p.id);return `<div class="user-row"><div><strong>${esc(p.display_name||p.username)}</strong><span>@${esc(p.username)}</span></div><select data-user-role="${p.id}">${['fan','player','coach','manager','admin'].map(v=>option(v,roleName(v),r?.role===v)).join('')}</select></div>`}).join('');
  return `<div class="card"><div class="form-title"><strong>Ruoli utenti</strong><span>Le autorizzazioni non dipendono dai dati modificabili dall'utente.</span></div><div class="user-list">${rows||'<div class="empty-card">Nessun profilo disponibile.</div>'}</div></div>`;
}

function adminSettings(){
  return `<div class="card settings-card"><div class="form-title"><strong>Livescore collaborativo</strong></div><form id="settings-form"><label>Conferme necessarie<input name="threshold" type="number" min="1" max="20" value="${state.settings.community_confirmations_required}"></label><button class="primary" type="submit">Salva</button></form></div>`;
}

function render(){
  if(state.loading){shell('<div class="loading"><div class="spinner"></div><span>Caricamento squadra…</span></div>');bindCommon();return;}
  const fn={home:homeView,calendar:calendarView,live:liveView,stats:statsView,profile:profileView,admin:adminView}[state.view]||homeView;
  shell(fn());bindCommon();bindView();
}

function bindCommon(){
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.adminTab)state.adminTab=b.dataset.adminTab;state.view=b.dataset.view;render()});
  document.querySelectorAll('[data-match]').forEach(b=>b.onclick=async()=>{state.selectedMatchId=b.dataset.match;state.view='live';await loadMatchDetail();render()});
  document.querySelectorAll('[data-admin-tab]').forEach(b=>b.onclick=()=>{state.adminTab=b.dataset.adminTab;render()});
}

function bindView(){
  const login=document.querySelector('#login-form');if(login)login.onsubmit=loginSubmit;
  const logout=document.querySelector('#logout');if(logout)logout.onclick=()=>supabase.auth.signOut();
  const ef=document.querySelector('#event-form');if(ef)ef.onsubmit=submitEvent;
  document.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>voteEvent(b.dataset.confirm,'confirm'));
  document.querySelectorAll('[data-dispute]').forEach(b=>b.onclick=()=>voteEvent(b.dataset.dispute,'dispute'));
  document.querySelectorAll('[data-official]').forEach(b=>b.onclick=()=>setEventStatus(b.dataset.official,'official'));
  document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>setEventStatus(b.dataset.reject,'rejected'));
  document.querySelectorAll('[data-match-state]').forEach(b=>b.onclick=()=>setMatchState(b.dataset.matchState));
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>setMatchPeriod(b.dataset.period));
  document.querySelectorAll('[data-finalize]').forEach(b=>b.onclick=finalizeMatch);
  const rf=document.querySelector('#ratings-form');if(rf)rf.onsubmit=saveRatings;
  const mf=document.querySelector('#match-form');if(mf)mf.onsubmit=createMatch;
  const cf=document.querySelector('#competition-form');if(cf)cf.onsubmit=createCompetition;
  const of=document.querySelector('#opponent-form');if(of)of.onsubmit=createOpponent;
  const sf=document.querySelector('#settings-form');if(sf)sf.onsubmit=saveSettings;
  document.querySelectorAll('[data-admin-match]').forEach(b=>b.onclick=async()=>{state.selectedMatchId=b.dataset.adminMatch;await loadMatchDetail();render()});
  const close=document.querySelector('[data-close-editor]');if(close)close.onclick=()=>{state.selectedMatchId=null;render()};
  document.querySelectorAll('[data-lineup-player]').forEach(s=>s.onchange=()=>saveLineup(s.dataset.matchId,s.dataset.lineupPlayer,s.value));
  document.querySelectorAll('[data-minutes-player]').forEach(i=>i.onchange=()=>saveMinutes(i.dataset.matchId,i.dataset.minutesPlayer,i.value));
  const fill=document.querySelector('[data-fill-roster]');if(fill)fill.onclick=()=>fillRoster(fill.dataset.fillRoster);
  document.querySelectorAll('[data-user-role]').forEach(s=>s.onchange=()=>saveUserRole(s.dataset.userRole,s.value));
}

async function loginSubmit(e){
  e.preventDefault();const f=new FormData(e.currentTarget),msg=document.querySelector('#auth-msg');msg.textContent='Accesso…';
  try{const {data,error}=await supabase.functions.invoke('auth-login',{body:{username:f.get('username'),password:f.get('password')}});if(error)throw error;if(!data?.session)throw new Error(data?.error||'Accesso non riuscito');const {error:setErr}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});if(setErr)throw setErr;toast('Accesso effettuato');}catch(err){msg.textContent=err.message||'Credenziali non valide';}
}

async function submitEvent(e){
  e.preventDefault();const m=selectedMatch();if(!m||!state.session)return;const f=new FormData(e.currentTarget);setBusy(true);
  const payload={match_id:m.id,event_type:f.get('event_type'),team_side:f.get('team_side'),minute:f.get('minute')?Number(f.get('minute')):null,player_id:f.get('player_id')||null,secondary_player_id:f.get('secondary_player_id')||null,proposed_by:state.session.user.id};
  const {error}=await supabase.from('app_match_events').insert(payload);setBusy(false);if(error)return toast(error.message,'err');toast('Evento inserito');await loadMatchDetail();await loadScores();render();
}

async function voteEvent(eventId,decision){
  if(!state.session)return;setBusy(true);const {error}=await supabase.from('app_event_confirmations').upsert({event_id:eventId,user_id:state.session.user.id,decision},{onConflict:'event_id,user_id'});setBusy(false);if(error)return toast(error.message,'err');await loadMatchDetail();await loadScores();render();
}
async function setEventStatus(id,status){const patch={validation_status:status};if(status==='official'){patch.officialized_by=state.session.user.id;patch.officialized_at=new Date().toISOString()}const {error}=await supabase.from('app_match_events').update(patch).eq('id',id);if(error)return toast(error.message,'err');await loadMatchDetail();await loadScores();render();}
async function setMatchState(status){const m=selectedMatch();if(!m)return;const period=status==='live'?(m.live_period==='pre'?'first_half':m.live_period):m.live_period;const {error}=await supabase.rpc('app_set_match_state',{p_match_id:m.id,p_status:status,p_period:period});if(error)return toast(error.message,'err');toast('Stato partita aggiornato');await reloadAll(false);}
async function setMatchPeriod(period){const m=selectedMatch();if(!m)return;const {error}=await supabase.rpc('app_set_match_state',{p_match_id:m.id,p_status:'live',p_period:period});if(error)return toast(error.message,'err');await reloadAll(false);}
async function finalizeMatch(){const m=selectedMatch();if(!m)return;const {error}=await supabase.rpc('app_finalize_match',{p_match_id:m.id});if(error)return toast(error.message,'err');toast('Partita ufficializzata');await reloadAll(false);}

async function createMatch(e){e.preventDefault();const s=currentSeason();if(!s)return toast('Nessuna stagione attiva','err');const f=new FormData(e.currentTarget);const {data,error}=await supabase.from('app_matches').insert({season_id:s.id,opponent_id:f.get('opponent_id'),competition_id:f.get('competition_id')||null,kickoff_at:f.get('kickoff_at')?new Date(f.get('kickoff_at')).toISOString():null,home_away:f.get('home_away'),venue:f.get('venue')||null,round_label:f.get('round_label')||null}).select().single();if(error)return toast(error.message,'err');toast('Partita creata');state.selectedMatchId=data.id;await reloadAll(false);}
async function createCompetition(e){e.preventDefault();const s=currentSeason();const f=new FormData(e.currentTarget);const {error}=await supabase.from('app_competitions').insert({season_id:s.id,name:f.get('name'),kind:f.get('kind')});if(error)return toast(error.message,'err');toast('Competizione aggiunta');e.currentTarget.reset();await reloadAll(false);}
async function createOpponent(e){e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.from('app_opponents').insert({name:f.get('name'),short_name:f.get('short_name')||null});if(error)return toast(error.message,'err');toast('Avversario aggiunto');e.currentTarget.reset();await reloadAll(false);}
async function fillRoster(matchId){const rows=state.players.map(p=>({match_id:matchId,player_id:p.id,selection_status:'available'}));const {error}=await supabase.from('app_match_players').upsert(rows,{onConflict:'match_id,player_id',ignoreDuplicates:true});if(error)return toast(error.message,'err');toast('Rosa caricata');await loadMatchDetail();render();}
async function saveLineup(matchId,playerId,status){const existing=state.matchPlayers.find(x=>x.match_id===matchId&&x.player_id===playerId);const payload={match_id:matchId,player_id:playerId,selection_status:status,started:status==='starter',minutes_played:existing?.minutes_played??null};const {error}=await supabase.from('app_match_players').upsert(payload,{onConflict:'match_id,player_id'});if(error)toast(error.message,'err');else await loadMatchDetail();}
async function saveMinutes(matchId,playerId,value){const existing=state.matchPlayers.find(x=>x.match_id===matchId&&x.player_id===playerId)||{selection_status:'available',started:false};const payload={match_id:matchId,player_id:playerId,selection_status:existing.selection_status,started:existing.started,minutes_played:value?Number(value):null};const {error}=await supabase.from('app_match_players').upsert(payload,{onConflict:'match_id,player_id'});if(error)toast(error.message,'err');else await reloadStats();}
async function saveRatings(e){e.preventDefault();const matchId=e.currentTarget.dataset.matchId;const f=new FormData(e.currentTarget);const rows=[];for(const [k,v] of f.entries())if(k.startsWith('rate_')&&v)rows.push({match_id:matchId,player_id:k.slice(5),voter_id:state.session.user.id,rating:Number(v)});if(!rows.length)return;const {error}=await supabase.from('app_match_ratings').upsert(rows,{onConflict:'match_id,player_id,voter_id'});if(error)return toast(error.message,'err');toast('Voti salvati');await reloadStats();await loadMatchDetail();render();}
async function saveUserRole(userId,role){const existing=state.userRoles.find(r=>r.user_id===userId);const {error}=await supabase.from('app_user_roles').upsert({user_id:userId,role,player_id:existing?.player_id||null},{onConflict:'user_id'});if(error)return toast(error.message,'err');toast('Ruolo aggiornato');await loadAdminUsers();render();}
async function saveSettings(e){e.preventDefault();const n=Number(new FormData(e.currentTarget).get('threshold'));const {error}=await supabase.from('app_settings').update({community_confirmations_required:n}).eq('id',true);if(error)return toast(error.message,'err');state.settings.community_confirmations_required=n;toast('Impostazioni salvate');render();}

async function loadMatchDetail(){
  const m=selectedMatch();if(!m){state.liveEvents=[];state.confirmations=[];state.matchPlayers=[];state.ratings=[];return;}
  const [{data:events},{data:lineup},{data:ratings}]=await Promise.all([
    supabase.from('app_match_events').select('*').eq('match_id',m.id).order('minute',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}),
    supabase.from('app_match_players').select('*').eq('match_id',m.id),
    state.session?supabase.from('app_match_ratings').select('*').eq('match_id',m.id):Promise.resolve({data:[]})
  ]);
  state.liveEvents=events||[];state.matchPlayers=lineup||[];state.ratings=ratings||[];
  const ids=state.liveEvents.map(e=>e.id);if(ids.length&&state.session){const {data}=await supabase.from('app_event_confirmations').select('*').in('event_id',ids);state.confirmations=data||[]}else state.confirmations=[];
}
async function loadScores(){const {data}=await supabase.from('app_match_score').select('*');state.scores=data||[];}
async function reloadStats(){const s=currentSeason();if(!s){state.stats=[];return;}const {data}=await supabase.from('app_player_season_stats').select('*').eq('season_id',s.id);state.stats=data||[];}
async function loadAdminUsers(){if(!state.session||!isAdmin()){state.profiles=[];state.userRoles=[];return;}const [{data:profiles},{data:roles}]=await Promise.all([supabase.from('profiles').select('id,username,display_name,first_name,last_name').order('display_name'),supabase.from('app_user_roles').select('*')]);state.profiles=profiles||[];state.userRoles=roles||[];}

async function reloadAll(showLoader=true){
  if(showLoader){state.loading=true;render();}
  const {data:{session}}=await supabase.auth.getSession();state.session=session;
  if(session){const {data:r}=await supabase.from('app_user_roles').select('role,player_id').eq('user_id',session.user.id).maybeSingle();state.role=r?.role||'fan';state.rolePlayerId=r?.player_id||null;}else{state.role=null;state.rolePlayerId=null;}
  const [players,seasons,comps,opps,matches,settings]=await Promise.all([
    supabase.from('players').select('id,first_name,last_name,photo_url,preferred_foot,generic_role_manual').order('last_name'),
    supabase.from('app_seasons').select('*').order('start_date',{ascending:false}),
    supabase.from('app_competitions').select('*').order('name'),
    supabase.from('app_opponents').select('*').order('name'),
    supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true,nullsFirst:false}),
    supabase.from('app_settings').select('*').eq('id',true).maybeSingle()
  ]);
  state.players=players.data||[];state.seasons=seasons.data||[];state.competitions=comps.data||[];state.opponents=opps.data||[];state.matches=matches.data||[];state.settings=settings.data||state.settings;
  if(!state.selectedMatchId)state.selectedMatchId=state.matches.find(m=>m.status==='live')?.id||state.matches.find(m=>m.status==='scheduled')?.id||state.matches[0]?.id||null;
  await Promise.all([loadScores(),reloadStats(),loadMatchDetail(),loadAdminUsers()]);
  state.loading=false;render();
}

function subscribeRealtime(){
  if(state.realtime)supabase.removeChannel(state.realtime);
  state.realtime=supabase.channel('team-manager-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'app_matches'},()=>reloadAll(false))
    .on('postgres_changes',{event:'*',schema:'public',table:'app_match_events'},async()=>{await loadMatchDetail();await loadScores();await reloadStats();render()})
    .on('postgres_changes',{event:'*',schema:'public',table:'app_event_confirmations'},async()=>{await loadMatchDetail();await loadScores();render()})
    .subscribe();
}

supabase.auth.onAuthStateChange(()=>setTimeout(()=>reloadAll(false),0));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.addEventListener('resize',()=>{});
reloadAll(true).then(subscribeRealtime);
