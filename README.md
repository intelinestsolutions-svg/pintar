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
