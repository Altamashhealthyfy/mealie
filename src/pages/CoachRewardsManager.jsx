import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag, Plus, Edit, Trash2, Star, Users, CheckCircle, Clock, Package
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const REWARD_TYPES = [
  { value: "badge", label: "🏅 Badge", desc: "Award a badge from your badge collection" },
  { value: "profile_customization", label: "🎨 Profile Theme", desc: "Unlock a special profile theme" },
  { value: "exclusive_content", label: "📚 Exclusive Content", desc: "Access to premium resources" },
  { value: "virtual_gift", label: "🎁 Virtual Gift", desc: "A special virtual gift or recognition" },
  { value: "custom", label: "✨ Custom", desc: "Any custom reward you define" },
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  reward_type: "custom",
  points_cost: 100,
  icon_emoji: "🎁",
  content_url: "",
  stock: -1,
  is_active: true,
  expires_at: "",
};

export default function CoachRewardsManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["allRewards"],
    queryFn: () => base44.entities.Reward.list("-created_date"),
    enabled: !!user,
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["allRedemptions"],
    queryFn: () => base44.entities.RewardRedemption.list("-redeemed_at"),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, coach_email: user?.email };
      if (editingReward) {
        return base44.entities.Reward.update(editingReward.id, payload);
      }
      return base44.entities.Reward.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allRewards"]);
      queryClient.invalidateQueries(["activeRewards"]);
      toast.success(editingReward ? "Reward updated!" : "Reward created!");
      setShowForm(false);
      setEditingReward(null);
      setForm(DEFAULT_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["allRewards"]);
      queryClient.invalidateQueries(["activeRewards"]);
      toast.success("Reward deleted.");
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.RewardRedemption.update(id, {
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["allRedemptions"]);
      toast.success("Marked as fulfilled!");
    },
  });

  const openEdit = (reward) => {
    setEditingReward(reward);
    setForm({
      title: reward.title || "",
      description: reward.description || "",
      reward_type: reward.reward_type || "custom",
      points_cost: reward.points_cost || 100,
      icon_emoji: reward.icon_emoji || "🎁",
      content_url: reward.content_url || "",
      stock: reward.stock ?? -1,
      is_active: reward.is_active !== false,
      expires_at: reward.expires_at || "",
    });
    setShowForm(true);
  };

  const pendingCount = redemptions.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-orange-500" />
              Rewards Store Manager
            </h1>
            <p className="text-gray-600 mt-1">Create and manage rewards clients can redeem with their points</p>
          </div>
          <Button
            onClick={() => { setEditingReward(null); setForm(DEFAULT_FORM); setShowForm(true); }}
            className="bg-orange-500 hover:bg-orange-600 gap-2"
          >
            <Plus className="w-4 h-4" /> Add Reward
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <Package className="w-10 h-10 text-orange-400" />
              <div>
                <p className="text-sm text-gray-500">Total Rewards</p>
                <p className="text-2xl font-bold">{rewards.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <Clock className="w-10 h-10 text-amber-400" />
              <div>
                <p className="text-sm text-gray-500">Pending Redemptions</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <div>
                <p className="text-sm text-gray-500">Total Redeemed</p>
                <p className="text-2xl font-bold">{redemptions.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rewards">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="redemptions" className="relative">
              Redemptions
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* REWARDS LIST */}
          <TabsContent value="rewards" className="space-y-4 mt-4">
            {isLoading ? (
              <p className="text-center text-gray-400 py-12">Loading rewards...</p>
            ) : rewards.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-medium">No rewards yet. Add your first reward!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <Card key={reward.id} className={`border-2 ${reward.is_active ? "border-orange-100" : "border-gray-200 opacity-60"}`}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{reward.icon_emoji || "🎁"}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs capitalize">{reward.reward_type.replace("_", " ")}</Badge>
                          {!reward.is_active && <Badge variant="outline" className="text-xs text-gray-400">Inactive</Badge>}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{reward.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{reward.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-gray-800">{reward.points_cost} pts</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {reward.stock === -1 ? "Unlimited" : `${Math.max(0, reward.stock - reward.times_redeemed)} left`}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(reward)}>
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:bg-red-50 border-red-200"
                          onClick={() => { if (confirm("Delete this reward?")) deleteMutation.mutate(reward.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* REDEMPTIONS */}
          <TabsContent value="redemptions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client Redemption Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {redemptions.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No redemptions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {redemptions.map((r) => {
                      const client = clients.find((c) => c.id === r.client_id);
                      return (
                        <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-sm">
                              {(r.client_name || client?.full_name || "?").charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">
                                {r.client_name || client?.full_name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500">{r.reward_title}</p>
                              <p className="text-xs text-gray-400">
                                {r.redeemed_at ? format(new Date(r.redeemed_at), "MMM d, yyyy h:mm a") : "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-red-500">-{r.points_spent} pts</span>
                            {r.status === "pending" ? (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white gap-1"
                                onClick={() => fulfillMutation.mutate(r.id)}
                                disabled={fulfillMutation.isPending}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Fulfill
                              </Button>
                            ) : (
                              <Badge className={r.status === "fulfilled" ? "bg-green-500 text-white" : "bg-gray-400 text-white"}>
                                {r.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <Label>Emoji</Label>
                <Input
                  value={form.icon_emoji}
                  onChange={(e) => setForm({ ...form, icon_emoji: e.target.value })}
                  className="text-center text-2xl"
                  maxLength={2}
                />
              </div>
              <div className="col-span-3">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., VIP Badge"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does the client receive?"
                rows={2}
              />
            </div>

            <div>
              <Label>Reward Type *</Label>
              <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-xs text-gray-400">{t.desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Points Cost *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.points_cost}
                  onChange={(e) => setForm({ ...form, points_cost: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Stock (-1 = unlimited)</Label>
                <Input
                  type="number"
                  min={-1}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) ?? -1 })}
                />
              </div>
            </div>

            {(form.reward_type === "exclusive_content") && (
              <div>
                <Label>Content URL / Instructions</Label>
                <Input
                  value={form.content_url}
                  onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                  placeholder="https://... or describe what they'll receive"
                />
              </div>
            )}

            <div>
              <Label>Expires On (optional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active (visible in store)</Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.title || !form.points_cost || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : editingReward ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}