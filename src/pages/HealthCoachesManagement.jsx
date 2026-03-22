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
  Clock,
  CalendarPlus,
  User,
  KeyRound
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
  const [extendPlanDialog, setExtendPlanDialog] = useState(false);
  const [editCoachDialog, setEditCoachDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);

  // Form states
  const [newCoach, setNewCoach] = useState({
    full_name: '',
    email: '',
    phone: '',
    plan_id: '',
    billing_cycle: 'monthly',
    extra_months: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
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

  const [extendForm, setExtendForm] = useState({
    extra_months: 1,
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false,
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
      return users.filter(u => {
        // Handle various storage formats for user_type
        const userType = u.user_type || u.role || u.data?.user_type;
        const isDeleted = u.is_deleted || u.data?.is_deleted;
        return userType === 'student_coach' && !isDeleted;
      });
    },
    enabled: !!user && user?.user_type === 'super_admin',
    initialData: [],
  });

  // Fetch pending coaches (invited but not yet logged in)
  const { data: coachHistory } = useQuery({
    queryKey: ['coachHistory'],
    queryFn: () => base44.entities.CoachSubscriptionHistory.filter({ action_type: 'account_created' }),
    initialData: [],
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
      // Create user via backend function
      const response = await base44.functions.invoke('createUserWithPassword', {
        email: coachData.email,
        full_name: coachData.full_name,
        user_type: 'student_coach',
        password: 'TempPass@123', // Default temporary password
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Update phone if provided
      if (coachData.phone && response.data?.user_id) {
        try {
          await base44.entities.User.update(response.data.user_id, { phone: coachData.phone });
        } catch (error) {
          console.log('Could not update phone:', error);
        }
      }

      // Record creation in history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: coachData.email,
        coach_name: coachData.full_name,
        action_type: 'account_created',
        performed_by: user.email,
        notes: 'Account created directly with temporary password',
      });

      // Assign plan if selected
      if (coachData.plan_id) {
        const plan = plans.find(p => p.id === coachData.plan_id);
        if (plan) {
          // Calculate end date based on billing cycle
          const startDate = new Date(coachData.start_date);
          let endDate;
          if (coachData.end_date) {
            endDate = new Date(coachData.end_date);
          } else {
            endDate = new Date(startDate);
            if (coachData.billing_cycle === 'monthly') {
              endDate.setMonth(endDate.getMonth() + 1);
            } else {
              endDate.setFullYear(endDate.getFullYear() + 1);
            }
            // Add extra months if specified
            if (coachData.extra_months > 0) {
              endDate.setMonth(endDate.getMonth() + parseInt(coachData.extra_months));
            }
          }

          await base44.entities.HealthCoachSubscription.create({
            coach_email: coachData.email,
            coach_name: coachData.full_name,
            plan_id: plan.id,
            plan_name: plan.plan_name,
            billing_cycle: coachData.billing_cycle,
            amount: coachData.billing_cycle === 'monthly' ? plan.monthly_price : plan.yearly_price,
            currency: 'INR',
            start_date: coachData.start_date,
            end_date: endDate.toISOString().split('T')[0],
            next_billing_date: endDate.toISOString().split('T')[0],
            status: 'active',
            payment_method: 'manual',
            auto_renew: false,
            manually_granted: true,
            granted_by: user.email,
            ai_credits_used_this_month: 0,
            ai_credits_purchased: 0,
            ai_credits_reset_date: coachData.start_date,
          });

          await base44.entities.CoachSubscriptionHistory.create({
            coach_email: coachData.email,
            coach_name: coachData.full_name,
            action_type: 'plan_assigned',
            new_value: plan.plan_name,
            plan_name: plan.plan_name,
            performed_by: user.email,
          });
        }
      }

      // Assign plan if selected
      if (coachData.plan_id) {
        const plan = plans.find(p => p.id === coachData.plan_id);
        if (plan) {
          // Calculate end date based on billing cycle
          const startDate = new Date(coachData.start_date);
          let endDate;
          if (coachData.end_date) {
            endDate = new Date(coachData.end_date);
          } else {
            endDate = new Date(startDate);
            if (coachData.billing_cycle === 'monthly') {
              endDate.setMonth(endDate.getMonth() + 1);
            } else {
              endDate.setFullYear(endDate.getFullYear() + 1);
            }
            // Add extra months if specified
            if (coachData.extra_months > 0) {
              endDate.setMonth(endDate.getMonth() + parseInt(coachData.extra_months));
            }
          }

          await base44.entities.HealthCoachSubscription.create({
            coach_email: coachData.email,
            coach_name: coachData.full_name,
            plan_id: plan.id,
            plan_name: plan.plan_name,
            billing_cycle: coachData.billing_cycle,
            amount: coachData.billing_cycle === 'monthly' ? plan.monthly_price : plan.yearly_price,
            currency: 'INR',
            start_date: coachData.start_date,
            end_date: endDate.toISOString().split('T')[0],
            next_billing_date: endDate.toISOString().split('T')[0],
            status: 'active',
            payment_method: 'manual',
            auto_renew: false,
            manually_granted: true,
            granted_by: user.email,
            ai_credits_used_this_month: 0,
            ai_credits_purchased: 0,
            ai_credits_reset_date: coachData.start_date,
          });

          await base44.entities.CoachSubscriptionHistory.create({
            coach_email: coachData.email,
            coach_name: coachData.full_name,
            action_type: 'plan_assigned',
            new_value: plan.plan_name,
            plan_name: plan.plan_name,
            performed_by: user.email,
          });
        }
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      setAddCoachDialog(false);
      setNewCoach({ full_name: '', email: '', phone: '', plan_id: '', billing_cycle: 'monthly', extra_months: 0, start_date: new Date().toISOString().split('T')[0], end_date: '' });
      toast.success('Health Coach created successfully!');
    },
    onError: (error) => {
      console.error('Create coach error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add Health Coach';
      toast.error(errorMessage);
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

  // Extend plan mutation
  const extendPlanMutation = useMutation({
    mutationFn: async (data) => {
      const coachSubs = subscriptions.filter(s => s.coach_email === selectedCoach.email && s.status === 'active');
      if (coachSubs.length === 0) {
        throw new Error('No active subscription found');
      }

      const sub = coachSubs[0];
      const currentEndDate = new Date(sub.end_date);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(data.extra_months));

      await base44.entities.HealthCoachSubscription.update(sub.id, {
        end_date: newEndDate.toISOString().split('T')[0],
        next_billing_date: newEndDate.toISOString().split('T')[0],
      });

      // Record history
      await base44.entities.CoachSubscriptionHistory.create({
        coach_email: selectedCoach.email,
        coach_name: selectedCoach.full_name,
        action_type: 'plan_extended',
        amount: parseInt(data.extra_months),
        old_value: sub.end_date,
        new_value: newEndDate.toISOString().split('T')[0],
        performed_by: user.email,
        notes: `Extended by ${data.extra_months} month(s)`,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      setExtendPlanDialog(false);
      setExtendForm({ extra_months: 1 });
      toast.success('Plan extended successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to extend plan');
    },
  });

  // Edit coach mutation
  const editCoachMutation = useMutation({
    mutationFn: async (data) => {
      // Update user details using backend function for proper permissions
      const response = await base44.functions.invoke('updateCoachProfile', {
        coach_id: data.coach_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        old_email: data.old_email,
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      queryClient.invalidateQueries(['healthCoachSubscriptions']);
      setEditCoachDialog(false);
      setSelectedCoach(null);
      toast.success('Coach details updated successfully!');
    },
    onError: (error) => {
      console.error('Edit coach error:', error);
      toast.error(error.message || 'Failed to update coach details');
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

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ coachEmail, password }) => {
      const response = await base44.functions.invoke('changeUserPassword', {
        targetUserEmail: coachEmail,
        password: password,
      });
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      setChangePasswordDialog(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setSelectedCoach(null);
      toast.success('Password changed successfully!');
    },
    onError: (error) => {
      console.error('Password change error:', error);
      toast.error(error?.response?.data?.error || error.message || 'Failed to change password');
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
    if (!subscription || !subscription.end_date) return true;
    const endDate = new Date(subscription.end_date);
    if (isNaN(endDate.getTime())) return true;
    return endDate < new Date();
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (subscription) => {
    if (!subscription?.end_date) return null;
    const endDate = new Date(subscription.end_date);
    if (isNaN(endDate.getTime())) return null;
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Pending coaches = in history as account_created but NOT yet in allUsers
  const pendingCoaches = (coachHistory || []).filter(
    h => !allUsers?.some(u => u.email?.toLowerCase() === h.coach_email?.toLowerCase())
  );

  // Coaches with wrong role (in allUsers via data.user_type but top-level role is still 'user')
  const wrongRoleCoaches = (allUsers || []).filter(u => {
    const topLevelType = u.user_type;
    const dataType = u.data?.user_type;
    // If top-level user_type is wrong but data.user_type is correct, role needs fixing
    return topLevelType !== 'student_coach' && dataType === 'student_coach';
  });

  // Handle promoting a pending coach manually
  const promoteCoachMutation = useMutation({
    mutationFn: async (coachEmail) => {
      const response = await base44.functions.invoke('createUserWithPassword', {
        email: coachEmail,
        user_type: 'student_coach',
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      queryClient.invalidateQueries(['coachHistory']);
      toast.success('Coach role fixed to student_coach successfully!');
    },
    onError: (error) => toast.error(error.message),
  });

  // Fix role for a coach already in the table but with wrong role
  const fixRoleMutation = useMutation({
    mutationFn: async (coach) => {
      const response = await base44.functions.invoke('createUserWithPassword', {
        email: coach.email,
        full_name: coach.full_name,
        user_type: 'student_coach',
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allHealthCoaches']);
      toast.success('Role fixed successfully!');
    },
    onError: (error) => toast.error(error.message),
  });

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              Health Coaches Management
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">Manage onboarding, subscriptions, and AI credits</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 px-4 text-sm border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={async () => {
                const allU = await base44.entities.User.list();
                const coachHistoryEmails = (coachHistory || []).map(h => h.coach_email?.toLowerCase());
                const stuckCoaches = allU.filter(u => {
                  const email = u.email?.toLowerCase();
                  const dataType = u.data?.user_type;
                  const topType = u.user_type;
                  return coachHistoryEmails.includes(email) && dataType === 'student_coach' && topType !== 'student_coach';
                });
                if (stuckCoaches.length === 0) {
                  toast.success('All coaches have correct roles!');
                  return;
                }
                toast.info(`Fixing roles for ${stuckCoaches.length} coach(es)...`);
                for (const c of stuckCoaches) {
                  await base44.functions.invoke('createUserWithPassword', { email: c.email, user_type: 'student_coach' });
                }
                queryClient.invalidateQueries(['allHealthCoaches']);
                toast.success(`Fixed ${stuckCoaches.length} coach role(s)!`);
              }}
            >
              <Shield className="w-4 h-4 mr-2" />
              Bulk Fix Roles
            </Button>
            <Dialog open={addCoachDialog} onOpenChange={setAddCoachDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:shadow-xl transition-all h-10 px-4 text-sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Coach
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                    <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  Add New Health Coach
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Create a new Health Coach account directly
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 md:space-y-5 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Full Name *</Label>
                  <Input
                    value={newCoach.full_name}
                    onChange={(e) => setNewCoach({ ...newCoach, full_name: e.target.value })}
                    placeholder="Enter full name"
                    className="h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Email ID *</Label>
                  <Input
                    type="email"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value.trim().toLowerCase() })}
                    placeholder="coach@example.com"
                    className="h-10 md:h-11 text-sm md:text-base"
                  />
                  <p className="text-xs text-gray-500">Must be a valid email (e.g., name@example.com)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm font-semibold">Mobile Number</Label>
                  <Input
                    value={newCoach.phone}
                    onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                    placeholder="Enter mobile number (optional)"
                    className="h-10 md:h-11 text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Select Plan (Optional)</Label>
                  <Select value={newCoach.plan_id} onValueChange={(value) => setNewCoach({ ...newCoach, plan_id: value })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose a plan (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Plan</SelectItem>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.plan_name} - ₹{plan.monthly_price}/month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newCoach.plan_id && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-semibold">Billing Cycle *</Label>
                      <Select value={newCoach.billing_cycle} onValueChange={(value) => setNewCoach({ ...newCoach, billing_cycle: value })}>
                        <SelectTrigger className="h-10 md:h-11 text-sm md:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-semibold">Extra Months (Optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newCoach.extra_months}
                        onChange={(e) => setNewCoach({ ...newCoach, extra_months: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-10 md:h-11 text-sm md:text-base"
                      />
                      <p className="text-xs text-gray-500">Add extra months to the subscription period</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-semibold">Start Date *</Label>
                      <Input
                        type="date"
                        value={newCoach.start_date}
                        onChange={(e) => setNewCoach({ ...newCoach, start_date: e.target.value })}
                        className="h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs md:text-sm font-semibold">End Date (Optional)</Label>
                      <Input
                        type="date"
                        value={newCoach.end_date}
                        onChange={(e) => setNewCoach({ ...newCoach, end_date: e.target.value })}
                        placeholder="Leave empty for auto-calculation"
                        className="h-10 md:h-11 text-sm md:text-base"
                      />
                      <p className="text-xs text-gray-500">
                        Leave empty to auto-calculate ({newCoach.billing_cycle === 'monthly' ? '1 month' : '1 year'} from start date)
                      </p>
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 md:p-4">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Shield className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div className="text-xs md:text-sm text-blue-900 flex-1">
                      <p className="font-bold mb-1">Direct Account Creation</p>
                      <p className="text-xs md:text-sm">Account will be created with temporary password: <strong>TempPass@123</strong></p>
                      <p className="text-xs mt-2 text-blue-700">Coach should change password after first login</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(newCoach.email)) {
                      toast.error('Please enter a valid email address (e.g., name@example.com)');
                      return;
                    }
                    createCoachMutation.mutate(newCoach);
                  }}
                  disabled={!newCoach.full_name || !newCoach.email || createCoachMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 h-11 md:h-12 text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {createCoachMutation.isPending ? 'Creating...' : 'Create Health Coach'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-none shadow hover:shadow-md transition-shadow bg-white/80 backdrop-blur">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-gray-600">Total Coaches</CardTitle>
                <UserPlus className="w-4 h-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{allUsers?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Registered</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-green-700">Active</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {subscriptions.filter(s => s.status === 'active' && !isPlanExpired(s)).length}
              </p>
              <p className="text-xs text-green-600 mt-1">Plans</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-pink-50">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-red-700">Expired</CardTitle>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-2xl md:text-3xl font-bold text-red-600">
                {subscriptions.filter(s => s.status === 'active' && isPlanExpired(s)).length}
              </p>
              <p className="text-xs text-red-600 mt-1">Need renewal</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow hover:shadow-md transition-shadow bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-orange-700">Plans</CardTitle>
                <Crown className="w-4 h-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-2xl md:text-3xl font-bold text-orange-600">{plans?.length || 0}</p>
              <p className="text-xs text-orange-600 mt-1">Available</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-none shadow bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-gray-100 py-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-base">Search & Filter</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search name, email, or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Status" />
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
                  <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Plan" />
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

        {/* Wrong Role Section */}
        {wrongRoleCoaches.length > 0 && (
          <Card className="border-2 border-red-300 bg-red-50/80 shadow">
            <CardHeader className="border-b border-red-200 py-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <CardTitle className="text-base text-red-800">Wrong Role Detected ({wrongRoleCoaches.length})</CardTitle>
                <Badge className="bg-red-200 text-red-800 text-xs">Needs Fix</Badge>
              </div>
              <p className="text-xs text-red-700 mt-1">These coaches have correct data internally but wrong top-level role. Click Fix Role to correct them.</p>
            </CardHeader>
            <CardContent className="pt-3 px-0">
              <Table className="text-sm">
                <TableBody>
                  {wrongRoleCoaches.map((coach, idx) => (
                    <TableRow key={idx} className="hover:bg-red-100/50">
                      <TableCell className="py-2 text-xs font-medium">{coach.full_name || '—'}</TableCell>
                      <TableCell className="py-2 text-xs text-gray-600">{coach.email}</TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => fixRoleMutation.mutate(coach)}
                          disabled={fixRoleMutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Fix Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pending Coaches Section */}
        {pendingCoaches.length > 0 && (
          <Card className="border-2 border-amber-300 bg-amber-50/80 shadow">
            <CardHeader className="border-b border-amber-200 py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-base text-amber-800">Pending Login ({pendingCoaches.length})</CardTitle>
                <Badge className="bg-amber-200 text-amber-800 text-xs">Awaiting First Login</Badge>
              </div>
              <p className="text-xs text-amber-700 mt-1">These coaches have been invited but haven't logged in yet. Once they log in, they'll be auto-promoted to Health Coach role.</p>
            </CardHeader>
            <CardContent className="pt-3 px-0">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-2">Name</TableHead>
                    <TableHead className="text-xs py-2">Email</TableHead>
                    <TableHead className="text-xs py-2">Invited On</TableHead>
                    <TableHead className="text-xs py-2 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCoaches.map((h, idx) => (
                    <TableRow key={idx} className="hover:bg-amber-100/50">
                      <TableCell className="py-2 text-xs font-medium">{h.coach_name || '—'}</TableCell>
                      <TableCell className="py-2 text-xs text-gray-600">{h.coach_email}</TableCell>
                      <TableCell className="py-2 text-xs text-gray-500">
                        {h.created_date ? new Date(h.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs hover:bg-green-50 hover:text-green-700 border-green-300"
                          onClick={() => promoteCoachMutation.mutate(h.coach_email)}
                          disabled={promoteCoachMutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Promote Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Coaches Table */}
        <Card className="border-none shadow bg-white/80 backdrop-blur">
          <CardHeader className="border-b border-gray-100 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg">Coaches ({filteredCoaches.length})</CardTitle>
              <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-3 py-0.5 text-xs">
                {filteredCoaches.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 hover:bg-gradient-to-r">
                    <TableHead className="font-semibold text-gray-900 text-xs py-2">Name</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs py-2">Contact</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs py-2">Plan</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs py-2">Dates</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs py-2">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs py-2">AI Credits</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs py-2 text-right">Actions</TableHead>
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
                        <TableCell className="font-semibold text-gray-900 py-2 text-xs">{coach.full_name}</TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <p className="text-gray-600 truncate max-w-[150px]">{coach.email}</p>
                            <p className="text-gray-500">{coach.phone || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {plan ? (
                            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              {plan.plan_name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 text-xs">No Plan</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="space-y-1 text-xs">
                            {subscription?.start_date && !isNaN(new Date(subscription.start_date).getTime()) && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {new Date(subscription.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </div>
                            )}
                            {subscription?.end_date && !isNaN(new Date(subscription.end_date).getTime()) && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {new Date(subscription.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </div>
                            )}
                            {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7 && (
                              <Badge className="bg-amber-100 text-amber-800 text-xs">
                                {daysUntilExpiry}d left
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {subscription && !expired ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {expired ? 'Expired' : 'No Plan'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-[80px]">
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="w-3 h-3 text-orange-500" />
                              <p className="font-bold text-gray-900 text-xs">{credits.remaining}</p>
                              <span className="text-xs text-gray-400">/ {credits.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-red-600 h-1 rounded-full transition-all"
                                style={{ width: `${credits.total > 0 ? (credits.remaining / credits.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setEditForm({
                                  full_name: coach.full_name,
                                  email: coach.email,
                                  phone: coach.phone || '',
                                });
                                setEditCoachDialog(true);
                              }}
                            >
                              <User className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setPasswordForm({ newPassword: '', confirmPassword: '' });
                                setChangePasswordDialog(true);
                              }}
                            >
                              <KeyRound className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setAssignPlanDialog(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {subscription && subscription.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-green-50 hover:text-green-600 hover:border-green-300 h-7 w-7 p-0"
                                onClick={() => {
                                  setSelectedCoach(coach);
                                  setExtendPlanDialog(true);
                                }}
                              >
                                <CalendarPlus className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setAddCreditsDialog(true);
                              }}
                            >
                              <Sparkles className="w-3 h-3" />
                            </Button>
                            {subscription && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-7 w-7 p-0 ${subscription.status === 'active' && !expired
                                  ? "hover:bg-red-50 hover:text-red-600 hover:border-red-300" 
                                  : "hover:bg-green-50 hover:text-green-600 hover:border-green-300"}`}
                                onClick={() => toggleAccessMutation.mutate({ 
                                  coachEmail: coach.email,
                                  coachName: coach.full_name,
                                  enable: subscription.status !== 'active' || expired
                                })}
                              >
                                {subscription.status === 'active' && !expired ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedCoach(coach);
                                setDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
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

        {/* Extend Plan Dialog */}
        <Dialog open={extendPlanDialog} onOpenChange={setExtendPlanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-green-600" />
                Extend Plan Duration
              </DialogTitle>
              <DialogDescription>
                Extend the subscription period for {selectedCoach?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCoach && getCoachSubscription(selectedCoach.email)?.end_date && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Current End Date:</strong> {new Date(getCoachSubscription(selectedCoach.email).end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {extendForm.extra_months > 0 && (() => {
                    const currentEndDate = new Date(getCoachSubscription(selectedCoach.email).end_date);
                    const newEndDate = new Date(currentEndDate);
                    newEndDate.setMonth(newEndDate.getMonth() + parseInt(extendForm.extra_months));
                    return (
                      <p className="text-sm text-green-900">
                        <strong>New End Date:</strong> {newEndDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    );
                  })()}
                </div>
              )}
              <div>
                <Label>Extend By (Months) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={extendForm.extra_months}
                  onChange={(e) => setExtendForm({ extra_months: parseInt(e.target.value) || 1 })}
                  placeholder="Enter number of months"
                />
              </div>
              <Button
                onClick={() => extendPlanMutation.mutate(extendForm)}
                disabled={extendForm.extra_months <= 0 || extendPlanMutation.isPending}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
              >
                {extendPlanMutation.isPending ? 'Extending...' : `Extend by ${extendForm.extra_months} Month(s)`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Coach Dialog */}
        <Dialog open={editCoachDialog} onOpenChange={setEditCoachDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Edit Coach Details
              </DialogTitle>
              <DialogDescription>
                Update name, email, or phone for {selectedCoach?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label>Email ID *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value.trim().toLowerCase() })}
                  placeholder="coach@example.com"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  <strong>Note:</strong> Changing email will update all subscription records. Login credentials will use the new email.
                </p>
              </div>
              <Button
                onClick={() => {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(editForm.email)) {
                    toast.error('Please enter a valid email address');
                    return;
                  }
                  if (!selectedCoach) {
                    toast.error('No coach selected');
                    return;
                  }
                  editCoachMutation.mutate({
                    ...editForm,
                    coach_id: selectedCoach.id,
                    old_email: selectedCoach.email
                  });
                }}
                disabled={!editForm.full_name || !editForm.email || editCoachMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {editCoachMutation.isPending ? 'Updating...' : 'Update Details'}
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

        {/* Change Password Dialog */}
        <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Change Coach Password
              </DialogTitle>
              <DialogDescription>
                Set a new password for {selectedCoach?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  <strong>Note:</strong> Password will be changed without requiring the old password. Make sure to inform the coach about the new password.
                </p>
              </div>
              <div>
                <Label>New Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirm New Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (passwordForm.newPassword.length < 6) {
                    toast.error('Password must be at least 6 characters');
                    return;
                  }
                  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    toast.error('Passwords do not match');
                    return;
                  }
                  changePasswordMutation.mutate({
                    coachEmail: selectedCoach.email,
                    password: passwordForm.newPassword,
                  });
                }}
                disabled={!passwordForm.newPassword || !passwordForm.confirmPassword || changePasswordMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
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
    </div>
  );
}