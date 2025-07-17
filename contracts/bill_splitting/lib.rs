#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod bill_splitting {
    use ink::storage::Mapping;

    /// Contract errors
    #[derive(Debug, PartialEq, Eq)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum Error {
        BillNotFound,
        UnauthorizedAccess,
        InvalidAmount,
        BillExpired,
        BillAlreadyCompleted,
        ParticipantNotFound,
        AlreadyPaid,
        InvalidParticipants,
    }

    /// Bill splitting contract storage
    #[ink(storage)]
    pub struct BillSplitting {
        /// Bill creators
        bill_creators: Mapping<u32, AccountId>,
        /// Bill amounts
        bill_amounts: Mapping<u32, Balance>,
        /// Bill participant counts
        bill_participant_counts: Mapping<u32, u32>,
        /// Bill paid counts
        bill_paid_counts: Mapping<u32, u32>,
        /// Bill completed status
        bill_completed: Mapping<u32, bool>,
        /// Bill deadlines
        bill_deadlines: Mapping<u32, u64>,
        /// Bill participants (bill_id -> participant_index -> AccountId)
        bill_participants: Mapping<(u32, u32), AccountId>,
        /// Bill individual amounts (bill_id -> participant_index -> Balance)
        bill_individual_amounts: Mapping<(u32, u32), Balance>,
        /// Bill payments (bill_id -> participant -> paid)
        bill_payments: Mapping<(u32, AccountId), bool>,
        /// User bills
        user_bills: Mapping<AccountId, u32>, // simplified to count
        /// Bill counter
        bill_counter: u32,
        /// Contract owner
        owner: AccountId,
    }

    /// Events
    #[ink(event)]
    pub struct BillCreated {
        #[ink(topic)]
        bill_id: u32,
        #[ink(topic)]
        creator: AccountId,
        total_amount: Balance,
        participant_count: u32,
    }

    #[ink(event)]
    pub struct BillPaid {
        #[ink(topic)]
        bill_id: u32,
        #[ink(topic)]
        payer: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct BillCompleted {
        #[ink(topic)]
        bill_id: u32,
        #[ink(topic)]
        creator: AccountId,
        total_paid: Balance,
    }

    impl BillSplitting {
        /// Constructor
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                bill_creators: Mapping::default(),
                bill_amounts: Mapping::default(),
                bill_participant_counts: Mapping::default(),
                bill_paid_counts: Mapping::default(),
                bill_completed: Mapping::default(),
                bill_deadlines: Mapping::default(),
                bill_participants: Mapping::default(),
                bill_individual_amounts: Mapping::default(),
                bill_payments: Mapping::default(),
                user_bills: Mapping::default(),
                bill_counter: 0,
                owner: Self::env().caller(),
            }
        }

        /// Default constructor
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new()
        }

        /// Create a new bill
        #[ink(message)]
        #[allow(clippy::cast_possible_truncation)]
        pub fn create_bill(
            &mut self,
            total_amount: Balance,
            participants: ink::prelude::vec::Vec<AccountId>,
            individual_amounts: ink::prelude::vec::Vec<Balance>,
            deadline: u64,
        ) -> Result<u32, Error> {
            let creator = self.env().caller();
            
            if total_amount == 0 {
                return Err(Error::InvalidAmount);
            }
            
            if participants.is_empty() {
                return Err(Error::InvalidParticipants);
            }
            
            if participants.len() != individual_amounts.len() {
                return Err(Error::InvalidParticipants);
            }
            
            // Verify that sum of individual amounts equals total
            let sum: Balance = individual_amounts.iter().sum();
            if sum != total_amount {
                return Err(Error::InvalidAmount);
            }
            
            let bill_id = self.bill_counter;
            
            // Store bill information
            self.bill_creators.insert(bill_id, &creator);
            self.bill_amounts.insert(bill_id, &total_amount);
            self.bill_participant_counts.insert(bill_id, &(participants.len() as u32));
            self.bill_paid_counts.insert(bill_id, &0);
            self.bill_completed.insert(bill_id, &false);
            self.bill_deadlines.insert(bill_id, &deadline);
            
            // Store participants and amounts
            for (index, (participant, amount)) in participants.iter().zip(individual_amounts.iter()).enumerate() {
                let idx = index as u32;
                self.bill_participants.insert((bill_id, idx), participant);
                self.bill_individual_amounts.insert((bill_id, idx), amount);
                self.bill_payments.insert((bill_id, *participant), &false);
            }
            
            self.bill_counter = self.bill_counter.saturating_add(1);
            
            // Update user bill counts
            let user_bill_count = self.user_bills.get(creator).unwrap_or(0);
            self.user_bills.insert(creator, &user_bill_count.saturating_add(1));
            
            for participant in &participants {
                let user_bill_count = self.user_bills.get(participant).unwrap_or(0);
                self.user_bills.insert(participant, &user_bill_count.saturating_add(1));
            }
            
            self.env().emit_event(BillCreated {
                bill_id,
                creator,
                total_amount,
                participant_count: participants.len() as u32,
            });
            
            Ok(bill_id)
        }

        /// Pay a bill
        #[ink(message)]
        pub fn pay_bill(&mut self, bill_id: u32, amount: Balance) -> Result<(), Error> {
            let payer = self.env().caller();
            
            // Check if bill exists
            if !self.bill_creators.contains(bill_id) {
                return Err(Error::BillNotFound);
            }
            
            // Check if bill is already completed
            if self.bill_completed.get(bill_id).unwrap_or(false) {
                return Err(Error::BillAlreadyCompleted);
            }
            
            // Check if bill has expired
            let deadline = self.bill_deadlines.get(bill_id).unwrap_or(0);
            if self.env().block_timestamp() > deadline {
                return Err(Error::BillExpired);
            }
            
            // Check if already paid
            if self.bill_payments.get((bill_id, payer)).unwrap_or(false) {
                return Err(Error::AlreadyPaid);
            }
            
            // Find participant and check amount
            let participant_count = self.bill_participant_counts.get(bill_id).unwrap_or(0);
            let mut participant_found = false;
            
            for index in 0..participant_count {
                if let Some(participant) = self.bill_participants.get((bill_id, index)) {
                    if participant == payer {
                        participant_found = true;
                        let expected_amount = self.bill_individual_amounts.get((bill_id, index)).unwrap_or(0);
                        if amount != expected_amount {
                            return Err(Error::InvalidAmount);
                        }
                        break;
                    }
                }
            }
            
            if !participant_found {
                return Err(Error::ParticipantNotFound);
            }
            
            // Mark as paid
            self.bill_payments.insert((bill_id, payer), &true);
            
            let paid_count = self.bill_paid_counts.get(bill_id).unwrap_or(0);
            let new_paid_count = paid_count.saturating_add(1);
            self.bill_paid_counts.insert(bill_id, &new_paid_count);
            
            // Check if all participants have paid
            if new_paid_count == participant_count {
                self.bill_completed.insert(bill_id, &true);
                
                let creator = self.bill_creators.get(bill_id).unwrap();
                let total_amount = self.bill_amounts.get(bill_id).unwrap_or(0);
                
                self.env().emit_event(BillCompleted {
                    bill_id,
                    creator,
                    total_paid: total_amount,
                });
            }
            
            self.env().emit_event(BillPaid {
                bill_id,
                payer,
                amount,
            });
            
            Ok(())
        }

        /// Get bill details
        #[ink(message)]
        pub fn get_bill_info(&self, bill_id: u32) -> Option<(AccountId, Balance, u32, u32, bool, u64)> {
            if !self.bill_creators.contains(bill_id) {
                return None;
            }
            
            let creator = self.bill_creators.get(bill_id)?;
            let total_amount = self.bill_amounts.get(bill_id).unwrap_or(0);
            let participant_count = self.bill_participant_counts.get(bill_id).unwrap_or(0);
            let paid_count = self.bill_paid_counts.get(bill_id).unwrap_or(0);
            let completed = self.bill_completed.get(bill_id).unwrap_or(false);
            let deadline = self.bill_deadlines.get(bill_id).unwrap_or(0);
            
            Some((creator, total_amount, participant_count, paid_count, completed, deadline))
        }

        /// Get user bill count
        #[ink(message)]
        pub fn get_user_bill_count(&self, user: AccountId) -> u32 {
            self.user_bills.get(user).unwrap_or(0)
        }

        /// Get contract statistics
        #[ink(message)]
        pub fn get_stats(&self) -> u32 {
            self.bill_counter
        }
    }

    /// Unit tests
    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn default_works() {
            let bill_splitting = BillSplitting::default();
            assert_eq!(bill_splitting.get_stats(), 0);
        }

        #[ink::test]
        fn create_bill_works() {
            let mut bill_splitting = BillSplitting::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            let participants = ink::prelude::vec![accounts.alice, accounts.bob];
            let individual_amounts = ink::prelude::vec![500, 300];
            let total_amount = 800;
            
            let bill_id = bill_splitting.create_bill(
                total_amount,
                participants,
                individual_amounts,
                1000000000, // future deadline
            ).unwrap();
            
            assert_eq!(bill_id, 0);
            
            let bill_info = bill_splitting.get_bill_info(bill_id).unwrap();
            assert_eq!(bill_info.1, total_amount); // total_amount
            assert_eq!(bill_info.2, 2); // participant_count
            assert_eq!(bill_info.4, false); // completed
        }

        #[ink::test]
        fn pay_bill_works() {
            let mut bill_splitting = BillSplitting::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            let participants = ink::prelude::vec![accounts.alice, accounts.bob];
            let individual_amounts = ink::prelude::vec![500, 300];
            let bill_id = bill_splitting.create_bill(
                800,
                participants,
                individual_amounts,
                1000000000,
            ).unwrap();
            
            // Alice pays her share
            bill_splitting.pay_bill(bill_id, 500).unwrap();
            
            let bill_info = bill_splitting.get_bill_info(bill_id).unwrap();
            assert_eq!(bill_info.3, 1); // paid_count
            assert_eq!(bill_info.4, false); // completed
            
            // Switch to Bob and pay his share
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            bill_splitting.pay_bill(bill_id, 300).unwrap();
            
            let bill_info = bill_splitting.get_bill_info(bill_id).unwrap();
            assert_eq!(bill_info.4, true); // completed
            assert_eq!(bill_info.3, 2); // paid_count
        }

        #[ink::test]
        fn invalid_bill_creation_fails() {
            let mut bill_splitting = BillSplitting::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Mismatched participants and amounts should fail
            let result = bill_splitting.create_bill(
                800,
                ink::prelude::vec![accounts.alice, accounts.bob],
                ink::prelude::vec![800], // Only one amount for two participants
                1000000000,
            );
            assert_eq!(result, Err(Error::InvalidParticipants));
            
            // Sum mismatch should fail
            let result = bill_splitting.create_bill(
                800,
                ink::prelude::vec![accounts.alice, accounts.bob],
                ink::prelude::vec![400, 300], // Sum is 700, not 800
                1000000000,
            );
            assert_eq!(result, Err(Error::InvalidAmount));
        }
    }
}