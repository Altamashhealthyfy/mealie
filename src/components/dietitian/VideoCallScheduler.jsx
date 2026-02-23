import React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

export default function VideoCallScheduler({ clientId, clientName, clientEmail, dietitianEmail }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const scheduleCallMutation = useMutation({
    mutationFn: async (callData) => {
      return await base44.entities.Appointment.create({
        coach_email: dietitianEmail,
        client_id: clientId,
        client_name: clientName,
        client_email: clientEmail,
        title: `Video Call with ${clientName}`,
        description: callData.description,
        appointment_date: new Date(`${callData.date}T${callData.time}`),
        duration_minutes: 30,
        appointment_type: 'consultation',
        is_virtual: true,
        status: 'scheduled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setOpen(false);
      setDate("");
      setTime("");
      setDescription("");
      alert("✅ Video call scheduled successfully!");
    },
    onError: (error) => {
      alert("❌ Failed to schedule call: " + error.message);
    }
  });

  const handleSchedule = () => {
    if (!date || !time) {
      alert("Please select both date and time");
      return;
    }
    scheduleCallMutation.mutate({ date, time, description });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Video className="w-4 h-4" />
          Schedule Video Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Schedule Video Call
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              With: <span className="text-blue-600">{clientName}</span>
            </label>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Time
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes for this call..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <Button
            onClick={handleSchedule}
            disabled={scheduleCallMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {scheduleCallMutation.isPending ? 'Scheduling...' : 'Schedule Call'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}