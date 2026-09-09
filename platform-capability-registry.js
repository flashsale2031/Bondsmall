/* Bonds Mall Platform Capability Registry
 * Establishes the allowed operating mode for every marketplace before a job may execute.
 * Fail-closed: unknown or disabled platforms cannot post.
 */
(function(){'use strict';
 const KEY='bondsMallPlatformCapabilities';
 const PLATFORMS=['Craigslist','AdLandPro','ClassifiedAds','Facebook Marketplace','OfferUp','Mercari','Poshmark','Nextdoor','eBay','Etsy'];
 const DEFAULTS={
  Craigslist:{mode:'HUMAN_ASSISTED',guest:true,automation:false,verification:['email','possible-phone']},
  AdLandPro:{mode:'HUMAN_ASSISTED',guest:'unknown',automation:false,verification:['platform']},
  ClassifiedAds:{mode:'HUMAN_ASSISTED',guest:'unknown',automation:false,verification:['platform']},
  'Facebook Marketplace':{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['account']},
  OfferUp:{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['account']},
  Mercari:{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['account']},
  Poshmark:{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['account']},
  Nextdoor:{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['account']},
  eBay:{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['account']},
  Etsy:{mode:'ACCOUNT_REQUIRED',guest:false,automation:false,verification:['seller-registration']}
 };
 let records={};
 function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');if(v&&typeof v==='object')records=v;}catch(_){} PLATFORMS.forEach(p=>{records[p]=Object.assign({platform:p,enabled:true,policyVersion:'1.0',updatedAt:new Date().toISOString()},DEFAULTS[p],records[p]||{});});save(false);return list();}
 function save(emit){try{localStorage.setItem(KEY,JSON.stringify(records));}catch(_){}if(emit)window.dispatchEvent(new CustomEvent('bonds:platform-capability-changed',{detail:list()}));}
 function configure(platform,patch){if(!PLATFORMS.includes(platform))throw new Error('Unknown platform: '+platform);records[platform]=Object.assign({},records[platform],patch,{platform,updatedAt:new Date().toISOString()});save(true);return get(platform);}
 function get(platform){return records[platform]?JSON.parse(JSON.stringify(records[platform])):null;}
 function authorize(platform,requestedMode){const r=get(platform);if(!r||r.enabled===false)return{ok:false,code:'PLATFORM_DISABLED'};const mode=requestedMode||r.mode;if(mode==='AUTOMATED'&&!r.automation)return{ok:false,code:'AUTOMATION_NOT_AUTHORIZED',message:'Automation is not authorized for '+platform};if(mode==='GUEST'&&!r.guest)return{ok:false,code:'GUEST_NOT_SUPPORTED'};if(mode==='HUMAN_ASSISTED'&&r.mode==='ACCOUNT_REQUIRED')return{ok:false,code:'ACCOUNT_REQUIRED'};return{ok:true,platform,mode,policyVersion:r.policyVersion,verification:r.verification||[]};}
 function list(){return JSON.parse(JSON.stringify(records));}
 window.BondsMallPlatformCapabilities={platforms:PLATFORMS,load,get,list,configure,authorize};load();
})();
