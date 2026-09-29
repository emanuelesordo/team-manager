import React,{useEffect,useMemo,useState}from'react';
import{NavLink,Navigate,Route,Routes}from'react-router-dom';
import{Activity,BarChart3,CalendarDays,ChevronLeft,ChevronRight,CircleUserRound,Goal,Home as HomeIcon,LogIn,LogOut,Plus,Users,X}from'lucide-react';
import{addMatchEvent,addTacticalChange,getMatchDetail,removeMatchEvent,saveFormation,saveMatchPlayer,saveMatchPlayers,signIn,signOut,useTeamData}from'./lib/data.js';

const TEAM='Calcio Caselle';
const roles={P:'Portiere',D:'Difensore',C:'Centrocampista',A:'Attaccante'};
const nav=[['/','Home',HomeIcon],['/calendario','Calendario',CalendarDays],['/rosa','Rosa',Users],['/partite','Partite',Activity],['/statistiche','Statistiche',BarChart3]];
const formations={
 '4-4-2':[[50,88],[12,69],[37,69],[63,69],[88,69],[12,43],[37,43],[63,43],[88,43],[35,17],[65,17]],
 '4-3-3':[[50,88],[12,69],[37,69],[63,69],[88,69],[24,45],[50,45],[76,45],[15,17],[50,13],[85,17]],
 '4-2-3-1':[[50,88],[12,69],[37,69],[63,69],[88,69],[35,50],[65,50],[15,31],[50,31],[85,31],[50,12]],
 '3-5-2':[[50,88],[22,69],[50,69],[78,69],[8,43],[29,44],[50,41],[71,44],[92,43],[35,16],[65,16]]
};
const num=v=>Number(v||0);
const fmt=d=>d?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d)):'—';
const roleName=r=>({fan:'Fan',player:'Giocatore',coach:'Mister',manager:'Dirigente',admin:'Admin'})[r]||'Ospite';
const isStaff=r=>['manager','admin'].includes(r);
const initials=(a='TM')=>String(a).split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();

function scoreOf(m,d){
 const s=d.scores.find(x=>x.match_id===m.id),home=m.home_away==='home';
 const team=s?.team_score_confirmed??s?.team_score_live,opp=s?.opponent_score_confirmed??s?.opponent_score_live;
 if(team!=null&&opp!=null)return home?[team,opp]:[opp,team];
 return[num(m.home_score),num(m.away_score)];
}
function opponent(m,d){return d.opponents.find(x=>x.id===m?.opponent_id)}
function Mark({name='TM',url,size=''}){return <span className={'mark '+size}>{url?<img src={url} alt=""/>:<b>{initials(name)}</b>}</span>}
function Button({children,className='',...p}){return <button className={'btn '+className} {...p}>{children}</button>}
function Panel({title,action,children,className=''}){return <section className={'glass panel '+className}><div className="panelHead"><h3>{title}</h3>{action}</div>{children}</section>}
function PageTitle({title,subtitle,action}){return <div className="pageTitle"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}

function Account({d,onClose}){
 const[username,setUsername]=useState(''),[password,setPassword]=useState(''),[msg,setMsg]=useState('');
 async function submit(e){
  e.preventDefault();setMsg('Accesso…');
  const r=await signIn(username,password);
  setMsg(r.error?r.error.message:'');
  if(!r.error)onClose();
 }
 return <div className="modalShade" onMouseDown={onClose}>
  <section className="glass account" onMouseDown={e=>e.stopPropagation()}>
   <button className="close" onClick={onClose}><X/></button>
   {d.session?
    <><CircleUserRound className="accountIcon"/><h2>Account Team Manager</h2><span className="roleChip">{roleName(d.role)}</span><Button className="ghost danger" onClick={async()=>{await signOut();onClose()}}><LogOut/> Esci</Button></>:
    <><LogIn className="accountIcon"/><h2>Accedi</h2><p>Usa username e password esistenti.</p><form onSubmit={submit}><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><Button className="primary">Accedi</Button>{msg&&<small className="error">{msg}</small>}</form></>}
  </section>
 </div>
}
function Shell({d,children}){
 const[account,setAccount]=useState(false);
 return <><header className="topbar">
  <NavLink to="/" className="brand"><span className="brandShield">TM</span><span><b>TEAM MANAGER</b><small>CALCIO CASELLE</small></span></NavLink>
  <nav className="desktopNav">{nav.map(([p,l,I])=><NavLink key={p} to={p} end={p==='/' }><I/>{l}</NavLink>)}</nav>
  <button className="accountBtn" onClick={()=>setAccount(true)}><CircleUserRound/><span>{d.session?roleName(d.role):'Accedi'}</span></button>
 </header>
 <main>{children}</main>
 <nav className="bottomNav">{nav.map(([p,l,I])=><NavLink key={p} to={p} end={p==='/' }><I/><span>{l}</span></NavLink>)}</nav>
 {account&&<Account d={d} onClose={()=>setAccount(false)}/>}
 </>;
}

