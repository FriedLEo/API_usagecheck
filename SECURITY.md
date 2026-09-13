# Security

## Credential handling

DeepSeek API keys, DeepSeek Platform session tokens, and the optional OpenCode Zen API key are encrypted using Electron `safeStorage` (DPAPI on Windows) before persistence. If encryption is unavailable, credentials may be held for the current process only; the app never writes plaintext fallback credentials.

The main process owns credentials, HTTP, storage, and system integrations. The dashboard renderer has no Node.js access, no raw IPC access, and receives credential status only after initial submission.

## Local threat model

DPAPI protects persisted data from other Windows accounts and offline copying, but software executing as the same Windows user may access data available to this app. JavaScript process memory cannot be reliably zeroed. Keep Windows and the app updated and revoke credentials if the machine is compromised.

## Private DeepSeek interface

Detailed usage uses an undocumented endpoint from the authenticated DeepSeek Platform dashboard. It is opt-in, isolated from the official balance client, schema-validated, and may stop working if DeepSeek changes the interface.

## Undocumented OpenCode Zen interface

Go subscription quota uses an undocumented endpoint (`opencode.ai/zen/go/v1/usage`) that is not part of the published Zen API. It is opt-in — no request is made unless you save a Zen key — and the key is sent only to `opencode.ai`. Responses are validated with deliberately loose schemas so the app degrades to a clear error rather than a crash, and the interface may change or be removed at any time.

## Reporting

Do not include API keys, session tokens, dashboard exports, or unredacted logs in bug reports.
