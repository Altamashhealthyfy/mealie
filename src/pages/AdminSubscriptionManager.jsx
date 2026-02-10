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
import { Shield, Crown, Plus, Trash2, AlertCircle, Users, Sparkles, Search, Filter, CalendarPlus, Edit2, KeyRound, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function AdminSubscriptionManager() {
  const queryClient = useQueryClient();
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showExtendPlanDialog, setShowExtendPlanDialog] = useState(false);
  const [showEditCoachDialog, setShowEditCoachDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [coachEmail, setCoachEmail] = useState("");
  const [coachName, setCoachName] = useState("");
  const [selectedCoachPlan, setSelectedCoachPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [durationMonths, setDurationMonths] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [extraMonths, setExtraMonths] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedClientPlan, setSelectedClientPlan] = useState("");
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [creditsCoachEmail, setCreditsCoachEmail] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [creditsReason, setCreditsReason] = useState("");
  const [coachSearchTerm, setCoachSearchTerm] = useState("");
  const [coachStatusFilter, setCoachStatusFilter] = useState("all");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [extendMonths, setExtendMonths] = useState(1);
  const [editCoachForm, setEditCoachForm] = useState({
    full_name: '',
    email: '',
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    coachEmail: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


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
      console.log('grantCoachAccessMutation mutationFn called', data);
      
      const plan = coachPlans.find(p => p.id === data.plan_id);
      if (!plan) {
        throw new Error('Plan not found');
      }
      
      const start = data.start_date ? new Date(data.start_date) : new Date();
      let end;
      
      // Use expire_date if provided, otherwise calculate from duration
      if (data.expire_date) {
        end = new Date(data.expire_date);
      } else {
        end = new Date(start);
        // Calculate end date based on duration
        let totalMonths = 0;
        if (data.duration_months) {
          totalMonths = parseInt(data.duration_months);
        } else if (data.billing_cycle === 'yearly') {
          totalMonths = 12;
        } else {
          totalMonths = 1;
        }
        
        // Add extra months if provided
        if (data.extra_months) {
          totalMonths += parseInt(data.extra_months);
        }
        
        end.setMonth(end.getMonth() + totalMonths);
      }

      const subscriptionData = {
        coach_email: data.coach_email,
        coach_name: data.coach_name || data.coach_email,
        plan_id: data.plan_id,
        plan_name: plan.plan_name,
        billing_cycle: data.billing_cycle,
        amount: 0,
        currency: 'INR',
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        next_billing_date: end.toISOString().split('T')[0],
        status: 'active',
        payment_method: 'manual',
        manually_granted: true,
        granted_by: user?.email,
        auto_renew: false
      };
      
      console.log('Creating subscription with:', subscriptionData);
      
      return await base44.entities.HealthCoachSubscription.create(subscriptionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowCoachDialog(false);
      setCoachEmail("");
      setCoachName("");
      setSelectedCoachPlan("");
      setBillingCycle("yearly");
      setDurationMonths("");
      setStartDate("");
      setExpireDate("");
      setExtraMonths("");
      toast.success('Coach access granted successfully!');
    },
    onError: (error) => {
      console.error('grantCoachAccessMutation error:', error);
      toast.error(`Error: ${error?.message || 'Failed to grant access'}`);
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
      toast.success('Client access granted successfully!');
    },
  });

  const revokeCoachAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.HealthCoachSubscription.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      toast.success('Access revoked successfully!');
    },
  });

  const revokeClientAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientPlanPurchase.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allClientPurchases']);
      toast.success('Access revoked successfully!');
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
      toast.success('AI Credits added successfully!');
    },
  });

  const extendPlanMutation = useMutation({
    mutationFn: async (data) => {
      const currentEndDate = new Date(selectedSubscription.end_date);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(data.months));

      await base44.entities.HealthCoachSubscription.update(selectedSubscription.id, {
        end_date: newEndDate.toISOString().split('T')[0],
        next_billing_date: newEndDate.toISOString().split('T')[0],
      });

      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: selectedSubscription.coach_email,
        coach_name: selectedSubscription.coach_name,
        action_type: 'plan_extended',
        amount: parseInt(data.months),
        old_value: selectedSubscription.end_date,
        new_value: newEndDate.toISOString().split('T')[0],
        performed_by: user.email,
        notes: `Extended by ${data.months} month(s)`,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowExtendPlanDialog(false);
      setExtendMonths(1);
      toast.success('Plan extended successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to extend plan');
    },
  });

  const editCoachMutation = useMutation({
    mutationFn: async (data) => {
      // Find coach user record
      const users = await base44.entities.User.filter({ email: selectedSubscription.coach_email });
      const coachUser = users[0];

      if (coachUser) {
        await base44.entities.User.update(coachUser.id, {
          full_name: data.full_name,
          email: data.email,
        });
      }

      // Update all subscription records for this coach
      const allSubs = await base44.entities.HealthCoachSubscription.filter({ coach_email: selectedSubscription.coach_email });
      for (const sub of allSubs) {
        await base44.entities.HealthCoachSubscription.update(sub.id, {
          coach_email: data.email,
          coach_name: data.full_name,
        });
      }

      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: data.email,
        coach_name: data.full_name,
        action_type: 'profile_updated',
        old_value: `${selectedSubscription.coach_name} (${selectedSubscription.coach_email})`,
        new_value: `${data.full_name} (${data.email})`,
        performed_by: user.email,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowEditCoachDialog(false);
      toast.success('Coach details updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update coach details');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('changeUserPassword', {
        email: data.coachEmail,
        password: data.newPassword
      });
      return response.data;
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      setPasswordForm({ coachEmail: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to change password');
    },
  });

  const handleGrantCoachAccess = () => {
    console.log('handleGrantCoachAccess called', { coachEmail, selectedCoachPlan });
    
    if (!coachEmail?.trim()) {
      toast.error('Please enter coach email');
      return;
    }
    if (!selectedCoachPlan) {
      toast.error('Please select a plan');
      return;
    }
    
    console.log('Mutation data:', {
      coach_email: coachEmail.trim(),
      coach_name: coachName?.trim() || coachEmail.trim(),
      plan_id: selectedCoachPlan,
      billing_cycle: billingCycle,
      duration_months: durationMonths,
      start_date: startDate,
      expire_date: expireDate,
      extra_months: extraMonths
    });
    
    grantCoachAccessMutation.mutate({ 
      coach_email: coachEmail.trim(),
      coach_name: coachName?.trim() || coachEmail.trim(),
      plan_id: selectedCoachPlan,
      billing_cycle: billingCycle,
      duration_months: durationMonths,
      start_date: startDate,
      expire_date: expireDate,
      extra_months: extraMonths
    });
  };

  const handleGrantClientAccess = () => {
    if (!clientEmail?.trim()) {
      toast.error('Please enter client email');
      return;
    }
    if (!selectedClientPlan) {
      toast.error('Please select a plan');
      return;
    }
    grantClientAccessMutation.mutate({ client_email: clientEmail.trim(), plan_id: selectedClientPlan });
  };

  const handleAddCredits = () => {
    if (!creditsCoachEmail?.trim()) {
      toast.error('Please enter coach email');
      return;
    }
    if (!creditsAmount || parseInt(creditsAmount) <= 0) {
      toast.error('Please enter valid credit amount');
      return;
    }
    addAICreditsMutation.mutate({
      coachEmail: creditsCoachEmail.trim(),
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Subscription Manager</h1>
            <p className="text-sm md:text-base text-gray-600">Manually grant or revoke access to plans</p>
          </div>
          <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 shrink-0" />
        </div>

        <Tabs defaultValue="coaches" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="coaches" className="text-xs sm:text-sm">Health Coaches</TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="coaches" className="space-y-4">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by email, name, or plan..."
                    value={coachSearchTerm}
                    onChange={(e) => setCoachSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={coachStatusFilter} onValueChange={setCoachStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowPasswordDialog(true)} variant="outline" className="flex-1 border-red-500 text-red-700 hover:bg-red-50">
                  <KeyRound className="w-5 h-5 mr-2" />
                  Change Password
                </Button>
                <Button onClick={() => setShowCreditsDialog(true)} variant="outline" className="flex-1 border-green-500 text-green-700 hover:bg-green-50">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Add AI Credits
                </Button>
                <Button onClick={() => setShowCoachDialog(true)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Grant Access
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {coachSubscriptions
                .filter(sub => {
                  const matchesSearch = !coachSearchTerm || 
                    sub.coach_email?.toLowerCase().includes(coachSearchTerm.toLowerCase()) ||
                    sub.coach_name?.toLowerCase().includes(coachSearchTerm.toLowerCase()) ||
                    sub.plan_name?.toLowerCase().includes(coachSearchTerm.toLowerCase());
                  
                  const now = new Date();
                  const endDate = new Date(sub.end_date);
                  const isExpired = endDate < now;
                  
                  const matchesStatus = coachStatusFilter === 'all' || 
                    (coachStatusFilter === 'active' && sub.status === 'active' && !isExpired) ||
                    (coachStatusFilter === 'expired' && (sub.status === 'active' && isExpired)) ||
                    (coachStatusFilter === 'cancelled' && sub.status === 'cancelled');
                  
                  return matchesSearch && matchesStatus;
                })
                .map((sub) => (
                <Card key={sub.id} className="border-none shadow-lg">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Crown className="w-5 h-5 text-purple-600 shrink-0" />
                            <h3 className="text-base sm:text-lg font-bold truncate">{sub.coach_email}</h3>
                            {sub.coach_name && <span className="text-sm text-gray-600 truncate">({sub.coach_name})</span>}
                            {sub.manually_granted && <Badge className="bg-blue-600 text-xs">Manual</Badge>}
                            <Badge className={`text-xs ${sub.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}`}>
                              {sub.status}
                            </Badge>
                          </div>
                          <p className="text-sm sm:text-base text-gray-600 truncate">Plan: {sub.plan_name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Valid: {new Date(sub.start_date).toLocaleDateString()} - {new Date(sub.end_date).toLocaleDateString()}
                          </p>
                          {sub.ai_credits_purchased > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 mt-1 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {sub.ai_credits_purchased} AI Credits
                            </Badge>
                          )}
                          {sub.manually_granted && (
                            <p className="text-xs text-blue-600 mt-1 truncate">Granted by: {sub.granted_by}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 sm:flex-none hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => {
                            setSelectedSubscription(sub);
                            setEditCoachForm({
                              full_name: sub.coach_name || '',
                              email: sub.coach_email,
                            });
                            setShowEditCoachDialog(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        {sub.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-600"
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setShowExtendPlanDialog(true);
                            }}
                          >
                            <CalendarPlus className="w-4 h-4 mr-2" />
                            Extend
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm('Revoke access for this coach?')) {
                              revokeCoachAccessMutation.mutate(sub.id);
                            }
                          }}
                          variant="destructive"
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by email, name, plan, or coach..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowClientDialog(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" />
                Grant Client Access
              </Button>
            </div>

            <div className="grid gap-4">
              {clientPurchases
                .filter(purchase => {
                  const matchesSearch = !clientSearchTerm || 
                    purchase.client_email?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    purchase.client_name?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    purchase.plan_name?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    purchase.coach_email?.toLowerCase().includes(clientSearchTerm.toLowerCase());
                  
                  const now = new Date();
                  const endDate = new Date(purchase.end_date);
                  const isExpired = endDate < now;
                  
                  const matchesStatus = clientStatusFilter === 'all' || 
                    (clientStatusFilter === 'active' && purchase.status === 'active' && !isExpired) ||
                    (clientStatusFilter === 'expired' && (purchase.status === 'active' && isExpired)) ||
                    (clientStatusFilter === 'cancelled' && purchase.status === 'cancelled');
                  
                  return matchesSearch && matchesStatus;
                })
                .map((purchase) => (
                <Card key={purchase.id} className="border-none shadow-lg">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600 shrink-0" />
                            <h3 className="text-base sm:text-lg font-bold truncate">{purchase.client_email}</h3>
                            {purchase.manually_granted && <Badge className="bg-blue-600 text-xs">Manual</Badge>}
                            <Badge className={`text-xs ${purchase.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}`}>
                              {purchase.status}
                            </Badge>
                          </div>
                          <p className="text-sm sm:text-base text-gray-600 truncate">Plan: {purchase.plan_name}</p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">Coach: {purchase.coach_email}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Valid: {new Date(purchase.start_date).toLocaleDateString()} - {new Date(purchase.end_date).toLocaleDateString()}
                          </p>
                          {purchase.manually_granted && (
                            <p className="text-xs text-blue-600 mt-1 truncate">Granted by: {purchase.granted_by}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirm('Revoke access for this client?')) {
                            revokeClientAccessMutation.mutate(purchase.id);
                          }
                        }}
                        variant="destructive"
                        className="w-full sm:w-auto"
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
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                Assign Health Coach Plan
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Coach:</strong> {coachEmail || "Not selected"}
                </p>
                {coachName && (
                  <p className="text-sm text-gray-700">{coachName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Coach Email *</Label>
                <Input
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="nutritionist@healthyfy.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Coach Name</Label>
                <Input
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="nutritionisthealthyfy"
                />
              </div>

              <div className="space-y-2">
                <Label>Select Plan *</Label>
                <Select 
                  value={selectedCoachPlan} 
                  onValueChange={(value) => {
                    console.log('Plan selected:', value);
                    setSelectedCoachPlan(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pro Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {coachPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.plan_name} - ₹{plan.monthly_price}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly - ₹99999/year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (Months)</Label>
                <Input
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="Leave empty to use billing cycle default"
                  min="1"
                />
                <p className="text-xs text-gray-500">
                  Specify custom duration or leave empty (Monthly = 1 month, Yearly = 12 months)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Start Billing Cycle</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Leave empty to start immediately
                </p>
              </div>

              <div className="space-y-2">
                <Label>Expire Date</Label>
                <Input
                  type="date"
                  value={expireDate}
                  onChange={(e) => setExpireDate(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Leave empty to auto-calculate from duration
                </p>
              </div>

              <div className="space-y-2">
                <Label>Extra Months (Bonus)</Label>
                <Input
                  type="number"
                  value={extraMonths}
                  onChange={(e) => setExtraMonths(e.target.value)}
                  placeholder="Add bonus months"
                  min="0"
                />
                <p className="text-xs text-gray-500">
                  Add extra months as a bonus (e.g., 1 month free)
                </p>
              </div>

              {(startDate || billingCycle || durationMonths || extraMonths || expireDate) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Billing Summary</p>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p>
                      <strong>Start Date:</strong> {startDate || new Date().toLocaleDateString()}
                    </p>
                    <p>
                      <strong>End Date:</strong> {(() => {
                        if (expireDate) {
                          return new Date(expireDate).toLocaleDateString();
                        }
                        const start = startDate ? new Date(startDate) : new Date();
                        const end = new Date(start);
                        let totalMonths = durationMonths ? parseInt(durationMonths) : (billingCycle === 'yearly' ? 12 : 1);
                        if (extraMonths) totalMonths += parseInt(extraMonths);
                        end.setMonth(end.getMonth() + totalMonths);
                        return end.toLocaleDateString();
                      })()}
                    </p>
                    {!expireDate && (
                      <p>
                        <strong>Total Duration:</strong> {(() => {
                          let totalMonths = durationMonths ? parseInt(durationMonths) : (billingCycle === 'yearly' ? 12 : 1);
                          if (extraMonths) totalMonths += parseInt(extraMonths);
                          return `${totalMonths} months`;
                        })()}
                        {extraMonths && ` (${extraMonths} bonus)`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedCoachPlan && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    {coachPlans.find(p => p.id === selectedCoachPlan)?.plan_name}
                  </p>
                  <p className="text-xs text-gray-700">Everything in Advance</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <p className="flex items-center gap-1">
                      <span className="text-green-600">✓</span> Max Clients: 50
                    </p>
                    <p className="flex items-center gap-1">
                      <span className="text-green-600">✓</span> AI Limit: 150
                    </p>
                    <p className="flex items-center gap-1">
                      <span className="text-green-600">✓</span> Pro Plans Access
                    </p>
                    <p className="flex items-center gap-1">
                      <span className="text-green-600">✓</span> Team Management
                    </p>
                  </div>
                </div>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900 text-sm">
                  This will manually assign a plan to the coach without payment. The plan will be active immediately.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => setShowCoachDialog(false)} 
                  variant="outline"
                  className="flex-1 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGrantCoachAccess();
                  }} 
                  type="button"
                  className="flex-1 bg-green-600 hover:bg-green-700 order-1 sm:order-2"
                  disabled={grantCoachAccessMutation.isPending}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {grantCoachAccessMutation.isPending ? 'Assigning...' : 'Assign Plan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent className="max-w-md">
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
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowClientDialog(false)} variant="outline" className="flex-1 order-2 sm:order-1">
                  Cancel
                </Button>
                <Button onClick={handleGrantClientAccess} className="flex-1 bg-blue-600 hover:bg-blue-700 order-1 sm:order-2">
                  Grant Access
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
          <DialogContent className="max-w-md">
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
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowCreditsDialog(false)} variant="outline" className="flex-1 order-2 sm:order-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddCredits} 
                  className="flex-1 bg-green-600 hover:bg-green-700 order-1 sm:order-2"
                  disabled={addAICreditsMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {addAICreditsMutation.isPending ? 'Adding...' : 'Add Credits'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Extend Plan Dialog */}
        <Dialog open={showExtendPlanDialog} onOpenChange={setShowExtendPlanDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-green-600" />
                Extend Plan Duration
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedSubscription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Coach:</strong> {selectedSubscription.coach_name || selectedSubscription.coach_email}
                  </p>
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Current End Date:</strong> {new Date(selectedSubscription.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {extendMonths > 0 && (
                    <p className="text-sm text-green-900">
                      <strong>New End Date:</strong> {(() => {
                        const newDate = new Date(selectedSubscription.end_date);
                        newDate.setMonth(newDate.getMonth() + parseInt(extendMonths));
                        return newDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      })()}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Extend By (Months) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(parseInt(e.target.value) || 1)}
                  placeholder="Enter number of months"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowExtendPlanDialog(false)} variant="outline" className="flex-1 order-2 sm:order-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => extendPlanMutation.mutate({ months: extendMonths })}
                  disabled={extendMonths <= 0 || extendPlanMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 order-1 sm:order-2"
                >
                  {extendPlanMutation.isPending ? 'Extending...' : `Extend by ${extendMonths} Month(s)`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Coach Dialog */}
        <Dialog open={showEditCoachDialog} onOpenChange={setShowEditCoachDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Edit Coach Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={editCoachForm.full_name}
                  onChange={(e) => setEditCoachForm({ ...editCoachForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email ID *</Label>
                <Input
                  type="email"
                  value={editCoachForm.email}
                  onChange={(e) => setEditCoachForm({ ...editCoachForm, email: e.target.value.trim().toLowerCase() })}
                  placeholder="coach@example.com"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  <strong>Note:</strong> Changing email will update all subscription records. Login credentials will use the new email.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowEditCoachDialog(false)} variant="outline" className="flex-1 order-2 sm:order-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(editCoachForm.email)) {
                      toast.error('Please enter a valid email address');
                      return;
                    }
                    editCoachMutation.mutate(editCoachForm);
                  }}
                  disabled={!editCoachForm.full_name || !editCoachForm.email || editCoachMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 order-1 sm:order-2"
                >
                  {editCoachMutation.isPending ? 'Updating...' : 'Update Details'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-red-600" />
                Change Coach Password
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-red-50 border-red-300">
                <AlertDescription className="text-red-800 text-sm">
                  <strong>Note:</strong> Password will be changed without requiring the old password. Make sure to inform the coach about the new password.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Coach Email *</Label>
                <Input
                  value={passwordForm.coachEmail}
                  onChange={(e) => setPasswordForm({...passwordForm, coachEmail: e.target.value})}
                  placeholder="coach@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>New Password *</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm New Password *</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordForm({ coachEmail: '', newPassword: '', confirmPassword: '' });
                }} variant="outline" className="flex-1 order-2 sm:order-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!passwordForm.coachEmail.trim()) {
                      toast.error('Please enter coach email');
                      return;
                    }
                    if (passwordForm.newPassword.length < 6) {
                      toast.error('Password must be at least 6 characters');
                      return;
                    }
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                      toast.error('Passwords do not match');
                      return;
                    }
                    changePasswordMutation.mutate(passwordForm);
                  }}
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 order-1 sm:order-2"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}