function MatchHero({m,d,label}){
 if(!m)return <section className="glass heroMatch empty"><small>{label}</small><h2>Nessuna partita disponibile</h2></section>;
 const o=opponent(m,d),home=m.home_away==='home',[hs,as]=scoreOf(m,d),finished=m.status==='finished';
 const left=home?TEAM:o?.name||'Avversario',right=home?o?.name||'Avversario':TEAM;
 return <section className="glass heroMatch">
  <div className="heroTop"><span>{label}</span><small>{fmt(m.kickoff_at)}{m.round_label?' · '+m.round_label:''}</small></div>
  <div className="heroTeams">
   <div><Mark name={left} url={home?d.settings.team_logo_url:o?.logo_url} size="heroMark"/><b>{left}</b></div>
   <strong>{finished||m.status==='live'?hs+' : '+as:'VS'}</strong>
   <div><Mark name={right} url={home?o?.logo_url:d.settings.team_logo_url} size="heroMark"/><b>{right}</b></div>
  </div>
  <div className="heroFoot"><span>{d.competitions.find(x=>x.id===m.competition_id)?.name||'Partita'}</span><span>{m.venue||''}</span></div>
 </section>
}
function ResultRow({m,d}){
 const o=opponent(m,d),home=m.home_away==='home',[hs,as]=scoreOf(m,d);
 return <div className="resultRow"><span className="date">{fmt(m.kickoff_at)}</span><span className="miniTeam">{home?TEAM:o?.short_name||o?.name||'Avv.'}</span><b>{m.status==='scheduled'?'—':hs+'–'+as}</b><span className="miniTeam">{home?o?.short_name||o?.name||'Avv.':TEAM}</span></div>;
}

function Home({d}){
 const now=Date.now();
 const past=[...d.matches].filter(x=>x.status==='finished'||new Date(x.kickoff_at).getTime()<now).sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at));
 const future=[...d.matches].filter(x=>x.status!=='finished'&&new Date(x.kickoff_at).getTime()>=now).sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
 const live=d.matches.find(x=>x.status==='live'),last=past[0],next=live||future[0],top=[...d.stats].sort((a,b)=>num(b.goals)-num(a.goals)).slice(0,5),ts=d.teamStats;
 return <div className="page">
  <PageTitle title="Home" subtitle="La squadra, a colpo d'occhio"/>
  <div className="homeHeroes"><MatchHero m={last} d={d} label="ULTIMO RISULTATO"/><MatchHero m={next} d={d} label={live?'LIVE ADESSO':'PROSSIMA PARTITA'}/></div>
  <div className="homeLower">
   <Panel title="Ultimi risultati">{past.slice(0,5).map(m=><ResultRow key={m.id} m={m} d={d}/>)}</Panel>
   <Panel title="Classifica">
    <div className="standingSingle"><span>—</span><Mark name={TEAM} url={d.settings.team_logo_url}/><div><b>{TEAM}</b><small>{ts?num(ts.matches_played)+' PG · '+num(ts.wins)+' V · '+num(ts.draws)+' N · '+num(ts.losses)+' P':'Dati stagione non disponibili'}</small></div></div>
    <p className="hint">La classifica completa delle altre squadre non è ancora censita nel database.</p>
   </Panel>
   <Panel title="Migliori marcatori">{top.map((s,i)=><div className="leaderRow" key={s.player_id}><b className="rank">{i+1}</b><span>{d.players.find(p=>p.id===s.player_id)?.last_name||s.last_name||'—'}</span><strong>{num(s.goals)}</strong></div>)}</Panel>
  </div>
 </div>;
}

