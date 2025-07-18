# 0xCC Demo Scenarios and Test Data

This document contains comprehensive demo scenarios and test data for the 0xCC cross-chain P2P payment system with ZK privacy features.

## Overview

0xCC is a hackathon project that demonstrates:
- **Cross-chain P2P payments** for the Polkadot ecosystem
- **Zero-knowledge privacy protection** for payment amounts
- **Bill splitting functionality** with smart contracts
- **XCM integration** for cross-chain messaging
- **Modern React frontend** with Polkadot.js integration

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Smart Contracts │    │  ZK Circuits    │
│   (React + TS)  │    │  (ink! + Rust)   │    │  (Circom)       │
│                 │    │                  │    │                 │
│ • Bill Creation │    │ • Bill Splitting │    │ • Balance Proof │
│ • Payment UI    │────┤ • XCM Handler    │────┤ • Amount Proof  │
│ • ZK Demo       │    │ • Event Handling │    │ • Verification  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │  Polkadot API    │
                    │  (WebSocket)     │
                    └──────────────────┘
```

## Demo Scenarios

### Scenario 1: Friends Dinner Split 🍽️

**Description**: Four friends split a restaurant bill equally with public payment amounts.

**Participants**:
- Alice: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY (Creator)
- Bob: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty
- Charlie: 5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y
- David: 5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy

**Bill Details**:
```json
{
  "title": "Sushi Restaurant Dinner",
  "description": "Amazing dinner with the team after hackathon",
  "totalAmount": "2.8",
  "creator": "Alice",
  "participants": [
    {"name": "Alice", "amount": "0.7", "paid": false},
    {"name": "Bob", "amount": "0.7", "paid": false},
    {"name": "Charlie", "amount": "0.7", "paid": false},
    {"name": "David", "amount": "0.7", "paid": false}
  ],
  "deadline": "2025-07-20T23:59:59",
  "usePrivateAmounts": false
}
```

**Expected Flow**:
1. Alice creates the bill through the frontend
2. Contract emits `BillCreated` event
3. Each participant pays their 0.7 DOT share
4. Contract tracks payments and completion status
5. Bill is marked complete when all payments received

### Scenario 2: Apartment Utilities with Privacy 🏠

**Description**: Roommates split monthly utilities with hidden individual amounts using ZK proofs.

**Participants**:
- Bob: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty (Creator)
- Alice: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
- Charlie: 5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y

**Bill Details**:
```json
{
  "title": "Monthly Utilities Bill",
  "description": "Electricity, water, and internet for July",
  "totalAmount": "1.5",
  "creator": "Bob",
  "participants": [
    {"name": "Alice", "amount": "0.6", "paid": false},
    {"name": "Bob", "amount": "0.5", "paid": false},
    {"name": "Charlie", "amount": "0.4", "paid": false}
  ],
  "deadline": "2025-07-25T23:59:59",
  "usePrivateAmounts": true
}
```

**ZK Privacy Features**:
- Individual payment amounts are hidden from other participants
- ZK proofs verify payment capability without revealing balance
- Only the total bill amount is public
- Each participant generates a proof: `prove(amount ≤ balance)`

**Expected Flow**:
1. Bob creates bill with privacy enabled
2. System generates ZK proofs for each participant
3. Payments are processed with hidden amounts
4. Contract verifies proofs while maintaining privacy
5. Only completion status is publicly visible

### Scenario 3: Multi-Bill Transportation 🚕

**Description**: Multiple bills for different trip segments, demonstrating complex payment flows.

**Bills**:

**Bill 1 - Taxi to Airport**:
```json
{
  "title": "Taxi to Airport",
  "creator": "Charlie",
  "totalAmount": "0.8",
  "participants": [
    {"name": "Alice", "amount": "0.4"},
    {"name": "Charlie", "amount": "0.4"}
  ],
  "usePrivateAmounts": false
}
```

**Bill 2 - Train Tickets (Private)**:
```json
{
  "title": "Train Tickets",
  "creator": "David", 
  "totalAmount": "1.2",
  "participants": [
    {"name": "Bob", "amount": "0.6"},
    {"name": "David", "amount": "0.6"}
  ],
  "usePrivateAmounts": true
}
```

### Scenario 4: High-Volume Testing 📊

**Description**: Stress testing with multiple concurrent bills and payments.

**Test Parameters**:
- 10 bills created simultaneously
- 50 total participants across all bills
- Mix of public and private payments
- Various amount distributions
- Time-based payment deadlines

## Test Data Sets

### Mock Polkadot Accounts

```javascript
const testAccounts = {
  alice: {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    name: 'Alice',
    initialBalance: '15.0 DOT'
  },
  bob: {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', 
    name: 'Bob',
    initialBalance: '20.0 DOT'
  },
  charlie: {
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    name: 'Charlie', 
    initialBalance: '12.0 DOT'
  },
  david: {
    address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    name: 'David',
    initialBalance: '18.0 DOT'
  }
};
```

### Sample ZK Proofs

**Balance Proof Structure**:
```json
{
  "pi_a": [
    "0x42508730ad28e43f3bbb53fb26b8084acba7289c5332c041cfae395240a60e75",
    "0x0374c9d626ab2329705f567df6dd9ed7e72de1a34a7e081754609c96874fb9b5",
    "0x1"
  ],
  "pi_b": [
    ["0xc4dc42a1fabf44709cb4b02aef4a952709a594ab63b2751c1e294154a20338d1", "0x76db9006852da135214f27b8977a306591f18efb83ee7e67e2808493f388325b"],
    ["0xee7ac67ce7d3e39214b9d76a8872d2f4a34632f513b8b061e643362dde63e071", "0x05ca8316b25a376c8c360602011a28fe380ee4e5f60db71a44b5a6937a611c1a"],
    ["0x1", "0x0"]
  ],
  "pi_c": [
    "0x383ae267a6269778ac521bd956cec1856185bb035311a8848147017a1f210dd4",
    "0x1991f9cb27493ee4c19c2a6c4edcf654d9897ca54366d71a0908bcff8bf54c9b", 
    "0x1"
  ],
  "protocol": "groth16",
  "curve": "bn128"
}
```

### Performance Benchmarks

**Expected Performance Metrics**:
- Bill Creation: ~500-800ms
- Payment Processing: ~300-600ms  
- ZK Proof Generation: ~1000-2000ms
- ZK Proof Verification: ~200-500ms
- Frontend Bundle Size: ~1.2MB
- Contract Size: <100KB each

## Running Demo Scenarios

### 1. Frontend Demo
```bash
cd frontend
npm run dev
# Navigate to http://localhost:5173
# Use the Bill Splitting interface
```

### 2. Payment Flow Simulation
```bash
node run-payment-demo.js
```

### 3. Comprehensive Testing
```bash
node test-frontend.js
```

### 4. Contract Testing (requires Rust/Cargo)
```bash
./test-contracts.sh
```

## Demo Script for Presentations

### Introduction (30 seconds)
"0xCC is a cross-chain P2P payment system for Polkadot that enables private bill splitting using zero-knowledge proofs. Let me show you how it works."

### Bill Creation Demo (1 minute)
1. Open frontend at localhost:5173
2. Connect Polkadot wallet
3. Navigate to "Create Bill" tab
4. Fill in bill details with multiple participants
5. Toggle privacy protection on/off
6. Submit and show bill creation confirmation

### Privacy Features Demo (1 minute)
1. Navigate to "ZK Privacy" tab
2. Enter payment amount and balance
3. Generate ZK proof demonstration
4. Show proof structure and verification
5. Explain privacy benefits

### Payment Processing Demo (1 minute)
1. Navigate to "My Bills" tab
2. Show bill list with different statuses
3. Demonstrate payment processing
4. Show real-time updates and completion

### Technical Architecture (30 seconds)
1. Show contract code structure
2. Highlight ZK circuit implementation
3. Demonstrate XCM integration points
4. Show frontend integration layer

## Troubleshooting

### Common Issues

**Frontend Build Errors**:
- Ensure Node.js 18+ is installed
- Run `npm install` in frontend directory
- Check TypeScript configuration

**Contract Compilation**:
- Requires Rust and cargo-contract
- Use `cargo contract build` in contract directories

**ZK Proof Issues**:
- Proofs are currently mock implementations
- Real circuits would require Circom compiler

## Next Steps for Production

1. **Deploy Contracts**: Deploy to Rococo/Westend testnet
2. **Real ZK Circuits**: Implement actual Circom circuits
3. **XCM Integration**: Connect to other parachains
4. **Security Audit**: Full security review
5. **User Testing**: Gather feedback and iterate

## Conclusion

The 0xCC demo showcases a complete end-to-end payment system with privacy features, demonstrating the potential for cross-chain payments in the Polkadot ecosystem. The system is designed for hackathon demonstration but includes production-ready architectural patterns.