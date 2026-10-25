# Oustadi Plus workspace design

Operate mode: a calm, legible dashboard for center staff and teachers. Use the supplied wordmark, Bricolage display font, white surfaces, mulberry #68234F, apricot #FFCCA9, lilac #F1E9F4, ink #291E2B, muted #746779 and subtle borders.

One persistent sidebar and header, grouped education and center navigation, clear page headings, compact measured summaries, searchable rosters and detailed side drawers. ID/QR lookup belongs in the reception flow, not above a second inherited student interface. Course content stays in the retained REA editor; management surfaces share the workspace component system. No Arabic switch for the current French-only pass.

All visible actions must be useful and stateful. No simulated camera scan, fake notifications, fabricated metrics, upgrade gates or decorative AI features. Changes to payments and teacher directory status preserve existing course entitlements. Preview boundaries belong in settings and contextual notes, not every main task.

Mobile navigation uses a dismissible scrim, keyboard focus handling and inert hidden content. Tables scroll within their own surface; forms and drawers adapt to narrow screens. Respect reduced motion and maintain readable contrast.

Teachable is the interaction foundation. Course creation uses the REA full-page, three-step setup; never replace it with a side drawer. Ordinary add forms use centered dialogs, while student dossiers can use a detailed side panel. Adapt branding and Swaye3-specific fields without replacing useful Teachable workflows. Focused fields use one thin border with a faint highlight, without a second heavy outline.

Registration belongs in the student app. Do not add staff-facing “Ajouter un élève”, “Créer le profil” or personal-profile editing. The center’s primary action is “Rechercher par ID / QR”; its roster only lists its own attachment requests and accepted students. Show minimal matching identity before consent, then read-only profile fields. QR cards are issued and presented from the student app.

## Dashboard-only repository

The student app is outside this repository. Student registration, identity issuance and student-side consent screens are not bundled here. The dashboard reads existing student IDs/QRs and registry data, records attachment requests, and manages course access after an external acceptance is synchronized. There is no staff account-creation or personal-profile editing action. Course preview remains part of the retained Teachable authoring tools. Production student-registry and consent synchronization still require their service integration.
