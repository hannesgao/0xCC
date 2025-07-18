# 0xCC Frontend

Cross-Chain P2P Payment & Bill Splitting Frontend Application

## Overview

The 0xCC frontend is a modern React.js application that provides a user-friendly interface for cross-chain payments and bill splitting within the Polkadot ecosystem. It features wallet integration, ZK privacy controls, and seamless cross-chain transaction management.

## Features

- **Multi-Wallet Support**: Integration with Polkadot.js, Talisman, and SubWallet
- **Cross-Chain Payments**: Send payments across different Polkadot parachains
- **Bill Splitting**: Create expense groups and split bills with privacy options
- **ZK Privacy**: Optional zero-knowledge proofs for private transactions
- **Real-time Updates**: Live transaction status and balance updates
- **Responsive Design**: Mobile-first design that works across all devices
- **QR Code Support**: Scan QR codes to join payment groups instantly

## Tech Stack

- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS + Headless UI
- **Blockchain Integration**: Polkadot.js API
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Deployment**: Netlify/Vercel ready

## Prerequisites

Before running the application, ensure you have:

- Node.js 18.x or later
- npm 8.x or later
- A Polkadot-compatible wallet (Polkadot.js, Talisman, or SubWallet)
- Access to Polkadot/Kusama testnet faucets (for testing)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hannesgao/0xCC.git
   cd 0xCC/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   Edit `.env.local` with your configuration:
   ```env
   # Network Configuration
   VITE_NETWORK_ENV=testnet
   VITE_ROCOCO_RPC_URL=wss://rococo-contracts-rpc.polkadot.io
   VITE_WESTEND_RPC_URL=wss://westend-rpc.polkadot.io
   
   # Contract Addresses (Update after deployment)
   VITE_BILL_SPLITTING_CONTRACT=5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM
   VITE_XCM_HANDLER_CONTRACT=5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty
   
   # Application Configuration
   VITE_APP_NAME=0xCC
   VITE_APP_VERSION=1.0.0
   VITE_ENABLE_ZK_PRIVACY=true
   
   # Analytics (Optional)
   VITE_ANALYTICS_ID=your-analytics-id
   ```

## Development

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── common/        # Generic components
│   │   ├── wallet/        # Wallet-related components
│   │   ├── payment/       # Payment components
│   │   └── bill-splitting/ # Bill splitting components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── store/             # Redux store and slices
│   ├── services/          # API services and blockchain interactions
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── styles/            # Global styles and Tailwind config
├── tests/                 # Test files
├── docs/                  # Documentation
└── config/                # Configuration files
```

## Deployment

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Test the production build locally**
   ```bash
   npm run preview
   ```

### Deploy to Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **Configure environment variables in Netlify**
   - Go to your Netlify dashboard
   - Navigate to Site Settings > Environment Variables
   - Add all variables from `.env.local`

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

3. **Configure environment variables in Vercel**
   ```bash
   vercel env add VITE_NETWORK_ENV
   vercel env add VITE_ROCOCO_RPC_URL
   # Add all other environment variables
   ```

### Deploy to Custom Server

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Copy dist folder to your server**
   ```bash
   scp -r dist/ user@your-server:/var/www/0xcc/
   ```

3. **Configure web server (Nginx example)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/0xcc;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:3001;
       }
   }
   ```

## Configuration

### Wallet Configuration

The application supports multiple wallets. Configure wallet preferences in `src/config/wallets.ts`:

```typescript
export const SUPPORTED_WALLETS = {
  'polkadot-js': {
    name: 'Polkadot.js',
    installUrl: 'https://polkadot.js.org/extension/',
  },
  'talisman': {
    name: 'Talisman',
    installUrl: 'https://talisman.xyz/',
  },
  'subwallet': {
    name: 'SubWallet',
    installUrl: 'https://subwallet.app/',
  },
};
```

### Network Configuration

Configure supported networks in `src/config/networks.ts`:

```typescript
export const NETWORKS = {
  rococo: {
    name: 'Rococo Testnet',
    rpcUrl: process.env.VITE_ROCOCO_RPC_URL,
    explorerUrl: 'https://rococo.subscan.io',
    faucetUrl: 'https://paritytech.github.io/polkadot-testnet-faucet/',
  },
  westend: {
    name: 'Westend Testnet',
    rpcUrl: process.env.VITE_WESTEND_RPC_URL,
    explorerUrl: 'https://westend.subscan.io',
    faucetUrl: 'https://paritytech.github.io/polkadot-testnet-faucet/',
  },
};
```

### Contract Configuration

Update contract addresses after deployment in `src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  billSplitting: {
    address: process.env.VITE_BILL_SPLITTING_CONTRACT,
    abi: billSplittingAbi,
  },
  xcmHandler: {
    address: process.env.VITE_XCM_HANDLER_CONTRACT,
    abi: xcmHandlerAbi,
  },
};
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- payment.test.tsx
```

### Test Structure

```
tests/
├── components/         # Component tests
├── hooks/             # Custom hook tests
├── services/          # Service tests
├── utils/             # Utility function tests
└── __mocks__/         # Mock files
```

### Writing Tests

Example component test:

```typescript
import { render, screen } from '@testing-library/react';
import { PaymentForm } from '../components/payment/PaymentForm';

describe('PaymentForm', () => {
  it('renders payment form correctly', () => {
    render(<PaymentForm />);
    expect(screen.getByText('Send Payment')).toBeInTheDocument();
  });
});
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   - Ensure your wallet extension is installed and enabled
   - Check if the wallet is connected to the correct network
   - Try refreshing the page and reconnecting

2. **Transaction Failures**
   - Check your account balance
   - Verify network connectivity
   - Ensure contracts are deployed and accessible

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify environment variables are set correctly

### Debug Mode

Enable debug mode by setting:
```env
VITE_DEBUG=true
```

This will show additional logging and development tools.

## API Reference

### Wallet Service

```typescript
// Connect to wallet
const { connect, disconnect, accounts } = useWallet();

// Get account balance
const balance = await getAccountBalance(account.address);

// Sign transaction
const signature = await signTransaction(transaction);
```

### Payment Service

```typescript
// Send payment
const result = await sendPayment({
  to: recipientAddress,
  amount: paymentAmount,
  token: selectedToken,
});

// Create bill splitting group
const group = await createBillSplittingGroup({
  name: groupName,
  members: memberAddresses,
  amount: totalAmount,
});
```

## Performance Optimization

### Bundle Size Optimization

- Use dynamic imports for heavy components
- Implement code splitting at route level
- Tree-shake unused dependencies

### Runtime Performance

- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Cache API responses with RTK Query

## Security Considerations

- Never store private keys in the frontend
- Validate all user inputs
- Use HTTPS in production
- Implement proper CSP headers
- Sanitize all user-generated content

## Support

For support and questions:

- Create an issue on GitHub
- Join our Discord community
- Email: team@0xcc.app

## License

MIT License - see LICENSE file for details.