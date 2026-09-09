/* Bonds Mall Mission Event Ledger — append-only, tamper-evident mission audit trail. */
(function(){'use strict';
 const KEY='bondsMallMissionEventLedger',MAX=10000;let events=[];const now=()=>new Date().toISOString();
 function clone(v){return JSON.parse(JSON.stringify(v));}
 function digest(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return('00000000'+(h>>>0).toString(16)).slice(-8);}
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');events=Array.isArray(v)?v:[];}catch(_){events=[];}return list();}
 function append(type,payload){const previous=events.length?events[events.length-1].hash:'GENESIS';const base={id:'EVT-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6),type,at:now(),previousHash:previous,payload:payload||{}};const event=Object.assign(base,{hash:digest(JSON.stringify(base))});events.push(event);if(events.length>MAX)events=events.slice(-MAX);try{localStorage.setItem(KEY,JSON.stringify(events));}catch(_){}window.dispatchEvent(new CustomEvent('bonds:mission-event',{detail:clone(event)}));return clone(event);}
 function verify(){let previous='GENESIS';for(const e of events){const copy={id:e.id,type:e.type,at:e.at,previousHash:e.previousHash,payload:e.payload};if(e.previousHash!==previous||e.hash!==digest(JSON.stringify(copy)))return{valid:false,eventId:e.id};previous=e.hash;}return{valid:true,count:events.length};}
 function list(filter){return clone(filter?events.filter(e=>e.type===filter):events);}
 function exportJson(){return JSON.stringify(list(),null,2);}
 function clear(){events=[];try{localStorage.removeItem(KEY);}catch(_){}window.dispatchEvent(new CustomEvent('bonds:mission-event-ledger-cleared'));}
 ['bonds:mission-orchestrator','bonds:mission-job','bonds:quality-gate','bonds:ad-health-result','bonds:resubmission-queue-request','bonds:active-ads-updated','bonds:posting-safety-state','bonds:posting-emergency-stop'].forEach(name=>window.addEventListener(name,e=>append(name,e.detail)));
 window.BondsMallMissionEventLedger={load,append,list,exportJson,verify,clear};load();
})();
