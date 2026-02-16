import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, TrendingUp, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Leaderboard({ type = "all", limit = 10, showCurrentUser = true }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard', type],
    queryFn: async () => {
      // Get all clients
      const clients = await base44.entities.Client.list();
      
      // Get points for each client
      const leaderboard = await Promise.all(
        clients.map(async (client) => {
          const points = await base44.entities.GamificationPoints.filter({ 
            client_id: client.id 
          });
          
          const challenges = await base44.entities.ClientChallenge.filter({ 
            client_id: client.id 
          });
          
          const totalPoints = points.reduce((sum, p) => sum + p.points_earned, 0);
          const completedChallenges = challenges.filter(c => c.status === 'completed').length;
          const activeChallenges = challenges.filter(c => c.status === 'active').length;
          
          // Calculate streak
          const recentPoints = points
            .sort((a, b) => new Date(b.date_earned) - new Date(a.date_earned))
            .slice(0, 30);
          
          let currentStreak = 0;
          let checkDate = new Date();
          checkDate.setHours(0, 0, 0, 0);
          
          for (let i = 0; i < 30; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const hasActivity = recentPoints.some(p => 
              p.date_earned?.split('T')[0] === dateStr
            );
            
            if (hasActivity) {
              currentStreak++;
            } else if (i > 0) {
              break;
            }
            
            checkDate.setDate(checkDate.getDate() - 1);
          }
          
          return {
            client,
            totalPoints,
            completedChallenges,
            activeChallenges,
            currentStreak,
            lastActivity: points[points.length - 1]?.date_earned
          };
        })
      );
      
      // Sort by total points
      return leaderboard
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  const currentUserData = leaderboardData?.find(
    item => item.client.email === user?.email
  );
  const currentUserRank = leaderboardData?.findIndex(
    item => item.client.email === user?.email
  ) + 1;

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
  };

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-orange-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current User Card (if not in top 10) */}
        {showCurrentUser && currentUserData && currentUserRank > limit && (
          <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">#{currentUserRank}</div>
                <div>
                  <p className="font-semibold">You</p>
                  <p className="text-sm opacity-90">{currentUserData.totalPoints} points</p>
                </div>
              </div>
              {currentUserData.currentStreak > 0 && (
                <Badge className="bg-white/20 text-white">
                  <Flame className="w-3 h-3 mr-1" />
                  {currentUserData.currentStreak} day streak
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        {leaderboardData?.map((item, index) => {
          const rank = index + 1;
          const isCurrentUser = item.client.email === user?.email;
          
          return (
            <div
              key={item.client.id}
              className={`p-4 rounded-lg transition-all ${
                isCurrentUser 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                  : rank <= 3
                  ? 'bg-white/80 border-2 border-orange-200'
                  : 'bg-white/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarImage src={item.client.profile_photo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-400 text-white">
                    {item.client.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                    {isCurrentUser ? 'You' : item.client.full_name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm ${isCurrentUser ? 'text-white/90' : 'text-gray-600'}`}>
                      {item.totalPoints} points
                    </p>
                    {item.completedChallenges > 0 && (
                      <Badge variant={isCurrentUser ? "outline" : "secondary"} className={isCurrentUser ? "text-white border-white/30" : ""}>
                        {item.completedChallenges} challenges
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Streak */}
                {item.currentStreak > 0 && (
                  <Badge className={isCurrentUser ? "bg-white/20 text-white" : "bg-orange-500 text-white"}>
                    <Flame className="w-3 h-3 mr-1" />
                    {item.currentStreak}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {leaderboardData?.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}