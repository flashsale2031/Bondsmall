from pathlib import Path
import re

path = Path('legal.html')
html = path.read_text(encoding='utf-8')

# Remove the top draft-for-review notice entirely.
html = re.sub(r'\s*<p class="legal-notice"><strong>Draft for qualified legal review\.</strong>.*?</p>\n', '\n', html, flags=re.S)

# Replace draft/review-only language with neutral applicable-law language.
replacements = {
    'This working draft must be localized and reviewed by qualified counsel before it is used as binding terms, an infringement notice, or a compensation agreement.': 'The applicable law of the place of use, the parties\' contracts, and mandatory rights control where they differ from this framework.',
    'Qualified counsel must localize this section, confirm current law, add registration details, and identify the correct legal entity and notice contact before publication as binding terms.': 'The applicable legal entity, registration requirements, notice contact, and current law control for each market and transaction.',
    'Before publication as binding terms, add the legal entity name, notice address, support contact, governing-jurisdiction details, privacy links, seller terms, returns policy, and any country-specific supplements approved by qualified counsel.': 'The legal entity name, notice address, support contact, governing-jurisdiction details, privacy links, seller terms, returns policy, and country-specific supplements applicable to each market govern the relevant transaction.',
    'Qualified counsel and, where appropriate, affected creators or communities should review this section before publication or enforcement.': 'Affected creators, communities, regulators, and the governing law of the relevant market determine the applicable rights and remedies.',
    'Qualified privacy counsel must localize this page, add the legal entity and contact details, confirm actual data flows, and approve the final notice before publication as binding terms.': 'The applicable legal entity, contact details, actual data flows, and market-specific privacy requirements govern each processing activity.',
    'This section must be reviewed by qualified intellectual-property counsel before it is relied on or used as a demand, takedown, contract, or enforcement notice.': 'Any demand, takedown, contract, or enforcement notice must follow the applicable law, process, and authority for the relevant market.',
    '<strong>Review note:</strong>': '<strong>Applicable-law note:</strong>',
}
for old, new in replacements.items():
    html = html.replace(old, new)

# Add a universal four-level framework to the opening governance section.
anchor = '            <p>This rulebook establishes a common operating framework for the lawful, fair, secure, and accountable execution of Bonds Mall business. It is designed as a guide for the marketplace, its company functions, employees, contractors, customers, sellers, affiliates, visitors, and users. Applicable law, binding contracts, mandatory consumer protections, and valid regulatory requirements control where they differ from this guide.</p>\n'
framework = '''            <p>This rulebook applies a four-level legal framework to every section. <strong>Universal:</strong> human dignity, equality, privacy, safety, property, expression, effective remedy, and due process principles reflected in the <a href="https://www.un.org/en/about-us/universal-declaration-of-human-rights" rel="noopener noreferrer">Universal Declaration of Human Rights</a>. <strong>Intercontinental:</strong> cross-border conflicts of law, customs, sanctions, tax, consumer, data-transfer, and trade rules applicable when a transaction, person, service, or data flow crosses regions or continents. <strong>International:</strong> treaties, conventions, and international or regional instruments, including the <a href="https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-civil-and-political-rights" rel="noopener noreferrer">ICCPR</a>, <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng" rel="noopener noreferrer">GDPR</a>, and other instruments adopted or implemented by the relevant States. <strong>National:</strong> the constitutions, statutes, regulations, cases, licenses, orders, and mandatory consumer, privacy, employment, tax, product-safety, intellectual-property, and criminal laws of each applicable jurisdiction.</p>
            <p class="legal-footer-note"><strong>Legal consequences:</strong> A violation of a section may result, where the applicable law permits, in corrective instructions, warnings, contract remedies, account or access restrictions, removal, refunds, restitution, civil damages, injunctions, administrative fines, regulatory orders, seizure, license consequences, or criminal investigation and prosecution. Penalties are not automatic: the governing law, jurisdiction, evidence, defenses, exceptions, intent, harm, due process, statutory limits, and decision of the competent authority control.</p>
'''
if anchor in html:
    html = html.replace(anchor, anchor + framework, 1)

# Add the same four-level basis directly beneath every substantive section heading.
section_basis = '''            <p class="legal-footer-note section-legal-basis"><strong>Four-level legal basis:</strong> This section is read with universal rights and due-process principles; intercontinental cross-border, customs, trade, tax, sanctions, and conflict-of-law rules; applicable international or regional instruments; and the national, state, provincial, or local laws governing the activity. Available consequences may include contractual, platform, civil, administrative, regulatory, or criminal remedies where authorized by the applicable law.</p>
'''
pattern = re.compile(r'(<section class="legal-card" id="[^"]+">\n\s*<h2>[^<]+</h2>\n)(?!\s*<p class="legal-footer-note section-legal-basis">)')
html, count = pattern.subn(r'\1' + section_basis, html)

path.write_text(html, encoding='utf-8')
print(f'updated_sections={count}')
print(f'remaining_draft_terms={len(re.findall(r"draft|legal review|qualified counsel|not legal advice|working operational|not formal|review note", html, flags=re.I))}')
