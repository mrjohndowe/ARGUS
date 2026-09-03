# ARGUS

> **Artificial Responsive Guidance Utility System**

ARGUS is a personal Windows desktop-assistant prototype built with Electron. It provides a cinematic, privacy-conscious first-run experience, remembers how the user wants to be addressed, and includes a small set of local utility responses while the full AI and voice-control layers are developed.

## What works today

- ARGUS speaks immediately on first launch, asks for the preferred name aloud, and listens for the response before presenting the address-style choices: **Sir**, **Madam**, **Your name**, or **Adaptive**.
- Configuration is saved in Electron's per-user application-data directory, not in the repository.
- The main interface provides basic conversational responses for greetings, time, date, system status, and help.
- It can read local system details, including platform, CPU-core count, and memory summary.
- A settings panel controls voice enabled, automatic spoken replies, and response-length preference.
- A local activity log records commands processed during the open app session.
- The Copyrighted.com registration badge appears in both the first-run and primary-interface footers.

## Run ARGUS

### Prerequisites

- Windows 10 or later
- A current Node.js LTS release

### Start in development

```powershell
npm install
npm start
```

### Build a Windows installer

```powershell
npm run electron-build
```

The packaged installer is written to the ignored `release` directory.

## Privacy and safety

- The current prototype does not send names, messages, or system information to an AI service or any ARGUS server.
- Preferences are stored locally in Electron's user-data location as `argus-config.json`.
- The renderer has Node.js integration disabled and uses a narrow preload bridge for the approved Electron functions.
- The included Copyrighted.com badge loads its image and provided helper script from Copyrighted.com. Keep that external dependency in mind when reviewing network/privacy behavior.
- Full AI integration, persistent activity history, and PC automation require explicit permission and audit controls before they should be treated as production-ready features.

## Project structure

| Path | Purpose |
| --- | --- |
| `electron/main.js` | Electron window creation, local configuration storage, and approved native IPC handlers. |
| `electron/preload.js` | The restricted renderer-to-main API bridge. |
| `electron/renderer.js` | First-run flow, messages, settings, voice UI, and in-session activity log. |
| `public/index.html` | Setup, main interface, settings/activity dialogs, and copyright badge markup. |
| `public/styles.css` | ARGUS visual design and responsive interface styling. |

## Planned next milestones

1. Add a selectable local-first AI provider, such as Ollama, with an optional user-enabled cloud provider.
2. Replace browser-dependent speech recognition with a dependable Windows voice-input solution and offer an original configurable speech voice.
3. Add an approval-based PC action system with an activity history that persists locally.
4. Package and test the Windows installer on a separate target PC.
5. Add selected integrations only after their permissions, data flow, and controls are explicit.

## Current boundary

ARGUS is a working desktop prototype, not yet a general-purpose autonomous PC-control system. It intentionally remains limited to safe, visible, locally handled utilities until the AI, voice, and approval layers are implemented and verified.
