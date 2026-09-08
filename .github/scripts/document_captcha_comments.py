from pathlib import Path

ROOT = Path('.')


def insert_before_function(path, function_name, comment):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if comment.strip() in text:
        return
    lines = text.splitlines(keepends=True)
    needle = f'function {function_name}'
    async_needle = f'async function {function_name}'
    for i, line in enumerate(lines):
        if needle in line or async_needle in line:
            lines.insert(i, comment + '\n')
            p.write_text(''.join(lines), encoding='utf-8')
            return
    raise SystemExit(f'Function not found: {path}: {function_name}')


# Shared documentation block: this is intentionally explanatory only. It does
# not add CAPTCHA solving, bypass, anti-bot evasion, or automatic challenge
# completion behavior.
insert_before_function('seller-workspace.html', 'registerCaptchaInputHandler', '''    /* CAPTCHA INPUT BOUNDARY — ALL POST PLATFORMS
       Supported posting flows: Craigslist, AdLandPro, ClassifiedAds, Facebook
       Marketplace, OfferUp, Mercari, Poshmark, and Nextdoor. Each platform,
       account, and location may register its own handler. The handler receives
       only a CAPTCHA value personally entered by the user. Never solve, bypass,
       replay, predict, or defeat a third-party CAPTCHA here. */''')

insert_before_function('seller-workspace.html', 'getCaptchaScreenshotMarkup', '''    /* CAPTCHA SCREENSHOT CONTEXT
       Screenshots may show the user where a human checkpoint is waiting. This
       function is display context only. Do not add image interpretation,
       OCR-based challenge solving, or anti-bot bypass logic around this section. */''')

insert_before_function('seller-workspace.html', 'renderCaptchaNotifications', '''    /* CAPTCHA NOTIFICATION CENTER — SHARED BY ALL POST FLOWS
       This UI surfaces platform/account/location checkpoints. A notification
       is not proof of completion and must never advance a posting job by itself.
       Keep the challenge response transient and out of campaign persistence. */''')

insert_before_function('seller-workspace.html', 'submitCaptchaFromNotification', '''    /* USER-PROVIDED CAPTCHA HANDOFF
       Only the value personally entered by the user is forwarded to the exact
       waiting job handler. Clear the transient UI value after handoff; never
       log, persist, share, or transform it into a CAPTCHA solution token. */''')

insert_before_function('seller-workspace.html', 'setCaptchaRequired', '''    /* CAPTCHA GATE — ALL PLATFORM ADAPTERS
       Adapters use this state to say that a human checkpoint is blocking a job.
       It changes workflow/UI state only. It must not click, solve, bypass, or
       infer the result of the third-party challenge. */''')

insert_before_function('seller-workspace.html', 'launchPost', '''    /* POST LAUNCH / CAPTCHA POLICY — ALL PLATFORMS
       Launching a queue does not authorize CAPTCHA automation. Client-only
       posting sessions stop for the platform's human checkpoint. Any separately
       configured CAPTCHA-service credential is distinct from the user's answer. */''')

insert_before_function('seller-workspace.html', 'startNextJob', '''    /* QUEUE ADVANCEMENT / CAPTCHA SAFETY
       Do not mark a CAPTCHA-gated job complete because a browser opened, a timer
       elapsed, or a notification appeared. Advance only after the platform/user
       flow provides an explicit next state. */''')

insert_before_function('seller-workspace.html', 'beginClassifiedAdsJobFlow', '''    /* CLASSIFIEDADS CAPTCHA SECTION
       ClassifiedAds CAPTCHA stays inside the user-controlled Android emulator
       browser session. The Seller workspace records the gate and waits for the
       user's action; it never solves or bypasses the ClassifiedAds challenge. */''')

insert_before_function('seller-workspace.html', 'renderClientListingPanel', '''    /* CLIENT CAPTCHA DISPLAY — ALL PLATFORMS
       The common listing panel is a human handoff surface, not a CAPTCHA solver.
       Platform-specific challenges remain in their correct browser origin,
       account, and posting session. */''')

insert_before_function('seller-workspace.html', 'markClientJobPosted', '''    /* CAPTCHA COMPLETION CHECKPOINT
       Never infer CAPTCHA success from elapsed time, screenshots, page appearance,
       automated clicks, or a guessed selector. Posted status requires explicit
       confirmation from the platform/user-controlled flow. */''')

insert_before_function('seller-workspace.html', 'submitJobToServer', '''    /* SERVER CAPTCHA CREDENTIAL BOUNDARY
       A server-side captchaKey, where supported, is a configured service
       credential and is NOT a user's CAPTCHA answer. Keep credentials separate
       from transient challenge text and never expose challenge answers here. */''')

insert_before_function('seller-workspace.html', 'platformSessionMarkup', '''    /* PLATFORM-SESSION CAPTCHA ISOLATION
       CAPTCHA state belongs to the exact platform/account/location session.
       Never route a Craigslist challenge into AdLandPro, ClassifiedAds, Facebook
       Marketplace, OfferUp, Mercari, Poshmark, or Nextdoor, or vice versa. */''')

# ClassifiedAds has its own adapter. Put an explicit documentation block at
# the selector boundary and around each guest-post stage.
p = ROOT / 'classifiedads.js'
text = p.read_text(encoding='utf-8')
header = '''/*
 * CAPTCHA DOCUMENTATION — CLASSIFIEDADS POST FLOW
 * ------------------------------------------------
 * The CAPTCHA selectors below identify a human-check field only. They are not
 * a solver interface. The guest flow prepares the listing, lets the user handle
 * the platform challenge in the active browser/emulator session, and then waits
 * for explicit terms/publish confirmation. CAPTCHA answers are runtime-only and
 * must never be logged, persisted, shared between location sessions, or reused
 * as an automated anti-bot mechanism.
 */
'''
if 'CAPTCHA DOCUMENTATION — CLASSIFIEDADS POST FLOW' not in text:
    text = header + text
p.write_text(text, encoding='utf-8')

insert_before_function('classifiedads.js', 'submitGuestPost', '''  /* CAPTCHA-TO-PUBLISH BOUNDARY
     ClassifiedAds requires a runtime user-provided CAPTCHA value and explicit
     publish confirmation. This adapter contains no CAPTCHA solver and does not
     store the challenge response. */''')

insert_before_function('classifiedads.js', 'runGuestPostFlow', '''  /* CLASSIFIEDADS GUEST FLOW — CAPTCHA STAGE
     CAPTCHA is a human checkpoint after form/contact preparation and before
     terms/publish. The `captcha` argument comes from the user's active session
     and remains transient. */''')

insert_before_function('classifiedads.js', 'runGuestPostLocationSessions', '''  /* CLASSIFIEDADS MULTI-LOCATION CAPTCHA
     Each independent location session may receive an independent challenge.
     Never share a CAPTCHA response between locations or assume that one
     location's challenge authorizes another location. */''')

# Add a compact audit plan as source documentation for maintainers. This is
# deleted by the one-time workflow after the code comments are committed.
plan = ROOT / '.github/scripts/captcha-comment-plan.md'
plan.write_text('''# CAPTCHA comment coverage\n\nThe comments added by this pass document human-checkpoint boundaries for every Seller post flow and platform: Craigslist, AdLandPro, ClassifiedAds, Facebook Marketplace, OfferUp, Mercari, Poshmark, and Nextdoor. They explicitly distinguish user-entered CAPTCHA values from any configured service credential and prohibit solving/bypass behavior.\n''', encoding='utf-8')
