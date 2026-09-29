import React,{useEffect,useState}from'react';
import{ChevronLeft}from'lucide-react';
import{Navigate,useNavigate,useParams}from'react-router-dom';
import{Surface,MatchTeams,PanelHead,Pill,Empty}from'../components/UI.jsx';
import{EVENT_LABEL,FORMATIONS,compBy,fmt,isStaff,n,playerBy}from'../lib/ui.js';
import{supabase}from'../lib/supabase.js';

export default function MatchDetail({d}){
  const{id}=useParams(),nav=useNavigate(),m=d.matches.find(x=>x.id===id);
  const[tab,setTab]=useState('lineup'),[mp,setMp]=useState([]),[tactical,setTactical]=useState([]),[busy,setBusy]=useState(false);

  async function reload(){
    const[a,b]=await Promise.all([
      supabase.from('app_match_players').select('*').eq('match_id',id),
      supabase.from('app_match_tactical_changes').select('*').eq('match_id',id).order('minute')
    ]);
    setMp(a.data||[]);setTactical(b.data||[]);
  }

  useEffect(()=>{reload()},[id]);
  if(!m)return <Navigate to="/partite"/>;

  const events=d.events.filter(x=>x.match_id===id),staff=isStaff(d),formation=m.formation||'4-4-2';
  const slots=FORMATIONS[formation]||FORMATIONS['4-4-2'];
  const starters=mp.filter(x=>x.selection_status==='starter'||x.started);
  const bench=mp.filter(x=>x.selection_status==='bench');
  const assigned=new Set(mp.filter(x=>['starter','bench'].includes(x.selection_status)).map(x=>x.player_id));
  const unassigned=d.players.filter(p=>!assigned.has(p.id));

  async function saveLineup(){
    setBusy(true);
    const captain=document.querySelector('#captainSelect')?.value||null;
    const form=document.querySelector('#formationSelect')?.value||formation;
    const rows=mp.map(x=>({...x,is_captain:captain?x.player_id===captain:false})).map(({id,...x})=>x);
    if(rows.length){
      const q=await supabase.from('app_match_players').upsert(rows,{onConflict:'match_id,player_id'});
      if(q.error){setBusy(false);return alert(q.error.message)}
    }
    const q=await supabase.from('app_matches').update({formation:form}).eq('id',id);
    setBusy(false);
    if(q.error)return alert(q.error.message);
    d.refresh();reload();
  }

  async function setStatus(playerId,status,slot=null){
    const x=mp.find(r=>r.player_id===playerId);
    const row={
      match_id:id,player_id:playerId,selection_status:status,started:status==='starter',
      tactical_slot:status==='starter'?slot:null,shirt_number:x?.shirt_number||null,
      minutes_played:x?.minutes_played??null,is_captain:x?.is_captain||false,
      unused_sub_reason:x?.unused_sub_reason||null,
      unavailability_reason:status==='absent'?(x?.unavailability_reason||'technical_choice'):null,
      unavailability_note:x?.unavailability_note||null
    };
    const q=await supabase.from('app_match_players').upsert(row,{onConflict:'match_id,player_id'});
    if(q.error)return alert(q.error.message);
    reload();
  }

  return <div className="pageStack matchPage">
    <header className="matchHeader">
      <button className="backButton" onClick={()=>nav(-1)} aria-label="Indietro"><ChevronLeft/></button>
      <div className="matchHeaderCopy">
        <Pill tone={m.status}>{m.status}</Pill>
        <h1>{compBy(d,m.competition_id)?.name||'Partita'}</h1>
        <p>{fmt(m.kickoff_at)} · {m.venue||'—'} {m.round_label?'· '+m.round_label:''}</p>
      </div>
      <div className="matchHeaderScore"><MatchTeams d={d} m={m} compact/></div>
    </header>

    <LiveControls d={d} match={m}/>

    <div className="segmentedTabs">
      <button className={tab==='lineup'?'active':''} onClick={()=>setTab('lineup')}>Formazione</button>
      <button className={tab==='events'?'active':''} onClick={()=>setTab('events')}>Eventi <span>{events.length}</span></button>
    </div>

    {tab==='lineup'?<div className="lineupLayout">
      <Surface className="lineupPitchCard">
        <div className="lineupCardHead">
          <div><h2>Titolari</h2><span>{starters.length}/11</span></div>
          <select id="formationSelect" defaultValue={formation}>{Object.keys(FORMATIONS).map(x=><option key={x}>{x}</option>)}</select>
          {staff&&<button disabled={busy} onClick={saveLineup} className="primaryAction compact">{busy?'Salvo…':'Salva'}</button>}
        </div>

        <div className="matchPitch">
          {slots.map((pos,i)=>{
            const x=starters.find(x=>x.tactical_slot===i+1),p=x&&playerBy(d,x.player_id);
            return <div className="pitchPlayer" key={i} style={{left:pos[0]+'%',top:pos[1]+'%'}}>
              {p?<><span className="pitchNumber">{x.shirt_number||'—'}</span><strong>{p.last_name}</strong>{x.is_captain&&<i>C</i>}</>:<small>{i+1}</small>}
            </div>
          })}
        </div>

        {staff&&<label className="captainField">Capitano<select id="captainSelect" defaultValue={starters.find(x=>x.is_captain)?.player_id||''}><option value="">—</option>{starters.map(x=><option key={x.player_id} value={x.player_id}>{playerBy(d,x.player_id)?.last_name}</option>)}</select></label>}
      </Surface>

      <Surface className="lineupBenchCard">
        <PanelHead title="Panchina" meta={bench.length+' giocatori'}/>
        <div className="squadList">
          {bench.map(x=>{const p=playerBy(d,x.player_id);return <div className="squadListRow" key={x.player_id}>
            <span className="shirtBadge">{x.shirt_number||'—'}</span>
            <Pill tone={'role '+p?.generic_role_manual}>{p?.generic_role_manual}</Pill>
            <strong>{p?.last_name}</strong>
            {staff&&<QuickEvents d={d} match={m} player={p}/>}
          </div>})}
        </div>
        {staff&&<select className="addPlayerSelect" onChange={e=>{if(e.target.value)setStatus(e.target.value,'bench')}} defaultValue="">
          <option value="">+ Aggiungi in panchina</option>{d.players.filter(p=>!assigned.has(p.id)).map(p=><option value={p.id} key={p.id}>{p.last_name}</option>)}
        </select>}
      </Surface>

      <Surface className="lineupSquadCard">
        <PanelHead title="Rosa squadra"/>
        <div className="squadList scrollable">
          {d.players.filter(p=>starters.some(x=>x.player_id===p.id)||!mp.some(x=>x.player_id===p.id)).map(p=><PlayerAssign key={p.id} p={p} x={mp.find(x=>x.player_id===p.id)} staff={staff} onStatus={setStatus}/>)}
        </div>
        <div className="notCalledBlock">
          <div className="subhead"><h3>Non convocati</h3><span>{unassigned.length}</span></div>
          {unassigned.map(p=><div className="squadListRow compact" key={p.id}>
            <Pill tone={'role '+p.generic_role_manual}>{p.generic_role_manual}</Pill>
            <strong>{p.last_name}</strong>
            {staff&&<button className="ghostAction" onClick={()=>setStatus(p.id,'absent')}>NC</button>}
          </div>)}
        </div>
      </Surface>
    </div>:<EventsPanel d={d} match={m} events={events} tactical={tactical}/>}
  </div>;
}

