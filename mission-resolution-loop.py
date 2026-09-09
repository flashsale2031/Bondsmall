#!/usr/bin/env python3
"""Bonds Mall Mission Resolution Loop.
Problem -> research -> resolution upload -> complete mission render -> consolidation research -> mission revision.

This service only creates candidate artifacts. It never silently deploys a researched solution to production.
Configure BONDS_MALL_RESEARCH_SEARCH_URL and BONDS_MALL_GITHUB_TOKEN for online research and repository uploads.
"""
import base64, json, os, re, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

OWNER=os.getenv('BONDS_MALL_GITHUB_OWNER','flashsale2031')
REPO=os.getenv('BONDS_MALL_GITHUB_REPO','Bondsmall')
BRANCH=os.getenv('BONDS_MALL_GITHUB_BRANCH','main')
TOKEN=os.getenv('BONDS_MALL_GITHUB_TOKEN','')
SEARCH=os.getenv('BONDS_MALL_RESEARCH_SEARCH_URL','')
BLOCK=re.compile(r'(captcha\s*(solver|bypass|crack)|anti[- ]?bot\s*(bypass|defeat|evade)|credential\s*(steal|dump)|session\s*cookie\s*(steal|dump))',re.I)
STAMP=lambda:datetime.now(timezone.utc).isoformat().replace(':','-').replace('.','-')
SLUG=lambda x:re.sub(r'[^a-zA-Z0-9]+','-',str(x or '').strip()).strip('-').lower()[:70] or 'item'

def call(url,payload,headers=None,method='POST'):
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers=headers or {'Content-Type':'application/json','User-Agent':'BondsMall-ResolutionLoop'},method=method)
    with urllib.request.urlopen(req,timeout=90) as r:return json.loads(r.read().decode())

def research(problem):
    if not SEARCH:return {'status':'provider-not-configured','solution':'','source_url':''}
    q=('Find a safe, programmatic remediation for this Bonds Mall mission failure. '
       f"Failure code: {problem.get('code','')}. File: {problem.get('file','')}. "
       f"Message: {problem.get('message','')}. Remediation hint: {problem.get('remediation','')}. "
       'Return implementation code, affected files, tests, risks, and authoritative source URLs.')
    return call(SEARCH,{'query':q})

def github_put(path,content,message):
    if not TOKEN:raise RuntimeError('BONDS_MALL_GITHUB_TOKEN is not configured')
    u=f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{urllib.parse.quote(path)}'
    h={'Accept':'application/vnd.github+json','Authorization':'Bearer '+TOKEN,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json','User-Agent':'BondsMall-ResolutionLoop'}
    return call(u,{'message':message,'content':base64.b64encode(content.encode()).decode(),'branch':BRANCH},h)

def write_artifact(root,kind,name,payload):
    p=Path(root)/kind/name
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(payload,indent=2),encoding='utf8');return str(p)

def run(report_path='researchflow-report.json'):
    report=json.loads(Path(report_path).read_text(encoding='utf8'))
    problems=report.get('findings',[])
    root=Path(os.getenv('BONDS_MALL_RESOLUTION_ARTIFACT_DIR','mission-resolution-artifacts'))
    root.mkdir(parents=True,exist_ok=True)
    results=[]
    for f in problems:
        pid='PROB-'+SLUG(f.get('code'))+'-'+STAMP()
        r=research(f)
        code=str(r.get('solution') or r.get('code') or '')
        item={'id':pid,'problem':f,'research':r,'resolution':None,'revision':None}
        if code and not BLOCK.search(code):
            target=f.get('file') or 'solution.js'; ext=Path(target).suffix if Path(target).suffix in {'.js','.html','.htm','.py'} else '.js'
            name=f'resolution-{SLUG(f.get("code"))}-{STAMP()}{ext}'
            resolution={'id':'SOL-'+STAMP(),'problemId':pid,'targetFile':target,'code':code,'sourceUrl':r.get('source_url',''),'status':'uploaded','createdAt':datetime.now(timezone.utc).isoformat()}
            write_artifact(root,'resolution',name,resolution)
            if TOKEN:
                z=github_put('mission-resolution/'+name,code,'resolution: '+f.get('code','mission problem'))
                resolution['repositoryUrl']=z.get('content',{}).get('html_url','')
                resolution['commit']=z.get('commit',{}).get('sha','')
            item['resolution']=resolution
        else:item['resolution']={'status':'not-created','reason':'No safe programmatic solution returned'}
        results.append(item)
    render={'renderedAt':datetime.now(timezone.utc).isoformat(),'complete':True,'missionData':{'report':report,'problems':problems,'resolutions':[x['resolution'] for x in results]}}
    write_artifact(root,'rendered','mission-render.json',render)
    # Consolidation is intentionally deterministic: all uploaded resolution code is grouped by target file.
    groups={}
    for x in results:
        r=x.get('resolution') or {}
        if r.get('status')=='uploaded':groups.setdefault(r.get('targetFile','solution.js'),[]).append(r)
    unified=[]
    for target,items in groups.items():
        code='\n\n'.join(f'/* source resolution {i["id"]} */\n{i["code"]}' for i in items)
        unified.append({'id':'UNI-'+SLUG(target)+'-'+STAMP(),'targetFile':target,'sourceResolutionIds':[i['id'] for i in items],'code':code,'researchStatus':'pending'})
    for u in unified:
        if SEARCH:
            cr=research({'code':'UNIFIED_'+SLUG(u['targetFile']),'file':u['targetFile'],'message':'Consolidate the uploaded resolution programs into one coherent, tested implementation without dropping behavior.','remediation':u['code']})
            c=str(cr.get('solution') or cr.get('code') or u['code'])
            if not BLOCK.search(c):u.update({'code':c,'research':cr,'researchStatus':'complete'})
        name=f'unified-{SLUG(u["targetFile"])}-{STAMP()}.js'
        write_artifact(root,'unified',name,u)
        if u.get('researchStatus')=='complete' and TOKEN:
            z=github_put('mission-revision/'+name,u['code'],'revision: unified mission resolution')
            u['repositoryUrl']=z.get('content',{}).get('html_url','');u['commit']=z.get('commit',{}).get('sha','');u['status']='candidate'
        else:u['status']='pending-research'
    manifest={'generatedAt':datetime.now(timezone.utc).isoformat(),'problems':len(problems),'resolutions':sum(1 for x in results if (x.get('resolution') or {}).get('status')=='uploaded'),'renderComplete':True,'unifiedSolutions':unified,'productionDeploy':False}
    Path(root/'mission-resolution-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    return manifest

if __name__=='__main__':
    import sys
    print(json.dumps(run(sys.argv[1] if len(sys.argv)>1 else 'researchflow-report.json'),indent=2))
