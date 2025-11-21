import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, CreditCard, CheckCircle, AlertTriangle, TrendingUp, History } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseAICredits() {
  const queryClient = useQueryClient();
  const [creditsAmount, setCreditsAmount] = useState(10);

  // Load Razorpay script
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && user?.user_type === 'student_coach',
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['aiCreditTransactions', user?.email],
    queryFn: async () => {
      const txns = await base44.entities.AICreditsTransaction.filter({ 
        coach_email: user?.email 
      });
      return txns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    initialData: [],
  });

  const purchaseCreditsMutation = useMutation({
    mutationFn: async (amount) => {
      const totalCost = amount * (coachPlan?.ai_credit_price || 10);
      
      // Create Razorpay order
      const orderResponse = await base44.functions.invoke('createCoachPayment', {
        coach_email: user.email,
        amount: totalCost,
        description: `Purchase ${amount} AI Credits`,
        payment_type: 'ai_credits'
      });

      if (!orderResponse?.data?.order_id) {
        throw new Error('Failed to create payment order');
      }

      return new Promise((resolve, reject) => {
        const options = {
          key: orderResponse.data.razorpay_key_id,
          amount: orderResponse.data.amount,
          currency: orderResponse.data.currency,
          name: 'Mealie Pro',
          description: `${amount} AI Credits`,
          order_id: orderResponse.data.order_id,
          handler: async function (response) {
            try {
              // Verify payment
              await base44.functions.invoke('verifyCoachPayment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              // Update subscription with purchased credits
              await base44.entities.HealthCoachSubscription.update(coachSubscription.id, {
                ai_credits_purchased: (coachSubscription.ai_credits_purchased || 0) + amount
              });

              // Record transaction
              await base44.entities.AICreditsTransaction.create({
                coach_email: user.email,
                subscription_id: coachSubscription.id,
                transaction_type: 'purchase',
                credits_amount: amount,
                cost: totalCost,
                payment_id: response.razorpay_payment_id,
                payment_status: 'completed',
                description: `Purchased ${amount} AI credits`
              });

              resolve(response);
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: function() {
              reject(new Error('Payment cancelled by user'));
            }
          },
          theme: {
            color: '#F97316'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coachSubscription']);
      queryClient.invalidateQueries(['aiCreditTransactions']);
      alert('✅ AI Credits purchased successfully!');
      setCreditsAmount(10);
    },
    onError: (error) => {
      console.error('Payment error:', error);
      alert('❌ Payment failed. Please try again.');
    }
  });

  const availableCredits = React.useMemo(() => {
    if (!coachSubscription || !coachPlan) return 0;
    
    const creditsIncluded = coachPlan.ai_credits_included || 0;
    if (creditsIncluded === -1) return Infinity;
    
    const creditsUsed = coachSubscription.ai_credits_used_this_month || 0;
    const creditsPurchased = coachSubscription.ai_credits_purchased || 0;
    
    return Math.max(0, creditsIncluded + creditsPurchased - creditsUsed);
  }, [coachSubscription, coachPlan]);

  const totalCost = creditsAmount * (coachPlan?.ai_credit_price || 10);

  if (user?.user_type !== 'student_coach') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription>
            This page is only for Health Coaches. Super Admins have unlimited AI access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!coachSubscription) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-5 h-5" />
          <AlertDescription>
            No active subscription found. Please subscribe to a plan first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Purchase AI Credits</h1>
            <p className="text-gray-600">Buy additional credits to continue generating AI content</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Available Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-bold mb-2">
                {availableCredits === Infinity ? '∞' : availableCredits}
              </p>
              <p className="text-purple-100">Ready to use</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Monthly Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                {coachPlan?.ai_credits_included === -1 ? '∞' : coachPlan?.ai_credits_included || 0}
              </p>
              <p className="text-gray-600">From your plan</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Credit Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                ₹{coachPlan?.ai_credit_price || 10}
              </p>
              <p className="text-gray-600">Per credit</p>
            </CardContent>
          </Card>
        </div>

        {availableCredits < 5 && availableCredits !== Infinity && (
          <Alert className="bg-orange-50 border-orange-300">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Running Low!</strong> You have only {availableCredits} credits left. Purchase more to avoid interruptions.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Purchase Additional Credits</CardTitle>
            <CardDescription>
              Buy AI credits to continue generating meal plans and recipes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="credits">Number of Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="1"
                  max="1000"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(parseInt(e.target.value) || 1)}
                  className="text-lg h-14"
                />
              </div>

              <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-700">Total Amount</span>
                  <span className="text-4xl font-bold text-purple-600">₹{totalCost}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {creditsAmount} credits × ₹{coachPlan?.ai_credit_price || 10} = ₹{totalCost}
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-300">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>What You Get:</strong><br/>
                  • {creditsAmount} AI meal plan generations, OR<br/>
                  • {creditsAmount} AI recipe generations<br/>
                  • Credits never expire<br/>
                  • Use them anytime
                </AlertDescription>
              </Alert>
            </div>

            <Button
              onClick={() => purchaseCreditsMutation.mutate(creditsAmount)}
              disabled={purchaseCreditsMutation.isPending || creditsAmount < 1}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {purchaseCreditsMutation.isPending ? (
                'Processing Payment...'
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Purchase {creditsAmount} Credits for ₹{totalCost}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          txn.transaction_type === 'purchase' ? 'bg-green-100 text-green-700' :
                          txn.transaction_type === 'usage' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }>
                          {txn.transaction_type}
                        </Badge>
                        <span className="font-semibold text-gray-900">
                          {txn.credits_amount > 0 ? '+' : ''}{txn.credits_amount} credits
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{txn.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(txn.created_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {txn.cost && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₹{txn.cost}</p>
                        <Badge variant="outline" className="text-xs">
                          {txn.payment_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}