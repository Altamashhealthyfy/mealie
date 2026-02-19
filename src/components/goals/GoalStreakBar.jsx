import React from "react";
import { Flame, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, subDays } from "date-fns";

const STREAK_MILESTONES = [
  { days: 7, label: "Week Warrior 🔥", color: "bg-orange-500" },
  { days: 14, label: "Fortnight Force 💪", color: "bg-red-500" },
  { days: 30, label: "Month Master 🏆", color: "bg-purple-600" },
  { days: 60, label: "Iron Will 👑", color: "bg-yellow-500" },
];

function computeStreak(history = []) {
  if (!history.length) return { current: 0, longest: 0, last21: [] };
  const dateSet = new Set(history.map((h) => h.date?.split("T")[0]));
  let current = 0;
  let longest = 0;
  let temp = 0;
  const today = new Date();
  const last21 = [];

  for (let i = 0; i < 21; i++) {
    const d = subDays(today, i);
    const ds = format(d, "yyyy-MM-dd");
    const active = dateSet.has(ds);
    if (i === 0 || last21[last21.length - 1]?.active) {
      if (active) current++;
      else if (i === 0) current = 0;
    }
    last21.unshift({ date: ds, active });
  }

  // Longest streak scan
  Array.from(dateSet)
    .sort()
    .forEach((d, i, arr) => {
      const prev = arr[i - 1];
      if (!prev) { temp = 1; }
      else {
        const diff = (new Date(d) - new Date(prev)) / 86400000;
        temp = diff === 1 ? temp + 1 : 1;
      }
      longest = Math.max(longest, temp);
    });

  return { current, longest, last21 };
}

export default function GoalStreakBar({ goal }) {
  const history = goal.progress_history || [];
  const { current, longest, last21 } = computeStreak(history);
  const earned = STREAK_MILESTONES.filter((m) => current >= m.days);
  const next = STREAK_MILESTONES.find((m) => current < m.days);

  return (
    <div className="space-y-2">
      {/* Streak headline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className={`w-4 h-4 ${current > 0 ? "text-orange-500" : "text-gray-300"}`} />
          <span className="text-sm font-bold text-gray-800">{current}-day streak</span>
          {longest > 0 && <span className="text-xs text-gray-400">· best {longest}d</span>}
        </div>
        {earned.length > 0 && (
          <Badge className={`${earned[earned.length - 1].color} text-white text-xs`}>
            <Trophy className="w-3 h-3 mr-1" />{earned[earned.length - 1].label}
          </Badge>
        )}
      </div>

      {/* 21-day grid */}
      <TooltipProvider>
        <div className="flex gap-1">
          {last21.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={`flex-1 h-4 rounded-sm transition-all ${
                    day.active ? "bg-orange-500" : "bg-gray-200"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">{day.date}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Next milestone */}
      {next && (
        <p className="text-xs text-gray-400">
          {next.days - current} more days to unlock <span className="font-medium text-orange-500">{next.label}</span>
        </p>
      )}
    </div>
  );
}