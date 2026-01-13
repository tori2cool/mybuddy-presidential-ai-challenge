# Compliance & Future-Proofing Documentation
Last updated: January 09, 2026

## Overview
MyBuddy is a COPPA-compliant educational app for children under 13 with mandatory parental supervision. All features requiring personal information are gated behind verifiable parental consent via Keycloak.

## Key Compliance Decisions

### COPPA (Federal)
- Directed to children under 13 → full COPPA applies.
- Verifiable parental consent: Parent creates Keycloak account first → child profile created as sub-account → parent login directs to child selection screen.
- Data minimization: Only collect name, age, progress, interests, and chat logs (opt-out planned).
- No behavioral advertising or third-party tracking.

### Florida AI Laws (as of Jan 2026)
- No specific AI/child law yet in effect.
- Monitoring proposed "Artificial Intelligence Bill of Rights" (SB 482 / HB 659) for companion chatbot rules.
- Current design avoids high-risk "companion" classification: Buddy is an educational tool, not an open-ended emotional therapy replacement.

### AI-Generated Responses in Buddy Chat
- **Implementation**: Real-time conversational responses are generated using the OpenAI API (GPT models). Prompts are engineered to enforce age-appropriate language, positive/encouraging tone, educational focus, and safety boundaries (e.g., no personal advice on sensitive topics without redirection to parents).
- **Data Used**: Inputs include child profile (age, name, interests), conversation history, learned facts, and progress metrics — all stored with parental consent.
- **Safety Measures**: 
  - No persistent storage of raw chat logs beyond what's needed for continuity/progress (opt-out planned).
  - Responses are filtered for appropriateness via prompt constraints.
  - Parent supervision emphasized in-app notices and policy.
- **Future**: Monitor OpenAI safety updates and FTC guidance on AI in child-facing apps.

## Data Practices
- Chat conversations: Stored for progress and parental review (opt-out possible in future).
- AI content generation: Uses OpenAI API with controlled prompts; no direct model training on child data.
- No sale or sharing of child data.

## Architecture Safeguards
- Keycloak tiered auth: Parent account required before child profile.
- All API calls require authenticated Bearer token.

## Links
- Privacy Policy: https://mybuddy-ai.com/privacy
- Terms of Service: https://mybuddy-ai.com/terms

## Future Monitoring
- Review Florida legislative session (March 2026) for AI bills.
- FTC COPPA rule updates expected 2026.
- Add in-app acceptance modal for terms/privacy on first login (planned).
- Parental controls: Parent portal allows review/deletion of child data (planned).