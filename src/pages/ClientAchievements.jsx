import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Award, Trophy, Target, Zap, Calendar, TrendingUp, CheckCircle, Sparkles, ShoppingBag } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PointsTracker from "../components/gamification/PointsTracker";
import BadgeDisplay from "../components/gamification/BadgeDisplay";
import Leaderboard from "../components/gamification/Leaderboard";
import StreakTracker from "../components/gamification/StreakTracker";
import ChallengeCard from "../components/gamification/ChallengeCard";
import ClientPersonalGoals from "./ClientPersonalGoals";
import RewardsStore from "../components/gamification/RewardsStore";

export default function ClientAchievements() {
  const queryClient = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [todayValue, setTodayValue] = useState('');
  const [todayNotes, setTodayNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myPoints = [] } = useQuery({
    queryKey: ['clientPoints', clientProfile?.id],
    queryFn: async () => base44.entities.GamificationPoints.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      // Get all challenges (templates and coach-created)
      return await base44.entities.Challenge.list();
    },
    initialData: [],
  });

  const { data: myActiveChallenges } = useQuery({
    queryKey: ['myActiveChallenges', clientProfile?.id],
    queryFn: async () => {
      const active = await base44.entities.ClientChallenge.filter({ 
        client_id: clientProfile?.id,
        status: 'active'
      });
      return active;
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const { data: myCompletedChallenges } = useQuery({
    queryKey: ['myCompletedChallenges', clientProfile?.id],
    queryFn: async () => {
      const completed = await base44.entities.ClientChallenge.filter({ 
        client_id: clientProfile?.id,
        status: 'completed'
      });
      return completed;
    },
    enabled: !!clientProfile,
    initialData: [],
  });

  const startChallengeMutation = useMutation({
    mutationFn: async (challenge) => {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), challenge.duration_days), 'yyyy-MM-dd');
      
      return await base44.entities.ClientChallenge.create({
        client_id: clientProfile.id,
        challenge_id: challenge.id,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        progress_percentage: 0,
        daily_progress: Array.from({ length: challenge.duration_days }, (_, i) => ({
          day: i + 1,
          completed: false,
          value: 0
        }))
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges'] });
      toast.success("Challenge started! Let's go! 🚀");
    },
  });

  const handleStartChallenge = (challenge) => {
    if (myActiveChallenges.length >= 3) {
      toast.error("You can only have 3 active challenges at once. Complete one first!");
      return;
    }
    startChallengeMutation.mutate(challenge);
  };

  const handleViewProgress = (clientChallenge) => {
    const challenge = challenges.find(c => c.id === clientChallenge.challenge_id);
    setSelectedChallenge({ ...challenge, clientChallenge });
    setShowProgressDialog(true);
    setTodayValue('');
    setTodayNotes('');
  };

  const submitProgressMutation = useMutation({
    mutationFn: async ({ clientChallenge, value, notes }) => {
      const dayNumber = differenceInDays(new Date(), new Date(clientChallenge.start_date)) + 1;
      const updatedDailyProgress = [...(clientChallenge.daily_progress || [])];
      const dayIndex = updatedDailyProgress.findIndex(d => d.day === dayNumber);
      
      if (dayIndex !== -1) {
        updatedDailyProgress[dayIndex] = {
          ...updatedDailyProgress[dayIndex],
          completed: true,
          value: parseFloat(value) || 0,
          notes: notes,
          date: format(new Date(), 'yyyy-MM-dd')
        };
      }

      const completedDays = updatedDailyProgress.filter(d => d.completed).length;
      const progress = (completedDays / updatedDailyProgress.length) * 100;

      return await base44.entities.ClientChallenge.update(clientChallenge.id, {
        daily_progress: updatedDailyProgress,
        current_value: parseFloat(value) || 0,
        progress_percentage: progress,
        status: progress >= 100 ? 'completed' : 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myActiveChallenges'] });
      queryClient.invalidateQueries({ queryKey: ['myCompletedChallenges'] });
      toast.success("Progress logged! Keep going! 💪");
      setTodayValue('');
      setTodayNotes('');
      setShowProgressDialog(false);
    },
  });

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            My Achievements
          </h1>
          <p className="text-gray-600 mt-2">Track your progress, earn points, and unlock badges!</p>
        </div>

        {/* Gamification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PointsTracker clientId={clientProfile.id} />
          <StreakTracker clientId={clientProfile.id} />
        </div>

        {/* Leaderboard */}
        <Leaderboard type="all" limit={10} showCurrentUser={true} />

        {/* Tabs */}
        <Tabs defaultValue="goals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              My Goals
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Store
            </TabsTrigger>
          </TabsList>

          {/* Personal Goals Tab */}
          <TabsContent value="goals">
            <ClientPersonalGoals embedded={true} clientProfile={clientProfile} />
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            {/* Active Challenges */}
            {myActiveChallenges.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Active Challenges</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myActiveChallenges.map(clientChallenge => {
                    const challenge = challenges.find(c => c.id === clientChallenge.challenge_id);
                    if (!challenge) return null;
                    return (
                      <ChallengeCard
                        key={clientChallenge.id}
                        challenge={challenge}
                        clientChallenge={clientChallenge}
                        onViewProgress={handleViewProgress}
                        isClient={true}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Challenges */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Available Challenges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {challenges
                  .filter(c => !myActiveChallenges.some(ac => ac.challenge_id === c.id) && 
                               !myCompletedChallenges.some(cc => cc.challenge_id === c.id))
                  .map(challenge => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      onStart={handleStartChallenge}
                      isClient={true}
                    />
                  ))}
              </div>
            </div>

            {/* Completed Challenges */}
            {myCompletedChallenges.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Completed Challenges
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCompletedChallenges.map(clientChallenge => {
                    const challenge = challenges.find(c => c.id === clientChallenge.challenge_id);
                    if (!challenge) return null;
                    return (
                      <ChallengeCard
                        key={clientChallenge.id}
                        challenge={challenge}
                        clientChallenge={clientChallenge}
                        isClient={true}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <BadgeDisplay clientId={clientProfile.id} />
          </TabsContent>
        </Tabs>

        {/* Challenge Progress Dialog */}
        <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedChallenge?.title}</DialogTitle>
              <DialogDescription>{selectedChallenge?.description}</DialogDescription>
            </DialogHeader>
            {selectedChallenge?.clientChallenge && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-semibold">{format(new Date(selectedChallenge.clientChallenge.start_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-semibold">{format(new Date(selectedChallenge.clientChallenge.end_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overall Progress</span>
                    <span className="font-bold">{Math.round(selectedChallenge.clientChallenge.progress_percentage)}%</span>
                  </div>
                  <Progress value={selectedChallenge.clientChallenge.progress_percentage} className="h-3" />
                </div>

                {selectedChallenge.clientChallenge.daily_progress && (
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">Daily Progress</p>
                    <div className="grid grid-cols-7 gap-2">
                      {selectedChallenge.clientChallenge.daily_progress.map((day, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-center ${
                            day.completed
                              ? 'bg-green-100 border-2 border-green-400'
                              : 'bg-gray-100 border-2 border-gray-300'
                          }`}
                        >
                          <p className="text-xs text-gray-600">Day {day.day}</p>
                          {day.completed && <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedChallenge.clientChallenge.status === 'active' && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-orange-500" />
                      Log Today's Progress
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="value">Value (e.g., weight, steps, minutes)</Label>
                        <Input
                          id="value"
                          type="number"
                          step="0.1"
                          placeholder={`Enter your ${selectedChallenge.target_metric || 'value'}`}
                          value={todayValue}
                          onChange={(e) => setTodayValue(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="How are you feeling? Any observations?"
                          value={todayNotes}
                          onChange={(e) => setTodayNotes(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <Button
                        onClick={() => submitProgressMutation.mutate({
                          clientChallenge: selectedChallenge.clientChallenge,
                          value: todayValue,
                          notes: todayNotes
                        })}
                        disabled={!todayValue || submitProgressMutation.isPending}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                      >
                        {submitProgressMutation.isPending ? 'Submitting...' : 'Submit Progress'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}