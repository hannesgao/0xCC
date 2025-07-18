#!/bin/bash

# 0xCC Deployment Preparation Script
# Prepares contracts and environment for testnet deployment

echo "🚀 0xCC Deployment Preparation"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $1 in
        "SUCCESS") echo -e "${GREEN}✅ $2${NC}" ;;
        "ERROR") echo -e "${RED}❌ $2${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $2${NC}" ;;
        "STEP") echo -e "${YELLOW}⏳ $2${NC}" ;;
    esac
}

# Check if we're in the correct directory
if [ ! -d "contracts" ]; then
    print_status "ERROR" "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Check Rust and cargo-contract installation
print_status "STEP" "Checking development environment..."

if ! command -v rustc &> /dev/null; then
    print_status "ERROR" "Rust is not installed. Please install from https://rustup.rs/"
    exit 1
fi

if ! command -v cargo-contract &> /dev/null; then
    print_status "INFO" "cargo-contract not found. Installing..."
    cargo install cargo-contract --version 3.2.0
fi

print_status "SUCCESS" "Development environment ready"

# Step 2: Build contracts
print_status "STEP" "Building smart contracts..."

# Build bill splitting contract
print_status "INFO" "Building bill splitting contract..."
cd contracts/bill_splitting
if cargo contract build --release; then
    print_status "SUCCESS" "Bill splitting contract built successfully"
    CONTRACT_SIZE=$(ls -lh target/ink/bill_splitting.contract | awk '{print $5}')
    print_status "INFO" "Contract size: $CONTRACT_SIZE"
else
    print_status "ERROR" "Failed to build bill splitting contract"
    exit 1
fi

# Build XCM handler contract
print_status "INFO" "Building XCM handler contract..."
cd ../xcm_handler
if cargo contract build --release; then
    print_status "SUCCESS" "XCM handler contract built successfully"
    CONTRACT_SIZE=$(ls -lh target/ink/xcm_handler.contract | awk '{print $5}')
    print_status "INFO" "Contract size: $CONTRACT_SIZE"
else
    print_status "ERROR" "Failed to build XCM handler contract"
    exit 1
fi

cd ../..

# Step 3: Verify contract artifacts
print_status "STEP" "Verifying contract artifacts..."

ARTIFACTS=(
    "contracts/bill_splitting/target/ink/bill_splitting.contract"
    "contracts/bill_splitting/target/ink/bill_splitting.json"
    "contracts/bill_splitting/target/ink/bill_splitting.wasm"
    "contracts/xcm_handler/target/ink/xcm_handler.contract"
    "contracts/xcm_handler/target/ink/xcm_handler.json"
    "contracts/xcm_handler/target/ink/xcm_handler.wasm"
)

ALL_GOOD=true
for artifact in "${ARTIFACTS[@]}"; do
    if [ -f "$artifact" ]; then
        print_status "SUCCESS" "Found: $artifact"
    else
        print_status "ERROR" "Missing: $artifact"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = false ]; then
    print_status "ERROR" "Some artifacts are missing. Build failed."
    exit 1
fi

# Step 4: Create deployment directory structure
print_status "STEP" "Setting up deployment directory..."

mkdir -p deploy/artifacts
cp contracts/bill_splitting/target/ink/bill_splitting.* deploy/artifacts/
cp contracts/xcm_handler/target/ink/xcm_handler.* deploy/artifacts/

print_status "SUCCESS" "Artifacts copied to deploy/artifacts/"

# Step 5: Install deployment dependencies
print_status "STEP" "Installing deployment dependencies..."

cd deploy
if [ ! -f "package.json" ]; then
    cat > package.json << EOF
{
  "name": "0xcc-deployment",
  "version": "1.0.0",
  "description": "Deployment scripts for 0xCC",
  "main": "deploy-contracts.js",
  "scripts": {
    "deploy:rococo": "node deploy-contracts.js deploy rococo",
    "deploy:westend": "node deploy-contracts.js deploy westend",
    "verify:rococo": "node deploy-contracts.js verify rococo",
    "verify:westend": "node deploy-contracts.js verify westend"
  },
  "dependencies": {
    "@polkadot/api": "^16.4.1",
    "@polkadot/api-contract": "^16.4.1",
    "@polkadot/keyring": "^13.5.3",
    "@polkadot/util": "^13.5.3",
    "@polkadot/util-crypto": "^13.5.3"
  }
}
EOF
    print_status "INFO" "Created package.json"
fi

npm install --silent
print_status "SUCCESS" "Dependencies installed"

cd ..

# Step 6: Generate deployment checklist
print_status "STEP" "Generating deployment checklist..."

cat > deploy/DEPLOYMENT_CHECKLIST.md << EOF
# 0xCC Deployment Checklist

Generated on: $(date)

## Pre-deployment Verification ✅

### Contract Artifacts
$(for artifact in "${ARTIFACTS[@]}"; do
    if [ -f "$artifact" ]; then
        echo "- [x] $artifact ($(ls -lh "$artifact" | awk '{print $5}'))"
    else
        echo "- [ ] $artifact"
    fi
done)

### Environment
- [x] Rust installed: $(rustc --version)
- [x] cargo-contract installed: $(cargo contract --version)
- [x] Node.js installed: $(node --version)

## Deployment Steps

1. [ ] Get testnet tokens from faucet
2. [ ] Update deployment account in config
3. [ ] Run deployment script
4. [ ] Verify contracts on-chain
5. [ ] Update frontend configuration
6. [ ] Test deployed contracts

## Post-deployment

- [ ] Document contract addresses
- [ ] Update README with testnet info
- [ ] Test all features
- [ ] Share with team for testing
EOF

print_status "SUCCESS" "Deployment checklist created"

# Step 7: Display summary
print_status "INFO" "\n📊 Preparation Summary"
echo "========================"
echo "✅ Contracts built successfully"
echo "✅ Artifacts verified and copied"
echo "✅ Deployment scripts ready"
echo "✅ Dependencies installed"
echo ""
print_status "INFO" "Next Steps:"
echo "1. Get testnet tokens from faucet:"
echo "   https://paritytech.github.io/polkadot-testnet-faucet/"
echo ""
echo "2. Deploy contracts:"
echo "   cd deploy"
echo "   npm run deploy:rococo"
echo ""
echo "3. Follow deployment guide:"
echo "   DEPLOYMENT_GUIDE.md"
echo ""
print_status "SUCCESS" "Deployment preparation complete! 🎉"