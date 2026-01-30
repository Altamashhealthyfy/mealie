import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Crown, Plus, Trash2, AlertCircle, Users, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminSubscriptionManager() {
  const queryClient = useQueryClient();
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [coachEmail, setCoachEmail] = useState("");
  const [selectedCoachPlan, setSelectedCoachPlan] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedClientPlan, setSelectedClientPlan] = useState("");
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [creditsCoachEmail, setCreditsCoachEmail] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [creditsReason, setCreditsReason] = useState("");


  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachPlans } = useQuery({
    queryKey: ['healthCoachPlans'],
    queryFn: async () => await base44.entities.HealthCoachPlan.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: clientPlans } = useQuery({
    queryKey: ['allClientPlans'],
    queryFn: async () => await base44.entities.ClientPlanDefinition.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: coachSubscriptions } = useQuery({
    queryKey: ['allCoachSubscriptions'],
    queryFn: async () => await base44.entities.HealthCoachSubscription.list('-created_date'),
    initialData: [],
  });

  const { data: clientPurchases } = useQuery({
    queryKey: ['allClientPurchases'],
    queryFn: async () => await base44.entities.ClientPlanPurchase.list('-created_date'),
    initialData: [],
  });



  const grantCoachAccessMutation = useMutation({
    mutationFn: async (data) => {
      const plan = coachPlans.find(p => p.id === data.plan_id);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      return await base44.entities.HealthCoachSubscription.create({
        coach_email: data.coach_email,
        coach_name: data.coach_email,
        plan_id: data.plan_id,
        plan_name: plan.plan_name,
        billing_cycle: 'yearly',
        amount: 0,
        currency: 'INR',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        next_billing_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_method: 'manual',
        manually_granted: true,
        granted_by: user?.email,
        auto_renew: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowCoachDialog(false);
      setCoachEmail("");
      setSelectedCoachPlan("");
      alert('✅ Coach access granted successfully!');
    },
  });

  const grantClientAccessMutation = useMutation({
    mutationFn: async (data) => {
      const plan = clientPlans.find(p => p.id === data.plan_id);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan.duration_days || 30));

      // Find client
      const clients = await base44.entities.Client.filter({ email: data.client_email });
      const client = clients[0];

      if (!client) {
        throw new Error('Client not found');
      }

      return await base44.entities.ClientPlanPurchase.create({
        client_id: client.id,
        client_email: data.client_email,
        client_name: client.full_name,
        plan_id: data.plan_id,
        plan_name: plan.plan_name,
        coach_email: plan.coach_email,
        amount: 0,
        currency: 'INR',
        purchase_date: startDate.toISOString().split('T')[0],
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_gateway: 'manual',
        manually_granted: true,
        granted_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allClientPurchases']);
      setShowClientDialog(false);
      setClientEmail("");
      setSelectedClientPlan("");
      alert('✅ Client access granted successfully!');
    },
  });

  const revokeCoachAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.HealthCoachSubscription.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      alert('✅ Access revoked successfully!');
    },
  });

  const revokeClientAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPlanPurchase.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allClientPurchases']);
      alert('✅ Access revoked successfully!');
    },
  });

  const addAICreditsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('addCoachAICredits', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowCreditsDialog(false);
      setCreditsCoachEmail("");
      setCreditsAmount("");
      setCreditsReason("");
      alert('✅ AI Credits added successfully!');
    },
  });

  const handleGrantCoachAccess = () => {
    if (!coachEmail || !selectedCoachPlan) {
      alert('Please fill in all fields');
      return;
    }
    grantCoachAccessMutation.mutate({ coach_email: coachEmail, plan_id: selectedCoachPlan });
  };

  const handleGrantClientAccess = () => {
    if (!clientEmail || !selectedClientPlan) {
      alert('Please fill in all fields');
      return;
    }
    grantClientAccessMutation.mutate({ client_email: clientEmail, plan_id: selectedClientPlan });
  };

  const handleAddCredits = () => {
    if (!creditsCoachEmail || !creditsAmount || parseInt(creditsAmount) <= 0) {
      alert('Please enter coach email and valid credit amount');
      return;
    }
    addAICreditsMutation.mutate({
      coachEmail: creditsCoachEmail,
      creditsToAdd: parseInt(creditsAmount),
      reason: creditsReason || 'Admin manually added credits'
    });
  };



  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            Only Super Admins can manage subscriptions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Subscription Manager</h1>
            <p className="text-gray-600">Manually grant or revoke access to plans</p>
          </div>
          <Shield className="w-10 h-10 text-purple-500" />
        </div>

        <Tabs defaultValue="coaches" className="space-y-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="coaches">Health Coaches</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="coaches" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowCreditsDialog(true)} variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                <Sparkles className="w-5 h-5 mr-2" />
                Add AI Credits
              </Button>
              <Button onClick={() => setShowCoachDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-5 h-5 mr-2" />
                Grant Coach Access
              </Button>
            </div>

            <div className="grid gap-4">
              {coachSubscriptions.map((sub) => (
                <Card key={sub.id} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-5 h-5 text-purple-600" />
                          <h3 className="text-lg font-bold">{sub.coach_email}</h3>
                          {sub.manually_granted && <Badge className="bg-blue-600">Manual</Badge>}
                          <Badge className={sub.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                            {sub.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600">Plan: {sub.plan_name}</p>
                        <p className="text-sm text-gray-500">
                          Valid: {new Date(sub.start_date).toLocaleDateString()} - {new Date(sub.end_date).toLocaleDateString()}
                        </p>
                        {sub.ai_credits_purchased > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 mt-1">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {sub.ai_credits_purchased} AI Credits
                          </Badge>
                        )}
                        {sub.manually_granted && (
                          <p className="text-xs text-blue-600 mt-1">Granted by: {sub.granted_by}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          if (confirm('Revoke access for this coach?')) {
                            revokeCoachAccessMutation.mutate(sub.id);
                          }
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowClientDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" />
                Grant Client Access
              </Button>
            </div>

            <div className="grid gap-4">
              {clientPurchases.map((purchase) => (
                <Card key={purchase.id} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-bold">{purchase.client_email}</h3>
                          {purchase.manually_granted && <Badge className="bg-blue-600">Manual</Badge>}
                          <Badge className={purchase.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                            {purchase.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600">Plan: {purchase.plan_name}</p>
                        <p className="text-sm text-gray-500">Coach: {purchase.coach_email}</p>
                        <p className="text-sm text-gray-500">
                          Valid: {new Date(purchase.start_date).toLocaleDateString()} - {new Date(purchase.end_date).toLocaleDateString()}
                        </p>
                        {purchase.manually_granted && (
                          <p className="text-xs text-blue-600 mt-1">Granted by: {purchase.granted_by}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          if (confirm('Revoke access for this client?')) {
                            revokeClientAccessMutation.mutate(purchase.id);
                          }
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showCoachDialog} onOpenChange={setShowCoachDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Coach Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Coach Email</Label>
                <Input
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="coach@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={selectedCoachPlan} onValueChange={setSelectedCoachPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {coachPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.plan_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGrantCoachAccess} className="w-full bg-purple-600 hover:bg-purple-700">
                Grant Access (1 Year)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Client Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={selectedClientPlan} onValueChange={setSelectedClientPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.plan_name} ({plan.coach_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGrantClientAccess} className="w-full bg-blue-600 hover:bg-blue-700">
                Grant Access
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                Add AI Credits to Coach
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-300">
                <AlertDescription className="text-green-800 text-sm">
                  This will add AI credits to the coach's active subscription. They can use these credits for AI-powered features.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Coach Email *</Label>
                <Input
                  value={creditsCoachEmail}
                  onChange={(e) => setCreditsCoachEmail(e.target.value)}
                  placeholder="coach@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Credits to Add *</Label>
                <Input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  placeholder="e.g., 100"
                  min="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  placeholder="e.g., Bonus credits for referral"
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleAddCredits} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={addAICreditsMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {addAICreditsMutation.isPending ? 'Adding...' : 'Add Credits'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}