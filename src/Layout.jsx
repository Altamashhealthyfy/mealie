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
  Stethoscope
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

const dietitianNavigation = [
  {
    title: "Dashboard",
    url: createPageUrl("DietitianDashboard"),
    icon: LayoutDashboard,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
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
    title: "Pro Plans 💎",
    url: createPageUrl("MealPlansPro"),
    icon: Stethoscope,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
    badge: "Pro"
  },
  {
    title: "Template Library",
    url: createPageUrl("TemplateLibrary"),
    icon: FileText,
    roles: ['super_admin', 'team_member', 'student_coach', 'student_team_member'],
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
];

const businessNavigation = [
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
    title: "My Team",
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
    title: "Permission Manager",
    url: createPageUrl("PermissionManager"),
    icon: BookOpen,
    roles: ['super_admin'],
  },
  {
    title: "Reference Docs",
    url: createPageUrl("PlatformReference"),
    icon: BookOpen,
    roles: ['super_admin'],
  },
];

const clientNavigation = [
  {
    title: "My Dashboard",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "My Meal Plan",
    url: createPageUrl("MyAssignedMealPlan"),
    icon: Calendar,
  },
  {
    title: "Food Log",
    url: createPageUrl("FoodLog"),
    icon: Utensils,
  },
  {
    title: "My Progress",
    url: createPageUrl("ProgressTracking"),
    icon: Scale,
  },
  {
    title: "MPESS Wellness",
    url: createPageUrl("MPESSTracker"),
    icon: Heart,
  },
  {
    title: "Messages",
    url: createPageUrl("ClientCommunication"),
    icon: MessageSquare,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
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
  
  const filteredBusinessNav = businessNavigation.filter(item =>
    !item.roles || item.roles.includes(userType)
  );

  const navigationItems = isDietitian ? filteredDietitianNav : clientNavigation;

  const getUserLabel = () => {
    if (!isDietitian) return 'Client Account';

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
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
        <Sidebar className="border-r border-orange-100 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-orange-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900">
                  Mealie
                </h2>
                <p className="text-xs text-orange-600 font-medium">
                  {isDietitian ? 'Dietitian Platform' : 'Client Portal'}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                {isDietitian ? 'Dietitian Tools' : 'My Health Journey'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:text-white shadow-md' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge className="ml-auto bg-purple-600 text-white">{item.badge}</Badge>
                          )}
                          {item.title === 'Messages' && unreadCount > 0 && (
                            <Badge className="ml-auto bg-red-500">{unreadCount}</Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isDietitian && filteredBusinessNav.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  Business Tools
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredBusinessNav.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl mb-1 ${
                            location.pathname === item.url ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:text-white shadow-md' : ''
                          }`}
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
          </SidebarContent>

          <SidebarFooter className="border-t border-orange-100 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
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
          <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-orange-50 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">
                  Mealie
                </h1>
              </div>
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