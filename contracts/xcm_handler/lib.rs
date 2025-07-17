#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod xcm_handler {
    use ink::storage::Mapping;
    
    /// XCM message types for cross-chain payments
    #[derive(Debug, PartialEq, Eq)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum XcmMessageType {
        Payment,
        BillSplitting,
        TokenTransfer,
        Refund,
    }
    
    /// Contract errors
    #[derive(Debug, PartialEq, Eq)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum Error {
        PaymentNotFound,
        UnauthorizedAccess,
        InvalidAmount,
        InvalidChain,
        AlreadyExecuted,
        InsufficientBalance,
        XcmExecutionFailed,
        InvalidDestination,
    }
    
    /// XCM handler contract storage
    #[ink(storage)]
    pub struct XcmHandler {
        /// Payment senders
        payment_senders: Mapping<u32, AccountId>,
        /// Payment recipients
        payment_recipients: Mapping<u32, AccountId>,
        /// Payment amounts
        payment_amounts: Mapping<u32, Balance>,
        /// Payment source chains
        payment_source_chains: Mapping<u32, u32>,
        /// Payment destination chains
        payment_destination_chains: Mapping<u32, u32>,
        /// Payment types
        payment_types: Mapping<u32, u8>, // Encoded XcmMessageType
        /// Payment execution status
        payment_executed: Mapping<u32, bool>,
        /// Payment creation timestamps
        payment_timestamps: Mapping<u32, u64>,
        /// Chain configurations (chain_id -> is_supported)
        supported_chains: Mapping<u32, bool>,
        /// User balances for cross-chain transfers
        balances: Mapping<AccountId, Balance>,
        /// Payment counter
        payment_counter: u32,
        /// Contract owner
        owner: AccountId,
        /// Relayer addresses for each chain
        relayers: Mapping<u32, AccountId>,
    }
    
    /// Events
    #[ink(event)]
    pub struct CrossChainPaymentCreated {
        #[ink(topic)]
        payment_id: u32,
        #[ink(topic)]
        sender: AccountId,
        #[ink(topic)]
        recipient: AccountId,
        amount: Balance,
        destination_chain: u32,
    }
    
    #[ink(event)]
    pub struct CrossChainPaymentExecuted {
        #[ink(topic)]
        payment_id: u32,
        #[ink(topic)]
        sender: AccountId,
        #[ink(topic)]
        recipient: AccountId,
        amount: Balance,
        executor: AccountId,
    }
    
    #[ink(event)]
    pub struct ChainConfigured {
        #[ink(topic)]
        chain_id: u32,
        supported: bool,
        relayer: Option<AccountId>,
    }
    
    #[ink(event)]
    pub struct BalanceDeposited {
        #[ink(topic)]
        account: AccountId,
        amount: Balance,
    }
    
    impl XcmHandler {
        /// Constructor
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();
            let mut instance = Self {
                payment_senders: Mapping::default(),
                payment_recipients: Mapping::default(),
                payment_amounts: Mapping::default(),
                payment_source_chains: Mapping::default(),
                payment_destination_chains: Mapping::default(),
                payment_types: Mapping::default(),
                payment_executed: Mapping::default(),
                payment_timestamps: Mapping::default(),
                supported_chains: Mapping::default(),
                balances: Mapping::default(),
                payment_counter: 0,
                owner: caller,
                relayers: Mapping::default(),
            };
            
            // Initialize with some default supported chains
            instance.supported_chains.insert(1000, &true); // Rococo
            instance.supported_chains.insert(2000, &true); // Westend
            instance.supported_chains.insert(3000, &true); // Kusama
            
            instance
        }
        
        /// Default constructor
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new()
        }
        
        /// Create a cross-chain payment request
        #[ink(message)]
        pub fn create_cross_chain_payment(
            &mut self,
            recipient: AccountId,
            amount: Balance,
            destination_chain: u32,
            message_type: XcmMessageType,
        ) -> Result<u32, Error> {
            let sender = self.env().caller();
            
            // Validate amount
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            
            // Check if destination chain is supported
            if !self.supported_chains.get(destination_chain).unwrap_or(false) {
                return Err(Error::InvalidChain);
            }
            
            // Check sender balance
            let sender_balance = self.balances.get(sender).unwrap_or(0);
            if sender_balance < amount {
                return Err(Error::InsufficientBalance);
            }
            
            // Get source chain (simplified - in real implementation would detect actual chain)
            let source_chain = 1000; // Default to Rococo
            
            let payment_id = self.payment_counter;
            
            // Store payment information
            self.payment_senders.insert(payment_id, &sender);
            self.payment_recipients.insert(payment_id, &recipient);
            self.payment_amounts.insert(payment_id, &amount);
            self.payment_source_chains.insert(payment_id, &source_chain);
            self.payment_destination_chains.insert(payment_id, &destination_chain);
            
            // Encode message type as u8
            let msg_type = match message_type {
                XcmMessageType::Payment => 0,
                XcmMessageType::BillSplitting => 1,
                XcmMessageType::TokenTransfer => 2,
                XcmMessageType::Refund => 3,
            };
            self.payment_types.insert(payment_id, &msg_type);
            
            self.payment_executed.insert(payment_id, &false);
            self.payment_timestamps.insert(payment_id, &self.env().block_timestamp());
            
            // Deduct from sender balance
            self.balances.insert(sender, &sender_balance.saturating_sub(amount));
            
            self.payment_counter = self.payment_counter.saturating_add(1);
            
            self.env().emit_event(CrossChainPaymentCreated {
                payment_id,
                sender,
                recipient,
                amount,
                destination_chain,
            });
            
            Ok(payment_id)
        }
        
        /// Execute a cross-chain payment (called by relayer)
        #[ink(message)]
        pub fn execute_cross_chain_payment(
            &mut self,
            payment_id: u32,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            
            // Check if payment exists
            if !self.payment_senders.contains(payment_id) {
                return Err(Error::PaymentNotFound);
            }
            
            // Check if already executed
            if self.payment_executed.get(payment_id).unwrap_or(false) {
                return Err(Error::AlreadyExecuted);
            }
            
            let destination_chain = self.payment_destination_chains.get(payment_id).unwrap_or(0);
            
            // Verify caller is authorized relayer for the destination chain
            let authorized_relayer = self.relayers.get(destination_chain);
            if authorized_relayer != Some(caller) && caller != self.owner {
                return Err(Error::UnauthorizedAccess);
            }
            
            // Mark as executed
            self.payment_executed.insert(payment_id, &true);
            
            // Add balance to recipient (on destination chain)
            let recipient = self.payment_recipients.get(payment_id).unwrap();
            let amount = self.payment_amounts.get(payment_id).unwrap_or(0);
            let recipient_balance = self.balances.get(recipient).unwrap_or(0);
            self.balances.insert(recipient, &recipient_balance.saturating_add(amount));
            
            let sender = self.payment_senders.get(payment_id).unwrap();
            
            self.env().emit_event(CrossChainPaymentExecuted {
                payment_id,
                sender,
                recipient,
                amount,
                executor: caller,
            });
            
            Ok(())
        }
        
        /// Configure supported chains
        #[ink(message)]
        pub fn configure_chain(
            &mut self,
            chain_id: u32,
            supported: bool,
            relayer: Option<AccountId>,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::UnauthorizedAccess);
            }
            
            self.supported_chains.insert(chain_id, &supported);
            
            if let Some(relayer_address) = relayer {
                self.relayers.insert(chain_id, &relayer_address);
            }
            
            self.env().emit_event(ChainConfigured {
                chain_id,
                supported,
                relayer,
            });
            
            Ok(())
        }
        
        /// Deposit balance for cross-chain transfers
        #[ink(message, payable)]
        pub fn deposit(&mut self) {
            let caller = self.env().caller();
            let amount = self.env().transferred_value();
            
            if amount > 0 {
                let current_balance = self.balances.get(caller).unwrap_or(0);
                self.balances.insert(caller, &current_balance.saturating_add(amount));
                
                self.env().emit_event(BalanceDeposited {
                    account: caller,
                    amount,
                });
            }
        }
        
        /// Get payment details
        #[ink(message)]
        pub fn get_payment_info(&self, payment_id: u32) -> Option<(AccountId, AccountId, Balance, u32, u32, bool)> {
            if !self.payment_senders.contains(payment_id) {
                return None;
            }
            
            let sender = self.payment_senders.get(payment_id)?;
            let recipient = self.payment_recipients.get(payment_id)?;
            let amount = self.payment_amounts.get(payment_id).unwrap_or(0);
            let source_chain = self.payment_source_chains.get(payment_id).unwrap_or(0);
            let destination_chain = self.payment_destination_chains.get(payment_id).unwrap_or(0);
            let executed = self.payment_executed.get(payment_id).unwrap_or(false);
            
            Some((sender, recipient, amount, source_chain, destination_chain, executed))
        }
        
        /// Get user balance
        #[ink(message)]
        pub fn get_balance(&self, account: AccountId) -> Balance {
            self.balances.get(account).unwrap_or(0)
        }
        
        /// Check if chain is supported
        #[ink(message)]
        pub fn is_chain_supported(&self, chain_id: u32) -> bool {
            self.supported_chains.get(chain_id).unwrap_or(false)
        }
        
        /// Get pending payments count for a user
        #[ink(message)]
        pub fn get_pending_payments_count(&self, user: AccountId) -> u32 {
            let mut count: u32 = 0;
            
            // In a real implementation, we'd have better indexing
            for i in 0..self.payment_counter {
                if let Some(sender) = self.payment_senders.get(i) {
                    if let Some(recipient) = self.payment_recipients.get(i) {
                        let executed = self.payment_executed.get(i).unwrap_or(false);
                        if (sender == user || recipient == user) && !executed {
                            count = count.saturating_add(1);
                        }
                    }
                }
            }
            
            count
        }
    }
    
    /// Unit tests
    #[cfg(test)]
    mod tests {
        use super::*;
        
        #[ink::test]
        fn default_works() {
            let xcm_handler = XcmHandler::default();
            assert_eq!(xcm_handler.payment_counter, 0);
            assert!(xcm_handler.is_chain_supported(1000)); // Rococo
            assert!(xcm_handler.is_chain_supported(2000)); // Westend
        }
        
        #[ink::test]
        fn deposit_works() {
            let mut xcm_handler = XcmHandler::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Set transferred value
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);
            
            xcm_handler.deposit();
            
            assert_eq!(xcm_handler.get_balance(accounts.alice), 1000);
        }
        
        #[ink::test]
        fn create_payment_works() {
            let mut xcm_handler = XcmHandler::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Deposit funds first
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(5000);
            xcm_handler.deposit();
            
            // Create cross-chain payment
            let payment_id = xcm_handler.create_cross_chain_payment(
                accounts.bob,
                1000,
                2000, // Westend
                XcmMessageType::Payment,
            ).unwrap();
            
            assert_eq!(payment_id, 0);
            
            let payment = xcm_handler.get_payment_info(payment_id).unwrap();
            assert_eq!(payment.0, accounts.alice); // sender
            assert_eq!(payment.1, accounts.bob); // recipient
            assert_eq!(payment.2, 1000); // amount
            assert_eq!(payment.4, 2000); // destination_chain
            assert!(!payment.5); // executed
            
            // Check balance was deducted
            assert_eq!(xcm_handler.get_balance(accounts.alice), 4000);
        }
        
        #[ink::test]
        fn execute_payment_works() {
            let mut xcm_handler = XcmHandler::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Configure relayer
            xcm_handler.configure_chain(2000, true, Some(accounts.charlie)).unwrap();
            
            // Deposit funds
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(5000);
            xcm_handler.deposit();
            
            // Create payment
            let payment_id = xcm_handler.create_cross_chain_payment(
                accounts.bob,
                1000,
                2000,
                XcmMessageType::Payment,
            ).unwrap();
            
            // Switch to relayer
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.charlie);
            
            // Execute payment
            xcm_handler.execute_cross_chain_payment(payment_id).unwrap();
            
            let payment = xcm_handler.get_payment_info(payment_id).unwrap();
            assert!(payment.5); // executed
            
            // Check recipient received funds
            assert_eq!(xcm_handler.get_balance(accounts.bob), 1000);
        }
        
        #[ink::test]
        fn invalid_chain_fails() {
            let mut xcm_handler = XcmHandler::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Deposit funds
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(5000);
            xcm_handler.deposit();
            
            // Try to send to unsupported chain
            let result = xcm_handler.create_cross_chain_payment(
                accounts.bob,
                1000,
                9999, // Unsupported chain
                XcmMessageType::Payment,
            );
            
            assert_eq!(result, Err(Error::InvalidChain));
        }
        
        #[ink::test]
        fn insufficient_balance_fails() {
            let mut xcm_handler = XcmHandler::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Try to send without depositing
            let result = xcm_handler.create_cross_chain_payment(
                accounts.bob,
                1000,
                2000,
                XcmMessageType::Payment,
            );
            
            assert_eq!(result, Err(Error::InsufficientBalance));
        }
    }
}