function LiveControls({d,match}){
  if(!isStaff(d))return match.notes?<Surface className="matchNote"><strong>Note</strong><span>{match.notes}</span></Surface>:null;
  async function patch(row){const q=await supabase.from('app_matches').update(row).eq('id',match.id);if(q.error)return alert(q.error.message);d.refresh()}
  return <Surface className="liveControlBar">
    <div><strong>Gestione partita</strong><span>{match.notes||'Nessuna nota'}</span></div>
    <div className="liveActions">
      {match.status!=='live'&&match.status!=='finished'&&<button onClick={()=>patch({status:'live',live_period:'first_half',live_started_at:new Date().toISOString()})}>Avvia</button>}
      {match.status==='live'&&<><button onClick={()=>patch({live_period:'halftime'})}>Intervallo</button><button onClick={()=>patch({live_period:'second_half'})}>2° tempo</button><button className="danger" onClick={()=>patch({status:'finished',live_period:'finished',finalized_at:new Date().toISOString()})}>Termina</button></>}
    </div>
  </Surface>;
}

function PlayerAssign({p,x,staff,onStatus}){
  return <div className="squadListRow">
    <span className="shirtBadge">{x?.shirt_number||'—'}</span>
    <Pill tone={'role '+p.generic_role_manual}>{p.generic_role_manual||'—'}</Pill>
    <strong>{p.last_name}</strong>
    {staff&&<div className="rowActions"><button onClick={()=>onStatus(p.id,'starter',x?.tactical_slot||1)}>XI</button><button onClick={()=>onStatus(p.id,'bench')}>P</button></div>}
  </div>;
}

