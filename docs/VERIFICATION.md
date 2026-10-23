# Verification record

23 October 2026, local macOS / Node 22.14 / Chromium.

- `npm test`: 12 passing tests, zero failures. Includes worker lifecycle, HTTP authorization, input validation, consent, escalation, persistence, event freshness, duplicate suppression, contact expiry and terminal-session cleanup.
- `npm run test:ui`: 8 scenario checks passed. Two independent browser contexts completed real WebRTC transport using browser-provided synthetic audio; mocked Mumbai location appeared in the contact view; cancellation cleared audio and location. A 390px mobile viewport had no horizontal overflow. No browser runtime/CSP errors were recorded.
- Real local Codex execution completed and returned a reviewable report. It ran `node --test checkout.test.js`: one passed, one intentionally failed (190 versus180). The proposed patch changes flat subtraction into percentage discount. No patch was applied; the failing fixture is intentional.
- `npm audit --omit=dev --audit-level=high`: zero reported vulnerabilities at verification time.
- Handback TV remote checked: private repository, main branch, preservation commit6197b3e, finished video tracked.

Evidence: `artifacts/ui-verification.json`, `artifacts/codex-verification.json`, desktop/mobile screenshots. Unit worker tests use explicit test executables; the separately captured Codex report is from the real installed CLI.

Not verified: physical Bee, Apple Watch, original wearable capture timestamps, cross-network TURN, actual emergency scenarios, human usability, production uptime, physical audio quality or browser background reliability. No claim of Bee-track qualification or emergency-service integration is made.
