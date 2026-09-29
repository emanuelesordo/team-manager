import{useCallback,useEffect,useState}from'react';
import{supabase}from'./supabase.js';

export const TEAM_ID='d0c3210b-6a8a-4a1b-93c8-e2400029006e';

const empty={
  loading:true,error:null,session:null,role:null,
  matches:[],players:[],roster:[],opponents:[],competitions:[],seasons:[],
  scores:[],stats:[],ratings:[],events:[],profiles:[],userRoles:[],settings:{},
  competitionFixtures:[],standings:[]
};

function timeout(ms){
  return new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timeout caricamento dati')),ms));
}

export function useTeamData(){
  const[data,setData]=useState(empty);
  const[version,setVersion]=useState(0);
  const refresh=useCallback(()=>setVersion(v=>v+1),[]);

  useEffect(()=>{
    let active=true;

    async function load(){
      setData(prev=>({...prev,loading:true,error:null}));

      try{
        const job=(async()=>{
          const{data:{session},error:sessionError}=await supabase.auth.getSession();
          if(sessionError)throw sessionError;

          let role=null;
          if(session){
            const r=await supabase.from('app_user_roles').select('role').eq('user_id',session.user.id).maybeSingle();
            if(r.error)throw r.error;
            role=r.data?.role||'fan';
          }

          const results=await Promise.all([
            supabase.from('players').select('id,team_id,first_name,last_name,birth_date,preferred_foot,photo_url,nationality_code,generic_role_manual,height_cm').eq('team_id',TEAM_ID).order('last_name'),
            supabase.from('app_seasons').select('*').eq('team_id',TEAM_ID).order('start_date',{ascending:false}),
            supabase.from('app_competitions').select('*').order('name'),
            supabase.from('app_opponents').select('*').order('name'),
            supabase.from('app_matches').select('*').order('kickoff_at',{ascending:true}),
            supabase.from('app_match_score').select('*'),
            supabase.from('app_settings').select('*').eq('id',true).maybeSingle(),
            supabase.from('app_match_events').select('*').order('minute',{ascending:true}),
            supabase.from('app_match_ratings').select('*'),
            supabase.from('app_roster').select('*'),
            supabase.from('app_competition_fixtures').select('*').order('kickoff_at',{ascending:true}),
            supabase.from('app_competition_standings').select('*')
          ]);

          const [players,seasons,competitions,opponents,matches,scores,settings,events,ratings,roster,competitionFixtures,standings]=results;
          const firstError=results.find(x=>x.error)?.error;
          if(firstError)throw firstError;

          const season=(seasons.data||[]).find(x=>x.status==='active')||(seasons.data||[])[0]||null;
          const stats=season
            ?await supabase.from('app_player_season_stats').select('*').eq('season_id',season.id)
            :{data:[],error:null};

          if(stats.error)throw stats.error;

          let profiles=[],userRoles=[];
          if(session&&role==='admin'){
            const[p,ur]=await Promise.all([
              supabase.from('profiles').select('id,username,display_name,is_active').order('display_name'),
              supabase.from('app_user_roles').select('*')
            ]);
            if(p.error)throw p.error;
            if(ur.error)throw ur.error;
            profiles=p.data||[];
            userRoles=ur.data||[];
          }

          return{
            loading:false,error:null,session,role,
            players:players.data||[],seasons:seasons.data||[],
            competitions:competitions.data||[],opponents:opponents.data||[],
            matches:matches.data||[],scores:scores.data||[],
            settings:settings.data||{},events:events.data||[],
            ratings:ratings.data||[],roster:roster.data||[],
            competitionFixtures:competitionFixtures.data||[],standings:standings.data||[],
            stats:stats.data||[],profiles,userRoles
          };
        })();

        const next=await Promise.race([job,timeout(12000)]);
        if(active)setData(next);
      }catch(err){
        if(active)setData(prev=>({...prev,loading:false,error:err?.message||'Errore caricamento dati'}));
      }
    }

    load();
    return()=>{active=false};
  },[version]);

  return{
    ...data,
    refresh,
    season:data.seasons.find(x=>x.status==='active')||data.seasons[0]||null
  };
}
