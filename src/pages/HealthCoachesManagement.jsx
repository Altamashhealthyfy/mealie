import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Mail,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  TrendingUp,
  Sparkles,
  Copy,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import BulkCoachImport from "@/components/coach/BulkCoachImport.jsx";

export default function HealthCoachesManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCoaches, setSelectedCoaches] = useState([]);
  const [viewingCoach, setViewingCoach] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    plan_id: "",
    start_date: "",
    end_date: "",
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: coaches } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === "student_coach");
    },
    enabled: !!user && user?.user_type === "super_admin",
    initialData: [],
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["coachSubscriptions"],
    queryFn: async () => {
      return await base44.entities.HealthCoachSubscription.list("-created_date", 1000);
    },
    initialData: [],
  });

  const { data: plans } = useQuery({
    queryKey: ["healthCoachPlans"],
    queryFn: async () => {
      return await base44.entities.HealthCoachPlan.list();
    },
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ["allClients"],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
    initialData: [],
  });

  const createCoachesMutation = useMutation({
    mutationFn: async (coachesData) => {
      const results = [];
      for (const coach of coachesData) {
        const result = await base44.functions.invoke("createUserWithPassword", {
          email: coach.email,
          password: Math.random().toString(36).slice(-12),
          fullName: coach.full_name,
          userType: "student_coach",
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      setShowAddDialog(false);
      setFormData({ full_name: "", email: "", phone: "" });
      toast.success("✅ Coach(es) created successfully!");
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error?.message || "Failed to create coach"}`);
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: (coachEmail) =>
      base44.asServiceRole.entities.User.update(
        coaches.find((c) => c.email === coachEmail)?.id,
        { user_type: "user" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] });
      setViewingCoach(null);
      toast.success("✅ Coach removed successfully!");
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const filteredAndSortedCoaches = useMemo(() => {
    let filtered = coaches.filter((coach) => {
      const matchesSearch =
        coach.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coach.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Check subscription status
      const subscription = subscriptions.find((s) => s.coach_email === coach.email);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && subscription?.status === "active") ||
        (statusFilter === "inactive" && !subscription) ||
        (statusFilter === "expired" && subscription?.status === "expired");

      // Check plan
      const matchesPlan =
        planFilter === "all" ||
        (planFilter === "no_plan" && !subscription) ||
        (planFilter !== "no_plan" && subscription?.plan_id === planFilter);

      return matchesSearch && matchesStatus && matchesPlan;
    });

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "full_name") {
        compareValue = (a.full_name || "").localeCompare(b.full_name || "");
      } else if (sortBy === "created_date") {
        compareValue = new Date(a.created_date) - new Date(b.created_date);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [coaches, searchQuery, statusFilter, planFilter, sortBy, sortOrder, subscriptions]);

  const toggleCoachSelection = (coachId) => {
    setSelectedCoaches((prev) =>
      prev.includes(coachId) ? prev.filter((id) => id !== coachId) : [...prev, coachId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCoaches.length === filteredAndSortedCoaches.length) {
      setSelectedCoaches([]);
    } else {
      setSelectedCoaches(filteredAndSortedCoaches.map((c) => c.id));
    }
  };

  const handleEdit = (coach) => {
    setEditingCoach(coach);
    const subscription = subscriptions.find((s) => s.coach_email === coach.email);
    setFormData({
      full_name: coach.full_name || "",
      email: coach.email || "",
      phone: coach.phone || "",
      plan_id: subscription?.plan_id || "",
      start_date: subscription?.start_date || "",
      end_date: subscription?.end_date || "",
    });
    setShowAddDialog(true);
  };

  const activeFiltersCount = [searchQuery !== "", statusFilter !== "all", planFilter !== "all"].filter(
    Boolean
  ).length;

  if (!user || user.user_type !== "super_admin") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only super admins can manage health coaches.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Health Coaches Management
            </h1>
            <p className="text-sm md:text-base text-gray-600">Manage health coaches and their subscriptions</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              onClick={() => {
                setEditingCoach(null);
                setFormData({ full_name: "", email: "", phone: "" });
                setShowAddDialog(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Coach
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkImport(true)}
              className="text-green-600 hover:bg-green-50 border-green-300 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">No Subscription</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="no_plan">No Plan</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.plan_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{activeFiltersCount} active filter(s)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPlanFilter("all");
                }}
                className="text-orange-600 hover:bg-orange-50"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Selection Controls */}
        {filteredAndSortedCoaches.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="flex items-center gap-2"
            >
              {selectedCoaches.length === filteredAndSortedCoaches.length ? (
                <CheckSquare className="w-4 h-4 text-orange-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span className="text-sm">
                {selectedCoaches.length === filteredAndSortedCoaches.length ? "Deselect All" : "Select All"}
              </span>
            </Button>
            <p className="text-sm text-gray-600">
              {selectedCoaches.length} of {filteredAndSortedCoaches.length} selected
            </p>
          </div>
        )}

        {/* Coaches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredAndSortedCoaches.map((coach) => {
            const isSelected = selectedCoaches.includes(coach.id);
            const subscription = subscriptions.find((s) => s.coach_email === coach.email);
            const plan = plans.find((p) => p.id === subscription?.plan_id);
            const clientCount = clients.filter((c) =>
              Array.isArray(c.assigned_coach)
                ? c.assigned_coach.includes(coach.email)
                : c.assigned_coach === coach.email
            ).length;

            return (
              <Card
                key={coach.id}
                className={`border-2 shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all ${
                  isSelected ? "border-orange-500 bg-orange-50/50" : "border-transparent"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCoachSelection(coach.id)}
                        className="p-1 h-auto"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                      <div className="min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">{coach.full_name}</CardTitle>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{coach.email}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {subscription?.status === "active" ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : subscription?.status === "expired" ? (
                      <Badge className="bg-red-100 text-red-700">Expired</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">No Subscription</Badge>
                    )}
                    {subscription && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <Crown className="w-3 h-3 mr-1" />
                        {plan?.plan_name}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                    <div>
                      <p className="text-gray-600">Clients</p>
                      <p className="font-semibold">{clientCount}</p>
                    </div>
                    {subscription && (
                      <div>
                        <p className="text-gray-600">Expires</p>
                        <p className="font-semibold">{format(new Date(subscription.end_date), "MMM d")}</p>
                      </div>
                    )}
                  </div>

                  {subscription?.ai_credits_included > 0 && (
                    <div className="p-2 bg-purple-50 rounded text-xs text-purple-700">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {subscription.ai_credits_included} AI credits
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingCoach(coach)}
                      className="text-gray-600 hover:bg-gray-50 h-9 md:h-auto text-xs md:text-sm"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(coach)}
                      className="text-orange-600 hover:bg-orange-50 h-9 md:h-auto text-xs md:text-sm"
                    >
                      <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredAndSortedCoaches.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-8 md:p-12 text-center">
              <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No Coaches Found</h3>
              <p className="text-sm md:text-base text-gray-600">
                {searchQuery || statusFilter !== "all" || planFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No health coaches created yet"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* View Coach Dialog */}
        <Dialog open={!!viewingCoach} onOpenChange={() => setViewingCoach(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{viewingCoach?.full_name}</DialogTitle>
              <DialogDescription>{viewingCoach?.email}</DialogDescription>
            </DialogHeader>
            {viewingCoach && (() => {
              const subscription = subscriptions.find((s) => s.coach_email === viewingCoach.email);
              const plan = plans.find((p) => p.id === subscription?.plan_id);
              const clientCount = clients.filter((c) =>
                Array.isArray(c.assigned_coach)
                  ? c.assigned_coach.includes(viewingCoach.email)
                  : c.assigned_coach === viewingCoach.email
              ).length;

              return (
                <div className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Basic Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold">Email:</span> {viewingCoach.email}
                        </p>
                        {viewingCoach.phone && (
                          <p>
                            <span className="font-semibold">Phone:</span> {viewingCoach.phone}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">Joined:</span>{" "}
                          {format(new Date(viewingCoach.created_date), "MMM d, yyyy")}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold">Clients:</span> {clientCount}
                        </p>
                        <p>
                          <span className="font-semibold">Subscription:</span>{" "}
                          <Badge className={subscription?.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {subscription?.status || "None"}
                          </Badge>
                        </p>
                      </CardContent>
                    </Card>

                    {subscription && (
                      <Card className="col-span-2">
                        <CardHeader>
                          <CardTitle className="text-lg">Subscription Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p>
                            <span className="font-semibold">Plan:</span> {plan?.plan_name}
                          </p>
                          <p>
                            <span className="font-semibold">Billing Cycle:</span> {subscription.billing_cycle}
                          </p>
                          <p>
                            <span className="font-semibold">Amount:</span> ₹{subscription.amount}
                          </p>
                          <p>
                            <span className="font-semibold">Valid Until:</span>{" "}
                            {format(new Date(subscription.end_date), "MMM d, yyyy")}
                          </p>
                          {subscription.ai_credits_included > 0 && (
                            <p>
                              <span className="font-semibold">AI Credits:</span> {subscription.ai_credits_included}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setViewingCoach(null);
                        handleEdit(viewingCoach);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to remove this coach?")) {
                          deleteCoachMutation.mutate(viewingCoach.email);
                        }
                      }}
                      disabled={deleteCoachMutation.isPending}
                    >
                      {deleteCoachMutation.isPending ? "Removing..." : "Remove Coach"}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Coach Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingCoach ? "Edit Coach" : "Add New Coach"}
              </DialogTitle>
              <DialogDescription>
                {editingCoach
                  ? "Update coach information"
                  : "Create a new health coach account"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium">Full Name</Label>
                <Input
                  placeholder="e.g., John Coach"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Phone (Optional)</Label>
                <Input
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (
                      !formData.full_name.trim() ||
                      !formData.email.trim()
                    ) {
                      toast.error(
                        "Please fill in name and email"
                      );
                      return;
                    }

                    try {
                      await createCoachesMutation.mutateAsync([formData]);
                    } catch (error) {
                      console.error("Error:", error);
                    }
                  }}
                  disabled={createCoachesMutation.isPending}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {createCoachesMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Coach"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <BulkCoachImport open={showBulkImport} onOpenChange={setShowBulkImport} />
      </div>
    </div>
  );
}