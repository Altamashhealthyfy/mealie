import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Crown, CheckCircle2, AlertCircle, Download, FileText,
  Calendar, RefreshCw, TrendingUp, Loader2, ArrowUpCircle, Search, Check
} from "lucide-react";
import { format } from "date-fns";
import CouponInput from "@/components/payments/CouponInput";

// ── Invoice Generator (client-side PDF-like text receipt) ─────────────────────
function generateInvoiceText(sub, isCoach) {
  const lines = [
    "========================================",
    "           INVOICE / RECEIPT            ",
    "========================================",
    `Date       : ${format(new Date(sub.created_date), "dd MMM yyyy")}`,
    `Invoice ID : INV-${sub.id?.slice(-8).toUpperCase()}`,
    "----------------------------------------",
    isCoach
      ? `Customer   : ${sub.coach_name || "Health Coach"}`
      : `Customer   : ${sub.client_name || "Client"}`,
    isCoach
      ? `Email      : ${sub.coach_email}`
      : `Email      : ${sub.client_email}`,
    "----------------------------------------",
    `Plan       : ${sub.plan_name || sub.plan_tier?.toUpperCase() + " Plan"}`,
    `Billing    : ${sub.billing_cycle || "monthly"}`,
    `Amount     : ₹${sub.amount}`,
    `Status     : ${sub.status?.toUpperCase()}`,
    sub.start_date ? `Start Date : ${sub.start_date}` : "",
    sub.end_date ? `End Date   : ${sub.end_date}` : "",
    sub.razorpay_payment_id ? `Payment ID : ${sub.razorpay_payment_id}` : "",
    sub.razorpay_order_id ? `Order ID   : ${sub.razorpay_order_id}` : "",
    "========================================",
    "      Thank you for your subscription!  ",
    "========================================",
  ].filter(Boolean).join("\n");

  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${sub.id?.slice(-8).toUpperCase()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active: "bg-green-100 text-green-800",
    trial: "bg-blue-100 text-blue-800",
    expired: "bg-orange-100 text-orange-800",
    cancelled: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-800",
  };
  return (
    <Badge className={`${map[status] || "bg-gray-100 text-gray-700"} text-xs capitalize`}>
      {status}
    </Badge>
  );
}

