# Chronicles of Stellar

> **Nostalgic 8-bit Arcade Gaming Meets Autonomous Web3 & AI Infrastructure.**

[![Stellar](https://img.shields.io/badge/Built_on-Stellar_Mainnet-14B8E6?logo=stellar&logoColor=white)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart_Contracts-Soroban-8B5CF6?logo=rust&logoColor=white)](https://soroban.stellar.org)
[![Phaser](https://img.shields.io/badge/Game_Engine-Phaser_CE_2.20.2-41aa56)](https://phaser.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live → [chroniclesofstellar.online](https://chroniclesofstellar.online)**

---

<img width="1236" height="834" alt="image" src="https://github.com/user-attachments/assets/db03d301-1efd-430e-b2b8-e8a2a33c7ecf" />


## What is Chronicles of Stellar?

Chronicles of Stellar is an **8-bit browser-native PvP street brawler** built on Stellar Mainnet. Pick a fighter. Place a wager. Fight a real opponent — human or AI. Get paid instantly on-chain.

No app downloads. No chain switching. No testnet faucets. Connect your Freighter wallet, sign one transaction, and start fighting.

**The world's first arcade brawler where AI agents hold wallets, negotiate bounties, and settle stakes on-chain.**

---

## Smart Contract

| | |
|---|---|
| **Contract Address** | `CBFUIRK4A4FPHVBH5KGWUBMWFUT5BFWYHIWDWGDSYOZZWJXQD55LU24H` |
| **Network** | Stellar Mainnet |
| **Language** | Rust (Soroban SDK 27.0.1) |
| **Admin** | `GB36H54JHRVT5Q7SJM46KXIJB5J5VPYR7QNJQR4VZCYUCZGLTZ26KD7N` |
| **Verified** | ✅ On-chain — `get_admin()` and `get_game_state()` confirmed live |
| **Explorer** | [Stellar Explorer](https://stellar.expert/explorer/public/contract/CBFUIRK4A4FPHVBH5KGWUBMWFUT5BFWYHIWDWGDSYOZZWJXQD55LU24H) |

---

## Features

<img width="1203" height="741" alt="Screenshot 2026-07-28 at 8 08 40 AM" src="https://github.com/user-attachments/assets/e426f4bc-f534-42af-86eb-24f41a892367" />


### 🎮 Core Gameplay
- **5 playable characters** — Brian (balanced), Gloria (glass cannon), Rebel (speedster), Brawler (tank), Elite (heavy hitter)
- **5 Acts** — The Streets, The Network, Sector 09, The Core, The Final Showdown — each with unique enemies, boss fights, and narrative dialogue
- **Combo system** — chain attacks for bonus score (+50 per combo level, resets on hit)
- **Arcade HUD** — health bars, stamina meters, combo counters, countdown timer, boss health bar

### ⚔️ PvP Arena
- **Real-time 1v1 bouts** with XLM wagers escrowed on-chain
- **Create bout** → **Accept bout** → **Submit score** → **Auto-settle** with instant payout
- 10% house commission funds the treasury for bot bounty payouts

### 🤖 AI Bot Betting
- **AI-powered opponents** with autonomous Soroban wallets
- **Tiered payouts** — 3x for high score + fast time, 2x for medium, 1x for base
- **AI NPCs generate dialogue** powered by Gemini API with local fallback

### 🏆 On-Chain Leaderboard
- Player reputation, level, win/loss record stored on-chain
- Off-chain leaderboard via Firebase Firestore for fast reads
- Ledger transaction history visible in-app

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    PLAYER'S BROWSER                     │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  Phaser   │◄──►│  React   │◄──►│   Freighter      │  │
│  │  CE 2.20  │    │  UI/HUD  │    │   Wallet API     │  │
│  └──────────┘    └─────┬────┘    └────────┬─────────┘   │
│                        │                   │            │
└────────────────────────┼───────────────────┼────────────┘
                         │                   │
            ┌────────────▼───────────────────▼────────────┐
            │              STELLAR MAINNET                │
            │                                             │
            │  ┌──────────────────────────────────────┐   │
            │  │  Soroban Smart Contract              │   │
            │  │  CBFUIRK4A4FPHVBH5KGWUBMWFUT5BFWY    │   │
            │  │                                      │   │
            │  │  • Player State (rep, level, wins)   │   │
            │  │  • PvP Escrow (create → accept →     │   │
            │  │    submit → auto-settle)             │   │
            │  │  • Bot Betting (tiered payouts)      │   │
            │  │  • Treasury (house funds)            │   │
            │  └──────────────────────────────────────┘   │
            │                                             │
            │  Horizon API ◄── Balance / Account queries  │
            │  Soroban RPC  ◄── Contract invocations      │
            └─────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Game Engine** | Phaser CE 2.20.2 | 8-bit rendering, physics, input, audio, state management |
| **Frontend** | React 18 + TypeScript | UI shell, wallet connection, HUD overlays, panels |
| **Build** | Vite 5 | Mainnet/testnet mode switching, tree shaking, chunk splitting |
| **Styling** | Tailwind CSS | Game Boy arcade theme — utility-first, zero runtime |
| **Smart Contracts** | Rust + Soroban SDK 27.0.1 | On-chain player state, escrow, bot betting, treasury |
| **Blockchain** | Stellar Mainnet | Sub-second finality, < $0.01 tx fees |
| **Wallet** | @stellar/freighter-api | Non-custodial signing, 15s timeout handling |
| **Auth** | Firebase Auth | Passwordless email link authentication |
| **Database** | Firebase Firestore | Player profiles, leaderboard, chat history |
| **AI** | Gemini API + Local Fallback | NPC dialogue, bounty negotiation, autonomous behavior |
| **Deploy** | Vercel + Firebase Hosting | Auto-deploy on push, SSL, custom domain |

---

## Smart Contract API

| Method | Auth | Description |
|--------|------|-------------|
| `initialize(admin)` | — | Set admin, initialize game state (v2, 0 players, 0 bouts) |
| `init_player(player)` | player | Register fighter with 25 rep, level 1 |
| `approve_action(player, action)` | player | unlock_keycard, open_firewall, record_bout |
| `create_bout(challenger, bet)` | challenger | Open PvP challenge with XLM escrow |
| `accept_bout(opponent, bout_id)` | opponent | Accept challenge, lock opponent's escrow |
| `submit_score(player, bout_id, score)` | player | Submit score, auto-resolve when both submitted |
| `create_bot_bout(player, bet, time_limit)` | player | Start bot fight with XLM wager |
| `resolve_bot_bout(bout_id, score, time)` | — | Resolve bot fight, tiered payout |
| `get_bout(bout_id)` | — | Read bout details |
| `get_open_bouts()` | — | List up to 20 open challenges |
| `get_treasury()` | — | Read treasury balance |
| `set_treasury(admin, amount)` | admin | Set house treasury |
| `set_reputation(admin, player, rep)` | admin | Override player reputation |
| `advance_level(admin, player)` | admin | Level up (max 7) |
| `reset_player(admin, player)` | admin | Reset player to defaults |

---

## Project Structure

```
Chronicles-of-Stellar/
├── contracts/chronicle-game-state/     # Soroban smart contract (Rust)
│   ├── src/
│   │   ├── lib.rs                      # Contract: player state, PvP escrow, bot betting
│   │   └── test.rs                     # 35+ unit tests
│   ├── scripts/
│   │   ├── deploy-mainnet.sh           # Mainnet deploy + initialize
│   │   └── deploy-testnet.sh           # Testnet deploy + initialize
│   └── test_snapshots/                 # Soroban test snapshots
├── web/                                # Vite + React frontend
│   ├── src/
│   │   ├── game/                       # Phaser CE game engine
│   │   │   ├── states/                 # main-menu, charselect, gameplay, pvparena, act01-05
│   │   │   ├── entities/               # hero, enemies, NPCs (foes)
│   │   │   └── ui/                     # HUD, dialog boxes, menus
│   │   ├── blockchain/                 # Stellar SDK, Freighter, PvP escrow client
│   │   ├── ai/                         # Gemini API, NPC context, bounty manager
│   │   ├── components/                 # React overlay (auth, wallet, leaderboard, ledger)
│   │   ├── events/                     # EventHub (game ↔ UI communication)
│   │   ├── hooks/                      # useGameState, useFirebaseAuth
│   │   └── services/                   # Firebase, Firestore, auth
│   └── public/
│       └── phaser.js                   # Phaser CE bundle
├── firebase.json                       # Firebase Hosting config
├── firestore.rules                     # Firestore security rules
└── README.md
```

---

## Quick Start

### Prerequisites
```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli
node -v  # >= v20
```

### Local Development
```bash
# Clone
git clone https://github.com/Jayram2204/Chronicles-of-Stellar-.git
cd Chronicles-of-Stellar-

# Smart contract
cd contracts/chronicle-game-state
cargo build --target wasm32-unknown-unknown --release
cargo test

# Frontend
cd ../../web
npm install
npm run dev
# → http://localhost:5173
```

### Build for Mainnet
```bash
cd web
npm run build:mainnet
```

### Deploy
```bash
# Contract (mainnet)
cd contracts/chronicle-game-state
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/chronicle_game_state.wasm \
  --network mainnet \
  --source admin
./scripts/deploy-mainnet.sh

# Frontend (auto-deploys on push to main via Vercel)
git push origin main
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_STELLAR_NETWORK` | ✅ | `PUBLIC` (mainnet) or `TESTNET` |
| `VITE_SOROBAN_RPC_URL` | ✅ | `https://mainnet.sorobanrpc.com` |
| `VITE_SOROBAN_CONTRACT_ID` | ✅ | Soroban contract address |
| `VITE_HORIZON_URL` | ⬜ | `https://horizon.stellar.org` (auto-detected) |
| `VITE_STELLAR_PASSPHRASE` | ⬜ | Network passphrase (auto-detected) |
| `VITE_GEMINI_API_KEY` | ⬜ | AI dialogue (empty = local fallback) |
| `VITE_FIREBASE_*` | ⬜ | Firebase config (hardcoded fallbacks) |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Phaser CE (not Phaser 3)** | Stable, battle-tested, zero breaking changes, perfect for pixel art |
| **Soroban (not EVM)** | Native Stellar integration, Rust safety, sub-cent gas, fast finality |
| **Freighter-only wallet** | Single wallet = simpler UX, no chain switching, no wallet popup fatigue |
| **Client-side architecture** | No backend to maintain, all state on-chain, all reads via Soroban RPC |
| **Game Boy palette** | Nostalgic aesthetic, high contrast, accessibility-friendly |
| **Firebase for off-chain** | Fast leaderboard reads, auth, no custom server needed |

---

## Live Deployment

| Service | URL |
|---------|-----|
| **Game** | [chroniclesofstellar.online](https://chroniclesofstellar.online) |
| **Contract** | [Stellar Expert](https://stellar.expert/explorer/public/contract/CBFUIRK4A4FPHVBH5KGWUBMWFUT5BFWYHIWDWGDSYOZZWJXQD55LU24H) |
| **Vercel** | Auto-deploys on push to `main` |
| **GitHub** | [Jayram2204/Chronicles-of-Stellar-](https://github.com/Jayram2204/Chronicles-of-Stellar-) |

---

## Roadmap

- [x] 5-Act story mode with boss encounters
- [x] PvP Arena with on-chain escrow
- [x] AI bot betting with tiered payouts
- [x] On-chain leaderboard and reputation system
- [x] Smart contract deployed on Stellar Mainnet
- [x] Custom domain with SSL
- [x] Auto-deploy pipeline (Vercel + GitHub)
- [ ] Tournament brackets with seeded elimination
- [ ] Custom fighter skins (on-chain metadata)
- [ ] Expanded AI agent personalities and difficulty tiers
- [ ] Cross-chain wagering pools
- [ ] Community-built arcade sectors
- [ ] Mobile browser optimization (touch controls)



---

<p align="center">
  <b>Play now → <a href="https://chroniclesofstellar.online">chroniclesofstellar.online</a></b><br>
  <sub>Connect Freighter wallet → Enter PvP Arena → Fight for real stakes</sub>
</p>
