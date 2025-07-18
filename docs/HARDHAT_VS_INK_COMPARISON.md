# Hardhat vs ink! Practical Comparison

## 🔄 Different Implementations of Similar Functionality

### 1. Project Initialization

#### Hardhat (Ethereum)
```bash
npm install --save-dev hardhat
npx hardhat init
```

**Generated Structure**:
```
my-project/
├── contracts/          # Solidity contracts
├── scripts/           # Deployment scripts
├── test/              # Test files
├── hardhat.config.js  # Configuration file
└── package.json
```

#### ink! (Polkadot)
```bash
# Method 1: cargo-contract
cargo contract new my_contract

# Method 2: Swanky (more like Hardhat)
npm install -g @astar-network/swanky-cli
swanky init my_project
```

**Generated Structure**:
```
my_project/
├── contracts/          # ink! contracts (Rust)
├── tests/             # Test files
├── deployments/       # Deployment records
├── scripts/           # Deployment scripts
├── swanky.config.json # Configuration file
└── package.json
```

### 2. Smart Contract Code

#### Hardhat - ERC20 Token
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Token {
    mapping(address => uint256) private _balances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function mint(address to, uint256 amount) public {
        _balances[to] += amount;
        _totalSupply += amount;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        address owner = msg.sender;
        require(_balances[owner] >= amount, "Insufficient balance");
        
        _balances[owner] -= amount;
        _balances[to] += amount;
        return true;
    }
}
```

#### ink! - PSP22 Token (ERC20 equivalent)
```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod token {
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct Token {
        total_supply: Balance,
        balances: Mapping<AccountId, Balance>,
        name: String,
        symbol: String,
    }

    impl Token {
        #[ink(constructor)]
        pub fn new(name: String, symbol: String) -> Self {
            Self {
                total_supply: 0,
                balances: Mapping::default(),
                name,
                symbol,
            }
        }

        #[ink(message)]
        pub fn mint(&mut self, to: AccountId, amount: Balance) {
            let balance = self.balance_of(to);
            self.balances.insert(to, &(balance + amount));
            self.total_supply += amount;
        }

        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(owner).unwrap_or(0)
        }

        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, amount: Balance) -> bool {
            let from = self.env().caller();
            let from_balance = self.balance_of(from);
            
            if from_balance < amount {
                return false;
            }

            self.balances.insert(from, &(from_balance - amount));
            let to_balance = self.balance_of(to);
            self.balances.insert(to, &(to_balance + amount));
            true
        }
    }
}
```

### 3. Test Code

#### Hardhat Testing
```javascript
// test/Token.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token", function () {
  let token;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy("MyToken", "MTK");
    await token.deployed();
  });

  it("Should mint tokens", async function () {
    await token.mint(addr1.address, 1000);
    expect(await token.balanceOf(addr1.address)).to.equal(1000);
  });

  it("Should transfer tokens", async function () {
    await token.mint(owner.address, 1000);
    await token.transfer(addr1.address, 500);
    
    expect(await token.balanceOf(owner.address)).to.equal(500);
    expect(await token.balanceOf(addr1.address)).to.equal(500);
  });
});
```

#### ink! Testing
```rust
// lib.rs - Built-in tests
#[cfg(test)]
mod tests {
    use super::*;

    #[ink::test]
    fn test_mint() {
        let mut token = Token::new("MyToken".to_string(), "MTK".to_string());
        let account = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
            .alice;
        
        token.mint(account, 1000);
        assert_eq!(token.balance_of(account), 1000);
    }

