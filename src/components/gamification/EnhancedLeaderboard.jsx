import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame, Award, TrendingUp, Medal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EnhancedLeaderboard({ clientId, clientEmail }) {
  const [timeFrame, setTimeFrame] = useState('week');

  // Fetch all clients and their points
  const { data: allClients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: async () => await base44.entities.Client.list('created_date', 1000)
  });

  // Fetch points for all clients
  const { data: allPoints = [] } = useQuery({
    queryKey: ['allPoints'],
    queryFn: async () => await base44.entities.GamificationPoints.list('date_awarded', 1000)
  });

  // Fetch badges for all clients
  const { data: allBadges = [] } = useQuery({
    queryKey: ['allBadges'],
    queryFn: async () => await base44.entities.Badge.list('earned_date', 1000)
  });

  // Calculate leaderboard data
  const calculateLeaderboard = () => {
    const leaderboard = allClients.map(client => {
      const clientPoints = allPoints.filter(p => p.client_id === client.id);
      const totalPoints = clientPoints.reduce((sum, p) => sum + p.points_awarded, 0);
      const badges = allBadges.filter(b => b.client_id === client.id).length;
      
      return {
        id: client.id,
        name: client.full_name,
        email: client.email,
        points: totalPoints,
        badges: badges,
        photo: client.profile_photo_url
      };
    }).sort((a, b) => b.points - a.points);

    return leaderboard;
  };

  const leaderboard = calculateLeaderboard();
  const currentUserRank = leaderboard.findIndex(u => u.email === clientEmail) + 1;
  const currentUserData = leaderboard.find(u => u.email === clientEmail);

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getStreak = (clientEmail) => {
    const clientPoints = allPoints
      .filter(p => p.client_email === clientEmail)
      .sort((a, b) => new Date(b.date_awarded) - new Date(a.date_awarded))
      .slice(0, 7);

    return clientPoints.length >= 3 ? `🔥 ${clientPoints.length}-day streak` : null;
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="top" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="top">🏆 Top Performers</TabsTrigger>
          <TabsTrigger value="badges">🎖️ Badge Kings</TabsTrigger>
          <TabsTrigger value="stats">📊 Your Stats</TabsTrigger>
        </TabsList>

        {/* Top Performers */}
        <TabsContent value="top">
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Top Performers This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {leaderboard.slice(0, 10).map((user, idx) => {
                const isCurrentUser = user.email === clientEmail;
                const streak = getStreak(user.email);

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl font-bold text-orange-600 w-12 text-center">
                          {getMedalEmoji(idx + 1)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {user.name}
                            {isCurrentUser && <Badge className="ml-2 bg-blue-600">You</Badge>}
                          </p>
                          {streak && <p className="text-xs text-red-600 font-semibold mt-1">{streak}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">{user.points}</p>
                        <p className="text-xs text-gray-600">points</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badge Kings */}
        <TabsContent value="badges">
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Badge Kings & Queens
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {leaderboard
                .sort((a, b) => b.badges - a.badges)
                .slice(0, 10)
                .map((user, idx) => {
                  const isCurrentUser = user.email === clientEmail;

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Medal className="w-6 h-6 text-purple-600" />
                          <div>
                            <p className="font-semibold text-gray-800">
                              {user.name}
                              {isCurrentUser && <Badge className="ml-2 bg-blue-600">You</Badge>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex gap-1 justify-end mb-1">
                            {[...Array(Math.min(user.badges, 5))].map((_, i) => (
                              <span key={i} className="text-lg">🏅</span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600">{user.badges} badges</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Your Stats */}
        <TabsContent value="stats">
          {currentUserData && (
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Your Achievement Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Rank */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 text-center"
                >
                  <p className="text-sm text-gray-600 mb-2">YOUR RANK</p>
                  <p className="text-5xl font-bold text-blue-600">#{currentUserRank}</p>
                  <p className="text-gray-600 mt-2">out of {leaderboard.length} participants</p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: '⭐', label: 'Total Points', value: currentUserData.points },
                    { icon: '🏅', label: 'Badges Earned', value: currentUserData.badges },
                    { icon: '🎯', label: 'Percentile', value: `${Math.round((leaderboard.length - currentUserRank + 1) / leaderboard.length * 100)}%` }
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-white rounded-lg border-2 border-gray-200 text-center"
                    >
                      <p className="text-3xl mb-2">{stat.icon}</p>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Next Milestone */}
                {currentUserRank > 1 && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">Next Goal:</p>
                    <p className="text-gray-700">
                      Earn {leaderboard[currentUserRank - 2]?.points - currentUserData.points || 0} more points to reach rank #{currentUserRank - 1}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}