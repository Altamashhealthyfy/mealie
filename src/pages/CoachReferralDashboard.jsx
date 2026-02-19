import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Gift, Trophy, TrendingUp, CheckCircle, Clock, Star,
  Search, Award, Zap
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400" },
  signed_up: { label: "Signed Up", color: "bg-blue-100 text-blue-800",    dot: "bg-blue-400" },
  active:    { label: "Active",    color: "bg-green-100 text-green-800",   dot: "bg-green-400" },
  rewarded:  { label: "Rewarded",  color: "bg-purple-100 text-purple-800", dot: "bg-purple-400" },
  expired:   { label: "Expired",   color: "bg-gray-100 text-gray-600",     dot: "bg-gray-300" },
};

export default function CoachReferralDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRef, setSelectedRef] = useState(null);
  const [rewardNotes, setRewardNotes] = useState("");
  const [bonusPoints, setBonusPoints] = useState({ referrer: 200, referred: 100 });

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["allReferrals"],
    queryFn: () => base44.entities.ClientReferral.list("-created_date"),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user,
  });

  const rewardMutation = useMutation({
    mutationFn: async ({ ref, referrerPts, referredPts }) => {
      const now = new Date().toISOString();
      // Award referrer
      await base44.entities.GamificationPoints.create({
        client_id: ref.referrer_client_id,
        points_earned: referrerPts,
        action_type: "referral_reward",
        description: `Referral reward: ${ref.referred_client_name || ref.referred_email} joined!`,
        date_earned: now.split("T")[0],
      });
      // Award referred (if they have a client profile)
      if (ref.referred_client_id) {
        await base44.entities.GamificationPoints.create({
          client_id: ref.referred_client_id,
          points_earned: referredPts,
          action_type: "referral_welcome",
          description: `Welcome bonus via referral from ${ref.referrer_client_name}`,
          date_earned: now.split("T")[0],
        });
      }
      // Update referral record
      return base44.entities.ClientReferral.update(ref.id, {
        status: "rewarded",
        referrer_points_awarded: referrerPts,
        referred_points_awarded: referredPts,
        rewarded_at: now,
        coach_notes: rewardNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allReferrals"]);
      queryClient.invalidateQueries(["allPoints"]);
      toast.success("Points awarded to both clients! 🎉");
      setSelectedRef(null);
      setRewardNotes("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ClientReferral.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries(["allReferrals"]); toast.success("Status updated."); },
  });

  const getClient = (id) => clients.find(c => c.id === id);

  const filtered = referrals.filter(r => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.referrer_client_name?.toLowerCase().includes(q) ||
      r.referred_client_name?.toLowerCase().includes(q) ||
      r.referred_email?.toLowerCase().includes(q) ||
      r.referral_code?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === "pending").length,
    successful: referrals.filter(r => ["active","rewarded"].includes(r.status)).length,
    rewarded: referrals.filter(r => r.status === "rewarded").length,
    totalPointsAwarded: referrals.reduce((s, r) => s + (r.referrer_points_awarded || 0) + (r.referred_points_awarded || 0), 0),
  };

  // Group by referrer for leaderboard
  const referrerLeaderboard = Object.entries(
    referrals.reduce((acc, r) => {
      if (!acc[r.referrer_client_id]) acc[r.referrer_client_id] = { name: r.referrer_client_name, count: 0, rewarded: 0 };
      acc[r.referrer_client_id].count++;
      if (r.status === "rewarded") acc[r.referrer_client_id].rewarded++;
      return acc;
    }, {})
  ).sort((a, b) => b[1].rewarded - a[1].rewarded).slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" /> Client Referral Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track and manage client referrals and reward distributions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Referrals", value: stats.total, icon: Users, color: "text-blue-500 bg-blue-50" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            { label: "Successful", value: stats.successful, icon: CheckCircle, color: "text-green-600 bg-green-50" },
            { label: "Rewarded", value: stats.rewarded, icon: Gift, color: "text-purple-600 bg-purple-50" },
            { label: "Points Awarded", value: stats.totalPointsAwarded, icon: Star, color: "text-orange-600 bg-orange-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.split(" ")[1]}`}>
                  <Icon className={`w-5 h-5 ${color.split(" ")[0]}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="referrals">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="referrals">All Referrals</TabsTrigger>
            <TabsTrigger value="leaderboard">Top Referrers</TabsTrigger>
          </TabsList>

          {/* REFERRALS TABLE */}
          <TabsContent value="referrals" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email or code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <p className="text-center text-gray-400 py-12">Loading...</p>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500">No referrals found.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {["Referrer", "Referred", "Code", "Status", "Date", "Actions"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filtered.map(ref => {
                          const sc = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                          return (
                            <tr key={ref.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs">
                                    {(ref.referrer_client_name || "?")[0]}
                                  </div>
                                  <span className="font-medium text-gray-900">{ref.referrer_client_name || "Unknown"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {ref.referred_client_name || ref.referred_email || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ref.referral_code}</code>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">
                                {ref.created_date ? format(new Date(ref.created_date), "MMM d, yyyy") : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  {ref.status === "signed_up" || ref.status === "active" ? (
                                    <Button
                                      size="sm"
                                      className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1 h-7"
                                      onClick={() => { setSelectedRef(ref); setBonusPoints({ referrer: ref.reward_points_referrer || 200, referred: ref.reward_points_referred || 100 }); }}
                                    >
                                      <Gift className="w-3 h-3" /> Award
                                    </Button>
                                  ) : null}
                                  {ref.status === "pending" && (
                                    <Button size="sm" variant="outline" className="text-xs h-7"
                                      onClick={() => updateStatusMutation.mutate({ id: ref.id, status: "signed_up" })}>
                                      Mark Signed Up
                                    </Button>
                                  )}
                                  {ref.status === "signed_up" && (
                                    <Button size="sm" variant="outline" className="text-xs h-7"
                                      onClick={() => updateStatusMutation.mutate({ id: ref.id, status: "active" })}>
                                      Mark Active
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* LEADERBOARD */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {referrerLeaderboard.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No referrals yet.</p>
                ) : referrerLeaderboard.map(([id, data], idx) => (
                  <div key={id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-gray-300 text-gray-700" : idx === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{data.name || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{data.count} referrals · {data.rewarded} rewarded</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                      <Star className="w-4 h-4 fill-green-500 text-green-500" />
                      {data.rewarded * 200} pts earned
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reward Dialog */}
      <Dialog open={!!selectedRef} onOpenChange={() => setSelectedRef(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" /> Award Referral Bonus
            </DialogTitle>
          </DialogHeader>
          {selectedRef && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-gray-700">Referrer: <span className="text-orange-600">{selectedRef.referrer_client_name}</span></p>
                <p className="text-sm text-gray-600">Referred: {selectedRef.referred_client_name || selectedRef.referred_email}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Referrer Points</Label>
                  <Input type="number" value={bonusPoints.referrer} onChange={e => setBonusPoints(p => ({ ...p, referrer: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs">New Client Points</Label>
                  <Input type="number" value={bonusPoints.referred} onChange={e => setBonusPoints(p => ({ ...p, referred: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Coach Notes (optional)</Label>
                <Textarea value={rewardNotes} onChange={e => setRewardNotes(e.target.value)} rows={2} placeholder="Any notes about this reward..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRef(null)}>Cancel</Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={() => rewardMutation.mutate({ ref: selectedRef, referrerPts: bonusPoints.referrer, referredPts: bonusPoints.referred })}
                  disabled={rewardMutation.isPending}
                >
                  {rewardMutation.isPending ? "Awarding..." : "Award Points"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}