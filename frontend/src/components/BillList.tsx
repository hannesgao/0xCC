import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Users, 
  DollarSign, 
  Check, 
  X, 
  Shield,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface BillListProps {
  bills: Bill[];
  currentAddress?: string;
  onPayBill: (billId: string, amount: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function BillList({ 
  bills, 
  currentAddress, 
  onPayBill, 
  onRefresh, 
  isLoading = false 
}: BillListProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'created' | 'amount'>('deadline');

  const filteredBills = bills.filter(bill => {
    if (filter === 'active') return !bill.completed;
    if (filter === 'completed') return bill.completed;
    return true;
  });

  const sortedBills = [...filteredBills].sort((a, b) => {
    if (sortBy === 'deadline') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'amount') {
      return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
    }
    return 0;
  });

  const getParticipantInfo = (bill: Bill) => {
    if (!currentAddress) return null;
    return bill.participants.find(p => p.address === currentAddress);
  };

  const getPaymentProgress = (bill: Bill) => {
    const paidCount = bill.participants.filter(p => p.paid).length;
    return (paidCount / bill.participants.length) * 100;
  };

  const isExpired = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBillStatus = (bill: Bill) => {
    if (bill.completed) return 'completed';
    if (isExpired(bill.deadline)) return 'expired';
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (bills.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-500 text-center">
            Create your first bill to start splitting expenses with friends
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Bills ({bills.length})
              </CardTitle>
              <CardDescription>
                Manage your bill splitting activities
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Bills</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="deadline">Deadline</option>
                <option value="created">Created</option>
                <option value="amount">Amount</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {sortedBills.map((bill) => {
          const participantInfo = getParticipantInfo(bill);
          const paymentProgress = getPaymentProgress(bill);
          const status = getBillStatus(bill);
          const expired = isExpired(bill.deadline);
          
          return (
            <Card key={bill.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{bill.title}</CardTitle>
                      <Badge className={getStatusColor(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      {bill.usePrivateAmounts && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </div>
                    {bill.description && (
                      <CardDescription>{bill.description}</CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {bill.totalAmount} DOT
                    </div>
                    <div className="text-sm text-gray-500">
                      {bill.participants.length} participants
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Payment Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Payment Progress</span>
                    <span>{bill.participants.filter(p => p.paid).length}/{bill.participants.length} paid</span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                </div>

                {/* Timeline */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created: {formatDate(bill.createdAt)}
                  </div>
                  <div className={`flex items-center gap-1 ${expired ? 'text-red-600' : 'text-orange-600'}`}>
                    <Clock className="h-4 w-4" />
                    Deadline: {formatDate(bill.deadline)}
                  </div>
                </div>

                {/* Participants */}
                <div className="space-y-2">
                  <h4 className="font-medium">Participants</h4>
                  <div className="space-y-1">
                    {bill.participants.map((participant, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {participant.paid ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium">
                              {participant.name || 'Participant'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {participant.address.slice(0, 8)}...{participant.address.slice(-8)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {bill.usePrivateAmounts ? 'Hidden' : `${participant.amount} DOT`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {participant.paid ? 'Paid' : 'Pending'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Action */}
                {participantInfo && !participantInfo.paid && !bill.completed && !expired && (
                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        You need to pay {bill.usePrivateAmounts ? 'your share' : `${participantInfo.amount} DOT`}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => onPayBill(bill.id, participantInfo.amount)}
                        className="ml-4"
                      >
                        Pay Now
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Expired Bill */}
                {expired && !bill.completed && (
                  <Alert>
                    <X className="h-4 w-4" />
                    <AlertDescription className="text-red-600">
                      This bill has expired. Contact the creator to extend the deadline.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}