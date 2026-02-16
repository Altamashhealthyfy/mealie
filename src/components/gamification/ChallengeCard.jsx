import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Target, CheckCircle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function ChallengeCard({ challenge, clientChallenge, onStart, onViewProgress, isClient = false }) {
  const isActive = clientChallenge?.status === 'active';
  const isCompleted = clientChallenge?.status === 'completed';
  const progress = clientChallenge?.progress_percentage || 0;

  const daysRemaining = clientChallenge?.end_date 
    ? differenceInDays(new Date(clientChallenge.end_date), new Date())
    : challenge.duration_days;

  const difficultyColors = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-orange-100 text-orange-700",
    expert: "bg-red-100 text-red-700"
  };

  return (
    <Card className={`border-2 ${isCompleted ? 'border-green-400 bg-green-50' : isActive ? 'border-orange-400' : 'border-gray-200'} hover:shadow-lg transition-all`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className={`w-5 h-5 ${isCompleted ? 'text-green-600' : 'text-orange-500'}`} />
              {challenge.title}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
          </div>
          <Badge className={difficultyColors[challenge.difficulty]}>
            {challenge.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{challenge.duration_days} days</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>{challenge.points_reward} points</span>
          </div>
        </div>

        {clientChallenge && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {isActive && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">
                    {daysRemaining > 0 ? `${daysRemaining} days left` : 'Last day!'}
                  </span>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-900">Challenge Completed! 🎉</span>
              </div>
            )}
          </>
        )}

        {isClient && (
          <div className="flex gap-2">
            {!clientChallenge ? (
              <Button
                onClick={() => onStart(challenge)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500"
              >
                Start Challenge
              </Button>
            ) : clientChallenge.status === 'active' ? (
              <Button
                onClick={() => onViewProgress(clientChallenge)}
                variant="outline"
                className="w-full"
              >
                View Progress
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}