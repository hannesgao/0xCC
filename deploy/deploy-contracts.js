#!/usr/bin/env node

/**
 * 0xCC Contract Deployment Script
 * Deploys bill splitting and XCM handler contracts to Polkadot testnets
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise, CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class ContractDeployer {
    constructor(network = 'rococo') {
        this.network = network;
        this.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployment-config.json'), 'utf8'));
        this.networkConfig = this.config.networks[network];
        this.api = null;
        this.keyring = null;
        this.deployer = null;
    }

    async connect() {
        log('cyan', `🔌 Connecting to ${this.networkConfig.name}...`);
        log('blue', `RPC: ${this.networkConfig.rpc}`);

        try {
            const provider = new WsProvider(this.networkConfig.rpc);
            this.api = await ApiPromise.create({ provider });
            
            const chain = await this.api.rpc.system.chain();
            const version = await this.api.rpc.system.version();
            
            log('green', `✅ Connected to ${chain} (${version})`);
            
            // Initialize keyring
            this.keyring = new Keyring({ type: 'sr25519' });
            
            // Add deployer account
            const deployerConfig = this.config.deploymentAccounts.alice;
            this.deployer = this.keyring.addFromUri(deployerConfig.mnemonic);
            
            log('blue', `🔑 Deployer: ${this.deployer.address}`);
            
            // Check balance
            await this.checkBalance();
            
        } catch (error) {
            log('red', `❌ Connection failed: ${error.message}`);
            throw error;
        }
    }

    async checkBalance() {
        const { data: balance } = await this.api.query.system.account(this.deployer.address);
        const free = balance.free.toString();
        const freeBalance = Number(free) / 1e12; // Convert to token units
        
        log('yellow', `💰 Balance: ${freeBalance.toFixed(4)} ${this.networkConfig.nativeToken}`);
        
        if (freeBalance < 10) {
            log('yellow', `⚠️  Low balance! You may need to use the faucet:`);
            log('blue', `   ${this.networkConfig.faucet}`);
        }
    }

    async deployContract(contractName) {
        const metadata = this.config.contractMetadata[contractName];
        log('magenta', `\n📦 Deploying ${metadata.name}...`);

        try {
            // Check if contract files exist
            if (!fs.existsSync(metadata.source)) {
                throw new Error(`Contract file not found: ${metadata.source}`);
            }
            
            if (!fs.existsSync(metadata.abi)) {
                throw new Error(`ABI file not found: ${metadata.abi}`);
            }

            // Read contract files
            const wasm = fs.readFileSync(metadata.source);
            const abi = JSON.parse(fs.readFileSync(metadata.abi, 'utf8'));

            log('blue', `📄 Contract size: ${(wasm.length / 1024).toFixed(2)} KB`);

            // Create code promise
            const code = new CodePromise(this.api, abi, wasm);

            // Estimate gas
            const gasLimit = this.api.registry.createType('WeightV2', {
                refTime: this.config.gasLimits.deploy.refTime,
                proofSize: this.config.gasLimits.deploy.proofSize,
            });

            log('yellow', `⛽ Gas limit: ${gasLimit.refTime.toString()}`);

            // Deploy contract
            log('blue', `🚀 Submitting deployment transaction...`);

            const endowment = 0; // No initial balance transfer
            const storageDepositLimit = null; // Unlimited

            // Get constructor based on contract type
            const constructorIndex = 0; // Using 'new' constructor
            
            const unsub = await code.tx[`new`]({
                gasLimit,
                storageDepositLimit,
                value: endowment
            })
            .signAndSend(this.deployer, (result) => {
                if (result.status.isInBlock) {
                    log('green', `✅ Transaction included in block: ${result.status.asInBlock}`);
                } else if (result.status.isFinalized) {
                    log('green', `✅ Transaction finalized: ${result.status.asFinalized}`);
                    
                    // Extract contract address from events
                    result.events.forEach(({ event }) => {
                        if (event.section === 'contracts' && event.method === 'Instantiated') {
                            const [deployer, contractAddress] = event.data;
                            log('green', `🎉 Contract deployed at: ${contractAddress}`);
                            
                            // Update config
                            this.updateDeploymentConfig(contractName, contractAddress.toString(), result.status.asFinalized.toString());
                        }
                    });
                    
                    unsub();
                } else if (result.isError) {
                    log('red', `❌ Transaction failed`);
                    unsub();
                }
            });

        } catch (error) {
            log('red', `❌ Deployment failed: ${error.message}`);
            throw error;
        }
    }

    updateDeploymentConfig(contractName, address, blockHash) {
        // Update the config with deployment info
        this.config.networks[this.network].contracts[contractName] = {
            address: address,
            blockNumber: blockHash,
            transactionHash: blockHash,
            deployedAt: new Date().toISOString()
        };

        // Save updated config
        fs.writeFileSync(
            path.join(__dirname, 'deployment-config.json'),
            JSON.stringify(this.config, null, 2)
        );

        log('blue', `💾 Deployment config updated`);
    }

    async deployAll() {
        log('cyan', '\n🚀 Starting 0xCC Contract Deployment');
        log('cyan', '=====================================\n');

        try {
            await this.connect();

            // Deploy bill splitting contract
            await this.deployContract('billSplitting');
            
            // Wait a bit between deployments
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Deploy XCM handler contract
            await this.deployContract('xcmHandler');

            log('green', '\n✅ All contracts deployed successfully!');
            this.printDeploymentSummary();

        } catch (error) {
            log('red', `\n❌ Deployment failed: ${error.message}`);
            process.exit(1);
        } finally {
            if (this.api) {
                await this.api.disconnect();
                log('blue', '\n👋 Disconnected from network');
            }
        }
    }

    printDeploymentSummary() {
        log('cyan', '\n📋 Deployment Summary');
        log('cyan', '====================');
        
        const contracts = this.config.networks[this.network].contracts;
        
        Object.entries(contracts).forEach(([name, details]) => {
            if (details.address) {
                log('green', `\n${name}:`);
                log('white', `  Address: ${details.address}`);
                log('white', `  Block: ${details.blockNumber}`);
                if (details.deployedAt) {
                    log('white', `  Deployed: ${details.deployedAt}`);
                }
            }
        });

        log('yellow', '\n📝 Next Steps:');
        log('white', '1. Update frontend contract addresses in contractService.ts');
        log('white', '2. Verify contracts on explorer: ' + this.networkConfig.explorer);
        log('white', '3. Test contract functionality');
        log('white', '4. Request testnet tokens if needed: ' + this.networkConfig.faucet);
    }

    // Utility function to verify deployed contracts
    async verifyContract(contractName) {
        const contractInfo = this.config.networks[this.network].contracts[contractName];
        
        if (!contractInfo.address) {
            log('yellow', `⚠️  ${contractName} not deployed on ${this.network}`);
            return false;
        }

        log('blue', `🔍 Verifying ${contractName} at ${contractInfo.address}...`);

        try {
            const contractInfo = await this.api.query.contracts.contractInfoOf(contractInfo.address);
            
            if (contractInfo.isSome) {
                log('green', `✅ Contract verified and active`);
                return true;
            } else {
                log('red', `❌ Contract not found at address`);
                return false;
            }
        } catch (error) {
            log('red', `❌ Verification failed: ${error.message}`);
            return false;
        }
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'deploy';
    const network = args[1] || 'rococo';

    const deployer = new ContractDeployer(network);

    switch (command) {
        case 'deploy':
            await deployer.deployAll();
            break;
        
        case 'verify':
            await deployer.connect();
            await deployer.verifyContract('billSplitting');
            await deployer.verifyContract('xcmHandler');
            await deployer.api.disconnect();
            break;
        
        case 'balance':
            await deployer.connect();
            await deployer.checkBalance();
            await deployer.api.disconnect();
            break;
        
        default:
            console.log('Usage: node deploy-contracts.js [command] [network]');
            console.log('Commands: deploy, verify, balance');
            console.log('Networks: rococo, westend, local');
    }
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ContractDeployer };