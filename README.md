# Oustadi Plus · Swaye3 dashboard

Dashboard-only source for tutoring-center staff and teachers. Built on the independently implemented Teachable REA course engine. The student app is a separate product and is not bundled in this repository.

## Run

Node.js 24+ is required. Run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:4174 . Windows users can run `./Start-Dashboard.ps1`, adding `-Rebuild` after source changes.

## Included

- Center overview with measured counts and activity.
- Teachable-style full-page course creation: details, cover and starting content; real PDF/video/audio import into draft lessons.
- Retained REA curriculum, rich-text, media, quiz and course-preview tools.
- Read-only student dossiers and center-scoped roster. Staff cannot create student accounts or edit student-owned personal details.
- Exact QR/ID lookup of existing registry accounts, attachment requests, dated course access, suspension and renewal.
- Teacher directory, course Q&A inbox/replies, progress and CSV export.
- Independent manual MAD payment records with reversible annulment.
- Center settings and scoped data export.

## External student-app boundary

Students must register and receive their identity/QR in the separate student app. This dashboard reads registry data and records requests; student acceptance must be supplied by the external app/integration. No student signup, learner dashboard or learner Q&A composer is shipped here. Legacy /school and /learn paths resolve to the dashboard. Editor course preview remains available.

This is still a single local prototype. Production authentication, server authorization, shared registry/consent synchronization, device binding, DRM and billing require backend services. UI preview roles do not provide server security.

## Data and checks

Browser `teachable-*` state synchronizes to `.data/teachable.sqlite`. Uploaded files are stored in `.data/uploads/`. Both are ignored by Git. Existing data is preserved. Back up the entire `.data` folder to retain uploaded files; JSON export contains center records and courses, not media bytes.

`npm test` runs 22 automated checks. `npm run build` performs TypeScript validation and production compilation. For an isolated QA database, run `node scripts/qa-preview.mjs` and open port 4186.
