import { supabase } from './supabase.js';

const state = {
  view: 'home',
  loading: true,
  players: [],
  matches: [],
  seasons: [],
  competitions: [],
  session: null,
  userRole: null,
};

const icon = {
  home: '⌂',
  calendar: '◫',
  live: '●',
  stats: '⌁',
  profile: '○',
  team: '◉'
};

const app = document.querySelector('#app');

function initials(first='', last='') {
  return [first, last].filter(Boolean).map(v => v[0]).join('').toUpperCase().slice(0,2) || 'TM';
}

function formatDate(value) {
  if (!value) return 'Da programmare';
  return new Intl.DateTimeFormat('it-IT', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
}

function shell(content) {
  const desktop = window.matchMedia('(min-width: 900px)').matches;
  const nav = [
    ['home','Home'],['calendar','Calendario'],['live','Live'],['stats','Stats'],['profile','Profilo']
  ];

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">TM</div>
          <div><strong>Team Manager</strong><span>Calcio Caselle</span></div>
        </div>
        <nav class="side-nav">
          ${nav.map(([id,label]) => `<button data-view="${id}" class="${state.view===id?'active':''}"><span>${icon[id]}</span>${label}</button>`).join('')}
          <div class="side-separator"></div>
          <button data-view="admin"><span>⚙</span>Amministrazione</button>
        </nav>
        <div class="side-foot">Stagioni · Rosa · Partite · Live</div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <div class="eyebrow">CALCIO CASELLE</div>
            <h1>${pageTitle()}</h1>
          </div>
          <button class="avatar" data-view="profile">${state.session ? initials(state.session.user.user_metadata?.first_name, state.session.user.user_metadata?.last_name) : 'TM'}</button>
        </header>
        <section class="content">${content}</section>
      </main>

      <nav class="bottom-nav">
        ${nav.map(([id,label]) => `
          <button data-view="${id}" class="${state.view===id?'active':''}">
            <span class="nav-icon">${icon[id]}</span><span>${label}</span>
          </button>`).join('')}
      </nav>
    </div>
  `;

  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    render();
  }));
}

function pageTitle(){
  return ({
    home:'Squadra', calendar:'Calendario', live:'Livescore',
    stats:'Statistiche', profile:'Profilo', admin:'Amministrazione'
  })[state.view] || 'Team Manager';
}

function homeView() {
  const next = state.matches.find(m => ['scheduled','live'].includes(m.status));
  const featuredPlayers = state.players.slice(0,4);
  return `
    <div class="hero glass">
      <div>
        <div class="pill">${next?.status === 'live' ? '<span class="live-dot"></span> LIVE' : 'PROSSIMA PARTITA'}</div>
        <h2>${next ? 'Calcio Caselle' : 'Nuova stagione'}</h2>
        <div class="match-line">
          <div class="team-badge">CC</div>
          <div class="score-block">
            ${next ? `
              <strong>${next.home_score} – ${next.away_score}</strong>
              <span>${formatDate(next.kickoff_at)}</span>
            ` : `
              <strong>—</strong>
              <span>Nessuna partita programmata</span>
            `}
          </div>
          <div class="team-badge muted">VS</div>
        </div>
        <button class="primary" data-view="live">${next?.status === 'live' ? 'Apri livescore' : 'Vai al calendario'}</button>
      </div>
      <div class="hero-orb"></div>
    </div>

    <div class="section-head"><h3>In evidenza</h3><span>${state.players.length} giocatori</span></div>
    <div class="metric-grid">
      <article class="metric"><span>Stagioni</span><strong>${state.seasons.length}</strong><small>archivio multi-stagione</small></article>
      <article class="metric"><span>Partite</span><strong>${state.matches.length}</strong><small>calendario e storico</small></article>
      <article class="metric"><span>Rosa</span><strong>${state.players.length}</strong><small>giocatori attivi</small></article>
      <article class="metric"><span>Live</span><strong>3</strong><small>conferme richieste</small></article>
    </div>

    <div class="section-head"><h3>Rosa</h3><button class="text-btn" data-view="stats">Vedi statistiche</button></div>
    <div class="player-strip">
      ${featuredPlayers.map(p => `
        <article class="player-card">
          <div class="player-avatar">${initials(p.first_name,p.last_name)}</div>
          <strong>${p.first_name} ${p.last_name}</strong>
          <span>${p.position_group || '—'} · ${p.preferred_foot || 'piede n/d'}</span>
        </article>
      `).join('') || '<div class="empty">Caricamento rosa…</div>'}
    </div>
  `;
}

function calendarView(){
  return `
    <div class="toolbar glass">
      <div><span class="eyebrow">STAGIONE</span><strong>${state.seasons[0]?.name || 'Da configurare'}</strong></div>
      <button class="ghost">Filtri</button>
    </div>
    <div class="timeline">
      ${state.matches.length ? state.matches.map(m=>`
        <article class="match-card">
          <div class="date-chip"><strong>${m.kickoff_at ? new Date(m.kickoff_at).getDate() : '—'}</strong><span>${m.kickoff_at ? new Intl.DateTimeFormat('it-IT',{month:'short'}).format(new Date(m.kickoff_at)) : ''}</span></div>
          <div class="match-copy">
            <span class="status ${m.status}">${m.status}</span>
            <strong>Calcio Caselle · Partita</strong>
            <small>${formatDate(m.kickoff_at)} · ${m.venue || 'Campo da definire'}</small>
          </div>
          <div class="mini-score">${m.home_score}:${m.away_score}</div>
        </article>
      `).join('') : '<div class="empty-card">Nessuna partita presente nella nuova struttura.</div>'}
    </div>
  `;
}

function liveView(){
  return `
    <div class="live-board glass">
      <div class="pill"><span class="live-dot"></span> LIVE COLLABORATIVO</div>
      <h2>Segnala ciò che succede</h2>
      <p>Ogni utente autenticato può proporre un evento. Con 3 conferme diventa confermato dalla community; dirigente o admin può renderlo ufficiale.</p>
      <div class="event-grid">
        <button data-event="goal"><span>⚽</span>Gol</button>
        <button data-event="assist"><span>↗</span>Assist</button>
        <button data-event="yellow_card"><span>▰</span>Giallo</button>
        <button data-event="red_card"><span>■</span>Rosso</button>
        <button data-event="substitution"><span>⇄</span>Cambio</button>
        <button data-event="other"><span>＋</span>Altro</button>
      </div>
      <small class="hint">${state.session ? 'Accesso effettuato: puoi proporre eventi.' : 'Per inviare eventi serve il login.'}</small>
    </div>
    <div class="section-head"><h3>Flusso live</h3><span>Realtime</span></div>
    <div id="live-feed" class="feed"><div class="empty-card">Nessun evento live nella nuova app.</div></div>
  `;
}

function statsView(){
  return `
    <div class="stats-head glass">
      <div><span class="eyebrow">STATISTICHE</span><h2>Rosa completa</h2></div>
      <div class="big-number">${state.players.length}</div>
    </div>
    <div class="player-list">
      ${state.players.map(p=>`
        <article>
          <div class="player-avatar sm">${initials(p.first_name,p.last_name)}</div>
          <div class="grow"><strong>${p.first_name} ${p.last_name}</strong><span>${p.position_group || 'Ruolo n/d'} · ${p.preferred_foot || 'piede n/d'}</span></div>
          <div class="stat-dash">—</div>
        </article>
      `).join('')}
    </div>
  `;
}

function profileView(){
  if (!state.session) {
    return `
      <div class="auth-card glass">
        <div class="brand-mark large">TM</div>
        <h2>Accedi a Team Manager</h2>
        <p>Il login abilita livescore collaborativo, voti e funzioni personali.</p>
        <form id="login-form">
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
          <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
          <button class="primary" type="submit">Accedi</button>
          <div id="auth-msg" class="form-msg"></div>
        </form>
      </div>
    `;
  }
  return `
    <div class="profile-card glass">
      <div class="player-avatar xl">${initials(state.session.user.user_metadata?.first_name, state.session.user.user_metadata?.last_name)}</div>
      <h2>${state.session.user.email}</h2>
      <span class="role-chip">${state.userRole || 'utente'}</span>
      <button id="logout" class="ghost danger">Esci</button>
    </div>
  `;
}

function adminView(){
  return `
    <div class="admin-grid">
      ${[
        ['Stagioni','Crea, archivia e seleziona la stagione attiva.'],
        ['Competizioni','Campionato, coppe, amichevoli e tornei.'],
        ['Partite','Programmazione, stato live e approvazione finale.'],
        ['Rosa','Numeri, ruoli e appartenenza stagionale.'],
        ['Utenti','Ruoli fan, player, coach, manager e admin.'],
        ['Livescore','Soglia conferme, eventi contestati e ufficializzazione.']
      ].map(([a,b])=>`<article class="admin-card"><div class="admin-icon">⚙</div><strong>${a}</strong><span>${b}</span><button class="ghost">Apri</button></article>`).join('')}
    </div>
  `;
}

function render(){
  const views={home:homeView,calendar:calendarView,live:liveView,stats:statsView,profile:profileView,admin:adminView};
  shell(state.loading ? '<div class="loading"><div class="spinner"></div>Caricamento squadra…</div>' : views[state.view]());
  if (!state.loading) bindView();
}

function bindView(){
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    state.view=btn.dataset.view; render();
  }));
  const login=document.querySelector('#login-form');
  if(login) login.addEventListener('submit', async e=>{
    e.preventDefault();
    const form=new FormData(login);
    const msg=document.querySelector('#auth-msg');
    msg.textContent='Accesso…';
    const {error}=await supabase.auth.signInWithPassword({email:form.get('email'),password:form.get('password')});
    msg.textContent=error ? error.message : '';
  });
  const logout=document.querySelector('#logout');
  if(logout) logout.addEventListener('click',()=>supabase.auth.signOut());
  document.querySelectorAll('[data-event]').forEach(btn=>btn.addEventListener('click',()=>{
    alert(state.session ? 'Selezione giocatore e minuto sarà il prossimo step del live.' : 'Accedi prima di inviare un evento.');
  }));
}

async function load(){
  state.loading=true; render();
  const [{data:players},{data:matches},{data:seasons},{data:competitions},{data:{session}}] = await Promise.all([
    supabase.from('players').select('id,first_name,last_name,preferred_foot,generic_role_manual,photo_url').order('last_name'),
    supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true}),
    supabase.from('app_seasons').select('*').order('start_date',{ascending:false}),
    supabase.from('app_competitions').select('*'),
    supabase.auth.getSession()
  ]);
  state.players=(players||[]).map(p=>({...p,position_group:p.generic_role_manual}));
  state.matches=matches||[];
  state.seasons=seasons||[];
  state.competitions=competitions||[];
  state.session=session;
  if(session){
    const {data:r}=await supabase.from('app_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
    state.userRole=r?.role || null;
  } else state.userRole=null;
  state.loading=false; render();
}

supabase.auth.onAuthStateChange((_event,session)=>{state.session=session; load();});
load();
