# ZK Circuits for 0xCC

This directory contains zero-knowledge proof circuits for privacy-preserving payments and bill splitting in the 0xCC application.

## Overview

The ZK circuits enable:
- Private payment amounts while proving validity
- Anonymous bill splitting with group totals verification
- Balance proofs without revealing actual balances

## Planned Circuits

### 1. Payment Privacy Circuit
- **Purpose**: Prove payment validity without revealing amount
- **Inputs**: 
  - Private: sender_balance, payment_amount, recipient_address
  - Public: sender_address, proof_of_payment
- **Constraints**: sender_balance >= payment_amount

### 2. Bill Splitting Circuit
- **Purpose**: Prove correct bill splitting without revealing individual contributions
- **Inputs**:
  - Private: individual_amounts[], participant_balances[]
  - Public: total_amount, participant_addresses[], group_id
- **Constraints**: sum(individual_amounts) = total_amount, all balances >= individual_amounts

### 3. Balance Proof Circuit
- **Purpose**: Prove sufficient balance without revealing actual balance
- **Inputs**:
  - Private: actual_balance, required_amount
  - Public: account_address, proof_of_solvency
- **Constraints**: actual_balance >= required_amount

## Technology Stack

### Options Under Consideration:
1. **Circom**: Most popular, good tooling
2. **Noir**: Rust-based, good for Substrate integration
3. **Arkworks**: Rust ecosystem, flexible

### Current Choice: Circom
- Mature ecosystem
- Good documentation
- JavaScript/TypeScript integration for frontend
- Trusted setup available

## Implementation Plan

### Phase 1: Basic Payment Privacy
```circom
pragma circom 2.0.0;

template PaymentPrivacy() {
    signal private input sender_balance;
    signal private input payment_amount;
    signal input sender_address;
    signal input recipient_address;
    signal output proof;
    
    // Constraint: sender has sufficient balance
    component geq = GreaterEqualThan(64);
    geq.in[0] <== sender_balance;
    geq.in[1] <== payment_amount;
    geq.out === 1;
    
    // Generate proof
    proof <== sender_balance + payment_amount;
}
```

### Phase 2: Bill Splitting
```circom
template BillSplitting(n) {
    signal private input individual_amounts[n];
    signal private input participant_balances[n];
    signal input total_amount;
    signal input participant_addresses[n];
    signal output valid;
    
    // Sum individual amounts
    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum += individual_amounts[i];
    }
    
    // Constraint: sum equals total
    sum === total_amount;
    
    // Constraint: all participants have sufficient balance
    component geq[n];
    for (var i = 0; i < n; i++) {
        geq[i] = GreaterEqualThan(64);
        geq[i].in[0] <== participant_balances[i];
        geq[i].in[1] <== individual_amounts[i];
        geq[i].out === 1;
    }
    
    valid <== 1;
}
```

## Integration with Smart Contracts

### Verification Flow:
1. Frontend generates ZK proof using circuit
2. Proof submitted to ink! smart contract
3. Contract verifies proof on-chain
4. Payment processed if proof is valid

### Contract Integration:
```rust
// In payment contract
#[ink(message)]
pub fn verify_payment_with_proof(
    &self,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<bool, Error> {
    // Verify ZK proof
    // Process payment if valid
}
```

## Development Steps

1. **Set up Circom environment**
   - Install circom compiler
   - Set up snarkjs for proof generation
   - Configure trusted setup

2. **Implement basic circuits**
   - Payment privacy circuit
   - Test with sample inputs

3. **Frontend integration**
   - Generate proofs in browser
   - Submit to smart contract

4. **Smart contract verification**
   - Implement proof verification
   - Handle invalid proofs

## Testing Strategy

### Unit Tests:
- Test each circuit with valid/invalid inputs
- Verify constraint satisfaction
- Performance benchmarks

### Integration Tests:
- End-to-end proof generation and verification
- Contract interaction testing
- Frontend integration testing

## Future Enhancements

1. **Anonymous Groups**: Hide participant identities
2. **Recursive Proofs**: Batch multiple payments
3. **Range Proofs**: Prove amounts in specific ranges
4. **Membership Proofs**: Prove participation without revealing identity

## Security Considerations

- **Trusted Setup**: Use ceremony or universal setup
- **Circuit Auditing**: Formal verification of constraints
- **Key Management**: Secure handling of proving/verifying keys
- **Front-running Protection**: Prevent MEV attacks

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [ZK-SNARKs Explained](https://z.cash/technology/zksnarks/)
- [Arkworks Framework](https://github.com/arkworks-rs)
- [Noir Language](https://noir-lang.org/)

## Notes

This is a proof-of-concept implementation for the hackathon. Production deployment would require:
- Formal security audits
- Trusted setup ceremony
- Gas optimization
- Circuit complexity analysis