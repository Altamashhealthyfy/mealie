import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Target, Sparkles, Calendar, CheckCircle, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function ClientGamificationDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: client } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0];
    },
    enabled: !!user
  });

  const { data: points = [] } = useQuery({
    queryKey: ['clientPoints', client?.id],
    queryFn: () => base44.entities.GamificationPoints.filter({ client_id: client?.id }),
    enabled: !!client
  });

  const { data: clientBadges = [] } = useQuery({
    queryKey: ['clientBadges', client?.id],
    queryFn: () => base44.entities.ClientBadge.filter({ client_id: client?.id }),
    enabled: !!client
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
    enabled: !!client
  });

  const { data: clientChallenges = [] } = useQuery({
    queryKey: ['clientChallenges', client?.id],
    queryFn: () => base44.entities.ClientChallenge.filter({ client_id: client?.id }),
    enabled: !!client
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list(),
    enabled: !!client
  });

  const totalPoints = points.reduce((sum, p) => sum + p.points_earned, 0);
  const activeChallenges = clientChallenges.filter(c => c.status === 'active');
  const completedChallenges = clientChallenges.filter(c => c.status === 'completed');

  const getBadgeDetails = (badgeId) => badges.find(b => b.id === badgeId);
  const getChallengeDetails = (challengeId) => challenges.find(c => c.id === challengeId);

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'from-purple-600 to-pink-600';
      case 'epic': return 'from-purple-500 to-indigo-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 flex items-center justify-center">
        <p className="text-gray-600">Loading your achievements...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-orange-500" />
            My Achievements
          </h1>
          <p className="text-gray-600 mt-2">Track your progress and celebrate your wins!</p>
        </div>

        {/* Points Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none shadow-2xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-lg mb-2">Total Points</p>
                  <p className="text-6xl font-bold">{totalPoints}</p>
                  <p className="text-white/80 mt-2">{points.length} achievements earned</p>
                </div>
                <Sparkles className="w-24 h-24 text-white/20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Award className="w-6 h-6 text-purple-600" />
              My Badges ({clientBadges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientBadges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientBadges.map((clientBadge) => {
                  const badge = getBadgeDetails(clientBadge.badge_id);
                  return (
                    <motion.div
                      key={clientBadge.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      className={`relative p-6 rounded-xl bg-gradient-to-br ${getRarityColor(badge?.rarity)} text-white shadow-lg overflow-hidden`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          {badge?.icon?.startsWith('http') ? (
                            <img src={badge.icon} alt="" className="w-16 h-16 object-contain" />
                          ) : (
                            <span className="text-5xl">{badge?.icon || '🏆'}</span>
                          )}
                          <Badge className="bg-white/20 text-white border-none">
                            {badge?.rarity || 'common'}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-xl mb-2">{badge?.name || 'Special Badge'}</h3>
                        <p className="text-white/90 text-sm mb-3">{badge?.description || 'Achievement unlocked!'}</p>
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                          <Calendar className="w-4 h-4" />
                          <span>Earned: {new Date(clientBadge.earned_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No badges earned yet</p>
                <p className="text-gray-400 text-sm mt-2">Complete challenges and reach milestones to earn badges!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Challenges Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Challenges */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-blue-700">
                <Target className="w-5 h-5" />
                Active Challenges ({activeChallenges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeChallenges.length > 0 ? (
                <div className="space-y-4">
                  {activeChallenges.map((cc) => {
                    const challenge = getChallengeDetails(cc.challenge_id);
                    return (
                      <motion.div
                        key={cc.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-900">{challenge?.title || 'Challenge'}</h4>
                            <p className="text-sm text-gray-600 mt-1">{challenge?.description}</p>
                          </div>
                          <Badge className="bg-blue-600 text-white">
                            {challenge?.points_reward} pts
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-bold text-blue-600">{cc.progress_percentage || 0}%</span>
                          </div>
                          <Progress value={cc.progress_percentage || 0} className="h-3" />
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Started: {new Date(cc.start_date).toLocaleDateString()}</span>
                            <span>Due: {new Date(cc.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-gray-500">No active challenges</p>
                  <p className="text-gray-400 text-sm mt-1">Start a new challenge to earn points!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Challenges */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-green-700">
                <CheckCircle className="w-5 h-5" />
                Completed Challenges ({completedChallenges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedChallenges.length > 0 ? (
                <div className="space-y-4">
                  {completedChallenges.map((cc) => {
                    const challenge = getChallengeDetails(cc.challenge_id);
                    return (
                      <motion.div
                        key={cc.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="p-4 bg-white rounded-lg border border-green-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-900">{challenge?.title || 'Challenge'}</h4>
                            <p className="text-sm text-gray-600 mt-1">{challenge?.description}</p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-100">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-white">
                              +{challenge?.points_reward} pts
                            </Badge>
                            {cc.completed_date && (
                              <span className="text-xs text-gray-500">
                                {new Date(cc.completed_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Flame className="w-5 h-5 text-orange-500" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-gray-500">No completed challenges yet</p>
                  <p className="text-gray-400 text-sm mt-1">Complete your first challenge!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Points Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-orange-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {points.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {points.slice(0, 10).map((point) => (
                  <div key={point.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {point.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      {point.description && (
                        <p className="text-sm text-gray-600">{point.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(point.date_earned).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg px-4 py-1">
                      +{point.points_earned}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No activity yet</p>
                <p className="text-gray-400 text-sm mt-1">Start your journey to earn points!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}