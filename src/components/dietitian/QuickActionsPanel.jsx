import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChefHat, Heart, Calendar, Bell, Loader2, CheckCircle2, ChevronRight, X, Plus, Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function QuickActionsPanel({ client, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("meal_plan");

  // ─── Meal Plan Assignment ───────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const { data: mealPlans = [] } = useQuery({
    queryKey: ["allMealPlans"],
    queryFn: () => base44.entities.MealPlan.list("-created_date", 100),
    enabled: open,
  });
  const clientPlans = mealPlans.filter(p => p.client_id !== client?.id); // other clients' plans as templates
  const availablePlans = mealPlans.filter(p => p.created_by !== undefined); // all plans

  const assignPlanMutation = useMutation({
    mutationFn: async (planId) => {
      const plan = availablePlans.find(p => p.id === planId);
      if (!plan) throw new Error("Plan not found");
      // Clone plan to client
      const { id, created_date, updated_date, ...planData } = plan;
      return base44.entities.MealPlan.create({ ...planData, client_id: client.id, active: true });
    },
    onSuccess: () => {
      toast.success("Meal plan assigned successfully!");
      queryClient.invalidateQueries(["mealPlans"]);
      setSelectedPlanId("");
    },
    onError: (e) => toast.error("Failed to assign plan: " + e.message),
  });

  // ─── Custom MPESS Practice ──────────────────────────────
  const [mpessForm, setMpessForm] = useState({
    category: "mind",
    practice: "",
    frequency: "daily",
    duration: "",
    notes: "",
  });

  const saveMpessMutation = useMutation({
    mutationFn: async (data) => {
      // Store as a coach note in the MPESS tracker for this client
      return base44.entities.MPESSTracker.create({
        client_id: client.id,
        submission_date: format(new Date(), "yyyy-MM-dd"),
        submission_data: {
          coach_assigned_practice: true,
          category: data.category,
          practice: data.practice,
          frequency: data.frequency,
          duration: data.duration,
          notes: data.notes,
        },
        coach_reviewed: true,
        coach_notes: `Coach-assigned ${data.category} practice: ${data.practice} (${data.frequency})`,
        coach_review_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("MPESS practice assigned to client!");
      setMpessForm({ category: "mind", practice: "", frequency: "daily", duration: "", notes: "" });
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  // ─── Schedule Check-In Call ─────────────────────────────
  const [callForm, setCallForm] = useState({
    title: "Check-in Call",
    date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
    time: "10:00",
    duration: "30",
    notes: "",
  });
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const scheduleCallMutation = useMutation({
    mutationFn: async (data) => {
      const appointmentDate = new Date(`${data.date}T${data.time}:00`);
      const endTime = new Date(appointmentDate.getTime() + parseInt(data.duration) * 60000);
      return base44.entities.Appointment.create({
        coach_email: user?.email,
        client_id: client.id,
        client_name: client.full_name,
        client_email: client.email,
        title: data.title,
        description: data.notes,
        appointment_date: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: parseInt(data.duration),
        appointment_type: "follow_up",
        status: "scheduled",
        is_virtual: true,
      });
    },
    onSuccess: () => {
      toast.success("Check-in call scheduled!");
      queryClient.invalidateQueries(["appointments"]);
      setCallForm({ title: "Check-in Call", date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"), time: "10:00", duration: "30", notes: "" });
    },
    onError: (e) => toast.error("Failed to schedule: " + e.message),
  });

  // ─── Push Notification / Reminder ──────────────────────
  const [notifForm, setNotifForm] = useState({
    type: "reminder",
    title: "",
    message: "",
    send_email: true,
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data) => {
      const results = [];
      // In-app notification
      results.push(base44.entities.Notification.create({
        user_email: client.email,
        title: data.title,
        message: data.message,
        type: data.type,
        read: false,
      }).catch(() => null));

      // Email notification
      if (data.send_email && client.email) {
        results.push(base44.integrations.Core.SendEmail({
          to: client.email,
          subject: data.title,
          body: `Hi ${client.full_name},\n\n${data.message}\n\nBest regards,\nYour Health Coach`,
        }).catch(() => null));
      }
      await Promise.all(results);
    },
    onSuccess: () => {
      toast.success("Notification sent to client!");
      setNotifForm({ type: "reminder", title: "", message: "", send_email: true });
    },
    onError: (e) => toast.error("Failed to send: " + e.message),
  });

  const mpessCategories = [
    { value: "mind", label: "🧠 Mind" },
    { value: "physical", label: "💪 Physical" },
    { value: "emotional", label: "❤️ Emotional" },
    { value: "social", label: "👥 Social" },
    { value: "spiritual", label: "✨ Spiritual" },
  ];

  const reminderTemplates = [
    { title: "Meal Log Reminder", message: "Hi! Please don't forget to log your meals today. Consistent tracking helps us monitor your progress effectively." },
    { title: "Water Intake Reminder", message: "Stay hydrated! Aim for at least 2-3 liters of water today. Proper hydration is key to your health goals." },
    { title: "Workout Reminder", message: "Time to move! Don't skip your workout today. Even 20-30 minutes makes a big difference." },
    { title: "Progress Check-In", message: "Hi! How are you feeling today? Please log your weight and wellness metrics when you get a chance." },
    { title: "Motivational Boost", message: "You're doing amazing! Keep up the great work. Every small step counts towards your health goals. 💪" },
  ];

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(client.full_name || "C").charAt(0)}
            </div>
            Quick Actions — {client.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">{client.email}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 h-auto">
            <TabsTrigger value="meal_plan" className="flex flex-col gap-0.5 py-2 text-xs">
              <ChefHat className="w-4 h-4" />
              Meal Plan
            </TabsTrigger>
            <TabsTrigger value="mpess" className="flex flex-col gap-0.5 py-2 text-xs">
              <Heart className="w-4 h-4" />
              MPESS
            </TabsTrigger>
            <TabsTrigger value="call" className="flex flex-col gap-0.5 py-2 text-xs">
              <Calendar className="w-4 h-4" />
              Call
            </TabsTrigger>
            <TabsTrigger value="notify" className="flex flex-col gap-0.5 py-2 text-xs">
              <Bell className="w-4 h-4" />
              Notify
            </TabsTrigger>
          </TabsList>

          {/* ── Meal Plan Tab ── */}
          <TabsContent value="meal_plan" className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Assign Existing Meal Plan</h3>
              <p className="text-xs text-gray-500 mb-3">Copy a meal plan from your library and assign it to {client.full_name}.</p>
              <div className="space-y-3">
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meal plan to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          <Badge variant="outline" className="text-xs">{plan.duration}d · {plan.target_calories} kcal</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => assignPlanMutation.mutate(selectedPlanId)}
                  disabled={!selectedPlanId || assignPlanMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                >
                  {assignPlanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChefHat className="w-4 h-4 mr-2" />}
                  Assign Meal Plan
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── MPESS Tab ── */}
          <TabsContent value="mpess" className="space-y-4 mt-4">
            <h3 className="font-semibold text-gray-800">Assign Custom MPESS Practice</h3>
            <p className="text-xs text-gray-500">Create a personalized wellness practice for {client.full_name}.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={mpessForm.category} onValueChange={v => setMpessForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mpessCategories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Select value={mpessForm.frequency} onValueChange={v => setMpessForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="3x_week">3x per week</SelectItem>
                      <SelectItem value="weekdays">Weekdays</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Practice / Activity *</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. 10 min morning meditation, Evening walk..."
                  value={mpessForm.practice}
                  onChange={e => setMpessForm(f => ({ ...f, practice: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Duration (optional)</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. 20 minutes, 30 mins..."
                  value={mpessForm.duration}
                  onChange={e => setMpessForm(f => ({ ...f, duration: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Coach Notes</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  placeholder="Why this practice, tips, instructions..."
                  value={mpessForm.notes}
                  onChange={e => setMpessForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <Button
                onClick={() => saveMpessMutation.mutate(mpessForm)}
                disabled={!mpessForm.practice || saveMpessMutation.isPending}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
              >
                {saveMpessMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
                Assign Practice
              </Button>
            </div>
          </TabsContent>

          {/* ── Call Tab ── */}
          <TabsContent value="call" className="space-y-4 mt-4">
            <h3 className="font-semibold text-gray-800">Schedule Check-In Call</h3>
            <p className="text-xs text-gray-500">Book a consultation or follow-up call with {client.full_name}.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Call Title</Label>
                <Input
                  className="mt-1"
                  value={callForm.title}
                  onChange={e => setCallForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={callForm.date}
                    onChange={e => setCallForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={callForm.time}
                    onChange={e => setCallForm(f => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Duration</Label>
                <Select value={callForm.duration} onValueChange={v => setCallForm(f => ({ ...f, duration: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  placeholder="Agenda, topics to discuss..."
                  value={callForm.notes}
                  onChange={e => setCallForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <Button
                onClick={() => scheduleCallMutation.mutate(callForm)}
                disabled={!callForm.date || !callForm.time || scheduleCallMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500"
              >
                {scheduleCallMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                Schedule Call
              </Button>
            </div>
          </TabsContent>

          {/* ── Notify Tab ── */}
          <TabsContent value="notify" className="space-y-4 mt-4">
            <h3 className="font-semibold text-gray-800">Send Push Notification / Reminder</h3>
            <p className="text-xs text-gray-500">Send an in-app notification and/or email reminder to {client.full_name}.</p>

            {/* Quick templates */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Quick Templates</Label>
              <div className="flex flex-wrap gap-1.5">
                {reminderTemplates.map(t => (
                  <button
                    key={t.title}
                    onClick={() => setNotifForm(f => ({ ...f, title: t.title, message: t.message }))}
                    className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Notification Type</Label>
                <Select value={notifForm.type} onValueChange={v => setNotifForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="motivation">Motivation</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title *</Label>
                <Input
                  className="mt-1"
                  placeholder="Notification title..."
                  value={notifForm.title}
                  onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Message *</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="Your message to the client..."
                  value={notifForm.message}
                  onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="send_email"
                  checked={notifForm.send_email}
                  onChange={e => setNotifForm(f => ({ ...f, send_email: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="send_email" className="text-xs cursor-pointer">Also send via Email</Label>
              </div>
              <Button
                onClick={() => sendNotificationMutation.mutate(notifForm)}
                disabled={!notifForm.title || !notifForm.message || sendNotificationMutation.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500"
              >
                {sendNotificationMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                Send Notification
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}