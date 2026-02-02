import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCoachPlanPermissions() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: { '$in': ['active', 'trial'] }
      });
      return subs[0] || null;
    },
    enabled: !!user && user?.user_type === 'student_coach',
  });

  const { data: coachPlan, isLoading } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  const hasPermission = (permissionKey, defaultValue = false) => {
    // Super admin and team_member always have access
    if (user?.user_type === 'super_admin' || user?.user_type === 'team_member') {
      return true;
    }

    // For student_coach, check plan permissions
    if (user?.user_type === 'student_coach') {
      if (!coachPlan) return defaultValue;
      return coachPlan[permissionKey] ?? defaultValue;
    }

    return defaultValue;
  };

  return {
    user,
    coachPlan,
    coachSubscription,
    isLoading,
    hasPermission,
    // Specific permission checks
    canAccessFinanceManager: hasPermission('can_access_finance_manager', false),
    canAccessMarketingHub: hasPermission('can_access_marketing_hub', false),
    canAccessBusinessGpts: hasPermission('can_access_business_gpts', false),
    canAccessTemplateManager: hasPermission('can_access_template_manager', false),
    canAccessVerticals: hasPermission('can_access_verticals', false),
    canUseBulkImport: hasPermission('can_use_bulk_import', false),
    canAccessTeamAttendance: hasPermission('can_access_team_attendance', false),
    canManageTeam: hasPermission('can_manage_team', false),
  };
}