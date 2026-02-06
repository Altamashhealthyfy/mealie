import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  UserPlus, 
  Search, 
  Shield, 
  Crown,
  Sparkles,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  Plus,
  Filter,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export default function HealthCoachesManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [addCoachDialog, setAddCoachDialog] = useState(false);
  const [assignPlanDialog, setAssignPlanDialog] = useState(false);
  const [addCreditsDialog, setAddCreditsDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);

  // Form states
  const [newCoach, setNewCoach] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [planForm, setPlanForm] = useState({
    plan_id: '',
    billing_cycle: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  const [creditsForm, setCreditsForm] = useState({
    credits: 0,
  });

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch all health coaches
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['allHealthCoaches'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'student_coach');
    },
  });

  // Fetch all subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['healthCoachSubscriptions'],
    queryFn: () => base44.entities.HealthCoachSubscription.list(),
    initialData: [],
  });

  // Fetch all plans
  const { data: plans } = useQuery({
    queryKey: ['healthCoachPlans'],
    queryFn: () => base44.entities.HealthCoachPlan.list(),
    initialData: [],
  });

  // Create Health Coach mutation
  const createCoachMutation = useMutation({
    mutationFn: async (coachData) => {
      const response = await base44.functions.invoke('createUserWithPassword', {
        email: coachData.email,
        full_name: coachData.full_name,
        phone: coachData.phone,
        user_type: 'student_coach',
        password: 'HFI@23',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      setAddCoachDialog(false);
      setNewCoach({ full_name: '', email: '', phone: '' });
      toast.success('Health Coach added successfully! Password: HFI@23');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add Health Coach');
    },
  });

  // Assign plan mutation
  const assignPlanMutation = useMutation({
    mutationFn: async (data) => {
      const plan = plans.find(p => p.id === data.plan_id);
      if (!plan) throw new Error('Plan not found');

      // Calculate end date based on billing cycle
      const startDate = new Date(data.start_date);
      const endDate = new Date(startDate);
      if (data.billing_cycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Check if subscription exists
      const existingSubs = subscriptions.filter(s => s.coach_email === selectedCoach.email);
      
      if (existingSubs.length > 0) {
        // Cancel old subscriptions
        for (const sub of existingSubs) {
          await base44.entities.HealthCoachSubscription.update(sub.id, { status: 'cancelled' });
        }
      }

      // Create new subscription
      return await base44.entities.HealthCoachSubscription.create({
        coach_email: selectedCoach.email,
        coach_name: selectedCoach.full_name,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        billing_cycle: data.billing_cycle,
        amount: data.billing_cycle === 'monthly' ? plan.monthly_price : plan.yearly_price,
        currency: 'INR',
        start_date: data.start_date,
        end_date: endDate.toISOString().split('T')[0],
        next_billing_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_method: 'manual',
        auto_renew: false,
        manually_granted: true,
        granted_by: user.email,
        ai_credits_used_this_month: 0,
        ai_credits_purchased: 0,
        ai_credits_reset_date: startDate.toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      setAssignPlanDialog(false);
      setPlanForm({
        plan_id: '',
        billing_cycle: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
      toast.success('Plan assigned successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign plan');
    },
  });

  // Add AI credits mutation
  const addCreditsMutation = useMutation({
    mutationFn: async (data) => {
      const coachSubs = subscriptions.filter(s => s.coach_email === selectedCoach.email && s.status === 'active');
      if (coachSubs.length === 0) {
        throw new Error('No active subscription found');
      }

      const sub = coachSubs[0];
      const newCredits = (sub.ai_credits_purchased || 0) + parseInt(data.credits);

      return await base44.entities.HealthCoachSubscription.update(sub.id, {
        ai_credits_purchased: newCredits,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      setAddCreditsDialog(false);
      setCreditsForm({ credits: 0 });
      toast.success('AI Credits added successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add credits');
    },
  });

  // Toggle access mutation
  const toggleAccessMutation = useMutation({
    mutationFn: async ({ coachEmail, enable }) => {
      const coachSubs = subscriptions.filter(s => s.coach_email === coachEmail && s.status === 'active');
      if (coachSubs.length === 0) {
        throw new Error('No active subscription found');
      }

      const sub = coachSubs[0];
      return await base44.entities.HealthCoachSubscription.update(sub.id, {
        status: enable ? 'active' : 'cancelled',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      toast.success('Access updated successfully!');
    },
  });

  // Get subscription for a coach
  const getCoachSubscription = (coachEmail) => {
    return subscriptions.find(s => s.coach_email === coachEmail && s.status === 'active');
  };

  // Get plan for a subscription
  const getPlan = (planId) => {
    return plans.find(p => p.id === planId);
  };

  // Filter coaches
  const filteredCoaches = allUsers?.filter(coach => {
    const matchesSearch = 
      coach.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.phone?.includes(searchTerm);

    const subscription = getCoachSubscription(coach.email);
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && subscription?.status === 'active') ||
      (filterStatus === 'expired' && (!subscription || subscription.status !== 'active'));

    const matchesPlan = 
      filterPlan === 'all' ||
      (subscription && subscription.plan_id === filterPlan);

    return matchesSearch && matchesStatus && matchesPlan;
  }) || [];

  // Calculate AI credits
  const calculateCredits = (coachEmail) => {
    const subscription = getCoachSubscription(coachEmail);
    if (!subscription) return { total: 0, used: 0, remaining: 0 };

    const plan = getPlan(subscription.plan_id);
    const planCredits = plan?.ai_credits_per_month || 0;
    const purchasedCredits = subscription.ai_credits_purchased || 0;
    const usedCredits = subscription.ai_credits_used_this_month || 0;

    const total = planCredits + purchasedCredits;
    const remaining = total - usedCredits;

    return { total, used: usedCredits, remaining };
  };

  // Check if plan is expired
  const isPlanExpired = (subscription) => {
    if (!subscription) return true;
    const endDate = new Date(subscription.end_date);
    return endDate < new Date();
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Only super admins can access this page</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Crown className="w-8 h-8 text-orange-600" />
              Health Coaches Management
            </h1>
            <p className="text-gray-600 mt-1">Manage onboarding, subscriptions, and AI credits</p>
          </div>
          <Dialog open={addCoachDialog} onOpenChange={setAddCoachDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <UserPlus className="w-5 h-5 mr-2" />
                Add Health Coach
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Health Coach</DialogTitle>
                <DialogDescription>
                  Create a new Health Coach account with default password: HFI@23
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newCoach.full_name}
                    onChange={(e) => setNewCoach({ ...newCoach, full_name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label>Email ID *</Label>
                  <Input
                    type="email"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label>Mobile Number *</Label>
                  <Input
                    value={newCoach.phone}
                    onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                    placeholder="Enter mobile number"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Default Password</p>
                      <p>Account will be created with password: <strong>HFI@23</strong></p>
                      <p className="text-xs mt-1">Coach will be required to change password on first login</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => createCoachMutation.mutate(newCoach)}
                  disabled={!newCoach.full_name || !newCoach.email || !newCoach.phone || createCoachMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600"
                >
                  {createCoachMutation.isPending ? 'Creating...' : 'Create Health Coach'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Coaches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{allUsers?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {subscriptions.filter(s => s.status === 'active' && !isPlanExpired(s)).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Expired Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {subscriptions.filter(s => s.status === 'active' && isPlanExpired(s)).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Available Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{plans?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by name, email, or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.plan_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coaches Table */}
        <Card>
          <CardHeader>
            <CardTitle>Health Coaches ({filteredCoaches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Credits</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoaches.map(coach => {
                    const subscription = getCoachSubscription(coach.email);
                    const plan = subscription ? getPlan(subscription.plan_id) : null;
                    const credits = calculateCredits(coach.email);
                    const expired = subscription ? isPlanExpired(subscription) : true;

                    return (
                      <TableRow key={coach.id}>
                        <TableCell className="font-medium">{coach.full_name}</TableCell>
                        <TableCell>{coach.email}</TableCell>
                        <TableCell>{coach.phone || '-'}</TableCell>
                        <TableCell>
                          {plan ? (
                            <Badge className="bg-purple-100 text-purple-800">
                              {plan.plan_name}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No Plan</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscription?.start_date ? new Date(subscription.start_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {subscription && !expired ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {expired ? 'Expired' : 'No Plan'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-semibold">{credits.remaining} / {credits.total}</p>
                            <p className="text-xs text-gray-500">Used: {credits.used}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setAssignPlanDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setAddCreditsDialog(true);
                              }}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                            {subscription && !expired && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleAccessMutation.mutate({ 
                                  coachEmail: coach.email, 
                                  enable: subscription.status !== 'active' 
                                })}
                              >
                                {subscription.status === 'active' ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Assign Plan Dialog */}
        <Dialog open={assignPlanDialog} onOpenChange={setAssignPlanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subscription Plan</DialogTitle>
              <DialogDescription>
                Assign or update subscription plan for {selectedCoach?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Plan *</Label>
                <Select value={planForm.plan_id} onValueChange={(value) => setPlanForm({ ...planForm, plan_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.plan_name} - ₹{plan.monthly_price}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Cycle *</Label>
                <Select value={planForm.billing_cycle} onValueChange={(value) => setPlanForm({ ...planForm, billing_cycle: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={planForm.start_date}
                  onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                />
              </div>
              <Button
                onClick={() => assignPlanMutation.mutate(planForm)}
                disabled={!planForm.plan_id || assignPlanMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600"
              >
                {assignPlanMutation.isPending ? 'Assigning...' : 'Assign Plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Credits Dialog */}
        <Dialog open={addCreditsDialog} onOpenChange={setAddCreditsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Credits</DialogTitle>
              <DialogDescription>
                Add additional AI credits for {selectedCoach?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Number of Credits *</Label>
                <Input
                  type="number"
                  min="0"
                  value={creditsForm.credits}
                  onChange={(e) => setCreditsForm({ credits: parseInt(e.target.value) || 0 })}
                  placeholder="Enter number of credits"
                />
              </div>
              {selectedCoach && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Current Credits: <strong>{calculateCredits(selectedCoach.email).remaining}</strong> remaining
                  </p>
                </div>
              )}
              <Button
                onClick={() => addCreditsMutation.mutate(creditsForm)}
                disabled={creditsForm.credits <= 0 || addCreditsMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600"
              >
                {addCreditsMutation.isPending ? 'Adding...' : 'Add Credits'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}