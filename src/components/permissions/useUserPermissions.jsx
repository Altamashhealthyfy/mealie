import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to get effective permissions for the current user
 * Checks for custom permissions first, then falls back to role defaults
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

  const getEffectivePermissions = () => {
    if (!user) return {};

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
    isLoading: !user
  };
}