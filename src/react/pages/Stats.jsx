import React from'react';
import{Surface,Title,PanelHead,Empty}from'../components/UI.jsx';
import{n,playerBy}from'../lib/ui.js';

export default function Stats({d}){
  const stats=d.stats;
  const goals=[...stats].sort((a,b)=>n(b.goals)-n(a.goals));
  const assists=[...stats].sort((a,b)=>n(b.assists)-n(a.assists));
  const presence=[...stats].sort((a,b)=>n(b.appearances)-n(a.appearances)||n(b.minutes)-n(a.minutes));

  const ratingMap={};
  d.ratings.forEach(r=>{const x=ratingMap[r.player_id]??={sum:0,n:0,matches:new Set()};x.sum+=n(r.rating);x.n++;x.matches.add(r.match_id)});
  const ratings=d.players.map(p=>{const x=ratingMap[p.id],fallback=d.stats.find(s=>s.player_id===p.id)?.avg_rating;return{player_id:p.id,avg:x?x.sum/x.n:(fallback?Number(fallback):0),matches:x?x.matches.size:0}}).filter(x=>x.avg>0).sort((a,b)=>b.avg-a.avg);

  const bands=[[0,15],[16,30],[31,45],[46,60],[61,75],[76,999]].map(([a,b])=>{const ev=d.events.filter(e=>['goal','own_goal','penalty_scored'].includes(e.event_type)&&n(e.minute)>=a&&n(e.minute)<=b);return{team:ev.filter(e=>e.team_side==='team').length,opp:ev.filter(e=>e.team_side==='opponent').length}});

  return <div className="pageStack statsPage">
    <Title title="Statistiche" sub="Prestazioni individuali e andamento dei gol."/>

    <div className="statsCards">
      <Ranking title="Ratings" rows={ratings} render={(r,i)=><><span><b>{i+1}</b>{playerBy(d,r.player_id)?.last_name||'—'}</span><strong>{r.avg.toFixed(2)}<small>{r.matches} partite</small></strong></>}/>
      <Ranking title="Presenze e minuti" rows={presence} render={(r,i)=><><span><b>{i+1}</b>{r.last_name}</span><strong>{n(r.appearances)}<small>{n(r.minutes)}′</small></strong></>}/>
      <Ranking title="Gol" rows={goals} render={(r,i)=>{const gp=r.appearances?n(r.goals)/n(r.appearances):0,g90=r.minutes?n(r.goals)*90/n(r.minutes):0;return <><span><b>{i+1}</b>{r.last_name}</span><strong>{n(r.goals)}<small>{gp.toFixed(2)}/part · {g90.toFixed(2)}/90′</small></strong></>}}/>
      <Ranking title="Assist" rows={assists} render={(r,i)=>{const ap=r.appearances?n(r.assists)/n(r.appearances):0,a90=r.minutes?n(r.assists)*90/n(r.minutes):0;return <><span><b>{i+1}</b>{r.last_name}</span><strong>{n(r.assists)}<small>{ap.toFixed(2)}/part · {a90.toFixed(2)}/90′</small></strong></>}}/>
    </div>

    <Surface className="contentCard goalChart">
      <PanelHead title="Distribuzione gol fatti / subiti"/>
      <div className="chartLegend"><span><i className="team"/>Fatti</span><span><i className="opp"/>Subiti</span></div>
      <div className="goalBands">{bands.map((x,i)=>{const max=Math.max(1,...bands.flatMap(b=>[b.team,b.opp]));return <div className="goalBand" key={i}>
        <div className="goalBars"><i className="team" style={{height:(x.team/max*100)+'%'}}><b>{x.team}</b></i><i className="opp" style={{height:(x.opp/max*100)+'%'}}><b>{x.opp}</b></i></div>
        <span>{['0–15′','16–30′','31–45+′','46–60′','61–75′','76–90+′'][i]}</span>
      </div>})}</div>
    </Surface>
  </div>;
}

function Ranking({title,rows,render}){
  return <Surface className="contentCard rankingCard"><PanelHead title={title}/><div className="rankingList">{rows.length?rows.slice(0,10).map((r,i)=><div className="rankingItem detailed" key={r.player_id}>{render(r,i)}</div>):<Empty>Nessun dato disponibile.</Empty>}</div></Surface>;
}