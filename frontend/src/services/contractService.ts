import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { KeyringPair } from '@polkadot/keyring/types';
import { BN } from '@polkadot/util';
import { WeightV2 } from '@polkadot/types/interfaces';

// Contract metadata (ABI) - this would typically be imported from a JSON file
const CONTRACT_ABI = {
  "source": {
    "hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "language": "ink! 5.0.0",
    "compiler": "rustc 1.70.0"
  },
  "contract": {
    "name": "bill_splitting",
    "version": "1.0.0",
    "authors": ["0xCC Team"]
  },
  "spec": {
    "constructors": [
      {
        "args": [],
        "default": false,
        "docs": [],
        "label": "new",
        "payable": false,
        "returnType": {
          "displayName": ["ink_primitives", "ConstructorResult"],
          "type": 0
        },
        "selector": "0x9bae9d5e"
      }
    ],
    "docs": [],
    "environment": {
      "accountId": {
        "displayName": ["AccountId"],
        "type": 5
      },
      "balance": {
        "displayName": ["Balance"],
        "type": 6
      },
      "blockNumber": {
        "displayName": ["BlockNumber"],
        "type": 7
      },
      "chainExtension": {
        "displayName": ["ChainExtension"],
        "type": 8
      },
      "hash": {
        "displayName": ["Hash"],
        "type": 9
      },
      "maxEventTopics": 4,
      "timestamp": {
        "displayName": ["Timestamp"],
        "type": 10
      }
    },
    "events": [
      {
        "args": [
          {
            "docs": [],
            "indexed": true,
            "label": "bill_id",
            "type": {
              "displayName": ["u32"],
              "type": 2
            }
          },
          {
            "docs": [],
            "indexed": true,
            "label": "creator",
            "type": {
              "displayName": ["AccountId"],
              "type": 5
            }
          },
          {
            "docs": [],
            "indexed": false,
            "label": "total_amount",
            "type": {
              "displayName": ["Balance"],
              "type": 6
            }
          },
          {
            "docs": [],
            "indexed": false,
            "label": "participant_count",
            "type": {
              "displayName": ["u32"],
              "type": 2
            }
          }
        ],
        "docs": [],
        "label": "BillCreated"
      },
      {
        "args": [
          {
            "docs": [],
            "indexed": true,
            "label": "bill_id",
            "type": {
              "displayName": ["u32"],
              "type": 2
            }
          },
          {
            "docs": [],
            "indexed": true,
            "label": "payer",
            "type": {
              "displayName": ["AccountId"],
              "type": 5
            }
          },
          {
            "docs": [],
            "indexed": false,
            "label": "amount",
            "type": {
              "displayName": ["Balance"],
              "type": 6
            }
          }
        ],
        "docs": [],
        "label": "BillPaid"
      }
    ],
    "lang_error": {
      "displayName": ["ink", "LangError"],
      "type": 1
    },
    "messages": [
      {
        "args": [
          {
            "label": "total_amount",
            "type": {
              "displayName": ["Balance"],
              "type": 6
            }
          },
          {
            "label": "participants",
            "type": {
              "displayName": ["Vec"],
              "type": 11
            }
          },
          {
            "label": "individual_amounts",
            "type": {
              "displayName": ["Vec"],
              "type": 12
            }
          },
          {
            "label": "deadline",
            "type": {
              "displayName": ["u64"],
              "type": 3
            }
          }
        ],
        "default": false,
        "docs": [],
        "label": "create_bill",
        "mutates": true,
        "payable": false,
        "returnType": {
          "displayName": ["ink", "MessageResult"],
          "type": 13
        },
        "selector": "0x12345678"
      },
      {
        "args": [
          {
            "label": "bill_id",
            "type": {
              "displayName": ["u32"],
              "type": 2
            }
          },
          {
            "label": "amount",
            "type": {
              "displayName": ["Balance"],
              "type": 6
            }
          }
        ],
        "default": false,
        "docs": [],
        "label": "pay_bill",
        "mutates": true,
        "payable": true,
        "returnType": {
          "displayName": ["ink", "MessageResult"],
          "type": 14
        },
        "selector": "0x87654321"
      },
      {
        "args": [
          {
            "label": "bill_id",
            "type": {
              "displayName": ["u32"],
              "type": 2
            }
          }
        ],
        "default": false,
        "docs": [],
        "label": "get_bill_info",
        "mutates": false,
        "payable": false,
        "returnType": {
          "displayName": ["ink", "MessageResult"],
          "type": 15
        },
        "selector": "0x11111111"
      }
    ]
  },
  "types": [
    {
      "id": 0,
      "type": {
        "def": {
          "variant": {
            "variants": [
              {
                "fields": [
                  {
                    "type": 1
                  }
                ],
                "index": 0,
                "name": "Ok"
              },
              {
                "fields": [
                  {
                    "type": 1
                  }
                ],
                "index": 1,
                "name": "Err"
              }
            ]
          }
        },
        "params": [
          {
            "name": "T",
            "type": 1
          },
          {
            "name": "E",
            "type": 1
          }
        ],
        "path": ["Result"]
      }
    }
  ],
  "version": "4"
};

