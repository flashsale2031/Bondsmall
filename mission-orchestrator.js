/* Bonds Mall Mission Orchestrator
 * Improvement 1: one authoritative controller for mission -> jobs -> verification -> Active Ads.
 */
(function () {
  'use strict';
  const KEY = 'bondsMallMissionOrchestrator';
  const state = { id: '', status: 'idle', mission: '', createdAt: null, updatedAt: null, requirements: {}, metrics: {}, lastError: '' };
  const now = () => new Date().toISOString();
  function persist(){ state.updatedAt=now(); try{localStorage.setItem(KEY, JSON.stringify(state));}catch(_){} }
  function load(){ try{ const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(saved) Object.assign(state,saved); }catch(_){} return getState(); }
  function start(mission){ state.id='MISSION-'+Date.now().toString(36).toUpperCase(); state.status='running'; state.mission=String(mission||'').trim(); state.createdAt=now(); state.lastError=''; state.metrics={jobsCreated:0,jobsPublished:0,jobsFailed:0,jobsQueued:0}; persist(); emit('mission.started'); return getState(); }
  function update(patch){ Object.assign(state,patch||{}); persist(); emit('mission.updated'); return getState(); }
  function fail(error){ state.status='failed'; state.lastError=String(error||'Mission failed'); persist(); emit('mission.failed'); return getState(); }
  function complete(){ state.status='complete'; persist(); emit('mission.completed'); return getState(); }
  function emit(type,detail){ window.dispatchEvent(new CustomEvent('bonds:mission-orchestrator',{detail:{type,mission:getState(),detail:detail||null}})); }
  function getState(){ return JSON.parse(JSON.stringify(state)); }
  window.BondsMallMissionOrchestrator={start,load,update,fail,complete,getState,persist};
  load();
})();
