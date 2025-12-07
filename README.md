# FlareGuard

Institutional-grade crypto risk operations dashboard plus Chrome extension, built on the Flare Network (FTSO V2, FDC concepts, Smart Account simulations).

![Version](https://img.shields.io/badge/version-2.0.0-blue) ![Status](https://img.shields.io/badge/status-production-green) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Overview
- Hybrid experience: full-screen web dashboard (http://localhost:5173) plus MV3 popup HUD.
- Modes: **Live** (real FTSO V2 on Flare Coston2) or **Demo** (scripted simulations + DemoSimulation panel).
- Coverage: blue-chip assets (BTC / ETH / XRP / FLR / SOL / USDC) with watchlists, event logs, and liquidation controls.
- Tracks: DeFi risk ops, browser extension UX, analytics dashboard, and Flare-native tooling.

### Feature Highlights
1. **FTSO V2 Live Feeds** – Resilient RPC rotation, live heartbeat widget, real-time risk table.
2. **Risk Engine** – Volatility, volume pressure, and pump signals blended into a unified risk score with history chart.
3. **Liquidation Shield** – Auto-protect toggle, emergency withdraw CTA, and logs for every guardrail trigger.
4. **Smart Account / FDC Simulations** – When risk spikes, simulated proofs and automation logs appear for auditing.
5. **Demo Simulation Panel** – Manually trigger crashes, force risk levels, or replay scripted events for demos.
6. **Wallet Integration** – MetaMask detection, network guard (Flare 14 / Coston2 114), immediate FLR balance fetch, disconnect cleanup.
7. **Extension Popup HUD** – Compact 400x600 layout with favorite assets, risk gauge, liquidity shield status, and “Open Full Dashboard ↗”.
8. **Background Service Worker** – Badge text/color based on risk, minute-level alarms, future hook for alerts.
9. **Unified Persistence** – `useExtensionStorage` keeps wallet/watchlist/auto-protect keys in sync across web + chrome.storage.
10. **Institutional UX** – System logs, alert toasts, search, live-feed modal, responsive layout, shadcn/ui primitives.

---

## Flare tools used
- **FTSO V2**: On-chain oracle feeds via `ftsoService.ts` using ethers v6.
- **FDC (simulated)**: Pre-trade proof-style checks logged in hooks.
- **Smart Accounts (simulated)**: Automated actions (rebalance/collateral) when risk crosses thresholds.
- **FAssets bridge monitor**: Divergence between native BTC and wrapped FBTC for bridge risk.

Why minimal on-chain writes? Speed, cost, and privacy—analytics stay client-side while consuming trustless oracle data.

---

## Architecture
- Frontend: React 19, TypeScript, Tailwind v4, shadcn/ui.
- Backend: None. Data comes from Flare RPC + local simulations.
- Data layer: `use-flare.ts` orchestrates prices, wallet, logs, risk, watchlist, smart account demos.
- Blockchain access: ethers v6 `BrowserProvider` + `JsonRpcProvider` with fallback RPCs.
- Extension surface: MV3 popup, background service worker, content script (Vite multi-entry).
- Storage: `useExtensionStorage` auto-detects chrome vs web; hydrates and syncs.

```
FTSO V2 (Flare Coston2) -> ftsoService.ts -> useFTSO hook -> Dashboard & Popup UI
                                    |-> Risk engine (volatility/drawdown)
                                    |-> Extension background alarms/badge
```

---

## Build & Run
Prereqs: Node 20+, npm 10+

```bash
npm install          # deps
npm run dev          # web dashboard at http://localhost:5173
npm run build        # production bundle in dist/ (multi-entry: main, popup, background, content)
npm run preview      # serve the production build locally
npm run lint         # lint
```

---

## Browser extension workflow
1) `npm run build`  
2) Chrome → Load unpacked → select `dist/`  
3) Click toolbar icon → popup HUD (400x600).  
4) Use “Open Full Dashboard ↗” to launch the full tab (uses `chrome.tabs.create` when available).  
5) Background worker (`src/extension/background.ts`) runs alarms, badge text/color.  

---

## Wallet & Network
- Injected provider detection (MetaMask first).  
- On connect: request accounts → enforce Flare (14) or Coston2 (114) via `wallet_switchEthereumChain` → fetch FLR balance immediately with `provider.getBalance` → format via `formatEther`.  
- Accounts-changed listener refreshes balance and state.  

---

## Risk model (simplified)
- Signals: volatility, volume signal (EWMA of price moves vs volume), pump probability (RSI overheat, order-book thinness, volume/price mismatch).
- Risk score = `(vol/100)*0.4 + volumeSignal*0.2 + pumpProbability*0.4` (clamped 0–1, shown 0–100).
- Demo mode simulates price paths; live mode uses FTSO V2 feeds.

---

## Persistence
| Key | Scope | Purpose |
| --- | --- | --- |
| `flare_wallet_address` | localStorage | Auto-reconnect wallet |
| `flare_watchlist` | localStorage | Favorites |
| `flare_auto_protect` | localStorage | Liquidation shield toggle |
| `extension_*` | chrome.storage.local | Popup HUD + badge prefs (via `useExtensionStorage`) |

---

## Key files
- `src/App.tsx` — main dashboard.
- `src/components/dashboard/*` — gauges, tables, charts, shield, heartbeat.
- `src/components/extension/PopupHUD.tsx` — popup HUD + “Open Full Dashboard” button.
- `src/hooks/use-flare.ts` — wallet, risk, watchlist, smart account/FDC sims.
- `src/hooks/useExtensionStorage.ts` — unified storage hook.
- `src/services/ftsoService.ts` — RPC + FTSO V2 feed fetcher.
- `src/extension/background.ts` — alarms + badge updates.

---

## Project structure (high level)
```
src/
├── App.tsx
├── components/
│   ├── dashboard/
│   └── extension/PopupHUD.tsx
├── hooks/
│   ├── use-flare.ts
│   ├── useExtensionStorage.ts
│   ├── use-demo-flr-balance-v2.ts
│   └── use-live-prices.ts
├── services/ftsoService.ts
├── extension/
│   ├── background.ts
│   └── content.ts
└── lib/ (types, utils)
```

---

## Demo ideas
- Toggle Live/Demo and watch RPC connection badges.
- Simulate market crash; observe logs, toasts, and shield behavior.
- Force risk to 95 to trigger emergency withdraw UI.
- Pin the extension; watch badge color/number update from background alarms.

---

## Roadmap (short)
1) Multi-tenant profiles + server persistence.  
2) Webhook/Slack alerts.  
3) Historical replay with oracle snapshots.  
4) Real on-chain automation when thresholds hit.  

---

PPT:https://docs.google.com/presentation/d/1RyWZrt78g0HzlZRPmNnximQ0FeeHo8VC/edit?usp=drive_link&ouid=118149885983894309943&rtpof=true&sd=true

Demo Video:https://drive.google.com/file/d/17pZZQP1D6yQh5LtmaW7TsNta-KeClmze/view?usp=drive_link

## License
MIT © GitHub, Inc. (see [`LICENSE`](./LICENSE)).
