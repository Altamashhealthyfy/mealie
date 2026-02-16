import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Gift, Award, Sparkles, User, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function CoachBonusAwards() {
  const [showDialog, setShowDialog] = useState(false);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [awardType, setAwardType] = useState('points');
  const [awardData, setAwardData] = useState({
    points: 100,
    description: '',
    badge_id: ''
  });
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    icon: '🏆',
    category: 'special',
    rarity: 'common'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
    enabled: !!user
  });

  const { data: recentAwards = [] } = useQuery({
    queryKey: ['recentBonusAwards'],
    queryFn: async () => {
      const points = await base44.entities.GamificationPoints.filter({
        action_type: 'custom'
      });
      return points
        .sort((a, b) => new Date(b.date_earned) - new Date(a.date_earned))
        .slice(0, 20);
    },
    enabled: !!user
  });

  const awardPointsMutation = useMutation({
    mutationFn: async ({ clientId, points, description }) => {
      await base44.entities.GamificationPoints.create({
        client_id: clientId,
        action_type: 'custom',
        points_earned: points,
        description: description || 'Bonus points from coach',
        date_earned: new Date().toISOString()
      });

      // Send notification
      const client = clients.find(c => c.id === clientId);
      if (client) {
        await base44.entities.Notification.create({
          user_email: client.email,
          type: 'achievement',
          title: '🎉 Bonus Points Awarded!',
          message: `Your coach awarded you ${points} bonus points! ${description || 'Keep up the great work!'}`,
          priority: 'high',
          link: '/ClientAchievements',
          read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentBonusAwards'] });
      setShowDialog(false);
      resetForm();
      toast.success("Bonus points awarded!");
    },
    onError: (error) => {
      toast.error(`Failed to award points: ${error.message}`);
    }
  });

  const awardBadgeMutation = useMutation({
    mutationFn: async ({ clientId, badgeId, description }) => {
      await base44.entities.ClientBadge.create({
        client_id: clientId,
        badge_id: badgeId,
        earned_date: new Date().toISOString(),
        is_new: true
      });

      // Send notification
      const client = clients.find(c => c.id === clientId);
      const badge = badges.find(b => b.id === badgeId);
      if (client && badge) {
        await base44.entities.Notification.create({
          user_email: client.email,
          type: 'achievement',
          title: '🏆 New Badge Earned!',
          message: `Your coach awarded you the "${badge.name}" badge! ${description || badge.description}`,
          priority: 'high',
          link: '/ClientAchievements',
          read: false
        });
      }
    },
    onSuccess: () => {
      setShowDialog(false);
      resetForm();
      toast.success("Badge awarded!");
    },
    onError: (error) => {
      toast.error(`Failed to award badge: ${error.message}`);
    }
  });

  const createBadgeMutation = useMutation({
    mutationFn: async (badgeData) => {
      return await base44.entities.Badge.create({
        ...badgeData,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setShowBadgeDialog(false);
      setNewBadge({
        name: '',
        description: '',
        icon: '🏆',
        category: 'special',
        rarity: 'common'
      });
      toast.success("Custom badge created!");
    },
    onError: (error) => {
      toast.error(`Failed to create badge: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    if (awardType === 'points') {
      if (!awardData.points || awardData.points <= 0) {
        toast.error("Please enter valid points");
        return;
      }
      awardPointsMutation.mutate({
        clientId: selectedClient,
        points: awardData.points,
        description: awardData.description
      });
    } else {
      if (!awardData.badge_id) {
        toast.error("Please select a badge");
        return;
      }
      awardBadgeMutation.mutate({
        clientId: selectedClient,
        badgeId: awardData.badge_id,
        description: awardData.description
      });
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setAwardType('points');
    setAwardData({
      points: 100,
      description: '',
      badge_id: ''
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Gift className="w-8 h-8 text-orange-500" />
              Bonus Awards
            </h1>
            <p className="text-gray-600 mt-1">Reward exceptional client effort and achievements</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowBadgeDialog(true)}
              className="border-purple-500 text-purple-700 hover:bg-purple-50"
            >
              <Award className="w-4 h-4 mr-2" />
              Create Badge
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Award Bonus
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Award Bonus to Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Award Type</Label>
                  <Select value={awardType} onValueChange={setAwardType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Bonus Points</SelectItem>
                      <SelectItem value="badge">Special Badge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {awardType === 'points' ? (
                  <div>
                    <Label>Points Amount</Label>
                    <Input
                      type="number"
                      min="1"
                      value={awardData.points}
                      onChange={(e) => setAwardData({...awardData, points: parseInt(e.target.value)})}
                      placeholder="100"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Badge</Label>
                    {badges.length > 0 ? (
                      <Select
                        value={awardData.badge_id}
                        onValueChange={(value) => setAwardData({...awardData, badge_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a badge..." />
                        </SelectTrigger>
                        <SelectContent>
                          {badges.map(badge => (
                            <SelectItem key={badge.id} value={badge.id}>
                              {badge.icon} {badge.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border">
                        No badges available. Create badges in Badge Management first.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Personal Message (Optional)</Label>
                  <Textarea
                    placeholder="Add a personal message to motivate your client..."
                    value={awardData.description}
                    onChange={(e) => setAwardData({...awardData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={awardPointsMutation.isPending || awardBadgeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {awardPointsMutation.isPending || awardBadgeMutation.isPending ? 'Awarding...' : 'Award Now'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Create Badge Dialog */}
        <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Custom Badge</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createBadgeMutation.mutate(newBadge);
            }} className="space-y-4">
              <div>
                <Label>Badge Name</Label>
                <Input
                  placeholder="e.g., Consistency Champion"
                  value={newBadge.name}
                  onChange={(e) => setNewBadge({...newBadge, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="What this badge represents..."
                  value={newBadge.description}
                  onChange={(e) => setNewBadge({...newBadge, description: e.target.value})}
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label>Icon (Emoji)</Label>
                <Input
                  placeholder="🏆"
                  value={newBadge.icon}
                  onChange={(e) => setNewBadge({...newBadge, icon: e.target.value})}
                  maxLength={2}
                  required
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={newBadge.category}
                  onValueChange={(value) => setNewBadge({...newBadge, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="consistency">Consistency</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="nutrition">Nutrition</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rarity</Label>
                <Select
                  value={newBadge.rarity}
                  onValueChange={(value) => setNewBadge({...newBadge, rarity: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowBadgeDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createBadgeMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {createBadgeMutation.isPending ? 'Creating...' : 'Create Badge'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Quick Award Presets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-orange-200 hover:border-orange-400 transition cursor-pointer">
            <CardContent className="p-6 text-center">
              <Award className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Consistency King/Queen</h3>
              <p className="text-sm text-gray-600 mb-3">For maintaining a 30+ day streak</p>
              <Badge className="bg-orange-500">+200 points</Badge>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 hover:border-purple-400 transition cursor-pointer">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-purple-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Goal Crusher</h3>
              <p className="text-sm text-gray-600 mb-3">For completing a major goal ahead of schedule</p>
              <Badge className="bg-purple-500">+300 points</Badge>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 hover:border-green-400 transition cursor-pointer">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Outstanding Effort</h3>
              <p className="text-sm text-gray-600 mb-3">For exceptional dedication and improvement</p>
              <Badge className="bg-green-500">+150 points</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Recent Awards */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bonus Awards</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAwards.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No bonus awards yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAwards.map(award => (
                  <div key={award.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-semibold">{getClientName(award.client_id)}</p>
                        <p className="text-sm text-gray-600">{award.description}</p>
                        <p className="text-xs text-gray-500">{new Date(award.date_earned).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-500 text-white text-lg">
                      +{award.points_earned}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}