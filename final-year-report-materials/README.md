# Final-Year Report Materials

This folder contains evidence and writing support for the Health Risk Dashboard
final-year report.

## Contents

- `01-development-methodology.md`: a defensible account of the development
  methodology, supported by repository evidence.
- `02-screenshot-catalogue.md`: the recommended figures, captions, chapter
  placement, priority, evidence notes, and claims each figure supports.
- `03-screenshot-capture-notes.md`: how the supplied images were produced and
  how to replace demonstration captures with final database-backed captures.
- `04-report-ready-figure-commentary.md`: paragraphs that can be adapted when
  discussing the most useful figures in the implementation chapter.
- `05-screenshot-quality-audit.md`: the visual audit, corrections made, and
  final decisions about which images are essential or optional.
- `screenshots/`: interface images captured at a 1440 × 1000 desktop viewport.
- `capture-screenshots.mjs`: a repeatable Playwright capture script.

## Important academic note

The authenticated screenshots use a browser-test session and intercepted,
clearly labelled synthetic responses because PostgreSQL was unavailable during
capture. They demonstrate implemented pages, controls, role navigation, and
data presentation, but they do not prove successful production database
integration, clinical accuracy, or genuine AI output. Replace them with
database-backed screenshots before submission if possible.
