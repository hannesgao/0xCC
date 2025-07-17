import { useState, useCallback } from 'react';
import { usePolkadotApi } from './usePolkadotApi';
import { BillCreateData } from '../services/contractService';

export interface ContractBill {
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

export const useContract = () => {
  const { contractService, createAccountKeyPair, selectedAccount } = usePolkadotApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBill = useCallback(async (billData: any): Promise<ContractBill | null> => {
    if (!contractService || !selectedAccount) {
      setError('Contract service or account not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For development, we'll use the mock implementation
      const contractData: BillCreateData = {
        totalAmount: billData.totalAmount,
        participants: billData.participants.map((p: any) => p.address),
        individualAmounts: billData.participants.map((p: any) => p.amount),
        deadline: billData.deadline,
      };

      const result = await contractService.createBillMock(contractData);
      
      if (result.success && result.billId) {
        // Create bill object to return
        const newBill: ContractBill = {
          id: result.billId.toString(),
          title: billData.title,
          description: billData.description,
          totalAmount: billData.totalAmount,
          creator: selectedAccount.address,
          participants: billData.participants.map((p: any) => ({
            address: p.address,
            amount: p.amount,
            name: p.name,
            paid: false,
          })),
          deadline: billData.deadline,
          createdAt: new Date().toISOString(),
          completed: false,
          usePrivateAmounts: billData.usePrivateAmounts,
        };
        
        return newBill;
      } else {
        setError('Failed to create bill');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [contractService, selectedAccount]);

  const payBill = useCallback(async (billId: string, amount: string): Promise<boolean> => {
    if (!contractService || !selectedAccount) {
      setError('Contract service or account not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For development, we'll use the mock implementation
      const result = await contractService.payBillMock(parseInt(billId), amount);
      
      if (result.success) {
        return true;
      } else {
        setError('Failed to pay bill');
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contractService, selectedAccount]);

  const getBill = useCallback(async (billId: string): Promise<ContractBill | null> => {
    if (!contractService) {
      setError('Contract service not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For development, return null as this method needs contract implementation
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [contractService]);

  const getUserBills = useCallback(async (): Promise<ContractBill[]> => {
    if (!contractService || !selectedAccount) {
      setError('Contract service or account not available');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // For development, return empty array as this method needs contract implementation
      return [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [contractService, selectedAccount]);

  return {
    createBill,
    payBill,
    getBill,
    getUserBills,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};