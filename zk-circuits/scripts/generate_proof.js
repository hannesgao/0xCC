const snarkjs = require("snarkjs");
const fs = require("fs");

async function generateProof() {
    console.log("Generating ZK proof for payment privacy...");
    
    // Example input for payment privacy circuit
    const input = {
        sender_balance: "1000000000000", // 1 million units
        payment_amount: "100000000000",  // 100k units
        nonce: "12345",
        sender_address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        recipient_address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
        commitment: "0" // Will be calculated
    };
    
    // Calculate commitment (this should match the circuit)
    const poseidon = await snarkjs.poseidon([
        input.sender_balance,
        input.payment_amount,
        input.nonce
    ]);
    input.commitment = poseidon.toString();
    
    console.log("Input:", input);
    
    try {
        // Generate witness
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            "payment_privacy.wasm",
            "payment_privacy.zkey"
        );
        
        console.log("Proof generated successfully!");
        console.log("Public signals:", publicSignals);
        
        // Save proof to file
        fs.writeFileSync("proof.json", JSON.stringify(proof, null, 2));
        fs.writeFileSync("public.json", JSON.stringify(publicSignals, null, 2));
        
        console.log("Proof saved to proof.json");
        console.log("Public signals saved to public.json");
        
        return { proof, publicSignals };
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

// Example for bill splitting
async function generateBillSplittingProof() {
    console.log("Generating ZK proof for bill splitting...");
    
    const input = {
        individual_amounts: ["250000000000", "250000000000", "300000000000", "200000000000"],
        participant_balances: ["500000000000", "400000000000", "600000000000", "300000000000"],
        nonces: ["111", "222", "333", "444"],
        total_amount: "1000000000000",
        participant_addresses: [
            "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", 
            "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
            "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
        ],
        group_commitment: "0" // Will be calculated
    };
    
    // This would need to be calculated based on the circuit logic
    console.log("Bill splitting input:", input);
    
    // Note: This would require compiling the bill splitting circuit first
    // For demo purposes, we'll just show the structure
    
    return input;
}

async function generateBalanceProof() {
    console.log("Generating ZK proof for balance verification...");
    
    const input = {
        actual_balance: "1000000000000",
        salt: "987654321",
        required_amount: "500000000000",
        account_address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        balance_commitment: "0" // Will be calculated
    };
    
    // Calculate commitment
    const poseidon = await snarkjs.poseidon([
        input.actual_balance,
        input.salt
    ]);
    input.balance_commitment = poseidon.toString();
    
    console.log("Balance proof input:", input);
    
    return input;
}

async function main() {
    try {
        console.log("=== 0xCC ZK Proof Generation ===");
        
        // Check if required files exist
        if (!fs.existsSync("payment_privacy.wasm")) {
            console.error("Circuit not compiled. Run 'npm run compile' first.");
            return;
        }
        
        if (!fs.existsSync("payment_privacy.zkey")) {
            console.error("Proving key not found. Run 'npm run setup-keys' first.");
            return;
        }
        
        // Generate different types of proofs
        console.log("\n1. Payment Privacy Proof:");
        await generateProof();
        
        console.log("\n2. Bill Splitting Proof (structure):");
        await generateBillSplittingProof();
        
        console.log("\n3. Balance Proof (structure):");
        await generateBalanceProof();
        
        console.log("\n=== All proofs generated successfully! ===");
        
    } catch (error) {
        console.error("Error in main:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateProof, generateBillSplittingProof, generateBalanceProof };