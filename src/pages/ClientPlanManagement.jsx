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
import { Plus, UserPlus, Search, CheckCircle, XCircle, Calendar } from "lucide-react";

export default function ClientPlanManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentReceived, setPaymentReceived] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['myClients', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      }
      return await base44.entities.Client.filter({ created_by: user?.email });
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: myPlans } = useQuery({
    queryKey: ['myClientPlans', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.ClientPlanDefinition.filter({ status: 'active' });
      }
      return await base44.entities.ClientPlanDefinition.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: allPurchases } = useQuery({
    queryKey: ['allClientPurchases'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.ClientPlanPurchase.list('-created_date');
      }
      return await base44.entities.ClientPlanPurchase.filter({ coach_email: user?.email });
    },
    enabled: !!user,
    initialData: [],
  });

  const assignPlanMutation = useMutation({
    mutationFn: async (data) => {
      const client = clients.find(c => c.id === data.client_id);
      const plan = myPlans.find(p => p.id === data.plan_id);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (plan.duration_days || 30));

      return await base44.entities.ClientPlanPurchase.create({
        client_id: client.id,
        client_email: client.email,
        client_name: client.full_name,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        coach_email: user?.email,
        amount: paymentReceived ? plan.price : 0,
        currency: 'INR',
        purchase_date: startDate.toISOString().split('T')[0],
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_gateway: paymentReceived ? 'manual' : 'free',
        manually_granted: !paymentReceived,
        granted_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allClientPurchases']);
      setShowDialog(false);
      setSelectedClient("");
      setSelectedPlan("");
      setPaymentReceived(false);
      alert('✅ Plan assigned to client successfully!');
    },
  });

  const revokePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPlanPurchase.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allClientPurchases']);
      alert('✅ Plan access revoked!');
    },
  });

  const handleAssignPlan = () => {
    if (!selectedClient || !selectedPlan) {
      alert('Please select both a client and a plan');
      return;
    }
    assignPlanMutation.mutate({ client_id: selectedClient, plan_id: selectedPlan });
  };

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientPlans = (clientId) => {
    return allPurchases.filter(p => p.client_id === clientId && p.status === 'active');
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Assign Plans to Clients</h1>
            <p className="text-gray-600">Manage client plan assignments and subscriptions</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Assign Plan
          </Button>
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredClients.map((client) => {
            const clientPlans = getClientPlans(client.id);
            return (
              <Card key={client.id} className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{client.full_name}</h3>
                      <p className="text-gray-600">{client.email}</p>
                      {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
                    </div>
                    <Badge className={clientPlans.length > 0 ? 'bg-green-600' : 'bg-gray-400'}>
                      {clientPlans.length} Active Plan{clientPlans.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {clientPlans.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Active Plans:</p>
                      {clientPlans.map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <p className="font-medium text-gray-900">{purchase.plan_name}</p>
                              {purchase.manually_granted && (
                                <Badge variant="outline" className="text-xs">Manual</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(purchase.start_date).toLocaleDateString()} - {new Date(purchase.end_date).toLocaleDateString()}
                              </span>
                              <span>₹{purchase.amount}</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              if (confirm('Revoke this plan access?')) {
                                revokePlanMutation.mutate(purchase.id);
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No active plans assigned yet
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Assign Plan to Client
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {myPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.plan_name} - ₹{plan.price} ({plan.duration_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <Label>Payment Received</Label>
                <input
                  type="checkbox"
                  checked={paymentReceived}
                  onChange={(e) => setPaymentReceived(e.target.checked)}
                  className="w-5 h-5"
                />
              </div>

              {!paymentReceived && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ℹ️ Plan will be assigned for free without payment tracking
                </div>
              )}

              <Button
                onClick={handleAssignPlan}
                disabled={assignPlanMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {assignPlanMutation.isPending ? 'Assigning...' : 'Assign Plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}