import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Key, CheckCircle } from 'lucide-react';

interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

interface ZKPrivacyDemoProps {
  onProofGenerated?: (proof: ZKProof) => void;
}

export default function ZKPrivacyDemo({ onProofGenerated }: ZKPrivacyDemoProps) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<ZKProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateProof = async () => {
    if (!amount || !balance) {
      setError('Please enter both amount and balance');
      return;
    }

    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(balance);

    if (amountNum <= 0 || balanceNum <= 0) {
      setError('Amount and balance must be positive numbers');
      return;
    }

    if (amountNum > balanceNum) {
      setError('Amount cannot exceed balance');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Simulate ZK proof generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock proof based on input
      const mockProof: ZKProof = {
        pi_a: [
          `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          '0x1'
        ],
        pi_b: [
          [
            `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
          ],
          [
            `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
          ],
          ['0x1', '0x0']
        ],
        pi_c: [
          `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          `0x${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          '0x1'
        ],
        protocol: 'groth16',
        curve: 'bn128'
      };

      setProof(mockProof);
      onProofGenerated?.(mockProof);
    } catch (err) {
      setError('Failed to generate proof');
      console.error('Proof generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyProof = async () => {
    if (!proof) return;

    setIsGenerating(true);
    try {
      // Simulate proof verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification success
      alert('Proof verified successfully! ✓');
    } catch (err) {
      setError('Proof verification failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Zero-Knowledge Privacy Demo
        </CardTitle>
        <CardDescription>
          Generate proofs to verify payment capability without revealing actual amounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Payment Amount (DOT)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="balance">Your Balance (DOT)</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="balance"
                type="number"
                step="0.000001"
                placeholder="10.000000"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Generate Proof Button */}
        <Button
          onClick={generateProof}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? 'Generating Proof...' : 'Generate ZK Proof'}
        </Button>

        {/* Proof Display */}
        {proof && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Proof Generated Successfully</span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Generated Proof:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Protocol:</strong> {proof.protocol}</div>
                <div><strong>Curve:</strong> {proof.curve}</div>
                <div><strong>π_a:</strong> [{proof.pi_a[0]}, {proof.pi_a[1]}, {proof.pi_a[2]}]</div>
                <div><strong>π_b:</strong> [...]</div>
                <div><strong>π_c:</strong> [{proof.pi_c[0]}, {proof.pi_c[1]}, {proof.pi_c[2]}]</div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800">What this proves:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✓ You have sufficient balance to make the payment</li>
                <li>✓ The payment amount is valid and positive</li>
                <li>✓ Your actual balance remains private</li>
                <li>✓ The proof can be verified by anyone</li>
              </ul>
            </div>

            <Button
              onClick={verifyProof}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? 'Verifying...' : 'Verify Proof'}
            </Button>
          </div>
        )}

        {/* Information Section */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-green-800">Privacy Benefits:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Hide your actual account balance from other participants</li>
            <li>• Prove payment capability without revealing financial details</li>
            <li>• Maintain privacy while ensuring bill payment legitimacy</li>
            <li>• Enable confidential transactions in group payments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}