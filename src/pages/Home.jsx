import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChefHat, Search, Heart, TrendingUp, Apple, Sparkles, User, Loader2 } from "lucide-react";

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

  const features = [
    {
      title: "Food Lookup",
      description: "Get detailed macro information for Indian foods",
      icon: Search,
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("FoodLookup"),
    },
    {
      title: "MPESS Tracker",
      description: "Track your holistic wellness journey",
      icon: Heart,
      color: "from-pink-500 to-rose-500",
      link: createPageUrl("MPESSTracker"),
    },
  ];

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

        {/* Stats Cards */}
        {userProfile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Daily Target</p>
                    <p className="text-2xl font-bold text-gray-900">{userProfile.target_calories || 0}</p>
                    <p className="text-xs text-gray-500">calories</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Apple className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Protein</p>
                    <p className="text-2xl font-bold text-gray-900">{userProfile.target_protein || 0}g</p>
                    <p className="text-xs text-gray-500">daily</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Plan</p>
                    <p className="text-2xl font-bold text-gray-900">{activeMealPlan?.duration || 0}</p>
                    <p className="text-xs text-gray-500">days</p>
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

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Explore Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Link key={feature.title} to={feature.link}>
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur overflow-hidden group">
                  <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
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