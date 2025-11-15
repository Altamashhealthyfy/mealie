import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, Save, Lock, CheckCircle2, DollarSign, Building2, Info } from "lucide-react";

export default function PaymentGatewaySettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    razorpay_enabled: false,
    razorpay_key_id: "",
    razorpay_key_secret: "",
    upi_id: "",
    bank_account: {
      account_holder: "",
      account_number: "",
      ifsc_code: "",
      bank_name: ""
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
  });

  useEffect(() => {
    if (user?.payment_gateway_config) {
      setFormData({
        razorpay_enabled: user.payment_gateway_config.razorpay_enabled || false,
        razorpay_key_id: user.payment_gateway_config.razorpay_key_id || "",
        razorpay_key_secret: user.payment_gateway_config.razorpay_key_secret || "",
        upi_id: user.payment_gateway_config.upi_id || "",
        bank_account: user.payment_gateway_config.bank_account || {
          account_holder: "",
          account_number: "",
          ifsc_code: "",
          bank_name: ""
        }
      });
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe({
        payment_gateway_config: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      alert("✅ Payment gateway settings saved successfully!");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const canManagePaymentGateway = () => {
    if (user?.user_type === 'super_admin') {
      return securitySettings?.super_admin_permissions?.can_manage_payment_gateway ?? true;
    }
    if (user?.user_type === 'team_member') {
      return securitySettings?.team_member_permissions?.can_manage_payment_gateway ?? true;
    }
    if (user?.user_type === 'student_coach') {
      return securitySettings?.student_coach_permissions?.can_manage_payment_gateway ?? true;
    }
    return false;
  };

  if (!canManagePaymentGateway()) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              You don't have permission to manage payment gateway settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Gateway Settings</h1>
            <p className="text-gray-600">Configure how you receive payments from your clients</p>
          </div>
          <DollarSign className="w-10 h-10 text-green-500" />
        </div>

        <Alert className="bg-blue-50 border-blue-500">
          <Info className="w-5 h-5 text-blue-600" />
          <AlertTitle className="text-blue-900 font-bold">Important Information</AlertTitle>
          <AlertDescription className="text-blue-800">
            Configure your payment gateway to receive payments when clients upgrade their plans. All payments will come directly to your configured account.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Razorpay Configuration */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    Razorpay Integration
                  </CardTitle>
                  <CardDescription>Accept online payments via Razorpay</CardDescription>
                </div>
                <Switch
                  checked={formData.razorpay_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, razorpay_enabled: checked})}
                />
              </div>
            </CardHeader>
            {formData.razorpay_enabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Razorpay Key ID *</Label>
                  <Input
                    value={formData.razorpay_key_id}
                    onChange={(e) => setFormData({...formData, razorpay_key_id: e.target.value})}
                    placeholder="rzp_live_xxxxxxxxxxxxx"
                    required={formData.razorpay_enabled}
                  />
                  <p className="text-xs text-gray-500">Get from Razorpay Dashboard → Settings → API Keys</p>
                </div>
                <div className="space-y-2">
                  <Label>Razorpay Key Secret *</Label>
                  <Input
                    type="password"
                    value={formData.razorpay_key_secret}
                    onChange={(e) => setFormData({...formData, razorpay_key_secret: e.target.value})}
                    placeholder="Enter your secret key"
                    required={formData.razorpay_enabled}
                  />
                  <p className="text-xs text-gray-500">⚠️ Keep this secret and never share it</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* UPI Configuration */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                UPI Details
              </CardTitle>
              <CardDescription>For direct UPI payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input
                  value={formData.upi_id}
                  onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                  placeholder="yourname@upi"
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Configuration */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                Bank Account Details
              </CardTitle>
              <CardDescription>For bank transfer payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    value={formData.bank_account.account_holder}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_account: {...formData.bank_account, account_holder: e.target.value}
                    })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={formData.bank_account.account_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_account: {...formData.bank_account, account_number: e.target.value}
                    })}
                    placeholder="1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={formData.bank_account.ifsc_code}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_account: {...formData.bank_account, ifsc_code: e.target.value}
                    })}
                    placeholder="SBIN0001234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_account.bank_name}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_account: {...formData.bank_account, bank_name: e.target.value}
                    })}
                    placeholder="State Bank of India"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
            disabled={saveMutation.isPending}
          >
            <Save className="w-5 h-5 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Payment Settings'}
          </Button>
        </form>

        {formData.razorpay_enabled && formData.razorpay_key_id && (
          <Alert className="bg-green-50 border-green-500">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <AlertTitle className="text-green-900 font-bold">✅ Payment Gateway Active</AlertTitle>
            <AlertDescription className="text-green-800">
              Your Razorpay account is configured. Clients can now upgrade their plans and payments will come to your account.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}