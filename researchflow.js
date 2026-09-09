/*
 * Bonds Mall ResearchFlow
 * ------------------------
 * Mission-system research, failure analysis, improvement proposals and agenda engine.
 *
 * Scans:
 *   - seller.html
 *   - mastermind.js
 *   - analyticsflow.html
 *   - resubmission.html
 *
 * The scanner is intentionally conservative: it reports conditions that can cause
 * mission failure, but it does not claim that an issue is exploitable or broken
 * without evidence. It never solves, bypasses, predicts, replays, or defeats
 * CAPTCHA / anti-bot controls.
 *
 * Browser use:
 *   window.BondsMallResearchFlow.scan()
 *   window.BondsMallResearchFlow.getReport()
 *   window.BondsMallResearchFlow.getProposals()
 *   window.BondsMallResearchFlow.getAgenda()
 *   window.BondsMallResearchFlow.startAgenda()
 *
 * Optional Node use:
 *   node researchflow.js --scan
 *   node researchflow.js --agenda
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BondsMallResearchFlow = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FILES = ['seller.html', 'mastermind.js', 'analyticsflow.html', 'resubmission.html'];
  const PLATFORMS = ['Craigslist', 'AdLandPro', 'ClassifiedAds', 'Facebook Marketplace', 'OfferUp', 'Mercari', 'Poshmark', 'Nextdoor'];
  const MISSION_STAGES = [
    'Analyze mission statement', 'Define success criteria', 'Research market and audience',
    'Build campaign strategy', 'Create location plan', 'Create offer architecture',
    'Create ad content', 'Create media plan', 'Create platform plans',
    'Validate policy and page readiness', 'Validate launch queue', 'Open launch sessions',
    'Human checkpoint handling', 'Submit advertisements', 'Verify publication',
    'Normalize live URLs', 'Record campaign state', 'Publish to Market Active Ads',
    'Monitor launch results', 'Complete mission handoff'
  ];

  const AGENDA = [
    { id:'research', label:'Mission research and statement review', cadence:'daily', hour:1, minute:15, action:'scan' },
    { id:'integrity', label:'Mission-system integrity scan', cadence:'daily', hour:2, minute:15, action:'scan' },
    { id:'ads', label:'Recent advertisement and live-URL review', cadence:'every6h', hour:3, minute:0, action:'reviewAds' },
    { id:'resubmit', label:'Resubmission queue review', cadence:'daily', hour:4, minute:15, action:'reviewResubmission' },
    { id:'security', label:'Security, dependency and cross-file contract review', cadence:'weekly', weekday:1, hour:5, minute:15, action:'scan' },
    { id:'mission', label:'Mission statement revision proposal review', cadence:'weekly', weekday:1, hour:6, minute:15, action:'proposeRevision' },
    { id:'platforms', label:'Platform coverage and posting-readiness review', cadence:'weekly', weekday:3, hour:5, minute:15, action:'platformReview' },
    { id:'monthly', label:'Full mission retrospective and improvement plan', cadence:'monthly', day:1, hour:7, minute:15, action:'fullReview' }
  ];

  const state = {
    running:false,
    lastScan:null,
    sources:{},
    findings:[],
    proposals:[],
    agendaRuns:[],
    timer:null
  };

  function now() { return new Date(); }
  function iso() { return now().toISOString(); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function addFinding(severity, code, file, message, evidence, remediation) {
    state.findings.push({ severity, code, file, message, evidence:evidence || '', remediation:remediation || '', at:iso() });
  }
  function addProposal(priority, area, title, why, action, automation, schedule) {
    state.proposals.push({ priority, area, title, why, action, automation, schedule });
  }

  async function getSource(path) {
    if (state.sources[path]) return state.sources[path];
    if (typeof fetch === 'function') {
      const url = new URL(path, typeof location !== 'undefined' ? location.href : 'https://raw.githubusercontent.com/flashsale2031/Bondsmall/main/');
      const response = await fetch(url.href, { cache:'no-store' });
      if (!response.ok) throw new Error(path + ' returned HTTP ' + response.status);
      const text = await response.text();
      state.sources[path] = text;
      return text;
    }
    throw new Error('No fetch implementation is available for ' + path);
  }

  async function loadAll() {
    const results = await Promise.all(FILES.map(async file => {
      try { return [file, await getSource(file), null]; }
      catch (error) { return [file, '', error.message]; }
    }));
    results.forEach(([file, text, error]) => {
      if (error) addFinding('critical', 'SOURCE_UNAVAILABLE', file, 'ResearchFlow could not read the required mission file.', error, 'Restore the file or hosting path before relying on automated research results.');
    });
    return Object.fromEntries(results.map(([file, text]) => [file, text]));
  }

  function checkSyntax(path, text) {
    if (!text) return;
    if (!path.endsWith('.js')) return;
    try { new Function(text); }
    catch (error) { addFinding('critical', 'JS_SYNTAX', path, 'JavaScript cannot be parsed by the browser Function constructor.', error.message, 'Fix the syntax error before the file is loaded by the mission system.'); }
  }

  function checkHtml(path, text) {
    if (!text) return;
    const lower = text.toLowerCase();
    if (!/<html[\s>]/i.test(text)) addFinding('high','HTML_ROOT_MISSING',path,'HTML document root is missing.','No <html> root detected.','Restore a complete HTML document structure.');
    const scriptMatches = [...text.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
    for (const src of scriptMatches) {
      if (/^https?:\/\//i.test(src)) continue;
      const normalized = src.split('?')[0].replace(/^\.\//,'');
      if (FILES.includes(normalized) || normalized === 'resubmission.js' || normalized === 'analyticsflow.js') {
        if (!state.sources[normalized]) addFinding('high','SCRIPT_DEPENDENCY_UNREAD',path,'A locally referenced mission script was not available to ResearchFlow.',normalized,'Make sure the referenced script exists and is deployed beside the page.');
      }
    }
    const duplicateIds = {};
    for (const m of text.matchAll(/id=["']([^"']+)["']/gi)) duplicateIds[m[1]] = (duplicateIds[m[1]] || 0) + 1;
    Object.entries(duplicateIds).filter(([,n]) => n > 1).forEach(([id,n]) => addFinding('medium','DUPLICATE_ID',path,'Duplicate DOM id can route automation to the wrong control.',id + ' occurs ' + n + ' times.','Give each automation-critical element a unique id.'));
    const inlineHandlers = [...text.matchAll(/\bon(?:click|change|submit|load|input|error)\s*=\s*["']/gi)].length;
    if (inlineHandlers > 12) addFinding('low','INLINE_HANDLER_DENSITY',path,'High inline event-handler density increases coupling and makes automated testing harder.',String(inlineHandlers) + ' inline handlers found.','Move mission-critical handlers into named modules and testable functions.');
    if (/localStorage/i.test(text) && !/try\s*\{[\s\S]{0,300}localStorage/i.test(text)) addFinding('medium','STORAGE_GUARD',path,'localStorage is used without an obvious nearby failure guard.', 'localStorage reference detected.', 'Wrap storage reads/writes in guarded helpers so privacy mode, quota, or malformed JSON cannot stop the mission.');
    if (/innerHTML\s*=/.test(text) && /<a[^>]+href=\"\$\{|href=\"\$\{/.test(text)) addFinding('medium','UNTRUSTED_MARKUP',path,'Dynamic markup is assembled around URL data.', 'innerHTML and interpolated href detected.', 'Use DOM APIs and URL validation before inserting dynamic links.');
    if (/password|token|secret|api[_-]?key/i.test(text)) addFinding('high','SECRET_EXPOSURE_REVIEW',path,'Credential-like words appear in client-side code and require review.', 'Potential credential identifier detected.', 'Keep secrets out of browser JavaScript and static Pages; use a server-side secret store when a credential is genuinely required.');
  }

  function checkMastermind(text) {
    if (!text) return;
    MISSION_STAGES.forEach((stage, i) => {
      if (!text.includes(stage)) addFinding('high','MASTER_STAGE_MISSING','mastermind.js','Expected Mastermind stage is not present.', 'Stage ' + (i+1) + ': ' + stage, 'Restore the stage or update ResearchFlow if the mission definition intentionally changed.');
    });
    ['openAdSession','awaitHumanCheckpoint','launchAd','postAd','verifyAd'].forEach(hook => {
      if (!text.includes(hook)) addFinding('high','HOOK_MISSING','mastermind.js','Mastermind is missing a required integration hook.', hook, 'Connect the hook to the existing authorized Seller Workspace integration or explicitly mark the stage as manual.');
    });
    if (!/human checkpoint/i.test(text) || !/CAPTCHA/i.test(text)) addFinding('critical','HUMAN_CHECKPOINT_POLICY_MISSING','mastermind.js','Human checkpoint / CAPTCHA safety language is missing.', 'Expected human checkpoint policy was not found.', 'Keep CAPTCHA and anti-bot checkpoints human-operated; never automate bypass or solving.');
    if (!/verified.*live|live.*url|result\.url/i.test(text)) addFinding('high','LIVE_URL_GATE_REVIEW','mastermind.js','The live-URL publication gate could not be confirmed by static heuristics.', 'No clear live URL gate pattern found.', 'Require a verified HTTP(S) URL from the posting integration before Active Ads publication.');
    if (/setTimeout\([^\n]*launch|setInterval\([^\n]*launch/i.test(text)) addFinding('high','UNGUARDED_LAUNCH_TIMER','mastermind.js','A launch timer pattern was detected and needs manual review.', 'Launch-related timer detected.', 'Gate scheduled launches with readiness, policy, human-checkpoint, deduplication, and rate-limit checks.');
  }

  function checkAnalytics(text) {
    if (!text) return;
    ['analyticsflow.js','Mastermind','seller.html','Recent Updates','Advertisement Platforms','Timestamp Submissions'].forEach(term => {
      if (!text.includes(term)) addFinding('medium','ANALYTICS_CONTRACT','analyticsflow.html','AnalyticsFlow appears to be missing an expected contract.', term, 'Keep AnalyticsFlow aligned with the current Mastermind/Seller data contracts.');
    });
    if (!/<table/i.test(text)) addFinding('medium','ANALYTICS_TABLE_MISSING','analyticsflow.html','The platform submission table is missing.', 'No table element found.', 'Restore the timestamp submission table.');
  }

  function checkResubmission(text) {
    if (!text) return;
    ['resubmission.js','resubmissionList','bondsMallResubmissionQueue','bondsMallUrlStatusEndpoint'].forEach(term => {
      if (!text.includes(term)) addFinding('medium','RESUBMISSION_CONTRACT','resubmission.html','Resubmission page is missing an expected queue/status contract.', term, 'Keep resubmission.html synchronized with resubmission.js.');
    });
    if (!/HTTP 200|status/i.test(text)) addFinding('high','STATUS_GATE_MISSING','resubmission.html','No explicit HTTP status/live verification wording was detected.', 'Expected URL status verification contract not found.', 'Only queue an ad as non-live after a defensible status check; distinguish CORS/network failure from HTTP failure.');
  }

  function crossFileChecks(sources) {
    const seller = sources['seller.html'] || '';
    const master = sources['mastermind.js'] || '';
    const analytics = sources['analyticsflow.html'] || '';
    const resub = sources['resubmission.html'] || '';

    if (!/mastermind/i.test(seller)) addFinding('medium','SELLER_MASTERMIND_LINK','seller.html','Seller does not visibly advertise or reference Mastermind integration.', 'No mastermind reference found by static scan.', 'Expose a clear, tested integration point from Seller to mission orchestration.');
    if (!/bonds:active-ads-updated/.test(master) || !/bonds:active-ads-updated/.test(analytics)) addFinding('medium','ACTIVE_ADS_EVENT','analyticsflow.html','Active Ads event synchronization is incomplete by static inspection.', 'Expected bonds:active-ads-updated event contract not found in both files.', 'Use a shared event/schema or API contract for Active Ads synchronization.');
    if (!/bondsMallMastermindActiveAds/.test(analytics)) addFinding('medium','ANALYTICS_STORAGE_CONTRACT','analyticsflow.html','AnalyticsFlow may not be reading the Mastermind Active Ads store.', 'Expected localStorage key not found.', 'Keep the persisted Active Ads schema stable and version it when changed.');
    if (!/bondsMallResubmissionQueue/.test(resub) || !/queueForResubmission/.test(resub)) addFinding('high','RESUBMISSION_QUEUE_CONTRACT','resubmission.html','Resubmission queue contract is incomplete.', 'Queue storage or queue method not found.', 'Keep queue creation and rendering connected to resubmission.js.');
    if (/fetch\(/.test(master) && !/try|catch/.test(master)) addFinding('medium','NETWORK_ERROR_GUARD','mastermind.js','Network-style operations appear without an obvious error-handling block.', 'fetch/network pattern detected.', 'Centralize network retries, timeouts, status classification, and user-visible failure states.');
    if (/localStorage\.setItem/.test(master) && !/try\s*\{[\s\S]{0,500}localStorage\.setItem/.test(master)) addFinding('medium','PERSISTENCE_FAILURE','mastermind.js','Mission state persistence may fail silently or unexpectedly in restricted browser contexts.', 'localStorage write detected.', 'Use a storage adapter with quota/error handling and schema versioning.');
    if (!/AbortController/.test(resub) && /fetch\(/.test(resub)) addFinding('medium','URL_CHECK_TIMEOUT','resubmission.html','The resubmission UI relies on URL checks but no timeout mechanism was detected in this page.', 'No AbortController detected in HTML.', 'Keep URL status checks bounded by timeout and classify timeout/CORS separately from HTTP status.');
  }

  function generateProposals(sources) {
    state.proposals = [];
    addProposal('P0','Safety','Create a mission kill-switch and approval gate','A scheduled system must stop rather than continue when a critical integrity, policy, login, CAPTCHA, destination, or data-contract check fails.','Before every launch batch, require all P0/P1 checks to pass; pause the queue on critical findings.','Expose pause/resume/stop state to Mastermind and persist an immutable reason.','Before every launch batch');
    addProposal('P0','Reliability','Introduce one versioned mission contract','Seller, Mastermind, AnalyticsFlow and Resubmission currently share implicit DOM/localStorage/event contracts.','Create a versioned schema for mission, job, ad, URL verification, Active Ads and resubmission records.','ResearchFlow should fail compatibility checks when schema versions disagree.','Daily at 02:15');
    addProposal('P0','Verification','Separate HTTP failure from CORS/network failure','A browser cannot reliably prove an external URL status without a CORS-capable service. GitHub Pages is static and has no server-side runtime.','Use a dedicated URL-status service for external platforms and classify 200, non-200, timeout, DNS, CORS and unknown separately.','Feed only verified results into Resubmission and Active Ads.','Every 6 hours');
    addProposal('P1','Security','Add dependency and script-integrity checks','Static mission pages depend on many scripts and external resources.','Pin trusted script versions, scan for unexpected script sources, and reject missing local dependencies.','ResearchFlow emits a blocking finding when required scripts disappear or change unexpectedly.','Daily at 02:15');
    addProposal('P1','Operations','Build a durable agenda runner outside the browser','A browser timer stops when the page closes; a static site cannot itself provide durable server scheduling.','Use GitHub Actions or another scheduler for recurring research/validation jobs, with browser agenda only as a live dashboard.','Scheduled workflow runs ResearchFlow and stores a report/artifact or opens an issue when blocking findings occur.','Daily/weekly/monthly');
    addProposal('P1','Mission','Create a controlled mission-revision loop','The mission should improve from measured results without silently changing objectives.','Generate revision proposals from verified outcomes, failures, platform availability and acquisition evidence; require approval before replacing the mission statement.','Store current, proposed, approved and superseded mission versions.','Weekly Monday');
    addProposal('P1','Posting','Use idempotent job IDs and deduplication','Retries can otherwise create duplicate listings or repeated submissions.','Make platform + account + location + product + campaign + scheduled window part of an idempotency key.','Do not submit a job if an equivalent job is already running, verified live, or awaiting human action.','Before every posting batch');
    addProposal('P1','Human Checkpoints','Formalize human-action states','CAPTCHA, login, consent, verification and platform prompts cannot safely be treated as ordinary automation steps.','Use explicit states: waiting-human, human-complete, cancelled, expired.','Agenda runner pauses affected jobs while unrelated safe research continues.','Continuous');
    addProposal('P2','Analytics','Create one immutable event ledger','Timestamp tables and localStorage snapshots are useful but can drift.','Record mission, job, submission, verification, resubmission and revision events with timestamps and correlation IDs.','AnalyticsFlow derives tables from the event ledger instead of scraping presentation HTML alone.','Every event');
    addProposal('P2','Recovery','Add automated backup/export of mission state','Browser storage can be cleared or become unavailable.','Export versioned JSON state and keep a bounded history.','ResearchFlow can detect missing state and mark recovery required rather than inventing data.','Daily');
    addProposal('P2','Quality','Add preflight tests for every mission stage','Mastermind currently has 20 named stages; each stage should have a readiness assertion.','Map each stage to inputs, outputs, failure states and evidence.','ResearchFlow reports the first missing dependency before launch.','Daily and on every code change');
    addProposal('P2','Governance','Add an approval ledger for mission statement changes','Automatic revision without approval could alter the business objective unexpectedly.','Require explicit approval for mission objective, budget, geography, audience and policy changes.','Agenda creates a proposal, not an unapproved mission mutation.','Weekly');
    addProposal('P3','Observability','Publish a ResearchFlow health score','Raw findings are hard to prioritize.','Score findings by severity, blast radius, recurrence and age.','Show P0/P1 blockers first and track time-to-resolution.','Every scan');
    addProposal('P3','Performance','Cache stable source scans and compare hashes','Repeated full scans create unnecessary work.','Hash each source and only run expensive analyses when content changes.','ResearchFlow stores last-known hashes and findings.','On every scan');
    if (/github/i.test(sources['seller.html'] || '')) addProposal('P1','Hosting','Move durable mission automation to a server-side scheduler','GitHub Pages publishes static files and does not run server-side PHP, Ruby or Python.','Keep the UI static but run scheduling, URL checks and protected integrations on Actions or a backend.','ResearchFlow can publish a read-only report to the static UI.','Continuous');
  }

  function scanSources(sources) {
    state.findings = [];
    FILES.forEach(file => { if (sources[file]) { checkSyntax(file, sources[file]); checkHtml(file, sources[file]); } });
    checkMastermind(sources['mastermind.js']);
    checkAnalytics(sources['analyticsflow.html']);
    checkResubmission(sources['resubmission.html']);
    crossFileChecks(sources);
    generateProposals(sources);
    state.lastScan = iso();
    return getReport();
  }

  async function scan() {
    state.running = true;
    try { const sources = await loadAll(); return scanSources(sources); }
    finally { state.running = false; }
  }

  function getReport() {
    const counts = state.findings.reduce((a,f) => { a[f.severity]=(a[f.severity]||0)+1; return a; }, {});
    return { scannedAt:state.lastScan, files:FILES.slice(), counts, findings:state.findings.slice(), proposals:state.proposals.slice(), agenda:AGENDA.slice() };
  }

  function getProposals() { return state.proposals.slice(); }
  function getAgenda() { return AGENDA.slice(); }

  function isDue(item, date) {
    const d = date || now();
    if (item.cadence === 'daily') return d.getHours() === item.hour && d.getMinutes() === item.minute;
    if (item.cadence === 'every6h') return d.getMinutes() === item.minute && [3,9,15,21].includes(d.getHours());
    if (item.cadence === 'weekly') return d.getDay() === item.weekday && d.getHours() === item.hour && d.getMinutes() === item.minute;
    if (item.cadence === 'monthly') return d.getDate() === item.day && d.getHours() === item.hour && d.getMinutes() === item.minute;
    return false;
  }

  async function runAgendaItem(item) {
    const record = { id:item.id, startedAt:iso(), status:'running' };
    state.agendaRuns.unshift(record);
    try {
      if (item.action === 'scan' || item.action === 'fullReview' || item.action === 'proposeRevision') await scan();
      else if (item.action === 'reviewAds' || item.action === 'reviewResubmission' || item.action === 'platformReview') await scan();
      record.status = 'complete';
      record.finishedAt = iso();
      windowDispatch('bonds:researchflow-agenda-complete', record);
      return record;
    } catch (error) {
      record.status='failed'; record.error=error.message; record.finishedAt=iso();
      windowDispatch('bonds:researchflow-agenda-failed', record);
      return record;
    }
  }

  function windowDispatch(name, detail) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent(name,{detail}));
  }

  function startAgenda() {
    if (state.timer || typeof setInterval !== 'function') return;
    state.timer = setInterval(() => {
      const d = now();
      AGENDA.filter(item => isDue(item,d)).forEach(item => {
        const key = item.id + ':' + d.toISOString().slice(0,16);
        if (!state.agendaRuns.some(r => r.key === key)) { const p = runAgendaItem(item); if (p && typeof p.then === 'function') p.then(r => { r.key=key; }); }
      });
    }, 30000);
    windowDispatch('bonds:researchflow-agenda-started',{at:iso(),agenda:AGENDA.slice()});
    return true;
  }

  function stopAgenda() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    windowDispatch('bonds:researchflow-agenda-stopped',{at:iso()});
  }

  function nextAgendaRuns(from) {
    const start = from ? new Date(from) : now();
    const results=[];
    for (let i=1; i<=10080 && results.length<AGENDA.length; i++) {
      const d=new Date(start.getTime()+i*60000);
      AGENDA.forEach(item=>{ if(isDue(item,d)) results.push(Object.assign({},item,{nextRun:d.toISOString()})); });
    }
    return results.sort((a,b)=>a.nextRun.localeCompare(b.nextRun));
  }

  function render(host) {
    const target = typeof host === 'string' ? document.querySelector(host) : host;
    if (!target) return;
    const report=getReport();
    const findings=report.findings;
    const proposals=report.proposals;
    target.innerHTML = '<div class="researchflow"><h2>ResearchFlow</h2>' +
      '<p>Last scan: '+esc(report.scannedAt || 'not scanned')+'</p>' +
      '<div><strong>Findings:</strong> '+esc(JSON.stringify(report.counts))+'</div>' +
      '<h3>Failure findings</h3><ul>'+findings.map(f=>'<li><b>'+esc(f.severity.toUpperCase())+' · '+esc(f.code)+'</b> — '+esc(f.file)+' — '+esc(f.message)+' <span>'+esc(f.remediation)+'</span></li>').join('')+'</ul>' +
      '<h3>Improvement proposals</h3><ol>'+proposals.map(p=>'<li><b>'+esc(p.priority)+' · '+esc(p.title)+'</b> — '+esc(p.action)+' <em>Schedule: '+esc(p.schedule)+'</em></li>').join('')+'</ol>' +
      '<h3>Agenda</h3><ul>'+AGENDA.map(a=>'<li><b>'+esc(a.label)+'</b> — '+esc(a.cadence)+'</li>').join('')+'</ul></div>';
  }

  const api = { FILES, PLATFORMS, MISSION_STAGES, AGENDA, scan, getReport, getProposals, getAgenda, nextAgendaRuns, startAgenda, stopAgenda, runAgendaItem, render, state };

  if (typeof process !== 'undefined' && process.argv && require.main === module) {
    (async () => {
      const report = await scan();
      const mode = process.argv.includes('--agenda') ? 'agenda' : 'scan';
      if (mode === 'agenda') console.log(JSON.stringify({report, nextRuns:nextAgendaRuns()}, null, 2));
      else console.log(JSON.stringify(report, null, 2));
    })().catch(error => { console.error(error); process.exitCode=1; });
  }

  return api;
});
