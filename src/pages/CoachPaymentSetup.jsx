import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CheckCircle, AlertCircle, Lock, Shield } from "lucide-react";

export default function CoachPaymentSetup() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    gateway_type: "razorpay",
    razorpay_key_id: "",
    razorpay_key_secret: "",
    is_active: true
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ['myCoachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user.user_type === 'student_coach',
  });

  const { data: subscriptionPlan } = useQuery({
    queryKey: ['coachPlanDetails', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plan = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plan[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const { data: paymentGateway } = useQuery({
    queryKey: ['myPaymentGateway', user?.email],
    queryFn: async () => {
      const gateways = await base44.entities.CoachPaymentGateway.filter({ coach_email: user?.email });
      return gateways[0] || null;
    },
    enabled: !!user,
  });

  React.useEffect(() => {
    if (paymentGateway) {
      setFormData({
        gateway_type: paymentGateway.gateway_type,
        razorpay_key_id: paymentGateway.razorpay_key_id || "",
        razorpay_key_secret: "",
        is_active: paymentGateway.is_active
      });
    }
  }, [paymentGateway]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (paymentGateway) {
        return await base44.entities.CoachPaymentGateway.update(paymentGateway.id, data);
      } else {
        return await base44.entities.CoachPaymentGateway.create({
          ...data,
          coach_email: user?.email,
          setup_completed: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myPaymentGateway']);
      alert('✅ Payment gateway configuration saved!');
    },
  });

  const handleSubmit = () => {
    if (formData.gateway_type === 'razorpay' && (!formData.razorpay_key_id || !formData.razorpay_key_secret)) {
      alert('Please fill in all Razorpay credentials');
      return;
    }

    saveMutation.mutate(formData);
  };

  const canAddPaymentGateway = user?.user_type === 'super_admin' ||
    (user?.user_type === 'student_coach' && subscriptionPlan?.can_add_payment_gateway);

  if (!canAddPaymentGateway) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md border-orange-500 bg-orange-50">
          <Lock className="w-5 h-5 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Upgrade Required:</strong> Your current plan doesn't include custom payment gateway. Please upgrade to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Gateway Setup</h1>
          <p className="text-gray-600">Configure your payment gateway to accept client payments</p>
        </div>

        {paymentGateway?.setup_completed && (
          <Alert className="bg-green-50 border-green-500">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription>
              Payment gateway is configured and active. Clients can now purchase your plans.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Gateway Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Payment Gateway Provider</Label>
              <Select value={formData.gateway_type} onValueChange={(value) => setFormData({ ...formData, gateway_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="stripe" disabled>Stripe (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.gateway_type === 'razorpay' && (
              <>
                <Alert className="bg-blue-50 border-blue-500">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <AlertDescription>
                    <strong>How to get Razorpay credentials:</strong><br />
                    1. Create account at <a href="https://razorpay.com" target="_blank" className="underline">razorpay.com</a><br />
                    2. Go to Settings → API Keys<br />
                    3. Generate new API keys and copy them here
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Razorpay Key ID</Label>
                  <Input
                    value={formData.razorpay_key_id}
                    onChange={(e) => setFormData({ ...formData, razorpay_key_id: e.target.value })}
                    placeholder="rzp_live_xxxxxxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Razorpay Key Secret</Label>
                  <Input
                    type="password"
                    value={formData.razorpay_key_secret}
                    onChange={(e) => setFormData({ ...formData, razorpay_key_secret: e.target.value })}
                    placeholder="Enter your secret key"
                  />
                  <p className="text-xs text-gray-600">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Your credentials are encrypted and stored securely
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <Label>Gateway Active</Label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="w-full bg-purple-600 hover:bg-purple-700">
              {saveMutation.isPending ? 'Saving...' : paymentGateway ? 'Update Configuration' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="text-xl">⚡ Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>✅ Configure your payment gateway credentials (above)</p>
            <p>✅ Create client plans in the Client Plans section</p>
            <p>✅ Share your plan page link with clients</p>
            <p>✅ Start accepting payments automatically!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}