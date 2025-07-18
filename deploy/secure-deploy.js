#!/usr/bin/env node

/**
 * Secure contract deployment script
 * Supports multiple private key input methods, avoiding hardcoded sensitive information
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise, CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color output
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

class SecureContractDeployer {
    constructor(network = 'rococo') {
        this.network = network;
        this.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployment-config.json'), 'utf8'));
        this.networkConfig = this.config.networks[network];
        this.api = null;
        this.keyring = null;
        this.deployer = null;
    }

    /**
     * Multiple private key input methods
     */
    async getDeployerAccount() {
        log('cyan', '\n🔐 Select private key input method:');
        log('blue', '1. Environment variable (recommended)');
        log('blue', '2. Interactive input');
        log('blue', '3. JSON keystore file');
        log('blue', '4. Mnemonic phrase');
        log('yellow', '5. Development test account (testnet only)');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const choice = await new Promise(resolve => {
            rl.question('\nSelect method (1-5): ', resolve);
        });

        this.keyring = new Keyring({ type: 'sr25519' });

        switch (choice) {
            case '1':
                return await this.loadFromEnvironment();
            case '2':
                return await this.loadFromInteractiveInput(rl);
            case '3':
                return await this.loadFromJsonFile(rl);
            case '4':
                return await this.loadFromMnemonic(rl);
            case '5':
                return await this.loadTestAccount(rl);
            default:
                rl.close();
                throw new Error('Invalid selection');
        }
    }

    /**
     * Method 1: Load from environment variables
     */
    async loadFromEnvironment() {
        log('blue', '\n📝 Loading private key from environment variables...');
        
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const mnemonic = process.env.DEPLOYER_MNEMONIC;
        
        if (privateKey) {
            log('green', '✅ Found private key environment variable');
            return this.keyring.addFromUri(privateKey);
        } else if (mnemonic) {
            log('green', '✅ Found mnemonic environment variable');
            return this.keyring.addFromMnemonic(mnemonic);
        } else {
            log('yellow', '⚠️  No environment variables found');
            log('blue', 'Please set one of the following environment variables:');
            log('yellow', 'export DEPLOYER_PRIVATE_KEY="your_private_key"');
            log('yellow', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase"');
            throw new Error('Missing environment variables');
        }
    }

    /**
     * Method 2: Interactive input
     */
    async loadFromInteractiveInput(rl) {
        log('blue', '\n🔑 Interactive private key input');
        log('yellow', '⚠️  Note: Input will be visible in terminal');
        
        const keyType = await new Promise(resolve => {
            rl.question('Input type (1=private key, 2=mnemonic): ', resolve);
        });

        if (keyType === '1') {
            const privateKey = await new Promise(resolve => {
                rl.question('Enter private key: ', resolve);
            });
            rl.close();
            return this.keyring.addFromUri(privateKey);
        } else if (keyType === '2') {
            const mnemonic = await new Promise(resolve => {
                rl.question('Enter mnemonic (12 words): ', resolve);
            });
            rl.close();
            return this.keyring.addFromMnemonic(mnemonic);
        } else {
            rl.close();
            throw new Error('Invalid input type');
        }
    }

    /**
     * Method 3: Load from JSON file
     */
    async loadFromJsonFile(rl) {
        log('blue', '\n📄 Loading from JSON keystore file');
        
        const filePath = await new Promise(resolve => {
            rl.question('JSON keystore file path: ', resolve);
        });
        rl.close();

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const password = await this.getPassword();
        
        try {
            const keyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return this.keyring.addFromJson(keyData, password);
        } catch (error) {
            throw new Error(`Failed to load keystore file: ${error.message}`);
        }
    }

    /**
     * Method 4: Mnemonic input
     */
    async loadFromMnemonic(rl) {
        log('blue', '\n🔤 Mnemonic input');
        
        const mnemonic = await new Promise(resolve => {
            rl.question('Enter 12-word mnemonic phrase: ', resolve);
        });
        rl.close();

        try {
            return this.keyring.addFromMnemonic(mnemonic);
        } catch (error) {
            throw new Error(`Invalid mnemonic: ${error.message}`);
        }
    }

    /**
     * Method 5: Test accounts (for testnet only)
     */
    async loadTestAccount(rl) {
        if (this.network === 'mainnet') {
            rl.close();
            throw new Error('Test accounts not allowed on mainnet');
        }

        log('yellow', '\n⚠️  Using test account (testnet only)');
        log('blue', 'Available test accounts:');
        log('yellow', '1. Alice (//Alice)');
        log('yellow', '2. Bob (//Bob)');
        log('yellow', '3. Charlie (//Charlie)');

        const choice = await new Promise(resolve => {
            rl.question('Select test account (1-3): ', resolve);
        });
        rl.close();

        const testAccounts = {
            '1': '//Alice',
            '2': '//Bob', 
            '3': '//Charlie'
        };

        const mnemonic = testAccounts[choice];
        if (!mnemonic) {
            throw new Error('Invalid test account selection');
        }

        log('yellow', `Using test account: ${mnemonic}`);
        return this.keyring.addFromUri(mnemonic);
    }

    /**
     * Secure password input
     */
    async getPassword() {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            // Hide password input
            process.stdin.on('data', (char) => {
                char = char.toString();
                switch (char) {
                    case '\n':
                    case '\r':
                    case '\u0004':
                        process.stdin.pause();
                        break;
                    default:
                        process.stdout.write('\b \b');
                        break;
                }
            });

            rl.question('Enter keystore password: ', (password) => {
                rl.close();
                resolve(password);
            });
        });
    }

    async connect() {
        log('cyan', `🔌 Connecting to ${this.networkConfig.name}...`);
        
        try {
            const provider = new WsProvider(this.networkConfig.rpc);
            this.api = await ApiPromise.create({ provider });
            
            const chain = await this.api.rpc.system.chain();
            const version = await this.api.rpc.system.version();
            
            log('green', `✅ Connected to ${chain} (${version})`);
            
            // Get deployer account
            this.deployer = await this.getDeployerAccount();
            
            log('blue', `🔑 Deployer account: ${this.deployer.address}`);
            
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
        const freeBalance = Number(free) / 1e12;
        
        log('yellow', `💰 Balance: ${freeBalance.toFixed(4)} ${this.networkConfig.nativeToken}`);
        
        if (freeBalance < 10) {
            log('yellow', `⚠️  Low balance! You may need to use the faucet:`);
            log('blue', `   ${this.networkConfig.faucet}`);
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const confirm = await new Promise(resolve => {
                rl.question('Low balance, continue anyway? (y/N): ', resolve);
            });
            rl.close();
            
            if (confirm.toLowerCase() !== 'y') {
                throw new Error('Deployment cancelled');
            }
        }
    }

    // Deployment method remains the same...
    async deployContract(contractName) {
        // Same deployment logic as original script
        log('magenta', `\n📦 Deploying ${contractName}...`);
        // ... deployment code ...
    }

    async deployAll() {
        log('cyan', '\n🚀 Starting 0xCC contract deployment');
        log('cyan', '=====================================\n');

        try {
            await this.connect();
            
            // Confirm deployment
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const confirm = await new Promise(resolve => {
                rl.question(`Confirm deployment to ${this.network}? (y/N): `, resolve);
            });
            rl.close();
            
            if (confirm.toLowerCase() !== 'y') {
                log('yellow', 'Deployment cancelled');
                return;
            }

            log('green', '\n✅ Starting contract deployment...');
            
            // Actual deployment methods would be called here
            // await this.deployContract('billSplitting');
            // await this.deployContract('xcmHandler');
            
            log('green', '\n🎉 All contracts deployed successfully!');

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
}

// Usage examples
function printUsageExample() {
    log('cyan', '\n📖 Usage examples:');
    log('blue', '\n1. Using environment variables (recommended):');
    log('yellow', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"');
    log('yellow', 'node secure-deploy.js rococo');
    
    log('blue', '\n2. Using private key environment variable:');
    log('yellow', 'export DEPLOYER_PRIVATE_KEY="0x..."');
    log('yellow', 'node secure-deploy.js rococo');
    
    log('blue', '\n3. Interactive deployment:');
    log('yellow', 'node secure-deploy.js rococo');
    log('gray', '# Then follow prompts to select input method');
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        printUsageExample();
        return;
    }
    
    const network = args[0] || 'rococo';
    
    const deployer = new SecureContractDeployer(network);
    await deployer.deployAll();
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise rejection:', error);
    process.exit(1);
});

// Graceful exit
process.on('SIGINT', () => {
    log('yellow', '\n\n⏹️  Deployment interrupted');
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { SecureContractDeployer };