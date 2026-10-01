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
      if(!byId.has(mid)||e.validation_status==="rejected"||e.team_side!=="team")return;
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
      // Il Match Center registra un minuto relativo al tempo e, quando presente,
      // un recupero separato. La linea temporale è continua: 1T + rec1 + 2T + rec2.
      const getPeriod=e=>{
        if(e.payload?.period==="first_half"||e.payload?.period==="second_half")return e.payload.period;
        const minute=Number(e.minute);
        return Number.isFinite(minute)&&minute>period?"second_half":"first_half";
      };
      const explicitRecovery=part=>{
        const entry=ev.filter(e=>e.event_type==="period_end"&&e.payload?.period===part).at(-1);
        const value=entry?.payload?.recovery_minutes??entry?.stoppage_minute;
        return finite(value)?Math.max(0,Number(value)):null;
      };
      const inferredRecovery=part=>{
        const additional=ev.filter(e=>e.event_type!=="period_end"&&e.minute!=null&&getPeriod(e)===part)
          .map(e=>{
            const minute=Number(e.minute),stoppage=Math.max(0,Number(e.stoppage_minute)||0);
            return minute>=period?Math.max(minute-period,stoppage):0;
          }).filter(Number.isFinite);
        return Math.max(0,...additional);
      };
      const r1=explicitRecovery("first_half")??inferredRecovery("first_half");
      const r2=explicitRecovery("second_half")??inferredRecovery("second_half");
      const end=period*2+r1+r2;
      const elapsed=e=>{
        if(!finite(e.minute))return null;
        const minute=Math.max(0,Number(e.minute));
        const plus=Math.max(0,Number(e.stoppage_minute)||0);
        const within=minute>=period?minute+plus:minute;
        // Es.: 45+3 => 48; 2T 20' => 45 + recupero 1T + 20.
        const absolute=minute===period&&plus>0?minute+plus:within;
        return Math.min(end,getPeriod(e)==="second_half"?period+r1+absolute:absolute);
      };
      const active=new Set([...participants.values()].filter(p=>p.started).map(p=>key(p.player_id)));
      const played=new Set(active);
      const durations=new Map([...active].map(id=>[id,0]));
      const timeline=ev.filter(e=>e.minute!=null&&(e.event_type==="substitution"||e.event_type==="red_card"))
        .map(e=>({e,t:elapsed(e)})).filter(x=>x.t!=null)
        .sort((a,b)=>a.t-b.t||String(a.e.created_at||"").localeCompare(String(b.e.created_at||"")));
      let cursor=0;
      for(const {e,t} of timeline){
        const at=Math.max(cursor,Math.min(end,t));
        const delta=at-cursor;
        active.forEach(id=>durations.set(id,(durations.get(id)||0)+delta));
        if(e.event_type==="substitution"){
          if(e.player_id!=null)active.delete(key(e.player_id));
          if(e.secondary_player_id!=null){
            const id=key(e.secondary_player_id);
            if(!active.has(id)){active.add(id);played.add(id);}
            if(!durations.has(id))durations.set(id,0);
            ensure(e.secondary_player_id);
          }
        }else if(e.player_id!=null)active.delete(key(e.player_id));
        cursor=at;
      }
      active.forEach(id=>durations.set(id,(durations.get(id)||0)+Math.max(0,end-cursor)));
      // Il tabellone (titolari, cambi, rossi, fine tempi) è autorevole.
      // minutes_played del DB non sovrascrive mai il tempo derivato.
      participants.forEach((p,pid)=>{
        const minutes=Math.max(0,Math.round(durations.get(pid)||0));
        if(minutes>0||p.started)played.add(pid);
        const stat=ensure(p.player_id);
        if(played.has(pid)){stat.appearances++;stat.minutes+=minutes;}
        if(p.started)stat.starts++;
      });
      // Entrati nei cambi ma non ancora riconciliati in app_match_players.
      played.forEach(pid=>{
        if(participants.has(pid))return;
        const stat=stats.get(pid);
        if(stat){stat.appearances++;stat.minutes+=Math.max(0,Math.round(durations.get(pid)||0));}
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