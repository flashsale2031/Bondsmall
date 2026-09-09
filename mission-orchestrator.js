/* Bonds Mall Mission Orchestrator — high-assurance mission lifecycle. */
(function(){'use strict';
 const KEY='bondsMallMissionOrchestrator', VERSION='2.0';
 const state={id:'',status:'idle',mission:'',createdAt:null,updatedAt:null,requirements:{},metrics:{},lastError:'',policyVersion:VERSION,checkpoints:[]};
 const now=()=>new Date().toISOString();
 function clone(v){return JSON.parse(JSON.stringify(v));}
 function persist(){state.updatedAt=now();try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){} }
 function emit(type,detail){window.dispatchEvent(new CustomEvent('bonds:mission-orchestrator',{detail:{type,mission:clone(state),detail:detail||null}}));}
 function checkpoint(name,status,detail){state.checkpoints.push({name,status,at:now(),detail:detail||null});if(state.checkpoints.length>200)state.checkpoints=state.checkpoints.slice(-200);persist();emit('mission.checkpoint',{name,status,detail});}
 function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)Object.assign(state,saved);}catch(_){}return getState();}
 function start(mission,requirements){state.id='MISSION-'+Date.now().toString(36).toUpperCase();state.status='running';state.mission=String(mission||'').trim();state.createdAt=now();state.lastError='';state.requirements=requirements||{};state.metrics={jobsCreated:0,jobsAuthorized:0,jobsPublished:0,jobsFailed:0,jobsQueued:0,jobsHumanRequired:0,jobsResubmitted:0};state.checkpoints=[];persist();checkpoint('mission-authorization','passed');emit('mission.started');return getState();}
 function update(patch){Object.assign(state,patch||{});persist();emit('mission.updated');return getState();}
 function pause(reason){state.status='paused';state.lastError=String(reason||'Paused');persist();checkpoint('mission-pause','passed',state.lastError);emit('mission.paused');return getState();}
 function fail(error){state.status='failed';state.lastError=String(error||'Mission failed');persist();checkpoint('mission-failure','failed',state.lastError);emit('mission.failed');return getState();}
 function recover(detail){state.status='recovering';state.lastError='';persist();checkpoint('mission-recovery','started',detail);emit('mission.recovery-started',detail);return getState();}
 function complete(){state.status='complete';persist();checkpoint('mission-completion','passed');emit('mission.completed');return getState();}
 function getState(){return clone(state);}
 window.BondsMallMissionOrchestrator={start,load,update,pause,fail,recover,complete,getState,persist,checkpoint,version:VERSION};load();
})();
