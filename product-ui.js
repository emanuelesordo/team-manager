
(() => {
  const TM = window.TM;
  if (!TM) throw new Error("TM bridge non disponibile");

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = TM.esc;
  const db = TM.db;

  let players = [];
  let matches = [];
  let matchPlayers = [];
  let events = [];
  let ratings = [];
  let selectedPlayerId = null;
  let selectedMatchId = null;
  let competitionFilterIds = new Set();

  const state = () => TM.getState();
  const currentSeason = () => state().currentSeason;
  const team = () => state().team;
  const competitions = () => state().competitions || [];
  const opponents = () => state().opponents || [];
  const sessionUser = () => state().sessionUser;

  function injectViews() {
    const main = $(".main");
    if (!main) return;

    const setup = $("#setupView");
    if (setup) setup.classList.add("hidden");

    if (!$("#homeView")) {
      main.insertAdjacentHTML("afterbegin", `
        <section id="homeView" class="product-view">
          <div id="homeHeroGrid" class="dashboard-hero-grid"></div>
          <div id="homeMetricGrid" class="metric-grid"></div>
          <div class="dashboard-lower-grid">
            <section class="glass-card">
              <div class="section-cap"><strong>Prossime partite</strong><button class="text-btn" type="button" data-jump-view="calendar">Vedi calendario</button></div>
              <div id="homeUpcoming"></div>
            </section>
            <section class="glass-card">
              <div class="section-cap"><strong>Classifica</strong><button class="text-btn" type="button" data-jump-view="competitions">Completa</button></div>
              <div id="homeStandings"></div>
            </section>
          </div>
        </section>`);
    }

    if (!$("#rosterView")) {
      $("#calendarView").insertAdjacentHTML("afterend", `
        <section id="rosterView" class="hidden product-view">
          <div class="view-tabs"><button class="tab-pill active" type="button">Tutti</button><span id="rosterCount" class="muted"></span></div>
          <div class="roster-layout">
            <section class="glass-card roster-table-card">
              <div class="section-cap"><strong>Rosa squadra</strong><input id="rosterSearch" class="mini-search" placeholder="Cerca..."></div>
              <div id="rosterTable"></div>
            </section>
            <aside id="playerDetail" class="glass-card player-detail"></aside>
          </div>
        </section>
        <section id="matchesView" class="hidden product-view">
          <div class="matches-layout">
            <section class="glass-card">
              <div class="section-cap"><strong>Partite</strong><span id="matchesCount" class="muted"></span></div>
              <div id="matchesList"></div>
            </section>
            <section id="matchWorkspace" class="glass-card match-workspace"></section>
          </div>
        </section>
        <section id="eventsView" class="hidden product-view">
          <div class="events-layout">
            <section class="glass-card">
              <div class="section-cap"><strong>Cronologia eventi</strong><select id="eventsMatchFilter"></select></div>
              <div id="eventsTimeline"></div>
            </section>
            <section class="glass-card event-compose">
              <div class="section-cap"><strong>Aggiungi evento</strong></div>
              <form id="eventCreateForm">
                <label>Partita<select id="eventMatchId" required></select></label>
                <div class="compact-grid three">
                  <label>Tipo<select id="eventType"><option value="goal">Gol</option><option value="substitution">Sostituzione</option><option value="yellow_card">Giallo</option><option value="red_card">Rosso</option><option value="own_goal">Autogol</option></select></label>
                  <label>Minuto<input id="eventMinute" type="number" min="0"></label>
                  <label>Squadra<select id="eventSide"><option value="team">Caselle</option><option value="opponent">Avversario</option></select></label>
                </div>
                <label>Giocatore<select id="eventPlayer"></select></label>
                <label>Secondo giocatore<select id="eventSecondary"></select></label>
                <p id="eventCreateError" class="form-error hidden"></p>
                <button class="primary full-btn" type="submit">Salva evento</button>
              </form>
            </section>
          </div>
        </section>
        <section id="statsView" class="hidden product-view">
          <div id="statsMetricGrid" class="metric-grid"></div>
          <div class="stats-grid">
            <section class="glass-card"><div class="section-cap"><strong>Marcatori</strong></div><div id="statsScorers"></div></section>
            <section class="glass-card"><div class="section-cap"><strong>Disciplina</strong></div><div id="statsDiscipline"></div></section>
            <section class="glass-card span-2"><div class="section-cap"><strong>Risultati per partita</strong></div><div id="statsResults"></div></section>
          </div>
        </section>`);
    }

    const nav = $(".main-nav");
    if (nav) {
      nav.innerHTML = `
        <button class="main-link active" data-product-view="home">Home</button>
        <button class="main-link" data-product-view="competitions">Competizioni</button>
        <button class="main-link" data-product-view="calendar">Calendario</button>
        <button class="main-link" data-product-view="roster">Rosa</button>
        <button class="main-link" data-product-view="matches">Partite</button>
        <button class="main-link" data-product-view="events">Eventi</button>
        <button class="main-link" data-product-view="stats">Statistiche</button>
        <button class="main-link" data-product-view="setup">Amministrazione</button>`;
    }

    $$("[data-product-view]").forEach(b => b.onclick = () => showView(b.dataset.productView));
    $$("[data-jump-view]").forEach(b => b.onclick = () => showView(b.dataset.jumpView));

    $("#rosterSearch")?.addEventListener("input", e => renderRoster(e.target.value));
    $("#eventsMatchFilter")?.addEventListener("change", renderEvents);
    $("#eventCreateForm")?.addEventListener("submit", createEvent);
  }

  function visibleIds() {
    return ["homeView","competitionsView","calendarView","rosterView","matchesView","eventsView","statsView","setupView"];
  }

  async function showView(name) {
    const map = {
      home:"homeView", competitions:"competitionsView", calendar:"calendarView",
      roster:"rosterView", matches:"matchesView", events:"eventsView",
      stats:"statsView", setup:"setupView"
    };
    visibleIds().forEach(id => $("#"+id)?.classList.toggle("hidden", id !== map[name]));
    $$("[data-product-view]").forEach(b => b.classList.toggle("active", b.dataset.productView === name));

    if (name === "home") await loadHome();
    if (name === "competitions") await TM.loadCompetitionHub();
    if (name === "calendar") await TM.loadCalendarHub();
    if (name === "roster") await loadRoster();
    if (name === "matches") await loadMatches();
    if (name === "events") await loadEvents();
    if (name === "stats") await loadStats();
    if (name === "setup") TM.setPanel?.("seasons");
  }

  async function loadCore() {
    const s = currentSeason();
    if (!s) return;
    await TM.ensureMainTeam();
    const [pr,mr,mpr,er,rr] = await Promise.all([
      db.from("players").select("*").eq("team_id",s.team_id).order("last_name",{ascending:true}),
      db.from("app_matches").select("*").eq("season_id",s.id).order("kickoff_at",{ascending:true}),
      db.from("app_match_players").select("*"),
      db.from("app_match_events").select("*").order("minute",{ascending:true}),
      db.from("app_match_ratings").select("*")
    ]);
    players = pr.data || [];
    matches = mr.data || [];
    const ids = new Set(matches.map(m=>m.id));
    matchPlayers = (mpr.data || []).filter(x=>ids.has(x.match_id));
    events = (er.data || []).filter(x=>ids.has(x.match_id) && x.validation_status !== "rejected");
    ratings = (rr.data || []).filter(x=>ids.has(x.match_id));
  }

  function opponentById(id) { return opponents().find(o=>o.id===id) || null; }
  function competitionById(id) { return competitions().find(c=>c.id===id) || null; }
  function shortDate(v) {
    if (!v) return "\u2014";
    return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short"}).format(new Date(v));
  }
  function timeOnly(v) {
    if (!v) return "";
    return new Intl.DateTimeFormat("it-IT",{hour:"2-digit",minute:"2-digit"}).format(new Date(v));
  }
  function badgeLogo(name,logo,short) {
    return logo
      ? `<img class="club-badge" src="${esc(logo)}" alt="">`
      : `<span class="club-badge fallback">${esc((short||name||"---").slice(0,3).toUpperCase())}</span>`;
  }
  function eventLabel(v) {
    return {goal:"Gol",substitution:"Sostituzione",yellow_card:"Giallo",red_card:"Rosso",own_goal:"Autogol"}[v] || v;
  }
  function playerName(id) {
    const p = players.find(x=>x.id===id);
    return p ? `${p.first_name} ${p.last_name}` : "";
  }
  function matchLabel(m) {
    const o = opponentById(m.opponent_id);
    return `${shortDate(m.kickoff_at)} \xb7 ${m.home_away==="home"?"vs":"@"} ${o?.name||"Avversaria"}`;
  }
  function age(date) {
    if (!date) return "\u2014";
    const d = new Date(date+"T12:00:00"), n = new Date();
    let a = n.getFullYear()-d.getFullYear();
    if (n < new Date(n.getFullYear(),d.getMonth(),d.getDate())) a--;
    return a;
  }

  async function ownFixtures() {
    const s = currentSeason();
    if (!s) return [];
    await TM.loadCalendarHub();
    const st = state();
    return (st.calendarRows || []).slice().sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
  }

  async function loadHome() {
    await TM.loadCompetitions();
    const fixtures = await ownFixtures();
    const now = Date.now();
    const next = fixtures.find(x=>new Date(x.kickoff_at).getTime()>=now) || fixtures.find(x=>x.status!=="finished") || null;
    const last = [...fixtures].reverse().find(x=>x.status==="finished") || null;
    const finished = fixtures.filter(x=>x.status==="finished");
    let wins=0,draws=0,losses=0,gf=0,ga=0;
    finished.forEach(x=>{
      const home=TM.isOwnTeamName(x.home_team);
      const ours=home?+x.home_score:+x.away_score;
      const theirs=home?+x.away_score:+x.home_score;
      gf+=ours;ga+=theirs;
      if (ours>theirs) wins++; else if (ours===theirs) draws++; else losses++;
    });

    const card = (f,title) => {
      if (!f) return `<article class="glass-card hero-match-card"><div class="section-cap"><strong>${title}</strong></div><div class="empty-state">Nessuna partita</div></article>`;
      const h=TM.teamVisual(f.home_team), a=TM.teamVisual(f.away_team);
      const score=f.status==="finished"?`${f.home_score} - ${f.away_score}`:"\u2013";
      return `<article class="glass-card hero-match-card">
        <div class="section-cap"><strong>${title}</strong><span class="soft-badge">${esc(competitionById(f.competition_id)?.name||"")}</span></div>
        <div class="hero-score"><div>${badgeLogo(h.name,h.logo,h.short)}<b>${esc(h.short)}</b></div><strong>${score}</strong><div>${badgeLogo(a.name,a.logo,a.short)}<b>${esc(a.short)}</b></div></div>
        <div class="hero-date">${TM.localDateTime(f.kickoff_at)}</div>
      </article>`;
    };
    $("#homeHeroGrid").innerHTML = card(next,"Prossima partita")+card(last,"Ultima partita");
    $("#homeMetricGrid").innerHTML = [
      ["Partite",finished.length],["Vittorie",wins],["Pareggi",draws],["Sconfitte",losses],["Gol fatti",gf],["Gol subiti",ga]
    ].map(x=>`<article class="metric-card"><strong>${x[1]}</strong><span>${x[0]}</span></article>`).join("");

    $("#homeUpcoming").innerHTML = fixtures.filter(x=>x.status!=="finished").slice(0,4).map(f=>{
      const opp=TM.teamVisual(TM.isOwnTeamName(f.home_team)?f.away_team:f.home_team);
      return `<div class="compact-match-row"><time>${shortDate(f.kickoff_at)}</time>${badgeLogo(opp.name,opp.logo,opp.short)}<strong>${esc(opp.name)}</strong><span>${timeOnly(f.kickoff_at)}</span></div>`;
    }).join("") || '<div class="empty-state">Nessuna prossima partita</div>';

    const c=competitions()[0];
    if (c) {
      const sr=await db.from("app_competition_standings").select("*").eq("season_id",currentSeason().id).eq("competition_id",c.id);
      const rows=[...(sr.data||[])].sort((a,b)=>b.points-a.points||b.goal_difference-a.goal_difference).slice(0,5);
      $("#homeStandings").innerHTML=`<table class="mini-table"><tbody>${rows.map((r,i)=>`<tr class="${TM.isOwnTeamName(r.team)?"own-team":""}"><td>${i+1}</td><td>${esc(r.team)}</td><td>${r.played}</td><td><strong>${r.points}</strong></td></tr>`).join("")}</tbody></table>`;
    } else $("#homeStandings").innerHTML='<div class="empty-state">Nessuna classifica</div>';
  }

  function pstats(id) {
    const apps=matchPlayers.filter(x=>x.player_id===id&&(x.started||(+x.minutes_played||0)>0)).length;
    const goals=events.filter(x=>x.player_id===id&&x.team_side==="team"&&x.event_type==="goal").length;
    const yellows=events.filter(x=>x.player_id===id&&x.event_type==="yellow_card").length;
    const reds=events.filter(x=>x.player_id===id&&x.event_type==="red_card").length;
    return {apps,goals,yellows,reds};
  }

  async function loadRoster() {
    await loadCore();
    renderRoster($("#rosterSearch")?.value||"");
  }
  function renderRoster(filter="") {
    const q=filter.trim().toLowerCase();
    const list=players.filter(p=>!q||(`${p.first_name} ${p.last_name}`).toLowerCase().includes(q));
    $("#rosterCount").textContent=`${list.length} giocatori`;
    $("#rosterTable").innerHTML=`<div class="roster-head"><span>Giocatore</span><span>Ruolo</span><span>Et\xe0</span><span>Pres.</span><span>Gol</span></div>`+
      list.map(p=>{
        const s=pstats(p.id);
        return `<button type="button" class="roster-row ${selectedPlayerId===p.id?"active":""}" data-player-id="${p.id}">
          <span class="player-cell">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:`<i>${esc((p.first_name[0]||"")+(p.last_name[0]||""))}</i>`}<b>${esc(p.last_name+" "+p.first_name)}</b></span>
          <span><em class="role-chip">${esc(p.generic_role_manual||"\u2014")}</em></span><span>${age(p.birth_date)}</span><span>${s.apps}</span><span>${s.goals}</span>
        </button>`;
      }).join("");
    $$("[data-player-id]",$("#rosterTable")).forEach(b=>b.onclick=()=>{selectedPlayerId=b.dataset.playerId;renderRoster($("#rosterSearch").value);renderPlayerDetail();});
    if (!selectedPlayerId && list[0]) selectedPlayerId=list[0].id;
    renderPlayerDetail();
  }
  function renderPlayerDetail() {
    const p=players.find(x=>x.id===selectedPlayerId);
    if (!p) { $("#playerDetail").innerHTML='<div class="empty-state">Seleziona un giocatore</div>'; return; }
    const s=pstats(p.id);
    $("#playerDetail").innerHTML=`<div class="player-hero">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:`<div class="player-placeholder">${esc((p.first_name[0]||"")+(p.last_name[0]||""))}</div>`}<div><strong>${esc(p.first_name+" "+p.last_name)}</strong><span>${esc(p.generic_role_manual||"Ruolo non impostato")}</span></div></div>
      <div class="player-meta"><div><span>Et\xe0</span><b>${age(p.birth_date)}</b></div><div><span>Altezza</span><b>${p.height_cm?esc(p.height_cm)+" cm":"\u2014"}</b></div><div><span>Piede</span><b>${esc(p.preferred_foot||"\u2014")}</b></div><div><span>Nazionalit\xe0</span><b>${esc(p.nationality_code||"\u2014")}</b></div></div>
      <div class="player-kpis"><div><strong>${s.apps}</strong><span>Presenze</span></div><div><strong>${s.goals}</strong><span>Gol</span></div><div><strong>${s.yellows}</strong><span>Gialli</span></div><div><strong>${s.reds}</strong><span>Rossi</span></div></div>`;
  }

  async function loadMatches() {
    await loadCore();
    $("#matchesCount").textContent=`${matches.length} partite`;
    $("#matchesList").innerHTML=matches.map(m=>{
      const o=opponentById(m.opponent_id), c=competitionById(m.competition_id);
      return `<button type="button" class="match-list-row ${selectedMatchId===m.id?"active":""}" data-match-id="${m.id}">
        <time>${shortDate(m.kickoff_at)}</time>${badgeLogo(o?.name,o?.logo_url,o?.short_name)}
        <span><b>${esc(o?.name||"Avversaria")}</b><small>${esc(c?.name||"")}</small></span>
        <strong>${m.status==="finished"?m.home_score+"-"+m.away_score:"\u2013"}</strong>
      </button>`;
    }).join("");
    $$("[data-match-id]",$("#matchesList")).forEach(b=>b.onclick=async()=>{selectedMatchId=b.dataset.matchId;await loadMatches();});
    if (!selectedMatchId && matches[0]) selectedMatchId=matches[0].id;
    renderMatchWorkspace();
  }

  function renderMatchWorkspace() {
    const m=matches.find(x=>x.id===selectedMatchId);
    if (!m) { $("#matchWorkspace").innerHTML='<div class="empty-state">Seleziona una partita</div>'; return; }
    const o=opponentById(m.opponent_id);
    const selected=matchPlayers.filter(x=>x.match_id===m.id);
    const ev=events.filter(x=>x.match_id===m.id).sort((a,b)=>(a.minute??999)-(b.minute??999));
    $("#matchWorkspace").innerHTML=`<div class="section-cap"><div><strong>${esc(team()?.short_name||"CAS")} \xb7 ${esc(o?.short_name||o?.name||"AVV")}</strong><small>${TM.localDateTime(m.kickoff_at)}</small></div>
      <select id="matchFormation"><option>4-4-2</option><option>4-3-3</option><option>3-5-2</option><option>4-2-3-1</option></select></div>
      <div class="workspace-grid"><section><div class="subcap">Convocati / formazione</div><div id="matchSquadList">${players.map(p=>{const mp=selected.find(x=>x.player_id===p.id);return `<label class="squad-toggle"><input type="checkbox" data-match-player="${p.id}" ${mp?"checked":""}><span>${esc(p.last_name+" "+p.first_name)}</span><button type="button" class="starter-toggle ${mp?.started?"on":""}" data-starter="${p.id}">${mp?.started?"TIT":"P"}</button></label>`}).join("")}</div></section>
      <section><div class="subcap">Eventi</div><div class="workspace-events">${ev.length?ev.map(e=>`<div><time>${e.minute??"?"}'</time><b>${esc(eventLabel(e.event_type))}</b><span>${esc(playerName(e.player_id)||(e.team_side==="opponent"?"Avversario":""))}</span></div>`).join(""):'<div class="empty-state">Nessun evento</div>'}</div></section></div>
      <button id="saveMatchSetup" class="primary full-btn" type="button">Salva formazione</button>`;
    $("#matchFormation").value=m.formation||"4-4-2";
    $$("[data-starter]",$("#matchWorkspace")).forEach(b=>b.onclick=e=>{e.preventDefault();b.classList.toggle("on");b.textContent=b.classList.contains("on")?"TIT":"P";});
    $("#saveMatchSetup").onclick=saveMatchSetup;
  }

  async function saveMatchSetup() {
    if (!sessionUser()) return alert("Accedi per modificare la formazione.");
    const m=matches.find(x=>x.id===selectedMatchId); if (!m) return;
    const checked=$$("[data-match-player]",$("#matchWorkspace")).filter(x=>x.checked);
    const existing=matchPlayers.filter(x=>x.match_id===m.id);
    const checkedIds=new Set(checked.map(x=>x.dataset.matchPlayer));
    for (const row of existing.filter(x=>!checkedIds.has(x.player_id))) {
      const d=await db.from("app_match_players").delete().eq("id",row.id); if (d.error) throw d.error;
    }
    for (const input of checked) {
      const pid=input.dataset.matchPlayer;
      const starter=$(`[data-starter="${pid}"]`,$("#matchWorkspace"))?.classList.contains("on")||false;
      const old=existing.find(x=>x.player_id===pid);
      if (old) {
        const u=await db.from("app_match_players").update({started:starter,selection_status:"available"}).eq("id",old.id);
        if (u.error) throw u.error;
      } else {
        const ins=await db.from("app_match_players").insert({match_id:m.id,player_id:pid,started:starter,selection_status:"available"});
        if (ins.error) throw ins.error;
      }
    }
    const mr=await db.from("app_matches").update({formation:$("#matchFormation").value}).eq("id",m.id).select("*").maybeSingle();
    TM.assertSaved(mr,"Formazione");
    await loadCore(); renderMatchWorkspace();
  }

  async function loadEvents() {
    await loadCore();
    const opts=matches.map(m=>`<option value="${m.id}">${esc(matchLabel(m))}</option>`).join("");
    $("#eventsMatchFilter").innerHTML='<option value="">Tutte le partite</option>'+opts;
    $("#eventMatchId").innerHTML=opts;
    $("#eventPlayer").innerHTML=playerOptions("");
    $("#eventSecondary").innerHTML=playerOptions("");
    renderEvents();
  }
  function playerOptions(selected) {
    return '<option value="">\u2014</option>'+players.map(p=>`<option value="${p.id}" ${p.id===selected?"selected":""}>${esc(p.last_name+" "+p.first_name)}</option>`).join("");
  }
  function renderEvents() {
    const matchId=$("#eventsMatchFilter").value;
    const list=events.filter(e=>!matchId||e.match_id===matchId).sort((a,b)=>{
      const ma=matches.find(m=>m.id===a.match_id), mb=matches.find(m=>m.id===b.match_id);
      return new Date(mb?.kickoff_at||0)-new Date(ma?.kickoff_at||0) || (a.minute??0)-(b.minute??0);
    });
    $("#eventsTimeline").innerHTML=list.map(e=>{
      const m=matches.find(x=>x.id===e.match_id), o=opponentById(m?.opponent_id);
      return `<div class="timeline-event"><time>${e.minute??"?"}'</time><span class="event-dot ${esc(e.event_type)}"></span><div><b>${esc(eventLabel(e.event_type))}</b><span>${esc(playerName(e.player_id)||(e.team_side==="opponent"?o?.name||"Avversario":"Caselle"))}</span><small>${esc(m?matchLabel(m):"")}</small></div></div>`;
    }).join("")||'<div class="empty-state">Nessun evento</div>';
  }

  async function createEvent(e) {
    e.preventDefault();
    $("#eventCreateError").classList.add("hidden");
    try {
      if (!sessionUser()) throw new Error("Accedi per aggiungere eventi.");
      const payload={
        match_id:$("#eventMatchId").value,event_type:$("#eventType").value,
        minute:$("#eventMinute").value===""?null:+$("#eventMinute").value,
        player_id:$("#eventPlayer").value||null,secondary_player_id:$("#eventSecondary").value||null,
        team_side:$("#eventSide").value,proposed_by:sessionUser().id,
        validation_status:"official",officialized_by:sessionUser().id,officialized_at:new Date().toISOString(),payload:{}
      };
      const r=await db.from("app_match_events").insert