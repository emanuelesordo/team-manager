/* Fonte unica per schede giocatore, Rosa e Statistiche.
   Conteggi basati esclusivamente sulle partite concluse della stagione. */
window.TeamSeasonStats=(()=>{
  const key=v=>String(v??"");
  const finite=v=>v!==null&&v!==""&&Number.isFinite(Number(v));
  const empty=id=>({player_id:id,appearances:0,starts:0,minutes:0,minutes_played:0,goals:0,assists:0,yellow_cards:0,blue_cards:0,red_cards:0,disciplinary_cards:0,sub_in:0,sub_out:0,expulsions:0,goal_first_half:0,goal_second_half:0,avg_rating:null,rated_matches:0,last_ratings:[]});
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
        if(e.event_type==="substitution"){
          if(e.player_id!=null)ensure(e.player_id).sub_out++;
          if(e.secondary_player_id!=null)ensure(e.secondary_player_id).sub_in++;
        }
        if(e.event_type==="red_card"&&e.player_id!=null)ensure(e.player_id).expulsions++;
        if(e.event_type==="goal"&&e.player_id!=null)
          ensure(e.player_id)[getPeriod(e)==="second_half"?"goal_second_half":"goal_first_half"]++;
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
  function summarizeTeam({matches=[],events=[],players=[],playerStats=[],competitions=[]}={}){
    const valid=matches.filter(m=>m.status==="finished").sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at));
    const matchIds=new Set(valid.map(m=>key(m.id)));
    const records=events.filter(e=>matchIds.has(key(e.match_id))&&e.validation_status!=="rejected");
    const totals={played:valid.length,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,cleanSheets:0,
      yellows:0,blues:0,reds:0,assists:0,substitutions:0,goalsByPeriod:[0,0],concededByPeriod:[0,0],
      goalIntervals:[0,0,0,0],home:{played:0,goals:0,conceded:0},away:{played:0,goals:0,conceded:0},matches:[],players:[]};
    const byPlayer=new Map(playerStats.map(p=>[key(p.player_id??p.id),p]));
    totals.players=players.map(p=>({...p,...(byPlayer.get(key(p.id))||{})}));
    valid.forEach(m=>{
      const ev=records.filter(e=>key(e.match_id)===key(m.id));
      const gfEvents=ev.filter(e=>e.event_type==="goal"&&e.team_side==="team");
      const gaEvents=ev.filter(e=>e.event_type==="goal"&&e.team_side==="opponent");
      const hasGoalEvents=gfEvents.length+gaEvents.length>0;
      const isHome=m.home_away==="home";
      const fallbackFor=Number(isHome?m.home_score:m.away_score);
      const fallbackAgainst=Number(isHome?m.away_score:m.home_score);
      const gf=hasGoalEvents?gfEvents.length:(Number.isFinite(fallbackFor)?fallbackFor:0);
      const ga=hasGoalEvents?gaEvents.length:(Number.isFinite(fallbackAgainst)?fallbackAgainst:0);
      const periodMinutes=Number(competitions.find(c=>key(c.id)===key(m.competition_id))?.minutes_per_period)||45;
      const period=e=>e.payload?.period==="second_half"?"second_half":e.payload?.period==="first_half"?"first_half":Number(e.minute)>periodMinutes?"second_half":"first_half";
      gfEvents.forEach(e=>{const second=period(e)==="second_half";totals.goalsByPeriod[second?1:0]++;totals.goalIntervals[(second?2:0)+(Number(e.minute)>periodMinutes/2?1:0)]++;});
      gaEvents.forEach(e=>totals.concededByPeriod[period(e)==="second_half"?1:0]++);
      totals.yellows+=ev.filter(e=>e.event_type==="yellow_card"&&e.team_side==="team").length;
      totals.blues+=ev.filter(e=>e.event_type==="blue_card"&&e.team_side==="team").length;
      totals.reds+=ev.filter(e=>e.event_type==="red_card"&&e.team_side==="team").length;
      totals.substitutions+=ev.filter(e=>e.event_type==="substitution"&&e.team_side==="team").length;
      totals.assists+=gfEvents.filter(e=>e.secondary_player_id!=null).length;
      totals.goalsFor+=gf;totals.goalsAgainst+=ga;
      if(gf>ga)totals.wins++;else if(gf<ga)totals.losses++;else totals.draws++;
      if(ga===0)totals.cleanSheets++;
      const side=isHome?totals.home:totals.away;side.played++;side.goals+=gf;side.conceded+=ga;
      totals.matches.push({id:m.id,kickoff_at:m.kickoff_at,opponent_id:m.opponent_id,competition_id:m.competition_id,home_away:m.home_away,
        goals:gf,conceded:ga,result:gf>ga?"W":gf<ga?"L":"D",source:hasGoalEvents?"tabellino":"risultato"});
    });
    return totals;
  }

  // Cronologia unificata. I minuti del 2T includono il recupero del 1T
  // soltanto nell'asse dei tempi, non nella visualizzazione del minuto.
  function analyzeMatch({match,matchPlayers=[],events=[],ratings=[],competitions=[]}={}){
    const competition=competitions.find(c=>key(c.id)===key(match.competition_id))||{};
    const half=Number(competition.minutes_per_period)||45;
    const blueDuration=Number(competition.discipline_rules?.blue_card_minutes??competition.discipline_rules?.blue_minutes) || 8;
    const records=events.filter(e=>key(e.match_id)===key(match.id)&&e.validation_status!=="rejected");
    const phase=e=>e.payload?.period==="second_half"?"second_half":e.payload?.period==="first_half"?"first_half":Number(e.minute)>half?"second_half":"first_half";
    const recovery=part=>{
      const found=records.filter(e=>e.event_type==="period_end"&&e.payload?.period===part).at(-1);
      if(found)return Math.max(0,Number(found.payload?.recovery_minutes??found.stoppage_minute)||0);
      return Math.max(0,...records.filter(e=>e.minute!=null&&phase(e)===part).map(e=>Math.max(0,Number(e.minute)-half,Number(e.stoppage_minute)||0)));
    };
    const rec1=recovery("first_half"),rec2=recovery("second_half");
    const end=2*half+rec1+rec2;
    const time=e=>{
      if(!finite(e.minute))return null;
      const value=Math.max(0,Number(e.minute)),stoppage=Math.max(0,Number(e.stoppage_minute)||0);
      return Math.max(0,Math.min(end,(phase(e)==="second_half"?half+rec1:0)+value+(value>=half?stoppage:0)));
    };
    const roster=matchPlayers.filter(p=>key(p.match_id)===key(match.id));
    const starts=new Set(roster.filter(p=>p.started).map(p=>key(p.player_id)));
    const field=new Set(starts),touch=new Set(starts),suspended=new Set(),redOwn=new Set();
    const minutes=new Map(),impact=new Map(),goalSplit=new Map();
    const ownTotals={for:0,against:0};
    const team={match_id:match.id,minutesEnd:end,firstHalfRecovery:rec1,secondHalfRecovery:rec2,
      goalsStarters:0,goalsSubs:0,extraGoalsFor:[0,0],extraGoalsAgainst:[0,0],
      scoredWhile:{leading:0,drawing:0,trailing:0},concededWhile:{leading:0,drawing:0,trailing:0},
      goalsForNumerical:{superior:0,equal:0,inferior:0},goalsAgainstNumerical:{superior:0,equal:0,inferior:0},
      timeByScore:{leading:0,drawing:0,trailing:0},timeByNumbers:{superior:0,equal:0,inferior:0},
      remontadaFor:false,remontadaAgainst:false,comebackWin:false,comebackLoss:false,
      ratingWeighted:null,ratingMinutes:0,goalsKnown:0,unknownTimedEvents:0};
    const line=records.map((e,i)=>({e,t:time(e),i})).filter(x=>x.t!=null&&x.e.event_type!=="period_end").sort((a,b)=>a.t-b.t||a.i-b.i);
    let ownOut=0,oppOut=0,everBehind=false,everAhead=false,recovered=false,lostLead=false,cursor=0;
    const gap=()=>ownTotals.for-ownTotals.against;
    const scoreStatus=()=>gap()>0?"leading":gap()<0?"trailing":"drawing";
    const countStatus=()=>oppOut>ownOut?"superior":oppOut<ownOut?"inferior":"equal";
    const ensureImpact=id=>{
      const k=key(id);
      if(!impact.has(k))impact.set(k,{minutes:0,goalsFor:0,goalsAgainst:0,plusMinus:0,goalsAsStarter:0,goalsAsSub:0});
      return impact.get(k);
    };
    starts.forEach(id=>{minutes.set(id,0);ensureImpact(id)});
    const addTime=until=>{
      const delta=Math.max(0,until-cursor);
      field.forEach(id=>{minutes.set(id,(minutes.get(id)||0)+delta);ensureImpact(id).minutes+=delta;});
      team.timeByScore[scoreStatus()]+=delta;
      team.timeByNumbers[countStatus()]+=delta;
      cursor=until;
    };
    // Opponent blue cards may have no registered player ID: use the event ID as identity.
    const oppBlue=new Map(),ownBlue=new Map();
    const clearOwnBlue=id=>{if(ownBlue.has(id)){ownBlue.delete(id);ownOut=Math.max(0,ownOut-1);}suspended.delete(id)};
    const clearOppBlue=id=>{if(oppBlue.has(id)){oppBlue.delete(id);oppOut=Math.max(0,oppOut-1);}};
    const returnEvent=e=>e.event_type==="blue_return"||e.event_type==="temporary_return"||e.event_type==="return_from_blue";
    // Blu: si conclude dopo 8' di gioco effettivo, ma il rientro
    // del giocatore deve essere registrato. Nessun rientro implicito.
    for(const {e,t} of line){
      addTime(Math.max(cursor,t));
      const side=e.team_side==="opponent"?"opponent":"team";
      const pid=e.player_id==null?null:key(e.player_id);
      if(e.event_type==="goal"){
        const forUs=side==="team",from=scoreStatus(),numeric=countStatus();
        const goalType=String(e.payload?.goal_type||"");
        const periodIndex=phase(e)==="second_half"?1:0;
        const within=Number(e.minute),added=within>half||Number(e.stoppage_minute)>0&&within>=half;
        if(forUs){
          team.scoredWhile[from]++;team.goalsForNumerical[numeric]++;
          if(pid){const goal=goalSplit.get(pid)||{starter:0,sub:0};goal[starts.has(pid)?"starter":"sub"]++;goalSplit.set(pid,goal);}
          if(pid&&goalType!=="own_goal")team[starts.has(pid)?"goalsStarters":"goalsSubs"]++;
          field.forEach(id=>{ensureImpact(id).goalsFor++;ensureImpact(id).plusMinus++;});
          ownTotals.for++;
          if(everBehind&&gap()>=0)recovered=true;
        }else{
          team.concededWhile[from]++;team.goalsAgainstNumerical[numeric]++;
          field.forEach(id=>{ensureImpact(id).goalsAgainst++;ensureImpact(id).plusMinus--;});
          ownTotals.against++;
          if(everAhead&&gap()<=0)lostLead=true;
        }
        if(added)team[forUs?"extraGoalsFor":"extraGoalsAgainst"][periodIndex]++;
        team.goalsKnown++;
        if(gap()<0)everBehind=true;
        if(gap()>0)everAhead=true;
      }else if(e.event_type==="substitution"&&side==="team"){
        if(pid){field.delete(pid);if(ownBlue.has(pid))clearOwnBlue(pid);}
        if(e.secondary_player_id!=null){
          const incoming=key(e.secondary_player_id);
          if(suspended.has(incoming))clearOwnBlue(incoming);
          field.add(incoming);touch.add(incoming);ensureImpact(incoming);
        }
      }else if(e.event_type==="red_card"){
        if(side==="team"){if(pid){field.delete(pid);if(ownBlue.has(pid))clearOwnBlue(pid);if(!redOwn.has(pid)){redOwn.add(pid);ownOut++;}}else ownOut++;}
        else oppOut++;
      }else if(e.event_type==="blue_card"){
        if(side==="team"&&pid&&!ownBlue.has(pid)){field.delete(pid);suspended.add(pid);ownBlue.set(pid,t+blueDuration);ownOut++;}
        if(side==="opponent"){const ident=pid||key(e.payload?.opponent_shirt_number??e.id??("blue-"+t));if(!oppBlue.has(ident)){oppBlue.set(ident,t+blueDuration);oppOut++;}}
      }else if(returnEvent(e)){
        if(side==="team"&&pid&&ownBlue.has(pid)&&t>=ownBlue.get(pid)){clearOwnBlue(pid);field.add(pid);touch.add(pid);ensureImpact(pid);}
        if(side==="opponent"){const ident=pid||key(e.payload?.opponent_shirt_number);if(oppBlue.has(ident)&&t>=oppBlue.get(ident))clearOppBlue(ident);}
      }
    }
    addTime(end);
    team.remontadaFor=recovered;team.remontadaAgainst=lostLead;
    team.comebackWin=everBehind&&recovered&&gap()>0;
    team.comebackLoss=everAhead&&lostLead&&gap()<0;
    team.unknownTimedEvents=records.filter(e=>e.minute==null&&e.event_type!=="period_end").length;
    const votes=new Map();
    ratings.filter(r=>key(r.match_id)===key(match.id)&&finite(r.rating)&&Number(r.rating)>=1&&Number(r.rating)<=10).forEach(r=>{
      const id=key(r.player_id);if(!votes.has(id))votes.set(id,[]);votes.get(id).push(Number(r.rating));
    });
    let weighted=0,weights=0;
    votes.forEach((v,id)=>{const mins=minutes.get(id)||0;if(mins>0){weighted+=mins*v.reduce((a,b)=>a+b,0)/v.length;weights+=mins;}});
    team.ratingWeighted=weights?weighted/weights:null;team.ratingMinutes=weights;
    touch.forEach(id=>ensureImpact(id));
    return {team,minutes,impact,goalSplit,starts,touch,score:ownTotals};
  }
  return {aggregate,summarizeTeam,analyzeMatch};
})();