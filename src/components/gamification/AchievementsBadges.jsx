import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";
import { Trophy, Lock } from "lucide-react";

// Badge definitions — all computed client-side from real data
const BADGE_DEFINITIONS = [
  // Logging Consistency
  {
    id: "first_log",
    emoji: "📝",
    name: "First Step",
    description: "Log your progress for the first time",
    category: "Logging",
    color: "from-blue-400 to-blue-600",
    check: ({ progressLogs }) => progressLogs.length >= 1,
  },
  {
    id: "log_7",
    emoji: "🗓️",
    name: "Week Warrior",
    description: "Log progress on 7 different days",
    category: "Logging",
    color: "from-indigo-400 to-indigo-600",
    check: ({ progressLogs }) => progressLogs.length >= 7,
  },
  {
    id: "log_30",
    emoji: "📅",
    name: "Monthly Master",
    description: "Log progress on 30 different days",
    category: "Logging",
    color: "from-violet-400 to-violet-600",
    check: ({ progressLogs }) => progressLogs.length >= 30,
  },
  {
    id: "food_log_first",
    emoji: "🍽️",
    name: "Food Tracker",
    description: "Log your first meal",
    category: "Nutrition",
    color: "from-green-400 to-green-600",
    check: ({ foodLogs }) => foodLogs.length >= 1,
  },
  {
    id: "food_log_21",
    emoji: "🥗",
    name: "Nutrition Ninja",
    description: "Log meals on 21 different days",
    category: "Nutrition",
    color: "from-emerald-400 to-emerald-600",
    check: ({ foodLogs }) => {
      const uniqueDays = new Set(foodLogs.map(f => f.date)).size;
      return uniqueDays >= 21;
    },
  },
  // Weight Milestones
  {
    id: "weight_1kg",
    emoji: "⚖️",
    name: "1 KG Down!",
    description: "Lose your first kilogram",
    category: "Weight",
    color: "from-orange-400 to-orange-600",
    check: ({ clientProfile, progressLogs }) => {
      const initial = clientProfile?.initial_weight;
      const latest = [...progressLogs].filter(l => l.weight).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight;
      return initial && latest && (initial - latest) >= 1;
    },
  },
  {
    id: "weight_5kg",
    emoji: "🏅",
    name: "5 KG Champion",
    description: "Lose 5 kilograms from your starting weight",
    category: "Weight",
    color: "from-amber-400 to-amber-600",
    check: ({ clientProfile, progressLogs }) => {
      const initial = clientProfile?.initial_weight;
      const latest = [...progressLogs].filter(l => l.weight).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight;
      return initial && latest && (initial - latest) >= 5;
    },
  },
  {
    id: "weight_goal_half",
    emoji: "🎯",
    name: "Halfway There",
    description: "Reach 50% of your weight goal",
    category: "Weight",
    color: "from-yellow-400 to-yellow-600",
    check: ({ clientProfile, progressLogs }) => {
      const initial = clientProfile?.initial_weight;
      const target = clientProfile?.target_weight;
      const latest = [...progressLogs].filter(l => l.weight).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight;
      if (!initial || !target || !latest) return false;
      const totalToLose = initial - target;
      if (totalToLose <= 0) return false;
      return ((initial - latest) / totalToLose) >= 0.5;
    },
  },
  {
    id: "weight_goal",
    emoji: "🏆",
    name: "Goal Achieved!",
    description: "Reach your target weight",
    category: "Weight",
    color: "from-yellow-500 to-orange-500",
    check: ({ clientProfile, progressLogs }) => {
      const target = clientProfile?.target_weight;
      const latest = [...progressLogs].filter(l => l.weight).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight;
      return target && latest && latest <= target;
    },
  },
  // Streaks
  {
    id: "streak_3",
    emoji: "🔥",
    name: "On Fire!",
    description: "Maintain a 3-day activity streak",
    category: "Streaks",
    color: "from-red-400 to-orange-500",
    check: ({ streak }) => streak >= 3,
  },
  {
    id: "streak_7",
    emoji: "⚡",
    name: "Lightning Week",
    description: "Maintain a 7-day activity streak",
    category: "Streaks",
    color: "from-orange-400 to-red-500",
    check: ({ streak }) => streak >= 7,
  },
  {
    id: "streak_30",
    emoji: "💎",
    name: "Diamond Dedication",
    description: "Maintain a 30-day activity streak",
    category: "Streaks",
    color: "from-cyan-400 to-blue-600",
    check: ({ streak }) => streak >= 30,
  },
  // MPESS
  {
    id: "mpess_first",
    emoji: "🧘",
    name: "Wellness Beginner",
    description: "Complete your first MPESS assessment",
    category: "Wellness",
    color: "from-purple-400 to-purple-600",
    check: ({ mpessLogs }) => mpessLogs.length >= 1,
  },
  {
    id: "mpess_7",
    emoji: "🌿",
    name: "Mindful Week",
    description: "Complete MPESS on 7 days",
    category: "Wellness",
    color: "from-teal-400 to-teal-600",
    check: ({ mpessLogs }) => mpessLogs.length >= 7,
  },
  // Goals
  {
    id: "goal_created",
    emoji: "🎯",
    name: "Goal Setter",
    description: "Create your first health goal",
    category: "Goals",
    color: "from-pink-400 to-pink-600",
    check: ({ goals }) => goals.length >= 1,
  },
  {
    id: "goal_completed",
    emoji: "✅",
    name: "Goal Crusher",
    description: "Complete your first health goal",
    category: "Goals",
    color: "from-green-500 to-emerald-600",
    check: ({ goals }) => goals.some(g => g.status === 'completed'),
  },
  // Engagement
  {
    id: "onboarded",
    emoji: "🚀",
    name: "Journey Begins",
    description: "Complete your onboarding",
    category: "Engagement",
    color: "from-blue-500 to-indigo-600",
    check: ({ clientProfile }) => clientProfile?.onboarding_completed === true,
  },
  {
    id: "points_100",
    emoji: "⭐",
    name: "Century Club",
    description: "Earn 100 points",
    category: "Engagement",
    color: "from-yellow-400 to-orange-500",
    check: ({ totalPoints }) => totalPoints >= 100,
  },
  {
    id: "points_500",
    emoji: "🌟",
    name: "Star Performer",
    description: "Earn 500 points",
    category: "Engagement",
    color: "from-yellow-500 to-red-500",
    check: ({ totalPoints }) => totalPoints >= 500,
  },
];

