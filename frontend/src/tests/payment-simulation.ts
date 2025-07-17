/**
 * Payment Flow Simulation for 0xCC
 * Simulates real-world payment scenarios for testing
 */

import { ContractService } from '../services/contractService';

interface PaymentScenario {
  name: string;
  description: string;
  participants: Participant[];
  bills: BillTemplate[];
  expectedOutcome: string;
}

interface Participant {
  name: string;
  address: string;
  initialBalance: string;
  expectedFinalBalance: string;
}

interface BillTemplate {
  title: string;
  description: string;
  creator: string;
  totalAmount: string;
  participants: {
    address: string;
    amount: string;
    name: string;
  }[];
  deadline: string;
  usePrivateAmounts: boolean;
}

interface SimulationResult {
  scenarioName: string;
  success: boolean;
  totalDuration: number;
  billsCreated: number;
  paymentsProcessed: number;
  zkProofsGenerated: number;
  errors: string[];
  metrics: {
    avgBillCreationTime: number;
    avgPaymentTime: number;
    avgZkProofTime: number;
  };
}

class PaymentSimulator {
  private contractService: ContractService;
  private simulationId: string;

  constructor() {
    const mockApi = {
      registry: {
        createType: () => ({ refTime: '1000000000000', proofSize: '1000000' })
      }
    };
    this.contractService = new ContractService(mockApi as any, 'local');
    this.simulationId = `sim_${Date.now()}`;
  }

  async runSimulation(scenario: PaymentScenario): Promise<SimulationResult> {
    console.log(`\n🎮 Running Payment Simulation: ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    
    const startTime = Date.now();
    const result: SimulationResult = {
      scenarioName: scenario.name,
      success: true,
      totalDuration: 0,
      billsCreated: 0,
      paymentsProcessed: 0,
      zkProofsGenerated: 0,
      errors: [],
      metrics: {
        avgBillCreationTime: 0,
        avgPaymentTime: 0,
        avgZkProofTime: 0
      }
    };

    const billCreationTimes: number[] = [];
    const paymentTimes: number[] = [];
    const zkProofTimes: number[] = [];

    try {
      // Initialize participants
      console.log(`👥 Initializing ${scenario.participants.length} participants...`);
      for (const participant of scenario.participants) {
        console.log(`  - ${participant.name} (${participant.address.slice(0, 8)}...)`);
      }

      // Process each bill
      for (const billTemplate of scenario.bills) {
        console.log(`\n💰 Processing bill: ${billTemplate.title}`);
        
        // Create bill
        const billStartTime = Date.now();
        const billData = {
          totalAmount: billTemplate.totalAmount,
          participants: billTemplate.participants.map(p => p.address),
          individualAmounts: billTemplate.participants.map(p => p.amount),
          deadline: billTemplate.deadline
        };

        const billResult = await this.contractService.createBillMock(billData);
        const billCreationTime = Date.now() - billStartTime;
        billCreationTimes.push(billCreationTime);

        if (billResult.success) {
          result.billsCreated++;
          console.log(`  ✅ Bill created (ID: ${billResult.billId}) - ${billCreationTime}ms`);
          
          // Generate ZK proofs if privacy enabled
          if (billTemplate.usePrivateAmounts) {
            console.log(`  🔒 Generating ZK proofs for privacy...`);
            for (const participant of billTemplate.participants) {
              const zkStartTime = Date.now();
              await this.generateZkProof(participant.amount, '10.0'); // Mock balance
              const zkTime = Date.now() - zkStartTime;
              zkProofTimes.push(zkTime);
              result.zkProofsGenerated++;
              console.log(`    🔐 ZK proof for ${participant.name} - ${zkTime}ms`);
            }
          }

          // Process payments
          console.log(`  💳 Processing payments...`);
          for (const participant of billTemplate.participants) {
            const paymentStartTime = Date.now();
            const paymentResult = await this.contractService.payBillMock(
              billResult.billId!, 
              participant.amount
            );
            const paymentTime = Date.now() - paymentStartTime;
            paymentTimes.push(paymentTime);

            if (paymentResult.success) {
              result.paymentsProcessed++;
              console.log(`    ✅ Payment from ${participant.name} - ${paymentTime}ms`);
            } else {
              result.errors.push(`Payment failed for ${participant.name}`);
              console.log(`    ❌ Payment failed for ${participant.name}`);
            }
          }
        } else {
          result.errors.push(`Bill creation failed: ${billTemplate.title}`);
          console.log(`  ❌ Bill creation failed`);
        }
      }

      // Calculate metrics
      result.metrics.avgBillCreationTime = billCreationTimes.length > 0 
        ? billCreationTimes.reduce((a, b) => a + b, 0) / billCreationTimes.length : 0;
      result.metrics.avgPaymentTime = paymentTimes.length > 0 
        ? paymentTimes.reduce((a, b) => a + b, 0) / paymentTimes.length : 0;
      result.metrics.avgZkProofTime = zkProofTimes.length > 0 
        ? zkProofTimes.reduce((a, b) => a + b, 0) / zkProofTimes.length : 0;

      result.success = result.errors.length === 0;
      result.totalDuration = Date.now() - startTime;

      console.log(`\n${result.success ? '✅' : '❌'} Simulation completed in ${result.totalDuration}ms`);
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Simulation error: ${error}`);
      console.log(`❌ Simulation failed: ${error}`);
    }

