import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  Plus,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Filter,
  Loader2,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Receipt,
  Building2,
  Target,
  Lock,
  Crown
} from "lucide-react";
import { format } from "date-fns";
import QuickAddTransaction from "@/components/finance/QuickAddTransaction";
import { useCoachPlanPermissions } from "@/components/permissions/useCoachPlanPermissions";
import { createPageUrl } from "@/utils";

export default function ClientFinanceManager() {
  const { user, canAccessFinanceManager, isLoading: permissionsLoading } = useCoachPlanPermissions();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCCPaymentForm, setShowCCPaymentForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Income form
  const [formData, setFormData] = useState({
    vertical: 'HFS',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    customer_type: 'New Customer',
    payment_type: 'Full Payment',
    university_fee: 0,
  });

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Expense form
  const [expenseData, setExpenseData] = useState({
    vertical: 'HFS',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    expense_category: '',
    expense_description: '',
    amount: 0,
    paid_via: '',
    vendor_name: '',
    invoice_number: '',
    ad_account_name: '',
    credit_card_details: '',
    paid_via_other: '',
    notes: '',
  });

  // CC Payment form
  const [ccPaymentData, setCCPaymentData] = useState({
    card_name: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount_paid: 0,
    paid_from: '',
    payment_type: 'Full Statement',
    statement_month: '',
    paid_from_other: '',
    notes: '',
  });

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [programmeFilter, setProgrammeFilter] = useState('all');
  const [leadSourceFilter, setLeadSourceFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

  // Check access for student_coach
  if (!permissionsLoading && user?.user_type === 'student_coach' && !canAccessFinanceManager) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <CardTitle className="text-center text-2xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Finance Manager is not included in your current plan.
            </p>
            <Alert className="bg-white border-orange-300">
              <Crown className="w-5 h-5 text-orange-600" />
              <AlertDescription>
                Upgrade your plan to access Finance Manager and track client finances.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: transactions } = useQuery({
    queryKey: ['clientTransactions'],
    queryFn: () => base44.entities.ClientTransaction.list('-transaction_date'),
    initialData: [],
  });

  const { data: expenses } = useQuery({
    queryKey: ['businessExpenses'],
    queryFn: () => base44.entities.BusinessExpense.list('-expense_date'),
    initialData: [],
  });

  const { data: ccPayments } = useQuery({
    queryKey: ['creditCardPayments'],
    queryFn: () => base44.entities.CreditCardPayment.list('-payment_date'),
    initialData: [],
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (data) => {
      // Auto-calculate fields
      const amountToCompany = data.amount_received - (data.university_fee || 0);
      const valueWithoutGst = amountToCompany / 1.18;
      const gstAmount = amountToCompany - valueWithoutGst;
      const balanceDue = (data.total_programme_fee || 0) - data.amount_received;

      // Generate Registration Number for New Customers
      let registrationNumber = null;
      if (data.customer_type === 'New Customer') {
        const dateStr = format(new Date(data.transaction_date), 'yyyyMMdd');
        
        // Get today's transactions to find next sequence number
        const todayTransactions = await base44.entities.ClientTransaction.filter({
          vertical: data.vertical,
          transaction_date: data.transaction_date,
          customer_type: 'New Customer'
        });
        
        // Filter out transactions that might have an invalid registration number to ensure correct sequence
        const validRegistrations = todayTransactions.filter(t => t.registration_number);
        const sequence = String(validRegistrations.length + 1).padStart(3, '0');
        registrationNumber = `${data.vertical}-${dateStr}-${sequence}`;
      }

      return base44.entities.ClientTransaction.create({
        ...data,
        registration_number: registrationNumber,
        amount_to_company: Math.round(amountToCompany),
        value_without_gst: Math.round(valueWithoutGst),
        gst_amount: Math.round(gstAmount),
        balance_due: Math.round(balanceDue),
      });
    },
    onSuccess: (savedTransaction) => {
      queryClient.invalidateQueries(['clientTransactions']);
      setShowAddForm(false);
      setFormData({
        vertical: 'HFS',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        customer_type: 'New Customer',
        payment_type: 'Full Payment',
        university_fee: 0,
      });
      
      if (savedTransaction.registration_number) {
        alert(`✅ Transaction added successfully!\n\n🆔 Registration Number: ${savedTransaction.registration_number}`);
      } else {
        alert("✅ Transaction added successfully!");
      }
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.BusinessExpense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['businessExpenses']);
      setShowExpenseForm(false);
      setExpenseData({
        vertical: 'HFS',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        expense_category: '',
        expense_description: '',
        amount: 0,
        paid_via: '',
        vendor_name: '',
        invoice_number: '',
        ad_account_name: '',
        credit_card_details: '',
        paid_via_other: '',
        notes: '',
      });
      alert("✅ Expense added!");
    },
  });

  const createCCPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditCardPayment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['creditCardPayments']);
      setShowCCPaymentForm(false);
      setCCPaymentData({
        card_name: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        amount_paid: 0,
        paid_from: '',
        payment_type: 'Full Statement',
        statement_month: '',
        paid_from_other: '',
        notes: '',
      });
      alert("✅ Credit card payment recorded!");
    },
  });

  const handleQuickAdd = async (transactionData) => {
    await createIncomeMutation.mutateAsync(transactionData);
  };

  const handleExcelUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    setUploading(true);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });

      const schema = {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                vertical: { type: "string" },
                transaction_date: { type: "string" },
                client_name: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                lead_source: { type: "string" },
                programme_type: { type: "string" },
                programme_details: { type: "string" },
                previous_programme: { type: "string" },
                customer_type: { type: "string" },
                payment_type: { type: "string" },
                total_programme_fee: { type: "number" },
                amount_received: { type: "number" },
                university_fee: { type: "number" },
                payment_mode: { type: "string" },
                payment_mode_other: { type: "string" },
                next_installment_date: { type: "string" },
                invoice_number: { type: "string" },
                transaction_notes: { type: "string" }
              }
            }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: schema
      });

      if (extractResult.status === "success") {
        const records = extractResult.output.data || [];
        let newCustomerCount = 0;

        for (const record of records) {
          const amountToCompany = record.amount_received - (record.university_fee || 0);
          const valueWithoutGst = amountToCompany / 1.18;
          const gstAmount = amountToCompany - valueWithoutGst;
          const balanceDue = (record.total_programme_fee || 0) - record.amount_received;

          // Generate Registration Number for New Customers
          let registrationNumber = null;
          if (record.customer_type === 'New Customer') {
            const dateStr = format(new Date(record.transaction_date), 'yyyyMMdd');
            const todayTransactions = await base44.entities.ClientTransaction.filter({
              vertical: record.vertical,
              transaction_date: record.transaction_date,
              customer_type: 'New Customer'
            });
            const validRegistrations = todayTransactions.filter(t => t.registration_number);
            const sequence = String(validRegistrations.length + 1).padStart(3, '0');
            registrationNumber = `${record.vertical}-${dateStr}-${sequence}`;
            newCustomerCount++;
          }

          await base44.entities.ClientTransaction.create({
            ...record,
            registration_number: registrationNumber,
            amount_to_company: Math.round(amountToCompany),
            value_without_gst: Math.round(valueWithoutGst),
            gst_amount: Math.round(gstAmount),
            balance_due: Math.round(balanceDue),
          });
        }

        queryClient.invalidateQueries(['clientTransactions']);
        alert(`✅ Successfully uploaded ${records.length} transactions!\n\n🆔 ${newCustomerCount} new registration numbers generated!`);
        setSelectedFile(null);
      } else {
        alert("Error extracting data from file");
      }
    } catch (error) {
      alert("Error uploading file. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `Vertical,Transaction Date,Client Name,Phone,Email,Lead Source,Programme Type,Programme Details,Previous Programme,Customer Type,Payment Type,Total Programme Fee,Amount Received,University Fee,Payment Mode,Payment Mode Other,Next Installment Date,Invoice Number,Transaction Notes
HFS,2024-11-01,Rahul Sharma,9876543210,rahul@email.com,ScaleX Ad Agency,Silver,,None (New Customer),New Customer,Full Payment,50000,50000,0,HFICICI,,,INV-001,
HFI,2024-11-02,Priya Verma,9876543211,priya@email.com,Facebook Ad,Gold,,Silver,Upgrade,1st Installment,80000,30000,2000,RZPHFI,,2024-12-02,INV-002,
HFS,2024-11-03,Amit Kumar,9876543212,amit@email.com,Referral,Workshop,Instagram Marketing Workshop,None (New Customer),New Customer,Full Payment,5000,5000,0,CASH,,,INV-003,`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_finance_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadDropdownValues = () => {
    const dropdownReference = `COPY-PASTE DROPDOWN VALUES FOR EXCEL DATA VALIDATION
==========================================================

HOW TO USE:
1. Open Excel, paste your data
2. Select a column (e.g., column A from A2 to A1000)
3. Go to: Data > Data Validation > Settings
4. Allow: List
5. Source: Copy the values from below and paste
6. Click OK
7. Repeat for each column

==========================================================

COLUMN A - Vertical:
HFS,HFI

COLUMN G - Programme Type:
Silver,Gold,Diploma,Diamond,FOP,MOP,One Month Programme,3 Month Programme,12 Month Programme,7 Days Detox,Workshop,Affiliate Income,University Fee (Separate),Retreat Fee,Others

COLUMN I - Previous Programme:
None (New Customer),Silver,Gold,Diploma,Diamond,FOP,MOP,One Month Programme,3 Month Programme,12 Month Programme,7 Days Detox

COLUMN J - Customer Type:
New Customer,Upgrade

COLUMN K - Payment Type:
Full Payment,1st Installment,2nd Installment,3rd Installment,4th Installment,Final Installment

COLUMN O - Payment Mode:
HFICICI,HFIIDFC,RZPHFI,SKMGPAY,CASH,TAGMANGO,HFSPAYTM,HFSICICI,HFSIDFC,RZPHFS,Others

==========================================================

QUICK SETUP (5 MINUTES):
1. Download CSV template
2. Open in Excel
3. For each column above, select cells (e.g., A2:A1000)
4. Data > Data Validation > List
5. Copy-paste the values from above
6. Done!

==========================================================`;

    const blob = new Blob([dropdownReference], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DROPDOWN_VALUES_COPY_PASTE.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportData = () => {
    let filtered = transactions;

    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.transaction_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.transaction_date) <= new Date(dateTo));
    }
    if (verticalFilter !== 'all') {
      filtered = filtered.filter(t => t.vertical === verticalFilter);
    }
    if (programmeFilter !== 'all') {
      filtered = filtered.filter(t => t.programme_type === programmeFilter);
    }
    if (leadSourceFilter !== 'all') {
      filtered = filtered.filter(t => t.lead_source === leadSourceFilter);
    }
    if (customerTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.customer_type === customerTypeFilter);
    }

    const csv = `Reg No.,Vertical,Date,Client,Phone,Email,Lead Source,Programme,Details,Previous,Type,Payment Type,Total Fee,Received,Univ Fee,To Company,Value (No GST),GST,Balance,Payment Mode,Next Installment Date,Invoice Number,Notes\n${
      filtered.map(t => {
        const paymentMode = t.payment_mode === 'Others' && t.payment_mode_other
          ? `Others (${t.payment_mode_other})`
          : t.payment_mode || '';
        return `${t.registration_number || ''},${t.vertical || ''},${t.transaction_date},"${t.client_name}",${t.phone || ''},${t.email || ''},"${t.lead_source || ''}",${t.programme_type || ''},"${t.programme_details || ''}","${t.previous_programme || ''}",${t.customer_type || ''},${t.payment_type || ''},${t.total_programme_fee || 0},${t.amount_received},${t.university_fee || 0},${t.amount_to_company},${t.value_without_gst},${t.gst_amount},${t.balance_due || 0},"${paymentMode}",${t.next_installment_date || ''},${t.invoice_number || ''},"${t.transaction_notes || ''}"`;
      }).join('\n')
    }`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleIncomeSubmit = () => {
    if (!formData.client_name || !formData.programme_type || !formData.amount_received) {
      alert("Please fill required fields: Client Name, Programme Type, Amount Received");
      return;
    }
    if (needsExtraField && !formData.programme_details) {
      alert("Please specify Programme Details");
      return;
    }
    if (needsPaymentModeOther && !formData.payment_mode_other) {
      alert("Please specify Payment Mode");
      return;
    }

    createIncomeMutation.mutate(formData);
  };

  const handleExpenseSubmit = () => {
    if (!expenseData.expense_category || !expenseData.amount || !expenseData.paid_via || !expenseData.expense_description) {
      alert("Please fill all required expense fields: Category, Amount, Paid Via, Description");
      return;
    }
    if (needsAdAccount && !expenseData.ad_account_name) {
      alert("Please provide Ad Account Name.");
      return;
    }
    if (needsCCDetails && !expenseData.credit_card_details) {
      alert("Please provide Credit Card Details.");
      return;
    }
    if (needsExpensePaidViaOther && !expenseData.paid_via_other) {
      alert("Please specify the payment method.");
      return;
    }
    createExpenseMutation.mutate(expenseData);
  };

  const handleCCPaymentSubmit = () => {
    if (!ccPaymentData.card_name || !ccPaymentData.amount_paid || !ccPaymentData.paid_from) {
      alert("Please fill all required credit card payment fields: Card Name, Amount Paid, Paid From");
      return;
    }
    if (needsCCPaidFromOther && !ccPaymentData.paid_from_other) {
      alert("Please specify the account.");
      return;
    }
    createCCPaymentMutation.mutate(ccPaymentData);
  };

  // Calculate statistics
  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount_received, 0);
  const hfsRevenue = transactions.filter(t => t.vertical === 'HFS').reduce((sum, t) => sum + t.amount_received, 0);
  const hfiRevenue = transactions.filter(t => t.vertical === 'HFI').reduce((sum, t) => sum + t.amount_received, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const hfsExpenses = expenses.filter(e => e.vertical === 'HFS').reduce((sum, e) => sum + e.amount, 0);
  const hfiExpenses = expenses.filter(e => e.vertical === 'HFI').reduce((sum, e) => sum + e.amount, 0);
  const commonExpenses = expenses.filter(e => e.vertical === 'Common').reduce((sum, e) => sum + e.amount, 0);

  const ccExpenses = expenses.filter(e => e.paid_via === 'Credit Card').reduce((sum, e) => sum + e.amount, 0);
  const ccPaymentsTotal = ccPayments.reduce((sum, p) => sum + p.amount_paid, 0);
  const ccDue = ccExpenses - ccPaymentsTotal;

  const netProfit = totalRevenue - totalExpenses;

  // Filter transactions
  let filteredTransactions = transactions;
  if (dateFrom) {
    filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) >= new Date(dateFrom));
  }
  if (dateTo) {
    filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) <= new Date(dateTo));
  }
  if (verticalFilter !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.vertical === verticalFilter);
  }
  if (programmeFilter !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.programme_type === programmeFilter);
  }
  if (leadSourceFilter !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.lead_source === leadSourceFilter);
  }
  if (customerTypeFilter !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.customer_type === customerTypeFilter);
  }

  // Filter expenses
  let filteredExpenses = expenses;
  if (dateFrom) {
    filteredExpenses = filteredExpenses.filter(e => new Date(e.expense_date) >= new Date(dateFrom));
  }
  if (dateTo) {
    filteredExpenses = filteredExpenses.filter(e => new Date(e.expense_date) <= new Date(dateTo));
  }
  if (verticalFilter !== 'all') {
    filteredExpenses = filteredExpenses.filter(e => e.vertical === verticalFilter);
  }

  // Get unique values for filters
  const uniqueProgrammes = [...new Set(transactions.map(t => t.programme_type))];
  const uniqueSources = [...new Set(transactions.map(t => t.lead_source).filter(Boolean))];

  // Check if programme needs extra field
  const needsExtraField = ['Workshop', 'Affiliate Income', 'Others'].includes(formData.programme_type);
  const needsPaymentModeOther = formData.payment_mode === 'Others';
  const needsAdAccount = ['FB Ads', 'Google Ads'].includes(expenseData.expense_category);
  const needsCCDetails = expenseData.paid_via === 'Credit Card';
  const needsExpensePaidViaOther = expenseData.paid_via === 'Others';
  const needsCCPaidFromOther = ccPaymentData.paid_from === 'Others';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Finance Manager</h1>
            <p className="text-gray-600">Income, Expenses & Credit Card Tracking</p>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-blue-600 text-white text-lg px-4 py-2">HFS (Healthyfy Solutions): ₹{(hfsRevenue / 1000).toFixed(0)}K</Badge>
            <Badge className="bg-green-600 text-white text-lg px-4 py-2">HFI (Healthyfy Institute): ₹{(hfiRevenue / 1000).toFixed(0)}K</Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-600">₹{(totalRevenue / 1000).toFixed(0)}K</p>
                </div>
                <DollarSign className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-600">₹{(totalExpenses / 1000).toFixed(0)}K</p>
                </div>
                <Receipt className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                  <p className="text-3xl font-bold text-green-600">₹{(netProfit / 1000).toFixed(0)}K</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">CC Spent</p>
                  <p className="text-3xl font-bold text-purple-600">₹{(ccExpenses / 1000).toFixed(0)}K</p>
                </div>
                <CreditCard className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">CC Due</p>
                  <p className="text-3xl font-bold text-amber-600">₹{(ccDue / 1000).toFixed(0)}K</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vertical Breakdown */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Vertical-wise Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">HFS (Healthyfy Solutions)</h3>
                <p className="text-sm text-gray-700">Revenue: ₹{(hfsRevenue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-700">Expenses: ₹{(hfsExpenses / 1000).toFixed(0)}K</p>
                <p className="text-sm font-bold text-blue-900 mt-2">Profit: ₹{((hfsRevenue - hfsExpenses - (commonExpenses / 2)) / 1000).toFixed(0)}K</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-green-900 mb-2">HFI (Healthyfy Institute)</h3>
                <p className="text-sm text-gray-700">Revenue: ₹{(hfiRevenue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-700">Expenses: ₹{(hfiExpenses / 1000).toFixed(0)}K</p>
                <p className="text-sm font-bold text-green-900 mt-2">Profit: ₹{((hfiRevenue - hfiExpenses - (commonExpenses / 2)) / 1000).toFixed(0)}K</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">Common Expenses</h3>
                <p className="text-sm text-gray-700">Total: ₹{(commonExpenses / 1000).toFixed(0)}K</p>
                <p className="text-xs text-gray-600 mt-2">Shared equally between verticals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-5">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="quick-add" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
              <Plus className="w-4 h-4 mr-2" />
              Quick Add
            </TabsTrigger>
            <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="credit-cards">Credit Cards</TabsTrigger>
          </TabsList>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    Month-Wise Finance Dashboard
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Label className="text-white font-semibold">Select Month:</Label>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-48 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  // Filter transactions for selected month
                  const monthTransactions = transactions.filter(t => {
                    if (!t.transaction_date) return false;
                    const transactionMonth = t.transaction_date.substring(0, 7); // Get yyyy-MM
                    return transactionMonth === selectedMonth;
                  });
                  
                  const monthExpenses = expenses.filter(e => {
                    if (!e.expense_date) return false;
                    const expenseMonth = e.expense_date.substring(0, 7); // Get yyyy-MM
                    return expenseMonth === selectedMonth;
                  });

                  // Calculate revenues with proper number handling
                  const monthRevenue = monthTransactions.reduce((sum, t) => sum + (parseFloat(t.amount_received) || 0), 0);
                  const monthHfsRevenue = monthTransactions.filter(t => t.vertical === 'HFS').reduce((sum, t) => sum + (parseFloat(t.amount_received) || 0), 0);
                  const monthHfiRevenue = monthTransactions.filter(t => t.vertical === 'HFI').reduce((sum, t) => sum + (parseFloat(t.amount_received) || 0), 0);

                  const monthTotalExpenses = monthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                  const monthHfsExpenses = monthExpenses.filter(e => e.vertical === 'HFS').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                  const monthHfiExpenses = monthExpenses.filter(e => e.vertical === 'HFI').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                  const monthCommonExpenses = monthExpenses.filter(e => e.vertical === 'Common').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

                  const monthNetProfit = monthRevenue - monthTotalExpenses;

                  return (
                    <div className="space-y-6">
                      <Alert className="bg-blue-50 border-blue-500">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <AlertDescription>
                          <strong>Viewing data for:</strong> {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </AlertDescription>
                      </Alert>

                      {/* Month Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-600">₹{(monthRevenue / 1000).toFixed(0)}K</p>
                            <p className="text-xs text-gray-500 mt-1">{monthTransactions.length} transactions</p>
                          </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-600 mb-1">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600">₹{(monthTotalExpenses / 1000).toFixed(0)}K</p>
                            <p className="text-xs text-gray-500 mt-1">{monthExpenses.length} expenses</p>
                          </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-600 mb-1">Net Profit</p>
                            <p className="text-2xl font-bold text-green-600">₹{(monthNetProfit / 1000).toFixed(0)}K</p>
                            <p className="text-xs text-gray-500 mt-1">{monthNetProfit > 0 ? 'Profitable' : 'Loss'}</p>
                          </CardContent>
                        </Card>

                        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-600 mb-1">Profit Margin</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {monthRevenue > 0 ? ((monthNetProfit / monthRevenue) * 100).toFixed(1) : 0}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {monthRevenue > 0 && ((monthNetProfit / monthRevenue) * 100) > 30 ? 'Excellent' : 
                               monthRevenue > 0 && ((monthNetProfit / monthRevenue) * 100) > 15 ? 'Good' : 'Need Improvement'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Vertical Breakdown */}
                      <Card className="border-none shadow-lg">
                        <CardHeader>
                          <CardTitle>Vertical-wise Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                              <h3 className="font-bold text-blue-900 mb-3">HFS (Healthyfy Solutions)</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Revenue:</span>
                                  <span className="font-semibold text-blue-900">₹{(monthHfsRevenue / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Expenses:</span>
                                  <span className="font-semibold text-red-600">₹{(monthHfsExpenses / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Common (50%):</span>
                                  <span className="font-semibold text-orange-600">₹{(monthCommonExpenses / 2 / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                  <span className="text-sm font-bold text-blue-900">Net Profit:</span>
                                  <span className="font-bold text-blue-900">
                                    ₹{((monthHfsRevenue - monthHfsExpenses - (monthCommonExpenses / 2)) / 1000).toFixed(0)}K
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                              <h3 className="font-bold text-green-900 mb-3">HFI (Healthyfy Institute)</h3>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Revenue:</span>
                                  <span className="font-semibold text-green-900">₹{(monthHfiRevenue / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Expenses:</span>
                                  <span className="font-semibold text-red-600">₹{(monthHfiExpenses / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-700">Common (50%):</span>
                                  <span className="font-semibold text-orange-600">₹{(monthCommonExpenses / 2 / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                  <span className="text-sm font-bold text-green-900">Net Profit:</span>
                                  <span className="font-bold text-green-900">
                                    ₹{((monthHfiRevenue - monthHfiExpenses - (monthCommonExpenses / 2)) / 1000).toFixed(0)}K
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Month Transactions */}
                      <Card className="border-none shadow-lg">
                        <CardHeader>
                          <CardTitle>Month Transactions ({monthTransactions.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="p-3 text-left text-sm font-semibold">Date</th>
                                  <th className="p-3 text-left text-sm font-semibold">Vertical</th>
                                  <th className="p-3 text-left text-sm font-semibold">Client</th>
                                  <th className="p-3 text-left text-sm font-semibold">Programme</th>
                                  <th className="p-3 text-right text-sm font-semibold">Amount</th>
                                  <th className="p-3 text-left text-sm font-semibold">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthTransactions.length > 0 ? monthTransactions.map((t) => (
                                  <tr key={t.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-sm">{t.transaction_date}</td>
                                    <td className="p-3">
                                      <Badge className={t.vertical === 'HFS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                                        {t.vertical}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-sm font-semibold">{t.client_name}</td>
                                    <td className="p-3">
                                      <Badge className="bg-purple-100 text-purple-700">{t.programme_type}</Badge>
                                    </td>
                                    <td className="p-3 text-right font-semibold text-green-600">₹{t.amount_received?.toLocaleString()}</td>
                                    <td className="p-3">
                                      <Badge variant="outline">{t.customer_type}</Badge>
                                    </td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">
                                      No transactions found for this month
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Month Expenses */}
                      <Card className="border-none shadow-lg">
                        <CardHeader>
                          <CardTitle>Month Expenses ({monthExpenses.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="p-3 text-left text-sm font-semibold">Date</th>
                                  <th className="p-3 text-left text-sm font-semibold">Vertical</th>
                                  <th className="p-3 text-left text-sm font-semibold">Category</th>
                                  <th className="p-3 text-left text-sm font-semibold">Description</th>
                                  <th className="p-3 text-right text-sm font-semibold">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthExpenses.length > 0 ? monthExpenses.map((e) => (
                                  <tr key={e.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-sm">{e.expense_date}</td>
                                    <td className="p-3">
                                      <Badge className={
                                        e.vertical === 'HFS' ? 'bg-blue-100 text-blue-700' :
                                        e.vertical === 'HFI' ? 'bg-green-100 text-green-700' :
                                        'bg-purple-100 text-purple-700'
                                      }>
                                        {e.vertical}
                                      </Badge>
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="outline">{e.expense_category}</Badge>
                                    </td>
                                    <td className="p-3 text-sm">{e.expense_description}</td>
                                    <td className="p-3 text-right font-semibold text-red-600">₹{e.amount?.toLocaleString()}</td>
                                  </tr>
                                )) : (
                                  <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                      No expenses found for this month
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QUICK ADD TAB */}
          <TabsContent value="quick-add">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  Add Transaction - All Dropdowns Built-In!
                </CardTitle>
                <p className="text-white/90 text-sm">No Excel needed - L1, L2, L3 levels show automatically after programme selection!</p>
              </CardHeader>
              <CardContent className="p-6">
                <Alert className="bg-blue-50 border-blue-500 mb-6">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription>
                    <strong>✨ All dropdowns built-in!</strong> Select programme and see L1/L2/L3 level + upgrade path automatically!
                  </AlertDescription>
                </Alert>

                <QuickAddTransaction 
                  onSubmit={handleQuickAdd}
                  isSubmitting={createIncomeMutation.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* BULK UPLOAD TAB */}
          <TabsContent value="bulk-upload">
            {/* Excel Upload */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Bulk Upload from Excel/CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-orange-50 border-orange-500">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <AlertDescription>
                    <strong>⚠️ IMPORTANT:</strong> I cannot create Excel files with dropdowns directly. But I can give you:<br/>
                    1️⃣ CSV template to open in Excel<br/>
                    2️⃣ Dropdown values to copy-paste (takes 5 min to setup)<br/>
                    <strong>Then you'll have a reusable template forever!</strong>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Button
                      onClick={downloadTemplate}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      1. Download CSV Template
                    </Button>
                    <p className="text-xs text-gray-600 mt-1">Open this in Excel first</p>
                  </div>
                  
                  <div>
                    <Button
                      onClick={downloadDropdownValues}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      2. Download Dropdown Values
                    </Button>
                    <p className="text-xs text-gray-600 mt-1">Copy-paste these in Excel</p>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-500">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription>
                    <strong>Quick Setup:</strong><br/>
                    1. Download both files above<br/>
                    2. Open CSV in Excel<br/>
                    3. Open dropdown values file<br/>
                    4. For each column: Select cells → Data → Data Validation → List → Copy-paste values<br/>
                    5. Save as .xlsx file<br/>
                    6. Share with team - Done! 🎉
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-white rounded-lg border-2 border-dashed border-blue-300">
                  <h4 className="font-semibold text-gray-900 mb-2">📹 Video Tutorial (If Needed):</h4>
                  <p className="text-sm text-gray-600 mb-2">Search YouTube: "How to add dropdown in Excel data validation"</p>
                  <p className="text-xs text-gray-500">It's super easy - takes literally 5 minutes to setup once!</p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="flex-1 p-2 border rounded-lg"
                  />
                  <Button
                    onClick={handleExcelUpload}
                    disabled={!selectedFile || uploading}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end mt-6">
              <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-gradient-to-r from-green-500 to-emerald-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Single Transaction (Alternative)
              </Button>
            </div>

            {/* Add Transaction Form */}
            {showAddForm && (
              <Card className="border-none shadow-xl bg-white mt-6">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <CardTitle>Add New Transaction</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Customer Type Alert */}
                  <Alert className="bg-blue-50 border-blue-500">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription>
                      <strong>📋 Select "New Customer"</strong> and system will auto-generate Registration Number like <code className="bg-blue-100 px-2 py-1 rounded">HFS-20241108-001</code>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Vertical *</Label>
                      <Select
                        value={formData.vertical}
                        onValueChange={(value) => setFormData({...formData, vertical: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HFS">HFS</SelectItem>
                          <SelectItem value="HFI">HFI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Transaction Date *</Label>
                      <Input
                        type="date"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Client Name *</Label>
                      <Input
                        value={formData.client_name || ''}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        placeholder="Full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="9876543210"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="client@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Lead Source</Label>
                      <Input
                        value={formData.lead_source || ''}
                        onChange={(e) => setFormData({...formData, lead_source: e.target.value})}
                        placeholder="ScaleX, Facebook, Referral, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Programme Type *</Label>
                      <Select
                        value={formData.programme_type}
                        onValueChange={(value) => setFormData({...formData, programme_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select programme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="FOP">FOP (Foundation of Prosperity)</SelectItem>
                          <SelectItem value="MOP">MOP (Mastery of Prosperity)</SelectItem>
                          <SelectItem value="Workshop">Workshop (Specify Below)</SelectItem>
                          <SelectItem value="Affiliate Income">Affiliate Income (Specify Below)</SelectItem>
                          <SelectItem value="University Fee (Separate)">University Fee (Separate)</SelectItem>
                          <SelectItem value="Retreat Fee">Retreat Fee</SelectItem>
                          <SelectItem value="Others">Others (Specify Below)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {needsExtraField && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>
                          {formData.programme_type === 'Workshop' && 'Workshop Name *'}
                          {formData.programme_type === 'Affiliate Income' && 'Affiliate Source *'}
                          {formData.programme_type === 'Others' && 'Specify *'}
                        </Label>
                        <Input
                          value={formData.programme_details || ''}
                          onChange={(e) => setFormData({...formData, programme_details: e.target.value})}
                          placeholder="Enter details..."
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Customer Type</Label>
                      <Select
                        value={formData.customer_type}
                        onValueChange={(value) => setFormData({...formData, customer_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New Customer">New Customer</SelectItem>
                          <SelectItem value="Upgrade">Upgrade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.customer_type === 'Upgrade' && (
                      <div className="space-y-2">
                        <Label>Previous Programme</Label>
                        <Select
                          value={formData.previous_programme}
                          onValueChange={(value) => setFormData({...formData, previous_programme: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None (New Customer)">None (New Customer)</SelectItem>
                            <SelectItem value="Silver">Silver</SelectItem>
                            <SelectItem value="Gold">Gold</SelectItem>
                            <SelectItem value="Diploma">Diploma</SelectItem>
                            <SelectItem value="FOP">FOP</SelectItem>
                            <SelectItem value="MOP">MOP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Payment Type</Label>
                      <Select
                        value={formData.payment_type}
                        onValueChange={(value) => setFormData({...formData, payment_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full Payment">Full Payment</SelectItem>
                          <SelectItem value="1st Installment">1st Installment</SelectItem>
                          <SelectItem value="2nd Installment">2nd Installment</SelectItem>
                          <SelectItem value="3rd Installment">3rd Installment</SelectItem>
                          <SelectItem value="4th Installment">4th Installment</SelectItem>
                          <SelectItem value="Final Installment">Final Installment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Total Programme Fee</Label>
                      <Input
                        type="number"
                        value={formData.total_programme_fee || ''}
                        onChange={(e) => setFormData({...formData, total_programme_fee: parseFloat(e.target.value)})}
                        placeholder="50000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Amount Received *</Label>
                      <Input
                        type="number"
                        value={formData.amount_received || ''}
                        onChange={(e) => setFormData({...formData, amount_received: parseFloat(e.target.value)})}
                        placeholder="15000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>University Fee (if any)</Label>
                      <Input
                        type="number"
                        value={formData.university_fee || 0}
                        onChange={(e) => setFormData({...formData, university_fee: parseFloat(e.target.value) || 0})}
                        placeholder="2000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Receiving Mode *</Label>
                      <Select
                        value={formData.payment_mode}
                        onValueChange={(value) => setFormData({...formData, payment_mode: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HFICICI">HFICICI</SelectItem>
                          <SelectItem value="HFIIDFC">HFIIDFC</SelectItem>
                          <SelectItem value="RZPHFI">RZPHFI</SelectItem>
                          <SelectItem value="SKMGPAY">SKMGPAY</SelectItem>
                          <SelectItem value="CASH">CASH</SelectItem>
                          <SelectItem value="TAGMANGO">TAGMANGO</SelectItem>
                          <SelectItem value="HFSPAYTM">HFSPAYTM</SelectItem>
                          <SelectItem value="HFSICICI">HFSICICI</SelectItem>
                          <SelectItem value="HFSIDFC">HFSIDFC</SelectItem>
                          <SelectItem value="RZPHFS">RZPHFS</SelectItem>
                          <SelectItem value="Credit Card">Credit Card (Specify Below)</SelectItem>
                          <SelectItem value="Others">Others (Specify Below)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {needsPaymentModeOther && (
                      <div className="space-y-2">
                        <Label>Specify Payment Mode *</Label>
                        <Input
                          value={formData.payment_mode_other || ''}
                          onChange={(e) => setFormData({...formData, payment_mode_other: e.target.value})}
                          placeholder="Enter payment mode..."
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Next Installment Date</Label>
                      <Input
                        type="date"
                        value={formData.next_installment_date || ''}
                        onChange={(e) => setFormData({...formData, next_installment_date: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                        placeholder="INV-001"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label>Transaction Notes</Label>
                      <Textarea
                        value={formData.transaction_notes || ''}
                        onChange={(e) => setFormData({...formData, transaction_notes: e.target.value})}
                        placeholder="Any additional notes..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {formData.customer_type === 'New Customer' && formData.vertical && formData.transaction_date && (
                    <Alert className="bg-green-50 border-green-500">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription>
                        <strong>🆔 Registration Number will be auto-generated:</strong><br/>
                        Format: <code className="bg-green-100 px-2 py-1 rounded">{formData.vertical}-{format(new Date(formData.transaction_date), 'yyyyMMdd')}-XXX</code>
                      </AlertDescription>
                    </Alert>
                  )}

                  {formData.amount_received && (
                    <Alert className="bg-green-50 border-green-500">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription>
                        <strong>Auto-Calculations Preview:</strong><br/>
                        Amount to Company: ₹{Math.round(formData.amount_received - (formData.university_fee || 0))}<br/>
                        Value without GST: ₹{Math.round((formData.amount_received - (formData.university_fee || 0)) / 1.18)}<br/>
                        GST (18%): ₹{Math.round((formData.amount_received - (formData.university_fee || 0)) - ((formData.amount_received - (formData.university_fee || 0)) / 1.18))}<br/>
                        Balance Due: ₹{Math.round((formData.total_programme_fee || 0) - formData.amount_received)}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleIncomeSubmit}
                      disabled={createIncomeMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      {createIncomeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save Transaction
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters & Reports */}
            <Card className="border-none shadow-lg mt-6">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Advanced Filters & Reports
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={downloadTemplate}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <Button variant="secondary" onClick={exportData}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vertical</Label>
                    <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Verticals</SelectItem>
                        <SelectItem value="HFS">HFS</SelectItem>
                        <SelectItem value="HFI">HFI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Programme</Label>
                    <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programmes</SelectItem>
                        {uniqueProgrammes.map(prog => (
                          <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lead Source</Label>
                    <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {uniqueSources.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer Type</Label>
                    <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="New Customer">New Customer</SelectItem>
                        <SelectItem value="Upgrade">Upgrade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-500 mb-4">
                  <AlertDescription>
                    <strong>Filtered Results:</strong> {filteredTransactions.length} transactions |
                    Revenue: ₹{(filteredTransactions.reduce((sum, t) => sum + t.amount_received, 0) / 1000).toFixed(0)}K |
                    GST: ₹{(filteredTransactions.reduce((sum, t) => sum + (t.gst_amount || 0), 0) / 1000).toFixed(0)}K
                  </AlertDescription>
                </Alert>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Reg No.</th>
                        <th className="p-3 text-left text-sm font-semibold">Date</th>
                        <th className="p-3 text-left text-sm font-semibold">Vertical</th>
                        <th className="p-3 text-left text-sm font-semibold">Client</th>
                        <th className="p-3 text-left text-sm font-semibold">Programme</th>
                        <th className="p-3 text-left text-sm font-semibold">Type</th>
                        <th className="p-3 text-left text-sm font-semibold">Payment</th>
                        <th className="p-3 text-right text-sm font-semibold">Received</th>
                        <th className="p-3 text-right text-sm font-semibold">To Company</th>
                        <th className="p-3 text-right text-sm font-semibold">GST</th>
                        <th className="p-3 text-right text-sm font-semibold">Balance</th>
                        <th className="p-3 text-left text-sm font-semibold">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            {transaction.registration_number ? (
                              <Badge className="bg-indigo-100 text-indigo-700 font-mono text-xs">
                                {transaction.registration_number}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">{transaction.transaction_date}</td>
                          <td className="p-3">
                            <Badge className={transaction.vertical === 'HFS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                              {transaction.vertical}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{transaction.client_name}</div>
                            {transaction.lead_source && (
                              <div className="text-xs text-gray-600">{transaction.lead_source}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-purple-100 text-purple-700">{transaction.programme_type}</Badge>
                            {transaction.programme_details && (
                              <div className="text-xs text-gray-600 mt-1">{transaction.programme_details}</div>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            {transaction.customer_type === 'Upgrade' && transaction.previous_programme && (
                              <Badge className="bg-orange-100 text-orange-700">
                                {transaction.previous_programme} → Upgrade
                              </Badge>
                            )}
                            {transaction.customer_type === 'New Customer' && (
                              <Badge className="bg-green-100 text-green-700">New</Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm">{transaction.payment_type}</td>
                          <td className="p-3 text-right font-semibold">₹{transaction.amount_received?.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold text-green-600">₹{transaction.amount_to_company?.toLocaleString()}</td>
                          <td className="p-3 text-right text-sm">₹{transaction.gst_amount?.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            {transaction.balance_due > 0 ? (
                              <Badge className="bg-red-100 text-red-700">₹{transaction.balance_due?.toLocaleString()}</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700">Paid</Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <Badge variant="outline">
                              {transaction.payment_mode === 'Others' && transaction.payment_mode_other
                                ? transaction.payment_mode_other
                                : transaction.payment_mode || '-'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXPENSES TAB */}
          <TabsContent value="expenses">
            <div className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle>Business Expenses</CardTitle>
                    <Button variant="secondary" onClick={() => setShowExpenseForm(!showExpenseForm)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Add Expense Form */}
              {showExpenseForm && (
                <Card className="border-none shadow-xl mt-6">
                  <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    <CardTitle>Add New Expense</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Vertical *</Label>
                        <Select
                          value={expenseData.vertical}
                          onValueChange={(value) => setExpenseData({...expenseData, vertical: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HFS">HFS</SelectItem>
                            <SelectItem value="HFI">HFI</SelectItem>
                            <SelectItem value="Common">Common (Shared)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Expense Date *</Label>
                        <Input
                          type="date"
                          value={expenseData.expense_date}
                          onChange={(e) => setExpenseData({...expenseData, expense_date: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select
                          value={expenseData.expense_category}
                          onValueChange={(value) => setExpenseData({...expenseData, expense_category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Salary">Salary</SelectItem>
                            <SelectItem value="Tools/Vendors">Tools/Vendors</SelectItem>
                            <SelectItem value="Learning">Learning</SelectItem>
                            <SelectItem value="FB Ads">FB Ads</SelectItem>
                            <SelectItem value="Google Ads">Google Ads</SelectItem>
                            <SelectItem value="Office Rent">Office Rent</SelectItem>
                            <SelectItem value="Utilities">Utilities</SelectItem>
                            <SelectItem value="Travel">Travel</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {needsAdAccount && (
                        <div className="space-y-2">
                          <Label>Ad Account Name *</Label>
                          <Input
                            value={expenseData.ad_account_name || ''}
                            onChange={(e) => setExpenseData({...expenseData, ad_account_name: e.target.value})}
                            placeholder="Enter ad account name"
                          />
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label>Description *</Label>
                        <Input
                          value={expenseData.expense_description || ''}
                          onChange={(e) => setExpenseData({...expenseData, expense_description: e.target.value})}
                          placeholder="Brief description of expense"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Amount *</Label>
                        <Input
                          type="number"
                          value={expenseData.amount || ''}
                          onChange={(e) => setExpenseData({...expenseData, amount: parseFloat(e.target.value)})}
                          placeholder="10000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Paid Via *</Label>
                        <Select
                          value={expenseData.paid_via}
                          onValueChange={(value) => setExpenseData({...expenseData, paid_via: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HFICICI">HFICICI</SelectItem>
                            <SelectItem value="HFIIDFC">HFIIDFC</SelectItem>
                            <SelectItem value="RZPHFI">RZPHFI</SelectItem>
                            <SelectItem value="SKMGPAY">SKMGPAY</SelectItem>
                            <SelectItem value="CASH">CASH</SelectItem>
                            <SelectItem value="TAGMANGO">TAGMANGO</SelectItem>
                            <SelectItem value="HFSPAYTM">HFSPAYTM</SelectItem>
                            <SelectItem value="HFSICICI">HFSICICI</SelectItem>
                            <SelectItem value="HFSIDFC">HFSIDFC</SelectItem>
                            <SelectItem value="RZPHFS">RZPHFS</SelectItem>
                            <SelectItem value="Credit Card">Credit Card (Specify Below)</SelectItem>
                            <SelectItem value="Others">Others (Specify Below)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {needsCCDetails && (
                        <div className="space-y-2">
                          <Label>Credit Card Details *</Label>
                          <Input
                            value={expenseData.credit_card_details || ''}
                            onChange={(e) => setExpenseData({...expenseData, credit_card_details: e.target.value})}
                            placeholder="e.g., ICICI Platinum xxxx4567"
                          />
                        </div>
                      )}

                      {needsExpensePaidViaOther && (
                        <div className="space-y-2">
                          <Label>Specify Payment Method *</Label>
                          <Input
                            value={expenseData.paid_via_other || ''}
                            onChange={(e) => setExpenseData({...expenseData, paid_via_other: e.target.value})}
                            placeholder="Enter payment method"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Vendor Name</Label>
                        <Input
                          value={expenseData.vendor_name || ''}
                          onChange={(e) => setExpenseData({...expenseData, vendor_name: e.target.value})}
                          placeholder="Vendor or supplier name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Invoice Number</Label>
                        <Input
                          value={expenseData.invoice_number || ''}
                          onChange={(e) => setExpenseData({...expenseData, invoice_number: e.target.value})}
                          placeholder="INV-001"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <Label>Notes</Label>
                        <Textarea
                          value={expenseData.notes || ''}
                          onChange={(e) => setExpenseData({...expenseData, notes: e.target.value})}
                          placeholder="Additional notes..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowExpenseForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleExpenseSubmit}
                        disabled={createExpenseMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-red-500 to-orange-500"
                      >
                        {createExpenseMutation.isPending ? 'Saving...' : 'Save Expense'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Expense Filters */}
              <Card className="border-none shadow-lg mt-6">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Expense Filters
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label>Date From</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date To</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vertical</Label>
                      <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Verticals</SelectItem>
                          <SelectItem value="HFS">HFS</SelectItem>
                          <SelectItem value="HFI">HFI</SelectItem>
                          <SelectItem value="Common">Common</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Alert className="bg-blue-50 border-blue-500 mb-4">
                    <AlertDescription>
                      <strong>Filtered Results:</strong> {filteredExpenses.length} expenses |
                      Total Amount: ₹{(filteredExpenses.reduce((sum, e) => sum + e.amount, 0) / 1000).toFixed(0)}K
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Expenses Table */}
              <Card className="border-none shadow-lg mt-6">
                <CardHeader>
                  <CardTitle>All Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-3 text-left text-sm font-semibold">Date</th>
                          <th className="p-3 text-left text-sm font-semibold">Vertical</th>
                          <th className="p-3 text-left text-sm font-semibold">Category</th>
                          <th className="p-3 text-left text-sm font-semibold">Description</th>
                          <th className="p-3 text-right text-sm font-semibold">Amount</th>
                          <th className="p-3 text-left text-sm font-semibold">Paid Via</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">{expense.expense_date}</td>
                            <td className="p-3">
                              <Badge className={
                                expense.vertical === 'HFS' ? 'bg-blue-100 text-blue-700' :
                                expense.vertical === 'HFI' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }>
                                {expense.vertical}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{expense.expense_category}</Badge>
                              {expense.ad_account_name && (
                                <div className="text-xs text-gray-600 mt-1">{expense.ad_account_name}</div>
                              )}
                            </td>
                            <td className="p-3 text-sm">{expense.expense_description}</td>
                            <td className="p-3 text-right font-semibold text-red-600">₹{expense.amount?.toLocaleString()}</td>
                            <td className="p-3 text-sm">
                              {expense.paid_via === 'Credit Card' ? (
                                <div>
                                  <Badge className="bg-purple-100 text-purple-700">CC</Badge>
                                  {expense.credit_card_details && (
                                    <div className="text-xs text-gray-600 mt-1">{expense.credit_card_details}</div>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="outline">{expense.paid_via === 'Others' ? expense.paid_via_other : expense.paid_via}</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CREDIT CARD TAB */}
          <TabsContent value="credit-cards">
            <div className="space-y-6">
              {/* CC Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">Total CC Expenses</p>
                    <p className="text-3xl font-bold text-purple-600">₹{(ccExpenses / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">Total CC Payments</p>
                    <p className="text-3xl font-bold text-green-600">₹{(ccPaymentsTotal / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">Outstanding CC Due</p>
                    <p className="text-3xl font-bold text-red-600">₹{(ccDue / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none shadow-lg mt-6">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle>Credit Card Payment Tracking</CardTitle>
                    <Button variant="secondary" onClick={() => setShowCCPaymentForm(!showCCPaymentForm)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add CC Payment
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Add CC Payment Form */}
              {showCCPaymentForm && (
                <Card className="border-none shadow-xl mt-6">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle>Record Credit Card Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Card Name *</Label>
                        <Input
                          value={ccPaymentData.card_name || ''}
                          onChange={(e) => setCCPaymentData({...ccPaymentData, card_name: e.target.value})}
                          placeholder="e.g., ICICI Platinum"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Date *</Label>
                        <Input
                          type="date"
                          value={ccPaymentData.payment_date}
                          onChange={(e) => setCCPaymentData({...ccPaymentData, payment_date: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Amount Paid *</Label>
                        <Input
                          type="number"
                          value={ccPaymentData.amount_paid || ''}
                          onChange={(e) => setCCPaymentData({...ccPaymentData, amount_paid: parseFloat(e.target.value)})}
                          placeholder="50000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Paid From *</Label>
                        <Select
                          value={ccPaymentData.paid_from}
                          onValueChange={(value) => setCCPaymentData({...ccPaymentData, paid_from: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HFICICI">HFICICI</SelectItem>
                            <SelectItem value="HFIIDFC">HFIIDFC</SelectItem>
                            <SelectItem value="HFSICICI">HFSICICI</SelectItem>
                            <SelectItem value="HFSIDFC">HFSIDFC</SelectItem>
                            <SelectItem value="CASH">CASH</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {needsCCPaidFromOther && (
                        <div className="space-y-2">
                          <Label>Specify Account *</Label>
                          <Input
                            value={ccPaymentData.paid_from_other || ''}
                            onChange={(e) => setCCPaymentData({...ccPaymentData, paid_from_other: e.target.value})}
                            placeholder="Enter account name"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Payment Type</Label>
                        <Select
                          value={ccPaymentData.payment_type}
                          onValueChange={(value) => setCCPaymentData({...ccPaymentData, payment_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Minimum Due">Minimum Due</SelectItem>
                            <SelectItem value="Total Due">Total Due</SelectItem>
                            <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                            <SelectItem value="Full Statement">Full Statement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Statement Month</Label>
                        <Input
                          value={ccPaymentData.statement_month || ''}
                          onChange={(e) => setCCPaymentData({...ccPaymentData, statement_month: e.target.value})}
                          placeholder="e.g., Nov 2024"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <Label>Notes</Label>
                        <Textarea
                          value={ccPaymentData.notes || ''}
                          onChange={(e) => setCCPaymentData({...ccPaymentData, notes: e.target.value})}
                          placeholder="Additional notes..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowCCPaymentForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCCPaymentSubmit}
                        disabled={createCCPaymentMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                      >
                        {createCCPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CC Payments Table */}
              <Card className="border-none shadow-lg mt-6">
                <CardHeader>
                  <CardTitle>Credit Card Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-3 text-left text-sm font-semibold">Date</th>
                          <th className="p-3 text-left text-sm font-semibold">Card</th>
                          <th className="p-3 text-right text-sm font-semibold">Amount</th>
                          <th className="p-3 text-left text-sm font-semibold">Paid From</th>
                          <th className="p-3 text-left text-sm font-semibold">Type</th>
                          <th className="p-3 text-left text-sm font-semibold">Statement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ccPayments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">{payment.payment_date}</td>
                            <td className="p-3 font-semibold">{payment.card_name}</td>
                            <td className="p-3 text-right font-semibold text-green-600">₹{payment.amount_paid?.toLocaleString()}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline">{payment.paid_from === 'Others' ? payment.paid_from_other : payment.paid_from}</Badge>
                            </td>
                            <td className="p-3 text-sm">{payment.payment_type}</td>
                            <td className="p-3 text-sm">{payment.statement_month || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}