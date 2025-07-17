#!/bin/bash

# ZK Circuit Compilation Script for 0xCC
# This script compiles circom circuits for payment privacy

set -e

echo "=== 0xCC ZK Circuit Compilation ==="

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "Error: circom is not installed"
    echo "Please install circom first:"
    echo "  cargo install --git https://github.com/iden3/circom.git"
    exit 1
fi

# Check if snarkjs is available
if ! command -v snarkjs &> /dev/null; then
    echo "Error: snarkjs is not installed"
    echo "Please install snarkjs first:"
    echo "  npm install -g snarkjs"
    exit 1
fi

# Create output directory
mkdir -p build

echo "Compiling payment privacy circuit..."

# Compile the circuit
circom payment_privacy.circom --r1cs --wasm --sym -o build/

if [ $? -eq 0 ]; then
    echo "✅ Circuit compiled successfully!"
    echo "Output files:"
    echo "  - build/payment_privacy.r1cs"
    echo "  - build/payment_privacy.wasm"
    echo "  - build/payment_privacy.sym"
else
    echo "❌ Circuit compilation failed"
    exit 1
fi

# Check if powers of tau file exists
if [ ! -f "powers_of_tau.ptau" ]; then
    echo "Downloading powers of tau file..."
    curl -o powers_of_tau.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
fi

echo "Setting up proving keys..."

# Generate proving key
snarkjs groth16 setup build/payment_privacy.r1cs powers_of_tau.ptau build/payment_privacy_0000.zkey

# Contribute to the ceremony (for demo purposes)
echo "Contributing to trusted setup..."
snarkjs zkey contribute build/payment_privacy_0000.zkey build/payment_privacy.zkey --name="Demo contribution" -v

# Export verification key
snarkjs zkey export verificationkey build/payment_privacy.zkey build/verification_key.json

echo "✅ ZK circuit setup complete!"
echo "Ready to generate proofs for payment privacy"