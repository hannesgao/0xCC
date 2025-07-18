#!/usr/bin/env node

/**
 * 简化的安全部署脚本
 * 仅使用环境变量，避免交互式输入的复杂性
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { CodePromise } = require('@polkadot/api-contract');
const fs = require('fs');
const path = require('path');

// 颜色输出
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
        
        // 网络配置
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
        log('blue', '🔑 从环境变量加载部署账户...');
        
        const mnemonic = process.env.DEPLOYER_MNEMONIC;
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        
        if (!mnemonic && !privateKey) {
            log('red', '❌ 未找到部署账户信息');
            log('yellow', '请设置以下环境变量之一:');
            log('cyan', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic"');
            log('cyan', 'export DEPLOYER_PRIVATE_KEY="0x..."');
            log('yellow', '\n对于测试网，你也可以使用:');
            log('cyan', 'export DEPLOYER_MNEMONIC="//Alice"  # 仅测试网');
            throw new Error('缺少部署账户环境变量');
        }

        const keyring = new Keyring({ type: 'sr25519' });
        
        if (mnemonic) {
            if (mnemonic.startsWith('//')) {
                // 测试账户
                if (this.network !== 'local' && this.network !== 'rococo' && this.network !== 'westend') {
                    throw new Error('测试账户只能用于测试网');
                }
                log('yellow', `⚠️  使用测试账户: ${mnemonic}`);
                return keyring.addFromUri(mnemonic);
            } else {
                // 真实助记词
                log('green', '✅ 使用助记词创建账户');
                return keyring.addFromMnemonic(mnemonic);
            }
        } else {
            // 私钥
            log('green', '✅ 使用私钥创建账户');
            return keyring.addFromUri(privateKey);
        }
    }

    async connect() {
        const networkConfig = this.networks[this.network];
        if (!networkConfig) {
            throw new Error(`不支持的网络: ${this.network}`);
        }

        log('cyan', `🔌 连接到 ${networkConfig.name}...`);
        log('blue', `RPC: ${networkConfig.rpc}`);

        const provider = new WsProvider(networkConfig.rpc);
        this.api = await ApiPromise.create({ provider });
        
        const chain = await this.api.rpc.system.chain();
        log('green', `✅ 连接成功: ${chain}`);

        // 加载部署账户
        this.deployer = await this.getDeployerFromEnv();
        log('blue', `📍 部署账户: ${this.deployer.address}`);

        // 检查余额
        await this.checkBalance(networkConfig.token);
    }

    async checkBalance(token) {
        const { data: balance } = await this.api.query.system.account(this.deployer.address);
        const free = balance.free.toString();
        const freeBalance = Number(free) / 1e12;
        
        log('yellow', `💰 账户余额: ${freeBalance.toFixed(4)} ${token}`);
        
        if (freeBalance < 1) {
            log('red', '❌ 余额不足！需要至少 1 个token用于部署');
            log('yellow', '请从水龙头获取测试代币:');
            log('cyan', 'https://paritytech.github.io/polkadot-testnet-faucet/');
            throw new Error('余额不足');
        }
    }

    async deployContract(contractName, contractFile, metadataFile) {
        log('cyan', `\n📦 部署合约: ${contractName}`);
        
        // 检查文件是否存在
        if (!fs.existsSync(contractFile)) {
            throw new Error(`合约文件不存在: ${contractFile}`);
        }
        if (!fs.existsSync(metadataFile)) {
            throw new Error(`元数据文件不存在: ${metadataFile}`);
        }

        // 读取合约文件
        const wasm = fs.readFileSync(contractFile);
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        
        log('blue', `📄 合约大小: ${(wasm.length / 1024).toFixed(2)} KB`);

        // 创建代码承诺
        const code = new CodePromise(this.api, metadata, wasm);
        
        // 设置gas限制
        const gasLimit = this.api.registry.createType('WeightV2', {
            refTime: '5000000000000',
            proofSize: '2500000'
        });

        log('yellow', '⛽ 估算部署费用...');

        try {
            // 部署合约
            log('blue', '🚀 提交部署交易...');
            
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
                        log('green', `✅ 交易已打包: ${result.status.asInBlock}`);
                    } else if (result.status.isFinalized) {
                        log('green', `🎉 交易已确认: ${result.status.asFinalized}`);
                        
                        // 提取合约地址
                        let contractAddress = null;
                        result.events.forEach(({ event }) => {
                            if (event.section === 'contracts' && event.method === 'Instantiated') {
                                contractAddress = event.data[1].toString();
                                log('green', `📍 合约地址: ${contractAddress}`);
                            }
                        });
                        
                        unsub();
                        resolve({
                            address: contractAddress,
                            blockHash: result.status.asFinalized.toString()
                        });
                    } else if (result.isError) {
                        log('red', '❌ 交易失败');
                        unsub();
                        reject(new Error('部署交易失败'));
                    }
                });
            });

        } catch (error) {
            throw new Error(`部署失败: ${error.message}`);
        }
    }

    async deployAll() {
        log('cyan', '🚀 开始 0xCC 合约部署');
        log('cyan', '=====================================\n');

        try {
            await this.connect();

            const deployments = {};

            // 部署账单分割合约
            log('yellow', '\n1️⃣ 部署账单分割合约...');
            const billSplittingResult = await this.deployContract(
                'Bill Splitting',
                path.join(__dirname, '../contracts/bill_splitting/target/ink/bill_splitting.contract'),
                path.join(__dirname, '../contracts/bill_splitting/target/ink/bill_splitting.json')
            );
            deployments.billSplitting = billSplittingResult;

            // 等待几秒
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 部署XCM处理合约
            log('yellow', '\n2️⃣ 部署XCM处理合约...');
            const xcmHandlerResult = await this.deployContract(
                'XCM Handler',
                path.join(__dirname, '../contracts/xcm_handler/target/ink/xcm_handler.contract'),
                path.join(__dirname, '../contracts/xcm_handler/target/ink/xcm_handler.json')
            );
            deployments.xcmHandler = xcmHandlerResult;

            // 保存部署信息
            this.saveDeploymentInfo(deployments);
            
            log('green', '\n🎉 所有合约部署成功！');
            this.printSummary(deployments);

        } catch (error) {
            log('red', `\n❌ 部署失败: ${error.message}`);
            throw error;
        } finally {
            if (this.api) {
                await this.api.disconnect();
                log('blue', '\n👋 已断开连接');
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
        log('blue', `💾 部署信息已保存: ${filename}`);
    }

    printSummary(deployments) {
        log('cyan', '\n📋 部署摘要');
        log('cyan', '=================');
        log('blue', `网络: ${this.networks[this.network].name}`);
        log('blue', `部署者: ${this.deployer.address}`);
        log('blue', `时间: ${new Date().toLocaleString()}`);
        
        log('green', '\n📍 合约地址:');
        if (deployments.billSplitting) {
            log('yellow', `账单分割: ${deployments.billSplitting.address}`);
        }
        if (deployments.xcmHandler) {
            log('yellow', `XCM处理: ${deployments.xcmHandler.address}`);
        }

        log('cyan', '\n📝 下一步:');
        log('blue', '1. 更新前端配置中的合约地址');
        log('blue', '2. 在区块浏览器中验证合约');
        log('blue', '3. 测试合约功能');
    }
}

// 使用说明
function showUsage() {
    log('cyan', '\n📖 使用说明');
    log('yellow', '设置环境变量:');
    log('blue', 'export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase"');
    log('gray', '# 或者');
    log('blue', 'export DEPLOYER_PRIVATE_KEY="0x..."');
    
    log('yellow', '\n运行部署:');
    log('blue', 'node simple-deploy.js rococo    # 部署到Rococo');
    log('blue', 'node simple-deploy.js westend   # 部署到Westend');
    log('blue', 'node simple-deploy.js local     # 部署到本地节点');

    log('yellow', '\n测试账户 (仅测试网):');
    log('blue', 'export DEPLOYER_MNEMONIC="//Alice"');
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showUsage();
        return;
    }

    const network = args[0] || 'rococo';
    
    log('cyan', `\n🎯 目标网络: ${network}`);
    
    const deployer = new SimpleDeployer(network);
    await deployer.deployAll();
}

// 错误处理
process.on('unhandledRejection', (error) => {
    log('red', `未处理的Promise错误: ${error.message}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    log('yellow', '\n\n⏹️  部署中断');
    process.exit(0);
});

if (require.main === module) {
    main().catch(error => {
        log('red', `部署错误: ${error.message}`);
        process.exit(1);
    });
}