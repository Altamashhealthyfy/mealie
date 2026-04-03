import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChefHat, Search, Heart, TrendingUp, Apple, Sparkles, User, Loader2, BookOpen, Scale, Target, MessageCircle } from "lucide-react";
import ClientGuidePanel from "@/components/common/ClientGuidePanel";
 

export default function Home() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    },
    retry: false,
    staleTime: 300000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['homeUserProfile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ created_by: user?.email }, '-created_date', 1).then(res => res[0] ?? null),
    enabled: !!user?.email,
    staleTime: 300000,
  });

  const { data: activeMealPlan } = useQuery({
    queryKey: ['homeActiveMealPlan', user?.email],
    queryFn: () => base44.entities.MealPlan.filter({ active: true, created_by: user?.email }, '-created_date', 1).then(res => res[0] ?? null),
    enabled: !!user?.email,
    staleTime: 300000,
  });

  const { data: recentTracking } = useQuery({
    queryKey: ['homeRecentTracking', user?.email],
    queryFn: () => base44.entities.MPESSTracker.filter({ created_by: user?.email }, '-created_date', 7),
    enabled: !!user?.email,
    initialData: [],
    staleTime: 300000,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) return clients[0];
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.email?.toLowerCase() === user.email?.toLowerCase()) || null;
    },
    enabled: !!user && user.user_type === 'client',
  });

  const { data: myGoals } = useQuery({
    queryKey: ['myGoalsHome', clientProfile?.id],
    queryFn: async () => {
      const goals = await base44.entities.ProgressGoal.filter({ client_id: clientProfile?.id, status: 'active' });
      return goals.slice(0, 3);
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const { data: recentProgress } = useQuery({
    queryKey: ['recentProgressHome', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({ client_id: clientProfile?.id });
      return logs
        .filter(l => l.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 1);
    },
    enabled: !!clientProfile,
    initialData: [],
  });



  const features = [
    {
      title: "My Progress",
      description: "Track your weight, measurements, and wellness metrics",
      icon: Scale,
      color: "from-blue-500 to-cyan-500",
      link: createPageUrl("ProgressTracking"),
    },

    {
      title: "Messages",
      description: "Chat directly with your health coach",
      icon: MessageCircle,
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("ClientCommunication"),
    },
    {
      title: "MPESS Wellness",
      description: "Track your holistic wellness journey",
      icon: Heart,
      color: "from-pink-500 to-rose-500",
      link: createPageUrl("MPESSTracker"),
    },
  ];

  useEffect(() => {
    if (!userLoading && user) {
      const dietitianRoles = ['super_admin', 'team_member', 'student_coach', 'student_team_member'];
      if (dietitianRoles.includes(user.user_type)) {
        navigate(createPageUrl('DietitianDashboard'), { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_type, userLoading]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 pb-24 md:pb-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 md:gap-3 mb-4 md:mb-6 overflow-x-auto pb-1">
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 rounded-2xl shadow-lg hover:shadow-xl px-4 md:px-6 py-2 text-sm flex-shrink-0">
            <BookOpen className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Guides
          </Button>
          <Button variant="outline" className="bg-white border-gray-200 rounded-2xl shadow-sm hover:shadow-md px-4 md:px-6 py-2 text-sm flex-shrink-0">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Quick Tips
          </Button>
        </div>

        {/* Feature Cards - Large CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {/* Home Dashboard Card */}
          <Link to={createPageUrl("ClientDashboard")}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden h-28 md:h-40 cursor-pointer">
              <CardContent className="p-4 md:p-8 h-full flex flex-col justify-center">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1 md:mb-2">
                      <div className="w-10 md:w-12 h-10 md:h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                        <ChefHat className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold mb-1">Home Dashboard</h3>
                    <p className="text-blue-50 text-xs md:text-sm max-w-xs">Your personalized wellness hub with progress tracking</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* My Progress Card */}
          <Link to={createPageUrl("ProgressTracking")}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden h-28 md:h-40 cursor-pointer">
              <CardContent className="p-4 md:p-8 h-full flex flex-col justify-center">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1 md:mb-2">
                      <div className="w-10 md:w-12 h-10 md:h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold mb-1">My Progress</h3>
                    <p className="text-green-50 text-xs md:text-sm max-w-xs">Track your weight, measurements, and wellness journey</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Weight Tracking Section - For Clients */}
        {clientProfile && (
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Weight Tracking
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="border-none shadow-md bg-white/80 backdrop-blur hover:shadow-lg transition-all">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Scale className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 font-medium">Current Weight</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{recentProgress[0]?.weight || clientProfile.weight || 0} <span className="text-[10px] md:text-xs font-normal">kg</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white/80 backdrop-blur hover:shadow-lg transition-all">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Target className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 font-medium">Target Weight</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{clientProfile.target_weight || 0} <span className="text-[10px] md:text-xs font-normal">kg</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white/80 backdrop-blur hover:shadow-lg transition-all">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 font-medium">Goals Achieved</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{myGoals.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white/80 backdrop-blur hover:shadow-lg transition-all">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500 font-medium">MPESS Days</p>
                      <p className="text-lg md:text-2xl font-bold text-gray-900">{recentTracking.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Active Goals Preview */}
         {clientProfile && myGoals.length > 0 && (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Your Active Goals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {myGoals.map(goal => {
                const progress = goal.start_value && goal.target_value 
                  ? Math.min(100, Math.abs(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100))
                  : 0;

                return (
                  <Card key={goal.id} className="border-none shadow-md hover:shadow-lg transition-all bg-white/80 backdrop-blur">
                    <CardContent className="p-3 md:p-5">
                      <div className="flex items-start justify-between mb-2 md:mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-xs md:text-sm">{goal.title}</h3>
                          <p className="text-[10px] md:text-xs text-gray-600 mt-1">{goal.description}</p>
                        </div>
                        <Badge className={`text-[10px] md:text-xs ${
                          goal.priority === 'high' ? 'bg-red-500' :
                          goal.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>{goal.priority}</Badge>
                      </div>
                      <div className="space-y-2 mt-2 md:mt-4">
                        <div className="flex justify-between text-[10px] md:text-xs">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold text-gray-900">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 md:h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] md:text-xs text-gray-500">
                          <span>{goal.current_value} {goal.unit}</span>
                          <span>Target: {goal.target_value} {goal.unit}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Client Guide Panel */}
         <ClientGuidePanel />

        {/* Quick Navigation Section */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Essential Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {features.map((feature) => (
              <Link key={feature.title} to={feature.link}>
                <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur overflow-hidden group">
                  <div className={`h-1 bg-gradient-to-r ${feature.color}`}></div>
                  <CardContent className="p-3 md:p-6">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                        <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{feature.title}</h3>
                        <p className="text-gray-600 text-xs md:text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* MPESS Framework Info */}
         <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Holistic Wellness Framework
            </CardTitle>
            <p className="text-xs md:text-sm text-gray-600 mt-2">MPESS goes beyond nutrition to help you achieve complete wellbeing</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
              {[
                { letter: "M", word: "Mind", desc: "Mental wellness", color: "from-blue-500 to-cyan-500" },
                { letter: "P", word: "Physical", desc: "Movement & hydration", color: "from-green-500 to-emerald-500" },
                { letter: "E", word: "Emotional", desc: "Journaling & breathwork", color: "from-yellow-500 to-orange-500" },
                { letter: "S", word: "Social", desc: "Connection & bonding", color: "from-pink-500 to-rose-500" },
                { letter: "S", word: "Spiritual", desc: "Meditation & gratitude", color: "from-purple-500 to-indigo-500" },
              ].map((item) => (
                <div key={item.letter + item.word} className="text-center p-2 md:p-3 rounded-lg bg-white/50 hover:bg-white/80 transition-all">
                  <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto mb-1 md:mb-2 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                    <span className="text-lg md:text-xl font-bold text-white">{item.letter}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-xs md:text-sm mb-1">{item.word}</h4>
                  <p className="text-[10px] md:text-xs text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}