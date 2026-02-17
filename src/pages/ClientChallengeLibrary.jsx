import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, Users, Sparkles, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import ChallengeCard from "../components/gamification/ChallengeCard";

export default function ClientChallengeLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0];
    },
    enabled: !!user
  });

  const { data: allChallenges = [] } = useQuery({
    queryKey: ['allChallenges'],
    queryFn: () => base44.entities.Challenge.list(),
    enabled: !!user
  });

  const { data: myActiveChallenges = [] } = useQuery({
    queryKey: ['myActiveChallenges', clientProfile?.id],
    queryFn: () => base44.entities.ClientChallenge.filter({ 
      client_id: clientProfile?.id,
      status: 'active'
    }),
    enabled: !!clientProfile
  });

  const { data: myCompletedChallenges = [] } = useQuery({
    queryKey: ['myCompletedChallenges', clientProfile?.id],
    queryFn: () => base44.entities.ClientChallenge.filter({ 
      client_id: clientProfile?.id,
      status: 'completed'
    }),
    enabled: !!clientProfile
  });

  const enrollMutation = useMutation({
    mutationFn: async (challenge) => {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), challenge.duration_days), 'yyyy-MM-dd');
      
      // Update participant count
      await base44.entities.Challenge.update(challenge.id, {
        participant_count: (challenge.participant_count || 0) + 1
      });

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
      queryClient.invalidateQueries(['myActiveChallenges']);
      queryClient.invalidateQueries(['allChallenges']);
      toast.success("Challenge enrolled! Let's do this! 🚀");
    },
    onError: () => toast.error("Failed to enroll in challenge")
  });

  const handleEnroll = (challenge) => {
    if (myActiveChallenges.length >= 5) {
      toast.error("You can only have 5 active challenges at once!");
      return;
    }
    enrollMutation.mutate(challenge);
  };

  const templateChallenges = allChallenges.filter(c => c.is_template);
  const publicChallenges = allChallenges.filter(c => c.is_public && !c.is_template);
  const myChallenges = allChallenges.filter(c => c.created_by_client === user?.email);

  const filterChallenges = (challenges) => {
    if (!searchQuery) return challenges;
    return challenges.filter(c => 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const isAlreadyEnrolled = (challengeId) => {
    return myActiveChallenges.some(ac => ac.challenge_id === challengeId) ||
           myCompletedChallenges.some(cc => cc.challenge_id === challengeId);
  };

  if (!clientProfile) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-orange-500" />
              Challenge Library
            </h1>
            <p className="text-gray-600 mt-1">Browse and join challenges to earn rewards</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="library" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library">
              <Sparkles className="w-4 h-4 mr-2" />
              Library
            </TabsTrigger>
            <TabsTrigger value="public">
              <Users className="w-4 h-4 mr-2" />
              Public ({publicChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="mine">
              <TrendingUp className="w-4 h-4 mr-2" />
              My Created ({myChallenges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-3">Coach & Platform Challenges</h2>
              {filterChallenges(templateChallenges).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterChallenges(templateChallenges).map(challenge => (
                    <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${
                            challenge.difficulty === 'easy' ? 'bg-green-600' :
                            challenge.difficulty === 'medium' ? 'bg-yellow-600' :
                            challenge.difficulty === 'hard' ? 'bg-orange-600' :
                            'bg-red-600'
                          }`}>
                            {challenge.difficulty}
                          </Badge>
                          <Badge variant="outline">{challenge.duration_days} days</Badge>
                          <Badge className="bg-orange-500">{challenge.points_reward} pts</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">{challenge.description}</p>
                        {isAlreadyEnrolled(challenge.id) ? (
                          <Badge className="w-full bg-green-600">Enrolled ✓</Badge>
                        ) : (
                          <Button 
                            onClick={() => handleEnroll(challenge)}
                            className="w-full"
                            disabled={enrollMutation.isPending}
                          >
                            Start Challenge
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No challenges found</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="public" className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-3">Community Challenges</h2>
              {filterChallenges(publicChallenges).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterChallenges(publicChallenges).map(challenge => (
                    <Card key={challenge.id} className="hover:shadow-lg transition-shadow border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-purple-600">
                            <Users className="w-3 h-3 mr-1" />
                            {challenge.participant_count || 0} joined
                          </Badge>
                          <Badge variant="outline">{challenge.duration_days} days</Badge>
                          <Badge className="bg-orange-500">{challenge.points_reward} pts</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-600">{challenge.description}</p>
                        <p className="text-xs text-gray-500">
                          Created by: {challenge.created_by_client || challenge.created_by_coach || 'Community'}
                        </p>
                        {isAlreadyEnrolled(challenge.id) ? (
                          <Badge className="w-full bg-green-600">Enrolled ✓</Badge>
                        ) : (
                          <Button 
                            onClick={() => handleEnroll(challenge)}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            disabled={enrollMutation.isPending}
                          >
                            Join Challenge
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No public challenges yet</p>
                    <p className="text-gray-400 text-sm mt-2">Be the first to create one!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-3">My Created Challenges</h2>
              {filterChallenges(myChallenges).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterChallenges(myChallenges).map(challenge => (
                    <Card key={challenge.id} className="hover:shadow-lg transition-shadow border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          {challenge.is_public && (
                            <Badge className="bg-purple-600">
                              <Users className="w-3 h-3 mr-1" />
                              {challenge.participant_count || 0} joined
                            </Badge>
                          )}
                          <Badge variant="outline">{challenge.duration_days} days</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">{challenge.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">You haven't created any challenges yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}