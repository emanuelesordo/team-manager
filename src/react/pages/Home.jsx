import React from'react';
import{NavLink}from'react-router-dom';
import{Surface,Title,Empty,PanelHead,MatchTeams,ResultRow}from'../components/UI.jsx';
import{compBy,fmt,n,oppBy}from'../lib/ui.js';

export default function Home({d}){
  const now=Date.now();
  const finished=[...d.matches].filter(m=>m.status==='finished').sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at));
  const upcoming=[...d.matches].filter(m=>m.status==='live'||(m.status==='scheduled'&&new Date(m.kickoff_at||0)>=now)).sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
  const last=finished[0],next=d.matches.find(m=>m.status==='live')||upcoming[0];
  const scorers=[...d.stats].sort((a,b)=>n(b.goals)-n(a.goals)).slice(0,5);

  return <div className="pageStack homePage">
    <Title title="Team Manager" sub="Stagione, risultati e squadra in un colpo d’occhio."/>

    <section className="heroMatches">
      <FeaturedMatch d={d} m={last} label="Ultimo risultato" />
      <FeaturedMatch d={d} m={next} label="Prossima partita" next />
    </section>

    <section className="dashboardGrid">
      <Surface className="contentCard resultsCard">
        <PanelHead title="Ultimi risultati" link="/calendario"/>
        <div className="listStack">
          {finished.length?finished.slice(0,5).map(m=><ResultRow key={m.id} d={d} m={m}/>):<Empty>Nessun risultato disponibile.</Empty>}
        </div>
      </Surface>

      <Surface className="contentCard scorersCard">
        <PanelHead title="Migliori marcatori" link="/statistiche"/>
        <div className="rankingList">
          {scorers.length?scorers.map((s,i)=><div className="rankingItem" key={s.player_id}>
            <span className="rankBadge">{i+1}</span>
            <span className="rankName">{s.first_name} {s.last_name}</span>
            <strong>{n(s.goals)}</strong>
          </div>):<Empty>Nessun dato disponibile.</Empty>}
        </div>
      </Surface>

      <Surface className="contentCard standingsCard">
        <PanelHead title="Classifica"/>
        <Empty>La classifica verrà mostrata quando sarà disponibile una fonte dati reale.</Empty>
      </Surface>
    </section>

    {upcoming.length>0&&<Surface className="contentCard upcomingCard">
      <PanelHead title="Prossimi incontri" link="/calendario"/>
      <div className="upcomingScroller">
        {upcoming.slice(0,6).map(m=><NavLink to={'/partite/'+m.id} className="upcomingItem" key={m.id}>
          <span className="upcomingDate">{fmt(m.kickoff_at,{day:'2-digit',month:'short'})}</span>
          <strong>{oppBy(d,m.opponent_id)?.name||'Avversario'}</strong>
          <small>{compBy(d,m.competition_id)?.name||'Partita'}</small>
        </NavLink>)}
      </div>
    </Surface>}
  </div>;
}

function FeaturedMatch({d,m,label,next=false}){
  return <Surface className={'matchHero '+(next?'next':'')}>
    <div className="cardEyebrow">{label}</div>
    {m?<>
      <div className="matchHeroMeta">
        <span>{compBy(d,m.competition_id)?.name||'Partita'}</span>
        <span>{fmt(m.kickoff_at)}</span>
      </div>
      <MatchTeams d={d} m={m}/>
      <div className="matchHeroFooter">
        <span>{m.round_label||m.venue||'—'}</span>
        <NavLink to={'/partite/'+m.id}>Dettagli</NavLink>
      </div>
    </>:<Empty>Nessuna partita disponibile.</Empty>}
  </Surface>;
}