function Calendar({d}){
 const dated=d.matches.filter(x=>x.kickoff_at),seed=dated.find(x=>new Date(x.kickoff_at)>=new Date())||dated[dated.length-1],initial=seed?new Date(seed.kickoff_at):new Date();
 const[month,setMonth]=useState(new Date(initial.getFullYear(),initial.getMonth(),1));
 const y=month.getFullYear(),mo=month.getMonth(),days=new Date(y,mo+1,0).getDate(),offset=(new Date(y,mo,1).getDay()+6)%7;
 const monthMatches=d.matches.filter(m=>{const x=new Date(m.kickoff_at);return x.getFullYear()===y&&x.getMonth()===mo});
 const colorMap=new Map(d.competitions.map((c,i)=>[c.id,['yellow','blue','red','green','purple'][i%5]])),grouped={};
 monthMatches.forEach(m=>{const day=new Date(m.kickoff_at).getDate();(grouped[day]??=[]).push(m)});
 return <div className="page">
  <PageTitle title="Calendario" subtitle="Mese in evidenza, programma completo sempre sotto"/>
  <section className="glass calendarMonth">
   <div className="monthHead"><Button className="icon ghost" onClick={()=>setMonth(new Date(y,mo-1,1))}><ChevronLeft/></Button><h2>{new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(month)}</h2><Button className="icon ghost" onClick={()=>setMonth(new Date(y,mo+1,1))}><ChevronRight/></Button></div>
   <div className="competitionLegend">{d.competitions.map(c=><span key={c.id}><i className={colorMap.get(c.id)}/>{c.name}</span>)}</div>
   <div className="weekHead">{['LUN','MAR','MER','GIO','VEN','SAB','DOM'].map(x=><b key={x}>{x}</b>)}</div>
   <div className="calendarCells">
    {Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}
    {Array.from({length:days},(_,i)=>{const day=i+1,ms=grouped[day]||[];return <div className={'calendarDay '+(ms[0]?colorMap.get(ms[0].competition_id):'')} key={day}><em>{day}</em>{ms.slice(0,2).map(m=>{const o=opponent(m,d);return <Mark key={m.id} name={o?.name||'AVV'} url={o?.logo_url} size="calendarMark"/>})}</div>})}
   </div>
  </section>
  <Panel title="Tutte le partite" className="allMatches">{d.matches.map(m=><ResultRow key={m.id} m={m} d={d}/>)}</Panel>
 </div>;
}

function Roster({d}){
 const rosterMap=new Map(d.roster.map(x=>[x.player_id,x])),statMap=new Map(d.stats.map(x=>[x.player_id,x]));
 const ordered=[...d.players].sort((a,b)=>({P:1,D:2,C:3,A:4}[a.generic_role_manual]||9)-({P:1,D:2,C:3,A:4}[b.generic_role_manual]||9)||a.last_name.localeCompare(b.last_name));
 const counts=['P','D','C','A'].map(r=>[r,ordered.filter(p=>p.generic_role_manual===r).length]);
 return <div className="page">
  <PageTitle title="La nostra squadra" subtitle="Rosa attuale"/>
  <div className="roleCounts">{counts.map(([r,c])=><div className="glass roleCount" key={r}><span className={'roleBadge role'+r}>{r}</span><b>{c}</b><small>{roles[r]}</small></div>)}</div>
  <div className="rosterLayout">
   <Panel title="Rosa" className="rosterList">
    <div className="rosterHeader"><span>#</span><span>Giocatore</span><span>Ruolo</span><span>Pres.</span><span>Gol</span><span>Assist</span></div>
    {ordered.map(p=>{const s=statMap.get(p.id)||{},r=rosterMap.get(p.id)||{};return <div className="playerRow" key={p.id}><b>{r.shirt_number||'—'}</b><div className="playerIdentity"><Mark name={p.first_name+' '+p.last_name} url={p.photo_url} size="playerMark"/><span><strong>{p.first_name} {p.last_name}</strong><small>{p.preferred_foot||'Piede n/d'}</small></span></div><span className={'roleBadge role'+(p.generic_role_manual||'X')}>{p.generic_role_manual||'—'}</span><span>{num(s.appearances)}</span><span>{num(s.goals)}</span><span>{num(s.assists)}</span></div>})}
   </Panel>
   <Panel title="Distribuzione ruoli" className="roleVisual">{counts.map(([r,c])=><div className="roleBar" key={r}><span>{roles[r]}</span><div><i style={{width:Math.max(8,c/Math.max(1,ordered.length)*100)+'%'}}/></div><b>{c}</b></div>)}</Panel>
  </div>
 </div>;
}

