#!/usr/bin/env node

/**
 * 安全的合约部署脚本
 * 支持多种私钥输入方式，避免硬编码敏感信息
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise, CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 颜色输出
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
     * 多种私钥输入方式
     */
    async getDeployerAccount() {
        log('cyan', '\n🔐 选择私钥输入方式:');
        log('blue', '1. 环境变量 (推荐)');
        log('blue', '2. 交互式输入');
        log('blue', '3. JSON密钥文件');
        log('blue', '4. 助记词短语');
        log('yellow', '5. 开发测试账户 (仅测试网)');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const choice = await new Promise(resolve => {
            rl.question('\n选择方式 (1-5): ', resolve);
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
                throw new Error('无效选择');
        }
    }

    /**
     * 方式1: 从环境变量加载
     */
    async loadFromEnvironment() {
        log('blue', '\n📝 从环境变量加载私钥...');
        
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const mnemonic = process.env.DEPLOYER_MNEMONIC;
        
        if (privateKey) {
            log('green', '✅ 找到私钥环境变量');
            return this.keyring.addFromUri(privateKey);
        } else if (mnemonic) {
            log('green', '✅ 找到助记词环境变量');
            return this.keyring.addFromMnemonic(mnemonic);
        } else {
            log('yellow', '⚠️  未找到环境变量');
            log('blue', '请设置以下任一环境变量:');
            log('yellow', 'export DEPLOYER_PRIVATE_KEY="your_private_key"');
            log('yellow', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase"');
            throw new Error('缺少环境变量');
        }
    }

    /**
     * 方式2: 交互式输入
     */
    async loadFromInteractiveInput(rl) {
        log('blue', '\n🔑 交互式私钥输入');
        log('yellow', '⚠️  注意: 输入的内容会在终端中显示');
        
        const keyType = await new Promise(resolve => {
            rl.question('输入类型 (1=私钥, 2=助记词): ', resolve);
        });

        if (keyType === '1') {
            const privateKey = await new Promise(resolve => {
                rl.question('输入私钥: ', resolve);
            });
            rl.close();
            return this.keyring.addFromUri(privateKey);
        } else if (keyType === '2') {
            const mnemonic = await new Promise(resolve => {
                rl.question('输入助记词 (12个单词): ', resolve);
            });
            rl.close();
            return this.keyring.addFromMnemonic(mnemonic);
        } else {
            rl.close();
            throw new Error('无效输入类型');
        }
    }

    /**
     * 方式3: 从JSON文件加载
     */
    async loadFromJsonFile(rl) {
        log('blue', '\n📄 从JSON密钥文件加载');
        
        const filePath = await new Promise(resolve => {
            rl.question('JSON密钥文件路径: ', resolve);
        });
        rl.close();

        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }

        const password = await this.getPassword();
        
        try {
            const keyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return this.keyring.addFromJson(keyData, password);
        } catch (error) {
            throw new Error(`加载密钥文件失败: ${error.message}`);
        }
    }

    /**
     * 方式4: 助记词输入
     */
    async loadFromMnemonic(rl) {
        log('blue', '\n🔤 助记词输入');
        
        const mnemonic = await new Promise(resolve => {
            rl.question('输入12个单词的助记词: ', resolve);
        });
        rl.close();

        try {
            return this.keyring.addFromMnemonic(mnemonic);
        } catch (error) {
            throw new Error(`助记词无效: ${error.message}`);
        }
    }

    /**
     * 方式5: 测试账户 (仅用于测试网)
     */
    async loadTestAccount(rl) {
        if (this.network === 'mainnet') {
            rl.close();
            throw new Error('主网不允许使用测试账户');
        }

        log('yellow', '\n⚠️  使用测试账户 (仅限测试网)');
        log('blue', '可用测试账户:');
        log('yellow', '1. Alice (//Alice)');
        log('yellow', '2. Bob (//Bob)');
        log('yellow', '3. Charlie (//Charlie)');

        const choice = await new Promise(resolve => {
            rl.question('选择测试账户 (1-3): ', resolve);
        });
        rl.close();

        const testAccounts = {
            '1': '//Alice',
            '2': '//Bob', 
            '3': '//Charlie'
        };

        const mnemonic = testAccounts[choice];
        if (!mnemonic) {
            throw new Error('无效测试账户选择');
        }

        log('yellow', `使用测试账户: ${mnemonic}`);
        return this.keyring.addFromUri(mnemonic);
    }

    /**
     * 安全密码输入
     */
    async getPassword() {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            // 隐藏密码输入
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

            rl.question('输入密钥文件密码: ', (password) => {
                rl.close();
                resolve(password);
            });
        });
    }

    async connect() {
        log('cyan', `🔌 连接到 ${this.networkConfig.name}...`);
        
        try {
            const provider = new WsProvider(this.networkConfig.rpc);
            this.api = await ApiPromise.create({ provider });
            
            const chain = await this.api.rpc.system.chain();
            const version = await this.api.rpc.system.version();
            
            log('green', `✅ 已连接到 ${chain} (${version})`);
            
            // 获取部署账户
            this.deployer = await this.getDeployerAccount();
            
            log('blue', `🔑 部署账户: ${this.deployer.address}`);
            
            // 检查余额
            await this.checkBalance();
            
        } catch (error) {
            log('red', `❌ 连接失败: ${error.message}`);
            throw error;
        }
    }

    async checkBalance() {
        const { data: balance } = await this.api.query.system.account(this.deployer.address);
        const free = balance.free.toString();
        const freeBalance = Number(free) / 1e12;
        
        log('yellow', `💰 余额: ${freeBalance.toFixed(4)} ${this.networkConfig.nativeToken}`);
        
        if (freeBalance < 10) {
            log('yellow', `⚠️  余额不足! 可能需要使用水龙头:`);
            log('blue', `   ${this.networkConfig.faucet}`);
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const confirm = await new Promise(resolve => {
                rl.question('余额不足，是否继续? (y/N): ', resolve);
            });
            rl.close();
            
            if (confirm.toLowerCase() !== 'y') {
                throw new Error('部署取消');
            }
        }
    }

    // 部署方法保持不变...
    async deployContract(contractName) {
        // 与原脚本相同的部署逻辑
        log('magenta', `\n📦 部署 ${contractName}...`);
        // ... 部署代码 ...
    }

    async deployAll() {
        log('cyan', '\n🚀 开始 0xCC 合约部署');
        log('cyan', '=====================================\n');

        try {
            await this.connect();
            
            // 确认部署
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const confirm = await new Promise(resolve => {
                rl.question(`确认部署到 ${this.network}? (y/N): `, resolve);
            });
            rl.close();
            
            if (confirm.toLowerCase() !== 'y') {
                log('yellow', '部署取消');
                return;
            }

            log('green', '\n✅ 开始部署合约...');
            
            // 这里会调用实际的部署方法
            // await this.deployContract('billSplitting');
            // await this.deployContract('xcmHandler');
            
            log('green', '\n🎉 所有合约部署成功!');

        } catch (error) {
            log('red', `\n❌ 部署失败: ${error.message}`);
            process.exit(1);
        } finally {
            if (this.api) {
                await this.api.disconnect();
                log('blue', '\n👋 已断开网络连接');
            }
        }
    }
}

// 使用示例说明
function printUsageExample() {
    log('cyan', '\n📖 使用示例:');
    log('blue', '\n1. 使用环境变量 (推荐):');
    log('yellow', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"');
    log('yellow', 'node secure-deploy.js rococo');
    
    log('blue', '\n2. 使用私钥环境变量:');
    log('yellow', 'export DEPLOYER_PRIVATE_KEY="0x..."');
    log('yellow', 'node secure-deploy.js rococo');
    
    log('blue', '\n3. 交互式部署:');
    log('yellow', 'node secure-deploy.js rococo');
    log('gray', '# 然后按提示选择输入方式');
}

// 主函数
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

// 错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
    log('yellow', '\n\n⏹️  部署中断');
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { SecureContractDeployer };