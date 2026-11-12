# Smart Documents Writer

A web-based (PWA-ready) app for creating **Invoices**, **Sales Receipts** and **Delivery Notes**.

## Features
- Create, edit, duplicate and delete documents
- Auto-numbering with configurable prefixes
- Auto-calculated line items, taxes, totals, balance due
- Company & client profiles, settings
- Print / Save as PDF (print-friendly layout)
- Local storage persistence + JSON import/export
- Mobile-aware responsive UI with bottom navigation
- Offline-ready via service worker
- 18 document templates, including decorative CSS-only designs that stay print-safe

## Templates
Each template is a CSS-only variant in `css/style.css` (`.doc-preview.tpl-*`) driven by
the `TEMPLATES` list in `js/app.js`. Documents stay selectable, searchable and print
cleanly because the graphics are CSS backgrounds, borders and pseudo-elements rather
than raster images.

Core: `modern`, `minimal`, `classic`, `bold`, `executive`, `corporate`, `elegant`, `sleek`.

Decorative: `aurora`, `heritage`, `blueprint`, `luxe`, `nordic`, `sunrise`, `spectrum`,
`editorial`, `monogram`, `thermal`.

## Design credits
Several decorative templates were inspired by freely licensed, open-source designs:

- [formfeed-dev/templates](https://github.com/formfeed-dev/templates) (MIT) — editorial
  report layout and receipt-style rules.
- [danfickle/pdf-templates](https://github.com/danfickle/pdf-templates) (MIT) — the
  arboshiki invoice layout that informed the Spectrum template, originally by
  [arboshiki](https://bootsnipp.com/snippets/8MPnQ).
- [sparksuite/simple-html-invoice-template](https://github.com/sparksuite/simple-html-invoice-template)
  (MIT) — clean invoice information hierarchy.

No third-party template files are copied verbatim: the layouts were reimplemented as
CSS variants on this app's own document markup so print/PDF output and accessibility
stay consistent.

## Run
```bash
cd smart-documents-writer
python3 -m http.server 8765
# open http://localhost:8765
```
Or `npm start`.

## Structure
- `index.html` - app shell
- `css/style.css` - styles (responsive + print)
- `js/app.js` - application logic
- `sw.js` - service worker (offline)
- `manifest.json` - PWA manifest