function EventComposer({match,d,preset,onClose,onSaved}){
 const[eventType,setEventType]=useState(preset?.type||'goal'),[playerId,setPlayerId]=useState(preset?.playerId||''),[secondary,setSecondary]=useState(''),[side,setSide]=useState('team'),[period,setPeriod]=useState('1'),[minute,setMinute]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 async function submit(e){
  e.preventDefault();setBusy(true);
  const total=(period==='2'?40:0)+num(minute);
  const row={match_id:match.id,event_type:eventType,minute:total,player_id:side==='team'?(playerId||null):null,secondary_player_id:eventType==='substitution'?(secondary||null):null,team_side:side,proposed_by:d.session?.user?.id||null,validation_status:isStaff(d.role)?'official':'pending',officialized_by:isStaff(d.role)?d.session?.user?.id:null,officialized_at:isStaff(d.role)?new Date().toISOString():null};
  const r=await addMatchEvent(row);setBusy(false);if(r.error)return setErr(r.error.message);onSaved();
 }
 return <div className="modalShade" onMouseDown={onClose}><form className="glass eventModal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
  <button type="button" className="close" onClick={onClose}><X/></button><h2>Registra evento</h2>
  <div className="formGrid">
   <label>Tipo<select value={eventType} onChange={e=>setEventType(e.target.value)}><option value="goal">Gol</option><option value="yellow_card">Giallo</option><option value="red_card">Rosso</option><option value="substitution">Cambio</option><option value="other">Altro</option></select></label>
   <label>Squadra<select value={side} onChange={e=>setSide(e.target.value)}><option value="team">Caselle</option><option value="opponent">Avversario</option></select></label>
   <label>Tempo<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="1">1° tempo</option><option value="2">2° tempo</option></select></label>
   <label>Minuto<input type="number" min="0" max="60" value={minute} onChange={e=>setMinute(e.target.value)} required/></label>
   {side==='team'&&<label>Giocatore<select value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">—</option>{d.players.map(p=><option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}</select></label>}
   {eventType==='substitution'&&<label>Entra<select value={secondary} onChange={e=>setSecondary(e.target.value)}><option value="">—</option>{d.players.map(p=><option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}</select></label>}
  </div>
  <Button className="primary" disabled={busy}>{busy?'Salvataggio…':'Aggiungi evento'}</Button>{err&&<small className="error">{err}</small>}
 </form></div>;
}

function MatchManager({match,d}){
 const[detail,setDetail]=useState(null),[tab,setTab]=useState('lineup'),[composer,setComposer]=useState(null),[formation,setFormation]=useState(match.formation||'4-4-2'),[msg,setMsg]=useState('');
 async function reload(){const x=await getMatchDetail(match.id);setDetail(x)}
 useEffect(()=>{setFormation(match.formation||'4-4-2');setDetail(null);reload()},[match.id]);
 if(!detail)return <div className="loader small">Caricamento partita…</div>;
 const mp=new Map(detail.players.map(x=>[x.player_id,x])),starters=detail.players.filter(x=>x.selection_status==='starter'||x.started),bench=detail.players.filter(x=>x.selection_status==='bench'),starterIds=new Set(starters.map(x=>x.player_id)),benchIds=new Set(bench.map(x=>x.player_id)),available=d.players.filter(p=>!starterIds.has(p.id)&&!benchIds.has(p.id));
 const slots=formations[formation]||formations['4-4-2'],bySlot=new Map(starters.map((x,i)=>[x.tactical_slot||i+1,x]));
 async function move(playerId,target,slot=null){
  if(!isStaff(d.role))return;
  let row={...(mp.get(playerId)||{}),match_id:match.id,player_id:playerId};
  if(target==='starter'){row.selection_status='starter';row.started=true;row.tactical_slot=slot||Array.from({length:11},(_,i)=>i+1).find(s=>!bySlot.has(s))||11}
  else if(target==='bench'){row.selection_status='bench';row.started=false;row.tactical_slot=null}
  else{row.selection_status='available';row.started=false;row.tactical_slot=null}
  row.shirt_number=row.shirt_number||d.roster.find(r=>r.player_id===playerId)?.shirt_number||null;
  const r=await saveMatchPlayer(row);if(r.error)setMsg(r.error.message);else reload();
 }
 async function setShirt(playerId,value){
  const row={...(mp.get(playerId)||{}),match_id:match.id,player_id:playerId,shirt_number:value?Number(value):null};
  const r=await saveMatchPlayer(row);if(r.error)setMsg(r.error.message);else reload();
 }
 async function setCaptain(playerId){
  const rows=detail.players.map(x=>({...x,is_captain:x.player_id===playerId}));
  const r=await saveMatchPlayers(rows);if(r.error)setMsg(r.error.message);else reload();
 }
 async function saveSetup(){const r=await saveFormation(match.id,formation);setMsg(r.error?r.error.message:'Formazione salvata')}
 async function tactical(){
  const r=await addTacticalChange({match_id:match.id,minute:0,formation_from:match.formation||null,formation_to:formation,positions:starters.map(x=>({player_id:x.player_id,tactical_slot:x.tactical_slot,shirt_number:x.shirt_number})),created_by:d.session?.user?.id||null});
  setMsg(r.error?r.error.message:'Cambio modulo storicizzato');if(!r.error)saveSetup();
 }
 function playerCard(p,target){
  const x=mp.get(p.id)||{};
  return <div className="linePlayer" draggable={isStaff(d.role)} onDragStart={e=>e.dataTransfer.setData('player',p.id)}>
   <select disabled={!isStaff(d.role)} value={x.shirt_number||d.roster.find(r=>r.player_id===p.id)?.shirt_number||''} onChange={e=>setShirt(p.id,e.target.value)}>{['',...Array.from({length:24},(_,i)=>i+1)].map(v=><option key={v||'x'} value={v}>{v||'—'}</option>)}</select>
   <span className={'roleBadge role'+(p.generic_role_manual||'X')}>{p.generic_role_manual||'—'}</span><strong>{p.last_name}</strong>
   {isStaff(d.role)&&<div className="lineActions">{target!=='starter'&&<button onClick={()=>move(p.id,'starter')}>XI</button>}{target!=='bench'&&<button onClick={()=>move(p.id,'bench')}>P</button>}{target!=='available'&&<button onClick={()=>move(p.id,'available')}>×</button>}</div>}
  </div>;
 }
 const o=opponent(match,d),[hs,as]=scoreOf(match,d),home=match.home_away==='home';
 return <section className="matchManager">
  <div className="glass matchHeader"><div><small>{d.competitions.find(c=>c.id===match.competition_id)?.name||'Partita'} · {fmt(match.kickoff_at)}</small><h2>{home?TEAM:o?.name||'Avversario'} <b>{match.status==='scheduled'?'VS':hs+' : '+as}</b> {home?o?.name||'Avversario':TEAM}</h2></div><span className={'status '+match.status}>{match.status}</span></div>
  <div className="matchTabs"><button className={tab==='lineup'?'active':''} onClick={()=>setTab('lineup')}>Formazione</button><button className={tab==='events'?'active':''} onClick={()=>setTab('events')}>Eventi</button></div>
  {tab==='lineup'?<>
   <div className="lineupToolbar"><label>Modulo<select value={formation} onChange={e=>setFormation(e.target.value)}>{Object.keys(formations).map(x=><option key={x}>{x}</option>)}</select></label><label>Capitano<select value={starters.find(x=>x.is_captain)?.player_id||''} onChange={e=>setCaptain(e.target.value)}><option value="">—</option>{starters.map(x=><option key={x.player_id} value={x.player_id}>{d.players.find(p=>p.id===x.player_id)?.last_name}</option>)}</select></label>{isStaff(d.role)&&<><Button className="ghost" onClick={tactical}>Storicizza modulo</Button><Button className="primary" onClick={saveSetup}>Salva partita</Button></>}</div>
   <div className="lineupWorkspace">
    <Panel title={'Rosa · '+available.length} className="lineColumn"><div className="lineScroll" onDragOver={e=>e.preventDefault()} onDrop={e=>move(e.dataTransfer.getData('player'),'available')}>{available.map(p=>playerCard(p,'available'))}</div></Panel>
    <Panel title={'Titolari · '+starters.length} className="pitchPanel"><div className="pitch">{slots.map((pos,i)=>{const x=bySlot.get(i+1),p=x&&d.players.find(p=>p.id===x.player_id);return <div className="pitchSlot" key={i} style={{left:pos[0]+'%',top:pos[1]+'%'}} onDragOver={e=>e.preventDefault()} onDrop={e=>move(e.dataTransfer.getData('player'),'starter',i+1)}>{p?<div className="pitchPlayer" draggable={isStaff(d.role)} onDragStart={e=>e.dataTransfer.setData('player',p.id)}><b>{x.shirt_number||'—'}</b><span>{p.last_name}</span>{x.is_captain&&<i>C</i>}</div>:<span className="slotDot"/>}</div>})}</div></Panel>
    <Panel title={'Panchina · '+bench.length} className="lineColumn"><div className="lineScroll" onDragOver={e=>e.preventDefault()} onDrop={e=>move(e.dataTransfer.getData('player'),'bench')}>{bench.map(x=>{const p=d.players.find(p=>p.id===x.player_id);return <div key={x.player_id} className="benchWrap">{p&&playerCard(p,'bench')}{p&&isStaff(d.role)&&<div className="eventShortcuts"><button onClick={()=>setComposer({type:'substitution',playerId:p.id})}>⇄</button><button onClick={()=>setComposer({type:'goal',playerId:p.id})}><Goal/></button><button onClick={()=>setComposer({type:'yellow_card',playerId:p.id})} className="yellowCard"/></div>}</div>})}</div></Panel>
   </div>
  </>:<div className="eventsLayout">
   {isStaff(d.role)&&<div className="quickEvents"><Button className="primary" onClick={()=>setComposer({type:'goal'})}><Plus/> Evento</Button></div>}
   <Panel title="Cronologia eventi">{[...detail.events.map(x=>({...x,_kind:'event'})),...detail.tactical.map(x=>({...x,_kind:'tactical'}))].sort((a,b)=>num(a.minute)-num(b.minute)).map(e=><div className="eventRow" key={e.id}><b>{e.minute!=null?(e.minute<=40?e.minute+'′':'2T '+(e.minute-40)+'′'):'—'}</b><span>{e._kind==='tactical'?'Cambio modulo '+(e.formation_from||'—')+' → '+e.formation_to:e.event_type+(e.team_side==='opponent'?' · Avversario':' · '+(d.players.find(p=>p.id===e.player_id)?.last_name||TEAM))}</span>{isStaff(d.role)&&e._kind==='event'&&<button onClick={async()=>{await removeMatchEvent(e.id);reload()}}>×</button>}</div>)}</Panel>
  </div>}
  {msg&&<div className="inlineMsg">{msg}</div>}
  {composer&&<EventComposer match={match} d={d} preset={composer} onClose={()=>setComposer(null)} onSaved={()=>{setComposer(null);reload();d.reload()}}/>}
 </section>;
}

function Matches({d}){
 const live=d.matches.find(x=>x.status==='live'),latest=[...d.matches].sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at))[0];
 const[selected,setSelected]=useState(live?.id||latest?.id||'');
 useEffect(()=>{if(!selected&&(live||latest))setSelected((live||latest).id)},[d.matches.length]);
 const m=d.matches.find(x=>x.id===selected);
 return <div className="page"><PageTitle title="Gestione partita" subtitle="Live e modifica a posteriori"/><div className="matchPicker">{[...d.matches].sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at)).map(x=><button className={x.id===selected?'active':''} key={x.id} onClick={()=>setSelected(x.id)}><span>{fmt(x.kickoff_at)}</span><b>{opponent(x,d)?.short_name||opponent(x,d)?.name||'Avversario'}</b></button>)}</div>{m?<MatchManager match={m} d={d}/>:<Panel title="Partite">Nessuna partita.</Panel>}</div>;
}

