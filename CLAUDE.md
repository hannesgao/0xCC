# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**0xCC** is a cross-chain P2P payment and bill splitting application with ZK privacy features, built for the Polkadot ecosystem. The project enables users to send payments, split bills, and manage group expenses privately using zero-knowledge proofs while maintaining transparency where needed.

## Project Status

This is a **hackathon project** with a **tight deadline** (July 18, 2025 13:00). The current repository contains only documentation (README.md and LICENSE) - no code has been implemented yet.

## Technical Architecture

### Planned Tech Stack
- **Smart Contracts**: ink! (Polkadot native smart contracts)
- **Frontend**: React.js + Polkadot.js API + Talisman wallet integration
- **Cross-chain**: XCM (Cross-Chain Message Passing) + Hyperbridge Protocol
- **Privacy**: ZK-SNARKs for payment privacy
- **Storage**: IPFS for receipts and transaction metadata

### Core Features to Implement

#### Milestone 1 (Hackathon - Due July 18, 2025)
1. **Cross-Chain Payments**: Send payments between different parachains with multi-token support
2. **Bill Splitting with ZK Privacy**: Create expense groups, split bills automatically with ZK proofs hiding individual amounts
3. **Social Payment Features**: Payment requests, group expense tracking, social notifications

#### Milestone 2 (Following 30 days)
1. **Advanced ZK Features**: Private balance proofs, anonymous group payments, ZK-based credit scoring
2. **Enhanced Cross-Chain Support**: External chains (Ethereum, Bitcoin via bridges), automated arbitrage
3. **Enterprise Features**: Business payment processing, subscription management, analytics

## Development Commands

**Note**: The project is in early planning phase. No build scripts, package managers, or development tools have been set up yet. The following commands will need to be established as development progresses:

### Expected Commands (To Be Implemented)
- Build: `cargo build` (for ink! contracts) + `npm run build` (for React frontend)
- Test: `cargo test` (for contracts) + `npm test` (for frontend)
- Lint: `cargo clippy` (for Rust) + `npm run lint` (for JavaScript/TypeScript)
- Development: `npm run dev` (for frontend development server)

## Project Structure (To Be Created)

```
0xCC/
├── contracts/          # ink! smart contracts
│   ├── payment/        # Core payment logic
│   ├── bill-splitting/ # Bill splitting with ZK privacy
│   └── cross-chain/    # Cross-chain message handling
├── frontend/           # React.js application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom hooks for blockchain interaction
│   │   └── utils/      # Utility functions
├── zk-circuits/        # Zero-knowledge proof circuits
└── docs/              # Additional documentation
```

## Key Implementation Priorities

1. **Time-Critical**: Focus on core payment functionality first
2. **Priority Order**: Basic payments → Bill splitting → ZK privacy → Cross-chain
3. **Fallback Strategy**: Start with single-chain version if cross-chain integration is complex

## Target Prize Categories
- Main Track: $5,000 (Polkadot-based cross-chain solution)
- Kusama Track: Zero-Knowledge (2000 DOT) + Art & Social (2000 DOT)
- ink! Bounty: $10,000 (Smart contracts)
- Marketing Bounty: $5,000 (B2C use case)
- Hyperbridge Bounty: $5,000 (Cross-chain messaging)

## Real-World Use Cases
- **Restaurant Bill Splitting**: Friends scan QR code, bill split automatically with ZK privacy
- **Travel Expense Management**: Group expense account with private individual contributions
- **Subscription Sharing**: Netflix/Spotify split among friends with automated payments

## Development Notes
- Project name "0xCC" stands for "Cross-Chain"
- Focus on clear B2C use cases that people can understand
- Emphasize privacy + convenience combination
- Target existing crypto users who understand the benefits
- Memorable developer-friendly branding