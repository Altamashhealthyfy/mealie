import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  X,
  Bell
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";

export default function InstallmentTracker() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    total_amount: "",
    program_name: "",
    payment_plan: "3_months",
    number_of_installments: 3,
  });

  const { data: installmentPayments } = useQuery({
    queryKey: ['installmentPayments'],
    queryFn: () => base44.entities.InstallmentPayment.list('-created_date'),
    initialData: [],
  });

  const createInstallmentMutation = useMutation({
    mutationFn: (data) => base44.entities.InstallmentPayment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['installmentPayments']);
      setShowAddForm(false);
      setForm({
        client_name: "",
        client_email: "",
        client_phone: "",
        total_amount: "",
        program_name: "",
        payment_plan: "3_months",
        number_of_installments: 3,
      });
    },
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InstallmentPayment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['installmentPayments']);
      setSelectedPayment(null);
    },
  });

  const handleCreate = () => {
    const totalAmount = parseFloat(form.total_amount);
    const numInstallments = parseInt(form.number_of_installments);
    const installmentAmount = totalAmount / numInstallments;

    const installments = [];
    const today = new Date();

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      installments.push({
        installment_number: i + 1,
        amount: installmentAmount,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending'
      });
    }

    createInstallmentMutation.mutate({
      ...form,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_amount: totalAmount,
      installments,
      status: 'active',
      next_reminder_date: installments[0].due_date
    });
  };

  const handleMarkInstallmentPaid = (payment, installmentIndex) => {
    const updatedInstallments = [...payment.installments];
    updatedInstallments[installmentIndex] = {
      ...updatedInstallments[installmentIndex],
      status: 'paid',
      paid_date: format(new Date(), 'yyyy-MM-dd')
    };

    const amountPaid = updatedInstallments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);

    const balanceAmount = payment.total_amount - amountPaid;
    const allPaid = balanceAmount === 0;

    // Find next pending installment
    const nextPending = updatedInstallments.find(i => i.status === 'pending');

    updateInstallmentMutation.mutate({
      id: payment.id,
      data: {
        ...payment,
        installments: updatedInstallments,
        amount_paid: amountPaid,
        balance_amount: balanceAmount,
        status: allPaid ? 'completed' : 'active',
        next_reminder_date: nextPending?.due_date
      }
    });
  };

  const sendReminder = async (payment, installment) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: payment.client_email,
        subject: `Payment Reminder - ${payment.program_name}`,
        body: `Dear ${payment.client_name},\n\nThis is a friendly reminder that your installment payment of ₹${installment.amount} is due on ${format(new Date(installment.due_date), 'MMM d, yyyy')}.\n\nProgram: ${payment.program_name}\nInstallment: ${installment.installment_number} of ${payment.installments.length}\nAmount: ₹${installment.amount}\n\nPlease make the payment at your earliest convenience.\n\nThank you!`
      });
      alert('Reminder sent successfully!');
    } catch (error) {
      alert('Failed to send reminder');
    }
  };

  // Calculate stats
  const activePayments = installmentPayments.filter(p => p.status === 'active').length;
  const completedPayments = installmentPayments.filter(p => p.status === 'completed').length;
  
  const totalOutstanding = installmentPayments
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.balance_amount || 0), 0);

  const overdueCount = installmentPayments.filter(p => {
    if (p.status !== 'active') return false;
    const nextInstallment = p.installments?.find(i => i.status === 'pending');
    return nextInstallment && isPast(new Date(nextInstallment.due_date));
  }).length;

  // Upcoming dues (next 7 days)
  const upcomingDues = installmentPayments.filter(p => {
    if (p.status !== 'active') return false;
    const nextInstallment = p.installments?.find(i => i.status === 'pending');
    if (!nextInstallment) return false;
    const daysUntilDue = differenceInDays(new Date(nextInstallment.due_date), new Date());
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Installment Payments</h1>
            <p className="text-gray-600">Track EMI and installment payments</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Payment Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{activePayments}</p>
              <p className="text-sm opacity-90">Active Plans</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{completedPayments}</p>
              <p className="text-sm opacity-90">Completed</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{(totalOutstanding / 100000).toFixed(1)}L</p>
              <p className="text-sm opacity-90">Outstanding</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <CardContent className="p-6">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{overdueCount}</p>
              <p className="text-sm opacity-90">Overdue</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-none shadow-xl bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create Installment Payment Plan</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm({...form, client_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={form.client_phone}
                    onChange={(e) => setForm({...form, client_phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.client_email}
                    onChange={(e) => setForm({...form, client_email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={form.total_amount}
                    onChange={(e) => setForm({...form, total_amount: e.target.value})}
                    placeholder="99999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Name *</Label>
                  <Input
                    value={form.program_name}
                    onChange={(e) => setForm({...form, program_name: e.target.value})}
                    placeholder="6-Month Health Coaching"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Installments *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.number_of_installments}
                    onChange={(e) => setForm({...form, number_of_installments: e.target.value})}
                  >
                    <option value="2">2 Installments</option>
                    <option value="3">3 Installments</option>
                    <option value="4">4 Installments</option>
                    <option value="6">6 Installments</option>
                    <option value="12">12 Installments</option>
                  </select>
                </div>
                {form.total_amount && form.number_of_installments && (
                  <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Payment Breakdown:</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{(parseFloat(form.total_amount) / parseInt(form.number_of_installments)).toFixed(2)} per installment
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Monthly payments starting from today</p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleCreate}
                disabled={createInstallmentMutation.isPending || !form.client_name || !form.client_phone || !form.total_amount || !form.program_name}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {createInstallmentMutation.isPending ? 'Creating...' : 'Create Payment Plan'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Dues Alert */}
        {upcomingDues.length > 0 && (
          <Card className="border-none shadow-lg bg-yellow-50 border-l-4 border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-900">
                <Bell className="w-5 h-5" />
                {upcomingDues.length} Payment{upcomingDues.length > 1 ? 's' : ''} Due in Next 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingDues.map(payment => {
                  const nextInstallment = payment.installments?.find(i => i.status === 'pending');
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-semibold">{payment.client_name}</p>
                        <p className="text-sm text-gray-600">
                          ₹{nextInstallment?.amount} due on {format(new Date(nextInstallment?.due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendReminder(payment, nextInstallment)}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Send Reminder
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="active">Active ({activePayments})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPayments})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overdueCount})</TabsTrigger>
          </TabsList>

          {['active', 'completed', 'overdue'].map(tab => {
            const filteredPayments = installmentPayments.filter(p => {
              if (tab === 'active') return p.status === 'active' && !p.installments?.some(i => i.status === 'pending' && isPast(new Date(i.due_date)));
              if (tab === 'completed') return p.status === 'completed';
              if (tab === 'overdue') {
                return p.status === 'active' && p.installments?.some(i => i.status === 'pending' && isPast(new Date(i.due_date)));
              }
              return false;
            });

            return (
              <TabsContent key={tab} value={tab}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPayments.map((payment) => {
                    const paidInstallments = payment.installments?.filter(i => i.status === 'paid').length || 0;
                    const totalInstallments = payment.installments?.length || 0;
                    const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

                    return (
                      <Card key={payment.id} className="border-none shadow-lg">
                        <CardHeader className={`${
                          payment.status === 'completed' ? 'bg-green-50 border-l-4 border-green-500' :
                          tab === 'overdue' ? 'bg-red-50 border-l-4 border-red-500' :
                          'bg-blue-50 border-l-4 border-blue-500'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">{payment.client_name}</CardTitle>
                              <p className="text-sm text-gray-600 mt-1">{payment.program_name}</p>
                            </div>
                            <Badge className={
                              payment.status === 'completed' ? 'bg-green-500' :
                              tab === 'overdue' ? 'bg-red-500' :
                              'bg-blue-500'
                            }>
                              {payment.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Total Amount</p>
                              <p className="text-lg font-bold">₹{payment.total_amount?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Balance</p>
                              <p className="text-lg font-bold text-orange-600">₹{payment.balance_amount?.toLocaleString()}</p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span className="font-semibold">{paidInstallments}/{totalInstallments} paid</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Installments:</h4>
                            {payment.installments?.map((installment, index) => {
                              const isOverdue = installment.status === 'pending' && isPast(new Date(installment.due_date));
                              
                              return (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      #{installment.installment_number} - ₹{installment.amount}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Due: {format(new Date(installment.due_date), 'MMM d, yyyy')}
                                      {installment.paid_date && ` | Paid: ${format(new Date(installment.paid_date), 'MMM d, yyyy')}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {installment.status === 'paid' ? (
                                      <Badge className="bg-green-500">Paid</Badge>
                                    ) : isOverdue ? (
                                      <>
                                        <Badge className="bg-red-500">Overdue</Badge>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => sendReminder(payment, installment)}
                                        >
                                          <Bell className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleMarkInstallmentPaid(payment, index)}
                                          className="bg-green-500"
                                        >
                                          Mark Paid
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleMarkInstallmentPaid(payment, index)}
                                        disabled={index > 0 && payment.installments[index - 1].status !== 'paid'}
                                      >
                                        Mark Paid
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => window.open(`tel:${payment.client_phone}`)}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Call
                            </Button>
                            {payment.client_email && (
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.open(`mailto:${payment.client_email}`)}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Email
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}