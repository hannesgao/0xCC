import React, { useState } from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';

interface PaymentFormProps {
  onSuccess?: (txHash: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess }) => {
  const { selectedAccount, sendTransaction, getBalance } = usePolkadotApi();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  // Load balance when account changes
  React.useEffect(() => {
    if (selectedAccount) {
      getBalance(selectedAccount.address).then(setBalance);
    }
  }, [selectedAccount, getBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      setError('Please connect your wallet first');
      return;
    }

    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to smallest unit (assuming 12 decimals)
      const amountInSmallestUnit = (parseFloat(amount) * 1e12).toString();
      
      // Send transaction using Polkadot API
      const txHash = await sendTransaction(
        recipient,
        amountInSmallestUnit,
        'balances',
        ['transfer', recipient, amountInSmallestUnit]
      );
      
      setRecipient('');
      setAmount('');
      onSuccess?.(txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrossChainPayment = async () => {
    if (!selectedAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // This would integrate with our payment contract
      // For now, we'll just show a placeholder
      setError('Cross-chain payments coming soon!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cross-chain payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Send Payment</h3>
      
      {selectedAccount && balance && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Balance:</strong> {(parseFloat(balance) / 1e12).toFixed(4)} DOT
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
            className="input"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (DOT)
          </label>
          <input
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0000"
            className="input"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isLoading || !selectedAccount}
            className="btn btn-primary flex-1"
          >
            {isLoading ? 'Sending...' : 'Send Payment'}
          </button>
          
          <button
            type="button"
            onClick={handleCrossChainPayment}
            disabled={isLoading || !selectedAccount}
            className="btn btn-secondary flex-1"
          >
            Cross-Chain Payment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;