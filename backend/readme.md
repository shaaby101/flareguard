Here is the updated **`backend/README.md`** in a clean copy-paste format.

**File Path:** `backend/README.md`

````markdown
# FlareGuard Backend 🛡️

The "Brain" of the FlareGuard ecosystem. This Node.js service monitors crypto markets in real-time using **Flare FTSOv2**, calculates risk metrics, and autonomously updates a **Flare Smart Account** on-chain when danger is detected.

## 🚀 Key Features

* **FTSOv2 Integration**: Fetches decentralized, censorship-resistant price feeds (BTC/USD) directly from the Flare Time Series Oracle.
* **Hybrid Data Model**: Uses real blockchain data for primary assets and mocked simulation for demo purposes (ETH/XRP).
* **Risk Engine**: Calculates a 0-100 "Safety Score" based on volatility (Standard Deviation) and momentum (Pump/Dump detection).
* **Reactive Smart Account**: Automatically triggers an on-chain transaction (`updateRisk`) when the market risk exceeds 80 or a pump is detected.
* **REST API**: Exposes processed metrics to the frontend dashboard.

## 📂 Project Architecture

```ascii
[FTSO Oracle] <---(1) Real Prices---- [Web3 Service]
                                            |
                                            v
                                     [Metrics Service] <----(2) Calculate Risk
                                            |
                                            +---> (3) IF Risk > 80:
                                            |     [Sign Transaction]
                                            |           |
                                            |           v
                                            |     [FlareGuard Smart Contract]
                                            |      (On-Chain State Update)
                                            |
[Frontend UI] <----(4) Fetch JSON----- [API Server]
````

## 🛠️ Setup & Installation

### 1\. Prerequisites

  * Node.js (v18 or higher)
  * A Flare Coston2 Testnet Wallet (with C2FLR tokens for gas)
  * The deployed `FlareGuardRiskAccount` contract address

### 2\. Install Dependencies

Navigate to the backend folder and install the required packages:

```bash
cd backend
npm install
```

### 3\. Configure Environment

Create a `.env` file in the root of the `backend/` folder. Copy the template below and fill in your details:

```env
# Server Configuration
PORT=3000

# Flare Network (Coston2 Testnet)
FLARE_RPC_URL=[https://coston2-api.flare.network/ext/C/rpc](https://coston2-api.flare.network/ext/C/rpc)

# --- SECURITY CREDENTIALS ---

# 1. Backend Bot Wallet (Signer)
# The Private Key of the wallet that will sign 'updateRisk' transactions.
# MUST hold C2FLR tokens for gas.
OPERATOR_PRIVATE_KEY=0xYourPrivateKeyHere

# 2. Smart Contract
# The address of the deployed FlareGuardRiskAccount contract.
RISK_CONTRACT_ADDRESS=0xYourContractAddressHere
```

## 🏃‍♂️ Running the Server

Start the production server:

```bash
npm start
```

For development (auto-restarts on file changes):

```bash
npm run dev
```

You should see:

```text
🚀 FlareGuard Backend running on http://localhost:3000
[Metrics] Risk: 35 | BTC Price: $65432.10
```

## 📡 API Documentation

### Get Market Status

Returns the consolidated risk profile, token prices, and smart account trigger status.

  * **Endpoint:** `GET /api/metrics/status`
  * **Response:**
    ```json
    {
      "success": true,
      "data": {
        "timestamp": 1715421234000,
        "status": "SAFE",        // SAFE, CAUTION, or DANGER
        "averageRisk": 35,       // 0-100 Score
        "tokens": [
          {
            "symbol": "BTC",
            "price": 65120.50,
            "isPump": false,
            "riskScore": 30
          }
        ]
      }
    }
    ```

## 🧩 Key Files

  * **`services/web3_services.js`**: The most critical file. It connects to the **Flare Contract Registry** to find **FTSOv2**, fetches real prices, and manages the wallet connection for triggering the Smart Account.
  * **`services/metricsService.js`**: The poller loop. It gathers data, runs the math, and decides *when* to trigger the blockchain transaction.
  * **`core/riskEngine.js`**: Contains the mathematical formulas for Volatility and Risk Scoring.
  * **`core/pumpDetector.js`**: Logic for detecting sudden \>3% price movements.

## ⚠️ Troubleshooting

  * **`MODULE_NOT_FOUND`**: Run `npm install` again to ensure all dependencies (ethers, express, dotenv) are downloaded.
  * **`Smart Account Update Failed`**:
    1.  Check if `RISK_CONTRACT_ADDRESS` in `.env` is correct.
    2.  Check if your wallet (`OPERATOR_PRIVATE_KEY`) has **C2FLR** tokens for gas.
    3.  Ensure your wallet address is **whitelisted/owner** on the smart contract.

<!-- end list -->

```
```