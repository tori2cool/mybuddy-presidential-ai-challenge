# Compliance & Future-Proofing Documentation
Last updated: January 04, 2026

## Overview
MyBuddy is a COPPA-compliant educational app for children under 13 with mandatory parental supervision. All features requiring personal information are gated behind verifiable parental consent via Keycloak.

## Key Compliance Decisions

### COPPA (Federal)
- Directed to children under 13 → full COPPA applies.
- Verifiable parental consent: Parent creates Keycloak account first → child profile created as sub-account → parent login directs to child selection screen.
- Data minimization: Only collect name, age, progress, interests, and optional chat logs.
- Parental controls: Parent portal allows review/deletion of child data.
- No behavioral advertising or third-party tracking.

### Florida AI Laws (as of Jan 2026)
- No specific AI/child law yet in effect.
- Monitoring proposed "Artificial Intelligence Bill of Rights" (SB 482 / HB 659) for companion chatbot rules.
- Current design avoids high-risk "companion" classification: Buddy is an educational tool, not an open-ended emotional therapy replacement.

## Data Practices
- Chat conversations: Stored for progress and parental review (opt-out possible in future).
- AI content generation: Currently uses existing static data; future APIs will be reviewed for training data sources.
- No sale or sharing of child data.

## Architecture Safeguards
- Keycloak tiered auth: Parent account required before child profile.
- All API calls require authenticated Bearer token.
- Frontend toggle for AI backend (`USE_AI_BACKEND`) allows easy rollback if needed.

## Links
- Privacy Policy: https://mybuddy-ai.com/privacy
- Terms of Service: https://mybuddy-ai.com/terms

## Future Monitoring
- Review Florida legislative session (March 2026) for AI bills.
- FTC COPPA rule updates expected 2026.
- Add in-app acceptance modal for terms/privacy on first login (planned).
