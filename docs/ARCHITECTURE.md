# Architecture and implementation phases

## 1. Preserve existing work — complete

Handback TV was preserved independently at github.com/adipatel399/handback-tv (private), including its 2:13 landscape video and editable sources. Relay lives in a separate directory and has no dependency on Handback's runtime.

## 2. Help state machine — implemented

Owner browser → authenticated API → durable SQLite state → contact browser polling.

A request moves from waiting to acknowledged, then explicitly resolved or cancelled. The first accepted contact is notified in-app. After 30 seconds without acknowledgement the next accepted contact is notified. One contact can take responsibility; acknowledgement is distinct from a successful audio connection. One active session per owner prevents duplicate overlapping incidents. A missed server-persisted check-in can start a session even after the owner page closes.

The app retains 30 incidents, 100 timeline entries per incident, 30 recent transcript events, 500 event deduplication IDs and 10 agent jobs. Timers are reconstructed from deadlines after restart. A restart clears ephemeral audio signaling and readiness; it does not silently rerun a coding job.

## 3. Optional sharing — implemented

Location comes from the owner's Geolocation API with explicit permission. The UI displays age and accuracy. Audio uses peer-to-peer WebRTC with backend signaling; the app does not record audio. Both sides opt in. The responding contact alone may answer. Restart/leave increments a session epoch to reject obsolete signaling. Terminal sessions remove location and signaling.

## 4. Agent work — implemented

A reviewed task invokes an existing local Codex CLI with `--ignore-user-config`, `--ephemeral`, `--sandbox read-only`, `--json`, and a per-task fixture directory. Shell interpolation is not used. Events and final output are bounded and persisted. One job runs at a time and has a three-minute limit. Failure, interruption, timeout and cancellation are separate states. No automatic code modification, commit or deployment.

## 5. Wearable adapter — contract implemented; hardware unverified

Bee CLI JSONL → local adapter → owner-authenticated ingestion API → event ledger. Only a fresh exact help phrase during an armed window may create an incident. Documentation samples cannot trigger. Agent requests become reviewable proposals. Bee speaker labels are not authentication.

## 6. Release gate — incomplete external requirements

Before presenting as an eligible Bee entry: obtain authorised real device data, run the actual account-to-bridge flow, record measured latency and connection-loss behaviour, and verify current submission requirements. Before real safety use: independently validate device and network failure modes, add dependable external delivery, test accessibility with actual users, and obtain appropriate safety/security review. None of those outcomes is implied by browser tests.
