/* Bonds Mall Mission Event Ledger
 * Improvement 10: durable chronological audit trail for mission and advertisement events.
 */
(function(){'use strict';
 const KEY='bondsMallMissionEventLedger';let events=[];const now=()=>new Date().toISOString();
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');events=Array.isArray(v)?v:[];}catch(_){events=[];}return list();}
 function append(type,payload){const event={id:'EVT-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6),type,at:now(),payload:payload||{}};events.push(event);if(events.length>5000)events=events.slice(-5000);try{localStorage.setItem(KEY,JSON.stringify(events));}catch(_){}window.dispatchEvent(new CustomEvent('bonds:mission-event',{detail:event}));return JSON.parse(JSON.stringify(event));}
 function list(filter){return JSON.parse(JSON.stringify(filter?events.filter(e=>e.type===filter):events));}
 function exportJson(){return JSON.stringify(list(),null,2);}
 function clear(){events=[];try{localStorage.removeItem(KEY);}catch(_){}window.dispatchEvent(new CustomEvent('bonds:mission-event-ledger-cleared'));}
 ['bonds:mission-orchestrator','bonds:mission-job','bonds:quality-gate','bonds:ad-health-result','bonds:resubmission-queue-request','bonds:active-ads-updated'].forEach(name=>window.addEventListener(name,e=>append(name,e.detail)));
 window.BondsMallMissionEventLedger={load,append,list,exportJson,clear};load();
})();
