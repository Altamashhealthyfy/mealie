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
  User,
  Users,
  MessageSquare,
  TrendingUp,
  ClipboardList,
  LayoutDashboard
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

const dietitianNavigation = [
  {
    title: "Dashboard",
    url: createPageUrl("DietitianDashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    url: createPageUrl("ClientManagement"),
    icon: Users,
  },
  {
    title: "Messages",
    url: createPageUrl("Communication"),
    icon: MessageSquare,
  },
  {
    title: "Appointments",
    url: createPageUrl("Appointments"),
    icon: Calendar,
  },
  {
    title: "Meal Plans",
    url: createPageUrl("MealPlanner"),
    icon: ChefHat,
  },
  {
    title: "Recipes",
    url: createPageUrl("Recipes"),
    icon: ClipboardList,
  },
  {
    title: "Food Lookup",
    url: createPageUrl("FoodLookup"),
    icon: Search,
  },
];

const clientNavigation = [
  {
    title: "My Dashboard",
    url: createPageUrl("ClientDashboard"),
    icon: Home,
  },
  {
    title: "My Meal Plan",
    url: createPageUrl("MyMealPlan"),
    icon: Calendar,
  },
  {
    title: "Progress Tracker",
    url: createPageUrl("ProgressTracker"),
    icon: TrendingUp,
  },
  {
    title: "Food Log",
    url: createPageUrl("FoodLog"),
    icon: ClipboardList,
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
  {
    title: "Recipes",
    url: createPageUrl("Recipes"),
    icon: ChefHat,
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
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      const messages = await base44.entities.Message.filter({ read: false });
      return messages.length;
    },
    enabled: !!user,
    initialData: 0,
  });

  const isDietitian = user?.role === 'admin';
  const navigationItems = isDietitian ? dietitianNavigation : clientNavigation;

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
                <h2 className="font-bold text-xl text-gray-900">Mealie Pro</h2>
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
          </SidebarContent>

          <SidebarFooter className="border-t border-orange-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {isDietitian ? 'Dietitian Account' : 'Client Account'}
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-orange-100 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-orange-50 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">Mealie Pro</h1>
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