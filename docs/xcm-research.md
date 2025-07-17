# XCM (Cross-Chain Message Passing) Research

## Overview
XCM is Polkadot's cross-chain messaging format that enables parachains to communicate with each other and the relay chain.

## Key Concepts

### 1. XCM Format
- **Versioned**: XCM v3 is current, v4 in development
- **Instruction-based**: Series of instructions executed on destination chain
- **Asset-agnostic**: Works with any asset type

### 2. Core Instructions
- **WithdrawAsset**: Remove assets from holding register
- **DepositAsset**: Deposit assets to beneficiary account
- **TransferAsset**: Direct asset transfer between chains
- **Teleport**: Move assets between trusted chains

### 3. Location System
- **MultiLocation**: Identifies any location in the ecosystem
- **Relative/Absolute**: Locations can be relative or absolute
- **Junctions**: Path components (Parachain, AccountId32, etc.)

## XCM for 0xCC Implementation

### Payment Use Cases

#### 1. Simple Cross-Chain Payment
```rust
// Example XCM message for cross-chain payment
vec![
    WithdrawAsset((Here, 1000).into()),
    InitiateReserveWithdraw {
        assets: (Here, 1000).into(),
        reserve: (Parent, Parachain(2000)).into(),
        xcm: vec![
            DepositAsset {
                assets: All.into(),
                beneficiary: AccountId32 { 
                    network: None, 
                    id: recipient.into() 
                }.into(),
            }
        ]
    }
]
```

#### 2. Multi-Chain Bill Splitting
```rust
// Split payment across multiple chains
vec![
    // Withdraw from Asset Hub
    WithdrawAsset((Parent, Parachain(1000), Here, 500).into()),
    // Send portion to Parachain A
    InitiateReserveWithdraw {
        assets: (Parent, Parachain(1000), Here, 200).into(),
        reserve: (Parent, Parachain(2000)).into(),
        xcm: vec![DepositAsset { /* ... */ }]
    },
    // Send portion to Parachain B
    InitiateReserveWithdraw {
        assets: (Parent, Parachain(1000), Here, 300).into(),
        reserve: (Parent, Parachain(3000)).into(),
        xcm: vec![DepositAsset { /* ... */ }]
    }
]
```

### 3. Asset Management

#### Reserve-Based Transfers
- **Reserve Chain**: Original chain holding the asset
- **Derivative Assets**: Representations on other chains
- **Trust Model**: Chains must trust the reserve

#### Teleportation
- **Trusted Teleport**: For chains with high trust
- **Burn & Mint**: Asset destroyed on source, minted on destination
- **Use Case**: DOT between relay chain and Asset Hub

## Implementation Strategy

### 1. Smart Contract Integration
```rust
// ink! contract with XCM support
#[ink::contract]
mod cross_chain_payment {
    use ink::prelude::vec::Vec;
    use scale::{Encode, Decode};
    
    #[ink(storage)]
    pub struct CrossChainPayment {
        pending_payments: ink::storage::Mapping<u32, PaymentInfo>,
        payment_counter: u32,
    }
    
    #[derive(Encode, Decode)]
    pub struct PaymentInfo {
        sender: AccountId,
        recipient: AccountId,
        amount: Balance,
        destination_chain: u32,
        status: PaymentStatus,
    }
    
    impl CrossChainPayment {
        #[ink(message)]
        pub fn initiate_cross_chain_payment(
            &mut self,
            recipient: AccountId,
            amount: Balance,
            destination_chain: u32,
        ) -> Result<u32, Error> {
            // Create payment record
            let payment_id = self.payment_counter;
            let payment_info = PaymentInfo {
                sender: self.env().caller(),
                recipient,
                amount,
                destination_chain,
                status: PaymentStatus::Pending,
            };
            
            self.pending_payments.insert(payment_id, &payment_info);
            self.payment_counter += 1;
            
            // Emit event for off-chain processing
            self.env().emit_event(CrossChainPaymentInitiated {
                payment_id,
                sender: payment_info.sender,
                recipient,
                amount,
                destination_chain,
            });
            
            Ok(payment_id)
        }
    }
}
```