    return result;
  }

  private async generateZkProof(amount: string, balance: string): Promise<any> {
    // Simulate ZK proof generation with realistic timing
    const complexity = Math.max(1, Math.floor(parseFloat(amount) * 1000));
    await new Promise(resolve => setTimeout(resolve, 500 + complexity));
    
    return {
      pi_a: [`0x${Math.random().toString(16).slice(2, 18)}`],
      pi_b: [[`0x${Math.random().toString(16).slice(2, 18)}`]],
      pi_c: [`0x${Math.random().toString(16).slice(2, 18)}`],
      protocol: 'groth16',
      curve: 'bn128',
      publicSignals: [amount]
    };
  }

  getTestScenarios(): PaymentScenario[] {
    return [
      {
        name: 'Friends Dinner Split',
        description: 'Four friends split a dinner bill with equal amounts',
        participants: [
          {
            name: 'Alice',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            initialBalance: '10.0',
            expectedFinalBalance: '9.25'
          },
          {
            name: 'Bob',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            initialBalance: '15.0',
            expectedFinalBalance: '14.25'
          },
          {
            name: 'Charlie',
            address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
            initialBalance: '8.0',
            expectedFinalBalance: '7.25'
          },
          {
            name: 'David',
            address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
            initialBalance: '12.0',
            expectedFinalBalance: '11.25'
          }
        ],
        bills: [
          {
            title: 'Dinner at Sushi Restaurant',
            description: 'Great meal with friends',
            creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            totalAmount: '3.0',
            participants: [
              { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '0.75', name: 'Alice' },
              { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', amount: '0.75', name: 'Bob' },
              { address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', amount: '0.75', name: 'Charlie' },
              { address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', amount: '0.75', name: 'David' }
            ],
            deadline: '2025-07-20T23:59:59',
            usePrivateAmounts: false
          }
        ],
        expectedOutcome: 'All participants pay their share successfully'
      },
      {
        name: 'Apartment Utilities with Privacy',
        description: 'Roommates split utilities with hidden amounts',
        participants: [
          {
            name: 'Alice',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            initialBalance: '20.0',
            expectedFinalBalance: '19.4'
          },
          {
            name: 'Bob',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            initialBalance: '25.0',
            expectedFinalBalance: '24.35'
          },
          {
            name: 'Charlie',
            address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
            initialBalance: '18.0',
            expectedFinalBalance: '17.75'
          }
        ],
        bills: [
          {
            title: 'Monthly Utilities',
            description: 'Electricity, water, and internet',
            creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            totalAmount: '0.9',
            participants: [
              { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '0.6', name: 'Alice' },
              { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', amount: '0.65', name: 'Bob' },
              { address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', amount: '0.25', name: 'Charlie' }
            ],
            deadline: '2025-07-25T23:59:59',
            usePrivateAmounts: true
          }
        ],
        expectedOutcome: 'Payments processed with privacy protection'
      },
      {
        name: 'Complex Multi-Bill Scenario',
        description: 'Multiple bills with different participants and amounts',
        participants: [
          {
            name: 'Alice',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            initialBalance: '50.0',
            expectedFinalBalance: '47.8'
          },
          {
            name: 'Bob',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            initialBalance: '30.0',
            expectedFinalBalance: '28.5'
          },
          {
            name: 'Charlie',
            address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
            initialBalance: '40.0',
            expectedFinalBalance: '38.3'
          }
        ],
        bills: [
          {
            title: 'Office Lunch',
            description: 'Team lunch order',
            creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            totalAmount: '2.5',
            participants: [
              { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '1.0', name: 'Alice' },
              { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', amount: '0.8', name: 'Bob' },
              { address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', amount: '0.7', name: 'Charlie' }
            ],
            deadline: '2025-07-18T18:00:00',
            usePrivateAmounts: false
          },
          {
            title: 'Shared Taxi',
            description: 'Taxi ride to airport',
            creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
            totalAmount: '1.2',
            participants: [
              { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '0.6', name: 'Alice' },
              { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', amount: '0.6', name: 'Bob' }
            ],
            deadline: '2025-07-19T12:00:00',
            usePrivateAmounts: true
          },
          {
            title: 'Coffee Shop',
            description: 'Morning coffee run',
            creator: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
            totalAmount: '0.45',
            participants: [
              { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', amount: '0.15', name: 'Alice' },
              { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', amount: '0.15', name: 'Bob' },
              { address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y', amount: '0.15', name: 'Charlie' }
            ],
            deadline: '2025-07-18T14:00:00',
            usePrivateAmounts: false
          }
        ],
        expectedOutcome: 'All bills processed successfully with mixed privacy settings'
      }
    ];
  }

  async runAllSimulations(): Promise<void> {
    console.log('🚀 Starting 0xCC Payment Flow Simulations');
    console.log('=' .repeat(60));
    
    const scenarios = this.getTestScenarios();
    const results: SimulationResult[] = [];
    const overallStartTime = Date.now();

    for (const scenario of scenarios) {
      const result = await this.runSimulation(scenario);
      results.push(result);
      
      // Brief pause between scenarios
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const overallDuration = Date.now() - overallStartTime;
    this.printOverallSummary(results, overallDuration);
  }

  private printOverallSummary(results: SimulationResult[], totalDuration: number): void {
    console.log('\n📊 Overall Simulation Summary');
    console.log('=' .repeat(60));
    
    const successfulScenarios = results.filter(r => r.success).length;
    const totalBills = results.reduce((sum, r) => sum + r.billsCreated, 0);
    const totalPayments = results.reduce((sum, r) => sum + r.paymentsProcessed, 0);
    const totalZkProofs = results.reduce((sum, r) => sum + r.zkProofsGenerated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    
    console.log(`📈 Results:`);
    console.log(`  Scenarios: ${successfulScenarios}/${results.length} successful`);
    console.log(`  Bills Created: ${totalBills}`);
    console.log(`  Payments Processed: ${totalPayments}`);
    console.log(`  ZK Proofs Generated: ${totalZkProofs}`);
    console.log(`  Total Errors: ${totalErrors}`);
    console.log(`  Overall Duration: ${totalDuration}ms`);
    
    if (results.length > 0) {
      const avgBillTime = results.reduce((sum, r) => sum + r.metrics.avgBillCreationTime, 0) / results.length;
      const avgPaymentTime = results.reduce((sum, r) => sum + r.metrics.avgPaymentTime, 0) / results.length;
      const avgZkTime = results.reduce((sum, r) => sum + r.metrics.avgZkProofTime, 0) / results.length;
      
      console.log(`\n⚡ Performance Metrics:`);
      console.log(`  Avg Bill Creation: ${avgBillTime.toFixed(2)}ms`);
      console.log(`  Avg Payment Processing: ${avgPaymentTime.toFixed(2)}ms`);
      console.log(`  Avg ZK Proof Generation: ${avgZkTime.toFixed(2)}ms`);
    }

    if (totalErrors > 0) {
      console.log(`\n❌ Errors Summary:`);
      results.forEach(result => {
        if (result.errors.length > 0) {
          console.log(`  ${result.scenarioName}:`);
          result.errors.forEach(error => console.log(`    - ${error}`));
        }
      });
    }

    console.log(`\n${successfulScenarios === results.length ? '🎉' : '⚠️'} Simulation Complete!`);
  }
}

// Export for use in tests
export { PaymentSimulator };

// Run if executed directly
if (require.main === module) {
  const simulator = new PaymentSimulator();
  simulator.runAllSimulations().catch(console.error);
}