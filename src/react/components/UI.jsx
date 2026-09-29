import React from'react';
import{NavLink}from'react-router-dom';
import{X}from'lucide-react';
import{fmt,oppBy,sideScore}from'../lib/ui.js';

export function Surface({className='',children}){return <section className={'surface '+className}>{children}</section>}
export const Glass=Surface;

export function Title({title,sub,action}){
  return <header className="pageHeader">
    <div><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>
    {action&&<div className="pageAction">{action}</div>}
  </header>;
}

export function Empty({children}){return <div className="emptyState">{children}</div>}
export function Pill({children,tone=''}){return <span className={'pill '+tone}>{children}</span>}

export function Mark({name='TM',url,size=''}){return <span className={'teamMark '+size}>
  {url?<img src={url} alt=""/>:<b>{name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</b>}
</span>}

export function PanelHead({title,link,meta}){
  return <div className="sectionHead">
    <div><h2>{title}</h2>{meta&&<span>{meta}</span>}</div>
    {link&&<NavLink to={link}>Vedi tutto</NavLink>}
  </div>;
}

export function MatchTeams({d,m,compact=false}){
  const o=oppBy(d,m.opponent_id),home=m.home_away!=='away',ss=sideScore(d,m);
  const left=home?['Calcio Caselle',d.settings.team_logo_url]:[o?.name||'Avversario',o?.logo_url];
  const right=home?[o?.name||'Avversario',o?.logo_url]:['Calcio Caselle',d.settings.team_logo_url];
  return <div className={'matchScoreboard '+(compact?'compact':'')}>
    <div className="teamSide"><Mark name={left[0]} url={left[1]}/><strong>{left[0]}</strong></div>
    <div className="scoreCore"><span>{m.status==='scheduled'?'VS':ss[0]+' : '+ss[1]}</span></div>
    <div className="teamSide"><Mark name={right[0]} url={right[1]}/><strong>{right[0]}</strong></div>
  </div>;
}

export function ResultRow({d,m}){
  const o=oppBy(d,m.opponent_id),ss=sideScore(d,m);
  return <NavLink className="resultItem" to={'/partite/'+m.id}>
    <time>{fmt(m.kickoff_at,{day:'2-digit',month:'short'})}</time>
    <span className="resultOpponent">{o?.name||'Avversario'}</span>
    <strong>{m.status==='scheduled'?'VS':ss[0]+' – '+ss[1]}</strong>
  </NavLink>;
}

export function Modal({children,close}){
  return <div className="modalBackdrop" onMouseDown={close}>
    <div className="modalCard surface" onMouseDown={e=>e.stopPropagation()}>
      <button className="modalClose" onClick={close} aria-label="Chiudi"><X/></button>
      {children}
    </div>
  </div>;
}