#!/usr/bin/env node

/**
 * 0xCC Contract Monitoring Script
 * Monitors deployed contracts on testnet for events and activity
 */

const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
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
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] ${colors[color]}${message}${colors.reset}`);
}

class ContractMonitor {
    constructor(network = 'rococo') {
        this.network = network;
        this.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployment-config.json'), 'utf8'));
        this.networkConfig = this.config.networks[network];
        this.api = null;
        this.contracts = {};
        this.eventCounts = {
            billSplitting: { BillCreated: 0, BillPaid: 0, BillCompleted: 0 },
            xcmHandler: { PaymentCreated: 0, PaymentExecuted: 0, ChainConfigured: 0 }
        };
    }

    async connect() {
        log('cyan', `🔌 Connecting to ${this.networkConfig.name}...`);

        try {
            const provider = new WsProvider(this.networkConfig.rpc);
            this.api = await ApiPromise.create({ provider });
            
            const chain = await this.api.rpc.system.chain();
            log('green', `✅ Connected to ${chain}`);
            
            await this.setupContracts();
            
        } catch (error) {
            log('red', `❌ Connection failed: ${error.message}`);
            throw error;
        }
    }

    async setupContracts() {
        // Load bill splitting contract
        const billSplittingConfig = this.networkConfig.contracts.billSplitting;
        if (billSplittingConfig.address) {
            const abi = JSON.parse(fs.readFileSync(
                path.join(__dirname, '../contracts/bill_splitting/target/ink/bill_splitting.json'),
                'utf8'
            ));
            
            this.contracts.billSplitting = new ContractPromise(
                this.api,
                abi,
                billSplittingConfig.address
            );
            
            log('blue', `📄 Bill Splitting: ${billSplittingConfig.address}`);
        }

        // Load XCM handler contract
        const xcmHandlerConfig = this.networkConfig.contracts.xcmHandler;
        if (xcmHandlerConfig.address) {
            const abi = JSON.parse(fs.readFileSync(
                path.join(__dirname, '../contracts/xcm_handler/target/ink/xcm_handler.json'),
                'utf8'
            ));
            
            this.contracts.xcmHandler = new ContractPromise(
                this.api,
                abi,
                xcmHandlerConfig.address
            );
            
            log('blue', `📄 XCM Handler: ${xcmHandlerConfig.address}`);
        }
    }

    async monitorEvents() {
        log('cyan', '\n👁️  Monitoring contract events...\n');

        // Monitor system events
        this.api.query.system.events((events) => {
            events.forEach((record) => {
                const { event } = record;
                
                // Check for contract events
                if (event.section === 'contracts' && event.method === 'ContractEmitted') {
                    const [contractAddress, data] = event.data;
                    
                    // Check if it's from our contracts
                    if (contractAddress.toString() === this.networkConfig.contracts.billSplitting.address) {
                        this.handleBillSplittingEvent(data);
                    } else if (contractAddress.toString() === this.networkConfig.contracts.xcmHandler.address) {
                        this.handleXcmHandlerEvent(data);
                    }
                }
            });
        });

        // Set up periodic stats display
        setInterval(() => this.displayStats(), 30000); // Every 30 seconds
    }

    handleBillSplittingEvent(data) {
        try {
            // Decode event data using contract ABI
            const decoded = this.contracts.billSplitting.abi.decodeEvent(data);
            
            if (decoded) {
                this.eventCounts.billSplitting[decoded.event.identifier]++;
                
                log('green', `💰 Bill Splitting Event: ${decoded.event.identifier}`);
                
                switch (decoded.event.identifier) {
                    case 'BillCreated':
                        const [billId, creator, totalAmount, participantCount] = decoded.args;
                        log('yellow', `   Bill ID: ${billId}`);
                        log('yellow', `   Creator: ${creator}`);
                        log('yellow', `   Amount: ${totalAmount} units`);
                        log('yellow', `   Participants: ${participantCount}`);
                        break;
                        
                    case 'BillPaid':
                        const [paidBillId, payer, amount] = decoded.args;
                        log('yellow', `   Bill ID: ${paidBillId}`);
                        log('yellow', `   Payer: ${payer}`);
                        log('yellow', `   Amount: ${amount} units`);
                        break;
                        
                    case 'BillCompleted':
                        const [completedBillId, , totalPaid] = decoded.args;
                        log('yellow', `   Bill ID: ${completedBillId}`);
                        log('yellow', `   Total Paid: ${totalPaid} units`);
                        break;
                }
            }
        } catch (error) {
            log('red', `Error decoding bill splitting event: ${error.message}`);
        }
    }

    handleXcmHandlerEvent(data) {
        try {
            const decoded = this.contracts.xcmHandler.abi.decodeEvent(data);
            
            if (decoded) {
                this.eventCounts.xcmHandler[decoded.event.identifier]++;
                
                log('blue', `🌐 XCM Handler Event: ${decoded.event.identifier}`);
                
                // Log event details based on type
                decoded.args.forEach((arg, index) => {
                    log('yellow', `   Arg ${index}: ${arg}`);
                });
            }
        } catch (error) {
            log('red', `Error decoding XCM handler event: ${error.message}`);
        }
    }

    async queryContractState() {
        log('cyan', '\n📊 Querying contract state...\n');

        // Query bill splitting contract
        if (this.contracts.billSplitting) {
            try {
                // Example: Query bill counter
                const gasLimit = this.api.registry.createType('WeightV2', {
                    refTime: '1000000000000',
                    proofSize: '1000000'
                });

                // This would need to be adjusted based on actual contract methods
                log('blue', '📈 Bill Splitting State:');
                log('yellow', '   (State queries would go here based on contract methods)');
                
            } catch (error) {
                log('red', `Error querying bill splitting state: ${error.message}`);
            }
        }
    }

    displayStats() {
        log('cyan', '\n📊 Event Statistics:');
        log('cyan', '==================');
        
        log('magenta', '\nBill Splitting Contract:');
        Object.entries(this.eventCounts.billSplitting).forEach(([event, count]) => {
            log('yellow', `  ${event}: ${count}`);
        });
        
        log('magenta', '\nXCM Handler Contract:');
        Object.entries(this.eventCounts.xcmHandler).forEach(([event, count]) => {
            log('yellow', `  ${event}: ${count}`);
        });
        
        log('cyan', '==================\n');
    }

    async testTransaction() {
        log('cyan', '\n🧪 Sending test transaction...\n');
        
        // This would need actual implementation with proper account setup
        log('yellow', '⚠️  Test transaction requires funded account and proper setup');
    }

    async run() {
        log('cyan', '🚀 Starting 0xCC Contract Monitor');
        log('cyan', '=================================\n');

        try {
            await this.connect();
            await this.monitorEvents();
            
            // Query initial state
            await this.queryContractState();
            
            log('green', '\n✅ Monitoring active. Press Ctrl+C to stop.\n');
            
            // Keep the process running
            process.stdin.resume();
            
        } catch (error) {
            log('red', `\n❌ Monitor failed: ${error.message}`);
            process.exit(1);
        }
    }

    async exportEventLog() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `contract-events-${this.network}-${timestamp}.json`;
        
        const eventLog = {
            network: this.network,
            timestamp: new Date().toISOString(),
            contracts: this.networkConfig.contracts,
            eventCounts: this.eventCounts,
            // Additional event details would be stored here
        };
        
        fs.writeFileSync(filename, JSON.stringify(eventLog, null, 2));
        log('green', `📝 Event log exported to ${filename}`);
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const network = args[0] || 'rococo';
    
    const monitor = new ContractMonitor(network);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        log('yellow', '\n\n⏹️  Shutting down monitor...');
        await monitor.exportEventLog();
        
        if (monitor.api) {
            await monitor.api.disconnect();
        }
        
        log('blue', '👋 Monitor stopped\n');
        process.exit(0);
    });
    
    await monitor.run();
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ContractMonitor };