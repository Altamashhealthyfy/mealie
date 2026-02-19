import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Share2, Copy, CheckCircle2, Gift, Users, Star, Link2, QrCode,
  Clock, Sparkles, Send, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800" },
  signed_up: { label: "Signed Up", color: "bg-blue-100 text-blue-800" },
  active:    { label: "Active",    color: "bg-green-100 text-green-800" },
  rewarded:  { label: "Rewarded",  color: "bg-purple-100 text-purple-800" },
  expired:   { label: "Expired",   color: "bg-gray-100 text-gray-600" },
};

function generateCode(clientId) {
  return "REF" + (clientId || "").slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default function ClientReferralHub() {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: clientProfile } = useQuery({
    queryKey: ["myClientProfile", user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: myReferrals = [] } = useQuery({
    queryKey: ["myReferrals", clientProfile?.id],
    queryFn: () => base44.entities.ClientReferral.filter({ referrer_client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
  });

  const { data: myPoints = [] } = useQuery({
    queryKey: ["clientPoints", clientProfile?.id],
    queryFn: () => base44.entities.GamificationPoints.filter({ client_id: clientProfile?.id }),
    enabled: !!clientProfile?.id,
  });

  const totalPoints = myPoints.reduce((s, p) => s + (p.points_earned || 0), 0);
  const referralCode = myReferrals[0]?.referral_code || null;
  const appUrl = window.location.origin;
  const referralLink = referralCode ? `${appUrl}/?ref=${referralCode}` : null;
  const qrUrl = referralLink ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(referralLink)}` : null;

  const successCount = myReferrals.filter(r => ["active","rewarded"].includes(r.status)).length;
  const pointsEarned = myReferrals.filter(r => r.status === "rewarded").reduce((s, r) => s + (r.referrer_points_awarded || 0), 0);

  // Create a new referral entry (generates code) 
  const createReferralMutation = useMutation({
    mutationFn: async (email) => {
      const code = generateCode(clientProfile?.id);
      return base44.entities.ClientReferral.create({
        referrer_client_id: clientProfile.id,
        referrer_client_name: clientProfile.full_name,
        referrer_email: user.email,
        referred_email: email || "",
        referral_code: code,
        coach_email: clientProfile.assigned_coach?.[0] || clientProfile.assigned_to || "",
        status: "pending",
        reward_points_referrer: 200,
        reward_points_referred: 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myReferrals"]);
      setShowInviteDialog(false);
      setInviteEmail("");
      toast.success("Referral link created! Share it with your friend 🎉");
    },
  });

  const handleGetLink = () => {
    if (!referralCode) {
      createReferralMutation.mutate("");
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    createReferralMutation.mutate(inviteEmail.trim());
  };

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join me on my health journey!", text: "Use my referral link to sign up and we both get bonus points!", url: referralLink });
    } else {
      handleCopy();
    }
  };

  if (!clientProfile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading your profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Gift className="w-8 h-8 text-orange-500" /> Refer & Earn
          </h1>
          <p className="text-gray-600 mt-1">Invite friends to join your health journey and earn bonus points!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Your Points", value: totalPoints, icon: Star, color: "text-amber-500" },
            { label: "Referrals Sent", value: myReferrals.length, icon: Users, color: "text-blue-500" },
            { label: "Successful", value: successCount, icon: Trophy, color: "text-green-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-5 flex flex-col items-center text-center">
                <Icon className={`w-7 h-7 mb-1 ${color}`} />
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reward Explainer */}
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="p-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" /> How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Share your link", desc: "Send your unique referral link to a friend", emoji: "🔗" },
                { step: "2", title: "Friend signs up", desc: "They join and complete their first activity", emoji: "🏃" },
                { step: "3", title: "You both earn", desc: "You get 200 pts · Your friend gets 100 pts", emoji: "🎉" },
              ].map(s => (
                <div key={s.step} className="bg-white rounded-xl p-4 flex gap-3">
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referral Link Card */}
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-orange-500" /> Your Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralLink ? (
              <>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="font-mono text-sm bg-gray-50 flex-1" />
                  <Button onClick={handleCopy} variant="outline" className="shrink-0 gap-1">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button onClick={handleShare} className="shrink-0 bg-orange-500 hover:bg-orange-600 gap-1">
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                    <img src={qrUrl} alt="QR" className="w-32 h-32" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-gray-600">Or invite someone directly by email:</p>
                    <Button variant="outline" className="gap-2" onClick={() => setShowInviteDialog(true)}>
                      <Send className="w-4 h-4" /> Invite by Email
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Gift className="w-12 h12 mx-auto text-orange-300" />
                <p className="text-gray-600">Generate your personal referral link and start earning!</p>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 gap-2"
                  onClick={handleGetLink}
                  disabled={createReferralMutation.isPending}
                >
                  <Link2 className="w-4 h-4" />
                  {createReferralMutation.isPending ? "Generating..." : "Get My Referral Link"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral History */}
        {myReferrals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" /> My Referrals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myReferrals.map(ref => {
                const sc = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                return (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {ref.referred_client_name || ref.referred_email || `Code: ${ref.referral_code}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ref.created_date ? format(new Date(ref.created_date), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ref.status === "rewarded" && (
                        <span className="text-xs font-bold text-green-600">+{ref.referrer_points_awarded} pts</span>
                      )}
                      <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite by Email Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a Friend</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Friend's Email</Label>
              <Input
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">A referral link will be created and tracked for this email.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || createReferralMutation.isPending}
              >
                {createReferralMutation.isPending ? "Creating..." : "Create Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}