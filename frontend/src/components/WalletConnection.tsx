import React from 'react';
import { usePolkadotApi } from '../hooks/usePolkadotApi';

const WalletConnection: React.FC = () => {
  const { 
    accounts, 
    selectedAccount, 
    setSelectedAccount, 
    isConnected, 
    loading, 
    error, 
    reconnect 
  } = usePolkadotApi();

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-2">Connecting to wallet...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="text-red-600 mb-4">
          <h3 className="font-semibold">Connection Error</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          onClick={reconnect}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isConnected || accounts.length === 0) {
    return (
      <div className="card border-yellow-200 bg-yellow-50">
        <div className="text-yellow-600 mb-4">
          <h3 className="font-semibold">Wallet Not Connected</h3>
          <p className="text-sm">
            Please install and set up a Polkadot wallet extension to use 0xCC.
          </p>
        </div>
        <button 
          onClick={reconnect}
          className="btn btn-primary"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Connected Wallet</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Account
          </label>
          <select 
            value={selectedAccount?.address || ''} 
            onChange={(e) => {
              const account = accounts.find(acc => acc.address === e.target.value);
              setSelectedAccount(account || null);
            }}
            className="input"
          >
            {accounts.map((account) => (
              <option key={account.address} value={account.address}>
                {account.meta.name || 'Unknown'} ({account.address.slice(0, 8)}...{account.address.slice(-8)})
              </option>
            ))}
          </select>
        </div>

        {selectedAccount && (
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Address:</strong> {selectedAccount.address}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {selectedAccount.meta.name || 'Unknown'}
            </p>
          </div>
        )}

        <div className="flex items-center text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Connected to Substrate Node
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;