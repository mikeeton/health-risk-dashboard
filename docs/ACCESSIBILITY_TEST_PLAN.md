# Accessibility verification (WCAG 2.2 AA target)

Run on login, every role dashboard, patient switcher, notifications, care alerts, forms, tables, charts and error states.

- Complete all workflows using keyboard only; visible focus must follow reading order and no keyboard trap may occur.
- Test NVDA with Chrome/Firefox and VoiceOver with Safari. Every control needs an accessible name and every validation error must be announced.
- Verify text, icon and focus contrast with an automated contrast tool and manual review.
- Give charts a text title, summary and accessible data table or equivalent description.
- At 200% zoom, content must reflow without hidden actions or two-dimensional scrolling except genuine data tables.
- Enable `prefers-reduced-motion`; nonessential movement must stop.
- Test portrait/landscape phone and tablet breakpoints with touch targets of at least 24 by 24 CSS pixels.
- Record browser, assistive technology, result, evidence and remediation owner. Automated checks do not replace screen-reader and keyboard testing.
