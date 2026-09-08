from pathlib import Path

seller = Path('seller.html')
src = seller.read_text(encoding='utf-8')
if Path('seller-workspace.html').exists() and 'seller-workspace-frame' in src:
    print('Workspace refactor already present; nothing to do.')
    raise SystemExit(0)

ws_start = src.index('  <section id="workspace-manager"')
ws_end = src.index('  <div id="captcha-notification-popup"', ws_start)
workspace_html = src[ws_start:ws_end].rstrip()

marker = "    /* ═══════════════════════════════════════════════════════════\n       AI WORKSPACE MANAGER\n     ═══════════════════════════════════════════════════════════ */"
script_marker = src.index(marker)
script_end = src.index('    function resetLaunchButton()', script_marker)
reset_end = src.index('    }', script_end) + len('    }')
workspace_js = src[script_marker:reset_end]

style_start = src.index('  <style>')
style_end = src.index('</style>', style_start) + len('</style>')
styles = src[style_start:style_end]

workspace_doc = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bonds Mall — Seller Workspace</title>
<link rel="stylesheet" href="localization.css?v=1.0.4">
{styles}
<style>
  html,body{{margin:0;min-height:100%;background:#f8f5ef;overflow-x:hidden}}
  body::before{{display:none}}
  #workspace-manager{{width:min(100% - 20px,1440px);margin:10px auto 20px;}}
</style>
</head>
<body>
{workspace_html}
<script src="seller-state-platform-traffic.js?v=20260908-1"></script>
<script>
const CLIENT_ONLY_MODE = true;
const scheduleMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const scheduleDateKey = date => {{ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${{y}}-${{m}}-${{d}}`; }};
const readJSON=(key,fallback)=>{{try{{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}}catch(_){{return fallback}}}};
let scheduleEntries = readJSON('clblast_schedules', []);
let allListings = readJSON('clblast_listings', {{}});
function isActive(listing){{ if(!listing || listing.status && ['expired','inactive','deleted'].includes(String(listing.status).toLowerCase())) return false; if(listing.url){{ const posted=new Date(listing.post_time||0); return !Number.isNaN(posted.getTime()) ? (Date.now()-posted.getTime())/3600000 < 720 : true; }} return Boolean(listing); }}
function escHtml(str){{return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}}
function showToast(msg){{console.info('[Seller Workspace]',msg)}}
window.BondsMallStatePlatformTraffic = window.BondsMallStatePlatformTraffic || {{platforms:[],population:{{}}}};
{workspace_js}
function workspaceShellRefresh(){{ allListings=readJSON('clblast_listings',{{}}); scheduleEntries=readJSON('clblast_schedules',[]); if(typeof renderWorkspaceManager==='function')renderWorkspaceManager(); if(typeof renderWorkspaceMailbox==='function')renderWorkspaceMailbox(); if(typeof workspaceRunResolutionEngine==='function')workspaceRunResolutionEngine(); }}
window.addEventListener('storage',workspaceShellRefresh);
setInterval(workspaceShellRefresh,5000);
</script>
</body>
</html>
'''
Path('seller-workspace.html').write_text(workspace_doc, encoding='utf-8')

frame = '''  <section id="seller-workspace-frame" aria-label="AI Workspace Manager display area">
    <iframe src="seller-workspace.html?v=20260908-1" title="Bonds Mall AI Workspace Manager" loading="eager" style="display:block;width:100%;min-height:2600px;height:clamp(2600px,calc(100vh + 1800px),5200px);border:0;background:#f8f5ef;"></iframe>
  </section>

'''
src = src[:ws_start] + frame + src[ws_end:]

new_marker_pos = src.find(marker)
if new_marker_pos != -1:
    new_script_end = src.find('    function resetLaunchButton()', new_marker_pos)
    if new_script_end != -1:
        new_reset_end = src.find('    }', new_script_end) + len('    }')
        src = src[:new_marker_pos] + src[new_reset_end:]

src = src.replace('seller-state-platform-traffic.js"></script>', 'seller-state-platform-traffic.js?v=20260908-2"></script>')
seller.write_text(src, encoding='utf-8')
print('Seller workspace extracted into seller-workspace.html and replaced with an iframe.')