function QuickEvents({d,match,player}){
  async function add(type){
    if(!d.session)return alert('Accedi per registrare eventi.');
    const row={match_id:match.id,event_type:type,minute:0,player_id:player?.id||null,team_side:'team',proposed_by:d.session.user.id,validation_status:isStaff(d)?'official':'proposed',officialized_by:isStaff(d)?d.session.user.id:null,officialized_at:isStaff(d)?new Date().toISOString():null};
    const q=await supabase.from('app_match_events').insert(row);
    if(q.error)return alert(q.error.message);
    d.refresh();
  }
  return <div className="quickActions"><button onClick={()=>add('substitution')}>⇄</button><button onClick={()=>add('goal')}>⚽</button><button onClick={()=>add('yellow_card')}><span className="yellowMiniCard"/></button></div>;
}

function EventsPanel({d,match,events,tactical}){
  const[type,setType]=useState('goal');

  async function submit(e){
    e.preventDefault();
    if(!d.session)return alert('Accedi per registrare eventi.');
    const f=new FormData(e.currentTarget),side=f.get('team_side');
    const row={match_id:match.id,event_type:f.get('event_type'),minute:Number(f.get('minute')||0),player_id:side==='team'?(f.get('player_id')||null):null,secondary_player_id:f.get('secondary_player_id')||null,team_side:side,substitution_reason:f.get('event_type')==='substitution'?(f.get('substitution_reason')||null):null,proposed_by:d.session.user.id,validation_status:isStaff(d)?'official':'proposed',officialized_by:isStaff(d)?d.session.user.id:null,officialized_at:isStaff(d)?new Date().toISOString():null};
    const q=await supabase.from('app_match_events').insert(row);
    if(q.error)return alert(q.error.message);
    e.currentTarget.reset();d.refresh();
  }

  const rows=[...events.map(x=>({...x,_type:'event'})),...tactical.map(x=>({...x,_type:'tactical'}))].sort((a,b)=>n(a.minute)-n(b.minute));

  return <div className="eventsLayout">
    {isStaff(d)&&<Surface className="eventComposer">
      <div className="eventQuickGrid">
        <button onClick={()=>setType('goal')}>⚽ <span>Gol</span></button>
        <button onClick={()=>setType('yellow_card')}><span className="eventCard yellow"/> <span>Giallo</span></button>
        <button onClick={()=>setType('red_card')}><span className="eventCard red"/> <span>Rosso</span></button>
        <button onClick={()=>setType('substitution')}>⇄ <span>Cambio</span></button>
      </div>

      <form onSubmit={submit} className="responsiveForm">
        <label>Evento<select name="event_type" value={type} onChange={e=>setType(e.target.value)}>{Object.entries(EVENT_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label>Minuto<input name="minute" type="number" min="0" max="120" defaultValue="0"/></label>
        <label>Squadra<select name="team_side"><option value="team">Calcio Caselle</option><option value="opponent">Avversario</option></select></label>
        <label>Giocatore<select name="player_id"><option value="">—</option>{d.players.map(p=><option value={p.id} key={p.id}>{p.last_name} {p.first_name}</option>)}</select></label>
        {type==='substitution'&&<><label>Secondo giocatore<select name="secondary_player_id"><option value="">—</option>{d.players.map(p=><option value={p.id} key={p.id}>{p.last_name}</option>)}</select></label><label>Motivo<select name="substitution_reason"><option value="">—</option><option value="technical_choice">Scelta tecnica</option><option value="injury">Infortunio</option><option value="injury_prevention">Prevenzione infortunio</option></select></label></>}
        <button className="primaryAction spanAll">Aggiungi evento</button>
      </form>
    </Surface>}

    <Surface className="timelineCard">
      <PanelHead title="Cronologia" meta={rows.length+' eventi'}/>
      <div className="timelineList">
        {rows.length?rows.map(e=>{const p=playerBy(d,e.player_id);return <article className="timelineItem" key={e.id}>
          <time>{n(e.minute)}′</time>
          <span className="timelineIcon">{e._type==='tactical'?'↗':e.event_type==='goal'?'⚽':e.event_type==='substitution'?'⇄':'•'}</span>
          <div><strong>{e._type==='tactical'?('Cambio modulo '+(e.formation_from||'—')+' → '+e.formation_to):(EVENT_LABEL[e.event_type]||e.event_type)}</strong><small>{e.team_side==='opponent'?'Avversario':p?(p.first_name+' '+p.last_name):'Calcio Caselle'}</small></div>
          <Pill>{e.validation_status||'Tattica'}</Pill>
        </article>}):<Empty>Nessun evento registrato.</Empty>}
      </div>
    </Surface>
  </div>;
}
