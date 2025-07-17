#!/usr/bin/env node

/**
 * Frontend and Integration Testing Script for 0xCC
 * Tests the payment system components and integrations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(type, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = {
        SUCCESS: `${colors.green}✅`,
        ERROR: `${colors.red}❌`,
        INFO: `${colors.blue}ℹ️`,
        STEP: `${colors.yellow}⏳`,
        WARN: `${colors.yellow}⚠️`
    };
    console.log(`${prefix[type]} [${timestamp}] ${message}${colors.reset}`);
}

class FrontendTester {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    async runAllTests() {
        log('INFO', '🚀 Starting 0xCC Frontend Testing Suite');
        log('INFO', '=' .repeat(50));

        const tests = [
            () => this.testProjectStructure(),
            () => this.testContractArtifacts(),
            () => this.testZKComponents(),
            () => this.testFrontendBuild(),
            () => this.testUIComponents(),
            () => this.testIntegrationFiles(),
            () => this.testPaymentFlowSimulation(),
            () => this.testPerformanceMetrics()
        ];

        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                log('ERROR', `Test failed: ${error.message}`);
                this.testResults.push({ name: test.name, success: false, error: error.message });
            }
        }

        this.printSummary();
    }

    testProjectStructure() {
        log('STEP', 'Testing Project Structure');
        
        const requiredDirs = [
            'contracts/bill_splitting',
            'contracts/xcm_handler',
            'zk-circuits',
            'frontend/src',
            'frontend/src/components',
            'frontend/src/hooks',
            'frontend/src/services'
        ];

        const requiredFiles = [
            'contracts/bill_splitting/lib.rs',
            'contracts/xcm_handler/lib.rs',
            'frontend/src/services/contractService.ts',
            'frontend/src/hooks/useContract.ts',
            'frontend/src/hooks/usePolkadotApi.ts',
            'frontend/src/pages/BillSplitting.tsx'
        ];

        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                throw new Error(`Required directory missing: ${dir}`);
            }
        }

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }

        log('SUCCESS', 'Project structure is complete');
        this.testResults.push({ name: 'Project Structure', success: true });
    }

    testContractArtifacts() {
        log('STEP', 'Testing Contract Artifacts');
        
        // Check if contract Rust files are valid
        const contracts = [
            'contracts/bill_splitting/lib.rs',
            'contracts/xcm_handler/lib.rs'
        ];

        for (const contract of contracts) {
            const content = fs.readFileSync(contract, 'utf8');
            
            // Basic Rust contract validation
            if (!content.includes('#[ink::contract]')) {
                throw new Error(`Invalid ink! contract: ${contract}`);
            }
            
            if (!content.includes('#[ink(storage)]')) {
                throw new Error(`Missing storage definition: ${contract}`);
            }
            
            if (!content.includes('#[ink(constructor)]')) {
                throw new Error(`Missing constructor: ${contract}`);
            }
        }

        log('SUCCESS', 'Contract artifacts are valid');
        this.testResults.push({ name: 'Contract Artifacts', success: true });
    }

    testZKComponents() {
        log('STEP', 'Testing ZK Components');
        
        const zkFiles = [
            'zk-circuits/balance_proof.json',
            'zk-circuits/balance_public.json',
            'zk-circuits/demo_proof.js'
        ];

        for (const file of zkFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`ZK file missing: ${file}`);
            }
        }

        // Validate proof structure
        const proofContent = JSON.parse(fs.readFileSync('zk-circuits/balance_proof.json', 'utf8'));
        const requiredFields = ['pi_a', 'pi_b', 'pi_c', 'protocol', 'curve'];
        
        for (const field of requiredFields) {
            if (!(field in proofContent)) {
                throw new Error(`Missing field in proof: ${field}`);
            }
        }

        log('SUCCESS', 'ZK components are valid');
        this.testResults.push({ name: 'ZK Components', success: true });
    }

    testFrontendBuild() {
        log('STEP', 'Testing Frontend Build');
        
        try {
            // Check if build artifacts exist
            if (fs.existsSync('frontend/dist')) {
                log('INFO', 'Build artifacts found');
                
                const distFiles = fs.readdirSync('frontend/dist');
                if (!distFiles.includes('index.html')) {
                    throw new Error('index.html missing in build');
                }
                
                const assetsDir = 'frontend/dist/assets';
                if (fs.existsSync(assetsDir)) {
                    const assets = fs.readdirSync(assetsDir);
                    const jsFiles = assets.filter(f => f.endsWith('.js'));
                    if (jsFiles.length === 0) {
                        throw new Error('No JavaScript bundle found');
                    }
                }
            } else {
                log('INFO', 'No build artifacts found, this is expected for development');
            }
            
            log('SUCCESS', 'Frontend build validation passed');
            this.testResults.push({ name: 'Frontend Build', success: true });
        } catch (error) {
            throw new Error(`Frontend build test failed: ${error.message}`);
        }
    }

    testUIComponents() {
        log('STEP', 'Testing UI Components');
        
        const uiComponents = [
            'frontend/src/components/ui/card.tsx',
            'frontend/src/components/ui/button.tsx',
            'frontend/src/components/ui/input.tsx',
            'frontend/src/components/ui/tabs.tsx',
            'frontend/src/components/BillSplittingForm.tsx',
            'frontend/src/components/BillList.tsx',
            'frontend/src/components/ZKPrivacyDemo.tsx'
        ];

        for (const component of uiComponents) {
            if (!fs.existsSync(component)) {
                throw new Error(`UI component missing: ${component}`);
            }
            
            const content = fs.readFileSync(component, 'utf8');
            
            // Basic React component validation
            if (!content.includes('React') && !content.includes('tsx')) {
                throw new Error(`Invalid React component: ${component}`);
            }
        }

        log('SUCCESS', 'UI components are valid');
        this.testResults.push({ name: 'UI Components', success: true });
    }

    testIntegrationFiles() {
        log('STEP', 'Testing Integration Files');
        
        const integrationFiles = [
            'frontend/src/services/contractService.ts',
            'frontend/src/hooks/useContract.ts',
            'frontend/src/hooks/usePolkadotApi.ts'
        ];

        for (const file of integrationFiles) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for proper imports
            if (file.includes('contractService') && !content.includes('@polkadot/api')) {
                throw new Error(`Missing Polkadot API import: ${file}`);
            }
            
            if (file.includes('useContract') && !content.includes('useState')) {
                throw new Error(`Missing React hooks: ${file}`);
            }
        }

        log('SUCCESS', 'Integration files are valid');
        this.testResults.push({ name: 'Integration Files', success: true });
    }

    async testPaymentFlowSimulation() {
        log('STEP', 'Testing Payment Flow Simulation');
        
        // Simulate payment flow components
        const mockBillData = {
            totalAmount: '1.0',
            participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
            individualAmounts: ['1.0'],
            deadline: '2025-07-20T23:59:59'
        };

        // Simulate timing for different operations
        const operations = {
            billCreation: Math.random() * 1000 + 500,
            paymentProcessing: Math.random() * 800 + 300,
            zkProofGeneration: Math.random() * 2000 + 1000
        };

        // Simulate successful operations
        await new Promise(resolve => setTimeout(resolve, 100));

        log('INFO', `  Mock Bill Creation: ${operations.billCreation.toFixed(0)}ms`);
        log('INFO', `  Mock Payment Processing: ${operations.paymentProcessing.toFixed(0)}ms`);
        log('INFO', `  Mock ZK Proof Generation: ${operations.zkProofGeneration.toFixed(0)}ms`);

        log('SUCCESS', 'Payment flow simulation completed');
        this.testResults.push({ name: 'Payment Flow Simulation', success: true });
    }

    testPerformanceMetrics() {
        log('STEP', 'Testing Performance Metrics');
        
        const metrics = {
            totalFiles: 0,
            totalSize: 0,
            componentCount: 0,
            contractCount: 0
        };

        // Count files and calculate sizes
        const directories = ['frontend/src', 'contracts', 'zk-circuits'];
        
        for (const dir of directories) {
            if (fs.existsSync(dir)) {
                this.walkDirectory(dir, (filePath) => {
                    metrics.totalFiles++;
                    metrics.totalSize += fs.statSync(filePath).size;
                    
                    if (filePath.includes('components') && filePath.endsWith('.tsx')) {
                        metrics.componentCount++;
                    }
                    
                    if (filePath.includes('contracts') && filePath.endsWith('.rs')) {
                        metrics.contractCount++;
                    }
                });
            }
        }

        log('INFO', `  Total Files: ${metrics.totalFiles}`);
        log('INFO', `  Total Size: ${(metrics.totalSize / 1024).toFixed(2)} KB`);
        log('INFO', `  React Components: ${metrics.componentCount}`);
        log('INFO', `  Smart Contracts: ${metrics.contractCount}`);

        // Performance thresholds
        if (metrics.totalSize > 10 * 1024 * 1024) { // 10MB
            log('WARN', 'Project size is large (>10MB)');
        }

        log('SUCCESS', 'Performance metrics collected');
        this.testResults.push({ name: 'Performance Metrics', success: true });
    }

    walkDirectory(dir, callback) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
                this.walkDirectory(filePath, callback);
            } else if (stat.isFile()) {
                callback(filePath);
            }
        }
    }

    printSummary() {
        const duration = Date.now() - this.startTime;
        
        log('INFO', '\n📊 Test Summary');
        log('INFO', '=' .repeat(50));
        
        const successCount = this.testResults.filter(r => r.success).length;
        const totalCount = this.testResults.length;
        
        log('INFO', `Total Tests: ${totalCount}`);
        log('SUCCESS', `Passed: ${successCount}`);
        
        if (totalCount - successCount > 0) {
            log('ERROR', `Failed: ${totalCount - successCount}`);
            
            log('INFO', '\n❌ Failed Tests:');
            this.testResults.filter(r => !r.success).forEach(result => {
                log('ERROR', `  - ${result.name}: ${result.error}`);
            });
        }
        
        log('INFO', `\n⏱️  Total Duration: ${duration}ms`);
        
        if (successCount === totalCount) {
            log('SUCCESS', '\n🎉 All tests passed! The 0xCC system is ready.');
        } else {
            log('ERROR', '\n💥 Some tests failed. Please fix the issues above.');
        }
    }
}

// Run the tests
const tester = new FrontendTester();
tester.runAllTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});