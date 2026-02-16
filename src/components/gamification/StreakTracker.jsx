import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, CheckCircle, TrendingUp } from "lucide-react";

export default function StreakTracker({ clientId }) {
  const { data: streakData, isLoading } = useQuery({
    queryKey: ['streak', clientId],
    queryFn: async () => {
      const points = await base44.entities.GamificationPoints.filter({ 
        client_id: clientId 
      });
      
      // Sort by date
      const sortedPoints = points.sort((a, b) => 
        new Date(b.date_earned) - new Date(a.date_earned)
      );
      
      // Calculate current streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);
      
      const last30Days = [];
      
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasActivity = sortedPoints.some(p => 
          p.date_earned?.split('T')[0] === dateStr
        );
        
        last30Days.unshift({ date: dateStr, active: hasActivity });
        
        if (hasActivity) {
          currentStreak = i === 0 || last30Days[last30Days.length - 2]?.active ? currentStreak + 1 : 1;
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          if (i > 0) tempStreak = 0;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      // Calculate total activity days
      const uniqueDays = new Set(
        sortedPoints.map(p => p.date_earned?.split('T')[0])
      ).size;
      
      return {
        currentStreak,
        longestStreak,
        totalActiveDays: uniqueDays,
        last30Days: last30Days.slice(-30)
      };
    },
    enabled: !!clientId
  });

  if (isLoading) return null;

  const getStreakMessage = () => {
    if (streakData.currentStreak === 0) return "Start your streak today!";
    if (streakData.currentStreak === 1) return "Great start! Keep going!";
    if (streakData.currentStreak < 7) return "Building momentum!";
    if (streakData.currentStreak < 30) return "You're on fire! 🔥";
    return "Legendary streak! 🏆";
  };

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="w-5 h-5 text-orange-500" />
          Your Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center p-6 bg-white rounded-xl">
          <div className="text-5xl font-bold text-orange-500 mb-2">
            {streakData.currentStreak}
          </div>
          <p className="text-gray-600 font-semibold">{getStreakMessage()}</p>
          <p className="text-sm text-gray-500 mt-1">days in a row</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg text-center">
            <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-600">{streakData.longestStreak}</p>
            <p className="text-xs text-gray-600">Longest Streak</p>
          </div>
          <div className="p-3 bg-white rounded-lg text-center">
            <Calendar className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{streakData.totalActiveDays}</p>
            <p className="text-xs text-gray-600">Total Active Days</p>
          </div>
        </div>

        {/* Calendar View */}
        <div>
          <p className="text-xs text-gray-600 mb-2 font-semibold">Last 30 Days</p>
          <div className="grid grid-cols-10 gap-1">
            {streakData.last30Days.map((day, idx) => (
              <div
                key={idx}
                className={`aspect-square rounded ${
                  day.active 
                    ? 'bg-orange-500' 
                    : 'bg-gray-200'
                }`}
                title={day.date}
              />
            ))}
          </div>
        </div>

        {/* Motivational Badge */}
        {streakData.currentStreak >= 7 && (
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2" />
            <p className="font-bold">Week Warrior! 🎉</p>
            <p className="text-xs opacity-90">7+ day streak achieved</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}