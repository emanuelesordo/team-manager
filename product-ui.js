
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
    