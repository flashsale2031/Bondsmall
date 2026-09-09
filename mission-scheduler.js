/* Bonds Mall Priority Mission Scheduler
 * Improvement 7: priority queues and bounded concurrency for efficient campaign execution.
 */
(function(){'use strict';
 const LIMIT=2;let running=0;const queue=[];const priority={P0:0,P1:1,P2:2,P3:3,P4:4};
 function add(task){const t=Object.assign({id:'TASK-'+Date.now().toString(36),priority:'P2',createdAt:new Date().toISOString()},task);queue.push(t);queue.sort((a,b)=>(priority[a.priority]??2)-(priority[b.priority]??2)||Date.parse(a.createdAt)-Date.parse(b.createdAt));drain();return t;}
 async function drain(){while(running<LIMIT&&queue.length){const t=queue.shift();running++;try{if(typeof t.run==='function')await t.run(t);}catch(error){window.dispatchEvent(new CustomEvent('bonds:mission-scheduler-error',{detail:{task:t,error:String(error)}}));}finally{running--;window.dispatchEvent(new CustomEvent('bonds:mission-scheduler-state',{detail:{running,queued:queue.length}}));}}}
 function pending(){return queue.map(t=>Object.assign({},t,{run:undefined}));}
 window.BondsMallMissionScheduler={add,drain,pending,priority,concurrency:LIMIT};
})();
