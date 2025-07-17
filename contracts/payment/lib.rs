#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod payment {
    use ink::storage::Mapping;

    /// Contract errors
    #[derive(Debug, PartialEq, Eq)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum Error {
        InsufficientBalance,
        InvalidAmount,
        SelfPayment,
    }

    /// Payment contract storage
    #[ink(storage)]
    pub struct Payment {
        /// User balances
        balances: Mapping<AccountId, Balance>,
        /// Transaction counter
        transaction_counter: u32,
        /// Request counter
        request_counter: u32,
        /// Total supply
        total_supply: Balance,
        /// Contract owner
        owner: AccountId,
    }

    /// Events
    #[ink(event)]
    pub struct PaymentSent {
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
        transaction_id: u32,
    }

    #[ink(event)]
    pub struct PaymentRequestCreated {
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
        request_id: u32,
    }

    #[ink(event)]
    pub struct PaymentRequestApproved {
        #[ink(topic)]
        request_id: u32,
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct CrossChainPaymentInitiated {
        #[ink(topic)]
        transaction_id: u32,
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
        destination_chain: u32,
    }

    impl Payment {
        /// Constructor that initializes the contract
        #[ink(constructor)]
        pub fn new(initial_supply: Balance) -> Self {
            let caller = Self::env().caller();
            let mut balances = Mapping::default();
            balances.insert(caller, &initial_supply);

            Self {
                balances,
                transaction_counter: 0,
                request_counter: 0,
                total_supply: initial_supply,
                owner: caller,
            }
        }

        /// Default constructor
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new(1_000_000_000_000) // 1 million tokens with 6 decimals
        }

        /// Send payment to another account
        #[ink(message)]
        pub fn send_payment(
            &mut self,
            to: AccountId,
            amount: Balance,
        ) -> Result<u32, Error> {
            let from = self.env().caller();
            
            if from == to {
                return Err(Error::SelfPayment);
            }

            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            let from_balance = self.balances.get(from).unwrap_or_default();
            if from_balance < amount {
                return Err(Error::InsufficientBalance);
            }

            // Update balances
            self.balances.insert(from, &(from_balance.saturating_sub(amount)));
            let to_balance = self.balances.get(to).unwrap_or_default();
            self.balances.insert(to, &(to_balance.saturating_add(amount)));

            let transaction_id = self.transaction_counter;
            self.transaction_counter = self.transaction_counter.saturating_add(1);

            // Emit event
            self.env().emit_event(PaymentSent {
                from,
                to,
                amount,
                transaction_id,
            });

            Ok(transaction_id)
        }

        /// Initiate cross-chain payment
        #[ink(message)]
        pub fn initiate_cross_chain_payment(
            &mut self,
            to: AccountId,
            amount: Balance,
            destination_chain: u32,
        ) -> Result<u32, Error> {
            let from = self.env().caller();
            
            if from == to {
                return Err(Error::SelfPayment);
            }

            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            let from_balance = self.balances.get(from).unwrap_or_default();
            if from_balance < amount {
                return Err(Error::InsufficientBalance);
            }

            // Lock funds for cross-chain transfer
            self.balances.insert(from, &(from_balance.saturating_sub(amount)));

            let transaction_id = self.transaction_counter;
            self.transaction_counter = self.transaction_counter.saturating_add(1);

            // Emit event for off-chain processing
            self.env().emit_event(CrossChainPaymentInitiated {
                transaction_id,
                from,
                to,
                amount,
                destination_chain,
            });

            Ok(transaction_id)
        }

        /// Get balance of account
        #[ink(message)]
        pub fn balance_of(&self, account: AccountId) -> Balance {
            self.balances.get(account).unwrap_or_default()
        }

        /// Get transaction counter
        #[ink(message)]
        pub fn get_transaction_counter(&self) -> u32 {
            self.transaction_counter
        }

        /// Get request counter
        #[ink(message)]
        pub fn get_request_counter(&self) -> u32 {
            self.request_counter
        }

        /// Get total supply
        #[ink(message)]
        pub fn get_total_supply(&self) -> Balance {
            self.total_supply
        }

        /// Get contract owner
        #[ink(message)]
        pub fn get_owner(&self) -> AccountId {
            self.owner
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(test)]
    mod tests {
        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        /// We test if the default constructor does its job.
        #[ink::test]
        fn default_works() {
            let payment = Payment::default();
            let owner = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice;
            assert_eq!(payment.balance_of(owner), 1_000_000_000_000);
        }

        /// We test a simple payment scenario.
        #[ink::test]
        fn send_payment_works() {
            let mut payment = Payment::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Test successful payment
            let tx_id = payment.send_payment(accounts.bob, 100).unwrap();
            assert_eq!(tx_id, 0);
            assert_eq!(payment.balance_of(accounts.alice), 900);
            assert_eq!(payment.balance_of(accounts.bob), 100);
        }

        /// We test cross-chain payment initiation.
        #[ink::test]
        fn cross_chain_payment_works() {
            let mut payment = Payment::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Initiate cross-chain payment
            let tx_id = payment.initiate_cross_chain_payment(
                accounts.bob,
                300,
                2000, // destination chain
            ).unwrap();
            
            assert_eq!(tx_id, 0);
            
            // Check balance was locked
            assert_eq!(payment.balance_of(accounts.alice), 700);
        }

        /// We test insufficient balance error.
        #[ink::test]
        fn insufficient_balance_error() {
            let mut payment = Payment::new(100);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Try to send more than available balance
            let result = payment.send_payment(accounts.bob, 200);
            assert_eq!(result, Err(Error::InsufficientBalance));
        }

        /// We test self payment prevention.
        #[ink::test]
        fn self_payment_error() {
            let mut payment = Payment::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Try to send payment to self
            let result = payment.send_payment(accounts.alice, 100);
            assert_eq!(result, Err(Error::SelfPayment));
        }
    }


    /// This is how you'd write end-to-end (E2E) or integration tests for ink! contracts.
    ///
    /// When running these you need to make sure that you:
    /// - Compile the tests with the `e2e-tests` feature flag enabled (`--features e2e-tests`)
    /// - Are running a Substrate node which contains `pallet-contracts` in the background
    #[cfg(all(test, feature = "e2e-tests"))]
    mod e2e_tests {
        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        /// A helper function used for calling contract messages.
        use ink_e2e::ContractsBackend;

        /// The End-to-End test `Result` type.
        type E2EResult<T> = std::result::Result<T, Box<dyn std::error::Error>>;

        /// We test that we can upload and instantiate the contract using its default constructor.
        #[ink_e2e::test]
        async fn default_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
            // Given
            let mut constructor = PaymentRef::default();

            // When
            let contract = client
                .instantiate("payment", &ink_e2e::alice(), &mut constructor)
                .submit()
                .await
                .expect("instantiate failed");
            let call_builder = contract.call_builder::<Payment>();

            // Then
            let get = call_builder.get();
            let get_result = client.call(&ink_e2e::alice(), &get).dry_run().await?;
            assert!(matches!(get_result.return_value(), false));

            Ok(())
        }

        /// We test that we can read and write a value from the on-chain contract.
        #[ink_e2e::test]
        async fn it_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
            // Given
            let mut constructor = PaymentRef::new(false);
            let contract = client
                .instantiate("payment", &ink_e2e::bob(), &mut constructor)
                .submit()
                .await
                .expect("instantiate failed");
            let mut call_builder = contract.call_builder::<Payment>();

            let get = call_builder.get();
            let get_result = client.call(&ink_e2e::bob(), &get).dry_run().await?;
            assert!(matches!(get_result.return_value(), false));

            // When
            let flip = call_builder.flip();
            let _flip_result = client
                .call(&ink_e2e::bob(), &flip)
                .submit()
                .await
                .expect("flip failed");

            // Then
            let get = call_builder.get();
            let get_result = client.call(&ink_e2e::bob(), &get).dry_run().await?;
            assert!(matches!(get_result.return_value(), true));

            Ok(())
        }
    }
}
