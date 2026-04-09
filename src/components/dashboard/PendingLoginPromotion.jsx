import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, UserCheck, Loader2, ChevronDown, ChevronUp, Users, Pencil, Trash2, Phone, X, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PendingLoginPromotion({ userType }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [promotingAll, setPromotingAll] = useState(false);
  const [promotingId, setPromotingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});

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
    if (!user) throw new Error("User not found — must log in first");
    await base44.entities.User.update(user.id, { user_type: "student_coach" });
  };

  const handlePromoteOne = async (email) => {
    setPromotingId(email);
    try {
      await promoteUser(email);
      queryClient.invalidateQueries(["allUsersForPromotion"]);
      setSelected(prev => { const n = new Set(prev); n.delete(email); return n; });
      toast.success("Coach promoted successfully!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPromotingId(null);
    }
  };

  const handlePromoteAll = async () => {
    if (eligibleCoaches.length === 0) return toast.error("No coaches ready to promote (they must log in first).");
    if (!window.confirm(`Promote all ${eligibleCoaches.length} registered coach(es) to Health Coach role?`)) return;
    setPromotingAll(true);
    try {
      await Promise.all(eligibleCoaches.map(h => promoteUser(h.coach_email)));
      queryClient.invalidateQueries(["allUsersForPromotion"]);
      setSelected(new Set());
      toast.success(`${eligibleCoaches.length} coaches promoted!`);
    } catch (err) {
      toast.error("Some promotions failed: " + err.message);
    } finally {
      setPromotingAll(false);
    }
  };

  const handlePromoteSelected = async () => {
    const toPromote = [...selected].filter(email => getUserStatus(email).canPromote);
    if (toPromote.length === 0) return;
    if (!window.confirm(`Promote ${toPromote.length} selected coach(es)?`)) return;
    setPromotingAll(true);
    try {
      await Promise.all(toPromote.map(promoteUser));
      queryClient.invalidateQueries(["allUsersForPromotion"]);
      setSelected(new Set());
      toast.success(`${toPromote.length} coaches promoted!`);
    } catch (err) {
      toast.error("Some promotions failed: " + err.message);
    } finally {
      setPromotingAll(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Remove ${record.coach_name || record.coach_email} from pending list?`)) return;
    setDeletingId(record.id);
    try {
      await base44.entities.CoachSubscriptionHistory.delete(record.id);
      queryClient.invalidateQueries(["coachSubscriptionHistory"]);
      toast.success("Record deleted");
    } catch (err) {
      toast.error("Delete failed: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (record) => {
    setEditItem(record);
    setEditForm({
      coach_name: record.coach_name || "",
      coach_email: record.coach_email || "",
      notes: record.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
      await base44.entities.CoachSubscriptionHistory.update(editItem.id, editForm);
      queryClient.invalidateQueries(["coachSubscriptionHistory"]);
      toast.success("Updated successfully");
      setEditItem(null);
    } catch (err) {
      toast.error("Update failed: " + err.message);
    }
  };

  // Extract phone from notes or coach_name patterns (stored in history record)
  const getPhone = (record) => {
    return record.notes?.match(/\+?\d[\d\s-]{7,}/)?.[0]?.trim() || "";
  };

  return (
    <>
      <Card className="border-2 border-yellow-300 bg-yellow-50 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-yellow-800 text-base">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Login ({pendingCoaches.length})
              <Badge className="bg-yellow-500 text-white text-xs">Awaiting First Login</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.size > 0 && (
                <Button size="sm" onClick={handlePromoteSelected} disabled={promotingAll} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  {promotingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                  Promote Selected ({selected.size})
                </Button>
              )}
              <Button size="sm" onClick={handlePromoteAll} disabled={promotingAll || eligibleCoaches.length === 0} className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                {promotingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                Promote All ({eligibleCoaches.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-yellow-700 hover:bg-yellow-100">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide items-center">
                <div className="col-span-1 flex items-center gap-1">
                  <Checkbox checked={allEligibleSelected} onCheckedChange={toggleSelectAll} disabled={eligibleCoaches.length === 0} />
                </div>
                <span className="col-span-2">Name</span>
                <span className="col-span-3">Email</span>
                <span className="col-span-2">Phone</span>
                <span className="col-span-1">Invited</span>
                <span className="col-span-3 text-right">Actions</span>
              </div>

              {/* Mobile select-all */}
              <div className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-50 border-b">
                <Checkbox checked={allEligibleSelected} onCheckedChange={toggleSelectAll} disabled={eligibleCoaches.length === 0} />
                <span className="text-xs font-semibold text-gray-500">Select All Eligible</span>
              </div>

              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {pendingCoaches.map((h) => {
                  const status = getUserStatus(h.coach_email);
                  const isPromoting = promotingId === h.coach_email;
                  const isDeleting = deletingId === h.id;
                  const isChecked = selected.has(h.coach_email);
                  const phone = getPhone(h);

                  return (
                    <div key={h.id} className="px-4 py-3 hover:bg-gray-50">
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center text-sm">
                        <div className="col-span-1">
                          <Checkbox checked={isChecked} onCheckedChange={() => status.canPromote && toggleOne(h.coach_email)} disabled={!status.canPromote} />
                        </div>
                        <span className="col-span-2 font-medium text-gray-900 truncate">{h.coach_name || "—"}</span>
                        <span className="col-span-3 text-gray-500 truncate">{h.coach_email}</span>
                        <span className="col-span-2 text-gray-500 text-xs flex items-center gap-1">
                          {phone ? <><Phone className="w-3 h-3 text-green-500" />{phone}</> : <span className="text-gray-300">—</span>}
                        </span>
                        <span className="col-span-1 text-gray-400 text-xs">
                          {h.created_date ? format(new Date(h.created_date), "dd MMM yyyy") : "—"}
                        </span>
                        <div className="col-span-3 flex items-center justify-end gap-1.5">
                          <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-blue-600" onClick={() => openEdit(h)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => handleDelete(h)} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                          {status.canPromote ? (
                            <Button size="sm" variant="outline" className="border-green-400 text-green-600 hover:bg-green-50 text-xs h-7 px-2" disabled={isPromoting || promotingAll} onClick={() => handlePromoteOne(h.coach_email)}>
                              {isPromoting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                              Promote
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="border-gray-200 text-gray-400 text-xs h-7 px-2" disabled>
                              <Clock className="w-3 h-3 mr-1" /> Waiting
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start gap-2">
                          <Checkbox checked={isChecked} onCheckedChange={() => status.canPromote && toggleOne(h.coach_email)} disabled={!status.canPromote} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{h.coach_name || "—"}</p>
                            <p className="text-xs text-gray-500 truncate">{h.coach_email}</p>
                            {phone && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-green-500" />{phone}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">Invited: {h.created_date ? format(new Date(h.created_date), "dd MMM yyyy") : "—"}</p>
                          </div>
                          <Badge className={`text-xs shrink-0 ${status.color}`}>{status.canPromote ? "Ready" : "Waiting"}</Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-6">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => openEdit(h)}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => handleDelete(h)} disabled={isDeleting}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                          {status.canPromote && (
                            <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white ml-auto" disabled={isPromoting} onClick={() => handlePromoteOne(h.coach_email)}>
                              {isPromoting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                              Promote
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Coach Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
              <Input value={editForm.coach_name || ""} onChange={(e) => setEditForm(f => ({ ...f, coach_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <Input value={editForm.coach_email || ""} onChange={(e) => setEditForm(f => ({ ...f, coach_email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone / Notes</label>
              <Input value={editForm.notes || ""} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. +91 98765 43210" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}