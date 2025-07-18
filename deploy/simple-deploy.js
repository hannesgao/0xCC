#!/usr/bin/env node

/**
 * Simplified secure deployment script
 * Uses only environment variables, avoiding interactive input complexity
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Color output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class SimpleDeployer {
    constructor(network = 'rococo') {
        this.network = network;
        this.api = null;
        this.deployer = null;
        
        // Network configuration
        this.networks = {
            rococo: {
                name: 'Rococo Testnet',
                rpc: 'wss://rococo-contracts-rpc.polkadot.io',
                token: 'ROC'
            },
            westend: {
                name: 'Westend Testnet', 
                rpc: 'wss://westend-rpc.polkadot.io',
                token: 'WND'
            },
            local: {
                name: 'Local Development',
                rpc: 'ws://127.0.0.1:9944',
                token: 'UNIT'
            }
        };
    }

    async getDeployerFromEnv() {
        log('blue', '🔑 Loading deployment account from environment variables...');
        
        const mnemonic = process.env.DEPLOYER_MNEMONIC;
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        
        if (!mnemonic && !privateKey) {
            log('red', '❌ Deployment account information not found');
            log('yellow', 'Please set one of the following environment variables:');
            log('cyan', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic"');
            log('cyan', 'export DEPLOYER_PRIVATE_KEY="0x..."');
            log('yellow', '\nFor testnets, you can also use:');
            log('cyan', 'export DEPLOYER_MNEMONIC="//Alice"  # Testnet only');
            throw new Error('Missing deployment account environment variable');
        }

        const keyring = new Keyring({ type: 'sr25519' });
        
        if (mnemonic) {
            if (mnemonic.startsWith('//')) {
                // Test account
                if (this.network !== 'local' && this.network !== 'rococo' && this.network !== 'westend') {
                    throw new Error('Test accounts can only be used on testnets');
                }
                log('yellow', `⚠️  Using test account: ${mnemonic}`);
                return keyring.addFromUri(mnemonic);
            } else {
                // Real mnemonic
                log('green', '✅ Creating account using mnemonic');
                return keyring.addFromMnemonic(mnemonic);
            }
        } else {
            // Private key
            log('green', '✅ Creating account using private key');
            return keyring.addFromUri(privateKey);
        }
    }

    async connect() {
        const networkConfig = this.networks[this.network];
        if (!networkConfig) {
            throw new Error(`Unsupported network: ${this.network}`);
        }

        log('cyan', `🔌 Connecting to ${networkConfig.name}...`);
        log('blue', `RPC: ${networkConfig.rpc}`);

        const provider = new WsProvider(networkConfig.rpc);
        this.api = await ApiPromise.create({ provider });
        
        const chain = await this.api.rpc.system.chain();
        log('green', `✅ Connected successfully: ${chain}`);

        // Load deployment account
        this.deployer = await this.getDeployerFromEnv();
        log('blue', `📍 Deployment account: ${this.deployer.address}`);

        // Check balance
        await this.checkBalance(networkConfig.token);
    }

    async checkBalance(token) {
        const { data: balance } = await this.api.query.system.account(this.deployer.address);
        const free = balance.free.toString();
        const freeBalance = Number(free) / 1e12;
        
        log('yellow', `💰 Account balance: ${freeBalance.toFixed(4)} ${token}`);
        
        if (freeBalance < 1) {
            log('red', '❌ Insufficient balance! At least 1 token required for deployment');
            log('yellow', 'Please get test tokens from the faucet:');
            log('cyan', 'https://paritytech.github.io/polkadot-testnet-faucet/');
            throw new Error('Insufficient balance');
        }
    }

    async deployContract(contractName, contractFile, metadataFile) {
        log('cyan', `\n📦 Deploying contract: ${contractName}`);
        
        // Check if files exist
        if (!fs.existsSync(contractFile)) {
            throw new Error(`Contract file not found: ${contractFile}`);
        }
        if (!fs.existsSync(metadataFile)) {
            throw new Error(`Metadata file not found: ${metadataFile}`);
        }

        // Read contract files
        const wasm = fs.readFileSync(contractFile);
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        
        log('blue', `📄 Contract size: ${(wasm.length / 1024).toFixed(2)} KB`);

        // Create code promise
        const code = new CodePromise(this.api, metadata, wasm);
        
        // Set gas limit
        const gasLimit = this.api.registry.createType('WeightV2', {
            refTime: '5000000000000',
            proofSize: '2500000'
        });

        log('yellow', '⛽ Estimating deployment cost...');

        try {
            // Deploy contract
            log('blue', '🚀 Submitting deployment transaction...');
            
            const endowment = 0;
            const storageDepositLimit = null;

            return new Promise((resolve, reject) => {
                const unsub = code.tx.new({
                    gasLimit,
                    storageDepositLimit,
                    value: endowment
                })
                .signAndSend(this.deployer, (result) => {
                    if (result.status.isInBlock) {
                        log('green', `✅ Transaction included in block: ${result.status.asInBlock}`);
                    } else if (result.status.isFinalized) {
                        log('green', `🎉 Transaction finalized: ${result.status.asFinalized}`);
                        
                        // Extract contract address
                        let contractAddress = null;
                        result.events.forEach(({ event }) => {
                            if (event.section === 'contracts' && event.method === 'Instantiated') {
                                contractAddress = event.data[1].toString();
                                log('green', `📍 Contract address: ${contractAddress}`);
                            }
                        });
                        
                        unsub();
                        resolve({
                            address: contractAddress,
                            blockHash: result.status.asFinalized.toString()
                        });
                    } else if (result.isError) {
                        log('red', '❌ Transaction failed');
                        unsub();
                        reject(new Error('Deployment transaction failed'));
                    }
                });
            });

        } catch (error) {
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }

    async deployAll() {
        log('cyan', '🚀 Starting 0xCC contracts deployment');
        log('cyan', '=====================================\n');

        try {
            await this.connect();

            const deployments = {};

            // Deploy Bill Splitting contract
            log('yellow', '\n1️⃣ Deploying Bill Splitting contract...');
            const billSplittingResult = await this.deployContract(
                'Bill Splitting',
                path.join(__dirname, '../contracts/bill_splitting/target/ink/bill_splitting.contract'),
                path.join(__dirname, '../contracts/bill_splitting/target/ink/bill_splitting.json')
            );
            deployments.billSplitting = billSplittingResult;

            // Wait a few seconds
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Deploy XCM Handler contract
            log('yellow', '\n2️⃣ Deploying XCM Handler contract...');
            const xcmHandlerResult = await this.deployContract(
                'XCM Handler',
                path.join(__dirname, '../contracts/xcm_handler/target/ink/xcm_handler.contract'),
                path.join(__dirname, '../contracts/xcm_handler/target/ink/xcm_handler.json')
            );
            deployments.xcmHandler = xcmHandlerResult;

            // Save deployment info
            this.saveDeploymentInfo(deployments);
            
            log('green', '\n🎉 All contracts deployed successfully!');
            this.printSummary(deployments);

        } catch (error) {
            log('red', `\n❌ Deployment failed: ${error.message}`);
            throw error;
        } finally {
            if (this.api) {
                await this.api.disconnect();
                log('blue', '\n👋 Disconnected');
            }
        }
    }

    saveDeploymentInfo(deployments) {
        const deploymentInfo = {
            network: this.network,
            timestamp: new Date().toISOString(),
            deployer: this.deployer.address,
            contracts: deployments
        };

        const filename = `deployment-${this.network}-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        log('blue', `💾 Deployment info saved: ${filename}`);
    }

    printSummary(deployments) {
        log('cyan', '\n📋 Deployment Summary');
        log('cyan', '=================');
        log('blue', `Network: ${this.networks[this.network].name}`);
        log('blue', `Deployer: ${this.deployer.address}`);
        log('blue', `Time: ${new Date().toLocaleString()}`);
        
        log('green', '\n📍 Contract addresses:');
        if (deployments.billSplitting) {
            log('yellow', `Bill Splitting: ${deployments.billSplitting.address}`);
        }
        if (deployments.xcmHandler) {
            log('yellow', `XCM Handler: ${deployments.xcmHandler.address}`);
        }

        log('cyan', '\n📝 Next steps:');
        log('blue', '1. Update contract addresses in frontend config');
        log('blue', '2. Verify contracts on block explorer');
        log('blue', '3. Test contract functionality');
    }
}

// Usage instructions
function showUsage() {
    log('cyan', '\n📖 Usage Instructions');
    log('yellow', 'Set environment variables:');
    log('blue', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase"');
    log('gray', '# or');
    log('blue', 'export DEPLOYER_PRIVATE_KEY="0x..."');
    
    log('yellow', '\nRun deployment:');
    log('blue', 'node simple-deploy.js rococo    # Deploy to Rococo');
    log('blue', 'node simple-deploy.js westend   # Deploy to Westend');
    log('blue', 'node simple-deploy.js local     # Deploy to local node');

    log('yellow', '\nTest accounts (testnet only):');
    log('blue', 'export DEPLOYER_MNEMONIC="//Alice"');
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showUsage();
        return;
    }

    const network = args[0] || 'rococo';
    
    log('cyan', `\n🎯 Target network: ${network}`);
    
    const deployer = new SimpleDeployer(network);
    await deployer.deployAll();
}

// Error handling
process.on('unhandledRejection', (error) => {
    log('red', `Unhandled Promise error: ${error.message}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    log('yellow', '\n\n⏹️  Deployment interrupted');
    process.exit(0);
});

if (require.main === module) {
    main().catch(error => {
        log('red', `Deployment error: ${error.message}`);
        process.exit(1);
    });
}