function StatRanking({title,rows,render}){return <Panel title={title} className="statPanel">{rows.slice(0,10).map((r,i)=><div className="statRow" key={r.player_id}><b className="rank">{i+1}</b><span>{r.last_name||'—'}</span>{render(r)}</div>)}</Panel>}
function Stats({d}){
 const stats=d.stats.map(s=>({...s,last_name:d.players.find(p=>p.id===s.player_id)?.last_name||s.last_name||'—'})),ratingMap=new Map(d.ratings.map(r=>[r.player_id,r]));
 const goals=[...stats].sort((a,b)=>num(b.goals)-num(a.goals)),assists=[...stats].sort((a,b)=>num(b.assists)-num(a.assists)),apps=[...stats].sort((a,b)=>num(b.appearances)-num(a.appearances)),ratings=stats.map(s=>({...s,...ratingMap.get(s.player_id)})).sort((a,b)=>num(b.average_rating||b.avg_rating)-num(a.average_rating||a.avg_rating));
 const bands=[['0–15′',0,15],['16–30′',16,30],['31–45+′',31,40],['46–60′',41,60],['61–75′',61,75],['76–90+′',76,999]];
 const dist=bands.map(([label,min,max])=>({label,for:d.seasonEvents.filter(e=>e.event_type==='goal'&&e.team_side==='team'&&num(e.minute)>=min&&num(e.minute)<=max).length,against:d.seasonEvents.filter(e=>e.event_type==='goal'&&e.team_side==='opponent'&&num(e.minute)>=min&&num(e.minute)<=max).length})),max=Math.max(1,...dist.flatMap(x=>[x.for,x.against]));
 return <div className="page">
  <PageTitle title="Statistiche" subtitle="Prestazioni individuali e andamento gol"/>
  <div className="statsGrid">
   <StatRanking title="Classifica ratings" rows={ratings} render={r=><div className="statValues"><strong>{Number(r.average_rating||r.avg_rating||0).toFixed(1)}</strong><small>{num(r.rating_count)} partite valutate</small></div>}/>
   <StatRanking title="Presenze e minuti" rows={apps} render={r=><div className="statValues"><strong>{num(r.appearances)} pres.</strong><small>{num(r.minutes)}′</small></div>}/>
   <StatRanking title="Classifica gol" rows={goals} render={r=><div className="statTriplet"><b>{num(r.goals)} G</b><span>{r.appearances?(num(r.goals)/num(r.appearances)).toFixed(2):'0.00'}/p</span><span>{r.minutes?(num(r.goals)*90/num(r.minutes)).toFixed(2):'0.00'}/90′</span></div>}/>
   <StatRanking title="Classifica assist" rows={assists} render={r=><div className="statTriplet"><b>{num(r.assists)} A</b><span>{r.appearances?(num(r.assists)/num(r.appearances)).toFixed(2):'0.00'}/p</span><span>{r.minutes?(num(r.assists)*90/num(r.minutes)).toFixed(2):'0.00'}/90′</span></div>}/>
  </div>
  <Panel title="Distribuzione gol fatti / subiti"><div className="goalDistribution">{dist.map(x=><div className="goalBand" key={x.label}><div className="bars"><i className="for" style={{height:(x.for/max*100)+'%'}}><span>{x.for}</span></i><i className="against" style={{height:(x.against/max*100)+'%'}}><span>{x.against}</span></i></div><b>{x.label}</b></div>)}</div><div className="chartLegend"><span><i className="for"/>Gol fatti</span><span><i className="against"/>Gol subiti</span></div></Panel>
 </div>;
}

export default function App(){
 const d=useTeamData();
 return <Shell d={d}>{d.loading?<div className="loader">TEAM MANAGER</div>:d.error?<div className="glass fatal"><h2>Errore caricamento</h2><p>{d.error}</p><Button className="primary" onClick={d.reload}>Riprova</Button></div>:<Routes><Route path="/" element={<Home d={d}/>}/><Route path="/calendario" element={<Calendar d={d}/>}/><Route path="/rosa" element={<Roster d={d}/>}/><Route path="/partite" element={<Matches d={d}/>}/><Route path="/statistiche" element={<Stats d={d}/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes>}</Shell>;
}
