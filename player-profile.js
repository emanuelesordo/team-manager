/* Scheda giocatore — dati dalla stagione corrente. */
window.TeamPlayerProfile = (() => {
  const safe = value => esc(String(value ?? ""));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const value = (v,dec=0) => v==null ? "—" : Number(v).toFixed(dec).replace(".",",");
  const state = {playerId:null,token:0};
  const positionField = () => '<div class="pp-pitch" aria-label="Posizioni in campo: rilevazione futura"><div class="pp-pitch-mid"></div><div class="pp-pitch-circle"></div><div class="pp-pitch-box pp-box-top"></div><div class="pp-pitch-box pp-box-bottom"></div><span class="pp-position-note">POSIZIONI<br>IN ELABORAZIONE</span></div>';
  function ratingChart(items){
    const width=660,height=140,pad=27;
    const vals=items.map(x=>x.rating);
    if(!vals.length)return '<div class="pp-chart-empty">Nessun voto disponibile nelle ultime partite</div>';
    const xs=vals.map((_,i)=>pad+i*(width-2*pad)/Math.max(4,vals.length-1));
    const ys=vals.map(v=>v==null?null:height-22-(v-1)/9*90);
    const runs=[];let run=[];
    ys.forEach((y,i)=>{if(y==null){if(run.length)runs.push(run);run=[]}else run.push([xs[i],y]);});if(run.length)runs.push(run);
    const path=points=>{
      if(points.length===1)return 'M'+points[0].join(' ')+' l 0.01 0';
      return points.reduce((d,p,i)=>i===0?'M'+p.join(' '):d+' Q'+points[i-1][0]+' '+points[i-1][1]+' '+(points[i-1][0]+p[0])/2+' '+(points[i-1][1]+p[1])/2,'')+' T'+points[points.length-1].join(' ');
    };
    const shapes=runs.map(p=>'<path d="'+path(p)+'" fill="none" stroke="#77da84" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>').join('');
    const dots=vals.map((v,i)=>v==null?'':'<circle cx="'+xs[i]+'" cy="'+ys[i]+'" r="5" fill="#8cee9d" stroke="#1c1524" stroke-width="3"/>').join('');
    const markers=items.map((it,i)=>{
      const x=xs[i],y=ys[i];
      const label=it.rating==null?'SV':value(it.rating,1);
      return '<div class="pp-match-point" style="left:'+(100*x/width)+'%"><span class="pp-match-opponent">'+safe(it.short)+'</span><span class="pp-match-date">'+safe(it.date)+'</span><span class="pp-match-grade '+(it.rating==null?'pp-no-grade':'')+'" style="--point-y:'+(y??height-26)+'px">'+label+'</span></div>';
    }).join('');
    return '<div class="pp-chart"><svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" role="img" aria-label="Andamento voti: '+safe(items.map(it=>it.rating==null?'SV':value(it.rating,1)).join(', '))+'"><defs><linearGradient id="ppChartFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6be385" stop-opacity=".2"/><stop offset="1" stop-color="#6be385" stop-opacity="0"/></linearGradient></defs>'+shapes+dots+'</svg><div class="pp-match-points">'+markers+'</div></div>';
  }
  function info(p,s,injuries,extras){
    const admin=currentUserRole==="admin";
    const stats=[
      ['Presenze',(s.appearances??0)+' <small>('+value(extras.starts??s.starts??s.starting_appearances??null)+' tit.)</small>'],
      ['Minuti',value(s.minutes_played??s.minutes??extras.minutes)],
      ['Gol',s.goals??0],['Assist',s.assists??0],
      ['Rating medio',s.avg_rating==null?'—':value(s.avg_rating,2)],
      ['Gialli',extras.yellow],['Blu',extras.blue],['Rossi',extras.red]
    ];
    const jersey=rosterShirtNumber(p);
    return '<div class="pp-profile"><div class="pp-top"><span class="pp-season">'+safe(currentSeason?.name||'STAGIONE CORRENTE')+'</span><span class="pp-status">'+(p.active===false?'NON ATTIVO':'IN ROSA')+'</span></div>'+
    '<header class="pp-header"><div><h2>'+safe(p.first_name+' '+p.last_name)+'</h2><span class="pp-role">'+safe(roleLabel(p.generic_role_manual))+'</span></div><span class="pp-shirt">#'+safe(jersey||'—')+'</span></header>'+
    '<div class="pp-main"><div class="pp-ident"><div class="pp-watermark">'+safe(jersey||'—')+'</div><div class="pp-player-icon" aria-hidden="true"><svg viewBox="0 0 120 180" fill="none"><circle cx="60" cy="30" r="23" fill="currentColor" opacity=".7"/><path d="M32 60 Q60 45 88 60 L107 110 89 120 81 94 84 160H36L39 94 31 120 13 110Z" fill="currentColor" opacity=".7"/><path d="M41 158L34 178M78 158L86 178" stroke="currentColor" stroke-width="16"/></svg></div><div class="pp-measures"><span>'+safe(ageFromBirth(p.birth_date))+'<small>ANNI</small></span><span>'+safe(p.height_cm||'—')+'<small>CM</small></span><span>'+safe(p.preferred_foot||'—')+'<small>PIEDE</small></span></div></div>'+
    '<section class="pp-stat-section"><h3>Statistiche stagione</h3><div class="pp-stat-grid">'+stats.map(([label,amount])=>'<div class="pp-stat"><span>'+safe(label)+'</span><strong>'+amount+'</strong></div>').join('')+'</div></section>'+
    '<section class="pp-position-section"><h3>Posizioni in campo</h3>'+positionField()+'</section></div>'+
    '<section class="pp-form"><div class="pp-section-title"><h3>Ultime 5 valutazioni</h3><span>Rating medio <b>'+(s.avg_rating==null?'—':value(s.avg_rating,2))+'</b></span></div><div id="ppRatingGraph"><div class="pp-chart-empty">Caricamento voti…</div></div></section>'+
    '<div class="pp-bottom"><section><h3>Dati personali</h3><dl class="detail-list"><div><dt>Nascita</dt><dd>'+(p.birth_date?fmt(p.birth_date):'—')+'</dd></div><div><dt>Nazionalità</dt><dd>'+safe(p.nationality_code||'—')+'</dd></div></dl></section>'+
    '<section class="injury-history"><div class="card-section-head"><strong>Storico infortuni</strong><span>'+injuries.length+'</span></div>'+
    (injuries.length?injuries.map(x=>'<div class="injury-history-row"><div><strong>'+safe(x.public_summary||'Infortunio')+'</strong><small>'+fmt(x.injury_date)+' · '+safe(injuryStatusLabel(x.status))+'</small><small>Previsto: '+(x.expected_return?fmt(x.expected_return):'—')+' · Rientro: '+(x.actual_return?fmt(x.actual_return):'—')+'</small></div>'+(admin?'<button type="button" class="icon-btn injury-edit" data-edit-injury="'+safe(x.id)+'" title="Modifica">✎</button>':'')+'</div>').join(''):'<div class="empty-state compact">Nessun infortunio registrato</div>')+'</section></div>'+
    (admin?'<div class="player-admin-actions"><button type="button" class="secondary" data-edit-player="'+safe(p.player_id)+'">Modifica dati</button><button type="button" class="secondary" data-add-injury="'+safe(p.player_id)+'">+ Infortunio</button></div>':'')+'</div>';
  }
  async function loadDetails(playerId,token){
    const matchIds=teamMatches.filter(m=>m.status==='finished').map(m=>m.id);
    if(!matchIds.length){show([],[],[],playerId,token);return;}
    const [r,e,mp]=await Promise.all([
      db.from('app_match_ratings').select('match_id,player_id,rating').eq('player_id',playerId).in('match_id',matchIds),
      db.from('app_match_events').select('match_id,player_id,event_type,payload').eq('player_id',playerId).in('match_id',matchIds),
      db.from('app_match_players').select('match_id,player_id,started').eq('player_id',playerId).in('match_id',matchIds)
    ]);
    if(r.error||e.error||mp.error){console.warn('Player profile data',r.error||e.error||mp.error);}
    show(r.data||[],e.data||[],mp.data||[],playerId,token);
  }
  function show(ratings,events,matchPlayers,playerId,token){
    if(token!==state.token||selectedPlayerId!==playerId)return;
    const s=rosterStat(playerId);
    const starts=matchPlayers.filter(x=>x.started).length;
    const types=type=>events.filter(x=>x.event_type===type).length;
    const extras={starts,yellow:types('yellow_card'),blue:types('blue_card'),red:types('red_card')};
    const p=rosterRows.find(x=>x.player_id===playerId);
    if(!p)return;
    const injuries=rosterInjuries.filter(x=>x.player_id===playerId).sort((a,b)=>String(b.injury_date).localeCompare(String(a.injury_date)));
    const container=document.getElementById('playerDetail');
    if(!container)return;
    const graph=container.querySelector('#ppRatingGraph');
    const head=container.querySelector('.pp-stat-grid');
    if(head){
      const vals=head.querySelectorAll('.pp-stat strong');
      if(vals[0])vals[0].innerHTML=(s.appearances??0)+' <small>('+starts+' tit.)</small>';
      [[5,extras.yellow],[6,extras.blue],[7,extras.red]].forEach(([idx,val])=>{if(vals[idx])vals[idx].textContent=val;});
    }
    const ordered=teamMatches.filter(m=>m.status==='finished').sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at));
    const byMatch=new Map();
    ratings.forEach(x=>{const n=Number(x.rating);if(x.rating!==null&&x.rating!==''&&Number.isFinite(n)&&n>=1&&n<=10){const arr=byMatch.get(x.match_id)||[];arr.push(n);byMatch.set(x.match_id,arr);}});
    const last=ordered.filter(m=>matchPlayers.some(x=>x.match_id===m.id)).slice(0,5).reverse().map(m=>{
      const arr=byMatch.get(m.id)||[];
      const rival=opponents.find(o=>o.id===m.opponent_id);
      return {rating:arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null,short:rival?.short_name||rival?.name||'AVV',date:new Date(m.kickoff_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short'})};
    });
    if(graph)graph.innerHTML=ratingChart(last);
  }
  return {render(){
    const p=rosterRows.find(x=>x.player_id===selectedPlayerId);
    const container=document.getElementById('playerDetail');
    if(!container)return;
    if(!p){container.innerHTML='<div class="empty-state">Seleziona un giocatore</div>';return;}
    const injuries=rosterInjuries.filter(x=>x.player_id===p.player_id).sort((a,b)=>String(b.injury_date).localeCompare(String(a.injury_date)));
    const token=++state.token;state.playerId=p.player_id;
    container.innerHTML=info(p,rosterStat(p.player_id),injuries,{});
    if(currentUserRole==='admin'){
      container.querySelector('[data-edit-player]')?.addEventListener('click',()=>openPlayerDialog(p));
      container.querySelector('[data-add-injury]')?.addEventListener('click',()=>openInjuryDialog(p.player_id));
      container.querySelectorAll('[data-edit-injury]').forEach(b=>b.onclick=()=>openInjuryDialog(p.player_id,rosterInjuries.find(x=>x.id===b.dataset.editInjury)));
    }
    loadDetails(p.player_id,token).catch(err=>{console.warn('Player profile',err);if(token===state.token){const graph=container.querySelector('#ppRatingGraph');if(graph)graph.innerHTML='<div class="pp-chart-empty">Valutazioni non disponibili</div>';}})
  }};
})();