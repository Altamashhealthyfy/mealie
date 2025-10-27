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
  CheckSquare,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

export default function TaskBoard() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    status: "todo",
    due_date: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    initialData: [],
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ status: 'active' }),
    initialData: [],
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowAddForm(false);
      setForm({
        title: "",
        description: "",
        assigned_to: "",
        priority: "medium",
        status: "todo",
        due_date: "",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
  });

  const handleCreate = () => {
    createTaskMutation.mutate({
      ...form,
      assigned_by: user?.email,
    });
  };

  const handleMoveTask = (task, newStatus) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { ...task, status: newStatus }
    });
  };

  const columns = [
    { id: 'todo', title: 'To Do', icon: Clock, color: 'blue' },
    { id: 'in_progress', title: 'In Progress', icon: AlertCircle, color: 'orange' },
    { id: 'review', title: 'Review', icon: CheckSquare, color: 'purple' },
    { id: 'done', title: 'Done', icon: CheckCircle2, color: 'green' },
  ];

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Task Board</h1>
            <p className="text-gray-600">Manage team tasks and projects</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-500 to-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-90">Total Tasks</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.todo}</p>
              <p className="text-xs opacity-90">To Do</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs opacity-90">In Progress</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.review}</p>
              <p className="text-xs opacity-90">Review</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.done}</p>
              <p className="text-xs opacity-90">Done</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stats.urgent + stats.high}</p>
              <p className="text-xs opacity-90">High Priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-none shadow-xl bg-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Task</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Task Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="Complete client onboarding"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Task details..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign To *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.assigned_to}
                    onChange={(e) => setForm({...form, assigned_to: e.target.value})}
                  >
                    <option value="">Select team member...</option>
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
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({...form, due_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={form.status}
                    onChange={(e) => setForm({...form, status: e.target.value})}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createTaskMutation.isPending || !form.title || !form.assigned_to}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            const Icon = column.icon;

            return (
              <Card key={column.id} className="border-none shadow-lg">
                <CardHeader className={`bg-${column.color}-50 border-l-4 border-${column.color}-500`}>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="w-5 h-5" />
                    {column.title}
                    <Badge className="ml-auto">{columnTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2 min-h-[500px]">
                  {columnTasks.map((task) => (
                    <Card key={task.id} className="p-3 border hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{task.title}</h4>
                        <Badge className={
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span className="truncate">👤 {task.assigned_to?.split('@')[0]}</span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(task.due_date), 'MMM d')}</span>
                        </div>
                      )}
                      <div className="flex gap-1 mt-3">
                        {column.id !== 'todo' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {
                              const prevStatus = 
                                column.id === 'in_progress' ? 'todo' :
                                column.id === 'review' ? 'in_progress' :
                                column.id === 'done' ? 'review' : 'todo';
                              handleMoveTask(task, prevStatus);
                            }}
                          >
                            ←
                          </Button>
                        )}
                        {column.id !== 'done' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {
                              const nextStatus = 
                                column.id === 'todo' ? 'in_progress' :
                                column.id === 'in_progress' ? 'review' :
                                column.id === 'review' ? 'done' : 'done';
                              handleMoveTask(task, nextStatus);
                            }}
                          >
                            →
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}