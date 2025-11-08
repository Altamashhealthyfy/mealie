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
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

export default function ClientFinanceManager() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    customer_type: 'New Customer',
    payment_type: 'Full Payment',
    university_fee: 0,
  });

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('all');
  const [leadSourceFilter, setLeadSourceFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');

  const { data: transactions } = useQuery({
    queryKey: ['clientTransactions'],
    queryFn: () => base44.entities.ClientTransaction.list('-transaction_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Auto-calculate fields
      const amountToCompany = data.amount_received - (data.university_fee || 0);
      const valueWithoutGst = amountToCompany / 1.18;
      const gstAmount = amountToCompany - valueWithoutGst;
      const balanceDue = (data.total_programme_fee || 0) - data.amount_received;

      return base44.entities.ClientTransaction.create({
        ...data,
        amount_to_company: Math.round(amountToCompany),
        value_without_gst: Math.round(valueWithoutGst),
        gst_amount: Math.round(gstAmount),
        balance_due: Math.round(balanceDue),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientTransactions']);
      setShowAddForm(false);
      setFormData({
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        customer_type: 'New Customer',
        payment_type: 'Full Payment',
        university_fee: 0,
      });
      alert("✅ Transaction added successfully!");
    },
  });

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
                next_installment_date: { type: "string" },
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
        
        for (const record of records) {
          const amountToCompany = record.amount_received - (record.university_fee || 0);
          const valueWithoutGst = amountToCompany / 1.18;
          const gstAmount = amountToCompany - valueWithoutGst;
          const balanceDue = (record.total_programme_fee || 0) - record.amount_received;

          await base44.entities.ClientTransaction.create({
            ...record,
            amount_to_company: Math.round(amountToCompany),
            value_without_gst: Math.round(valueWithoutGst),
            gst_amount: Math.round(gstAmount),
            balance_due: Math.round(balanceDue),
          });
        }

        queryClient.invalidateQueries(['clientTransactions']);
        alert(`✅ Successfully uploaded ${records.length} transactions!`);
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
    const csv = `Transaction Date,Client Name,Phone,Email,Lead Source,Programme Type,Programme Details,Previous Programme,Customer Type,Payment Type,Total Programme Fee,Amount Received,University Fee,Payment Mode,Next Installment Date,Transaction Notes
2024-11-01,Rahul Sharma,9876543210,rahul@email.com,ScaleX Ad Agency,Silver,,None (New Customer),New Customer,Full Payment,50000,50000,0,UPI,,
2024-11-02,Priya Verma,9876543211,priya@email.com,Facebook Ad,Gold,Silver,Upgrade,1st Installment,80000,30000,2000,Bank Transfer,2024-12-02,
2024-11-03,Amit Kumar,9876543212,amit@email.com,Referral,Workshop,Instagram Marketing Workshop,None (New Customer),New Customer,Full Payment,5000,5000,0,Cash,,`;

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

  const exportData = () => {
    let filtered = transactions;

    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.transaction_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.transaction_date) <= new Date(dateTo));
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

    const csv = `Date,Client,Phone,Lead Source,Programme,Details,Previous,Type,Payment Type,Total Fee,Received,Univ Fee,To Company,Value (No GST),GST,Balance,Mode\n${
      filtered.map(t => 
        `${t.transaction_date},${t.client_name},${t.phone || ''},${t.lead_source || ''},${t.programme_type},${t.programme_details || ''},${t.previous_programme || ''},${t.customer_type},${t.payment_type},${t.total_programme_fee || 0},${t.amount_received},${t.university_fee || 0},${t.amount_to_company},${t.value_without_gst},${t.gst_amount},${t.balance_due || 0},${t.payment_mode || ''}`
      ).join('\n')
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

  const handleSubmit = () => {
    if (!formData.client_name || !formData.programme_type || !formData.amount_received) {
      alert("Please fill required fields: Client Name, Programme Type, Amount Received");
      return;
    }

    createMutation.mutate(formData);
  };

  // Calculate statistics
  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount_received, 0);
  const totalGST = transactions.reduce((sum, t) => sum + (t.gst_amount || 0), 0);
  const totalBalanceDue = transactions.reduce((sum, t) => sum + (t.balance_due || 0), 0);
  const uniqueClients = new Set(transactions.map(t => t.client_name)).size;

  // Filter transactions
  let filteredTransactions = transactions;
  if (dateFrom) {
    filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) >= new Date(dateFrom));
  }
  if (dateTo) {
    filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) <= new Date(dateTo));
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

  // Get unique values for filters
  const uniqueProgrammes = [...new Set(transactions.map(t => t.programme_type))];
  const uniqueSources = [...new Set(transactions.map(t => t.lead_source).filter(Boolean))];

  // Check if programme needs extra field
  const needsExtraField = ['Workshop', 'Affiliate Income', 'Others'].includes(formData.programme_type);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Finance Manager</h1>
            <p className="text-gray-600">Complete income, expense & client tracking system</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-gradient-to-r from-green-500 to-emerald-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total GST</p>
                  <p className="text-3xl font-bold text-green-600">₹{(totalGST / 1000).toFixed(0)}K</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Balance Due</p>
                  <p className="text-3xl font-bold text-orange-600">₹{(totalBalanceDue / 1000).toFixed(0)}K</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-purple-600">{uniqueClients}</p>
                </div>
                <Users className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Excel Upload */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Bulk Upload from Excel/CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Download the template first, fill it with your data, then upload here. All calculations (GST, Balance) will be automatic!
              </AlertDescription>
            </Alert>
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

        {/* Add Transaction Form */}
        {showAddForm && (
          <Card className="border-none shadow-xl bg-white">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle>Add New Transaction</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label>Payment Mode</Label>
                  <Select
                    value={formData.payment_mode}
                    onValueChange={(value) => setFormData({...formData, payment_mode: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Debit Card">Debit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {createMutation.isPending ? (
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
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Filters & Reports
              </CardTitle>
              <Button variant="secondary" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                    <th className="p-3 text-left text-sm font-semibold">Date</th>
                    <th className="p-3 text-left text-sm font-semibold">Client</th>
                    <th className="p-3 text-left text-sm font-semibold">Programme</th>
                    <th className="p-3 text-left text-sm font-semibold">Type</th>
                    <th className="p-3 text-left text-sm font-semibold">Payment</th>
                    <th className="p-3 text-right text-sm font-semibold">Received</th>
                    <th className="p-3 text-right text-sm font-semibold">Univ Fee</th>
                    <th className="p-3 text-right text-sm font-semibold">To Company</th>
                    <th className="p-3 text-right text-sm font-semibold">GST</th>
                    <th className="p-3 text-right text-sm font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{transaction.transaction_date}</td>
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
                      <td className="p-3 text-right text-sm">₹{transaction.university_fee?.toLocaleString() || 0}</td>
                      <td className="p-3 text-right font-semibold text-green-600">₹{transaction.amount_to_company?.toLocaleString()}</td>
                      <td className="p-3 text-right text-sm">₹{transaction.gst_amount?.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        {transaction.balance_due > 0 ? (
                          <Badge className="bg-red-100 text-red-700">₹{transaction.balance_due?.toLocaleString()}</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">Paid</Badge>
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
    </div>
  );
}