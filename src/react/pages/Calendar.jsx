import React,{useMemo,useState}from'react';
import{NavLink}from'react-router-dom';
import{CalendarDays,ChevronLeft,ChevronRight,List,MapPin,Plus}from'lucide-react';
import{Surface,Mark,Modal,Empty}from'../components/UI.jsx';
import{compBy,fmt,isStaff,oppBy,sideScore}from'../lib/ui.js';
import{supabase}from'../lib/supabase.js';
import'./calendar.css';

export default function CalendarPage({d}){
  const seed=d.matches.find(x=>x.kickoff_at)?.kickoff_at;
  const base=seed?new Date(seed):new Date();
  const[cur,setCur]=useState(new Date(base.getFullYear(),base.getMonth(),1));
  const[edit,setEdit]=useState(false);
  const[view,setView]=useState('list');

  const y=cur.getFullYear(),mo=cur.getMonth();
  const days=new Date(y,mo+1,0).getDate();
  const offset=(new Date(y,mo,1).getDay()+6)%7;
  const dayMap={};

  d.matches
    .filter(m=>{const x=new Date(m.kickoff_at);return x.getFullYear()===y&&x.getMonth()===mo})
    .forEach(m=>{const day=new Date(m.kickoff_at).getDate();(dayMap[day]??=[]).push(m)});

  const colors=['yellow','blue','red','green','purple'];
  const tone=id=>colors[Math.max(0,d.competitions.findIndex(x=>x.id===id))%colors.length];
  const programme=useMemo(()=>[...d.matches].sort((a,b)=>new Date(b.kickoff_at)-new Date(a.kickoff_at)),[d.matches]);

  function goToday(){
    const t=new Date();
    setCur(new Date(t.getFullYear(),t.getMonth(),1));
  }

  return <div className="calScreen">
    <div className="calTop">
      <section className="calIntro">
        <span>Calendario</span>
        <h1>Il nostro <em>percorso</em></h1>
        <p>Partite, risultati e prossimi impegni.</p>
        {isStaff(d)&&<button className="calPrimary" onClick={()=>setEdit(true)}><Plus/>Nuova partita</button>}
      </section>

      <Surface className="calMonth">
        <div className="calMonthHead">
          <button onClick={()=>setCur(new Date(y,mo-1,1))}><ChevronLeft/></button>
          <h2>{fmt(cur,{month:'long',year:'numeric'})}</h2>
          <button className="calToday" onClick={goToday}>Oggi</button>
        </div>

        <div className="calWeek">{['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(x=><b key={x}>{x}</b>)}</div>
        <div className="calGrid">
          {Array.from({length:offset},(_,i)=><span className="calDay ghost" key={'e'+i}/>)}
          {Array.from({length:days},(_,i)=>{
            const day=i+1,items=dayMap[day]||[];
            return <div className={'calDay '+(items[0]?tone(items[0].competition_id):'')} key={day}>
              <span className="calDayNum">{day}</span>
              {items.length>0&&<div className="calDayFixtures">
                {items.slice(0,2).map(m=>{const o=oppBy(d,m.opponent_id);return <NavLink to={'/partite/'+m.id} key={m.id}><Mark name={o?.name||'AVV'} url={o?.logo_url} size="calendar"/></NavLink>})}
              </div>}
            </div>
          })}
        </div>
      </Surface>

      <Surface className="calLegend">
        <h2>Competizioni</h2>
        <div>{d.competitions.map((c,i)=><span key={c.id}><i className={colors[i%colors.length]}/>{c.name}</span>)}</div>
      </Surface>
    </div>

    <Surface className="calProgramme">
      <div className="calProgrammeHead">
        <h2>Tutte le <em>partite</em></h2>
        <div className="calViewSwitch">
          <button className={view==='list'?'active':''} onClick={()=>setView('list')}><List/>Lista</button>
          <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays/>Calendario</button>
        </div>
      </div>

      {view==='list'?<>
        <div className="calColumns">
          <span>Data</span><span>Competizione</span><span>Partita</span><span>Risultato</span><span>Luogo</span><span/>
        </div>
        <div className="calRows">
          {programme.length?programme.map(m=><ProgrammeRow key={m.id} d={d} m={m} tone={tone(m.competition_id)}/>):<Empty>Nessuna partita.</Empty>}
        </div>
      </>:<div className="calAlt"><CalendarDays/><span>Calendario mensile disponibile sopra.</span></div>}
    </Surface>

    {edit&&<MatchEditor d={d} close={()=>setEdit(false)}/>}
  </div>;
}

function ProgrammeRow({d,m,tone}){
  const o=oppBy(d,m.opponent_id),c=compBy(d,m.competition_id),ss=sideScore(d,m);
  const home=m.home_away!=='away';
  const team=['Calcio Caselle',d.settings.team_logo_url],opp=[o?.name||'Avversario',o?.logo_url];
  const left=home?team:opp,right=home?opp:team;
  const score=m.status==='scheduled'?'VS':ss[0]+' - '+ss[1];
  const label=m.status==='scheduled'?'Prossima':m.status==='live'?'In corso':resultStatus(ss);
  const badge=m.status==='scheduled'?'next':m.status==='live'?'live':label==='Vittoria'?'win':label==='Pareggio'?'draw':'loss';

  return <NavLink className="calRow" to={'/partite/'+m.id}>
    <div className="calDate"><strong>{fmt(m.kickoff_at,{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</strong><small>{fmt(m.kickoff_at,{hour:'2-digit',minute:'2-digit'})}</small></div>

    <div className="calCompetition"><i className={tone}/><span><strong>{c?.name||'Partita'}</strong><small>{m.round_label||'—'}</small></span></div>

    <div className="calMatch">
      <span><Mark name={left[0]} url={left[1]}/><strong>{left[0]}</strong></span>
      <b>{score}</b>
      <span><Mark name={right[0]} url={right[1]}/><strong>{right[0]}</strong></span>
    </div>

    <div><span className={'calBadge '+badge}>{label}</span></div>
    <div className="calVenue"><MapPin/><span>{m.venue||'—'}</span></div>
    <ChevronRight className="calArrow"/>
  </NavLink>;
}

function resultStatus(ss){
  const a=Number(ss[0]),b=Number(ss[1]);
  if(a>b)return'Vittoria';
  if(a<b)return'Sconfitta';
  return'Pareggio';
}

function MatchEditor({d,close}){
  async function submit(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const row={season_id:d.season?.id,competition_id:f.get('competition_id')||null,opponent_id:f.get('opponent_id'),kickoff_at:new Date(f.get('kickoff_at')).toISOString(),home_away:f.get('home_away'),venue:f.get('venue')||null,round_label:f.get('round_label')||null,status:'scheduled',notes:f.get('notes')||null};
    const q=await supabase.from('app_matches').insert(row);
    if(q.error)return alert(q.error.message);
    d.refresh();close();
  }
  return <Modal close={close}><h2>Nuova partita</h2><form className="responsiveForm" onSubmit={submit}>
    <label>Competizione<select name="competition_id"><option value="">—</option>{d.competitions.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
    <label>Avversario<select required name="opponent_id"><option value="">Seleziona…</option>{d.opponents.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
    <label>Data e ora<input required type="datetime-local" name="kickoff_at"/></label>
    <label>Casa/trasferta<select name="home_away"><option value="home">Casa</option><option value="away">Trasferta</option><option value="neutral">Neutro</option></select></label>
    <label>Campo<input name="venue"/></label><label>Giornata<input name="round_label"/></label>
    <label className="spanAll">Note<textarea name="notes"/></label>
    <button className="primaryAction spanAll">Salva partita</button>
  </form></Modal>;
}
