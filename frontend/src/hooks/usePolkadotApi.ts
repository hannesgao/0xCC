import { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

export const usePolkadotApi = () => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApi();
  }, []);

  const initializeApi = async () => {
    try {
      setLoading(true);
      
      // Connect to local substrate node
      const wsProvider = new WsProvider('ws://127.0.0.1:9944');
      const api = await ApiPromise.create({ provider: wsProvider });
      
      setApi(api);
      setIsConnected(true);
      
      // Initialize wallet extension
      await initializeWallet();
    } catch (err) {
      setError('Failed to connect to Substrate node');
      console.error('API initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeWallet = async () => {
    try {
      // Enable the extension
      const extensions = await web3Enable('0xCC');
      
      if (extensions.length === 0) {
        throw new Error('No wallet extension found');
      }

      // Get accounts
      const accounts = await web3Accounts();
      setAccounts(accounts);
      
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0]);
      }
    } catch (err) {
      setError('Failed to connect to wallet');
      console.error('Wallet initialization error:', err);
    }
  };

  const sendTransaction = async (
    to: string,
    amount: string,
    method: string,
    params: any[] = []
  ) => {
    if (!api || !selectedAccount) {
      throw new Error('API or account not available');
    }

    try {
      const injector = await web3FromAddress(selectedAccount.address);
      
      // Create transaction
      const tx = api.tx[method](...params);
      
      // Sign and send
      const hash = await tx.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        (result) => {
          console.log('Transaction status:', result.status.toString());
        }
      );
      
      return hash.toString();
    } catch (err) {
      console.error('Transaction error:', err);
      throw err;
    }
  };

  const getBalance = async (address: string) => {
    if (!api) return null;
    
    try {
      const { data: balance } = await api.query.system.account(address);
      return balance.free.toString();
    } catch (err) {
      console.error('Balance query error:', err);
      return null;
    }
  };

  return {
    api,
    accounts,
    selectedAccount,
    setSelectedAccount,
    isConnected,
    loading,
    error,
    sendTransaction,
    getBalance,
    reconnect: initializeApi,
  };
};