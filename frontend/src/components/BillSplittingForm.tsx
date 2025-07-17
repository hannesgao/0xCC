import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Users, DollarSign, Clock, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Participant {
  id: string;
  address: string;
  amount: string;
  name?: string;
}

interface BillSplittingFormProps {
  onSubmit: (billData: any) => void;
  isLoading?: boolean;
}

export default function BillSplittingForm({ onSubmit, isLoading = false }: BillSplittingFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalAmount: '',
    deadline: '',
    usePrivateAmounts: false,
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', address: '', amount: '', name: '' },
    { id: '2', address: '', amount: '', name: '' },
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const addParticipant = () => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      address: '',
      amount: '',
      name: '',
    };
    setParticipants([...participants, newParticipant]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 2) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id: string, field: keyof Participant, value: string) => {
    setParticipants(participants.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Bill title is required';
    }

    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    }

    // Validate participants
    const validParticipants = participants.filter(p => p.address.trim() && p.amount.trim());
    if (validParticipants.length < 2) {
      newErrors.participants = 'At least 2 participants are required';
    }

    // Validate amounts sum to total
    const totalParticipantAmount = participants.reduce((sum, p) => {
      return sum + (parseFloat(p.amount) || 0);
    }, 0);

    const expectedTotal = parseFloat(formData.totalAmount) || 0;
    if (Math.abs(totalParticipantAmount - expectedTotal) > 0.01) {
      newErrors.amountMismatch = 'Participant amounts must sum to total amount';
    }

    // Validate addresses (basic check)
    participants.forEach((p, index) => {
      if (p.address.trim() && p.address.length < 47) {
        newErrors[`address_${index}`] = 'Invalid Polkadot address';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const validParticipants = participants.filter(p => p.address.trim() && p.amount.trim());

    const billData = {
      title: formData.title,
      description: formData.description,
      totalAmount: formData.totalAmount,
      deadline: formData.deadline,
      participants: validParticipants.map(p => ({
        address: p.address,
        amount: p.amount,
        name: p.name,
      })),
      usePrivateAmounts: formData.usePrivateAmounts,
    };

    onSubmit(billData);
  };

  const calculateRemainingAmount = () => {
    const participantTotal = participants.reduce((sum, p) => {
      return sum + (parseFloat(p.amount) || 0);
    }, 0);
    const expectedTotal = parseFloat(formData.totalAmount) || 0;
    return expectedTotal - participantTotal;
  };

  const remainingAmount = calculateRemainingAmount();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create Bill Splitting
        </CardTitle>
        <CardDescription>
          Split bills among participants with optional ZK privacy protection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bill Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Bill Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Group Dinner at Restaurant"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of the bill"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalAmount">Total Amount (DOT) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className={`pl-10 ${errors.totalAmount ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.totalAmount && <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>}
              </div>

              <div>
                <Label htmlFor="deadline">Payment Deadline *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className={`pl-10 ${errors.deadline ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.deadline && <p className="text-red-500 text-sm mt-1">{errors.deadline}</p>}
              </div>
            </div>
          </div>

          {/* Privacy Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="usePrivateAmounts"
              checked={formData.usePrivateAmounts}
              onChange={(e) => setFormData({ ...formData, usePrivateAmounts: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="usePrivateAmounts" className="flex items-center gap-2 cursor-pointer">
              <Shield className="h-4 w-4" />
              Use ZK privacy protection (hide individual amounts)
            </Label>
          </div>

          {/* Participants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Participants</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParticipant}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Participant
              </Button>
            </div>

            {participants.map((participant, index) => (
              <Card key={participant.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label>Name (Optional)</Label>
                    <Input
                      placeholder="Participant name"
                      value={participant.name}
                      onChange={(e) => updateParticipant(participant.id, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label>Polkadot Address *</Label>
                    <Input
                      placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNeh..."
                      value={participant.address}
                      onChange={(e) => updateParticipant(participant.id, 'address', e.target.value)}
                      className={errors[`address_${index}`] ? 'border-red-500' : ''}
                    />
                    {errors[`address_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`address_${index}`]}</p>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Amount (DOT) *</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.00"
                        value={participant.amount}
                        onChange={(e) => updateParticipant(participant.id, 'amount', e.target.value)}
                      />
                    </div>
                    {participants.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeParticipant(participant.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {errors.participants && (
              <p className="text-red-500 text-sm">{errors.participants}</p>
            )}

            {errors.amountMismatch && (
              <Alert>
                <AlertDescription className="text-red-600">
                  {errors.amountMismatch}
                </AlertDescription>
              </Alert>
            )}

            {/* Amount Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{formData.totalAmount || '0.00'} DOT</span>
              </div>
              <div className="flex justify-between">
                <span>Participants Total:</span>
                <span>{(parseFloat(formData.totalAmount) || 0) - remainingAmount} DOT</span>
              </div>
              <div className={`flex justify-between ${remainingAmount !== 0 ? 'text-orange-600' : 'text-green-600'}`}>
                <span>Remaining:</span>
                <span>{remainingAmount.toFixed(6)} DOT</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || remainingAmount !== 0}
          >
            {isLoading ? 'Creating Bill...' : 'Create Bill'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}