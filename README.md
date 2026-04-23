# ChitTrack — Chit Fund Manager

A clean, offline-capable chit fund management app.  
Runs entirely in the browser — no server, no database, no dependencies.

## Live Demo

Deployed via GitHub Pages:  
`https://<your-username>.github.io/<repo-name>/`

---

## Features

- **Admin Dashboard** — stats, member list, payment grid, month-wise schedule
- **Member View** — individual payment history with cumulative amounts
- **Record Payments** — per-member, per-month with date and notes
- **Bulk Mark Paid** — mark all members paid for a month in one click
- **Assign Borrower** — track who receives the pot each month
- **Export CSV** — full payment report with UTF-8 BOM (Excel-friendly)
- **Persistent** — all data saved in `localStorage` (survives page refresh)

---

## Fund Parameters

| Parameter          | Value       |
|--------------------|-------------|
| Members            | 25          |
| Months             | 26          |
| Monthly amount     | ₹13,000     |
| Pot per month      | ₹3,25,000   |
| Commission (Sl 2)  | ₹16,000     |
| Start date         | 5 Mar 2026  |
| End date           | 5 Apr 2028  |

To change these values, edit `assets/js/config.js`.

---

## Project Structure

```
chittrack/
├── index.html                  # Entry point (HTML shell only)
├── assets/
│   ├── css/
│   │   └── style.css           # All styles
│   └── js/
│       ├── config.js           # Constants, dates, schedule data
│       ├── utils.js            # Pure helpers (fmt, fmtDate, sanitize…)
│       ├── store.js            # State management + localStorage
│       ├── render.js           # DOM rendering functions
│       └── app.js              # Event handling + bootstrap
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages auto-deploy
├── .gitignore
└── README.md
```

---

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **GitHub Actions**
4. Push to `main` — the workflow deploys automatically

---

## Local Development

No build step needed. Just open `index.html` in any modern browser:

```bash
# Option 1 — direct file open
start index.html

# Option 2 — local server (avoids any file:// quirks)
npx serve .
# or
python -m http.server 8080
```

---

## Security

- Content Security Policy (CSP) via `<meta>` tag — restricts scripts to `'self'`
- All user-supplied strings rendered via `sanitize()` (textContent-based XSS prevention)
- No inline event handlers (`onclick`, etc.) — all events via data-attribute delegation
- No external JS dependencies
- `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` meta headers

> For production, mirror these headers server-side (e.g. in `_headers` for Netlify or via nginx config).

---

## License

MIT
