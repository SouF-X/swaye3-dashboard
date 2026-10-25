# Prototype adaptation coverage

The Swaye3/OstadiPlus teacher-dashboard prototype was used as the domain reference. The working Teachable REA implementation remains the authoring and media engine.

| Prototype workflow | Adapted dashboard | Verification |
| --- | --- | --- |
| Overview and recent work | Real course/access/request counts, work queue and recorded activity | Visual desktop/mobile review |
| Courses, subject, level and teacher | Course catalog and draft creation; retained REA lesson, content, media, quiz and preview components | Browser course creation, rich-text save and publication; media tests |
| Student registry and unique code | Roster, editable dossier, UST code, real QR-card export | Browser profile creation and persisted code |
| Center attachment request | Unlinked → requested → accepted/refused in the local learner preview | Browser round trip |
| Reception enrollment | Exact code and QR-image lookup, access request, activation, suspension, expiry and renewal | Actual QR-image upload plus activation/reload checks; date/expiry tests |
| Shared course questions | Learner posts, teacher inbox/replies, unanswered filters | Browser round trip |
| Manual settlement tracking | Independent MAD ledger, CSV, reversible annulment | Browser annulment and unchanged course-access check |
| Center/teacher/reception spaces | Different navigation and task controls | Browser role-preview checks; no claim of server-side authorization |
| Teacher profile/settings | Center identity, contact data, policy references and exports | Save/reload and sidebar-identity checks |
| Arabic experience | Temporarily removed at the user's request | French-only shell, no Arabic switch |

## Production work remaining

- Authentication and server-side center/teacher/reception permissions.
- Shared verified student registry, cross-center membership constraints, production request delivery and consent records.
- Ownership/tenant enforcement for teacher content and staff accounts.
- Native device binding, QR-camera scanning and protected offline media.
- Real subscription billing, grace enforcement and preservation of dated entitlements across center suspension.
- Production notifications, audit authorization and secure multi-user concurrency.

No claim is made that the entire Teachable platform or all production Swaye3 infrastructure has been recreated. Existing course content, grants and financial notes were preserved during the UI adaptation.
