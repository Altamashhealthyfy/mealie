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
  BarChart3 as BarChart,
  LayoutDashboard,
  Filter,
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
  Tag,
  Lock,
  Share2,
  Eye,
  BarChart3,
  Trophy,
  Award,
  Gift,
  Mail
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import PWAInstallPrompt from "@/components/common/PWAInstallPrompt";
import VoiceCommandControl from "@/components/common/VoiceCommandControl";

const dietitianNavigation = [
  {
    title: "Dashboard",
    url: createPageUrl("DietitianDashboard"),
    icon: LayoutDashboard,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Help Center",
    url: createPageUrl("HelpCenter"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Client Analytics",
    url: createPageUrl("ClientAnalyticsDashboard"),
    icon: TrendingUp,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Advanced Analytics",
    url: createPageUrl("AdvancedCoachAnalytics"),
    icon: BarChart3,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Platform Analytics",
    url: createPageUrl("AnalyticsDashboard"),
    icon: BarChart,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Client Progress",
    url: createPageUrl("ClientReports"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Segmentation & Analytics",
    url: createPageUrl("ClientSegmentationReports"),
    icon: Filter,
    roles: ['super_admin', 'team_member'],
  },
  {
    title: "Clients Feedback",
    url: createPageUrl("ClientProgressReview"),
    icon: ClipboardList,
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
    roles: ['student_coach', 'super_admin'],
  },
  {
    title: "Payment Setup",
    url: createPageUrl("CoachPaymentSetup"),
    icon: CreditCard,
    roles: ['student_coach'],
  },
  {
    title: "Clients Packages",
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
    title: "MPESS Tracker",
    url: createPageUrl("CoachMPESSTracker"),
    icon: Heart,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Clinical Report",
    url: createPageUrl("CoachReportTracker"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "AI Coach Insights",
    url: createPageUrl("AICoachInsights"),
    icon: Sparkles,
    roles: ['super_admin', 'team_member', 'student_coach'],
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
    url: createPageUrl("ResourceLibrary"),
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
    title: "Clients Packages",
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

const gamificationNavigation = [
  {
    title: "Points",
    url: createPageUrl("GamificationPoints"),
    icon: Target,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Badges",
    url: createPageUrl("BadgeManagement"),
    icon: Award,
    roles: ['super_admin'],
  },
  {
    title: "Leaderboard",
    url: createPageUrl("GamificationLeaderboard"),
    icon: Trophy,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Challenge Manager",
    url: createPageUrl("CoachChallenges"),
    icon: Trophy,
    roles: ['super_admin', 'student_coach', 'team_member'],
  },
  {
    title: "Bonus Awards",
    url: createPageUrl("CoachBonusAwards"),
    icon: Gift,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Gamification Settings",
    url: createPageUrl("GamificationSettings"),
    icon: Settings,
    roles: ['super_admin'],
  },
  {
    title: "Feed Settings",
    url: createPageUrl("FeedSettings"),
    icon: BarChart3,
    roles: ['super_admin'],
  },
];

const businessNavigation = [
  {
    title: "Share My Link",
    url: createPageUrl("CoachReferralLink"),
    icon: Share2,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },
  {
    title: "Health Coach Plans",
    url: createPageUrl("HealthCoachPlans"),
    icon: Crown,
    roles: ['super_admin'],
  },
  {
    title: "Health Coaches",
    url: createPageUrl("HealthCoachesManagement"),
    icon: Users,
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
    title: "Client Access Manager",
    url: createPageUrl("ClientAccessManager"),
    icon: Eye,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
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
    title: "Email Sequences",
    url: createPageUrl("EmailSequenceManager"),
    icon: Mail,
    roles: ['super_admin', 'team_member', 'student_coach'],
  },
  {
    title: "Template Manager",
    url: createPageUrl("TemplateLibraryManager"),
    icon: Upload,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
  },

  {
    title: "Client Goal Setter",
    url: createPageUrl("CoachGoalSetter"),
    icon: Target,
    roles: ['super_admin', 'student_coach', 'team_member'],
  },
  {
    title: "Milestone Goals",
    url: createPageUrl("CoachMilestoneGoals"),
    icon: Target,
    roles: ['super_admin', 'student_coach', 'team_member'],
  },
  {
    title: "Progress Reports",
    url: createPageUrl("CoachProgressReports"),
    icon: FileText,
    roles: ['super_admin', 'student_coach', 'team_member'],
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
    title: "Feature Control",
    url: createPageUrl("FeatureControl"),
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    title: "Coach Profile Manager",
    url: createPageUrl("CoachProfileManager"),
    icon: User,
    roles: ['super_admin', 'student_coach', 'team_member'],
  },
  {
    title: "Platform Analytics",
    url: createPageUrl("AdminPlatformAnalytics"),
    icon: BarChart3,
    roles: ['super_admin'],
  },
  {
    title: "Coach Performance",
    url: createPageUrl("CoachPerformanceAnalytics"),
    icon: TrendingUp,
    roles: ['super_admin'],
  },
  {
    title: "Client Feedback",
    url: createPageUrl("ClientFeedbackManagement"),
    icon: MessageSquare,
    roles: ['super_admin'],
  },

  ];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [customBranding, setCustomBranding] = React.useState(null);
  const [adminViewMode, setAdminViewMode] = React.useState('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
        }
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

  const { data: clientAccessControl } = useQuery({
    queryKey: ['clientAccessControl', clientProfile?.id],
    queryFn: async () => {
      const controls = await base44.entities.ClientAccessControl.filter({
        client_id: clientProfile?.id
      });
      return controls[0] || null;
    },
    enabled: !!clientProfile?.id && user?.user_type === 'client',
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

  // Listen for view mode changes from DietitianDashboard
  React.useEffect(() => {
    // Load initial view mode from localStorage
    const savedViewMode = localStorage.getItem('admin_view_mode') || 'admin';
    setAdminViewMode(savedViewMode);

    // Listen for changes
    const handleViewModeChange = (event) => {
      setAdminViewMode(event.detail);
    };
    window.addEventListener('viewModeChanged', handleViewModeChange);
    
    return () => {
      window.removeEventListener('viewModeChanged', handleViewModeChange);
    };
  }, []);

  const userType = user?.user_type || 'client';
  const isDietitian = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(userType);
  
  // Determine effective user type based on admin view mode
  let effectiveUserType = userType;
  if (userType === 'super_admin' && adminViewMode !== 'admin') {
    if (adminViewMode === 'client') {
      effectiveUserType = 'client';
    } else {
      effectiveUserType = 'student_coach';
    }
  }
  
  // Check if effective type is dietitian (used for sidebar rendering)
  const isEffectiveDietitian = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(effectiveUserType);
  
  const filteredDietitianNav = dietitianNavigation.filter(item =>
    !item.roles || item.roles.includes(effectiveUserType)
  );
  
  const filteredPaymentNav = paymentNavigation.filter(item =>
    !item.roles || item.roles.includes(effectiveUserType)
  );
  
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
    // Simulate plan permissions based on admin view mode
    let simulatedPlan = null;
    if (userType === 'super_admin' && adminViewMode !== 'admin') {
      if (adminViewMode === 'pro_user') {
        simulatedPlan = {
          can_access_finance_manager: true,
          can_access_marketing_hub: true,
          can_access_business_gpts: true,
          can_access_template_manager: true,
          can_access_verticals: true,
          can_use_bulk_import: true,
          can_access_team_attendance: true,
          can_manage_team: true,
          can_access_pro_plans: true,
        };
      } else if (adminViewMode === 'basic_user' || adminViewMode === 'trial') {
        simulatedPlan = {
          can_access_finance_manager: false,
          can_access_marketing_hub: false,
          can_access_business_gpts: false,
          can_access_template_manager: false,
          can_access_verticals: false,
          can_use_bulk_import: false,
          can_access_team_attendance: false,
          can_manage_team: false,
          can_access_pro_plans: false,
        };
      }
    }

    // First filter by role
    let filtered = businessNavigation.filter(item =>
      !item.roles || item.roles.includes(effectiveUserType)
    );

    // For student_coach OR simulated views, also filter by plan permissions
    const activePlan = simulatedPlan || coachPlan;
    if ((effectiveUserType === 'student_coach' || simulatedPlan) && activePlan) {
      filtered = filtered.filter(item => {
        // Map navigation items to plan permissions
        const permissionMap = {
          'Share My Link': true, // Always available
          'Health Coach Plans': true, // Admin only
          'Health Coaches': true, // Admin only
          'Coupon Management': true, // Admin only
          'Platform Branding': true, // Admin only
          'Color Customization': true, // Admin only
          'Subscription Manager': true, // Admin only
          'Client Access Manager': activePlan?.can_manage_client_access !== false,
          'User Permissions': true, // Admin only
          'Webinar Tracker': true, // Admin only
          'Finance Manager': activePlan?.can_access_finance_manager === true,
          'Marketing Hub': activePlan?.can_access_marketing_hub === true,
          'Business GPTs': activePlan?.can_access_business_gpts === true,
          'Template Manager': activePlan?.can_access_template_manager === true,
          'Verticals Dashboard': activePlan?.can_access_verticals === true,
          'Bulk Import': activePlan?.can_use_bulk_import === true,
          'Team Attendance': activePlan?.can_access_team_attendance === true,
          'Team Management': activePlan?.can_manage_team === true,
        };

        // If there's a permission mapping, check it; otherwise allow
        if (permissionMap.hasOwnProperty(item.title)) {
          return permissionMap[item.title] !== false;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredBusinessNav = getFilteredBusinessNav();

  // Filter gamification navigation based on plan permissions
  const getFilteredGamificationNav = () => {
    // Simulate plan permissions based on admin view mode
    let simulatedPlan = null;
    if (userType === 'super_admin' && adminViewMode !== 'admin') {
      if (adminViewMode === 'pro_user') {
        simulatedPlan = {
          can_access_gamification: true,
        };
      } else if (adminViewMode === 'basic_user' || adminViewMode === 'trial') {
        simulatedPlan = {
          can_access_gamification: false,
        };
      }
    }

    // First filter by role
    let filtered = gamificationNavigation.filter(item =>
      !item.roles || item.roles.includes(effectiveUserType)
    );

    // For student_coach OR simulated views, also filter by plan permissions
    const activePlan = simulatedPlan || coachPlan;
    if ((effectiveUserType === 'student_coach' || simulatedPlan) && activePlan) {
      // If coach doesn't have gamification access, hide all gamification items
      if (activePlan.can_access_gamification !== true) {
        filtered = [];
      }
    }

    return filtered;
  };

  const filteredGamificationNav = getFilteredGamificationNav();
  
  // Get simulated plan for Pro Plans lock logic
  let simulatedPlan = null;
  if (userType === 'super_admin' && adminViewMode !== 'admin') {
    if (adminViewMode === 'pro_user') {
      simulatedPlan = {
        can_access_pro_plans: true,
      };
    } else if (adminViewMode === 'basic_user' || adminViewMode === 'trial') {
      simulatedPlan = {
        can_access_pro_plans: false,
      };
    }
  }

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
    
    // Coach-controlled access settings override plan permissions
    const coachAccess = clientAccessControl || {};
    
    const baseNav = [
      {
        title: "My Dashboard",
        url: createPageUrl("ClientDashboard"),
        icon: Home,
        show: (coachAccess.show_my_dashboard ?? true) && true,
      },

      {
        title: "My Plans",
        url: createPageUrl("ClientPlans"),
        icon: CreditCard,
        show: (coachAccess.show_my_plans ?? true) && (permissions?.show_my_plans ?? false),
      },
      {
        title: "My Meal Plan",
        url: createPageUrl("MyAssignedMealPlan"),
        icon: Calendar,
        show: (coachAccess.show_my_meal_plan ?? true) && (permissions?.can_view_meal_plan ?? true),
      },
      {
        title: "Food Log",
        url: createPageUrl("FoodLog"),
        icon: Utensils,
        show: (coachAccess.show_food_log ?? true) && (permissions?.can_view_food_log ?? true),
      },
      {
        title: "My Progress",
        url: createPageUrl("ProgressTracking"),
        icon: Scale,
        show: (coachAccess.show_my_progress ?? true) && (permissions?.can_view_progress ?? true),
      },

      {
        title: "MPESS Wellness",
        url: createPageUrl("MPESSTracker"),
        icon: Heart,
        show: (coachAccess.show_mpess_wellness ?? true) && (permissions?.can_view_mpess ?? true),
      },
      {
        title: "Messages",
        url: createPageUrl("ClientCommunication"),
        icon: MessageSquare,
        show: (coachAccess.show_messages ?? true) && (permissions?.can_view_messages ?? true),
      },
      {
        title: "MPESS Assessment",
        url: createPageUrl("ClientMPESSAssessment"),
        icon: Heart,
        show: (coachAccess.show_mpess_wellness ?? true) && (permissions?.can_view_mpess ?? true),
      },
      {
        title: "MPESS Analytics",
        url: createPageUrl("ClientMPESSAnalytics"),
        icon: TrendingUp,
        show: (coachAccess.show_mpess_wellness ?? true) && (permissions?.can_view_mpess ?? true),
      },
      {
        title: "My Assessments",
        url: createPageUrl("ClientAssessments"),
        icon: ClipboardList,
        show: (coachAccess.show_my_assessments ?? true) && (permissions?.can_view_assessments ?? true),
      },
      {
        title: "My Appointments",
        url: createPageUrl("ClientAppointments"),
        icon: Calendar,
        show: (coachAccess.show_my_appointments ?? true) && (permissions?.can_view_appointments ?? true),
      },
      {
        title: "Recipe Library",
        url: createPageUrl("ClientRecipes"),
        icon: ChefHat,
        show: (coachAccess.show_recipe_library ?? true) && (permissions?.can_view_recipes ?? true),
      },
      {
        title: "Food Lookup",
        url: createPageUrl("FoodLookup"),
        icon: Search,
        show: (coachAccess.show_food_lookup ?? true) && (permissions?.can_use_food_lookup_ai ?? true),
      },
      {
        title: "My Resources",
        url: createPageUrl("ClientResourceTracker"),
        icon: BookOpen,
        show: (coachAccess.show_resources ?? true) && (permissions?.can_view_resources ?? true),
      },
      {
        title: "Upload Reports",
        url: createPageUrl("ClientReportUpload"),
        icon: Upload,
        show: true,
      },
      {
        title: "My Profile",
        url: createPageUrl("Profile"),
        icon: User,
        show: (coachAccess.show_my_profile ?? true) && (permissions?.can_view_profile ?? true),
      },
      ];

      return baseNav.filter(item => item.show);
  };

  const navigationItems = isEffectiveDietitian ? filteredDietitianNav : getClientNavigation();

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

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-orange-500 mb-4 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Full-width pages without sidebar
    const fullWidthPages = ['HealthCoachesManagement'];
    const isFullWidth = fullWidthPages.includes(currentPageName);
    // Pages where mobile bottom nav should be hidden (chat-like full-screen pages)
    const noMobileNavPages = ['AICoachInsights', 'Communication', 'ClientCommunication'];

  if (isFullWidth) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
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
        <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              {brandingLogo ? (
                <img src={brandingLogo} alt={brandingName} className="w-8 h-8 rounded object-cover" />
              ) : (
                <ChefHat className="w-8 h-8 text-orange-500" />
              )}
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {brandingName}
              </h1>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            {userType === 'super_admin' && (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <Select value={adminViewMode} onValueChange={(value) => {
                  setAdminViewMode(value);
                  localStorage.setItem('admin_view_mode', value);
                  window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: value }));
                }}>
                  <SelectTrigger className="w-48 h-8 text-sm border-none bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">👑 Admin View</SelectItem>
                    <SelectItem value="pro_user">💎 Pro User</SelectItem>
                    <SelectItem value="basic_user">⭐ Basic User</SelectItem>
                    <SelectItem value="trial">🎁 Trial User</SelectItem>
                    <SelectItem value="client">👤 Client View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div id="notification-bell-container">
              <NotificationBell userEmail={user?.email} />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <PWAInstallPrompt />
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

        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
          .main-content-mobile {
            padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <Sidebar className="desktop-sidebar border-r border-orange-100 backdrop-blur-sm" style={{ backgroundColor: sidebarBg }}>
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
                                {isEffectiveDietitian ? 'Dietitian Tools' : 'My Health Journey'}
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



            {isEffectiveDietitian && filteredPaymentNav.length > 0 && (
                                <SidebarGroup id="payment-plans-nav">
                                  <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                                    Payment & Plans
                                  </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredPaymentNav.map((item) => {
                      const isProPlansItem = item.title === "Pro Plans 💎";
                      const activePlanForChecking = simulatedPlan || coachPlan;
                      const hasProAccess = activePlanForChecking?.can_access_pro_plans;
                      const isLocked = isProPlansItem && effectiveUserType === 'student_coach' && !hasProAccess;

                      return (
                        <SidebarMenuItem key={item.title}>
                          {isLocked ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="opacity-60">
                                    <SidebarMenuButton
                                      className="hover:bg-orange-50 transition-all duration-200 rounded-xl mb-1 cursor-not-allowed"
                                      style={{ color: themeColors.menu_text_color }}
                                    >
                                      <div className="flex items-center gap-3 px-4 py-3">
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.title}</span>
                                        <Lock className="w-4 h-4 ml-auto" />
                                      </div>
                                    </SidebarMenuButton>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Upgrade to Pro to unlock disease-specific plans</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
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
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {isEffectiveDietitian && filteredBusinessNav.length > 0 && (
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

        <main className="flex-1 flex flex-col main-content-mobile">
          <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 md:hidden">
              <div className="flex items-center gap-2">
                {brandingLogo ? (
                  <img src={brandingLogo} alt={brandingName} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <ChefHat className="w-6 h-6 text-orange-500" />
                )}
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  {brandingName}
                </h1>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
              {userType === 'super_admin' && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <Select value={adminViewMode} onValueChange={(value) => {
                    setAdminViewMode(value);
                    localStorage.setItem('admin_view_mode', value);
                    window.dispatchEvent(new CustomEvent('viewModeChanged', { detail: value }));
                  }}>
                    <SelectTrigger className="w-48 h-8 text-sm border-none bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">👑 Admin View</SelectItem>
                      <SelectItem value="pro_user">💎 Pro User</SelectItem>
                      <SelectItem value="basic_user">⭐ Basic User</SelectItem>
                      <SelectItem value="trial">🎁 Trial User</SelectItem>
                      <SelectItem value="client">👤 Client View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div id="notification-bell-container">
                <NotificationBell userEmail={user?.email} />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
          </main>

          {/* Mobile Bottom Navigation */}
              <div 
                className={`mobile-bottom-nav hidden fixed bottom-0 left-0 right-0 border-t shadow-2xl z-50 ${noMobileNavPages.includes(currentPageName) ? '!hidden' : ''}`}
            style={{ 
              backgroundColor: sidebarBg,
              borderColor: 'rgba(251, 146, 60, 0.2)'
            }}
          >
            <div className="grid grid-cols-5 gap-1 px-2 py-3 safe-area-inset-bottom">
              {navigationItems.slice(0, 4).map((item, index) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={index}
                    to={item.url}
                    className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all active:scale-95"
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                      color: '#ffffff'
                    } : {
                      color: themeColors.menu_text_color
                    }}
                  >
                    <item.icon className="w-6 h-6 flex-shrink-0" />
                    <span className="text-[10px] font-semibold leading-tight text-center"
                      style={{ 
                        maxWidth: '100%',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.title}
                    </span>
                  </Link>
                );
              })}

              {/* More Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all active:scale-95"
                    style={{ color: themeColors.menu_text_color }}
                  >
                    <LayoutDashboard className="w-6 h-6 flex-shrink-0" />
                    <span className="text-[10px] font-semibold">More</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl" style={{ backgroundColor: sidebarBg }}>
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="text-xl font-bold">All Menus</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2 pb-6">
                    {/* Main Navigation */}
                    <div className="space-y-1">
                      {navigationItems.map((item, index) => {
                        const isActive = location.pathname === item.url;
                        return (
                          <Link
                            key={index}
                            to={item.url}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all active:scale-98"
                            style={isActive ? {
                              background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                              color: '#ffffff'
                            } : {
                              color: themeColors.menu_text_color,
                              backgroundColor: 'rgba(0,0,0,0.02)'
                            }}
                          >
                            <item.icon className="w-6 h-6 flex-shrink-0" />
                            <span className="font-semibold text-base">{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>



                    {/* Payment & Plans Section */}
                    {isEffectiveDietitian && filteredPaymentNav.length > 0 && (
                      <div className="pt-3">
                        <div className="px-5 py-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment & Plans</p>
                        </div>
                        <div className="space-y-1">
                          {filteredPaymentNav.map((item, index) => {
                            const isActive = location.pathname === item.url;
                            return (
                              <Link
                                key={index}
                                to={item.url}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all active:scale-98"
                                style={isActive ? {
                                  background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                                  color: '#ffffff'
                                } : {
                                  color: themeColors.menu_text_color,
                                  backgroundColor: 'rgba(0,0,0,0.02)'
                                }}
                              >
                                <item.icon className="w-6 h-6 flex-shrink-0" />
                                <span className="font-semibold text-base">{item.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Business Tools Section */}
                    {isEffectiveDietitian && filteredBusinessNav.length > 0 && (
                      <div className="pt-3">
                        <div className="px-5 py-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Tools</p>
                        </div>
                        <div className="space-y-1">
                          {filteredBusinessNav.map((item, index) => {
                            const isActive = location.pathname === item.url;
                            return (
                              <Link
                                key={index}
                                to={item.url}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all active:scale-98"
                                style={isActive ? {
                                  background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`,
                                  color: '#ffffff'
                                } : {
                                  color: themeColors.menu_text_color,
                                  backgroundColor: 'rgba(0,0,0,0.02)'
                                }}
                              >
                                <item.icon className="w-6 h-6 flex-shrink-0" />
                                <span className="font-semibold text-base">{item.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Logout Button */}
                    <div className="pt-4 border-t border-gray-200 mt-4 px-2">
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        variant="outline"
                        size="lg"
                        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 font-bold flex items-center justify-center gap-3 py-4"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <PWAInstallPrompt />
          <VoiceCommandControl />
          </div>
          </SidebarProvider>
          );
          }