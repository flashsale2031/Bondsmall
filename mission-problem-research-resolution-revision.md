# Bonds Mall Mission — Problem → Research → Resolution → Revision Path

## Purpose

Create a closed-loop engineering path in which every mission failure becomes research input, every researched programmatic solution becomes a resolution artifact, and the complete resolved mission becomes the input to a second research pass that consolidates all individual fixes into unified mission-revision files.

## Controlled lifecycle

**1. Mission Problem**  
ResearchFlow identifies a failure, error, missing contract, dependency issue, verification issue, security issue, or other condition capable of stopping mission completion. Each problem receives a stable problem record.

**2. Research**  
The problem is sent to the configured research provider with its code, affected file, evidence, remediation context, and mission requirements. Research returns implementation guidance, programmatic code where available, tests/risks, and source URLs.

**3. Resolution Upload**  
A safe programmatic solution is automatically named and uploaded to the `mission-resolution/` candidate area. Resolution artifacts remain distinguishable from production code. CAPTCHA solving/bypass, anti-bot defeat, credential theft, and session-cookie theft solutions are rejected.

**4. Complete Mission Rendering Gate**  
Before consolidation research can begin, the system must render a complete mission snapshot containing mission requirements, products, locations, platforms, jobs, advertisements, Active Ads, resubmission state, errors, and mission events. Missing mission-data categories block consolidation.

**5. Consolidation Research**  
After the render gate passes, ResearchFlow pulls every uploaded resolution program, groups code by target file, and researches how the individual fixes can be converted into a coherent unified implementation without losing required behavior.

**6. Unified Mission Revision Upload**  
The consolidated implementation is automatically named and uploaded to `mission-revision/` as a candidate revision. It is linked back to every source resolution and the mission-data snapshot used to produce it.

**7. Validation**  
The loop validates that all problems have resolutions, all unified solutions completed consolidation research, and all revision candidates exist. Validation does not mean production deployment.

**8. Mission Revision**  
Approved revision candidates become the next mission-system revision through the repository's normal review/merge controls. GitHub Actions can automate the workflow, while pull requests remain the appropriate control for proposing and reviewing repository changes. citeturn0search2turn0search5

**9. Repeat**  
The revised mission is scanned again. New problems create new research records, which create new resolutions, which feed the next consolidation pass. The process therefore becomes:

`MISSION → PROBLEM → RESEARCH → RESOLUTION → COMPLETE MISSION RENDER → CONSOLIDATION RESEARCH → UNIFIED RESOLUTION → MISSION REVISION → RESCAN → ...`

## Repository components

- `mission-resolution-loop.js` — browser state machine and lifecycle API.
- `mission-resolution-loop.html` — visual lifecycle/control surface.
- `mission-resolution-loop.py` — server/CI orchestrator that researches findings, uploads resolutions, renders the mission snapshot, consolidates code, and uploads revision candidates.
- `.github/workflows/mission-resolution-loop.yml` — scheduled/manual automation.
- `mission-resolution/` — generated candidate resolution code.
- `mission-revision/` — generated unified revision candidates.
- `mission-resolution-artifacts/` — run manifests and complete rendered mission snapshots.

## Non-negotiable gates

- No researched code is considered production merely because it was uploaded.
- No consolidation occurs until the mission-data render is complete.
- No revision candidate is created from unsafe solution categories.
- Every unified revision records its source resolution IDs and target file.
- Repository changes should be reviewed through the normal GitHub change-control process before production use. GitHub supports repository workflows and artifacts for this kind of automated pipeline. citeturn0search3turn0search1
- CAPTCHA, anti-bot, credential, and session-security controls are never defeated by this loop.