// ── Current Plan Card ─────────────────────────────────────────────────────────
function CurrentPlanCard({ subscription, isCoach, onUpgrade }) {
  if (!subscription) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-6 text-center">
          <CreditCard className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">No active subscription</p>
          <p className="text-sm text-gray-500 mt-1">Subscribe to unlock premium features</p>
          <Button className="mt-4 bg-gradient-to-r from-orange-500 to-red-500 text-white" onClick={onUpgrade}>
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isActive = subscription.status === "active" || subscription.status === "trial";
  const daysLeft = subscription.end_date
    ? Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / 86400000))
    : null;

  return (
    <Card className={`border-2 ${isActive ? "border-green-400" : "border-orange-400"}`}>
      <CardHeader className={`${isActive ? "bg-green-50" : "bg-orange-50"} rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className={`w-5 h-5 ${isActive ? "text-green-600" : "text-orange-500"}`} />
            <CardTitle className="text-base">
              {subscription.plan_name || (subscription.plan_tier?.toUpperCase() + " Plan")}
            </CardTitle>
          </div>
          <StatusBadge status={subscription.status} />
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Amount</p>
            <p className="font-bold text-gray-900 text-lg">₹{subscription.amount}</p>
            <p className="text-xs text-gray-500 capitalize">{subscription.billing_cycle}</p>
          </div>
          <div>
            <p className="text-gray-500">Valid Until</p>
            <p className="font-semibold text-gray-900">
              {subscription.end_date ? format(new Date(subscription.end_date), "dd MMM yyyy") : "Lifetime"}
            </p>
            {daysLeft !== null && (
              <p className={`text-xs font-medium ${daysLeft <= 7 ? "text-red-600" : "text-green-600"}`}>
                {daysLeft} days remaining
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-500">Start Date</p>
            <p className="font-medium text-gray-900">
              {subscription.start_date ? format(new Date(subscription.start_date), "dd MMM yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Billing</p>
            <p className="font-medium text-gray-900 capitalize">{subscription.billing_cycle || "—"}</p>
          </div>
        </div>
        {subscription.manually_granted && (
          <Alert className="bg-blue-50 border-blue-200 py-2">
            <AlertDescription className="text-xs text-blue-800">
              This subscription was manually granted by an administrator.
            </AlertDescription>
          </Alert>
        )}
        {!subscription.manually_granted && isActive && (
          <Button
            onClick={onUpgrade}
            variant="outline"
            className="w-full border-orange-400 text-orange-600 hover:bg-orange-50"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Upgrade / Change Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Payment History Table ──────────────────────────────────────────────────────
function PaymentHistoryTable({ transactions, isCoach }) {
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((t) => {
    const name = isCoach ? t.coach_name : t.client_name;
    const email = isCoach ? t.coach_email : t.client_email;
    const q = search.toLowerCase();
    return (
      (name || "").toLowerCase().includes(q) ||
      (email || "").toLowerCase().includes(q) ||
      (t.plan_name || t.plan_tier || "").toLowerCase().includes(q) ||
      (t.razorpay_payment_id || "").toLowerCase().includes(q)
    );
  });

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No payment records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, plan or payment ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Billing</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.id} className="border-t hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {format(new Date(sub.created_date), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{sub.plan_name || (sub.plan_tier?.toUpperCase() + " Plan")}</p>
                  {sub.razorpay_payment_id && (
                    <p className="text-xs text-gray-400">{sub.razorpay_payment_id.slice(0, 16)}…</p>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">₹{sub.amount}</td>
                <td className="px-4 py-3 text-gray-600 capitalize hidden md:table-cell">
                  {sub.billing_cycle || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={sub.status} />
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => generateInvoiceText(sub, isCoach)}
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">No results match your search</div>
        )}
      </div>
    </div>
  );
}

// ── Coach Plans Upgrade Section ────────────────────────────────────────────────
function CoachPlanUpgrade({ plans, mySubscription, user }) {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const createSub = useMutation({
    mutationFn: (data) => base44.entities.HealthCoachSubscription.create(data),
  });

  const handleSubscribe = async (plan) => {
    if (!window.Razorpay) {
      alert("Payment gateway is loading. Please try again in a moment.");
      return;
    }
    setIsProcessing(true);
    try {
      const originalAmount = billingCycle === "yearly" ? plan.yearly_price : plan.monthly_price;
      const amount = appliedCoupon ? appliedCoupon.finalAmount : originalAmount;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (billingCycle === "yearly" ? 12 : 1));

      const newSub = await createSub.mutateAsync({
        coach_email: user.email,
        coach_name: user.full_name,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        billing_cycle: billingCycle,
        amount,
        currency: "INR",
        start_date: new Date().toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        next_billing_date: endDate.toISOString().split("T")[0],
        status: "pending",
        payment_method: "razorpay",
        auto_renew: true,
        manually_granted: false,
        granted_by: null,
      });

      const res = await base44.functions.invoke("createCoachPayment", {
        subscriptionId: newSub.id,
        amount: amount * 100,
        currency: "INR",
        coachName: user.full_name,
        coachEmail: user.email,
        planName: plan.plan_name,
      });

      const order = res.data;
      const rzp = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Mealie Health Coach",
        description: `${plan.plan_name} - ${billingCycle}`,
        order_id: order.order_id,
        prefill: { name: user.full_name, email: user.email },
        theme: { color: "#9333EA" },
        handler: async (rzpRes) => {
          const verify = await base44.functions.invoke("verifyCoachPayment", {
            razorpay_order_id: rzpRes.razorpay_order_id,
            razorpay_payment_id: rzpRes.razorpay_payment_id,
            razorpay_signature: rzpRes.razorpay_signature,
            subscriptionId: newSub.id,
          });
          if (verify.data?.success) {
            // Cancel old active subs
            const old = await base44.entities.HealthCoachSubscription.filter({
              coach_email: user.email, status: "active"
            });
            for (const o of old) {
              if (o.id !== newSub.id) {
                await base44.entities.HealthCoachSubscription.update(o.id, { status: "cancelled" });
              }
            }
            if (appliedCoupon) {
              const usedBy = [...(appliedCoupon.coupon.used_by || []), { user_email: user.email, used_at: new Date().toISOString(), amount }];
              await base44.entities.Coupon.update(appliedCoupon.coupon.id, { usage_count: (appliedCoupon.coupon.usage_count || 0) + 1, used_by: usedBy });
            }
            queryClient.invalidateQueries(["myCoachSubscription"]);
            queryClient.invalidateQueries(["coachPaymentHistory"]);
            setSelectedPlan(null);
            setAppliedCoupon(null);
            alert("✅ Payment successful! Your plan is now active.");
          } else {
            alert("❌ Payment verification failed. Please contact support.");
          }
          setIsProcessing(false);
        },
        modal: {
          ondismiss: async () => {
            await base44.entities.HealthCoachSubscription.update(newSub.id, { status: "cancelled" });
            queryClient.invalidateQueries(["myCoachSubscription"]);
            setIsProcessing(false);
          },
        },
      });
      rzp.open();
    } catch (e) {
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isActive = mySubscription?.plan_id === plan.id && (mySubscription?.status === "active" || mySubscription?.status === "trial");
          return (
            <Card key={plan.id} className={`relative ${isActive ? "ring-2 ring-green-500" : ""}`}>
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-green-500 text-white px-3 py-0.5 text-xs">✓ CURRENT</Badge>
                </div>
              )}
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-xl pb-3">
                <Crown className="w-6 h-6 mb-1" />
                <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                <p className="text-2xl font-bold">₹{plan.monthly_price}<span className="text-sm font-normal">/mo</span></p>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1 text-sm text-gray-700">
                  {(plan.features || []).slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                {isActive ? (
                  <Button disabled className="w-full bg-gray-200 text-gray-500 cursor-not-allowed text-sm">Active Plan</Button>
                ) : (
                  <Button
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-sm"
                  >
                    {mySubscription?.status === "active" ? "Switch to This Plan" : "Subscribe"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={() => { setSelectedPlan(null); setAppliedCoupon(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.plan_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Billing Cycle</label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly — ₹{selectedPlan?.monthly_price}</SelectItem>
                  {selectedPlan?.yearly_price > 0 && (
                    <SelectItem value="yearly">Yearly — ₹{selectedPlan?.yearly_price} (Save!)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <CouponInput
              applicableTo="coach_plans"
              originalAmount={billingCycle === "yearly" ? selectedPlan?.yearly_price : selectedPlan?.monthly_price}
              onCouponApplied={setAppliedCoupon}
              userEmail={user?.email}
            />
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold">
                  ₹{appliedCoupon
                    ? appliedCoupon.finalAmount
                    : (billingCycle === "yearly" ? selectedPlan?.yearly_price : selectedPlan?.monthly_price)}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon discount</span>
                  <span>- ₹{(billingCycle === "yearly" ? selectedPlan?.yearly_price : selectedPlan?.monthly_price) - appliedCoupon.finalAmount}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600"
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : <><CreditCard className="w-4 h-4 mr-2" />Proceed to Payment</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Client Plan Upgrade Section ───────────────────────────────────────────────
function ClientPlanUpgrade({ securitySettings, mySubscription, clientProfile, user }) {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const plans = [
    { id: "basic", name: "Basic Plan", monthly: securitySettings?.membership_plans?.basic_plan?.monthly_price || 999, yearly: securitySettings?.membership_plans?.basic_plan?.yearly_price || 9999, features: ["View meal plans", "Food log", "Progress tracking", "MPESS wellness"] },
    { id: "advanced", name: "Advanced Plan", monthly: securitySettings?.membership_plans?.advanced_plan?.monthly_price || 2999, yearly: securitySettings?.membership_plans?.advanced_plan?.yearly_price || 29999, features: ["Everything in Basic", "Book appointments", "AI insights", "Priority support"], popular: true },
    { id: "pro", name: "Pro Plan", monthly: securitySettings?.membership_plans?.pro_plan?.monthly_price || 4999, yearly: securitySettings?.membership_plans?.pro_plan?.yearly_price || 49999, features: ["Everything in Advanced", "Unlimited AI", "Advanced analytics", "24/7 support"], best: true },
  ];

  const createSub = useMutation({ mutationFn: (data) => base44.entities.ClientSubscription.create(data) });
  const updateSub = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientSubscription.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["myClientSubscription"]);
      queryClient.invalidateQueries(["clientPaymentHistory"]);
    },
  });

  const handleSubscribe = async (plan) => {
    if (!clientProfile) { alert("Client profile not found"); return; }
    setIsProcessing(true);
    try {
      const originalAmount = billingCycle === "yearly" ? plan.yearly : plan.monthly;
      const amount = appliedCoupon ? appliedCoupon.finalAmount : originalAmount;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (billingCycle === "yearly" ? 12 : 1));

      const newSub = await createSub.mutateAsync({
        client_id: clientProfile.id, client_email: user.email, client_name: user.full_name,
        plan_tier: plan.id, billing_cycle: billingCycle, amount, currency: "INR",
        start_date: new Date().toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        next_billing_date: endDate.toISOString().split("T")[0],
        status: "pending", payment_gateway: "razorpay", coach_email: clientProfile.created_by, auto_renew: true,
      });

      const res = await base44.functions.invoke("createClientPayment", {
        subscriptionId: newSub.id, amount: amount * 100, currency: "INR",
        clientName: user.full_name, clientEmail: user.email, planName: plan.name,
      });

      const order = res.data;
      const rzp = new window.Razorpay({
        key: order.razorpay_key_id, amount: order.amount, currency: order.currency,
        name: "Mealie", description: `${plan.name} - ${billingCycle}`,
        order_id: order.order_id, prefill: { name: user.full_name, email: user.email },
        theme: { color: "#F97316" },
        handler: async (rzpRes) => {
          const verify = await base44.functions.invoke("verifyClientPayment", {
            razorpay_order_id: rzpRes.razorpay_order_id,
            razorpay_payment_id: rzpRes.razorpay_payment_id,
            razorpay_signature: rzpRes.razorpay_signature,
            subscriptionId: newSub.id,
          });
          if (verify.data?.success) {
            if (appliedCoupon) {
              const usedBy = [...(appliedCoupon.coupon.used_by || []), { user_email: user.email, used_at: new Date().toISOString(), amount }];
              await base44.entities.Coupon.update(appliedCoupon.coupon.id, { usage_count: (appliedCoupon.coupon.usage_count || 0) + 1, used_by: usedBy });
            }
            await updateSub.mutateAsync({ id: newSub.id, data: { status: "active", razorpay_payment_id: rzpRes.razorpay_payment_id, razorpay_order_id: rzpRes.razorpay_order_id } });
            setSelectedPlan(null);
            setAppliedCoupon(null);
            alert("✅ Payment successful! Your plan is now active.");
          } else {
            alert("❌ Payment verification failed. Please contact support.");
          }
          setIsProcessing(false);
        },
        modal: { ondismiss: () => setIsProcessing(false) },
      });
      rzp.open();
    } catch (e) {
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isActive = mySubscription?.plan_tier === plan.id && mySubscription?.status === "active";
          return (
            <Card key={plan.id} className={`relative ${plan.popular ? "ring-2 ring-blue-500" : ""} ${plan.best ? "ring-2 ring-purple-500" : ""} ${isActive ? "ring-2 ring-green-500" : ""}`}>
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-green-500 text-white px-3 py-0.5 text-xs">✓ CURRENT</Badge>
                </div>
              )}
              <CardHeader className={`bg-gradient-to-r ${plan.best ? "from-purple-500 to-pink-600" : plan.popular ? "from-blue-500 to-cyan-600" : "from-gray-500 to-slate-600"} text-white rounded-t-xl pb-3`}>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.popular && <Badge className="bg-white text-blue-600 text-xs">Popular</Badge>}
                  {plan.best && <Badge className="bg-white text-purple-600 text-xs">Best</Badge>}
                </div>
                <p className="text-2xl font-bold">₹{plan.monthly}<span className="text-sm font-normal">/mo</span></p>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1 text-sm text-gray-700">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                {isActive ? (
                  <Button disabled className="w-full bg-gray-200 text-gray-500 cursor-not-allowed text-sm">Active Plan</Button>
                ) : (
                  <Button
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isProcessing}
                    className={`w-full text-sm bg-gradient-to-r ${plan.best ? "from-purple-500 to-pink-600" : plan.popular ? "from-blue-500 to-cyan-600" : "from-gray-500 to-slate-600"}`}
                  >
                    {mySubscription?.status === "active" ? "Switch Plan" : "Subscribe Now"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={() => { setSelectedPlan(null); setAppliedCoupon(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Billing Cycle</label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly — ₹{selectedPlan?.monthly}</SelectItem>
                  <SelectItem value="yearly">Yearly — ₹{selectedPlan?.yearly} (Save!)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CouponInput
              applicableTo="client_plans"
              originalAmount={billingCycle === "yearly" ? selectedPlan?.yearly : selectedPlan?.monthly}
              onCouponApplied={setAppliedCoupon}
              userEmail={user?.email}
            />
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold">
                  ₹{appliedCoupon
                    ? appliedCoupon.finalAmount
                    : (billingCycle === "yearly" ? selectedPlan?.yearly : selectedPlan?.monthly)}
                </span>
              </div>
            </div>
            <Button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500"
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : <><CreditCard className="w-4 h-4 mr-2" />Proceed to Payment</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function BillingPortal() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isCoach = user?.user_type === "student_coach";
  const isClient = user?.user_type === "client";

  // Load Razorpay
  React.useEffect(() => {
    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  // Coach subscription
  const { data: coachSubscription } = useQuery({
    queryKey: ["myCoachSubscription", user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user?.email,
        status: { $ne: "cancelled" },
      });
      return subs.sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      })[0] || null;
    },
    enabled: !!user && isCoach,
    refetchInterval: 5000,
  });

  // Coach payment history
  const { data: coachHistory = [] } = useQuery({
    queryKey: ["coachPaymentHistory", user?.email],
    queryFn: async () => {
      const all = await base44.entities.HealthCoachSubscription.filter({ coach_email: user?.email });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user && isCoach,
  });

  // Coach plans list
  const { data: coachPlans = [] } = useQuery({
    queryKey: ["healthCoachPlans"],
    queryFn: async () => {
      const all = await base44.entities.HealthCoachPlan.filter({ status: "active" });
      return all.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
    enabled: isCoach,
  });

  // Client profile
  const { data: clientProfile } = useQuery({
    queryKey: ["clientProfile", user?.email],
    queryFn: async () => {
      const c = await base44.entities.Client.filter({ email: user?.email });
      return c[0] || null;
    },
    enabled: !!user && isClient,
  });

  // Client subscription
  const { data: clientSubscription } = useQuery({
    queryKey: ["myClientSubscription", clientProfile?.id],
    queryFn: async () => {
      const subs = await base44.entities.ClientSubscription.filter({
        client_id: clientProfile?.id,
        status: { $ne: "cancelled" },
      });
      return subs[0] || null;
    },
    enabled: !!clientProfile,
  });

  // Client payment history
  const { data: clientHistory = [] } = useQuery({
    queryKey: ["clientPaymentHistory", clientProfile?.id],
    queryFn: async () => {
      const all = await base44.entities.ClientSubscription.filter({ client_id: clientProfile?.id });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clientProfile,
  });

  const { data: securitySettings } = useQuery({
    queryKey: ["securitySettings"],
    queryFn: async () => {
      const s = await base44.entities.AppSecuritySettings.list();
      return s[0] || null;
    },
    enabled: isClient,
  });

  const subscription = isCoach ? coachSubscription : clientSubscription;
  const history = isCoach ? coachHistory : clientHistory;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isCoach && !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>Billing portal is available for coaches and clients only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              Billing Portal
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Manage your subscription, view invoices, and upgrade your plan
            </p>
          </div>
          <Badge className={`${isCoach ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"} text-xs px-3 py-1`}>
            {isCoach ? "Health Coach" : "Client"} Account
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="overview" className="gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-sm">
              <FileText className="w-4 h-4" />
              Payment History
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5 text-sm">
              <ArrowUpCircle className="w-4 h-4" />
              {subscription?.status === "active" ? "Upgrade Plan" : "Choose Plan"}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <CurrentPlanCard
                  subscription={subscription}
                  isCoach={isCoach}
                  onUpgrade={() => setActiveTab("plans")}
                />
              </div>
              <div className="space-y-3">
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{history.length}</p>
                    <p className="text-xs text-gray-400">Transactions recorded</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{history.filter(h => h.status === "active").reduce((s, h) => s + (h.amount || 0), 0).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400">Across active subscriptions</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">Account Since</p>
                    <p className="text-base font-bold text-gray-900">
                      {user.created_date ? format(new Date(user.created_date), "MMM yyyy") : "—"}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent transactions preview */}
            {history.length > 0 && (
              <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Recent Transactions</span>
                    <Button variant="ghost" size="sm" className="text-xs text-orange-600" onClick={() => setActiveTab("history")}>
                      View All →
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {history.slice(0, 3).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{h.plan_name || (h.plan_tier?.toUpperCase() + " Plan")}</p>
                          <p className="text-xs text-gray-500">{format(new Date(h.created_date), "dd MMM yyyy")}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">₹{h.amount}</p>
                            <StatusBadge status={h.status} />
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => generateInvoiceText(h, isCoach)}>
                            <Download className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment History & Invoices</CardTitle>
                <p className="text-xs text-gray-500">Click "Download" on any record to get your invoice</p>
              </CardHeader>
              <CardContent>
                <PaymentHistoryTable transactions={history} isCoach={isCoach} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="mt-4">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {subscription?.status === "active" ? "Upgrade or Change Your Plan" : "Choose a Plan"}
                </CardTitle>
                <p className="text-xs text-gray-500">All plans include a secure Razorpay payment gateway</p>
              </CardHeader>
              <CardContent>
                {isCoach ? (
                  <CoachPlanUpgrade plans={coachPlans} mySubscription={coachSubscription} user={user} />
                ) : (
                  <ClientPlanUpgrade securitySettings={securitySettings} mySubscription={clientSubscription} clientProfile={clientProfile} user={user} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}