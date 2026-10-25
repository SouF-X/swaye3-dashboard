# Prototype adaptation coverage

The Swaye3/OstadiPlus teacher-dashboard prototype was used as the domain reference. The working Teachable REA implementation remains the authoring and media engine.

| Prototype workflow | Adapted dashboard | Verification |
| --- | --- | --- |
| Overview and recent work | Real course/access/request counts, work queue and recorded activity | Visual desktop/mobile review |
| Courses, subject, level and teacher | Course catalog and draft creation; retained REA lesson, content, media, quiz and preview components | Browser course creation, rich-text save and publication; media tests |
| Student registry and unique code | Student-owned app registration and QR-card export; center-scoped roster and read-only dossier | Browser profile creation and persisted code |
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

## Course-creation correction

The retained REA CourseWizard now drives a full-page details → cover → starting-content flow. Its bulk path uploads actual PDF/video/audio files and creates draft lessons with media blocks. Blank creation opens the REA curriculum. The former course-creation drawer is removed. Ordinary add forms use centered dialogs. Eight dedicated browser checks passed, including a real PDF import, mobile layout, centered dialogs and focus styling; see verification/course-creation-qa.json.

## Student ownership correction

Removed staff profile creation and editing, including the legacy Teachable student-management route in the Swaye3 app. Added a separate learner registry, student-side signup/ID/QR issuance, exact-code center lookup, contact-data hiding before consent, and an attachment-scoped center roster. Eleven browser checks passed for the full ownership flow, including a real app-issued QR lookup; see verification/student-ownership-qa.json. Six new model checks cover registration isolation, duplicate accounts, exact lookup and membership defaults (24 automated tests total). Production account verification and backend authorization remain required.
