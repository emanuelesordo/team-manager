
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
    return {goal:"Gol",substitution:"Sostituzione",yellow_card: