# Aryamman Bhatia’s portfolio

Public site: https://aryammanb.github.io/

Edit homepage text, formatting, and links at https://aryammanb.github.io/edit/.
Unlock with the private PIN, click the text, and choose **Save changes**.
Selecting text opens the formatting/link toolbar. Ctrl/Cmd+S also saves.
The PIN gates publishing; the homepage content remains public.

Use **Add image** (or paste/drop a local image) to upload a PNG, JPEG, WebP, GIF or
AVIF up to 5 MB. Optionally describe the image, choose **Insert image**, then
**Save changes**. Images stay with their page when switching between pages.
Delete an image in the text editor to remove it from the page. Uploaded files
remain stored for revision recovery; do not delete the storage bucket when
deploying backend changes.

## Content and code

- The public page loads current content from the independent portfolio content
  service’s separate `/api/portfolio-content` endpoint, with caching disabled.
  Saved changes appear on the next homepage load without a GitHub deployment.
- `index.html` is the readable fallback during an API outage.
- `assets/initial-content.json` is the initial snapshot, **not** the live source.
- The backend’s D1 database is the live source of truth after the first save.
  Future code work must preserve that content, rather than reseeding from HTML.
- Use the Page selector to edit the homepage or any subpage. Add page creates a
  new page and adds its link to the homepage; Save changes publishes all drafts.
  Existing `/litho/`, `/sputter/`, and `/fabricated/` addresses still work. New
  pages use `/?page=slug` so GitHub Pages can serve them without a new build.
- `assets/portfolio-shared.js` sanitizes and renders content and enhances email
  links with the copy-address menu. DOMPurify is hosted locally with its license.

## Backend

Portfolio Sites project: `appgprj_6ade663584ac819195b3b0a6406b23be`.
URL: `https://aryamman-portfolio-content-api.aryammanbhatia.chatgpt.site`.
Source checkout in this workspace: `../portfolio-content-api/`.

The portfolio has its own backend project and database, separate from Process
Zero. Secrets `PORTFOLIO_PIN_HASH` and
`PORTFOLIO_PIN_SALT` exist only in the backend environment. Never commit a PIN,
session token, or GitHub publishing credential. Sessions expire in 30 minutes;
five failed attempts per hour and twenty per day are enforced globally, plus per-IP
limits. Four digits have limited strength even with these controls.

The backend validates/sanitizes content, keeps twenty revisions, and rejects
saves from stale tabs. The public site sanitizes content again before display.
Image files live in the portfolio backend's separate R2 bucket (`BUCKET`).
Uploads require an active session and are rate-limited. File size and format
signatures are checked; the detected format overrides incorrect browser MIME
labels or filename extensions. SVG/HTML and external image sources are not accepted.
Public images are served at `/api/portfolio-image?id=…` with fixed image MIME
types and `nosniff` headers. Content contains these URLs, never embedded base64.
