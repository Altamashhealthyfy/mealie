import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to get effective permissions for the current user
 * For clients: checks subscription plan first, then custom permissions, then role defaults
 * For staff: checks custom permissions first, then falls back to role defaults
 */
export function useUserPermissions() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user,
  });

  const { data: customPermissions } = useQuery({
    queryKey: ['userCustomPermissions', user?.email],
    queryFn: async () => {
      const perms = await base44.entities.UserPermissions.filter({ user_email: user?.email });
      return perms[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user && user.user_type === 'client',
  });

  const { data: clientSubscription } = useQuery({
    queryKey: ['clientSubscription', clientProfile?.id],
    queryFn: async () => {
      const subs = await base44.entities.ClientSubscription.filter({ 
        client_id: clientProfile?.id,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!clientProfile?.id,
  });

  const getEffectivePermissions = () => {
    if (!user) return {};

    // For clients: check subscription plan first
    if (user.user_type === 'client' && clientSubscription?.plan_tier) {
      const planKey = `${clientSubscription.plan_tier}_plan`;
      const planFeatures = securitySettings?.membership_plans?.[planKey]?.features;
      
      if (planFeatures) {
        return planFeatures;
      }
    }

    // If user has custom permissions, use those
    if (customPermissions?.custom_permissions) {
      return customPermissions.custom_permissions;
    }

    // Otherwise fall back to role defaults
    const userType = user.user_type || 'client';
    const permissionMap = {
      'super_admin': securitySettings?.super_admin_permissions || {},
      'team_member': securitySettings?.team_member_permissions || {},
      'student_coach': securitySettings?.student_coach_permissions || {},
      'client': securitySettings?.client_restrictions || {}
    };

    return permissionMap[userType] || {};
  };

  const permissions = getEffectivePermissions();

  const hasPermission = (permissionKey, defaultValue = false) => {
    return permissions[permissionKey] ?? defaultValue;
  };

  return {
    user,
    permissions,
    hasPermission,
    hasCustomPermissions: !!customPermissions,
    hasActiveSubscription: !!clientSubscription,
    subscriptionPlan: clientSubscription?.plan_tier || null,
    isLoading: !user
  };
}