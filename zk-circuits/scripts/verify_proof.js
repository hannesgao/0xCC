const snarkjs = require("snarkjs");
const fs = require("fs");

async function verifyProof() {
    console.log("Verifying ZK proof...");
    
    try {
        // Load proof and verification key
        if (!fs.existsSync("proof.json")) {
            throw new Error("Proof file not found. Generate proof first.");
        }
        
        if (!fs.existsSync("verification_key.json")) {
            throw new Error("Verification key not found. Run 'npm run export-vkey' first.");
        }
        
        const proof = JSON.parse(fs.readFileSync("proof.json", "utf8"));
        const publicSignals = JSON.parse(fs.readFileSync("public.json", "utf8"));
        const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf8"));
        
        console.log("Proof:", proof);
        console.log("Public signals:", publicSignals);
        
        // Verify the proof
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        if (isValid) {
            console.log("✅ Proof verification successful!");
            console.log("The payment privacy proof is valid.");
        } else {
            console.log("❌ Proof verification failed!");
            console.log("The proof is invalid.");
        }
        
        return isValid;
        
    } catch (error) {
        console.error("Error verifying proof:", error);
        throw error;
    }
}

async function simulateContractVerification() {
    console.log("\n=== Simulating Smart Contract Verification ===");
    
    try {
        const isValid = await verifyProof();
        
        if (isValid) {
            console.log("✅ Smart contract would accept this proof");
            console.log("Payment can be processed with privacy protection");
            
            // Simulate what the smart contract would do
            const mockContractResponse = {
                success: true,
                message: "Payment authorized via ZK proof",
                proofHash: "0x" + Buffer.from(JSON.stringify({
                    timestamp: Date.now(),
                    verified: true
                })).toString('hex').slice(0, 64),
                gasUsed: "150000" // Estimated gas for proof verification
            };
            
            console.log("Contract response:", mockContractResponse);
        } else {
            console.log("❌ Smart contract would reject this proof");
            console.log("Payment blocked - insufficient balance or invalid proof");
        }
        
    } catch (error) {
        console.error("Contract verification simulation failed:", error);
    }
}

async function benchmarkVerification() {
    console.log("\n=== Verification Performance Benchmark ===");
    
    const runs = 10;
    const times = [];
    
    for (let i = 0; i < runs; i++) {
        const start = Date.now();
        await verifyProof();
        const end = Date.now();
        times.push(end - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`Average verification time: ${avg.toFixed(2)}ms`);
    console.log(`Min: ${min}ms, Max: ${max}ms`);
    console.log(`Estimated gas cost: ~150,000 gas`);
    console.log(`Suitable for on-chain verification: ${avg < 1000 ? '✅' : '❌'}`);
}

async function main() {
    try {
        console.log("=== 0xCC ZK Proof Verification ===");
        
        // Basic verification
        await verifyProof();
        
        // Simulate smart contract verification
        await simulateContractVerification();
        
        // Performance benchmark
        await benchmarkVerification();
        
        console.log("\n=== Verification complete! ===");
        
    } catch (error) {
        console.error("Error in main:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { verifyProof, simulateContractVerification, benchmarkVerification };