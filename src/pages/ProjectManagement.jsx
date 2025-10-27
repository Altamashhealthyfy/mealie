import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FolderOpen,
  Plus,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectManagement() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    project_manager: "",
    start_date: "",
    end_date: "",
    status: "planning",
    priority: "medium",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ status: 'active' }),
    initialData: [],
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowAddForm(false);
      setForm({
        name: "",
        description: "",
        project_manager: "",
        start_date: "",
        end_date: "",
        status: "planning",
        priority: "medium",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSelectedProject(null);
    },
  });

  const handleCreate = () => {
    createProjectMutation.mutate(form);
  };

  const handleUpdateProgress = (project, progress) => {
    updateProjectMutation.mutate({
      id: project.id,
      data: { ...project, progress_percentage: progress }
    });
  };

  const stats = {
    total: projects.length,
    planning: projects.filter(p => p.status === 'planning').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    onHold: projects.filter(p => p.status === 'on_hold').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Management</h1>
            <p className="text-gray-600">Track projects and milestones</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-90">Total Projects</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.planning}</p>
              <p className="text-xs opacity-90">Planning</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs opacity-90">In Progress</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.onHold}</p>
              <p className="text-xs opacity-90">On Hold</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs opacity-90">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-none shadow-xl bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Project</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Q4 Marketing Campaign"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Project details and objectives..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Manager *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.project_manager}
                    onChange={(e) => setForm({...form, project_manager: e.target.value})}
                  >
                    <option value="">Select manager...</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.email}>
                        {member.full_name} - {member.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.priority}
                    onChange={(e) => setForm({...form, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({...form, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({...form, end_date: e.target.value})}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createProjectMutation.isPending || !form.name || !form.project_manager}
                className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const manager = teamMembers.find(m => m.email === project.project_manager);
            const progress = project.progress_percentage || 0;

            return (
              <Card key={project.id} className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => setSelectedProject(project)}>
                <CardHeader className={`
                  ${project.status === 'completed' ? 'bg-green-50 border-l-4 border-green-500' :
                    project.status === 'in_progress' ? 'bg-blue-50 border-l-4 border-blue-500' :
                    project.status === 'on_hold' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                    'bg-gray-50 border-l-4 border-gray-500'}
                `}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className={
                          project.priority === 'high' ? 'bg-red-500' :
                          project.priority === 'medium' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }>
                          {project.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {project.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <FolderOpen className="w-8 h-8 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  )}
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{manager?.full_name || 'No manager'}</span>
                    </div>
                    {project.start_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(project.start_date), 'MMM d')} - 
                          {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : '...'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-bold text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          progress === 100 ? 'bg-green-500' :
                          progress >= 75 ? 'bg-blue-500' :
                          progress >= 50 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Project Detail Modal */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{selectedProject.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>
                    <X className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {selectedProject.description && (
                  <div>
                    <Label className="text-xs text-gray-500">Description</Label>
                    <p className="mt-1">{selectedProject.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Project Manager</Label>
                    <p className="font-semibold">
                      {teamMembers.find(m => m.email === selectedProject.project_manager)?.full_name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <Badge className="mt-1 capitalize">{selectedProject.status?.replace('_', ' ')}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Priority</Label>
                    <Badge className={`mt-1 ${
                      selectedProject.priority === 'high' ? 'bg-red-500' :
                      selectedProject.priority === 'medium' ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}>
                      {selectedProject.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Progress</Label>
                    <p className="font-semibold text-green-600">{selectedProject.progress_percentage || 0}%</p>
                  </div>
                </div>

                {(selectedProject.start_date || selectedProject.end_date) && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Timeline</Label>
                    <div className="flex items-center gap-2">
                      {selectedProject.start_date && (
                        <div className="p-3 bg-blue-50 rounded-lg flex-1">
                          <p className="text-xs text-gray-600">Start Date</p>
                          <p className="font-semibold">{format(new Date(selectedProject.start_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      {selectedProject.end_date && (
                        <div className="p-3 bg-orange-50 rounded-lg flex-1">
                          <p className="text-xs text-gray-600">End Date</p>
                          <p className="font-semibold">{format(new Date(selectedProject.end_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Update Progress</Label>
                  <div className="flex gap-2">
                    {[0, 25, 50, 75, 100].map(value => (
                      <Button
                        key={value}
                        variant={selectedProject.progress_percentage === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleUpdateProgress(selectedProject, value)}
                      >
                        {value}%
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Update Status</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={selectedProject.status}
                    onChange={(e) => updateProjectMutation.mutate({
                      id: selectedProject.id,
                      data: { ...selectedProject, status: e.target.value }
                    })}
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}