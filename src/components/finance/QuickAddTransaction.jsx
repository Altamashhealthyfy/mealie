import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function QuickAddTransaction({ onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    vertical: 'HFS',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    customer_type: 'New Customer',
    payment_type: 'Full Payment',
    university_fee: 0,
  });

  const [installmentCount, setInstallmentCount] = useState(null);
  const [installments, setInstallments] = useState([]);

  const needsExtraField = ['Workshop', 'Affiliate Income', 'Others'].includes(formData.programme_type);
  const needsPaymentModeOther = formData.payment_mode === 'Others';
  const needsPreviousProgramme = formData.customer_type === 'Upgrade';
  const isBookingAmount = formData.payment_type === 'Booking Amount';

  const handlePaymentTypeChange = (value) => {
    setFormData({...formData, payment_type: value});
    if (value !== 'Booking Amount') {
      setInstallmentCount(null);
      setInstallments([]);
    }
  };

  const handleInstallmentCountChange = (count) => {
    setInstallmentCount(count);
    // Initialize installment array
    const newInstallments = Array(count).fill(null).map((_, index) => ({
      installment_number: index + 1,
      due_date: '',
      amount: 0
    }));
    setInstallments(newInstallments);
  };

  const updateInstallment = (index, field, value) => {
    const updated = [...installments];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? parseFloat(value) || 0 : value
    };
    setInstallments(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
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
    if (needsPreviousProgramme && !formData.previous_programme) {
      alert("Please select Previous Programme");
      return;
    }

    // Validate installments if booking amount
    if (isBookingAmount && installmentCount) {
      const allFilled = installments.every(inst => inst.due_date && inst.amount > 0);
      if (!allFilled) {
        alert("Please fill all installment dates and amounts");
        return;
      }
    }

    // Prepare submission data
    const submissionData = {
      ...formData,
      installments: isBookingAmount ? installments : null,
      installment_count: isBookingAmount ? installmentCount : null
    };

    onSubmit(submissionData);
  };

  // Calculate total installment amount
  const totalInstallmentAmount = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
  const grandTotal = (formData.amount_received || 0) + totalInstallmentAmount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
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
        </div>
      </div>

      {/* Section 2: Programme Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Programme Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <SelectItem value="Diamond">Diamond</SelectItem>
                <SelectItem value="FOP">FOP (Foundation of Prosperity)</SelectItem>
                <SelectItem value="MOP">MOP (Mastery of Prosperity)</SelectItem>
                <SelectItem value="One Month Programme">One Month Programme</SelectItem>
                <SelectItem value="3 Month Programme">3 Month Programme</SelectItem>
                <SelectItem value="12 Month Programme">12 Month Programme</SelectItem>
                <SelectItem value="7 Days Detox">7 Days Detox</SelectItem>
                <SelectItem value="Workshop">Workshop (Specify Below)</SelectItem>
                <SelectItem value="Affiliate Income">Affiliate Income (Specify Below)</SelectItem>
                <SelectItem value="University Fee (Separate)">University Fee (Separate)</SelectItem>
                <SelectItem value="Retreat Fee">Retreat Fee</SelectItem>
                <SelectItem value="Others">Others (Specify Below)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsExtraField && (
            <div className="space-y-2">
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
            <Label>Customer Type *</Label>
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

          {needsPreviousProgramme && (
            <div className="space-y-2">
              <Label>Previous Programme *</Label>
              <Select
                value={formData.previous_programme}
                onValueChange={(value) => setFormData({...formData, previous_programme: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Diploma">Diploma</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                  <SelectItem value="FOP">FOP</SelectItem>
                  <SelectItem value="MOP">MOP</SelectItem>
                  <SelectItem value="One Month Programme">One Month Programme</SelectItem>
                  <SelectItem value="3 Month Programme">3 Month Programme</SelectItem>
                  <SelectItem value="12 Month Programme">12 Month Programme</SelectItem>
                  <SelectItem value="7 Days Detox">7 Days Detox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Payment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Payment Type *</Label>
            <Select
              value={formData.payment_type}
              onValueChange={handlePaymentTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full Payment">Full Payment</SelectItem>
                <SelectItem value="Booking Amount">Booking Amount (With Installments)</SelectItem>
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
            <Label>{isBookingAmount ? 'Booking Amount Received *' : 'Amount Received *'}</Label>
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

          {!isBookingAmount && (
            <div className="space-y-2">
              <Label>Next Installment Date</Label>
              <Input
                type="date"
                value={formData.next_installment_date || ''}
                onChange={(e) => setFormData({...formData, next_installment_date: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input
              value={formData.invoice_number || ''}
              onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
              placeholder="INV-001"
            />
          </div>
        </div>

        {/* Installment Details - Only for Booking Amount */}
        {isBookingAmount && (
          <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-purple-900">Installment Details</h4>
            </div>

            <div className="space-y-2">
              <Label>How many further installments? *</Label>
              <Select
                value={installmentCount?.toString() || ''}
                onValueChange={(value) => handleInstallmentCountChange(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select number of installments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Installment</SelectItem>
                  <SelectItem value="2">2 Installments</SelectItem>
                  <SelectItem value="3">3 Installments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {installmentCount && (
              <div className="space-y-4 mt-4">
                <Alert className="bg-blue-50 border-blue-500">
                  <AlertDescription>
                    <strong>📅 Fill details for each installment:</strong> Enter the due date and amount for all {installmentCount} installment{installmentCount > 1 ? 's' : ''}.
                  </AlertDescription>
                </Alert>

                {installments.map((inst, index) => (
                  <div key={index} className="p-4 bg-white rounded-lg border-2 border-purple-200">
                    <h5 className="font-semibold text-gray-900 mb-3">Installment {index + 1}</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Due Date *</Label>
                        <Input
                          type="date"
                          value={inst.due_date}
                          onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount *</Label>
                        <Input
                          type="number"
                          value={inst.amount || ''}
                          onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                          placeholder="20000"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Installment Summary */}
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                  <h5 className="font-semibold text-green-900 mb-2">Payment Summary</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Booking Amount Received:</span>
                      <span className="font-bold">₹{(formData.amount_received || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Future Installments:</span>
                      <span className="font-bold">₹{totalInstallmentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-green-300">
                      <span className="font-bold">Grand Total:</span>
                      <span className="font-bold text-lg text-green-700">₹{grandTotal.toLocaleString()}</span>
                    </div>
                    {formData.total_programme_fee && (
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>Programme Fee:</span>
                        <span>₹{formData.total_programme_fee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Transaction Notes</Label>
          <Textarea
            value={formData.transaction_notes || ''}
            onChange={(e) => setFormData({...formData, transaction_notes: e.target.value})}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>
      </div>

      {/* Auto-calculation Preview */}
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
            Amount to Company: ₹{Math.round(formData.amount_received - (formData.university_fee || 0)).toLocaleString()}<br/>
            Value without GST: ₹{Math.round((formData.amount_received - (formData.university_fee || 0)) / 1.18).toLocaleString()}<br/>
            GST (18%): ₹{Math.round((formData.amount_received - (formData.university_fee || 0)) - ((formData.amount_received - (formData.university_fee || 0)) / 1.18)).toLocaleString()}<br/>
            {isBookingAmount && grandTotal > 0 ? (
              <>Balance Due (After all installments): ₹{Math.round((formData.total_programme_fee || 0) - grandTotal).toLocaleString()}</>
            ) : (
              <>Balance Due: ₹{Math.round((formData.total_programme_fee || 0) - formData.amount_received).toLocaleString()}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 h-12 text-lg"
        >
          {isSubmitting ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Save Transaction
            </>
          )}
        </Button>
      </div>
    </form>
  );
}