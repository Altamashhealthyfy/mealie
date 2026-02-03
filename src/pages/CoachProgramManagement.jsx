import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Target,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CoachProgramManagement() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [filterStatus, setFilterStatus] = useState("active");

  const [formData, setFormData] = useState({
    program_name: "",
    description: "",
    program_type: "transformation",
    duration_days: 30,
    is_paid: false,
    price: 0,
    max_participants: -1,
    goals: "",
    features: ""
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: programs } = useQuery({
    queryKey: ["coachPrograms", user?.email],
    queryFn: async () => {
      const progs = await base44.entities.CoachProgram.filter({
        coach_email: user?.email
      });
      return progs;
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: enrollments } = useQuery({
    queryKey: ["programEnrollments", user?.email],
    queryFn: async () => {
      const enroll = await base44.entities.ProgramEnrollment.filter({
        coach_email: user?.email
      });
      return enroll;
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const createProgramMutation = useMutation({
    mutationFn: async (data) => {
      const programData = {
        coach_email: user.email,
        program_name: data.program_name,
        description: data.description,
        program_type: data.program_type,
        duration_days: Number(data.duration_days),
        is_paid: data.is_paid,
        price: data.is_paid ? Number(data.price) : 0,
        max_participants: Number(data.max_participants),
        goals: data.goals.split(",").map(g => g.trim()).filter(Boolean),
        features: data.features.split(",").map(f => f.trim()).filter(Boolean),
        status: "active"
      };
      return await base44.entities.CoachProgram.create(programData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachPrograms"] });
      setShowAddDialog(false);
      setEditingProgram(null);
      setFormData({
        program_name: "",
        description: "",
        program_type: "transformation",
        duration_days: 30,
        is_paid: false,
        price: 0,
        max_participants: -1,
        goals: "",
        features: ""
      });
      toast.success("✅ Program created successfully!");
    },
    onError: (error) => {
      toast.error(`❌ ${error?.message || "Failed to create program"}`);
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (programId) => base44.entities.CoachProgram.update(programId, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachPrograms"] });
      setShowDetailsDialog(false);
      toast.success("✅ Program archived!");
    },
    onError: (error) => {
      toast.error(`❌ ${error?.message || "Failed to archive program"}`);
    },
  });

  const filteredPrograms = programs.filter(p => filterStatus === "all" || p.status === filterStatus);

  if (!user || user.user_type !== "student_coach") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only health coaches can manage programs.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              🎯 Program Management
            </h1>
            <p className="text-gray-600">Create and manage custom health programs and challenges</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Programs</p>
              <p className="text-3xl font-bold text-green-600">{filteredPrograms.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Enrollments</p>
              <p className="text-3xl font-bold text-blue-600">{enrollments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {enrollments.length > 0
                  ? Math.round((enrollments.filter(e => e.status === "completed").length / enrollments.length) * 100)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Programs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrograms.length === 0 ? (
            <Card className="md:col-span-2 border-dashed">
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No programs created yet</p>
              </CardContent>
            </Card>
          ) : (
            filteredPrograms.map((program) => {
              const programEnrollments = enrollments.filter(e => e.program_id === program.id);
              return (
                <Card key={program.id} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{program.program_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {program.program_type.charAt(0).toUpperCase() + program.program_type.slice(1)}
                        </CardDescription>
                      </div>
                      <Badge className={program.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {program.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{program.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="font-semibold flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {program.duration_days} days
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Enrollments</p>
                        <p className="font-semibold flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {programEnrollments.length}
                        </p>
                      </div>
                    </div>

                    {program.is_paid && (
                      <div className="p-3 bg-purple-50 rounded-lg text-sm">
                        <p className="text-purple-700 font-semibold">₹{program.price}</p>
                      </div>
                    )}

                    {program.goals && program.goals.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Goals:</p>
                        <div className="flex flex-wrap gap-1">
                          {program.goals.slice(0, 2).map((goal, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {goal}
                            </Badge>
                          ))}
                          {program.goals.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{program.goals.length - 2}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProgram(program);
                          setShowDetailsDialog(true);
                        }}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProgram(program);
                          setFormData({
                            program_name: program.program_name,
                            description: program.description,
                            program_type: program.program_type,
                            duration_days: program.duration_days,
                            is_paid: program.is_paid,
                            price: program.price || 0,
                            max_participants: program.max_participants || -1,
                            goals: program.goals?.join(", ") || "",
                            features: program.features?.join(", ") || ""
                          });
                          setShowAddDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Create/Edit Program Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProgram ? "Edit Program" : "Create New Program"}</DialogTitle>
              <DialogDescription>
                {editingProgram ? "Update program details" : "Create a new health program or challenge"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Program Name</Label>
                <Input
                  placeholder="e.g., 90-Day Transformation"
                  value={formData.program_name}
                  onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="What is this program about?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Program Type</Label>
                  <Select value={formData.program_type} onValueChange={(value) => setFormData({ ...formData, program_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transformation">Transformation</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="wellness">Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_paid"
                  checked={formData.is_paid}
                  onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="is_paid">This is a paid program</Label>
              </div>

              {formData.is_paid && (
                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
              )}

              <div>
                <Label>Max Participants (-1 for unlimited)</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                />
              </div>

              <div>
                <Label>Goals (comma-separated)</Label>
                <Input
                  placeholder="e.g., Weight Loss, Fitness, Nutrition"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                />
              </div>

              <div>
                <Label>Features (comma-separated)</Label>
                <Input
                  placeholder="e.g., Meal Plans, Workout Videos, Weekly Check-ins"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingProgram(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!formData.program_name.trim() || !formData.description.trim()) {
                      toast.error("Please fill in all required fields");
                      return;
                    }
                    createProgramMutation.mutate(formData);
                  }}
                  disabled={createProgramMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createProgramMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : editingProgram ? (
                    "Update Program"
                  ) : (
                    "Create Program"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Program Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedProgram?.program_name}</DialogTitle>
              <DialogDescription>{selectedProgram?.program_type}</DialogDescription>
            </DialogHeader>

            {selectedProgram && (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-gray-700">{selectedProgram.description}</p>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p className="text-gray-600">Duration</p>
                    <p className="font-semibold">{selectedProgram.duration_days} days</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Enrollments</p>
                    <p className="font-semibold">{enrollments.filter(e => e.program_id === selectedProgram.id).length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <Badge className={selectedProgram.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {selectedProgram.status}
                    </Badge>
                  </div>
                  {selectedProgram.is_paid && (
                    <div>
                      <p className="text-gray-600">Price</p>
                      <p className="font-semibold">₹{selectedProgram.price}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="flex-1">
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Archive this program?")) {
                        deleteProgramMutation.mutate(selectedProgram.id);
                      }
                    }}
                    disabled={deleteProgramMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}