# Swaye3 / Oustadi Plus dashboard

Branded tutoring-center dashboard with courses, local learner preview, unique UST student IDs, exact lookup, QR image decoding, enrollments, teacher directory, manual MAD ledger and reports.

Requires Node 24+. Run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:4174 . Set PORT=4175 for a second simultaneous instance. Run `npm test` for persistence/media tests.

No account data, uploaded files or browser profiles are committed. The local database is created in .data/. This is a single local workspace, not production authentication, tenant isolation, DRM or billing. QR lookup only searches registered local profiles. Camera scanning and cross-center identity verification are not implemented.
