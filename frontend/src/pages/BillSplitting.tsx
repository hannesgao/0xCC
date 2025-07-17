import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  Receipt, 
  TrendingUp, 
  DollarSign,
  Clock,
  Shield,
  CheckCircle
} from 'lucide-react';
import { usePolkadotApi } from '@/hooks/usePolkadotApi';
import { useContract } from '@/hooks/useContract';
import BillSplittingForm from '@/components/BillSplittingForm';
import BillList from '@/components/BillList';
import ZKPrivacyDemo from '@/components/ZKPrivacyDemo';

interface Bill {
  id: string;
  title: string;
  description: string;
  totalAmount: string;
  creator: string;
  participants: {
    address: string;
    amount: string;
    name?: string;
    paid: boolean;
  }[];
  deadline: string;
  createdAt: string;
  completed: boolean;
  usePrivateAmounts: boolean;
}

export default function BillSplitting() {
  const { api, account, isConnected } = usePolkadotApi();
  const { createBill, payBill, getUserBills, isLoading: contractLoading, error: contractError } = useContract();
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState({
    totalBills: 0,
    activeBills: 0,
    totalAmount: '0',
    completedBills: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const mockBills: Bill[] = [
    {
      id: '1',
      title: 'Group Dinner at Sushi Restaurant',
      description: 'Amazing dinner with the team after hackathon',
      totalAmount: '2.5',
      creator: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      participants: [
        {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          amount: '0.8',
          name: 'Alice',
          paid: true,
        },
        {
          address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          amount: '0.7',
          name: 'Bob',
          paid: false,
        },
        {
          address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
          amount: '0.6',
          name: 'Charlie',
          paid: true,
        },
        {
          address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
          amount: '0.4',
          name: 'David',
          paid: false,
        },
      ],
      deadline: '2025-07-20T23:59:59',
      createdAt: '2025-07-17T14:30:00',
      completed: false,
      usePrivateAmounts: false,
    },
    {
      id: '2',
      title: 'Monthly Apartment Utilities',
      description: 'Electricity, water, and internet for July',
      totalAmount: '0.95',
      creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      participants: [
        {
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          amount: '0.32',
          name: 'Alice',
          paid: true,
        },
        {
          address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          amount: '0.31',
          name: 'Bob',
          paid: true,
        },
        {
          address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
          amount: '0.32',
          name: 'Charlie',
          paid: true,
        },
      ],
      deadline: '2025-07-25T23:59:59',
      createdAt: '2025-07-15T09:00:00',
      completed: true,
      usePrivateAmounts: true,
    },
  ];

  useEffect(() => {
    // Initialize with mock data
    setBills(mockBills);
    updateStats(mockBills);
  }, []);

  const updateStats = (billsData: Bill[]) => {
    const totalBills = billsData.length;
    const activeBills = billsData.filter(b => !b.completed).length;
    const completedBills = billsData.filter(b => b.completed).length;
    const totalAmount = billsData.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0).toFixed(2);

    setStats({
      totalBills,
      activeBills,
      completedBills,
      totalAmount,
    });
  };

  const handleCreateBill = async (billData: any) => {
    setIsLoading(true);
    try {
      console.log('Creating bill:', billData);
      
      // Use contract service to create bill
      const contractBill = await createBill(billData);
      
      if (contractBill) {
        // Convert contract bill to UI bill format
        const newBill: Bill = {
          id: contractBill.id,
          title: contractBill.title,
          description: contractBill.description,
          totalAmount: contractBill.totalAmount,
          creator: contractBill.creator,
          participants: contractBill.participants,
          deadline: contractBill.deadline,
          createdAt: contractBill.createdAt,
          completed: contractBill.completed,
          usePrivateAmounts: contractBill.usePrivateAmounts,
        };

        const updatedBills = [...bills, newBill];
        setBills(updatedBills);
        updateStats(updatedBills);
        
        // Switch to bills tab
        setActiveTab('bills');
      } else {
        console.error('Failed to create bill');
      }
      
    } catch (error) {
      console.error('Error creating bill:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayBill = async (billId: string, amount: string) => {
    setIsLoading(true);
    try {
      console.log('Paying bill:', billId, 'amount:', amount);
      
      // Use contract service to pay bill
      const success = await payBill(billId, amount);
      
      if (success) {
        // Update bill payment status in UI
        const updatedBills = bills.map(bill => {
          if (bill.id === billId) {
            const updatedParticipants = bill.participants.map(p => {
              if (p.address === account?.address) {
                return { ...p, paid: true };
              }
              return p;
            });
            
            // Check if all participants have paid
            const allPaid = updatedParticipants.every(p => p.paid);
            
            return {
              ...bill,
              participants: updatedParticipants,
              completed: allPaid,
            };
          }
          return bill;
        });
        
        setBills(updatedBills);
        updateStats(updatedBills);
      } else {
        console.error('Failed to pay bill');
      }
      
    } catch (error) {
      console.error('Error paying bill:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBills = async () => {
    setIsLoading(true);
    try {
      // Try to fetch bills from contract
      const contractBills = await getUserBills();
      
      if (contractBills.length > 0) {
        // Convert contract bills to UI format
        const uiBills: Bill[] = contractBills.map(contractBill => ({
          id: contractBill.id,
          title: contractBill.title,
          description: contractBill.description,
          totalAmount: contractBill.totalAmount,
          creator: contractBill.creator,
          participants: contractBill.participants,
          deadline: contractBill.deadline,
          createdAt: contractBill.createdAt,
          completed: contractBill.completed,
          usePrivateAmounts: contractBill.usePrivateAmounts,
        }));
        
        setBills(uiBills);
        updateStats(uiBills);
      } else {
        // For now, just update stats with existing bills
        updateStats(bills);
      }
    } catch (error) {
      console.error('Error refreshing bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bill Splitting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Please connect your Polkadot wallet to access bill splitting features.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bill Splitting</h1>
        <p className="text-gray-600">
          Split bills among friends with privacy protection using zero-knowledge proofs
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Bill
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            My Bills
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            ZK Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBills}</div>
                <p className="text-xs text-muted-foreground">
                  All time bills created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bills</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeBills}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAmount} DOT</div>
                <p className="text-xs text-muted-foreground">
                  Across all bills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedBills}</div>
                <p className="text-xs text-muted-foreground">
                  Fully paid bills
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your latest bill splitting activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bills.slice(0, 3).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        bill.completed ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      <div>
                        <div className="font-medium">{bill.title}</div>
                        <div className="text-sm text-gray-500">
                          {bill.participants.length} participants • {bill.totalAmount} DOT
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {bill.completed ? 'Completed' : 'Active'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Features</CardTitle>
              <CardDescription>
                How 0xCC protects your financial privacy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Zero-Knowledge Proofs</h4>
                    <p className="text-sm text-gray-600">
                      Hide individual payment amounts while proving payment capability
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Private Balance Verification</h4>
                    <p className="text-sm text-gray-600">
                      Verify sufficient funds without revealing actual balance
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          {contractError && (
            <Alert className="mb-4">
              <AlertDescription className="text-red-600">
                Contract Error: {contractError}
              </AlertDescription>
            </Alert>
          )}
          <BillSplittingForm onSubmit={handleCreateBill} isLoading={isLoading || contractLoading} />
        </TabsContent>

        <TabsContent value="bills">
          {contractError && (
            <Alert className="mb-4">
              <AlertDescription className="text-red-600">
                Contract Error: {contractError}
              </AlertDescription>
            </Alert>
          )}
          <BillList
            bills={bills}
            currentAddress={account?.address}
            onPayBill={handlePayBill}
            onRefresh={refreshBills}
            isLoading={isLoading || contractLoading}
          />
        </TabsContent>

        <TabsContent value="privacy">
          <ZKPrivacyDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}