import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Calendar,
  ChefHat,
  Search,
  Heart,
  Users,
  MessageSquare,
  TrendingUp,
  ClipboardList,
  LayoutDashboard,
  DollarSign,
  Megaphone,
  BookOpen,
  Utensils,
  Scale,
  UserPlus,
  Sparkles,
  Rocket,
  Target,
  FileText,
  Upload,
  LogOut,
  Stethoscope,
  Shield,
  User,
  CreditCard,
  Crown,
  Receipt,
  Settings,
  Globe,
  Palette,
  Loader2,
  Tag
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import TourButton from "@/components/common/TourButton";

const dietitianNavigation = [
  {
    title: "Dashboard",
    url: createPageUrl("DietitianDashboard"),
    icon: LayoutDashboard,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Client Analytics",
    url: createPageUrl("ClientAnalyticsDashboard"),
    icon: TrendingUp,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Client Reports",
    url: createPageUrl("ClientReports"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },

  {
    title: "My Subscription",
    url: createPageUrl("CoachSubscriptions"),
    icon: Crown,
    roles: ['student_coach'],
  },
  {
    title: "Buy AI Credits",
    url: createPageUrl("PurchaseAICredits"),
    icon: Sparkles,
    roles: ['student_coach'],
  },
  {
    title: "Payment Setup",
    url: createPageUrl("CoachPaymentSetup"),
    icon: CreditCard,
    roles: ['student_coach'],
  },
  {
    title: "Create Client Plans",
    url: createPageUrl("ClientPlanBuilder"),
    icon: Users,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Clients",
    url: createPageUrl("ClientManagement"),
    icon: Users,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Messages",
    url: createPageUrl("Communication"),
    icon: MessageSquare,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Appointments",
    url: createPageUrl("Appointments"),
    icon: Calendar,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Meal Plans",
    url: createPageUrl("MealPlanner"),
    icon: ChefHat,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },

  {
    title: "Template Library",
    url: createPageUrl("TemplateLibrary"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Client Assessments",
    url: createPageUrl("ClientAssessments"),
    icon: ClipboardList,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Assessment Templates",
    url: createPageUrl("AssessmentTemplates"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Recipes",
    url: createPageUrl("Recipes"),
    icon: ClipboardList,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Food Lookup",
    url: createPageUrl("FoodLookup"),
    icon: Search,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Resource Library",
    url: createPageUrl("ResourceLibraryEnhanced"),
    icon: BookOpen,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  ];

const paymentNavigation = [
  {
    title: "Payment Gateway",
    url: createPageUrl("PaymentGatewaySettings"),
    icon: CreditCard,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Create Client Plans",
    url: createPageUrl("ClientPlanBuilder"),
    icon: Users,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Pro Plans 💎",
    url: createPageUrl("MealPlansPro"),
    icon: Stethoscope,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Assign Plans",
    url: createPageUrl("ClientPlanManagement"),
    icon: Crown,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Payment History",
    url: createPageUrl("PaymentHistory"),
    icon: Receipt,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
];

const businessNavigation = [
  {
    title: "Health Coach Plans",
    url: createPageUrl("HealthCoachPlans"),
    icon: Crown,
    roles: ['super_admin'],
  },
  {
    title: "Coupon Management",
    url: createPageUrl("CouponManagement"),
    icon: Tag,
    roles: ['super_admin'],
  },
  {
    title: "Platform Branding",
    url: createPageUrl("PlatformBrandingTracker"),
    icon: Globe,
    roles: ['super_admin'],
  },
  {
    title: "Color Customization",
    url: createPageUrl("PlatformColorCustomization"),
    icon: Palette,
    roles: ['super_admin'],
  },
  {
    title: "Subscription Manager",
    url: createPageUrl("AdminSubscriptionManager"),
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    title: "User Permissions",
    url: createPageUrl("UserPermissionManagement"),
    icon: Settings,
    roles: ['super_admin'],
  },
  {
    title: "Webinar Tracker",
    url: createPageUrl("WebinarPerformanceTracker"),
    icon: TrendingUp,
    roles: ['super_admin', 'team_member'],
  },
  {
    title: "Finance Manager",
    url: createPageUrl("ClientFinanceManager"),
    icon: DollarSign,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Marketing Hub",
    url: createPageUrl("MarketingHub"),
    icon: Megaphone,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Business GPTs",
    url: createPageUrl("BusinessGPTs"),
    icon: Sparkles,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Broadcast Notification",
    url: createPageUrl("BroadcastNotification"),
    icon: MessageSquare,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Template Manager",
    url: createPageUrl("TemplateLibraryManager"),
    icon: Upload,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Usage & Billing",
    url: createPageUrl("UsageDashboard"),
    icon: DollarSign,
    roles: ['super_admin'],
  },
  {
    title: "Verticals Dashboard",
    url: createPageUrl("VerticalManagement"),
    icon: Target,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Team Management",
    url: createPageUrl("TeamManagement"),
    icon: UserPlus,
    roles: ['super_admin', 'student_coach'],
  },
  {
    title: "Bulk Import",
    url: createPageUrl("BulkImport"),
    icon: Utensils,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Team Attendance",
    url: createPageUrl("TeamAttendance"),
    icon: Calendar,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Feature Control",
    url: createPageUrl("FeatureControl"),
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    title: "Reference Docs",
    url: createPageUrl("PlatformReference"),
    icon: BookOpen,
    roles: ['super_admin'],
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [customBranding, setCustomBranding] = React.useState(null);
  const [brandingLoaded, setBrandingLoaded] = React.useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Detect custom domain and fetch branding
  React.useEffect(() => {
    const detectCustomDomain = async () => {
      const hostname = window.location.hostname;
      const isCustomDomain = !hostname.includes('base44.app') && !hostname.includes('localhost');
      
      if (isCustomDomain) {
        try {
          const response = await base44.functions.invoke('getCoachByDomain', { domain: hostname });
          if (response.data?.branding) {
            setCustomBranding(response.data.branding);
          }
        } catch (error) {
          console.error('Failed to fetch custom branding:', error);
        } finally {
          setBrandingLoaded(true);
        }
      } else {
        setBrandingLoaded(true);
      }
    };
    
    detectCustomDomain();
  }, []);

  // Fetch coach profile for branding (for coaches on regular domain)
  const { data: coachProfile } = useQuery({
    queryKey: ['coachProfile', user?.email],
    queryFn: async () => {
      try {
        const profiles = await base44.entities.CoachProfile.filter({ created_by: user?.email });
        return profiles[0] || null;
      } catch (error) {
        console.error('Coach profile error:', error);
        return null;
      }
    },
    enabled: !!user && user?.user_type === 'student_coach',
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      try {
        const clients = await base44.entities.Client.filter({ email: user?.email });
        return clients[0] || null;
      } catch (error) {
        console.error('Client profile error:', error);
        return null;
      }
    },
    enabled: !!user && user?.user_type === 'client',
    staleTime: 5 * 60 * 1000,
  });

  // Fetch coach branding for clients
  const { data: clientCoachBranding } = useQuery({
    queryKey: ['clientCoachBranding', clientProfile?.assigned_coach],
    queryFn: async () => {
      if (!clientProfile?.assigned_coach) return null;
      const profiles = await base44.entities.CoachProfile.filter({ created_by: clientProfile.assigned_coach });
      return profiles[0] || null;
    },
    enabled: !!clientProfile?.assigned_coach && user?.user_type === 'client',
  });

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user,
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

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadMessagesCount'],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ read: false });
      return messages.length;
    },
    enabled: !!user,
    initialData: 0,
  });

  const userType = user?.user_type || 'client';
  const isDietitian = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(userType);
  
  const filteredDietitianNav = dietitianNavigation.filter(item =>
    !item.roles || item.roles.includes(userType)
  );
  
  // Filter payment navigation based on user role AND coach plan permissions
  const getFilteredPaymentNav = () => {
    // First filter by role
    let filtered = paymentNavigation.filter(item =>
      !item.roles || item.roles.includes(userType)
    );

    // For student_coach, also filter by plan permissions
    if (userType === 'student_coach' && coachPlan) {
      filtered = filtered.filter(item => {
        // Map navigation items to plan permissions
        const permissionMap = {
          'Payment Gateway': coachPlan.can_add_payment_gateway,
          'Create Client Plans': coachPlan.can_create_client_plans,
          'Pro Plans 💎': coachPlan.can_access_pro_plans,
          'Assign Plans': coachPlan.can_create_client_plans, // Same as create
          'Payment History': coachPlan.can_add_payment_gateway, // Need gateway to have payments
        };

        // If there's a permission mapping, check it; otherwise allow
        if (permissionMap.hasOwnProperty(item.title)) {
          return permissionMap[item.title] === true;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredPaymentNav = getFilteredPaymentNav();
  
  const { data: coachSubscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user && userType === 'student_coach',
  });

  const { data: coachPlan } = useQuery({
    queryKey: ['coachPlan', coachSubscription?.plan_id],
    queryFn: async () => {
      if (!coachSubscription?.plan_id) return null;
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });

  // Filter business navigation based on user role AND coach plan permissions
  const getFilteredBusinessNav = () => {
    // First filter by role
    let filtered = businessNavigation.filter(item =>
      !item.roles || item.roles.includes(userType)
    );

    // For student_coach, also filter by plan permissions
    if (userType === 'student_coach' && coachPlan) {
      filtered = filtered.filter(item => {
        // Map navigation items to plan permissions
        const permissionMap = {
          'Finance Manager': coachPlan.can_access_finance_manager,
          'Marketing Hub': coachPlan.can_access_marketing_hub,
          'Business GPTs': coachPlan.can_access_business_gpts,
          'Template Manager': coachPlan.can_access_template_manager,
          'Verticals Dashboard': coachPlan.can_access_verticals,
          'Bulk Import': coachPlan.can_use_bulk_import,
          'Team Attendance': coachPlan.can_access_team_attendance,
          'My Team': coachPlan.can_manage_team,
        };

        // If there's a permission mapping, check it; otherwise allow
        if (permissionMap.hasOwnProperty(item.title)) {
          return permissionMap[item.title] === true;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredBusinessNav = getFilteredBusinessNav();

  const getClientPermissions = () => {
    // If client has active subscription, use plan features
    if (clientSubscription?.plan_tier) {
      const planKey = `${clientSubscription.plan_tier}_plan`;
      const planFeatures = securitySettings?.membership_plans?.[planKey]?.features;
      if (planFeatures) {
        return planFeatures;
      }
    }
    
    // Otherwise use global client restrictions
    return securitySettings?.client_restrictions || {};
  };

  const getClientNavigation = () => {
    const permissions = getClientPermissions();
    
    const baseNav = [
      {
        title: "My Dashboard",
        url: createPageUrl("ClientDashboard"),
        icon: Home,
        show: true,
      },
      {
        title: "My Plans",
        url: createPageUrl("ClientPlans"),
        icon: CreditCard,
        show: permissions?.show_my_plans ?? false,
      },
      {
        title: "My Meal Plan",
        url: createPageUrl("MyAssignedMealPlan"),
        icon: Calendar,
        show: permissions?.can_view_meal_plan ?? true,
      },
      {
        title: "Food Log",
        url: createPageUrl("FoodLog"),
        icon: Utensils,
        show: permissions?.can_view_food_log ?? true,
      },
      {
        title: "My Progress",
        url: createPageUrl("ProgressTracking"),
        icon: Scale,
        show: permissions?.can_view_progress ?? true,
      },

      {
        title: "MPESS Wellness",
        url: createPageUrl("MPESSTracker"),
        icon: Heart,
        show: permissions?.can_view_mpess ?? true,
      },
      {
        title: "Messages",
        url: createPageUrl("ClientCommunication"),
        icon: MessageSquare,
        show: permissions?.can_view_messages ?? true,
      },
      {
        title: "My Assessments",
        url: createPageUrl("ClientAssessments"),
        icon: ClipboardList,
        show: permissions?.can_view_assessments ?? true,
      },
      {
        title: "My Appointments",
        url: createPageUrl("ClientAppointments"),
        icon: Calendar,
        show: permissions?.can_view_appointments ?? true,
      },
      {
        title: "Recipe Library",
        url: createPageUrl("ClientRecipes"),
        icon: ChefHat,
        show: permissions?.can_view_recipes ?? true,
      },
      {
        title: "Food Lookup",
        url: createPageUrl("FoodLookup"),
        icon: Search,
        show: permissions?.can_use_food_lookup_ai ?? true,
      },
      {
        title: "Resources",
        url: createPageUrl("ClientResourceTracker"),
        icon: BookOpen,
        show: permissions?.can_view_resources ?? true,
      },
      {
        title: "My Profile",
        url: createPageUrl("Profile"),
        icon: User,
        show: permissions?.can_view_profile ?? true,
      },
      ];

      return baseNav.filter(item => item.show);
  };

  const navigationItems = isDietitian ? filteredDietitianNav : getClientNavigation();

  const getUserLabel = () => {
    if (!isDietitian) return 'Client';

    switch(userType) {
      case 'super_admin':
        return '👑 Platform Owner';
      case 'team_member':
        return '👥 Team Member';
      case 'student_coach':
        return '🎓 Health Coach';
      case 'student_team_member':
        return '👥 Coach Team';
      default:
        return '👥 Team Member';
    }
  };

  const getUserBadgeColor = () => {
    switch(userType) {
      case 'super_admin':
        return 'bg-purple-600 text-white';
      case 'student_coach':
        return 'bg-green-600 text-white';
      case 'team_member':
        return 'bg-blue-600 text-white';
      case 'student_team_member':
        return 'bg-cyan-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const profilePhotoUrl = user?.profile_photo_url || clientProfile?.profile_photo_url || null;

  // Determine branding to display (coaches see their own, clients see their coach's)
  const activeBranding = isDietitian ? coachProfile : clientCoachBranding;
  const brandingName = customBranding?.name || activeBranding?.custom_branding_name || activeBranding?.business_name || 'Mealie';
  const brandingTagline = customBranding?.tagline || activeBranding?.tagline || (isDietitian ? 'Dietitian Platform' : 'Client Portal');
  const brandingLogo = customBranding?.logo_url || activeBranding?.logo_url;

  // Get theme colors from branding
  const themeColors = customBranding?.theme_colors || activeBranding?.theme_colors || {
    primary_from: '#f97316',
    primary_to: '#dc2626',
    sidebar_bg: '#ffffff',
    health_coach_sidebar_bg: '#ffffff',
    client_sidebar_bg: '#ffffff',
    accent_color: '#f97316',
    menu_text_color: '#424242',
    highlight_button_color: '#f97316'
  };

  // Use panel-specific sidebar color
  const sidebarBg = isDietitian 
    ? (themeColors.health_coach_sidebar_bg || themeColors.sidebar_bg)
    : (themeColors.client_sidebar_bg || themeColors.sidebar_bg);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await base44.auth.logout();
      } catch (error) {
        console.error("Logout error:", error);
        window.location.reload();
      }
    }
  };

  if (userLoading || !brandingLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-orange-500 mb-4 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: 25 65% 55%;
          --primary-foreground: 0 0% 100%;
          --secondary: 30 70% 60%;
          --accent: 120 25% 50%;
          --background: 30 20% 98%;
          --card: 0 0% 100%;
          --theme-primary-from: ${themeColors.primary_from};
          --theme-primary-to: ${themeColors.primary_to};
          --theme-sidebar-bg: ${themeColors.sidebar_bg};
          --theme-accent: ${themeColors.accent_color};
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <Sidebar className="border-r border-orange-100 backdrop-blur-sm" style={{ backgroundColor: sidebarBg }}>
          <SidebarHeader className="border-b border-orange-100 p-6">
            <div className="flex items-center gap-4">
              {brandingLogo ? (
                <img src={brandingLogo} alt={brandingName} className="w-10 h-10 rounded-xl object-cover shadow-lg flex-shrink-0" />
              ) : (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ background: `linear-gradient(to bottom right, ${themeColors.primary_from}, ${themeColors.primary_to})` }}
                >
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-gray-900 break-words">
                  {brandingName}
                </h2>
                <p className="text-xs font-medium" style={{ color: themeColors.accent_color }}>
                  {brandingTagline}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup id="dietitian-tools-nav">
                              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                                {isDietitian ? 'Dietitian Tools' : 'My Health Journey'}
                              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-orange-50 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'text-white hover:text-white shadow-md' : ''
                        }`}
                        style={location.pathname === item.url ? {
                          background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                          color: '#ffffff'
                        } : {
                          color: themeColors.menu_text_color
                        }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge className="ml-auto bg-purple-600 text-white">{item.badge}</Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isDietitian && filteredPaymentNav.length > 0 && (
                                <SidebarGroup id="payment-plans-nav">
                                  <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                                    Payment & Plans
                                  </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredPaymentNav.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                           asChild
                           className={`hover:bg-orange-50 transition-all duration-200 rounded-xl mb-1 ${
                             location.pathname === item.url ? 'text-white hover:text-white shadow-md' : ''
                           }`}
                           style={location.pathname === item.url ? {
                             background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                             color: '#ffffff'
                           } : {
                             color: themeColors.menu_text_color
                           }}
                         >
                           <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                             <item.icon className="w-5 h-5" />
                             <span className="font-medium">{item.title}</span>
                           </Link>
                         </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isDietitian && filteredBusinessNav.length > 0 && (
                                <SidebarGroup id="business-tools-nav">
                                  <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                                    Business Tools
                                  </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredBusinessNav.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                           asChild
                           className={`hover:bg-orange-50 transition-all duration-200 rounded-xl mb-1 ${
                             location.pathname === item.url ? 'text-white hover:text-white shadow-md' : ''
                           }`}
                           style={location.pathname === item.url ? {
                             background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                             color: '#ffffff'
                           } : {
                             color: themeColors.menu_text_color
                           }}
                         >
                           <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                             <item.icon className="w-5 h-5" />
                             <span className="font-medium">{item.title}</span>
                             {item.badge && (
                               <Badge className="ml-auto bg-green-600 text-white">{item.badge}</Badge>
                             )}
                           </Link>
                         </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-orange-100 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={user?.full_name || 'User'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-orange-500 shadow-md"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{ background: `linear-gradient(to bottom right, ${themeColors.primary_from}, ${themeColors.primary_to})` }}
                  >
                    <span className="text-white font-bold text-sm">
                      {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <Badge className={`${getUserBadgeColor()} text-xs`}>
                    {getUserLabel()}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 md:hidden">
              <SidebarTrigger className="hover:bg-orange-50 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                {brandingLogo ? (
                  <img src={brandingLogo} alt={brandingName} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <ChefHat className="w-6 h-6 text-orange-500" />
                )}
                <h1 className="text-xl font-bold text-gray-900">
                  {brandingName}
                </h1>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
                                <div id="notification-bell-container">
                                  <NotificationBell userEmail={user?.email} />
                                </div>
                                <TourButton pageName={currentPageName} />
                              </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}