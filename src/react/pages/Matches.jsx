import React from'react';
import{ChevronRight}from'lucide-react';
import{NavLink}from'react-router-dom';
import{Title,MatchTeams,Pill}from'../components/UI.jsx';
import{compBy,fmt}from'../lib/ui.js';

export default function Matches({d}){
  const matches=[...d.matches].sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at));
  return <div className="pageStack">
    <Title title="Partite" sub="Gestione live e ricostruzione post-partita."/>
    <div className="matchCards">
      {matches.map(m=><NavLink to={'/partite/'+m.id} className="surface matchCard" key={m.id}>
        <div className="matchCardMeta">
          <Pill tone={m.status}>{m.status}</Pill>
          <span>{fmt(m.kickoff_at)}</span>
          <small>{compBy(d,m.competition_id)?.name||'Partita'}</small>
        </div>
        <MatchTeams d={d} m={m} compact/>
        <ChevronRight className="matchCardArrow"/>
      </NavLink>)}
    </div>
  </div>;
}