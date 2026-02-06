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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { 
  GraduationCap, 
  Plus, 
  Edit, 
  Sparkles, 
  Crown, 
  Calendar,
  AlertCircle,
  Trash2,
  User,
  Mail,
  Phone,
  Shield
} from "lucide-react";
import { toast } from "sonner";

export default function HealthCoachesManagement() {
  const queryClient = useQueryClient();
  const [showAddCoachDialog, setShowAddCoachDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [newPassword, setNewPassword] = useState("");
  
  const [coachFormData, setCoachFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "TempPass123!"
  });

  const [subscriptionFormData, setSubscriptionFormData] = useState({
    plan_id: "",
    billing_cycle: "yearly",
    start_date: "",
    end_date: "",
    extra_months: ""
  });

  const [creditsFormData, setCreditsFormData] = useState({
    credits_amount: "",
    reason: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => await base44.entities.User.list(),
    initialData: [],
  });

  const { data: coachPlans } = useQuery({
    queryKey: ['healthCoachPlans'],
    queryFn: async () => await base44.entities.HealthCoachPlan.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: allSubscriptions } = useQuery({
    queryKey: ['allCoachSubscriptions'],
    queryFn: async () => await base44.entities.HealthCoachSubscription.list('-created_date'),
    initialData: [],
  });

  // Filter only student coaches
  const healthCoaches = allUsers.filter(u => u.user_type === 'student_coach');

  // Filter by search query and plan
  const filteredCoaches = healthCoaches.filter(coach => {
    const matchesSearch = !searchQuery.trim() || 
      coach.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterPlan === "all") return matchesSearch;
    if (filterPlan === "no_plan") {
      const sub = getCoachSubscription(coach.email);
      return matchesSearch && !sub;
    }
    
    const sub = getCoachSubscription(coach.email);
    return matchesSearch && sub?.plan_id === filterPlan;
  });

  // Get subscription for each coach
  const getCoachSubscription = (coachEmail) => {
    return allSubscriptions.find(sub => 
      sub.coach_email === coachEmail && sub.status === 'active'
    );
  };

  const createCoachMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createUserWithPassword', {
        email: data.email.trim(),
        full_name: data.full_name.trim(),
        password: data.password,
        user_type: 'student_coach'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      setShowAddCoachDialog(false);
      setCoachFormData({ full_name: "", email: "", phone: "", password: "TempPass123!" });
      toast.success('Health coach created successfully!');
    },
    onError: (error) => {
      console.error('Error creating coach:', error);
      toast.error(error?.response?.data?.error || 'Failed to create health coach');
    }
  });

  const assignSubscriptionMutation = useMutation({
    mutationFn: async (data) => {
      const plan = coachPlans.find(p => p.id === data.plan_id);
      if (!plan) throw new Error('Plan not found');

      const start = data.start_date ? new Date(data.start_date) : new Date();
      let end;

      if (data.end_date) {
        end = new Date(data.end_date);
      } else {
        end = new Date(start);
        let totalMonths = data.billing_cycle === 'yearly' ? 12 : 1;
        if (data.extra_months) totalMonths += parseInt(data.extra_months);
        end.setMonth(end.getMonth() + totalMonths);
      }

      const subscriptionData = {
        coach_email: data.coach_email,
        coach_name: data.coach_name,
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
        auto_renew: false,
        ai_credits_purchased: 0
      };

      // Cancel existing active subscriptions for this coach
      const existingSubs = allSubscriptions.filter(
        sub => sub.coach_email === data.coach_email && sub.status === 'active'
      );
      for (const sub of existingSubs) {
        await base44.entities.HealthCoachSubscription.update(sub.id, { status: 'cancelled' });
      }

      return await base44.entities.HealthCoachSubscription.create(subscriptionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowEditDialog(false);
      setSubscriptionFormData({ plan_id: "", billing_cycle: "yearly", start_date: "", end_date: "", extra_months: "" });
      toast.success('Subscription assigned successfully!');
    },
    onError: (error) => {
      console.error('Error assigning subscription:', error);
      toast.error('Failed to assign subscription');
    }
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.HealthCoachSubscription.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowEditDialog(false);
      toast.success('Subscription updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update subscription');
    }
  });

  const addCreditsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('addCoachAICredits', {
        coachEmail: data.coach_email,
        creditsToAdd: parseInt(data.credits_amount),
        reason: data.reason || 'Admin manually added credits'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachSubscriptions']);
      setShowCreditsDialog(false);
      setCreditsFormData({ credits_amount: "", reason: "" });
      toast.success('AI Credits added successfully!');
    },
    onError: () => {
      toast.error('Failed to add AI credits');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('changeUserPassword', {
        email: data.email,
        newPassword: data.password
      });
      return response.data;
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      setNewPassword("");
      toast.success('Password changed successfully!');
    },
    onError: (error) => {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    }
  });

  const deleteCoachMutation = useMutation({
    mutationFn: async (userId) => {
      return await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      toast.success('Health coach deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete health coach');
    }
  });

  const handleSubmitAddCoach = () => {
    if (!coachFormData.email || !coachFormData.full_name) {
      toast.error('Please fill in email and name');
      return;
    }
    createCoachMutation.mutate(coachFormData);
  };

  const handleAssignSubscription = (coach) => {
    setSelectedCoach(coach);
    const existingSub = getCoachSubscription(coach.email);
    if (existingSub) {
      setSubscriptionFormData({
        plan_id: existingSub.plan_id,
        billing_cycle: existingSub.billing_cycle,
        start_date: existingSub.start_date,
        end_date: existingSub.end_date,
        extra_months: ""
      });
    }
    setShowEditDialog(true);
  };

  const handleSubmitSubscription = () => {
    if (!subscriptionFormData.plan_id) {
      toast.error('Please select a plan');
      return;
    }

    const existingSub = getCoachSubscription(selectedCoach.email);
    
    if (existingSub) {
      // Update existing subscription
      const plan = coachPlans.find(p => p.id === subscriptionFormData.plan_id);
      const updateData = {
        plan_id: subscriptionFormData.plan_id,
        plan_name: plan?.plan_name,
        billing_cycle: subscriptionFormData.billing_cycle,
        start_date: subscriptionFormData.start_date || existingSub.start_date,
        end_date: subscriptionFormData.end_date || existingSub.end_date,
      };
      updateSubscriptionMutation.mutate({ id: existingSub.id, data: updateData });
    } else {
      // Create new subscription
      assignSubscriptionMutation.mutate({
        ...subscriptionFormData,
        coach_email: selectedCoach.email,
        coach_name: selectedCoach.full_name
      });
    }
  };

  const handleAddCredits = (coach) => {
    setSelectedCoach(coach);
    setShowCreditsDialog(true);
  };

  const handleChangePassword = (coach) => {
    setSelectedCoach(coach);
    setNewPassword("");
    setShowPasswordDialog(true);
  };

  const handleSubmitPasswordChange = () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      email: selectedCoach.email,
      password: newPassword
    });
  };

  const handleSubmitCredits = () => {
    if (!creditsFormData.credits_amount || parseInt(creditsFormData.credits_amount) <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }
    addCreditsMutation.mutate({
      coach_email: selectedCoach.email,
      ...creditsFormData
    });
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            Only Super Admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-10 h-10 text-green-600" />
                <Badge className="bg-green-600 text-white">
                  {healthCoaches.length} Health Coaches
                </Badge>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Health Coaches Management</h1>
              <p className="text-gray-600">Manage all health coaches, subscriptions, and AI credits</p>
            </div>
            <Button onClick={() => setShowAddCoachDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-5 h-5 mr-2" />
              Add Health Coach
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="no_plan">No Plan</SelectItem>
                {coachPlans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.plan_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Health Coaches List */}
        <div className="space-y-4">
          {filteredCoaches.length === 0 && searchQuery.trim() ? (
            <Card className="border-none shadow-xl">
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No coaches found</h3>
                <p className="text-gray-600">Try adjusting your search query</p>
              </CardContent>
            </Card>
          ) : healthCoaches.length === 0 ? (
            <Card className="border-none shadow-xl">
              <CardContent className="p-12 text-center">
                <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No health coaches yet</h3>
                <p className="text-gray-600 mb-4">Add your first health coach to get started</p>
                <Button onClick={() => setShowAddCoachDialog(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Health Coach
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredCoaches.map((coach) => {
              const subscription = getCoachSubscription(coach.email);
              const plan = subscription ? coachPlans.find(p => p.id === subscription.plan_id) : null;
              
              return (
                <Card key={coach.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{coach.full_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              {coach.email}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                          {/* Subscription Status */}
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Crown className="w-4 h-4 text-purple-600" />
                              <p className="text-xs font-semibold text-gray-600">Subscription</p>
                            </div>
                            {subscription ? (
                              <>
                                <p className="font-bold text-gray-900">{plan?.plan_name || 'Unknown Plan'}</p>
                                <Badge className={subscription.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                                  {subscription.status}
                                </Badge>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No active plan</p>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <p className="text-xs font-semibold text-gray-600">Subscription Period</p>
                            </div>
                            {subscription ? (
                              <>
                                <p className="text-xs text-gray-700">
                                  Start: {new Date(subscription.start_date).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-700">
                                  End: {new Date(subscription.end_date).toLocaleDateString()}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">-</p>
                            )}
                          </div>

                          {/* AI Credits */}
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-4 h-4 text-orange-600" />
                              <p className="text-xs font-semibold text-gray-600">AI Credits</p>
                            </div>
                            {subscription ? (
                              <>
                                <p className="font-bold text-gray-900">
                                  {subscription.ai_credits_purchased || 0}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Used: {subscription.ai_credits_used_this_month || 0}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">-</p>
                            )}
                          </div>

                          {/* Account Info */}
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-600" />
                              <p className="text-xs font-semibold text-gray-600">Account</p>
                            </div>
                            <p className="text-xs text-gray-700">
                              Created: {new Date(coach.created_date).toLocaleDateString()}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              ID: {coach.id.substring(0, 8)}...
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleAssignSubscription(coach)}
                          variant="outline"
                          size="sm"
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          {subscription ? 'Edit Plan' : 'Assign Plan'}
                        </Button>
                        <Button
                          onClick={() => handleAddCredits(coach)}
                          variant="outline"
                          size="sm"
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Add Credits
                        </Button>
                        <Button
                          onClick={() => handleChangePassword(coach)}
                          variant="outline"
                          size="sm"
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Change Password
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm(`Delete ${coach.full_name}?`)) {
                              deleteCoachMutation.mutate(coach.id);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Add Coach Dialog */}
        <Dialog open={showAddCoachDialog} onOpenChange={setShowAddCoachDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-green-600" />
                Add New Health Coach
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={coachFormData.full_name}
                  onChange={(e) => setCoachFormData({ ...coachFormData, full_name: e.target.value })}
                  placeholder="Dr. John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={coachFormData.email}
                  onChange={(e) => setCoachFormData({ ...coachFormData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input
                  value={coachFormData.phone}
                  onChange={(e) => setCoachFormData({ ...coachFormData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900 text-sm">
                  Coach will be created with temporary password: <strong>TempPass123!</strong>
                  <br />They should change it after first login.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddCoachDialog(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitAddCoach}
                  disabled={createCoachMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createCoachMutation.isPending ? 'Creating...' : 'Create Health Coach'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Subscription Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                Manage Subscription - {selectedCoach?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Plan *</Label>
                <Select
                  value={subscriptionFormData.plan_id}
                  onValueChange={(value) => setSubscriptionFormData({ ...subscriptionFormData, plan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
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
                <Select
                  value={subscriptionFormData.billing_cycle}
                  onValueChange={(value) => setSubscriptionFormData({ ...subscriptionFormData, billing_cycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={subscriptionFormData.start_date}
                    onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={subscriptionFormData.end_date}
                    onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Extra Months (Bonus)</Label>
                <Input
                  type="number"
                  value={subscriptionFormData.extra_months}
                  onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, extra_months: e.target.value })}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500">Add bonus months to the subscription</p>
              </div>

              <Alert className="bg-purple-50 border-purple-200">
                <AlertDescription className="text-purple-900 text-sm">
                  This will {getCoachSubscription(selectedCoach?.email) ? 'update the existing' : 'create a new'} subscription for this coach.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => setShowEditDialog(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitSubscription}
                  disabled={assignSubscriptionMutation.isPending || updateSubscriptionMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {(assignSubscriptionMutation.isPending || updateSubscriptionMutation.isPending) ? 'Saving...' : 'Save Subscription'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Credits Dialog */}
        <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                Add AI Credits - {selectedCoach?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Credits to Add *</Label>
                <Input
                  type="number"
                  value={creditsFormData.credits_amount}
                  onChange={(e) => setCreditsFormData({ ...creditsFormData, credits_amount: e.target.value })}
                  placeholder="e.g., 100"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={creditsFormData.reason}
                  onChange={(e) => setCreditsFormData({ ...creditsFormData, reason: e.target.value })}
                  placeholder="e.g., Bonus credits for referral"
                  rows={3}
                />
              </div>
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-900 text-sm">
                  These credits will be added to the coach's account immediately.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={() => setShowCreditsDialog(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitCredits}
                  disabled={addCreditsMutation.isPending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {addCreditsMutation.isPending ? 'Adding...' : 'Add Credits'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Change Password - {selectedCoach?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password *</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900 text-sm">
                  The new password will be set immediately. Make sure to inform the coach.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={() => setShowPasswordDialog(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPasswordChange}
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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