# FlareGuard Backend

Backend service for the FlareGuard Crypto Market Safety Dashboard.

## Architecture
1. **FTSO Integration**: We poll the Flare Time Series Oracle to get decentralized, reliable price feeds for BTC, ETH, XRP.
2. **Risk Engine**: We calculate a 0-100 Risk Score based on volatility (Standard Deviation) and 5-minute price acceleration (Pump/Dump detection).
3. **Flare Smart Account**: When `riskScore > 75` or a Pump is detected, we execute `updateRisk` on our custom `FlareGuardRiskAccount` contract. This allows other dApps to read the risk state directly from the chain.
4. **FAssets (Optional)**: We monitor the peg of FAssets (e.g., BTC vs fBTC) to alert on de-pegging events.

## Setup
1. `npm install`
2. Create `.env` with `OPERATOR_PRIVATE_KEY` and `RISK_CONTRACT_ADDRESS`.
3. `npm start` (Runs `ts-node src/server.ts`)

## API Endpoints
- `GET /api/status`: Returns current market risk, token breakdown, and the actual on-chain Smart Account status.
- `GET /api/fassets`: Returns peg analysis for FAssets.