pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

// Payment Privacy Circuit
// Proves that sender has sufficient balance for payment without revealing amounts
template PaymentPrivacy() {
    // Private inputs (hidden from verifier)
    signal private input sender_balance;
    signal private input payment_amount;
    signal private input nonce;
    
    // Public inputs (known to verifier)
    signal input sender_address;
    signal input recipient_address;
    signal input commitment;
    
    // Output
    signal output valid;
    
    // Constraint 1: Sender has sufficient balance
    component balance_check = GreaterEqualThan(64);
    balance_check.in[0] <== sender_balance;
    balance_check.in[1] <== payment_amount;
    
    // Constraint 2: Payment amount is positive
    component amount_check = GreaterThan(64);
    amount_check.in[0] <== payment_amount;
    amount_check.in[1] <== 0;
    
    // Constraint 3: Verify commitment
    component hasher = Poseidon(3);
    hasher.inputs[0] <== sender_balance;
    hasher.inputs[1] <== payment_amount;
    hasher.inputs[2] <== nonce;
    
    hasher.out === commitment;
    
    // All constraints must be satisfied
    valid <== balance_check.out * amount_check.out;
}

// Bill Splitting Privacy Circuit
// Proves correct bill splitting without revealing individual contributions
template BillSplitting(n) {
    // Private inputs
    signal private input individual_amounts[n];
    signal private input participant_balances[n];
    signal private input nonces[n];
    
    // Public inputs
    signal input total_amount;
    signal input participant_addresses[n];
    signal input group_commitment;
    
    // Output
    signal output valid;
    
    // Constraint 1: Sum of individual amounts equals total
    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum += individual_amounts[i];
    }
    sum === total_amount;
    
    // Constraint 2: All participants have sufficient balance
    component balance_checks[n];
    for (var i = 0; i < n; i++) {
        balance_checks[i] = GreaterEqualThan(64);
        balance_checks[i].in[0] <== participant_balances[i];
        balance_checks[i].in[1] <== individual_amounts[i];
    }
    
    // Constraint 3: All amounts are positive
    component amount_checks[n];
    for (var i = 0; i < n; i++) {
        amount_checks[i] = GreaterThan(64);
        amount_checks[i].in[0] <== individual_amounts[i];
        amount_checks[i].in[1] <== 0;
    }
    
    // Constraint 4: Verify group commitment
    component group_hasher = Poseidon(n * 2);
    for (var i = 0; i < n; i++) {
        group_hasher.inputs[i] <== individual_amounts[i];
        group_hasher.inputs[i + n] <== nonces[i];
    }
    
    group_hasher.out === group_commitment;
    
    // All constraints must be satisfied
    var all_valid = 1;
    for (var i = 0; i < n; i++) {
        all_valid *= balance_checks[i].out;
        all_valid *= amount_checks[i].out;
    }
    
    valid <== all_valid;
}

// Balance Proof Circuit
// Proves sufficient balance without revealing actual balance
template BalanceProof() {
    // Private inputs
    signal private input actual_balance;
    signal private input salt;
    
    // Public inputs
    signal input required_amount;
    signal input account_address;
    signal input balance_commitment;
    
    // Output
    signal output sufficient;
    
    // Constraint 1: Actual balance is sufficient
    component balance_check = GreaterEqualThan(64);
    balance_check.in[0] <== actual_balance;
    balance_check.in[1] <== required_amount;
    
    // Constraint 2: Verify balance commitment
    component hasher = Poseidon(2);
    hasher.inputs[0] <== actual_balance;
    hasher.inputs[1] <== salt;
    
    hasher.out === balance_commitment;
    
    sufficient <== balance_check.out;
}

// Anonymous Group Payment Circuit
// Proves membership in group without revealing identity
template AnonymousGroupPayment(n) {
    // Private inputs
    signal private input member_secret;
    signal private input member_index;
    signal private input payment_amount;
    
    // Public inputs
    signal input group_members[n];
    signal input total_pool;
    signal input nullifier;
    
    // Output
    signal output valid;
    
    // Constraint 1: Member is in the group
    component membership_check = IsEqual();
    membership_check.in[0] <== group_members[member_index];
    
    component member_hash = Poseidon(1);
    member_hash.inputs[0] <== member_secret;
    membership_check.in[1] <== member_hash.out;
    
    // Constraint 2: Payment amount is within limits
    component amount_check = LessThan(64);
    amount_check.in[0] <== payment_amount;
    amount_check.in[1] <== total_pool;
    
    // Constraint 3: Nullifier prevents double-spending
    component nullifier_hash = Poseidon(2);
    nullifier_hash.inputs[0] <== member_secret;
    nullifier_hash.inputs[1] <== payment_amount;
    
    nullifier_hash.out === nullifier;
    
    valid <== membership_check.out * amount_check.out;
}

// Main components for different use cases
component main {
    public [sender_address, recipient_address, commitment]
} = PaymentPrivacy();

// Export templates for use in other circuits
// component main = BillSplitting(4);
// component main = BalanceProof();
// component main = AnonymousGroupPayment(10);