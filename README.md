# FlareGuard – Crypto Market Safety & Pump-Alert Dashboard

> A real-time **crypto danger meter** powered by **Flare’s FTSO, Flare Data Connector (FDC), FAssets, and Flare Smart Accounts**.

---

## 🧩 What We Actually Built

FlareGuard is a real-time crypto market safety dashboard that turns **Flare oracle data** into a **0–100 risk score** for each token and for the overall market.  

We detect **pump/dump patterns** from short-term price movements, classify tokens as 🟢 safe, 🟡 shaky, or 🔴 dangerous, and trigger a **Flare Smart Account** when market risk crosses a threshold. The frontend shows a simple “danger meter” for normal users; the backend and contracts prove how Flare’s stack can power **automatic on-chain safety logic**. :contentReference[oaicite:0]{index=0}

---

## 🎯 Problem

Crypto traders typically react **too late** to volatility and pump-and-dump events.  
There is no simple, on-chain, real-time **“danger meter”** that tells a normal user when:

- A specific token is entering a risky state, or  
- The **entire market** is heating up into danger zone.

FlareGuard solves this with an **explainable, visual risk score** and an **automated Smart Account reaction**.

---

## 💡 Our Solution (High-Level)

1. Use **FTSO** (Flare Time Series Oracle) + **FDC** (Flare Data Connector) to pull token prices on Flare.
2. Compute:
   - 5m and 15m price changes  
   - Volatility over a short window  
   - Pump/dump flags  
3. Convert that into a **0–100 risk score**:

   \[
   \text{risk} = \text{baseVolRisk} + \text{accelerationRisk} + \text{eventRisk}
   \]

4. Aggregate per-token risks into a **Market Safety Score**.
5. Call a **Flare Smart Account** with `(marketRisk, hasPump)`:
   - If risk is high or a pump is detected → set `triggered = true` and emit an event.
6. Frontend shows:
   - Live Market Safety Gauge  
   - Per-asset risk table  
   - Pump alert banner  
   - Smart Account status (SAFE / TRIGGERED)
7. (Optional) Use **FAssets** to compare risk of **native BTC vs FAsset BTC on Flare** for a cross-chain safety story.

---

## 🧠 Core Features (MVP)

- **Real-Time Token Metrics**
  - Current price (FTSO via FDC)
  - 5m / 15m percentage change
  - Volatility index (over recent N points)
  - Pump / dump flags when price moves more than X% in Y minutes

- **Per-Token Risk Score (0–100)**
  - 🟢 0–40 → “chill / relatively safe”
  - 🟡 40–70 → “shaky / caution”
  - 🔴 70–100 → “danger / high risk”

- **Market Safety Score**
  - Average risk across tracked tokens
  - Displayed as a big, color-coded gauge at the top of the dashboard

- **Smart Account Auto-Reaction**
  - Smart Account contract stores:
    - `lastMarketRisk`
    - `triggered`
    - `lastUpdatedAt`
    - `triggerCount`
  - `updateRisk(uint256 marketRisk, bool hasPump)`:
    - Called by backend when risk is recalculated
    - If `marketRisk > 80` or `hasPump == true` → sets `triggered = true` and emits an event
  - Frontend reads this status and shows:
    - “Smart Account: SAFE / TRIGGERED”
    - Last triggered time

- **Optional FAssets Cross-Chain Angle**
  - Track BTC vs FAsset BTC
  - Show:
    - Native BTC risk
    - FAsset BTC risk
    - Difference
  - Demonstrates: “We can risk-score both native assets and their FAsset representations on Flare.”

---

## 🧱 Tech Stack

### 🔗 Flare Components

- **FTSO (Flare Time Series Oracle)** – price + time-series signals  
- **FDC (Flare Data Connector)** – backend integration layer to retrieve FTSO data  
- **FAssets** – optional demo of cross-chain risk (BTC vs FAsset BTC)  
- **Flare Smart Accounts** – contract that reacts when market risk is extreme  

### 🌐 Backend

- Node.js (JavaScript)
- Express (via `backend/src/index.js`)
- Custom risk engine + pump detector
- Ethers/Web3 (from `contracts/interact.js` pattern) to talk to the Smart Account

**Key backend files:**

- `backend/src/flare/ftsoClient.js`  
  - FTSO/FDC client for pulling token prices from Flare

- `backend/src/core/riskEngine.js`  
  - Implements the risk formula, normalization to 0–100

- `backend/src/core/pumpDetector.js`  
  - Detects pump/dump events from short-term price changes

- `backend/src/services/metricsService.js`  
  - Orchestrates fetching prices, computing risk, and aggregating market metrics

- `backend/src/routes/metricsRoute.js`  
  - Exposes `/api/metrics` (or similar) for the frontend

- `backend/src/index.js`  
  - Express app entrypoint + scheduler that periodically recomputes metrics and calls the Smart Account

### 🖥 Frontend

- React
- Simple SPA with Tailwind-style layout (or CSS as defined)
- Polls backend API for live metrics

**Key frontend files:**

- `frontend/src/api/metricsApi.js`  
  - Small client to call backend metrics API

- `frontend/src/pages/Dashboard.jsx`  
  - Main page that wires everything together

- `frontend/src/components/MarketSafetyGauge.jsx`  
  - Big gauge showing Market Safety Score and color state

- `frontend/src/components/AssetRiskTable.jsx`  
  - Table of tokens with price, risk, and pump/dump flags

- `frontend/src/components/PumpAlertBanner.jsx`  
  - Banner that appears when any token is in pump/dump state

- `frontend/src/components/SmartAccountStatus.jsx`  
  - Reads and displays Smart Account triggered status + last update

### ⚖️ Smart Contracts

- `contracts/FlareGuardSmartAccount.sol`  
  - Core Smart Account–style contract storing:
    - `lastMarketRisk`, `triggered`, `lastUpdatedAt`, `triggerCount`
  - `updateRisk(marketRisk, hasPump)` and `resetTrigger()`
  - Emits events used by the backend / explorer

- `contracts/deploy.js`  
  - Script to deploy `FlareGuardSmartAccount` to Flare

- `contracts/interact.js`  
  - Example script to call `updateRisk` and read status

- `contracts/build/FlareGuardSmartAccount.json`  
  - Compiled ABI + bytecode

---

## 📁 Repository Structure

```text
backend/
  src/
    flare/
      ftsoClient.js          # FTSO + FDC price client
    core/
      riskEngine.js          # Risk score calculation
      pumpDetector.js        # Pump/dump detection logic
    services/
      metricsService.js      # Orchestrates prices → risk → metrics
    routes/
      metricsRoute.js        # HTTP API for metrics
    index.js                 # Express app + scheduler

frontend/
  src/
    api/
      metricsApi.js          # Calls backend metrics endpoint
    pages/
      Dashboard.jsx          # Main dashboard page
    components/
      MarketSafetyGauge.jsx
      AssetRiskTable.jsx
      PumpAlertBanner.jsx
      SmartAccountStatus.jsx

contracts/
  FlareGuardSmartAccount.sol # Smart Account contract
  deploy.js
  interact.js
  build/
    FlareGuardSmartAccount.json

architecture.png             # High-level system diagram
pitch.txt                    # 30–60 second oral pitch
risk-formula.md              # Detailed math for risk scoring
api-definition.md            # Backend API contract
demo-script.md               # Step-by-step live demo flow
README.md                    # ← You are here
