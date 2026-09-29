import React,{useState}from'react';
import{Plus}from'lucide-react';
import{Surface,Title,Pill,Modal,PanelHead}from'../components/UI.jsx';
import{FORMATIONS,ROLE,initials,isStaff,n,playerBy}from'../lib/ui.js';
import{supabase}from'../lib/supabase.js';
import{TEAM_ID}from'../lib/data.js';

export default function Roster({d}){
  const[role,setRole]=useState('all'),[selected,setSelected]=useState(null),[edit,setEdit]=useState(false);
  const players=role==='all'?d.players:d.players.filter(p=>p.generic_role_manual===role);
  const counts=Object.fromEntries(['P','D','C','A'].map(r=>[r,d.players.filter(p=>p.generic_role_manual===r).length]));

  return <div className="pageStack">
    <Title title="La nostra squadra" sub="Rosa attuale, ruoli e rendimento." action={isStaff(d)&&<button className="primaryAction" onClick={()=>setEdit(true)}><Plus/><span>Giocatore</span></button>}/>

    <div className="roleFilter">
      {['P','D','C','A'].map(r=><button key={r} onClick={()=>setRole(role===r?'all':r)} className={role===r?'active':''}>
        <span>{r}</span><strong>{counts[r]}</strong><small>{ROLE[r]}</small>
      </button>)}
    </div>

    <div className="rosterGrid">
      <Surface className="rosterListCard">
        <div className="rosterColumns"><span>#</span><span>Giocatore</span><span>Ruolo</span><span>Pres.</span><span>Gol</span><span>Assist</span></div>
        <div className="rosterRows">
          {players.map((p,i)=>{const s=d.stats.find(x=>x.player_id===p.id)||{};return <button className="playerRow" onClick={()=>setSelected(p)} key={p.id}>
            <span className="playerIndex">{i+1}</span>
            <span className="playerIdentity"><span className="playerAvatar">{p.photo_url?<img src={p.photo_url} alt=""/>:initials(p.first_name,p.last_name)}</span><span><strong>{p.first_name} {p.last_name}</strong><small>{p.preferred_foot||'—'}</small></span></span>
            <Pill tone={'role '+(p.generic_role_manual||'')}>{p.generic_role_manual||'—'}</Pill>
            <strong className="desktopStat">{n(s.appearances)}</strong><strong className="desktopStat">{n(s.goals)}</strong><strong className="desktopStat">{n(s.assists)}</strong>
            <span className="mobilePlayerStats"><span>Pres. <b>{n(s.appearances)}</b></span><span>Gol <b>{n(s.goals)}</b></span><span>Assist <b>{n(s.assists)}</b></span></span>
          </button>})}
        </div>
      </Surface>

      <FormationPreview d={d}/>
    </div>

    {selected&&<PlayerDetail d={d} p={selected} close={()=>setSelected(null)}/>}
    {edit&&<PlayerEditor d={d} close={()=>setEdit(false)}/>}
  </div>;
}

function FormationPreview({d}){
  const used=[...d.stats].filter(x=>n(x.starts)>0).sort((a,b)=>n(b.starts)-n(a.starts)).slice(0,11),slots=FORMATIONS['4-4-2'];
  return <Surface className="formationCard">
    <PanelHead title="Formazione tipo"/>
    <div className="pitchPreview">{slots.map((pos,i)=>{const s=used[i],p=s&&playerBy(d,s.player_id);return <span key={i} style={{left:pos[0]+'%',top:pos[1]+'%'}}>{p?p.last_name:'—'}</span>})}</div>
  </Surface>;
}

function PlayerDetail({d,p,close}){
  const s=d.stats.find(x=>x.player_id===p.id)||{};
  return <Modal close={close}>
    <div className="playerModalHead"><span className="playerAvatar large">{p.photo_url?<img src={p.photo_url} alt=""/>:initials(p.first_name,p.last_name)}</span><div><Pill>{ROLE[p.generic_role_manual]||'Giocatore'}</Pill><h2>{p.first_name} {p.last_name}</h2><p>{p.nationality_code||'—'} {p.height_cm?'· '+p.height_cm+' cm':''}</p></div></div>
    <div className="playerStats">{[['Presenze',s.appearances],['Minuti',s.minutes],['Gol',s.goals],['Assist',s.assists],['Rating',s.avg_rating??'—']].map(([a,b])=><span key={a}><small>{a}</small><strong>{b??0}</strong></span>)}</div>
  </Modal>;
}

function PlayerEditor({d,close}){
  async function submit(e){
    e.preventDefault();const f=new FormData(e.currentTarget);
    const row={team_id:TEAM_ID,first_name:f.get('first_name'),last_name:f.get('last_name'),generic_role_manual:f.get('generic_role_manual')||null,preferred_foot:f.get('preferred_foot')||null,birth_date:f.get('birth_date')||null,height_cm:f.get('height_cm')?Number(f.get('height_cm')):null};
    const{data,error}=await supabase.from('players').insert(row).select().single();
    if(error)return alert(error.message);
    if(d.season&&data)await supabase.from('app_roster').insert({season_id:d.season.id,player_id:data.id});
    d.refresh();close();
  }
  return <Modal close={close}><h2>Nuovo giocatore</h2><form className="responsiveForm" onSubmit={submit}>
    <label>Nome<input required name="first_name"/></label><label>Cognome<input required name="last_name"/></label>
    <label>Ruolo<select name="generic_role_manual"><option value="">—</option>{['P','D','C','A'].map(r=><option key={r} value={r}>{ROLE[r]}</option>)}</select></label>
    <label>Piede<select name="preferred_foot"><option value="">—</option><option value="right">Destro</option><option value="left">Sinistro</option><option value="both">Entrambi</option></select></label>
    <label>Nascita<input type="date" name="birth_date"/></label><label>Altezza<input type="number" name="height_cm"/></label>
    <button className="primaryAction spanAll">Salva giocatore</button>
  </form></Modal>;
}