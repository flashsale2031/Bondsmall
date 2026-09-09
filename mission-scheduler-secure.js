/* Bonds Mall Secure Mission Scheduler
 * Drop-in scheduler that supersedes mission-scheduler.js when loaded after it.
 */
(function(){'use strict';
 const LIMIT=2;let running=0,paused=false;const queue=[];const priority={P0:0,P1:1,P2:2,P3:3,P4:4};
 function sort(){queue.sort((a,b)=>(priority[a.priority]??2)-(priority[b.priority]??2)||Date.parse(a.createdAt)-Date.parse(b.createdAt));}
 function add(task){const t=Object.assign({id:'TASK-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),priority:'P2',createdAt:new Date().toISOString(),status:'queued'},task);if(queue.some(x=>x.id===t.id))return t;queue.push(t);sort();emit();drain();return t;}
 async function drain(){if(paused)return;while(running<LIMIT&&queue.length&&!paused){const t=queue.shift();running++;t.status='processing';emit();try{if(typeof t.run==='function')await t.run(t);t.status='complete';}catch(e){t.status='failed';t.error=String(e);window.dispatchEvent(new CustomEvent('bonds:mission-scheduler-error',{detail:{task:t,error:t.error}}));}finally{running--;emit();}}}
 function pause(reason){paused=true;window.dispatchEvent(new CustomEvent('bonds:mission-scheduler-paused',{detail:{reason:reason||'paused'}}));emit();}
 function resume(){paused=false;emit();drain();}
 function cancel(id){const i=queue.findIndex(x=>x.id===id);if(i<0)return false;const t=queue.splice(i,1)[0];t.status='cancelled';window.dispatchEvent(new CustomEvent('bonds:mission-scheduler-cancelled',{detail:{task:t}}));emit();return true;}
 function emit(){window.dispatchEvent(new CustomEvent('bonds:mission-scheduler-state',{detail:{running,queued:queue.length,paused}}));}
 function pending(){return queue.map(t=>{const x=Object.assign({},t);delete x.run;return x;});}
 window.BondsMallMissionScheduler={add,drain,pause,resume,cancel,pending,priority,concurrency:LIMIT,getState:()=>({running,queued:queue.length,paused})};
})();
