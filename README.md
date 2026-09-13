# DeepSeek Usage Tracker

A Windows tray application that keeps DeepSeek pricing, balance, spend, and token usage one shortcut away.

## Highlights

- `Ctrl+Alt+U` global show/hide shortcut (configurable)
- Always-on-top floating dashboard with right-edge auto-hide
- Home overview with one card per provider — a headline figure on the card, the full detail one click away
- Live official DeepSeek balance
- Live detailed cost/token history through an opt-in experimental Platform session connection
- Peak/off-peak indicator and current pricing
- Encrypted local credential storage using Electron `safeStorage` on Windows
- Provider-capability architecture for future Codex and Gemini integrations

## Development

Requires Node.js 22.12 or newer. The build script uses Rollup's WebAssembly implementation on Windows systems whose application-control policy blocks locally installed native Node modules.

When launching Electron development commands from another tool or IDE, make sure it does not export `ELECTRON_RUN_AS_NODE=1`; that variable makes Electron run as plain Node.js and immediately exit instead of opening the app.

```bash
npm install
npm run dev
npm test
npm run build
npm run dist:win
```

The detailed usage interface is private and undocumented. It may change without notice; the app retains last-known-good data and reports when reconnection is required.

## Windows beta installation

The beta installer is currently unsigned. Windows SmartScreen or an organization-managed Application Control policy may block it. SmartScreen may offer a **More info → Run anyway** option; strict signing policies require a future Authenticode-signed build and cannot safely be bypassed by the app. Verify the published SHA-256 checksum before installation.

## Credential setup

The normal DeepSeek API key provides account balance only. Detailed dashboard statistics require your Platform `userToken`. The app includes guided instructions and never asks for your DeepSeek password. Secrets are not returned to the dashboard renderer or written to logs.
