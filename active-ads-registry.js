/* Bonds Mall Active Ads Registry
 * Improvement 5: one canonical verified advertisement registry for Seller, Market, AnalyticsFlow and Resubmission.
 */
(function(){'use strict';
 const KEY='bondsMallActiveAdsRegistry';let ads=[];const now=()=>new Date().toISOString();
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');ads=Array.isArray(v)?v:[];}catch(_){ads=[];}return list();}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(ads));}catch(_){}window.dispatchEvent(new CustomEvent('bonds:active-ads-updated',{detail:list()}));}
 function upsert(ad){if(!ad||!/^https?:\/\//i.test(String(ad.liveUrl||'')))return null;const id=ad.id||('AD-'+Date.now().toString(36).toUpperCase());const existing=ads.find(x=>x.id===id);const record=Object.assign(existing||{id,createdAt:now()},ad,{liveUrl:String(ad.liveUrl).trim(),updatedAt:now(),status:'live'});if(existing)Object.assign(existing,record);else ads.push(record);save();return JSON.parse(JSON.stringify(record));}
 function mark(id,status,extra){const a=ads.find(x=>x.id===id);if(!a)return null;Object.assign(a,extra||{},{status,updatedAt:now()});save();return JSON.parse(JSON.stringify(a));}
 function remove(id){ads=ads.filter(a=>a.id!==id);save();}
 function list(){return JSON.parse(JSON.stringify(ads));}
 window.BondsMallActiveAdsRegistry={load,upsert,mark,remove,list};load();
})();
