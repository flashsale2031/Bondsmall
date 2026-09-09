/* Bonds Mall Seller Browser Account Profiles
 * Account 1 -> Firefox
 * Account 2 -> Samsung Internet
 * Account 3 -> Chrome
 * Account 4 -> Opera
 * Account 5 -> Safari
 * Account 6 -> Brave Browser
 * Account 7 -> Internet Explorer
 * Account 8 -> Edge
 * Account 9 -> Tor
 * Account 10 -> Dolphin
 *
 * This is an emulator profile selector, not a browser-fingerprint or anti-bot
 * spoofing layer. Credentials, CAPTCHA/MFA, consent, and final submissions stay
 * human-controlled. Browser binaries/engines must actually be installed by the
 * emulator host if native execution is requested; unsupported mobile/legacy
 * browsers fall back to the emulator browser shell while preserving the
 * selected account profile and session identity.
 */
(function(root){'use strict';
 const KEY='bondsMallSellerBrowserAccounts';
 const PROFILES=[
  {accountNumber:1,browserType:'Firefox',engine:'Gecko',nativeCandidates:['org.mozilla.firefox']},
  {accountNumber:2,browserType:'Samsung Internet',engine:'Chromium',nativeCandidates:['com.sec.android.app.sbrowser']},
  {accountNumber:3,browserType:'Chrome',engine:'Chromium',nativeCandidates:['com.android.chrome']},
  {accountNumber:4,browserType:'Opera',engine:'Chromium',nativeCandidates:['com.opera.browser','com.opera.mini.native']},
  {accountNumber:5,browserType:'Safari',engine:'WebKit',nativeCandidates:[],note:'Safari is not an Android browser; use a WebKit-capable iOS/macOS emulator when native Safari is required.'},
  {accountNumber:6,browserType:'Brave Browser',engine:'Chromium',nativeCandidates:['com.brave.browser']},
  {accountNumber:7,browserType:'Internet Explorer',engine:'Trident',nativeCandidates:[],note:'Internet Explorer is not available as a current Android browser; use a Windows emulator for native IE.'},
  {accountNumber:8,browserType:'Edge',engine:'Chromium',nativeCandidates:['com.microsoft.emmx']},
  {accountNumber:9,browserType:'Tor',engine:'Gecko',nativeCandidates:['org.torproject.torbrowser']},
  {accountNumber:10,browserType:'Dolphin',engine:'Dolphin',nativeCandidates:['mobi.mgeek.TunnyBrowser']}
 ];
 let selected=1;
 function profile(accountNumber){const n=Number(accountNumber);return PROFILES.find(p=>p.accountNumber===n)||null;}
 function load(){try{const saved=Number(localStorage.getItem(KEY));if(profile(saved))selected=saved;}catch(_){}return get();}
 function save(){try{localStorage.setItem(KEY,String(selected));}catch(_){};return get();}
 function select(accountNumber){const p=profile(accountNumber);if(!p)throw new Error('Browser account must be 1 through 10.');selected=p.accountNumber;const result=save();root.dispatchEvent(new CustomEvent('bonds:seller-browser-account-selected',{detail:result}));return result;}
 function get(){const p=profile(selected);return Object.assign({},p,{accountNumber:selected});}
 function list(){return PROFILES.map(p=>Object.assign({},p));}
 function render(container){const el=typeof container==='string'?document.querySelector(container):container;if(!el)return null;el.innerHTML='';const wrap=document.createElement('div');wrap.className='bonds-seller-browser-account-control';wrap.innerHTML='<label for="bonds-seller-browser-account"><strong>Seller Browser Account</strong></label><select id="bonds-seller-browser-account" aria-label="Seller browser account"></select><span id="bonds-seller-browser-account-status"></span>';const selectEl=wrap.querySelector('select');list().forEach(p=>{const option=document.createElement('option');option.value=p.accountNumber;option.textContent=`Account ${p.accountNumber} — ${p.browserType}`;selectEl.appendChild(option);});selectEl.value=selected;const status=wrap.querySelector('span');function paint(){const p=get();selectEl.value=p.accountNumber;status.textContent=`Account ${p.accountNumber}: ${p.browserType} · ${p.engine}`;}selectEl.addEventListener('change',()=>{select(selectEl.value);paint();});el.appendChild(wrap);paint();return wrap;}
 root.BondsMallSellerBrowserAccounts={profiles:list,profile,load,select,get,render};
 load();
})(window);
