# 0xCC Testnet Deployment Guide

This guide provides step-by-step instructions for deploying the 0xCC payment system to Polkadot testnets (Rococo/Westend).

## Prerequisites

### 1. Environment Setup
- [ ] Node.js 18+ installed
- [ ] Rust and cargo-contract installed
- [ ] Polkadot.js extension installed in browser
- [ ] Git repository cloned and dependencies installed

### 2. Build Contracts
```bash
# Build bill splitting contract
cd contracts/bill_splitting
cargo contract build --release

# Build XCM handler contract  
cd ../xcm_handler
cargo contract build --release
```

### 3. Get Testnet Tokens
- **Rococo Faucet**: https://paritytech.github.io/polkadot-testnet-faucet/
- **Westend Faucet**: https://paritytech.github.io/polkadot-testnet-faucet/
- Request at least 100 ROC/WND for deployment and testing

## Deployment Steps

### Step 1: Prepare Deployment

1. **Check contract artifacts exist**:
```bash
ls -la contracts/bill_splitting/target/ink/
ls -la contracts/xcm_handler/target/ink/
```

2. **Verify deployment configuration**:
```bash
cat deploy/deployment-config.json
```

3. **Install deployment dependencies**:
```bash
cd deploy
npm install @polkadot/api @polkadot/api-contract
```

### Step 2: Deploy to Testnet

1. **Deploy to Rococo**:
```bash
cd deploy
node deploy-contracts.js deploy rococo
```

2. **Deploy to Westend** (optional):
```bash
node deploy-contracts.js deploy westend
```

3. **Verify deployment**:
```bash
node deploy-contracts.js verify rococo
```

### Step 3: Update Frontend Configuration

1. **Update contract addresses** in `frontend/src/services/contractService.ts`:
```typescript
const CONTRACT_ADDRESSES = {
  rococo: 'YOUR_ROCOCO_ADDRESS_HERE',
  westend: 'YOUR_WESTEND_ADDRESS_HERE',
  local: '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM',
};
```

2. **Update RPC endpoints** in `frontend/src/hooks/usePolkadotApi.ts`:
```typescript
const wsProvider = new WsProvider('wss://rococo-contracts-rpc.polkadot.io');
```

### Step 4: Test Deployed Contracts

1. **Run frontend with testnet**:
```bash
cd frontend
npm run dev
```

2. **Test basic operations**:
   - Connect wallet with testnet account
   - Create a test bill
   - Process a payment
   - Verify ZK proof generation

3. **Monitor on explorer**:
   - Rococo: https://rococo.subscan.io
   - Westend: https://westend.subscan.io

## Deployment Checklist

### Pre-deployment
- [ ] Contracts compiled successfully
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Testnet tokens acquired
- [ ] Deployment account has sufficient balance

### During Deployment
- [ ] Bill splitting contract deployed
- [ ] XCM handler contract deployed
- [ ] Contract addresses recorded
- [ ] Deployment config updated
- [ ] Contracts verified on-chain

### Post-deployment
- [ ] Frontend updated with contract addresses
- [ ] End-to-end testing completed
- [ ] Demo scenarios working
- [ ] Explorer links verified
- [ ] Documentation updated

## Common Issues and Solutions

### Issue: Insufficient Balance
**Solution**: Use faucet to get more tokens
```bash
# Check balance
node deploy-contracts.js balance rococo
```

### Issue: Contract Too Large
**Solution**: Optimize contract size
```bash
cargo contract build --release --optimization-passes 3
```

### Issue: RPC Connection Failed
**Solution**: Try alternative RPC endpoints
- Rococo: `wss://rococo-rpc.polkadot.io`
- Westend: `wss://westend-rpc.polkadot.io`

### Issue: Gas Estimation Failed
**Solution**: Increase gas limits in deployment-config.json
```json
"gasLimits": {
  "deploy": {
    "refTime": "10000000000000",
    "proofSize": "5000000"
  }
}
```

## Manual Deployment (Alternative)

If automated deployment fails, use Contracts UI:
1. Visit https://contracts-ui.substrate.io/
2. Connect to Rococo/Westend
3. Upload contract files:
   - WASM: `target/ink/*.contract`
   - Metadata: `target/ink/*.json`
4. Deploy with constructor arguments
5. Record contract addresses

## Security Considerations

### Before Mainnet
1. **Security Audit**: Get contracts audited
2. **Access Control**: Implement proper permissions
3. **Upgrade Strategy**: Plan for contract upgrades
4. **Emergency Pause**: Add circuit breakers
5. **Rate Limiting**: Prevent spam attacks

### Testnet Best Practices
- Never use mainnet private keys on testnet
- Test all edge cases thoroughly
- Monitor gas consumption
- Document all issues found
- Keep deployment logs

## Monitoring and Maintenance

### Health Checks
```bash
# Check contract status
node deploy-contracts.js verify rococo

# Monitor events (example)
const contract = new ContractPromise(api, abi, address);
contract.events.BillCreated((event) => {
  console.log('New bill:', event);
});
```

### Performance Metrics
- Transaction confirmation time
- Gas costs per operation
- Contract storage usage
- Event emission patterns

## Next Steps

1. **Testing Phase**:
   - Run all demo scenarios
   - Test cross-chain features
   - Verify ZK proofs work correctly
   - Stress test with multiple users

2. **Documentation**:
   - Update contract addresses in README
   - Create user guides
   - Document API endpoints
   - Record demo videos

3. **Community Testing**:
   - Share testnet deployment
   - Gather user feedback
   - Fix reported issues
   - Optimize based on usage

## Support

- **Polkadot Discord**: #smart-contracts channel
- **Substrate StackExchange**: https://substrate.stackexchange.com
- **ink! Documentation**: https://use.ink
- **Project Repository**: https://github.com/yourusername/0xCC

## Deployment Log Template

```
Date: YYYY-MM-DD
Network: Rococo/Westend
Deployer: [ADDRESS]
Gas Used: [AMOUNT]

Bill Splitting Contract:
- Address: [CONTRACT_ADDRESS]
- Block: [BLOCK_NUMBER]
- Transaction: [TX_HASH]

XCM Handler Contract:
- Address: [CONTRACT_ADDRESS]
- Block: [BLOCK_NUMBER]
- Transaction: [TX_HASH]

Notes: [Any issues or observations]
```

Remember to keep this log for reference and debugging!