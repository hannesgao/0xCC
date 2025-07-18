#!/usr/bin/env node

/**
 * Updates frontend configuration with deployed contract addresses
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function updateFrontendConfig(network) {
    // Read deployment config
    const deploymentConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'deployment-config.json'), 'utf8')
    );

    const networkConfig = deploymentConfig.networks[network];
    
    if (!networkConfig.contracts.billSplitting.address || !networkConfig.contracts.xcmHandler.address) {
        log('red', `❌ No deployed contracts found for ${network}`);
        log('yellow', 'Please deploy contracts first using: node deploy-contracts.js deploy ' + network);
        return;
    }

    // Update contractService.ts
    const contractServicePath = path.join(__dirname, '../frontend/src/services/contractService.ts');
    let contractServiceContent = fs.readFileSync(contractServicePath, 'utf8');

    // Update contract addresses
    const addressPattern = /const CONTRACT_ADDRESSES = {[^}]+}/;
    const newAddresses = `const CONTRACT_ADDRESSES = {
  rococo: '${deploymentConfig.networks.rococo.contracts.billSplitting.address || 'null'}',
  westend: '${deploymentConfig.networks.westend.contracts.billSplitting.address || 'null'}',
  local: '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM', // placeholder
}`;

    contractServiceContent = contractServiceContent.replace(addressPattern, newAddresses);
    fs.writeFileSync(contractServicePath, contractServiceContent);
    log('green', '✅ Updated contract addresses in contractService.ts');

    // Update usePolkadotApi.ts with correct RPC endpoint
    const apiHookPath = path.join(__dirname, '../frontend/src/hooks/usePolkadotApi.ts');
    let apiHookContent = fs.readFileSync(apiHookPath, 'utf8');

    const wsProviderPattern = /const wsProvider = new WsProvider\([^)]+\)/;
    const newWsProvider = `const wsProvider = new WsProvider('${networkConfig.rpc}')`;

    apiHookContent = apiHookContent.replace(wsProviderPattern, newWsProvider);
    fs.writeFileSync(apiHookPath, apiHookContent);
    log('green', '✅ Updated RPC endpoint in usePolkadotApi.ts');

    // Create environment config file
    const envConfig = {
        network: network,
        contracts: {
            billSplitting: networkConfig.contracts.billSplitting.address,
            xcmHandler: networkConfig.contracts.xcmHandler.address
        },
        rpc: networkConfig.rpc,
        explorer: networkConfig.explorer,
        faucet: networkConfig.faucet,
        deployedAt: networkConfig.contracts.billSplitting.deployedAt || new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(__dirname, '../frontend/src/config.json'),
        JSON.stringify(envConfig, null, 2)
    );
    log('green', '✅ Created frontend config.json');

    // Update README with deployment info
    const readmePath = path.join(__dirname, '../README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');

    const deploymentSection = `
## Testnet Deployment

The 0xCC contracts are deployed on ${network.charAt(0).toUpperCase() + network.slice(1)}:

- **Bill Splitting Contract**: \`${networkConfig.contracts.billSplitting.address}\`
- **XCM Handler Contract**: \`${networkConfig.contracts.xcmHandler.address}\`
- **Explorer**: ${networkConfig.explorer}
- **RPC Endpoint**: \`${networkConfig.rpc}\`
- **Faucet**: ${networkConfig.faucet}

Last deployed: ${new Date().toISOString()}
`;

    // Replace or append deployment section
    const deploymentPattern = /## Testnet Deployment[\s\S]*?(?=##|$)/;
    if (deploymentPattern.test(readmeContent)) {
        readmeContent = readmeContent.replace(deploymentPattern, deploymentSection + '\n');
    } else {
        // Append before the last section or at the end
        const lastSectionIndex = readmeContent.lastIndexOf('\n## ');
        if (lastSectionIndex > -1) {
            readmeContent = readmeContent.slice(0, lastSectionIndex) + '\n' + deploymentSection + readmeContent.slice(lastSectionIndex);
        } else {
            readmeContent += '\n' + deploymentSection;
        }
    }

    fs.writeFileSync(readmePath, readmeContent);
    log('green', '✅ Updated README.md with deployment info');

    log('blue', '\n📋 Configuration Summary:');
    log('yellow', `Network: ${network}`);
    log('yellow', `Bill Splitting: ${networkConfig.contracts.billSplitting.address}`);
    log('yellow', `XCM Handler: ${networkConfig.contracts.xcmHandler.address}`);
    log('yellow', `RPC: ${networkConfig.rpc}`);
    
    log('green', '\n✅ Frontend configuration updated successfully!');
    log('blue', '\nNext steps:');
    log('yellow', '1. Rebuild frontend: cd frontend && npm run build');
    log('yellow', '2. Test with: npm run dev');
    log('yellow', '3. Verify connection to ' + network);
}

// Main execution
const network = process.argv[2] || 'rococo';
updateFrontendConfig(network);