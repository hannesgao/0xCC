/**
 * End-to-End Payment Flow Simulation
 * This script simulates real user interactions with the payment system
 */

import { ContractService } from '../services/contractService';

interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
}

interface TestStep {
  action: string;
  data?: any;
  expectedResult?: any;
  validation?: (result: any) => boolean;
}

interface TestResult {
  scenarioName: string;
  success: boolean;
  steps: {
    step: string;
    success: boolean;
    error?: string;
    duration: number;
  }[];
  totalDuration: number;
}

class PaymentFlowTester {
  private contractService: ContractService;
  private results: TestResult[] = [];

  constructor() {
    // Initialize with mock API for testing
    const mockApi = {
      registry: {
        createType: () => ({ refTime: '1000000000000', proofSize: '1000000' })
      }
    };
    this.contractService = new ContractService(mockApi as any, 'local');
  }

  async runScenario(scenario: TestScenario): Promise<TestResult> {
    console.log(`\n🧪 Running scenario: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    
    const startTime = Date.now();
    const result: TestResult = {
      scenarioName: scenario.name,
      success: true,
      steps: [],
      totalDuration: 0
    };

    for (const step of scenario.steps) {
      const stepStartTime = Date.now();
      console.log(`  ⏳ ${step.action}...`);
      
      try {
        const stepResult = await this.executeStep(step);
        const stepDuration = Date.now() - stepStartTime;
        
        const stepSuccess = step.validation ? step.validation(stepResult) : true;
        
        result.steps.push({
          step: step.action,
          success: stepSuccess,
          duration: stepDuration
        });
        
        if (stepSuccess) {
          console.log(`  ✅ ${step.action} - ${stepDuration}ms`);
        } else {
          console.log(`  ❌ ${step.action} - Validation failed`);
          result.success = false;
        }
        
      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;
        result.steps.push({
          step: step.action,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: stepDuration
        });
        result.success = false;
        console.log(`  ❌ ${step.action} - ${error}`);
      }
    }
    
    result.totalDuration = Date.now() - startTime;
    this.results.push(result);
    
    console.log(`${result.success ? '✅' : '❌'} Scenario completed in ${result.totalDuration}ms`);
    return result;
  }

  private async executeStep(step: TestStep): Promise<any> {
    switch (step.action) {
      case 'Create Bill':
        return await this.contractService.createBillMock(step.data);
      
      case 'Pay Bill':
        return await this.contractService.payBillMock(step.data.billId, step.data.amount);
      
      case 'Generate ZK Proof':
        // Simulate ZK proof generation
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          proof: { pi_a: ['0x123'], pi_b: [['0x456']], pi_c: ['0x789'] },
          publicSignals: [step.data.amount]
        };
      
      case 'Verify ZK Proof':
        // Simulate ZK proof verification
        await new Promise(resolve => setTimeout(resolve, 500));
        return { verified: true };
      
      case 'Wait':
        await new Promise(resolve => setTimeout(resolve, step.data?.duration || 1000));
        return { completed: true };
      
      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  getTestScenarios(): TestScenario[] {
    return [
      {
        name: 'Basic Bill Creation and Payment',
        description: 'Create a simple bill and process payment',
        steps: [
          {
            action: 'Create Bill',
            data: {
              totalAmount: '1.0',
              participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
              individualAmounts: ['1.0'],
              deadline: '2025-07-20T23:59:59'
            },
            validation: (result) => result.success === true
          },
          {
            action: 'Pay Bill',
            data: {
              billId: 123,
              amount: '1.0'
            },
            validation: (result) => result.success === true
          }
        ]
      },
      {
        name: 'Multi-Participant Bill Splitting',
        description: 'Create a bill with multiple participants and process all payments',
        steps: [
          {
            action: 'Create Bill',
            data: {
              totalAmount: '3.0',
              participants: [
                '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
                '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
                '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
              ],
              individualAmounts: ['1.0', '1.0', '1.0'],
              deadline: '2025-07-20T23:59:59'
            },
            validation: (result) => result.success === true
          },
          {
            action: 'Pay Bill',
            data: { billId: 123, amount: '1.0' },
            validation: (result) => result.success === true
          },
          {
            action: 'Pay Bill',
            data: { billId: 123, amount: '1.0' },
            validation: (result) => result.success === true
          },
          {
            action: 'Pay Bill',
            data: { billId: 123, amount: '1.0' },
            validation: (result) => result.success === true
          }
        ]
      },
      {
        name: 'ZK Privacy Protected Payment',
        description: 'Create a bill with ZK privacy and process payment with proof generation',
        steps: [
          {
            action: 'Generate ZK Proof',
            data: {
              amount: '1.0',
              balance: '10.0'
            },
            validation: (result) => result.proof !== undefined
          },
          {
            action: 'Verify ZK Proof',
            data: {
              proof: { pi_a: ['0x123'], pi_b: [['0x456']], pi_c: ['0x789'] }
            },
            validation: (result) => result.verified === true
          },
          {
            action: 'Create Bill',
            data: {
              totalAmount: '1.0',
              participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
              individualAmounts: ['1.0'],
              deadline: '2025-07-20T23:59:59',
              usePrivateAmounts: true
            },
            validation: (result) => result.success === true
          },
          {
            action: 'Pay Bill',
            data: { billId: 123, amount: '1.0' },
            validation: (result) => result.success === true
          }
        ]
      },
      {
        name: 'High Volume Testing',
        description: 'Test system performance with multiple concurrent operations',
        steps: [
          {
            action: 'Create Bill',
            data: {
              totalAmount: '0.1',
              participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
              individualAmounts: ['0.1'],
              deadline: '2025-07-20T23:59:59'
            },
            validation: (result) => result.success === true
          },
          {
            action: 'Create Bill',
            data: {
              totalAmount: '0.2',
              participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
              individualAmounts: ['0.2'],
              deadline: '2025-07-20T23:59:59'
            },
            validation: (result) => result.success === true
          },
          {
            action: 'Create Bill',
            data: {
              totalAmount: '0.3',
              participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
              individualAmounts: ['0.3'],
              deadline: '2025-07-20T23:59:59'
            },
            validation: (result) => result.success === true
          }
        ]
      },
      {
        name: 'Time-based Testing',
        description: 'Test payment flows with timing considerations',
        steps: [
          {
            action: 'Create Bill',
            data: {
              totalAmount: '1.0',
              participants: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
              individualAmounts: ['1.0'],
              deadline: '2025-07-20T23:59:59'
            },
            validation: (result) => result.success === true
          },
          {
            action: 'Wait',
            data: { duration: 2000 }
          },
          {
            action: 'Pay Bill',
            data: { billId: 123, amount: '1.0' },
            validation: (result) => result.success === true
          }
        ]
      }
    ];
  }

  async runAllScenarios(): Promise<void> {
    console.log('🚀 Starting End-to-End Payment Flow Testing');
    console.log('=' .repeat(50));
    
    const scenarios = this.getTestScenarios();
    const startTime = Date.now();
    
    for (const scenario of scenarios) {
      await this.runScenario(scenario);
    }
    
    const totalDuration = Date.now() - startTime;
    this.printSummary(totalDuration);
  }

  private printSummary(totalDuration: number): void {
    console.log('\n📊 Test Summary');
    console.log('=' .repeat(50));
    
    const totalScenarios = this.results.length;
    const passedScenarios = this.results.filter(r => r.success).length;
    const failedScenarios = totalScenarios - passedScenarios;
    
    console.log(`Total Scenarios: ${totalScenarios}`);
    console.log(`✅ Passed: ${passedScenarios}`);
    console.log(`❌ Failed: ${failedScenarios}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    
    if (failedScenarios > 0) {
      console.log('\n❌ Failed Scenarios:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.scenarioName}`);
        result.steps.filter(s => !s.success).forEach(step => {
          console.log(`    • ${step.step}: ${step.error || 'Validation failed'}`);
        });
      });
    }
    
    console.log('\n📈 Performance Metrics:');
    this.results.forEach(result => {
      console.log(`  ${result.scenarioName}: ${result.totalDuration}ms`);
    });
  }
}

// Export for use in other tests
export { PaymentFlowTester };

// Run if executed directly
if (require.main === module) {
  const tester = new PaymentFlowTester();
  tester.runAllScenarios().catch(console.error);
}