import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChefHat, Search, Heart, TrendingUp, Apple, Sparkles, User, Loader2, BookOpen, Scale, Target, MessageCircle } from "lucide-react";

export default function Home() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: 300000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['homeUserProfile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ created_by: user?.email }, '-created_date', 1).then(res => res[0]),
    enabled: !!user?.email,
    staleTime: 300000,
  });

  const { data: activeMealPlan } = useQuery({
    queryKey: ['homeActiveMealPlan', user?.email],
    queryFn: () => base44.entities.MealPlan.filter({ active: true, created_by: user?.email }, '-created_date', 1).then(res => res[0]),
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
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 1);
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const { data: featuredResources } = useQuery({
    queryKey: ['featuredResources'],
    queryFn: async () => {
      const resources = await base44.entities.Resource.filter({ featured: true, published: true });
      return resources.slice(0, 3);
    },
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
      title: "Resource Library",
      description: "Educational content tailored to your goals",
      icon: BookOpen,
      color: "from-purple-500 to-pink-500",
      link: createPageUrl("ResourceLibrary"),
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

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <Badge className="bg-white/20 text-white border-white/30">MPESS Framework</Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Welcome to Mealie
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
              Your personalized Indian meal planning assistant for a balanced, healthy lifestyle
            </p>
            {!userProfile ? (
              <Link to={createPageUrl("Profile")}>
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 shadow-xl">
                  <User className="w-5 h-5 mr-2" />
                  Complete Your Profile
                </Button>
              </Link>
            ) : (
              <div className="flex flex-wrap gap-4">
                <Link to={createPageUrl("FoodLookup")}>
                  <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 shadow-xl">
                    <Search className="w-5 h-5 mr-2" />
                    Food Lookup
                  </Button>
                </Link>
                <Link to={createPageUrl("MPESSTracker")}>
                  <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                    <Heart className="w-5 h-5 mr-2" />
                    MPESS Tracker
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Enhanced for Clients */}
        {clientProfile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Weight</p>
                    <p className="text-2xl font-bold text-gray-900">{recentProgress[0]?.weight || clientProfile.weight || 0}</p>
                    <p className="text-xs text-gray-500">kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Goals</p>
                    <p className="text-2xl font-bold text-gray-900">{myGoals.length}</p>
                    <p className="text-xs text-gray-500">in progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Target Calories</p>
                    <p className="text-2xl font-bold text-gray-900">{clientProfile.target_calories || 0}</p>
                    <p className="text-xs text-gray-500">per day</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">MPESS Days</p>
                    <p className="text-2xl font-bold text-gray-900">{recentTracking.length}</p>
                    <p className="text-xs text-gray-500">this week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Goals Preview */}
        {clientProfile && myGoals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-600" />
                Your Active Goals
              </h2>
              <Link to={createPageUrl("ProgressTracking")}>
                <Button variant="outline">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myGoals.map(goal => {
                const progress = goal.start_value && goal.target_value 
                  ? Math.min(100, Math.abs(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100))
                  : 0;

                return (
                  <Card key={goal.id} className="border-none shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                        <Badge className={
                          goal.priority === 'high' ? 'bg-red-500' :
                          goal.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }>{goal.priority}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
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

        {/* Featured Resources */}
        {featuredResources.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-orange-600" />
                Featured Resources
              </h2>
              <Link to={createPageUrl("ResourceLibrary")}>
                <Button variant="outline">Browse All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredResources.map(resource => (
                <Link key={resource.id} to={createPageUrl("ResourceLibrary")}>
                  <Card className="border-none shadow-lg hover:shadow-xl transition-all">
                    {resource.thumbnail_url && (
                      <img src={resource.thumbnail_url} alt={resource.title} className="w-full h-40 object-cover rounded-t-lg" />
                    )}
                    <CardHeader>
                      <Badge className="w-fit capitalize mb-2">{resource.resource_type}</Badge>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Link key={feature.title} to={feature.link}>
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur overflow-hidden group">
                  <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                  <CardHeader>
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 leading-relaxed text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* MPESS Framework Info */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              What is MPESS?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-6 leading-relaxed">
              MPESS is a holistic wellness framework that goes beyond just nutrition to help you achieve complete wellbeing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { letter: "M", word: "Mind", desc: "Mental wellness & affirmations", color: "from-blue-500 to-cyan-500" },
                { letter: "P", word: "Physical", desc: "Movement & hydration", color: "from-green-500 to-emerald-500" },
                { letter: "E", word: "Emotional", desc: "Journaling & breathwork", color: "from-yellow-500 to-orange-500" },
                { letter: "S", word: "Social", desc: "Connection & bonding", color: "from-pink-500 to-rose-500" },
                { letter: "S", word: "Spiritual", desc: "Meditation & gratitude", color: "from-purple-500 to-indigo-500" },
              ].map((item) => (
                <div key={item.letter + item.word} className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl font-bold text-white">{item.letter}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{item.word}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}