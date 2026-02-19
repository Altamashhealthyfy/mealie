import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Flame, Star, Award, TrendingUp, Target, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientGamificationDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user && user?.user_type === 'client'
  });

  const { data: myPoints = [] } = useQuery({
    queryKey: ['myPoints', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.GamificationPoints.filter({ client_id: clientProfile.id });
    },
    enabled: !!clientProfile?.id
  });

  const { data: myBadges = [] } = useQuery({
    queryKey: ['myBadges', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.ClientBadge.filter({ client_id: clientProfile.id });
    },
    enabled: !!clientProfile?.id
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['allClientsLeaderboard', clientProfile?.assigned_coach],
    queryFn: async () => {
      if (!clientProfile?.assigned_coach) return [];
      return await base44.entities.Client.filter({ assigned_coach: clientProfile.assigned_coach });
    },
    enabled: !!clientProfile?.assigned_coach
  });

  const { data: allPoints = [] } = useQuery({
    queryKey: ['allPointsLeaderboard'],
    queryFn: () => base44.entities.GamificationPoints.list(),
    enabled: !!clientProfile
  });

  const { data: allBadges } = useQuery({
    queryKey: ['badgeDefinitions'],
    queryFn: () => base44.entities.Badge.list()
  });

  const { data: myChallenges = [] } = useQuery({
    queryKey: ['myChallenges', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.ClientChallenge.filter({ client_id: clientProfile.id });
    },
    enabled: !!clientProfile?.id
  });

  // Calculate my stats
  const totalPoints = myPoints.reduce((sum, p) => sum + p.points_earned, 0);
  const pointsByActivity = {};
  myPoints.forEach(p => {
    pointsByActivity[p.action_type] = (pointsByActivity[p.action_type] || 0) + p.points_earned;
  });

  // Calculate streak (consecutive days of activity)
  const calculateStreak = () => {
    if (myPoints.length === 0) return 0;
    const dates = [...new Set(myPoints.map(p => new Date(p.date_earned).toDateString()))].sort();
    let streak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const currDate = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);
      const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Build leaderboard
  const leaderboard = allClients.map(client => {
    const clientPoints = allPoints.filter(p => p.client_id === client.id);
    const totalClientPoints = clientPoints.reduce((sum, p) => sum + p.points_earned, 0);
    const clientBadges = myBadges.filter(b => b.client_id === client.id);
    return {
      ...client,
      totalPoints: totalClientPoints,
      badgeCount: clientBadges.length,
      pointsCount: clientPoints.length
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const myRank = leaderboard.findIndex(c => c.id === clientProfile?.id) + 1;

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Star className="w-10 h-10 text-yellow-500" />
            My Achievements
          </h1>
          <p className="text-gray-600">Track your progress and compete with others</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Total Points</p>
                  <p className="text-4xl font-bold">{totalPoints}</p>
                </div>
                <Target className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Badges Earned</p>
                  <p className="text-4xl font-bold">{myBadges.length}</p>
                </div>
                <Award className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Current Streak</p>
                  <p className="text-4xl font-bold flex items-center gap-1">{currentStreak} <Flame className="w-6 h-6" /></p>
                </div>
                <Flame className="w-12 h-12 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className={`text-white border-0 shadow-lg ${
            myRank === 1 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
            myRank === 2 ? 'bg-gradient-to-br from-gray-500 to-slate-600' :
            myRank === 3 ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
            'bg-gradient-to-br from-blue-500 to-cyan-600'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Your Rank</p>
                  <p className="text-4xl font-bold">#{myRank}</p>
                </div>
                {getRankIcon(myRank) || <TrendingUp className="w-12 h-12 opacity-20" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges */}
        {myChallenges.filter(c => c.status === 'active').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Active Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myChallenges.filter(c => c.status === 'active').map(challenge => (
                  <div key={challenge.id} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{challenge.challenge_title}</h3>
                      <Badge className="bg-blue-500">Active</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{challenge.progress_percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${challenge.progress_percentage || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Started {format(new Date(challenge.started_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Badges */}
        {myBadges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                My Badges ({myBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {myBadges.map(badgeRecord => {
                  const badgeDef = allBadges?.find(b => b.id === badgeRecord.badge_id);
                  return (
                    <div key={badgeRecord.id} className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-4xl mb-2">
                        {badgeDef?.icon?.startsWith('http') ? (
                          <img src={badgeDef.icon} alt="" className="w-12 h-12 mx-auto object-contain" />
                        ) : (
                          badgeDef?.icon || '🏆'
                        )}
                      </div>
                      <p className="font-semibold text-sm text-gray-900">{badgeDef?.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(badgeRecord.earned_date), 'MMM dd')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Points Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(pointsByActivity)
                .sort((a, b) => b[1] - a[1])
                .map(([activity, points]) => (
                  <div key={activity} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-medium text-gray-900 capitalize">
                      {activity.replace(/_/g, ' ')}
                    </span>
                    <Badge className="bg-green-600 text-white">+{points}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500" />
              Leaderboard
            </CardTitle>
            <CardDescription>See how you rank among your group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.map((client, idx) => {
                const isMe = client.id === clientProfile?.id;
                return (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isMe
                        ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 shadow-md'
                        : idx === 0
                        ? 'bg-yellow-50 border border-yellow-200'
                        : idx === 1
                        ? 'bg-gray-50 border border-gray-200'
                        : idx === 2
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10">
                        {idx < 3 ? getRankIcon(idx + 1) : <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>}
                      </div>
                      <div>
                        <p className={`font-semibold ${isMe ? 'text-orange-900' : 'text-gray-900'}`}>
                          {client.full_name} {isMe && '(You)'}
                        </p>
                        <p className="text-xs text-gray-500">{client.badgeCount} badges</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-orange-500 text-white">
                        {client.totalPoints} pts
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}