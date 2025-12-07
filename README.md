
# FlareGuard – Institutional-Grade Crypto Risk Operations Dashboard

> A real-time **crypto danger meter** and risk operations dashboard powered by **Flare’s FTSO, Flare Data Connector (FDC), FAssets, and Flare Smart Accounts**.

  

-----

## 🧐 Overview & Problem Statement

Crypto traders typically react **too late** to volatility and pump-and-dump events. FlareGuard solves this by turning **Flare oracle data** into an **explainable, visual 0–100 risk score** for assets and the overall market, enabling automated, auditable risk management.

### Hybrid Experience

FlareGuard offers a **hybrid experience**: a full-screen web dashboard (institutional view) and an MV3 browser extension popup HUD (quick-access view).

-----

## ✨ Feature Highlights (Version 2.0.0)

### 📊 Risk Monitoring & Feeds

  * **FTSO V2 Live Feeds** – Resilient RPC rotation, live heartbeat widget, and real-time risk table, utilizing Flare's on-chain oracle feeds.
  * **Risk Engine** – Volatility, volume pressure, and pump signals blended into a **unified risk score** with history chart.
  * **Coverage** – Tracks blue-chip assets (BTC / ETH / XRP / FLR / SOL / USDC) with watchlists and event logs.

### 🛡️ Smart Account & Liquidation Controls (Simulated)

  * **Liquidation Shield** – Auto-protect toggle, emergency withdraw CTA, and logs for every guardrail trigger.
  * **Smart Account / FDC Simulations** – When risk spikes, simulated proofs and automation logs appear for auditing. Automated actions (rebalance/collateral) are simulated when risk crosses thresholds, demonstrating how Flare's stack can power **automatic on-chain safety logic**.

### 💻 Frontend & Extension UX

  * **Extension Popup HUD** – Compact 400x600 layout with favorite assets, risk gauge, liquidity shield status, and a link to the full dashboard.
  * **Background Service Worker** – Badge text/color based on risk level, minute-level alarms, and future alert hooks.
  * **Unified Persistence** – `useExtensionStorage` keeps wallet/watchlist/auto-protect keys in sync across web + `chrome.storage.local`.
  * **Demo Simulation Panel** – Manually trigger crashes, force risk levels, or replay scripted events for demos.

-----

## 🔗 Flare Tools Used & Integration

The core system consumes trustless oracle data while keeping analytics client-side for speed, cost, and privacy.

| Flare Component | Purpose | Details |
| :--- | :--- | :--- |
| **FTSO V2** | On-chain Oracle Feeds | Live price and time-series signals via `ftsoService.ts` and ethers v6. |
| **FDC** (simulated) | Pre-Trade Proofs | Pre-trade proof-style checks logged in hooks to audit automated actions. |
| **Smart Accounts** (simulated) | Automated Actions | Automated actions (rebalance/collateral) when risk crosses thresholds. |
| **FAssets** | Cross-Chain Risk Angle | Monitor divergence between native BTC and wrapped FBTC for bridge risk. |

-----

## 🧠 Risk Model (Simplified)

The core output is a **0–100 risk score** for each asset and an aggregated **Market Safety Score**.

  * **Signals:** volatility, volume signal (EWMA of price moves vs volume), pump probability (RSI overheat, order-book thinness, volume/price mismatch).

  * **Risk Score Formula:**

    $$
    \text{risk} = \text{baseVolRisk} + \text{accelerationRisk} + \text{eventRisk}
    $$

    *In the code:* Risk score $\approx (vol/100) \times 0.4 + \text{volumeSignal} \times 0.2 + \text{pumpProbability} \times 0.4$ (clamped 0–1, shown 0–100).

  * **Classification:**

      * 🟢 **0–40** → “chill / relatively safe”
      * 🟡 **40–70** → “shaky / caution”
      * 🔴 **70–100** → “danger / high risk”

-----

## 🧱 Architecture

The system is a **Frontend-only** application running in two modes (**Live** on Flare Coston2 or **Demo** with scripted simulations) consuming data directly from Flare RPCs.

  * **Frontend:** React 19, TypeScript, Tailwind v4, shadcn/ui.
  * **Backend:** None. Data comes from Flare RPC + local simulations.
  * **Data layer:** `use-flare.ts` orchestrates prices, wallet, logs, risk, watchlist, and smart account demos.
  * **Blockchain access:** ethers v6 `BrowserProvider` + `JsonRpcProvider` with fallback RPCs.

-----

## 🛠️ Build & Run

Prereqs: Node 20+, npm 10+

```bash
npm install          # deps
npm run dev          # web dashboard at http://localhost:5173
npm run build        # production bundle in dist/ (for extension)
```

### Browser Extension Workflow

1.  `npm run build`
2.  Chrome → Load unpacked → select `dist/`
3.  Click toolbar icon → popup HUD.
4.  Use “Open Full Dashboard ↗” to launch the full tab.

-----

## 🚀 Roadmap (Short-Term)

1.  Multi-tenant profiles + server persistence.
2.  Webhook/Slack alerts.
3.  Historical replay with oracle snapshots.
4.  **Real on-chain automation** when thresholds hit (transitioning from simulation).

-----

## 📄 Key Files

  * `src/App.tsx` — Main dashboard.
  * `src/components/extension/PopupHUD.tsx` — Popup HUD component.
  * `src/hooks/use-flare.ts` — Core logic for wallet, risk, and simulations.
  * `src/services/ftsoService.ts` — RPC + FTSO V2 feed fetcher.
  * `src/extension/background.ts` — Alarms + badge updates.

-----
PPT:https://docs.google.com/presentation/d/1RyWZrt78g0HzlZRPmNnximQ0FeeHo8VC/edit?usp=drive_link&ouid=118149885983894309943&rtpof=true&sd=true

vIDEO: https://drive.google.com/file/d/17pZZQP1D6yQh5LtmaW7TsNta-KeClmze/view?usp=drive_link

## License

MIT © GitHub, Inc.