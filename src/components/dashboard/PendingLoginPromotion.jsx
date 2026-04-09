import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, UserCheck, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { format } from "date-fns";

export default function PendingLoginPromotion({ userType }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [promotingAll, setPromotingAll] = useState(false);
  const [promotingId, setPromotingId] = useState(null);

  const { data: history = [] } = useQuery({
    queryKey: ["coachSubscriptionHistory"],
    queryFn: () => base44.entities.CoachSubscriptionHistory.filter({ action_type: "account_created" }),
    enabled: userType === "super_admin",
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsersForPromotion"],
    queryFn: () => base44.entities.User.list(),
    enabled: userType === "super_admin",
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  if (userType !== "super_admin") return null;

  const pendingCoaches = history.filter((h) => {
    const email = h.coach_email?.toLowerCase();
    if (!email) return false;
    const user = allUsers.find(u => u.email?.toLowerCase() === email);
    return !user || user.user_type !== "student_coach";
  });

  if (pendingCoaches.length === 0) return null;

  const getUserStatus = (email) => {
    const user = allUsers.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) return { label: "Awaiting First Login", color: "bg-yellow-100 text-yellow-700", canPromote: false };
    if (user.user_type === "student_coach") return { label: "Already Promoted", color: "bg-green-100 text-green-700", canPromote: false };
    return { label: "Registered – Needs Promotion", color: "bg-orange-100 text-orange-700", canPromote: true };
  };

  const eligibleCoaches = pendingCoaches.filter(h => getUserStatus(h.coach_email).canPromote);

  const allEligibleSelected = eligibleCoaches.length > 0 && eligibleCoaches.every(h => selected.has(h.coach_email));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleCoaches.map(h => h.coach_email)));
    }
  };

  const toggleOne = (email) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const promoteUser = async (email) => {
    const user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error("User not found");
    await base44.entities.User.update(user.id, { user_type: "student_coach" });
  };

  const handlePromoteOne = async (email) => {
    setPromotingId(email);
    try {
      await promoteUser(email);
      queryClient.invalidateQueries(["allUsersForPromotion"]);
      setSelected(prev => { const n = new Set(prev); n.delete(email); return n; });
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setPromotingId(null);
    }
  };

  const handlePromoteSelected = async () => {
    const toPromote = [...selected].filter(email => getUserStatus(email).canPromote);
    if (toPromote.length === 0) return;
    if (!window.confirm(`Promote ${toPromote.length} selected coach(es) to Health Coach role?`)) return;
    setPromotingAll(true);
    try {
      await Promise.all(toPromote.map(promoteUser));
      queryClient.invalidateQueries(["allUsersForPromotion"]);
      setSelected(new Set());
    } catch (err) {
      alert("❌ Some promotions failed: " + err.message);
    } finally {
      setPromotingAll(false);
    }
  };

  const handlePromoteAll = async () => {
    if (eligibleCoaches.length === 0) return alert("No coaches ready to promote yet (they must log in first).");
    if (!window.confirm(`Promote all ${eligibleCoaches.length} registered coach(es) to Health Coach role?`)) return;
    setPromotingAll(true);
    try {
      await Promise.all(eligibleCoaches.map(h => promoteUser(h.coach_email)));
      queryClient.invalidateQueries(["allUsersForPromotion"]);
      setSelected(new Set());
    } catch (err) {
      alert("❌ Some promotions failed: " + err.message);
    } finally {
      setPromotingAll(false);
    }
  };

  return (
    <Card className="border-2 border-yellow-300 bg-yellow-50 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Login
            <Badge className="bg-yellow-500 text-white ml-1">{pendingCoaches.length}</Badge>
            <Badge variant="outline" className="border-yellow-400 text-yellow-700 text-xs">Awaiting First Login</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {someSelected && (
              <Button
                size="sm"
                onClick={handlePromoteSelected}
                disabled={promotingAll}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                {promotingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                Promote Selected ({selected.size})
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePromoteAll}
              disabled={promotingAll || eligibleCoaches.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
            >
              {promotingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Users className="w-3 h-3 mr-1" />}
              Promote All ({eligibleCoaches.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-yellow-700 hover:bg-yellow-100"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-yellow-700 mt-1">
          These coaches have been invited but haven't logged in yet. Once they log in, they'll be auto-promoted to Health Coach role.
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="bg-white rounded-lg overflow-hidden border border-yellow-200">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide items-center">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allEligibleSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={eligibleCoaches.length === 0}
                />
                <span>Select</span>
              </div>
              <span>Name</span>
              <span>Email</span>
              <span>Invited On</span>
              <span className="text-right">Action</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {pendingCoaches.map((h) => {
                const status = getUserStatus(h.coach_email);
                const isPromoting = promotingId === h.coach_email;
                const isChecked = selected.has(h.coach_email);
                return (
                  <div key={h.id} className="grid grid-cols-5 gap-2 px-4 py-3 items-center hover:bg-gray-50 text-sm">
                    <div className="flex items-center">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => status.canPromote && toggleOne(h.coach_email)}
                        disabled={!status.canPromote}
                      />
                    </div>
                    <span className="font-medium text-gray-900 truncate">{h.coach_name || "—"}</span>
                    <span className="text-gray-500 truncate">{h.coach_email}</span>
                    <span className="text-gray-400 text-xs">
                      {h.created_date ? format(new Date(h.created_date), "dd MMM yyyy") : "—"}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Badge className={`text-xs hidden md:inline-flex ${status.color}`}>{status.label}</Badge>
                      {status.canPromote ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-400 text-orange-600 hover:bg-orange-50 text-xs"
                          disabled={isPromoting || promotingAll}
                          onClick={() => handlePromoteOne(h.coach_email)}
                        >
                          {isPromoting ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <UserCheck className="w-3 h-3 mr-1" />
                          )}
                          Promote
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-400 text-xs cursor-not-allowed" disabled>
                          <Clock className="w-3 h-3 mr-1" />
                          Promote
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}