    #[ink::test] 
    fn test_transfer() {
        let mut token = Token::new("MyToken".to_string(), "MTK".to_string());
        let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
        
        token.mint(accounts.alice, 1000);
        
        // Set caller to Alice
        ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        
        assert!(token.transfer(accounts.bob, 500));
        assert_eq!(token.balance_of(accounts.alice), 500);
        assert_eq!(token.balance_of(accounts.bob), 500);
    }
}
```

### 4. Deployment Scripts

#### Hardhat Deployment
```javascript
// scripts/deploy.js
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy("MyToken", "MTK");
  await token.deployed();

  console.log("Token deployed to:", token.address);
  
  // Save deployment information
  const deployment = {
    network: network.name,
    token: token.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  require('fs').writeFileSync(
    `deployments/${network.name}.json`, 
    JSON.stringify(deployment, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

#### ink! Deployment (Our Solution)
```javascript
// deploy/simple-deploy.js
async function deployContract(contractName, contractFile, metadataFile) {
    console.log(`📦 Deploying contract: ${contractName}`);
    
    const wasm = fs.readFileSync(contractFile);
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    
    const code = new CodePromise(this.api, metadata, wasm);
    const gasLimit = this.api.registry.createType('WeightV2', {
        refTime: '5000000000000',
        proofSize: '2500000'
    });

    return new Promise((resolve, reject) => {
        const unsub = code.tx.new({ gasLimit, storageDepositLimit: null, value: 0 })
        .signAndSend(this.deployer, (result) => {
            if (result.status.isFinalized) {
                result.events.forEach(({ event }) => {
                    if (event.section === 'contracts' && event.method === 'Instantiated') {
                        const contractAddress = event.data[1].toString();
                        console.log(`📍 Contract address: ${contractAddress}`);
                        resolve({ address: contractAddress });
                    }
                });
                unsub();
            }
        });
    });
}
```

### 5. Configuration Files

#### Hardhat Configuration
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY]
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};
```

#### Swanky Configuration
```json
{
  "node": {
    "port": 9944,
    "binary": "substrate-contracts-node"
  },
  "networks": {
    "local": { "url": "ws://127.0.0.1:9944" },
    "rococo": { "url": "wss://rococo-contracts-rpc.polkadot.io" },
    "shibuya": { "url": "wss://rpc.shibuya.astar.network" }
  },
  "contracts": {
    "token": {
      "name": "token",
      "deployments": {
        "local": { "address": "5C4hr...", "deploymentBlock": 1 }
      }
    }
  },
  "accounts": {
    "alice": { "mnemonic": "//Alice", "isDev": true }
  }
}
```

### 6. Command Comparison

#### Hardhat Commands
```bash
# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy to local
npx hardhat run scripts/deploy.js --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.js --network goerli

# Verify contract
npx hardhat verify --network goerli DEPLOYED_CONTRACT_ADDRESS "MyToken" "MTK"

# Start local node
npx hardhat node
```

#### ink! Commands (Swanky)
```bash
# Compile
swanky contract compile token

# Test
swanky contract test token

# Deploy to local
swanky contract deploy token --constructor new --args "MyToken" "MTK" --network local

# Deploy to testnet
swanky contract deploy token --constructor new --args "MyToken" "MTK" --network shibuya

# Start local node
swanky node start

# Query contract
swanky contract query token balance_of --args 5GrwvaEF... --network local
```

#### ink! Commands (cargo-contract)
```bash
# Compile
cargo contract build

# Test
cargo test

# Deploy
cargo contract instantiate --constructor new --args "MyToken" "MTK" --suri //Alice

# Call
cargo contract call --contract 5C4hr... --message balance_of --args 5GrwvaEF... --suri //Alice
```

## 🏆 Summary Comparison

| Feature | Hardhat | Swanky | Our Solution |
|---------|---------|---------|--------------|
| **Learning Curve** | 🟢 Easy | 🟡 Medium | 🟡 Medium |
| **Ecosystem Maturity** | 🟢 Very Mature | 🟡 Rapidly Growing | 🟡 Customized |
| **Plugin Support** | 🟢 Rich | 🟡 Basic | 🔴 Custom Built |
| **Debugging Tools** | 🟢 Complete | 🟡 Basic | 🟡 Basic |
| **Documentation Quality** | 🟢 Excellent | 🟡 Good | 🟡 Self-made |
| **Community Support** | 🟢 Large | 🟡 Growing | 🟡 Professional |

## 💡 Recommendations

### Choose Hardhat if:
- Developing for Ethereum or EVM-compatible chains
- Need mature tooling ecosystem
- Team is familiar with JavaScript/TypeScript

### Choose Swanky if:
- Developing for Polkadot/Substrate ecosystem
- Prefer Hardhat-like experience
- Need multi-network deployment management

### Choose Custom Solution if:
- Need high customization
- Have special security requirements
- Team has sufficient technical expertise

**Conclusion**: While ink! cannot use Hardhat, Swanky provides a very similar development experience! 🦀