const CATEGORIES = ["All", "Logging", "Nutrition", "Weight", "Streaks", "Wellness", "Goals", "Engagement"];

export default function AchievementsBadges({ clientId, clientProfile, progressLogs = [], foodLogs = [], mpessLogs = [], goals = [], streak = 0, totalPoints = 0 }) {
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [selectedBadge, setSelectedBadge] = React.useState(null);

  const context = { clientProfile, progressLogs, foodLogs, mpessLogs, goals, streak, totalPoints };

  const badges = BADGE_DEFINITIONS.map(badge => ({
    ...badge,
    earned: badge.check(context),
  }));

  const earned = badges.filter(b => b.earned);
  const filtered = activeCategory === "All" ? badges : badges.filter(b => b.category === activeCategory);
  const earnedCount = earned.length;
  const totalCount = badges.length;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements & Badges
            </CardTitle>
            <CardDescription>{earnedCount} of {totalCount} badges earned</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-white text-sm font-bold shadow-md">
              {earnedCount} 🏅
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${(earnedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap mt-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filtered.map(badge => (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                badge.earned
                  ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md'
                  : 'border-gray-200 bg-gray-50 opacity-50 grayscale'
              }`}
            >
              {!badge.earned && (
                <div className="absolute top-1 right-1">
                  <Lock className="w-3 h-3 text-gray-400" />
                </div>
              )}
              {badge.earned && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg text-2xl`}>
                {badge.emoji}
              </div>
              <p className="text-xs font-semibold text-gray-700 text-center leading-tight">
                {badge.name}
              </p>
            </button>
          ))}
        </div>

        {earnedCount > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <p className="text-sm font-semibold text-orange-800">
              🎉 Latest Earned: {[...earned].reverse()[0]?.name}
            </p>
          </div>
        )}
      </CardContent>

      {/* Badge Detail Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="max-w-sm text-center">
          {selectedBadge && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-xl">{selectedBadge.name}</DialogTitle>
              </DialogHeader>
              <div className="py-6 flex flex-col items-center gap-4">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${selectedBadge.color} flex items-center justify-center shadow-2xl text-5xl ${!selectedBadge.earned ? 'grayscale opacity-60' : ''}`}>
                  {selectedBadge.emoji}
                </div>
                <Badge className={selectedBadge.earned ? "bg-green-500 text-white px-4 py-1" : "bg-gray-400 text-white px-4 py-1"}>
                  {selectedBadge.earned ? "✅ Earned!" : "🔒 Locked"}
                </Badge>
                <p className="text-gray-600 text-sm">{selectedBadge.description}</p>
                <p className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{selectedBadge.category}</p>
                {!selectedBadge.earned && (
                  <p className="text-xs text-orange-600 font-medium">
                    Keep going — you're getting closer!
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}