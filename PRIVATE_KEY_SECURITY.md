# 私钥安全管理指南

## 当前脚本的私钥处理方式

### ⚠️ 安全问题识别

原始的 `deploy-contracts.js` 脚本存在以下安全风险：

1. **硬编码助记词**: 使用 `//Alice` 等测试助记词
2. **配置文件暴露**: 在 `deployment-config.json` 中存储敏感信息
3. **版本控制泄露**: 私钥可能被提交到 Git
4. **无加密保护**: 明文存储私钥信息

```javascript
// ❌ 不安全的做法
const deployerConfig = this.config.deploymentAccounts.alice;
this.deployer = this.keyring.addFromUri(deployerConfig.mnemonic); // "//Alice"
```

## 🔒 推荐的安全方案

### 方案1: 环境变量 (推荐)

**优点**: 不存储在代码中，易于CI/CD集成
**缺点**: 在某些环境中可能被其他进程访问

```bash
# 设置环境变量
export DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"
export DEPLOYER_PRIVATE_KEY="0x1234..." # 或者使用私钥

# 运行部署
node secure-deploy.js rococo
```

**脚本读取方式**:
```javascript
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const mnemonic = process.env.DEPLOYER_MNEMONIC;

if (mnemonic) {
    this.deployer = this.keyring.addFromMnemonic(mnemonic);
} else if (privateKey) {
    this.deployer = this.keyring.addFromUri(privateKey);
}
```

### 方案2: 加密的JSON密钥文件

**优点**: 密钥加密存储，支持密码保护
**缺点**: 需要管理密钥文件和密码

```bash
# 创建加密密钥文件 (使用 Polkadot.js 应用)
# 1. 在 Polkadot.js 应用中创建账户
# 2. 导出 JSON 格式密钥文件
# 3. 设置强密码

# 使用密钥文件部署
node secure-deploy.js rococo
# 选择选项3，输入文件路径和密码
```

### 方案3: 硬件钱包 (最安全)

**优点**: 私钥永不离开硬件设备
**缺点**: 需要硬件钱包支持，集成复杂

```javascript
// 需要额外的硬件钱包集成库
// 如 @polkadot/hw-ledger
```

### 方案4: 密钥管理服务

**优点**: 企业级安全，审计追踪
**缺点**: 复杂度高，可能产生费用

```javascript
// 集成 AWS KMS, Azure Key Vault 等
```

## 🛡️ 安全最佳实践

### 1. 网络隔离
```bash
# 仅在安全网络环境中运行部署
# 避免在公共WiFi或不信任的网络中操作
```

### 2. 环境变量管理
```bash
# 在 .bashrc 或 .zshrc 中设置
echo 'export DEPLOYER_MNEMONIC="your mnemonic"' >> ~/.bashrc

# 使用 .env 文件 (不要提交到Git)
echo "DEPLOYER_MNEMONIC=your mnemonic" > .env
echo ".env" >> .gitignore

# 在脚本中加载
require('dotenv').config();
```

### 3. 权限控制
```bash
# 限制密钥文件权限
chmod 600 keyfile.json

# 限制环境变量访问
# 使用专用用户运行部署脚本
```

### 4. 审计日志
```javascript
// 记录部署操作，但不记录私钥
console.log(`Deployment started by: ${deployer.address}`);
console.log(`Network: ${network}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
```

## 🔧 改进后的部署脚本

我已经创建了 `secure-deploy.js`，支持以下安全特性：

### 多种私钥输入方式
1. **环境变量** (推荐)
2. **交互式输入**
3. **JSON密钥文件**
4. **助记词短语**
5. **测试账户** (仅测试网)

### 安全特性
- ✅ 无硬编码私钥
- ✅ 支持密码保护
- ✅ 交互式确认
- ✅ 余额检查
- ✅ 网络验证
- ✅ 优雅退出

### 使用示例

```bash
# 1. 使用环境变量 (推荐)
export DEPLOYER_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
node secure-deploy.js rococo

# 2. 交互式输入
node secure-deploy.js rococo
# 按提示选择输入方式

# 3. 查看帮助
node secure-deploy.js --help
```

## ⚠️ 常见安全错误

### 1. 提交私钥到Git
```bash
# ❌ 错误: 将包含私钥的文件提交
git add deployment-config.json  # 包含助记词

# ✅ 正确: 使用 .gitignore
echo "*.key" >> .gitignore
echo ".env" >> .gitignore
echo "keyfile.json" >> .gitignore
```

### 2. 在日志中泄露私钥
```javascript
// ❌ 错误
console.log('Using mnemonic:', mnemonic);

// ✅ 正确
console.log('Using account:', account.address);
```

### 3. 不验证网络
```javascript
// ❌ 错误: 直接部署
await deployContract();

// ✅ 正确: 确认网络
if (network === 'mainnet') {
    const confirm = await askConfirmation('Deploy to MAINNET?');
    if (!confirm) return;
}
```

### 4. 重用测试私钥
```javascript
// ❌ 错误: 在主网使用测试私钥
if (network === 'mainnet' && mnemonic.includes('//')) {
    throw new Error('Cannot use test keys on mainnet');
}
```

## 🔍 安全检查清单

部署前请确认：

- [ ] 私钥未硬编码在代码中
- [ ] 私钥未提交到版本控制
- [ ] 使用强密码保护密钥文件
- [ ] 在安全网络环境中操作
- [ ] 确认目标网络正确
- [ ] 账户余额充足
- [ ] 备份重要账户信息
- [ ] 测试账户不用于主网
- [ ] 启用部署确认机制
- [ ] 记录部署日志（不含私钥）

## 📞 应急响应

如果私钥泄露：

1. **立即停止使用** 该账户
2. **转移资产** 到新的安全账户
3. **更新合约权限** (如果可能)
4. **审查访问日志** 查找异常活动
5. **通知团队** 和利益相关者
6. **更新安全程序** 防止再次发生

## 🛠️ 工具推荐

### 私钥管理
- **Polkadot.js Extension**: 浏览器插件钱包
- **Subkey**: Substrate 官方密钥工具
- **Hardware Wallets**: Ledger, Trezor

### 安全审计
- **Git-secrets**: 防止提交敏感信息
- **TruffleHog**: 扫描 Git 历史中的密钥
- **SOPS**: 加密配置文件

### 环境管理
- **Docker**: 容器化部署环境
- **dotenv**: 环境变量管理
- **Vault**: 企业级密钥管理

记住：**安全性 > 便利性**。永远不要为了方便而牺牲安全性！