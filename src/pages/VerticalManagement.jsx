import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Heart,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  Lock,
  Crown
} from "lucide-react";
import { format } from "date-fns";
import { useCoachPlanPermissions } from "@/components/permissions/useCoachPlanPermissions";
import { createPageUrl } from "@/utils";

export default function VerticalManagement() {
  const { user, canAccessVerticals, isLoading: permissionsLoading } = useCoachPlanPermissions();

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: showcases } = useQuery({
    queryKey: ['showcases'],
    queryFn: () => base44.entities.Showcase.list('-showcase_date'),
    initialData: [],
  });

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list('-start_date'),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: [],
  });

  // Check access for student_coach
  if (!permissionsLoading && user?.user_type === 'student_coach' && !canAccessVerticals) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            <CardTitle className="text-center text-2xl">Feature Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Verticals Dashboard is not included in your current plan.
            </p>
            <Alert className="bg-white border-blue-300">
              <Crown className="w-5 h-5 text-blue-600" />
              <AlertDescription>
                Upgrade your plan to access business verticals management.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = createPageUrl('CoachSubscriptions')}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Health Coach Training Stats
  const coachLeads = leads.filter(l => l.business_vertical === 'health_coach_training');
  const silverBuyers = coachLeads.filter(l => l.pipeline_stage === 'silver_buyer').length;
  const diplomaBuyers = coachLeads.filter(l => l.pipeline_stage === 'diploma_buyer').length;
  const diamondBuyers = coachLeads.filter(l => l.pipeline_stage === 'diamond_buyer').length;

  const diplomaShowcases = showcases.filter(s => s.showcase_type === 'diploma_showcase');
  const diamondShowcases = showcases.filter(s => s.showcase_type === 'diamond_showcase');
  
  const diplomaAttended = diplomaShowcases.filter(s => s.attendance_status === 'attended').length;
  const diplomaPurchased = diplomaShowcases.filter(s => s.purchased).length;
  const diplomaConversion = diplomaAttended > 0 ? ((diplomaPurchased / diplomaAttended) * 100).toFixed(1) : 0;

  const diamondAttended = diamondShowcases.filter(s => s.attendance_status === 'attended').length;
  const diamondPurchased = diamondShowcases.filter(s => s.purchased).length;
  const diamondConversion = diamondAttended > 0 ? ((diamondPurchased / diamondAttended) * 100).toFixed(1) : 0;

  // Non-buyers for follow-up
  const diplomaNonBuyers = diplomaShowcases.filter(s => s.attendance_status === 'attended' && !s.purchased && s.follow_up_status === 'pending');
  const diamondNonBuyers = diamondShowcases.filter(s => s.attendance_status === 'attended' && !s.purchased && s.follow_up_status === 'pending');

  // Health/Disease Management Stats
  const healthLeads = leads.filter(l => l.business_vertical === 'health_disease_management');
  const healthClients = clients.filter(c => c.business_vertical === 'health_disease_management');
  const healthChallenges = challenges.filter(c => c.challenge_type === '3_7_days_health');
  
  const healthUpgrades = healthClients.filter(c => (c.upgrade_history?.length || 0) > 0).length;
  const avgUpgrades = healthClients.length > 0 ? (healthClients.reduce((sum, c) => sum + (c.upgrade_history?.length || 0), 0) / healthClients.length).toFixed(1) : 0;

  const challengeCompleted = healthChallenges.filter(c => c.attendance_status === 'completed').length;
  const challengePurchased = healthChallenges.filter(c => c.purchased_after_challenge).length;
  const challengeConversion = challengeCompleted > 0 ? ((challengePurchased / challengeCompleted) * 100).toFixed(1) : 0;

  // Prosperity Stats
  const prosperityLeads = leads.filter(l => l.business_vertical === 'prosperity_program');
  const prosperityClients = clients.filter(c => c.business_vertical === 'prosperity_program');
  const prosperityChallenges = challenges.filter(c => c.challenge_type === '5_days_prosperity');
  
  const prosperityFromFree = prosperityChallenges.filter(c => c.came_from_free_program).length;
  const prosperityFromCommunity = prosperityLeads.filter(l => l.lead_source === 'archit_community').length;
  const prosperityFromStudents = prosperityLeads.filter(l => l.lead_source === 'health_coach_student').length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Business Verticals Dashboard</h1>
          <p className="text-gray-600">Track all 3 business verticals in one place</p>
        </div>

        <Tabs defaultValue="coach" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-3">
            <TabsTrigger value="coach" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Health Coach Training
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Health/Disease Management
            </TabsTrigger>
            <TabsTrigger value="prosperity" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Prosperity Program
            </TabsTrigger>
          </TabsList>

          {/* HEALTH COACH TRAINING VERTICAL */}
          <TabsContent value="coach">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                  <CardContent className="p-6">
                    <Users className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{coachLeads.length}</p>
                    <p className="text-sm opacity-90">Total Leads</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  <CardContent className="p-6">
                    <Target className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{silverBuyers}</p>
                    <p className="text-sm opacity-90">Silver Buyers</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                  <CardContent className="p-6">
                    <Award className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{diplomaBuyers}</p>
                    <p className="text-sm opacity-90">Diploma Buyers</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  <CardContent className="p-6">
                    <GraduationCap className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{diamondBuyers}</p>
                    <p className="text-sm opacity-90">Diamond Buyers</p>
                  </CardContent>
                </Card>
              </div>

              {/* Funnel Flow */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <CardTitle className="text-2xl">🎯 Complete Funnel Flow</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="text-center flex-1">
                      <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                        <p className="text-2xl font-bold text-blue-600">{coachLeads.length}</p>
                      </div>
                      <p className="text-sm font-semibold">Leads</p>
                    </div>
                    <div className="text-3xl text-gray-400">→</div>
                    <div className="text-center flex-1">
                      <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                        <p className="text-2xl font-bold text-purple-600">{coachLeads.filter(l => l.pipeline_stage === 'webinar_attended').length}</p>
                      </div>
                      <p className="text-sm font-semibold">Webinar<br/>Attended</p>
                    </div>
                    <div className="text-3xl text-gray-400">→</div>
                    <div className="text-center flex-1">
                      <div className="w-20 h-20 mx-auto bg-cyan-100 rounded-full flex items-center justify-center mb-2">
                        <p className="text-2xl font-bold text-cyan-600">{silverBuyers}</p>
                      </div>
                      <p className="text-sm font-semibold">Silver<br/>Buyers</p>
                    </div>
                    <div className="text-3xl text-gray-400">→</div>
                    <div className="text-center flex-1">
                      <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <p className="text-2xl font-bold text-green-600">{diplomaBuyers}</p>
                      </div>
                      <p className="text-sm font-semibold">Diploma<br/>Buyers</p>
                    </div>
                    <div className="text-3xl text-gray-400">→</div>
                    <div className="text-center flex-1">
                      <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                        <p className="text-2xl font-bold text-orange-600">{diamondBuyers}</p>
                      </div>
                      <p className="text-sm font-semibold">Diamond<br/>Buyers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Showcases */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Diploma Showcase */}
                <Card className="border-none shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CardTitle>🎓 Diploma Showcase</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Registered</p>
                        <p className="text-3xl font-bold text-blue-600">{diplomaShowcases.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Attended</p>
                        <p className="text-3xl font-bold text-green-600">{diplomaAttended}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Purchased</p>
                        <p className="text-3xl font-bold text-orange-600">{diplomaPurchased}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Conversion</p>
                        <p className="text-3xl font-bold text-purple-600">{diplomaConversion}%</p>
                      </div>
                    </div>

                    {diplomaNonBuyers.length > 0 && (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="font-semibold text-yellow-900 mb-2">
                          ⚠️ {diplomaNonBuyers.length} Non-Buyers Need Follow-Up
                        </p>
                        <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600">
                          View & Send Offers
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Diamond Showcase */}
                <Card className="border-none shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    <CardTitle>💎 Diamond Showcase</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Registered</p>
                        <p className="text-3xl font-bold text-blue-600">{diamondShowcases.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Attended</p>
                        <p className="text-3xl font-bold text-green-600">{diamondAttended}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Purchased</p>
                        <p className="text-3xl font-bold text-orange-600">{diamondPurchased}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Conversion</p>
                        <p className="text-3xl font-bold text-purple-600">{diamondConversion}%</p>
                      </div>
                    </div>

                    {diamondNonBuyers.length > 0 && (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="font-semibold text-yellow-900 mb-2">
                          ⚠️ {diamondNonBuyers.length} Non-Buyers Need Follow-Up
                        </p>
                        <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600">
                          View & Send Offers
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* HEALTH/DISEASE MANAGEMENT VERTICAL */}
          <TabsContent value="health">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  <CardContent className="p-6">
                    <Users className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{healthLeads.length}</p>
                    <p className="text-sm opacity-90">Total Leads</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                  <CardContent className="p-6">
                    <Heart className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{healthClients.length}</p>
                    <p className="text-sm opacity-90">Active Clients</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                  <CardContent className="p-6">
                    <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{healthUpgrades}</p>
                    <p className="text-sm opacity-90">Clients Upgraded</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                  <CardContent className="p-6">
                    <Target className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{avgUpgrades}</p>
                    <p className="text-sm opacity-90">Avg Upgrades/Client</p>
                  </CardContent>
                </Card>
              </div>

              {/* Challenge Stats */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle className="text-2xl">📅 3-7 Days Health Challenge (1-2-Many Model)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                        <p className="text-3xl font-bold text-blue-600">{healthChallenges.length}</p>
                      </div>
                      <p className="font-semibold">Total Registered</p>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <p className="text-3xl font-bold text-green-600">{challengeCompleted}</p>
                      </div>
                      <p className="font-semibold">Completed Challenge</p>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-3">
                        <p className="text-3xl font-bold text-orange-600">{challengePurchased}</p>
                      </div>
                      <p className="font-semibold">Bought 90 Days</p>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                        <p className="text-3xl font-bold text-purple-600">{challengeConversion}%</p>
                      </div>
                      <p className="font-semibold">Conversion Rate</p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2">💡 Challenge Flow:</h4>
                    <p className="text-sm text-gray-700">
                      3-7 Days Challenge → 90 Days Program (Low Ticket) → High Ticket Personalized Plan
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Sources */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <CardTitle>📊 Lead Sources Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {['google_ad', 'facebook_ad', 'instagram_ad', 'referral', 'organic'].map(source => {
                      const count = healthLeads.filter(l => l.lead_source === source).length;
                      const percentage = healthLeads.length > 0 ? ((count / healthLeads.length) * 100).toFixed(0) : 0;
                      
                      return (
                        <div key={source} className="flex items-center gap-3">
                          <div className="w-32 text-sm capitalize">{source.replace('_', ' ')}</div>
                          <div className="flex-1">
                            <div className="h-8 bg-gray-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center px-3 text-white text-sm font-semibold"
                                style={{ width: `${percentage}%` }}
                              >
                                {count}
                              </div>
                            </div>
                          </div>
                          <div className="w-16 text-right text-sm text-gray-600">{percentage}%</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PROSPERITY PROGRAM VERTICAL */}
          <TabsContent value="prosperity">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  <CardContent className="p-6">
                    <Users className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{prosperityLeads.length}</p>
                    <p className="text-sm opacity-90">Total Leads</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  <CardContent className="p-6">
                    <Award className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{prosperityClients.length}</p>
                    <p className="text-sm opacity-90">Active Students</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-teal-500 text-white">
                  <CardContent className="p-6">
                    <Heart className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{prosperityFromFree}</p>
                    <p className="text-sm opacity-90">From Free Program</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
                  <CardContent className="p-6">
                    <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{prosperityChallenges.length}</p>
                    <p className="text-sm opacity-90">5 Days Challenges</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lead Sources */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <CardTitle className="text-2xl">🎯 Unique Lead Sources (No Ads!)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-blue-50 rounded-xl text-center">
                      <p className="text-4xl font-bold text-blue-600 mb-2">{prosperityLeads.filter(l => l.lead_source === 'existing_client').length}</p>
                      <p className="font-semibold text-gray-700">Existing Clients</p>
                      <p className="text-xs text-gray-600 mt-1">From health programs</p>
                    </div>
                    <div className="p-6 bg-green-50 rounded-xl text-center">
                      <p className="text-4xl font-bold text-green-600 mb-2">{prosperityFromStudents}</p>
                      <p className="font-semibold text-gray-700">Health Coach Students</p>
                      <p className="text-xs text-gray-600 mt-1">Our trained coaches</p>
                    </div>
                    <div className="p-6 bg-purple-50 rounded-xl text-center">
                      <p className="text-4xl font-bold text-purple-600 mb-2">{prosperityFromCommunity}</p>
                      <p className="font-semibold text-gray-700">Archit's Community</p>
                      <p className="text-xs text-gray-600 mt-1">Community referrals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prosperity Flow */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <CardTitle className="text-2xl">🚀 Prosperity Funnel</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                      <h4 className="font-bold text-green-900 mb-2">Step 1: Free 8 Weeks Program</h4>
                      <p className="text-sm text-gray-700">Includes 5 Days Challenge built-in</p>
                    </div>
                    <div className="text-center text-3xl text-gray-400">↓</div>
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <h4 className="font-bold text-blue-900 mb-2">Step 2: 5 Days Prosperity Challenge</h4>
                      <p className="text-sm text-gray-700">High engagement experience</p>
                    </div>
                    <div className="text-center text-3xl text-gray-400">↓</div>
                    <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                      <h4 className="font-bold text-purple-900 mb-2">Step 3: Master of Prosperity Program</h4>
                      <p className="text-sm text-gray-700">Premium coaching program</p>
                      <p className="text-xl font-bold text-purple-600 mt-2">
                        {prosperityChallenges.filter(c => c.purchased_after_challenge).length} Enrolled
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}