import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  X,
  PieChart
} from "lucide-react";
import { format } from "date-fns";

export default function IncomeExpense() {
  const queryClient = useQueryClient();
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: "marketing",
    description: "",
    amount: "",
    payment_method: "bank_transfer",
    vendor: "",
    notes: "",
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRecord.filter({ payment_status: 'completed' }),
    initialData: [],
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: [],
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowAddExpense(false);
      setExpenseForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: "marketing",
        description: "",
        amount: "",
        payment_method: "bank_transfer",
        vendor: "",
        notes: "",
      });
    },
  });

  const handleCreateExpense = () => {
    createExpenseMutation.mutate({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
    });
  };

  // Calculate stats
  const thisMonth = format(new Date(), 'yyyy-MM');
  
  const totalIncome = payments
    .filter(p => p.payment_date?.startsWith(thisMonth))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalExpenses = expenses
    .filter(e => e.date?.startsWith(thisMonth))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

  // Expense by category
  const expensesByCategory = {};
  expenses.forEach(e => {
    if (e.date?.startsWith(thisMonth)) {
      if (!expensesByCategory[e.category]) {
        expensesByCategory[e.category] = 0;
      }
      expensesByCategory[e.category] += e.amount || 0;
    }
  });

  // Monthly trend
  const monthlyData = {};
  
  // Income
  payments.forEach(p => {
    if (p.payment_date) {
      const month = p.payment_date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      monthlyData[month].income += p.amount || 0;
    }
  });

  // Expenses
  expenses.forEach(e => {
    if (e.date) {
      const month = e.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      monthlyData[month].expense += e.amount || 0;
    }
  });

  const monthlyEntries = Object.entries(monthlyData)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);

  const exportReport = () => {
    const csv = `Month,Income,Expense,Net Profit\n${
      monthlyEntries.map(([month, data]) => {
        return `${month},${data.income},${data.expense},${data.income - data.expense}`;
      }).join('\n')
    }`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income_expense_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Income & Expense</h1>
            <p className="text-gray-600">Track your business financials</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="bg-gradient-to-r from-red-500 to-pink-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{(totalIncome / 100000).toFixed(2)}L</p>
              <p className="text-sm opacity-90">Total Income (This Month)</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <CardContent className="p-6">
              <TrendingDown className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{(totalExpenses / 100000).toFixed(2)}L</p>
              <p className="text-sm opacity-90">Total Expenses (This Month)</p>
            </CardContent>
          </Card>

          <Card className={`border-none shadow-lg ${netProfit >= 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-orange-500 to-red-500'} text-white`}>
            <CardContent className="p-6">
              <DollarSign className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">₹{(netProfit / 100000).toFixed(2)}L</p>
              <p className="text-sm opacity-90">Net Profit</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6">
              <PieChart className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{profitMargin}%</p>
              <p className="text-sm opacity-90">Profit Margin</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Expense Form */}
        {showAddExpense && (
          <Card className="border-none shadow-xl bg-red-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Expense</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddExpense(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                  >
                    <option value="marketing">Marketing</option>
                    <option value="salary">Salary</option>
                    <option value="software">Software/Tools</option>
                    <option value="office_rent">Office Rent</option>
                    <option value="utilities">Utilities</option>
                    <option value="travel">Travel</option>
                    <option value="training">Training</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description *</Label>
                  <Input
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    placeholder="Facebook Ads - January Campaign"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({...expenseForm, payment_method: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor/Supplier</Label>
                  <Input
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                    placeholder="Facebook, Google, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateExpense}
                disabled={createExpenseMutation.isPending || !expenseForm.description || !expenseForm.amount}
                className="w-full mt-4 bg-gradient-to-r from-red-500 to-pink-500"
              >
                {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
            <TabsTrigger value="income">Income ({payments.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <CardTitle>Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {monthlyEntries.map(([month, data]) => {
                      const profit = data.income - data.expense;
                      return (
                        <div key={month}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{format(new Date(month + '-01'), 'MMM yyyy')}</span>
                            <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profit >= 0 ? '+' : ''}₹{(profit / 1000).toFixed(0)}K
                            </span>
                          </div>
                          <div className="flex gap-2 h-8">
                            <div className="flex-1 bg-green-100 rounded overflow-hidden relative">
                              <div
                                className="h-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                                style={{ width: `${data.income > 0 ? 100 : 0}%` }}
                              >
                                ₹{(data.income / 1000).toFixed(0)}K
                              </div>
                            </div>
                            <div className="flex-1 bg-red-100 rounded overflow-hidden relative">
                              <div
                                className="h-full bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
                                style={{ width: `${data.expense > 0 ? 100 : 0}%` }}
                              >
                                ₹{(data.expense / 1000).toFixed(0)}K
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <CardTitle>Expense Breakdown (This Month)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {Object.entries(expensesByCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => (
                        <div key={category} className="flex items-center gap-3">
                          <div className="w-32 text-sm capitalize">{category.replace('_', ' ')}</div>
                          <div className="flex-1">
                            <div className="h-8 bg-gray-100 rounded overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center px-3 text-white text-xs font-semibold"
                                style={{ width: `${(amount / totalExpenses) * 100}%` }}
                              >
                                ₹{(amount / 1000).toFixed(0)}K
                              </div>
                            </div>
                          </div>
                          <div className="w-16 text-right text-sm text-gray-600">
                            {((amount / totalExpenses) * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Expenses List */}
          <TabsContent value="expenses">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Date</th>
                        <th className="p-3 text-left text-sm font-semibold">Category</th>
                        <th className="p-3 text-left text-sm font-semibold">Description</th>
                        <th className="p-3 text-left text-sm font-semibold">Vendor</th>
                        <th className="p-3 text-left text-sm font-semibold">Amount</th>
                        <th className="p-3 text-left text-sm font-semibold">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '-'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize">
                              {expense.category?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{expense.description}</td>
                          <td className="p-3 text-sm">{expense.vendor || '-'}</td>
                          <td className="p-3">
                            <p className="text-lg font-bold text-red-600">₹{expense.amount?.toLocaleString()}</p>
                          </td>
                          <td className="p-3 text-sm capitalize">
                            {expense.payment_method?.replace('_', ' ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income List */}
          <TabsContent value="income">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Date</th>
                        <th className="p-3 text-left text-sm font-semibold">Customer</th>
                        <th className="p-3 text-left text-sm font-semibold">Product</th>
                        <th className="p-3 text-left text-sm font-semibold">Type</th>
                        <th className="p-3 text-left text-sm font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {payment.payment_date ? format(new Date(payment.payment_date), 'MMM d, yyyy') : '-'}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold">{payment.customer_name}</p>
                            {payment.customer_phone && (
                              <p className="text-xs text-gray-500">{payment.customer_phone}</p>
                            )}
                          </td>
                          <td className="p-3 text-sm">{payment.product_name}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize">
                              {payment.payment_type?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <p className="text-lg font-bold text-green-600">₹{payment.amount?.toLocaleString()}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}