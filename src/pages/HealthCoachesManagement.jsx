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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Trash2,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock
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
  const [deleteDialog, setDeleteDialog] = useState(false);
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

  // Fetch all health coaches (exclude deleted)
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['allHealthCoaches'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.user_type === 'student_coach' && !u.is_deleted);
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

      // Record creation in history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: coachData.email,
        coach_name: coachData.full_name,
        action_type: 'account_created',
        performed_by: user.email,
        notes: 'Account created with default password HFI@23',
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
      const existingSubs = subscriptions.filter(s => s.coach_email === selectedCoach.email && s.status === 'active');
      
      let actionType = 'plan_assigned';
      let oldPlanName = null;
      
      if (existingSubs.length > 0) {
        const oldSub = existingSubs[0];
        const oldPlan = plans.find(p => p.id === oldSub.plan_id);
        oldPlanName = oldPlan?.plan_name;
        
        // Determine if upgrade or downgrade
        const oldPrice = oldSub.billing_cycle === 'monthly' ? oldPlan?.monthly_price : oldPlan?.yearly_price;
        const newPrice = data.billing_cycle === 'monthly' ? plan.monthly_price : plan.yearly_price;
        actionType = newPrice > oldPrice ? 'plan_upgraded' : newPrice < oldPrice ? 'plan_downgraded' : 'plan_assigned';
        
        // Cancel old subscriptions
        for (const sub of existingSubs) {
          await base44.entities.HealthCoachSubscription.update(sub.id, { status: 'cancelled' });
        }
      }

      // Create new subscription
      const newSub = await base44.entities.HealthCoachSubscription.create({
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

      // Record history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: selectedCoach.email,
        coach_name: selectedCoach.full_name,
        action_type: actionType,
        old_value: oldPlanName,
        new_value: plan.plan_name,
        plan_name: plan.plan_name,
        performed_by: user.email,
      });

      return newSub;
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

      const updated = await base44.entities.HealthCoachSubscription.update(sub.id, {
        ai_credits_purchased: newCredits,
      });

      // Record history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: selectedCoach.email,
        coach_name: selectedCoach.full_name,
        action_type: 'credits_added',
        amount: parseInt(data.credits),
        new_value: `${newCredits} total credits`,
        performed_by: user.email,
      });

      return updated;
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
    mutationFn: async ({ coachEmail, coachName, enable }) => {
      const coachSubs = subscriptions.filter(s => s.coach_email === coachEmail);
      
      if (coachSubs.length > 0) {
        const sub = coachSubs[0];
        await base44.entities.HealthCoachSubscription.update(sub.id, {
          status: enable ? 'active' : 'cancelled',
        });
      }

      // Record history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: coachEmail,
        coach_name: coachName,
        action_type: enable ? 'access_enabled' : 'access_disabled',
        performed_by: user.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      toast.success('Access updated successfully!');
    },
  });

  // Soft delete coach mutation
  const deleteCoachMutation = useMutation({
    mutationFn: async (coach) => {
      // Update user to mark as deleted
      await base44.entities.User.update(coach.id, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
      });

      // Cancel all active subscriptions
      const coachSubs = subscriptions.filter(s => s.coach_email === coach.email && s.status === 'active');
      for (const sub of coachSubs) {
        await base44.entities.HealthCoachSubscription.update(sub.id, {
          status: 'cancelled',
        });
      }

      // Record in history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: coach.email,
        coach_name: coach.full_name,
        action_type: 'account_deleted',
        performed_by: user.email,
        notes: 'Account soft deleted - login disabled, data retained for audit',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      setDeleteDialog(false);
      setSelectedCoach(null);
      toast.success('Health Coach deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete Health Coach');
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
      (filterStatus === 'active' && subscription?.status === 'active' && !isPlanExpired(subscription)) ||
      (filterStatus === 'expired' && (!subscription || isPlanExpired(subscription)));

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

  // Calculate days until expiry
  const getDaysUntilExpiry = (subscription) => {
    if (!subscription?.end_date) return null;
    const endDate = new Date(subscription.end_date);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl shadow-lg">
                <Crown className="w-8 h-8 text-white" />
              </div>
              Health Coaches Management
            </h1>
            <p className="text-gray-600 text-lg">Manage onboarding, subscriptions, and AI credits</p>
          </div>
          <Dialog open={addCoachDialog} onOpenChange={setAddCoachDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:shadow-xl transition-all h-12 px-6">
                <UserPlus className="w-5 h-5 mr-2" />
                Add Health Coach
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  Add New Health Coach
                </DialogTitle>
                <DialogDescription>
                  Create a new Health Coach account with default password: HFI@23
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Full Name *</Label>
                  <Input
                    value={newCoach.full_name}
                    onChange={(e) => setNewCoach({ ...newCoach, full_name: e.target.value })}
                    placeholder="Enter full name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email ID *</Label>
                  <Input
                    type="email"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                    placeholder="Enter email address"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Mobile Number *</Label>
                  <Input
                    value={newCoach.phone}
                    onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                    placeholder="Enter mobile number"
                    className="h-11"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-sm text-blue-900 flex-1">
                      <p className="font-bold mb-1">Default Password</p>
                      <p>Account will be created with password: <span className="font-mono font-bold bg-blue-100 px-2 py-0.5 rounded">HFI@23</span></p>
                      <p className="text-xs mt-2 text-blue-700">Coach will be required to change password on first login</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => createCoachMutation.mutate(newCoach)}
                  disabled={!newCoach.full_name || !newCoach.email || !newCoach.phone || createCoachMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {createCoachMutation.isPending ? 'Creating...' : 'Create Health Coach'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Coaches</CardTitle>
                <UserPlus className="w-5 h-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{allUsers?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-2">Registered coaches</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-700">Active Plans</CardTitle>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600">
                {subscriptions.filter(s => s.status === 'active' && !isPlanExpired(s)).length}
              </p>
              <p className="text-xs text-green-600 mt-2">Currently active</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-red-50 to-pink-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-red-700">Expired Plans</CardTitle>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-red-600">
                {subscriptions.filter(s => s.status === 'active' && isPlanExpired(s)).length}
              </p>
              <p className="text-xs text-red-600 mt-2">Need renewal</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-orange-700">Available Plans</CardTitle>
                <Crown className="w-5 h-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-orange-600">{plans?.length || 0}</p>
              <p className="text-xs text-orange-600 mt-2">Plan options</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg">Search & Filter</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by name, email, or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-orange-500 focus:ring-orange-500">
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
                  <SelectTrigger className="h-11 border-gray-200 focus:border-orange-500 focus:ring-orange-500">
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
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Health Coaches ({filteredCoaches.length})</CardTitle>
              <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-1">
                {filteredCoaches.length} Coaches
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 hover:bg-gradient-to-r">
                    <TableHead className="font-bold text-gray-900">Name</TableHead>
                    <TableHead className="font-bold text-gray-900">Email</TableHead>
                    <TableHead className="font-bold text-gray-900">Phone</TableHead>
                    <TableHead className="font-bold text-gray-900">Plan</TableHead>
                    <TableHead className="font-bold text-gray-900">Start Date</TableHead>
                    <TableHead className="font-bold text-gray-900">End Date</TableHead>
                    <TableHead className="font-bold text-gray-900">Status</TableHead>
                    <TableHead className="font-bold text-gray-900">AI Credits</TableHead>
                    <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoaches.map(coach => {
                    const subscription = getCoachSubscription(coach.email);
                    const plan = subscription ? getPlan(subscription.plan_id) : null;
                    const credits = calculateCredits(coach.email);
                    const expired = subscription ? isPlanExpired(subscription) : true;
                    const daysUntilExpiry = getDaysUntilExpiry(subscription);

                    return (
                      <TableRow key={coach.id} className="hover:bg-orange-50/50 transition-colors">
                        <TableCell className="font-semibold text-gray-900">{coach.full_name}</TableCell>
                        <TableCell className="text-gray-600">{coach.email}</TableCell>
                        <TableCell className="text-gray-600">{coach.phone || '-'}</TableCell>
                        <TableCell>
                          {plan ? (
                            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none">
                              <Crown className="w-3 h-3 mr-1" />
                              {plan.plan_name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">No Plan</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {subscription?.start_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {new Date(subscription.start_date).toLocaleDateString()}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {subscription?.end_date ? (
                            <div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {new Date(subscription.end_date).toLocaleDateString()}
                              </div>
                              {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7 && (
                                <Badge className="mt-1 bg-amber-100 text-amber-800 text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {daysUntilExpiry}d left
                                </Badge>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {subscription && !expired ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {expired ? 'Expired' : 'No Plan'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-[100px]">
                              <div className="flex items-center gap-1 mb-1">
                                <Sparkles className="w-3 h-3 text-orange-500" />
                                <p className="font-bold text-gray-900">{credits.remaining}</p>
                                <span className="text-xs text-gray-400">/ {credits.total}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-gradient-to-r from-orange-500 to-red-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${credits.total > 0 ? (credits.remaining / credits.total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
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
                              className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setAddCreditsDialog(true);
                              }}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                            {subscription && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={subscription.status === 'active' && !expired
                                  ? "hover:bg-red-50 hover:text-red-600 hover:border-red-300" 
                                  : "hover:bg-green-50 hover:text-green-600 hover:border-green-300"}
                                onClick={() => toggleAccessMutation.mutate({ 
                                  coachEmail: coach.email,
                                  coachName: coach.full_name,
                                  enable: subscription.status !== 'active' || expired
                                })}
                              >
                                {subscription.status === 'active' && !expired ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Delete Health Coach?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Are you sure you want to delete <strong>{selectedCoach?.full_name}</strong>?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-900 font-semibold mb-2">This action will:</p>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Disable login access permanently</li>
                    <li>Cancel all active subscriptions</li>
                    <li>Retain data for audit purposes (soft delete)</li>
                    <li>Record deletion in history logs</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCoachMutation.mutate(selectedCoach)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteCoachMutation.isPending}
              >
                {deleteCoachMutation.isPending ? 'Deleting...' : 'Delete Coach'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}