// Contract addresses - these would be set after deployment
const CONTRACT_ADDRESSES = {
  rococo: '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM', // placeholder
  westend: '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM', // placeholder
  local: '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM', // placeholder
};

export interface Bill {
  id: number;
  creator: string;
  totalAmount: string;
  participantCount: number;
  paidCount: number;
  completed: boolean;
  deadline: number;
  participants: string[];
  individualAmounts: string[];
  payments: { [address: string]: boolean };
}

export interface BillCreateData {
  totalAmount: string;
  participants: string[];
  individualAmounts: string[];
  deadline: string;
}

export class ContractService {
  private api: ApiPromise;
  private contract: ContractPromise;
  private gasLimit: WeightV2;

  constructor(api: ApiPromise, networkName: string = 'local') {
    this.api = api;
    const contractAddress = CONTRACT_ADDRESSES[networkName as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES.local;
    this.contract = new ContractPromise(api, CONTRACT_ABI, contractAddress);
    
    // Set gas limit
    this.gasLimit = api.registry.createType('WeightV2', {
      refTime: new BN('1000000000000'),
      proofSize: new BN('1000000'),
    }) as WeightV2;
  }

  async createBill(
    signer: KeyringPair,
    billData: BillCreateData
  ): Promise<{ success: boolean; billId?: number; error?: string }> {
    try {
      const { totalAmount, participants, individualAmounts, deadline } = billData;
      
      // Convert amounts to BN (assuming DOT with 10 decimal places)
      const totalAmountBN = new BN(totalAmount).mul(new BN('10000000000'));
      const individualAmountsBN = individualAmounts.map(amount => 
        new BN(amount).mul(new BN('10000000000'))
      );
      
      // Convert deadline to timestamp
      const deadlineTimestamp = new Date(deadline).getTime();
      
      // Dry run to estimate gas
      const { gasRequired, result } = await this.contract.query.createBill(
        signer.address,
        { gasLimit: this.gasLimit, storageDepositLimit: null },
        totalAmountBN,
        participants,
        individualAmountsBN,
        deadlineTimestamp
      );

      if (result.isErr) {
        return { success: false, error: 'Contract call failed during dry run' };
      }

      // Execute the transaction
      const tx = this.contract.tx.createBill(
        { gasLimit: gasRequired, storageDepositLimit: null },
        totalAmountBN,
        participants,
        individualAmountsBN,
        deadlineTimestamp
      );

      return new Promise((resolve) => {
        tx.signAndSend(signer, (result) => {
          if (result.status.isInBlock) {
            // Look for BillCreated event
            result.events.forEach(({ event }) => {
              if (event.section === 'contracts' && event.method === 'ContractEmitted') {
                const decoded = this.contract.abi.decodeEvent(event.data[1] as any);
                if (decoded.event.identifier === 'BillCreated') {
                  resolve({ success: true, billId: (decoded.args[0] as any).toNumber() });
                }
              }
            });
          } else if (result.status.isFinalized) {
            resolve({ success: false, error: 'Transaction failed' });
          }
        });
      });
    } catch (error) {
      console.error('Error creating bill:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async payBill(
    signer: KeyringPair,
    billId: number,
    amount: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const amountBN = new BN(amount).mul(new BN('10000000000'));
      
      // Dry run to estimate gas
      const { gasRequired, result } = await this.contract.query.payBill(
        signer.address,
        { gasLimit: this.gasLimit, storageDepositLimit: null, value: amountBN },
        billId,
        amountBN
      );

      if (result.isErr) {
        return { success: false, error: 'Contract call failed during dry run' };
      }

      // Execute the transaction
      const tx = this.contract.tx.payBill(
        { gasLimit: gasRequired, storageDepositLimit: null, value: amountBN },
        billId,
        amountBN
      );

      return new Promise((resolve) => {
        tx.signAndSend(signer, (result) => {
          if (result.status.isInBlock) {
            resolve({ success: true });
          } else if (result.status.isFinalized) {
            resolve({ success: false, error: 'Transaction failed' });
          }
        });
      });
    } catch (error) {
      console.error('Error paying bill:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getBillInfo(billId: number): Promise<Bill | null> {
    try {
      const { result } = await this.contract.query.getBillInfo(
        '',
        { gasLimit: this.gasLimit, storageDepositLimit: null },
        billId
      );

      if (result.isErr) {
        return null;
      }

      // This would need to be implemented based on the actual contract response
      // For now, returning null as the contract method needs to be implemented
      return null;
    } catch (error) {
      console.error('Error getting bill info:', error);
      return null;
    }
  }

  async getUserBills(userAddress: string): Promise<Bill[]> {
    try {
      // This would need to be implemented based on actual contract methods
      // For now, returning empty array
      return [];
    } catch (error) {
      console.error('Error getting user bills:', error);
      return [];
    }
  }

  // Mock implementation for development
  async createBillMock(billData: BillCreateData): Promise<{ success: boolean; billId?: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate random bill ID
    const billId = Math.floor(Math.random() * 10000);
    
    console.log('Mock bill created:', billData, 'ID:', billId);
    return { success: true, billId };
  }

  async payBillMock(billId: number, amount: string): Promise<{ success: boolean }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Mock payment processed:', { billId, amount });
    return { success: true };
  }
}