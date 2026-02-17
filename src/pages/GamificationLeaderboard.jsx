import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, TrendingUp, Sparkles, ChevronDown, ChevronUp, Undo2, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function GamificationLeaderboard() {
  const [expandedClient, setExpandedClient] = useState(null);
  const [revertDialog, setRevertDialog] = useState({ open: false, item: null, type: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, client: null });
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

  const { data: allPoints = [] } = useQuery({
    queryKey: ['allPoints'],
    queryFn: () => base44.entities.GamificationPoints.list(),
    enabled: !!user
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ['allClientBadges'],
    queryFn: () => base44.entities.ClientBadge.list(),
    enabled: !!user
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
    enabled: !!user
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list(),
    enabled: !!user
  });

  const { data: clientChallenges = [] } = useQuery({
    queryKey: ['clientChallenges'],
    queryFn: () => base44.entities.ClientChallenge.list(),
    enabled: !!user
  });

  const revertPointMutation = useMutation({
    mutationFn: (pointId) => base44.entities.GamificationPoints.delete(pointId),
    onSuccess: () => {
      queryClient.invalidateQueries(['allPoints']);
      toast.success("Points reverted successfully");
      setRevertDialog({ open: false, item: null, type: null });
    },
    onError: () => toast.error("Failed to revert points")
  });

  const revertBadgeMutation = useMutation({
    mutationFn: (badgeId) => base44.entities.ClientBadge.delete(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries(['allClientBadges']);
      toast.success("Badge reverted successfully");
      setRevertDialog({ open: false, item: null, type: null });
    },
    onError: () => toast.error("Failed to revert badge")
  });

  const deleteClientMutation = useMutation({
    mutationFn: (clientId) => base44.entities.Client.delete(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success("Client deleted successfully");
      setDeleteDialog({ open: false, client: null });
      setExpandedClient(null);
    },
    onError: () => toast.error("Failed to delete client")
  });

  const getBadgeDetails = (badgeId) => {
    return badges.find(b => b.id === badgeId);
  };

  const getChallengeDetails = (challengeId) => {
    return challenges.find(c => c.id === challengeId);
  };

  const leaderboard = clients.map(client => {
    const clientPoints = allPoints.filter(p => p.client_id === client.id);
    const totalPoints = clientPoints.reduce((sum, p) => sum + p.points_earned, 0);
    const customPoints = clientPoints.filter(p => p.action_type === 'custom');
    const clientBadges = allBadges.filter(b => b.client_id === client.id);
    const activeChallenges = clientChallenges.filter(c => c.client_id === client.id && c.status === 'active');
    const completedChallenges = clientChallenges.filter(c => c.client_id === client.id && c.status === 'completed');

    return {
      ...client,
      totalPoints,
      totalBadges: clientBadges.length,
      pointsBreakdown: clientPoints,
      customPoints,
      clientBadges,
      activeChallenges,
      completedChallenges
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-orange-600" />;
    return <span className="text-2xl font-bold text-gray-400">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-orange-500" />
            Client Leaderboard
          </h1>
          <p className="text-gray-600 mt-1">Top performing clients by points and badges</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((client, index) => {
                const isExpanded = expandedClient === client.id;
                return (
                  <div key={client.id}>
                    <div
                      className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400' :
                        index === 1 ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-400' :
                        index === 2 ? 'bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400' :
                        'bg-gray-50 border border-gray-200'
                      }`}
                      onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12">
                          {getRankIcon(index + 1)}
                        </div>
                        <div>
                          <p className="font-bold text-lg">{client.full_name}</p>
                          <p className="text-sm text-gray-600">{client.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge className="bg-orange-500 text-white text-lg px-4 py-1">
                            {client.totalPoints} pts
                          </Badge>
                          <p className="text-xs text-gray-600 mt-1">
                            {client.totalBadges} badges • {client.completedChallenges.length} challenges
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 p-6 bg-white rounded-xl border border-gray-200 space-y-6">
                        {/* Delete Client Button */}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ open: true, client });
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Client
                          </Button>
                        </div>
                        {/* Badges Section */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            Badges ({client.clientBadges.length})
                          </h3>
                          {client.clientBadges.length > 0 ? (
                            <div className="space-y-2">
                              {client.clientBadges.map((clientBadge) => {
                                const badge = getBadgeDetails(clientBadge.badge_id);
                                return (
                                  <div key={clientBadge.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-3">
                                      {badge?.icon?.startsWith('http') ? (
                                        <img src={badge.icon} alt="" className="w-8 h-8 object-contain" />
                                      ) : (
                                        <span className="text-2xl">{badge?.icon || '🏆'}</span>
                                      )}
                                      <div>
                                        <p className="font-semibold">{badge?.name || 'Unknown Badge'}</p>
                                        <p className="text-xs text-gray-600">{new Date(clientBadge.earned_date).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRevertDialog({ open: true, item: clientBadge, type: 'badge' });
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Undo2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No badges earned yet</p>
                          )}
                        </div>

                        {/* Custom Points Section */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-orange-600" />
                            Bonus Points ({client.customPoints.length})
                          </h3>
                          {client.customPoints.length > 0 ? (
                            <div className="space-y-2">
                              {client.customPoints.map((point) => (
                                <div key={point.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div>
                                    <p className="font-semibold">+{point.points_earned} points</p>
                                    <p className="text-sm text-gray-600">{point.description || 'Bonus points'}</p>
                                    <p className="text-xs text-gray-500">{new Date(point.date_earned).toLocaleDateString()}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRevertDialog({ open: true, item: point, type: 'point' });
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Undo2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No bonus points awarded</p>
                          )}
                        </div>

                        {/* All Points Breakdown */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            All Points ({client.pointsBreakdown.length} entries)
                          </h3>
                          {client.pointsBreakdown.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {client.pointsBreakdown.map((point) => (
                                <div key={point.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                                  <div>
                                    <p className="font-medium">{point.action_type.replace(/_/g, ' ')}</p>
                                    {point.description && <p className="text-xs text-gray-600">{point.description}</p>}
                                  </div>
                                  <Badge className="bg-green-600">+{point.points_earned}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No points earned yet</p>
                          )}
                        </div>

                        {/* Challenges Section */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Challenges
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {client.activeChallenges.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-blue-600 mb-2">Active ({client.activeChallenges.length})</p>
                                <div className="space-y-2">
                                  {client.activeChallenges.map((cc) => {
                                    const challenge = getChallengeDetails(cc.challenge_id);
                                    return (
                                      <div key={cc.id} className="p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                                        <p className="font-semibold">{challenge?.title || 'Unknown'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="flex-1 bg-white rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${cc.progress_percentage || 0}%` }}></div>
                                          </div>
                                          <span className="text-xs font-medium">{cc.progress_percentage || 0}%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {client.completedChallenges.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-green-600 mb-2">Completed ({client.completedChallenges.length})</p>
                                <div className="space-y-2">
                                  {client.completedChallenges.slice(0, 3).map((cc) => {
                                    const challenge = getChallengeDetails(cc.challenge_id);
                                    return (
                                      <div key={cc.id} className="p-2 bg-green-50 rounded border border-green-200 text-sm">
                                        <p className="font-semibold">{challenge?.title || 'Unknown'}</p>
                                        <p className="text-xs text-gray-600">{new Date(cc.completed_date).toLocaleDateString()}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          {client.activeChallenges.length === 0 && client.completedChallenges.length === 0 && (
                            <p className="text-gray-500 text-sm">No challenges yet</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Revert Confirmation Dialog */}
        <AlertDialog open={revertDialog.open} onOpenChange={(open) => setRevertDialog({ open, item: null, type: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revert {revertDialog.type === 'badge' ? 'Badge' : 'Points'}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the {revertDialog.type === 'badge' ? 'badge' : 'points'} from the client's account. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (revertDialog.type === 'badge') {
                    revertBadgeMutation.mutate(revertDialog.item.id);
                  } else {
                    revertPointMutation.mutate(revertDialog.item.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                disabled={revertPointMutation.isPending || revertBadgeMutation.isPending}
              >
                {revertPointMutation.isPending || revertBadgeMutation.isPending ? 'Reverting...' : 'Revert'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Client Confirmation Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, client: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleteDialog.client?.full_name}</strong>? This will permanently remove all their data including points, badges, challenges, and progress. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteClientMutation.mutate(deleteDialog.client.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteClientMutation.isPending}
              >
                {deleteClientMutation.isPending ? 'Deleting...' : 'Delete Client'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}