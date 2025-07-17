export interface AccountInfo {
  address: string;
  name?: string;
  balance?: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  crossChainId?: number;
}

export interface PaymentRequest {
  id: string;
  from: string;
  to: string;
  amount: string;
  message?: string;
  deadline: Date;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface ContractInfo {
  address: string;
  abi: any;
}

export interface ChainInfo {
  id: number;
  name: string;
  rpcUrl: string;
  currency: string;
}