# Oustadi Plus · Swaye3 product

A local French-language workspace for Moroccan tutoring centers, independent teachers and center reception staff. Use the user's Swaye3 prototype as domain authority and the Teachable REA code as the course-authoring engine.

Students have a dossier, unique UST identifier and QR card. Center attachment, course authorization and cash records are separate. An unlinked profile must accept a local attachment request before staff grant courses. Access has an explicit status and optional end date; legacy unlimited grants remain intact. Teacher departure and cash annulment do not remove existing access. Course Q&A is shared, not private messaging.

The center, teacher and reception selectors are preview contexts. Authentication, multi-tenant enforcement, native offline protection, device binding and subscription billing require production services. All test records must use the isolated QA workspace.

## Student ownership — mandatory rule

Students register themselves in the student app and receive their unique ID/QR. Staff must never create student accounts or edit student-owned personal details. The app registry is separate from the center roster. Staff can resolve one existing account by its exact shared code, request attachment, and manage course access only after student acceptance. Unattached registry accounts are not searchable by name/email from the center roster. Legacy dossiers remain read-only; production identity migration requires verified accounts.

## Dashboard-only repository

The student app is outside this repository. Student registration, identity issuance and student-side consent screens are not bundled here. The dashboard reads existing student IDs/QRs and registry data, records attachment requests, and manages course access after an external acceptance is synchronized. There is no staff account-creation or personal-profile editing action. Course preview remains part of the retained Teachable authoring tools. Production student-registry and consent synchronization still require their service integration.
