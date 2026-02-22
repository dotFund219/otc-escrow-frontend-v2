# OTC Escrow Frontend (v2)

This repository contains the React + TypeScript frontend for the OTC escrow application. It is built with **Vite** and uses modern libraries like **wagmi**, **viem**, and **@tanstack/react-query** to interact with Ethereum-compatible blockchains and provide a simple trading interface.

---

## 🚀 Features

- Connect wallet via **MetaMask**
- View public order book with live updates
- Create & take orders using an on-chain escrow contract
- Real-time price feeds from Binance WebSocket API
- UI components built with Tailwind CSS and custom design system
- Authentication using SIWE (Sign-In with Ethereum)

## 🛠️ Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask browser extension (for development interacting with chains)
- Access to a JSON-RPC endpoint (configured via env vars)

## 🔧 Setup

1. **Install dependencies**

   ```bash
   npm install
   # or yarn install
   ```

2. **Environment variables**

   Copy the example file and adjust values:

   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `VITE_CHAIN_ID` – target chain ID (e.g. `1`, `137`)
   - `VITE_RPC_URL_<CHAINID>` – RPC endpoint for each chain
   - `VITE_CONTRACT_*` – deployed contract addresses (orders, config, escrow, admin)
   - `VITE_TOKEN_*` – token contract addresses used by the app
   - `VITE_FEE_BPS` – platform fee in basis points (e.g. `20` = 0.20%)
   - `VITE_API_BASE` – backend API server base URL (if applicable)

3. **Run development server**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173 in your browser.

4. **Build for production**

   ```bash
   npm run build
   ```

   Preview:

   ```bash
   npm run preview
   ```

## 🧱 Project Structure

```
src/
├─ app/                # top-level routing and layout
├─ features/           # domain-specific UI & hooks
│   ├─ auth/           # SIWE authentication
│   ├─ markets/        # market mock and panel
│   ├─ orders/         # order book & creation
│   ├─ realtime/       # socket hooks
│   ├─ wallet/         # wallet balance panel
├─ lib/                # reusable helpers and API clients
│   ├─ api/            # server API wrappers
│   ├─ web3/           # contract interaction functions
│   ├─ tokenMeta.ts    # token metadata caching/formatting
│   └─ contract.ts     # addresses, RPC helpers, abis
├─ wagmi/              # wagmi configuration
└─ pages/              # route components (Dashboard, Trade)
```

## 💡 Notes

- All Korean comments have been translated; code is fully English-documented.
- Pricing uses Binance public API; keep in mind rate limits.
- Fee is currently set by environment variable; consider migrating on-chain.
- The order book automatically refreshes every 5 seconds and supports pagination.

## 🧪 Testing & Linting

- `npm run lint` - run ESLint over the codebase.
- Add your own unit/integration tests as needed. (No tests included by default.)

## 🤝 Contributing

Feel free to submit PRs, open issues, or reach out for help. Keep changes focused and document new functionality.

---

Happy trading! 💰
