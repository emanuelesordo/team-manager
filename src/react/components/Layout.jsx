import React from'react';
import{NavLink}from'react-router-dom';
import{Activity,BarChart3,CalendarDays,Home,LogIn,Settings,Users}from'lucide-react';
import{ROLE,isStaff}from'../lib/ui.js';

const nav=[
  ['/', 'Home', Home],
  ['/calendario','Calendario',CalendarDays],
  ['/rosa','Rosa',Users],
  ['/partite','Partite',Activity],
  ['/statistiche','Statistiche',BarChart3]
];

export default function Layout({d,children}){
  return <>
    <header className="appHeader">
      <div className="shell headerInner">
        <NavLink to="/" className="clubBrand" aria-label="Team Manager home">
          <span className="clubMark">{d.settings.team_logo_url?<img src={d.settings.team_logo_url} alt=""/>:<b>TM</b>}</span>
          <span className="clubCopy"><strong>TEAM MANAGER</strong><small>CALCIO CASELLE</small></span>
        </NavLink>

        <nav className="desktopNav" aria-label="Navigazione principale">
          {nav.map(([path,label,Icon])=><NavLink key={path} to={path} end={path==='/'}>
            <Icon/><span>{label}</span>
          </NavLink>)}
        </nav>

        <div className="headerActions">
          {isStaff(d)&&<NavLink className="headerIcon" to="/admin" aria-label="Amministrazione"><Settings/></NavLink>}
          <NavLink className="accountLink" to="/profilo">
            {d.session?<span className="accountAvatar">ME</span>:<LogIn/>}
            <span className="accountCopy">
              <strong>{d.session?(ROLE[d.role]||'Utente'):'Accedi'}</strong>
              <small>{d.session?(d.season?.name||'Stagione'):'Area membri'}</small>
            </span>
          </NavLink>
        </div>
      </div>
    </header>

    <main className="appMain">
      <div className="shell">
        {d.error&&<div className="errorBanner">{d.error}</div>}
        {children}
      </div>
    </main>

    <nav className="mobileNav" aria-label="Navigazione mobile">
      {nav.map(([path,label,Icon])=><NavLink key={path} to={path} end={path==='/'}>
        <Icon/><span>{label}</span>
      </NavLink>)}
    </nav>
  </>;
}