### 2. Off-Chain XCM Construction
```typescript
// Frontend XCM message construction
import { ApiPromise } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

class XCMPaymentService {
    constructor(private sourceApi: ApiPromise, private destApi: ApiPromise) {}
    
    async sendCrossChainPayment(
        recipient: string,
        amount: string,
        sourceChain: number,
        destChain: number
    ) {
        // Construct XCM message
        const xcmMessage = this.sourceApi.createType('VersionedXcm', {
            V3: [
                {
                    WithdrawAsset: [
                        {
                            id: { Concrete: { parents: 1, interior: 'Here' } },
                            fun: { Fungible: amount }
                        }
                    ]
                },
                {
                    InitiateReserveWithdraw: {
                        assets: {
                            Wild: 'All'
                        },
                        reserve: {
                            parents: 1,
                            interior: { X1: { Parachain: destChain } }
                        },
                        xcm: [
                            {
                                DepositAsset: {
                                    assets: { Wild: 'All' },
                                    beneficiary: {
                                        parents: 0,
                                        interior: {
                                            X1: {
                                                AccountId32: {
                                                    network: null,
                                                    id: recipient
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        });
        
        // Send via polkadotXcm pallet
        const tx = this.sourceApi.tx.polkadotXcm.send(
            { V3: { parents: 1, interior: { X1: { Parachain: destChain } } } },
            xcmMessage
        );
        
        return tx;
    }
}
```

## Integration with Hyperbridge

### Enhanced Cross-Chain Messaging
- **Hyperbridge**: Alternative to native XCM for specific use cases
- **Lower Latency**: Faster cross-chain message delivery
- **Cost Optimization**: Reduced fees for frequent operations

### Use Case: Real-time Bill Splitting
```rust
// Hyperbridge integration for instant settlements
#[ink(message)]
pub fn hyperbridge_settle_bill(
    &mut self,
    bill_id: u32,
    settlements: Vec<ChainSettlement>,
) -> Result<(), Error> {
    // Validate bill exists and is ready for settlement
    let bill = self.bills.get(&bill_id).ok_or(Error::BillNotFound)?;
    
    // Send settlement messages via Hyperbridge
    for settlement in settlements {
        self.send_hyperbridge_message(
            settlement.chain_id,
            settlement.amount,
            settlement.recipient,
        )?;
    }
    
    // Mark bill as settled
    self.bills.insert(bill_id, &Bill {
        status: BillStatus::Settled,
        ..bill
    });
    
    Ok(())
}
```

## Error Handling

### XCM Failure Modes
- **Barrier Failures**: XCM blocked by destination chain
- **Asset Failures**: Insufficient assets or unknown asset type
- **Execution Failures**: XCM instruction execution failed

### Recovery Strategies
```rust
#[ink(message)]
pub fn handle_xcm_failure(
    &mut self,
    payment_id: u32,
    error_code: u32,
) -> Result<(), Error> {
    let mut payment = self.pending_payments
        .get(&payment_id)
        .ok_or(Error::PaymentNotFound)?;
    
    match error_code {
        // Insufficient fee - retry with higher fee
        1 => {
            payment.status = PaymentStatus::RetryWithHigherFee;
        },
        // Asset not found - convert to different asset
        2 => {
            payment.status = PaymentStatus::ConvertAsset;
        },
        // Destination unreachable - refund
        3 => {
            payment.status = PaymentStatus::Refund;
        },
        _ => {
            payment.status = PaymentStatus::Failed;
        }
    }
    
    self.pending_payments.insert(payment_id, &payment);
    Ok(())
}
```

## Testing Strategy

### 1. Local Development
- **Zombienet**: Multi-chain test environment
- **Chopsticks**: Fork existing chains for testing
- **XCM Simulator**: Test XCM messages locally

### 2. Testnet Deployment
- **Rococo**: Polkadot test network
- **Westend**: Kusama test network
- **Parachain Testnets**: Deploy on test parachains

### 3. Integration Testing
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use ink::testing::mock_env;
    
    #[ink::test]
    fn test_cross_chain_payment() {
        let mut contract = CrossChainPayment::new();
        
        // Test payment initiation
        let payment_id = contract.initiate_cross_chain_payment(
            AccountId::from([1; 32]),
            1000,
            2000, // Destination parachain
        ).unwrap();
        
        assert_eq!(payment_id, 0);
        
        // Test payment status
        let payment = contract.get_payment_info(payment_id).unwrap();
        assert_eq!(payment.status, PaymentStatus::Pending);
    }
}
```

## Next Steps

1. **Set up Zombienet**: Local multi-chain testing environment
2. **Implement Basic XCM**: Simple cross-chain asset transfers
3. **Add Error Handling**: Robust failure recovery
4. **Integrate Hyperbridge**: Alternative messaging for specific use cases
5. **Performance Testing**: Optimize for latency and cost