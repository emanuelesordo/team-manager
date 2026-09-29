import React from'react';
import{Navigate,Route,Routes}from'react-router-dom';
import{useTeamData}from'./lib/data.js';
import Layout from'./components/Layout.jsx';
import Home from'./pages/Home.jsx';
import CalendarPage from'./pages/Calendar.jsx';
import Roster from'./pages/Roster.jsx';
import Matches from'./pages/Matches.jsx';
import MatchDetail from'./pages/MatchDetail.jsx';
import Stats from'./pages/Stats.jsx';
import Profile from'./pages/Profile.jsx';
import Admin from'./pages/Admin.jsx';
export default function App(){const d=useTeamData();return <Layout d={d}>{d.loading?<div className="loader"><b>TEAM MANAGER</b><span>Caricamento…</span></div>:<Routes><Route path="/" element={<Home d={d}/>}/><Route path="/calendario" element={<CalendarPage d={d}/>}/><Route path="/rosa" element={<Roster d={d}/>}/><Route path="/partite" element={<Matches d={d}/>}/><Route path="/partite/:id" element={<MatchDetail d={d}/>}/><Route path="/statistiche" element={<Stats d={d}/>}/><Route path="/profilo" element={<Profile d={d}/>}/><Route path="/admin" element={<Admin d={d}/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes>}</Layout>}