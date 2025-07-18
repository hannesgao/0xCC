# 🔒 安全部署指南

## 问题解答：脚本如何传递私钥？

### 原始脚本的问题

原始的 `deploy-contracts.js` 脚本存在安全漏洞：

```javascript
// ❌ 不安全 - 硬编码测试助记词
const deployerConfig = this.config.deploymentAccounts.alice;
this.deployer = this.keyring.addFromUri(deployerConfig.mnemonic); // "//Alice"
```

**安全风险**：
- 私钥硬编码在配置文件中
- 可能被意外提交到版本控制
- 任何能访问代码的人都能看到私钥

### 🛡️ 改进的安全方案

我创建了多个安全的部署脚本：

#### 1. 简单安全脚本 (`simple-deploy.js`) - 推荐

**使用环境变量传递私钥**：

```bash
# 设置环境变量
export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase"
# 或者
export DEPLOYER_PRIVATE_KEY="0x1234..."

# 运行部署
node deploy/simple-deploy.js rococo
```

**脚本读取方式**：
```javascript
const mnemonic = process.env.DEPLOYER_MNEMONIC;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (mnemonic) {
    this.deployer = keyring.addFromMnemonic(mnemonic);
} else if (privateKey) {
    this.deployer = keyring.addFromUri(privateKey);
} else {
    throw new Error('缺少部署账户环境变量');
}
```

#### 2. 高级安全脚本 (`secure-deploy.js`)

支持多种输入方式：
- 环境变量 (推荐)
- 交互式输入
- 加密JSON文件
- 助记词输入
- 测试账户 (仅测试网)

## 🚀 快速开始

### 步骤1: 准备环境

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 文件，添加你的私钥
nano .env
```

在 `.env` 文件中添加：
```bash
# 使用助记词 (推荐)
DEPLOYER_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

# 或使用私钥
# DEPLOYER_PRIVATE_KEY="0x..."
```

### 步骤2: 获取测试代币

访问 Polkadot 测试网水龙头:
https://paritytech.github.io/polkadot-testnet-faucet/

### 步骤3: 部署合约

```bash
# 使用简单脚本部署到 Rococo
node deploy/simple-deploy.js rococo

# 或部署到 Westend
node deploy/simple-deploy.js westend
```

## 📋 部署流程演示

```bash
$ node deploy/simple-deploy.js rococo

🎯 目标网络: rococo

🚀 开始 0xCC 合约部署
=====================================

🔑 从环境变量加载部署账户...
✅ 使用助记词创建账户
🔌 连接到 Rococo Testnet...
RPC: wss://rococo-contracts-rpc.polkadot.io
✅ 连接成功: Rococo
📍 部署账户: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
💰 账户余额: 158.2340 ROC

1️⃣ 部署账单分割合约...

📦 部署合约: Bill Splitting
📄 合约大小: 45.23 KB
⛽ 估算部署费用...
🚀 提交部署交易...
✅ 交易已打包: 0x1234...
🎉 交易已确认: 0x5678...
📍 合约地址: 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM

2️⃣ 部署XCM处理合约...

📦 部署合约: XCM Handler
📄 合约大小: 38.71 KB
⛽ 估算部署费用...
🚀 提交部署交易...
✅ 交易已打包: 0x9abc...
🎉 交易已确认: 0xdef0...
📍 合约地址: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty

💾 部署信息已保存: deployment-rococo-1234567890.json

🎉 所有合约部署成功！

📋 部署摘要
=================
网络: Rococo Testnet
部署者: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
时间: 2025-07-18 15:30:45

📍 合约地址:
账单分割: 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM
XCM处理: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty

📝 下一步:
1. 更新前端配置中的合约地址
2. 在区块浏览器中验证合约
3. 测试合约功能

👋 已断开连接
```

## 🔐 安全最佳实践

### 1. 环境变量管理

```bash
# ✅ 好的做法
export DEPLOYER_MNEMONIC="real mnemonic words here"
node deploy/simple-deploy.js rococo

# ❌ 错误做法
echo "mnemonic=secret words" >> deployment-config.json  # 可能被提交到Git
```

### 2. 文件权限

```bash
# 限制 .env 文件权限
chmod 600 .env

# 检查 .gitignore 包含敏感文件
grep -E "\.env|\.key|mnemonic" .gitignore
```

### 3. 网络验证

```bash
# 脚本会自动验证网络，防止误部署
if (network === 'mainnet' && mnemonic.includes('//')) {
    throw new Error('不能在主网使用测试账户');
}
```

## 📁 相关文件说明

| 文件 | 用途 | 安全性 |
|------|------|--------|
| `deploy-contracts.js` | 原始部署脚本 | ❌ 硬编码私钥 |
| `simple-deploy.js` | 简化安全脚本 | ✅ 环境变量 |
| `secure-deploy.js` | 高级安全脚本 | ✅ 多种输入方式 |
| `.env.example` | 环境变量模板 | ✅ 无敏感信息 |
| `.env` | 实际环境变量 | ⚠️ 包含私钥，已在gitignore |
| `PRIVATE_KEY_SECURITY.md` | 详细安全指南 | ✅ 教育文档 |

## ⚠️ 安全警告

### 永远不要：
- ❌ 将私钥硬编码在源代码中
- ❌ 将包含私钥的文件提交到Git
- ❌ 在不安全的网络中使用真实私钥
- ❌ 在公共电脑上输入私钥
- ❌ 在主网使用测试私钥

### 始终要：
- ✅ 使用环境变量传递私钥
- ✅ 将敏感文件添加到 .gitignore
- ✅ 在安全环境中进行部署
- ✅ 定期备份重要账户
- ✅ 验证目标网络

## 🆘 应急处理

如果私钥泄露：

1. **立即停止** 使用该账户
2. **转移资产** 到新的安全账户
3. **撤销权限** (如果可能)
4. **生成新私钥** 用于后续部署
5. **审查日志** 查找可疑活动

## 📞 获取帮助

- **文档**: 查看 `PRIVATE_KEY_SECURITY.md`
- **示例**: 参考 `.env.example`
- **Polkadot Discord**: #smart-contracts 频道
- **Stack Exchange**: https://substrate.stackexchange.com

---

**记住：安全第一！** 🛡️

宁可多花几分钟设置安全的部署流程，也不要冒险使用不安全的方法。