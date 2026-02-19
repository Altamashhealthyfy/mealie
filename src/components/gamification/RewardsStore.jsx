import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingBag, Star, Sparkles, Lock, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const REWARD_TYPE_COLORS = {
  badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
  profile_customization: "bg-purple-100 text-purple-800 border-purple-300",
  exclusive_content: "bg-blue-100 text-blue-800 border-blue-300",
  virtual_gift: "bg-pink-100 text-pink-800 border-pink-300",
  custom: "bg-green-100 text-green-800 border-green-300",
};

const REWARD_TYPE_LABELS = {
  badge: "Badge",
  profile_customization: "Profile Theme",
  exclusive_content: "Exclusive Content",
  virtual_gift: "Virtual Gift",
  custom: "Custom Reward",
};

export default function RewardsStore({ clientId, clientName, availablePoints }) {
  const queryClient = useQueryClient();
  const [selectedReward, setSelectedReward] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: rewards = [] } = useQuery({
    queryKey: ["activeRewards"],
    queryFn: () => base44.entities.Reward.filter({ is_active: true }),
  });

  const { data: myRedemptions = [] } = useQuery({
    queryKey: ["myRedemptions", clientId],
    queryFn: () => base44.entities.RewardRedemption.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward) => {
      // 1. Create redemption record
      await base44.entities.RewardRedemption.create({
        client_id: clientId,
        client_name: clientName,
        reward_id: reward.id,
        reward_title: reward.title,
        reward_type: reward.reward_type,
        points_spent: reward.points_cost,
        status: "pending",
        redeemed_at: new Date().toISOString(),
      });
      // 2. Deduct points (negative entry)
      await base44.entities.GamificationPoints.create({
        client_id: clientId,
        points_earned: -reward.points_cost,
        action_type: "reward_redemption",
        description: `Redeemed: ${reward.title}`,
        date_earned: new Date().toISOString().split("T")[0],
      });
      // 3. Increment times_redeemed
      await base44.entities.Reward.update(reward.id, {
        times_redeemed: (reward.times_redeemed || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myRedemptions"]);
      queryClient.invalidateQueries(["gamificationPoints"]);
      queryClient.invalidateQueries(["clientPoints"]);
      queryClient.invalidateQueries(["activeRewards"]);
      setShowConfirm(false);
      setSelectedReward(null);
      toast.success("🎉 Reward redeemed! Your coach will be notified.");
    },
    onError: () => toast.error("Failed to redeem reward. Please try again."),
  });

  const alreadyRedeemed = (rewardId) =>
    myRedemptions.some((r) => r.reward_id === rewardId && r.status !== "cancelled");

  const isOutOfStock = (reward) =>
    reward.stock !== -1 && reward.times_redeemed >= reward.stock;

  const canAfford = (reward) => availablePoints >= reward.points_cost;

  return (
    <div className="space-y-6">
      {/* Points Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl px-6 py-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7" />
          <div>
            <p className="text-sm opacity-90">Your Balance</p>
            <p className="text-3xl font-bold">{availablePoints} pts</p>
          </div>
        </div>
        <Star className="w-12 h-12 opacity-20" />
      </div>

      {/* Rewards Grid */}
      {rewards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No rewards available yet</p>
            <p className="text-gray-400 text-sm mt-1">Your coach will add rewards soon. Keep earning points!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const redeemed = alreadyRedeemed(reward.id);
            const outOfStock = isOutOfStock(reward);
            const affordable = canAfford(reward);

            return (
              <Card
                key={reward.id}
                className={`relative overflow-hidden transition-all duration-200 border-2 ${
                  redeemed
                    ? "border-green-300 bg-green-50"
                    : outOfStock
                    ? "border-gray-200 opacity-60"
                    : affordable
                    ? "border-orange-200 hover:border-orange-400 hover:shadow-lg cursor-pointer"
                    : "border-gray-200 opacity-75"
                }`}
                onClick={() => {
                  if (!redeemed && !outOfStock && affordable) {
                    setSelectedReward(reward);
                    setShowConfirm(true);
                  }
                }}
              >
                <CardContent className="p-5 space-y-3">
                  {/* Icon & Type */}
                  <div className="flex items-start justify-between">
                    <span className="text-4xl">{reward.icon_emoji || "🎁"}</span>
                    <Badge className={`text-xs border ${REWARD_TYPE_COLORS[reward.reward_type]}`}>
                      {REWARD_TYPE_LABELS[reward.reward_type]}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{reward.title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{reward.description}</p>
                  </div>

                  {/* Cost & Status */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-gray-900">{reward.points_cost} pts</span>
                    </div>
                    {redeemed ? (
                      <Badge className="bg-green-500 text-white gap-1">
                        <CheckCircle className="w-3 h-3" /> Redeemed
                      </Badge>
                    ) : outOfStock ? (
                      <Badge variant="outline" className="text-gray-500">Out of Stock</Badge>
                    ) : !affordable ? (
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{reward.points_cost - availablePoints} more pts</span>
                      </div>
                    ) : (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-7 px-3">
                        Redeem
                      </Button>
                    )}
                  </div>

                  {reward.stock !== -1 && (
                    <p className="text-xs text-gray-400">
                      {Math.max(0, reward.stock - reward.times_redeemed)} left
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* My Redemption History */}
      {myRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              My Redemption History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myRedemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm text-gray-900">{r.reward_title}</p>
                  <p className="text-xs text-gray-400">
                    {r.redeemed_at ? format(new Date(r.redeemed_at), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-500">-{r.points_spent} pts</span>
                  <Badge
                    className={
                      r.status === "fulfilled"
                        ? "bg-green-500 text-white"
                        : r.status === "cancelled"
                        ? "bg-gray-400 text-white"
                        : "bg-amber-400 text-white"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              You're about to redeem this reward using your points.
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <span className="text-5xl">{selectedReward.icon_emoji || "🎁"}</span>
                <h3 className="font-bold text-lg mt-2">{selectedReward.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{selectedReward.description}</p>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-gray-600">Cost</span>
                <span className="font-bold text-orange-600 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                  {selectedReward.points_cost} pts
                </span>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-gray-600">Balance after</span>
                <span className="font-bold text-gray-900">
                  {availablePoints - selectedReward.points_cost} pts
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={() => redeemMutation.mutate(selectedReward)}
                  disabled={redeemMutation.isPending}
                >
                  {redeemMutation.isPending ? "Redeeming..." : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}