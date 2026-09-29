import React,{useState}from'react';
import{NavLink}from'react-router-dom';
import{ChevronLeft,ChevronRight,Plus}from'lucide-react';
import{Surface,Title,Mark,PanelHead,ResultRow,Modal,Empty}from'../components/UI.jsx';
import{fmt,isStaff,oppBy}from'../lib/ui.js';
import{supabase}from'../lib/supabase.js';

export default function CalendarPage({d}){
  const seed=d.matches.find(x=>x.kickoff_at)?.kickoff_at;
  const base=seed?new Date(seed):new Date();
  const[cur,setCur]=useState(new Date(base.getFullYear(),base.getMonth(),1));
  const[edit,setEdit]=useState(false);
  const y=cur.getFullYear(),mo=cur.getMonth();
  const days=new Date(y,mo+1,0).getDate();
  const offset=(new Date(y,mo,1).getDay()+6)%7;
  const dayMap={};

  d.matches.filter(m=>{const x=new Date(m.kickoff_at);return x.getFullYear()===y&&x.getMonth()===mo})
    .forEach(m=>{const day=new Date(m.kickoff_at).getDate();(dayMap[day]??=[]).push(m)});

  const colors=['yellow','blue','red','green','purple'];
  const tone=id=>colors[Math.max(0,d.competitions.findIndex(x=>x.id===id))%colors.length];

  return <div className="pageStack calendarPage">
    <div className="calendarHeroGrid">
      <section className="calendarIntro">
        <span className="pageKicker">Calendario</span>
        <h1>Il nostro <em>percorso</em></h1>
        <p>Partite, risultati e prossimi impegni.</p>
        {isStaff(d)&&<button className="primaryAction calendarAdd" onClick={()=>setEdit(true)}><Plus/><span>Nuova partita</span></button>}
      </section>

      <Surface className="calendarCard">
        <div className="calendarToolbar">
          <button onClick={()=>setCur(new Date(y,mo-1,1))} aria-label="Mese precedente"><ChevronLeft/></button>
          <h2>{fmt(cur,{month:'long',year:'numeric'})}</h2>
          <button onClick={()=>setCur(new Date(y,mo+1,1))} aria-label="Mese successivo"><ChevronRight/></button>
        </div>

        <div className="weekdayRow">{['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(x=><b key={x}>{x}</b>)}</div>
        <div className="calendarGrid">
          {Array.from({length:offset},(_,i)=><span className="calendarDay emptyDay" key={'e'+i}/>)}
          {Array.from({length:days},(_,i)=>{
            const day=i+1,items=dayMap[day]||[];
            return <div className={'calendarDay '+(items[0]?tone(items[0].competition_id):'')} key={day}>
              <span className="dayNumber">{day}</span>
              <div className="dayFixtures">
                {items.slice(0,2).map(m=>{const o=oppBy(d,m.opponent_id);return <NavLink to={'/partite/'+m.id} key={m.id} aria-label={o?.name||'Partita'}>
                  <Mark name={o?.name||'AVV'} url={o?.logo_url} size="calendar"/>
                  <small>{fmt(m.kickoff_at,{hour:'2-digit',minute:'2-digit'})}</small>
                </NavLink>})}
              </div>
            </div>
          })}
        </div>
      </Surface>

      <Surface className="competitionCard">
        <PanelHead title="Competizioni"/>
        <div className="competitionLegend vertical">
          {d.competitions.map((c,i)=><span key={c.id}><i className={colors[i%colors.length]}/>{c.name}</span>)}
        </div>
      </Surface>
    </div>

    <Surface className="contentCard scheduleCard">
      <PanelHead title="Tutte le partite" meta={d.matches.length+' incontri'}/>
      <div className="listStack">{d.matches.length?d.matches.map(m=><ResultRow key={m.id} d={d} m={m}/>):<Empty>Nessuna partita.</Empty>}</div>
    </Surface>

    {edit&&<MatchEditor d={d} close={()=>setEdit(false)}/>}
  </div>;
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
  return <Modal close={close}>
    <h2>Nuova partita</h2>
    <form className="responsiveForm" onSubmit={submit}>
      <label>Competizione<select name="competition_id"><option value="">—</option>{d.competitions.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
      <label>Avversario<select required name="opponent_id"><option value="">Seleziona…</option>{d.opponents.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
      <label>Data e ora<input required type="datetime-local" name="kickoff_at"/></label>
      <label>Casa/trasferta<select name="home_away"><option value="home">Casa</option><option value="away">Trasferta</option><option value="neutral">Neutro</option></select></label>
      <label>Campo<input name="venue"/></label>
      <label>Giornata<input name="round_label"/></label>
      <label className="spanAll">Note<textarea name="notes"/></label>
      <button className="primaryAction spanAll">Salva partita</button>
    </form>
  </Modal>;
}
