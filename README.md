# Aryamman Bhatia’s portfolio

Public site: https://aryammanb.github.io/

Edit homepage text, formatting, and links at https://processzero.github.io/edit/.
Unlock with the private PIN, click the text, and choose **Save changes**.
Selecting text opens the formatting/link toolbar. Ctrl/Cmd+S also saves.
The PIN gates publishing; the homepage content remains public.

## Content and code

- The public page loads current content from the existing Process Zero content
  service’s separate `/api/portfolio-content` endpoint, with caching disabled.
  Saved changes appear on the next homepage load without a GitHub deployment.
- `index.html` is the readable fallback during an API outage.
- `assets/initial-content.json` is the initial snapshot, **not** the live source.
- The backend’s D1 database is the live source of truth after the first save.
  Future code work must preserve that content, rather than reseeding from HTML.
- The current editor changes the homepage. Project-page layout/code remains in
  `litho/`, `sputter/`, and `fabricated/` for later development.
- `assets/portfolio-shared.js` sanitizes and renders content and enhances email
  links with the copy-address menu. DOMPurify is hosted locally with its license.

## Backend

Existing Sites project: `appgprj_6ade5dc6aab081918b3f1dd89868a408`.
URL: `https://processzero-content-api.aryammanbhatia.chatgpt.site`.
Source checkout in this workspace: `../content-backend/`.

Portfolio endpoints, tables, login limits, sessions, and revision history are
isolated from the existing Process Zero editor. Secrets `PORTFOLIO_PIN_HASH` and
`PORTFOLIO_PIN_SALT` exist only in the backend environment. Never commit a PIN,
session token, or GitHub publishing credential. Sessions expire in 30 minutes;
five attempts per hour and twenty per day are enforced globally, plus per-IP
limits. Four digits have limited strength even with these controls.

The backend validates/sanitizes content, keeps twenty revisions, and rejects
saves from stale tabs. The public site sanitizes content again before display.
