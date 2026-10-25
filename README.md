# Oustadi Plus · Swaye3 dashboard

A French-language tutoring-center workspace built on the independently implemented Teachable REA course engine. The center dashboard now follows the Swaye3 prototype's reception, student membership and course-access workflows.

## Run locally

Requires Node.js 24+. Run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:4174 . On Windows, `./Start-Dashboard.ps1` performs these steps and keeps the server running. Use `-Rebuild` after source changes.

## Main workflows

- **Overview:** measured course, access and pending-request counts, useful action queue and actual recorded activity.
- **Courses:** use the retained Teachable three-step full-page setup (details, cover image, starting content). Start empty or upload real PDF/video/audio files as draft lessons. Subject, level and responsible teacher remain in course information. Continue in the REA curriculum, rich-text, media and quiz editors. Course publication requires a published lesson.
- **Students:** roster scoped to the center’s attachment requests and accepted students. Personal information is read-only for staff; there is no staff create/edit profile action.
- **Reception:** exact ID lookup or local QR-image decoding; separate center attachment, course activation, suspension and renewal with end dates.
- **Learner preview:** register a student-owned profile, receive its unique ID and downloadable QR card, accept/refuse a center request, request course access and study granted courses.
- **Questions:** course-filtered shared Q&A inbox with persistent teacher replies and an unanswered queue.
- **Payments:** manual MAD records with method, date and reference. Annulled entries remain recoverable. No automatic changes to course access.
- **Team and progress:** teacher directory, course assignments, measured published-lesson completion and CSV exports.
- **Settings:** center profile, policy reference values, JSON data export and explanation of preview roles.

Arabic switching and the inherited Teachable management screens are removed from the normal dashboard. Existing course content and local data are preserved. The separate `teachable-recreation` GitHub repository remains the independent Teachable workflow reference.

## Persistence and boundaries

Browser `teachable-*` state synchronizes to `.data/teachable.sqlite`; a browser journal retries pending writes. Uploaded course files live in `.data/uploads/` and are excluded from Git. Preserve the full `.data` folder for a backup of uploaded files; JSON export contains records and courses, not the uploaded media bytes.

This remains a single local workspace. Role switching and learner selection are UI previews, not production authentication or tenant isolation. Center requests are available in the local learner preview; no external push/email is sent. QR images encode a local UST ID and do not establish identity. Existing legacy unlimited grants are preserved; new access records can have explicit end dates. Local learner views apply recorded access status and expiry. Device binding, native offline DRM and center billing enforcement require backend services.

## Verification

`npm test` runs 24 tests covering local persistence/uploads, storage retry and enrollment/date migration logic. `npm run build` runs TypeScript checks and a production build.

For isolated browser QA, run `node scripts/qa-preview.mjs` and open http://127.0.0.1:4186 . It uses `.data/qa-workspace.sqlite` and separate browser-origin storage. Synthetic QA students, receipts and questions are never copied to the main workspace. See `PROTOTYPE-COVERAGE.md` for the adaptation scope.

Student signup writes to the separate app registry (`teachable-swaye3-student-registry-v1`) without creating a center membership or course grant. Staff lookup requires the exact UST code or QR and only reveals the matched identity before consent; contact details stay hidden until acceptance. Existing legacy dossiers and entitlements are retained read-only for compatibility. This UI workflow is not a substitute for production account verification and server authorization.
