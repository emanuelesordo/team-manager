/* Fonte unica per schede giocatore, Rosa e Statistiche.
   Conteggi basati esclusivamente sulle partite concluse della stagione. */
window.TeamSeasonStats=(()=>{
  const key=v=>String(v??"");
  const finite=v=>v!==null&&v!==""&&Number.isFinite(Number(v));
  const empty=id=>({player_id:id,appearances:0,starts:0,minutes:0,minutes_played:0,goals:0,assists:0,yellow_cards:0,blue_cards:0,red_cards:0,disciplinary_cards:0,avg_rating:null,rated_matches:0,last_ratings:[]});
  function aggregate({matches=[],matchPlayers=[],events=[],ratings=[],competitions=[],players=[]}={}){
    const completed=matches.filter(m=>m.status==="finished");
    const byId=new Map(completed.map(m=>[key(m.id),m]));
    const perMatchParticipants=new Map(),perMatchEvents=new Map(),perMatchRatings=new Map();
    const stats=new Map();
    const ensure=id=>{const k=key(id);if(!stats.has(k))stats.set(k,empty(id));return stats.get(k);};
    players.forEach(p=>ensure(p.player_id??p.id));
    matchPlayers.forEach(p=>{
      const mid=key(p.match_id);if(!byId.has(mid)||p.player_id==null)return;
      if(!perMatchParticipants.has(mid))perMatchParticipants.set(mid,new Map());
      perMatchParticipants.get(mid).set(key(p.player_id),p);
      ensure(p.player_id);
    });
    events.forEach(e=>{
      const mid=key(e.match_id);
      if(!byId.has(mid)||e.validation_status==="rejected"||e.validation_status==="proposed"||e.team_side!=="team")return;
      if(!perMatchEvents.has(mid))perMatchEvents.set(mid,[]);
      perMatchEvents.get(mid).push(e);
      if(e.player_id!=null)ensure(e.player_id);
      if(e.secondary_player_id!=null&&e.event_type==="goal")ensure(e.secondary_player_id);
    });
    ratings.forEach(r=>{
      const mid=key(r.match_id),v=Number(r.rating);
      if(!byId.has(mid)||r.player_id==null||!finite(r.rating)||v<1||v>10)return; // SV escluso
      if(!perMatchRatings.has(mid))perMatchRatings.set(mid,new Map());
      const map=perMatchRatings.get(mid),pid=key(r.player_id);
      if(!map.has(pid))map.set(pid,[]);
      map.get(pid).push(v);
      ensure(r.player_id);
    });
    for(const match of completed){
      const mid=key(match.id),participants=perMatchParticipants.get(mid)||new Map();
      const ev=perMatchEvents.get(mid)||[],votes=perMatchRatings.get(mid)||new Map();
      const competition=competitions.find(c=>key(c.id)===key(match.competition_id));
      const period=Number(competition?.minutes_per_period)||45;
      const getPeriod=e=>e.payload?.period==="first_half"||e.payload?.period==="second_half"?e.payload.period:(Number(e.minute)>period?"second_half":"first_half");
      const recovery=part=>{
        const explicit=ev.find(e=>e.event_type==="period_end"&&e.payload?.period===part);
        return explicit?Math.max(0,Number(explicit.payload?.recovery_minutes??explicit.stoppage_minute)||0):0;
      };
      const r1=recovery("first_half"),r2=recovery("second_half");
      const end=period*2+r1+r2;
      const elapsed=e=>{
        const minute=Number(e.minute);
        if(!Number.isFinite(minute))return null;
        return getPeriod(e)==="second_half"?period+r1+minute:minute;
      };
      const active=new Set([...participants.values()].filter(p=>p.started).map(p=>key(p.player_id)));
      const played=new Set(active);
      const durations=new Map([...active].map(id=>[id,0]));
      const timeline=ev.filter(e=>e.minute!=null&&(e.event_type==="substitution"||e.event_type==="red_card"))
        .map(e=>({e,t:elapsed(e)})).filter(x=>x.t!=null)
        .sort((a,b)=>a.t-b.t);
      let cursor=0;
      for(const {e,t} of timeline){
        const at=Math.min(Math.max(t,cursor),Math.max(end,t));
        const delta=Math.max(0,at-cursor);
        active.forEach(id=>durations.set(id,(durations.get(id)||0)+delta));
        if(e.event_type==="substitution"){
          if(e.player_id!=null)active.delete(key(e.player_id));
          if(e.secondary_player_id!=null){const id=key(e.secondary_player_id);active.add(id);played.add(id);if(!durations.has(id))durations.set(id,0);ensure(e.secondary_player_id);}
        }else if(e.player_id!=null)active.delete(key(e.player_id));
        cursor=at;
      }
      active.forEach(id=>durations.set(id,(durations.get(id)||0)+Math.max(0,end-cursor)));
      participants.forEach((p,pid)=>{
        const stored=finite(p.minutes_played)?Number(p.minutes_played):null;
        const derived=durations.get(pid)||0;
        // Non confondere un valore 0 predefinito con minuti realmente giocati.
        const minutes=derived>0?derived:(stored!=null?Math.max(0,stored):0);
        if(stored>0||minutes>0||p.started)played.add(pid);
        const stat=ensure(p.player_id);
        if(played.has(pid)){stat.appearances++;stat.minutes+=Math.round(minutes);}
        if(p.started)stat.starts++;
      });
      // Gestisce anche subentrati presenti negli eventi ma mancanti nella lista convocati.
      played.forEach(pid=>{
        if(participants.has(pid))return;
        const stat=stats.get(pid);if(stat){stat.appearances++;stat.minutes+=Math.round(durations.get(pid)||0);}
      });
      ev.forEach(e=>{
        if(e.event_type==="goal"){
          if(e.player_id!=null)ensure(e.player_id).goals++;
          if(e.secondary_player_id!=null&&key(e.secondary_player_id)!==key(e.player_id))ensure(e.secondary_player_id).assists++;
        }
        const attr={yellow_card:"yellow_cards",blue_card:"blue_cards",red_card:"red_cards"}[e.event_type];
        if(attr&&e.player_id!=null)ensure(e.player_id)[attr]++;
      });
      votes.forEach((values,pid)=>{
        const stat=stats.get(pid);if(!stat||!values.length)return;
        stat.last_ratings.push({match_id:match.id,rating:values.reduce((sum,v)=>sum+v,0)/values.length,kickoff_at:match.kickoff_at,opponent_id:match.opponent_id});
      });
    }
    stats.forEach(s=>{
      s.minutes_played=s.minutes;
      s.disciplinary_cards=s.yellow_cards+s.blue_cards+s.red_cards;
      s.last_ratings.sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
      s.rated_matches=s.last_ratings.length;
      s.avg_rating=s.rated_matches?s.last_ratings.reduce((sum,x)=>sum+x.rating,0)/s.rated_matches:null;
    });
    return stats;
  }
  return {aggregate};
})();