import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, CalendarClock } from "lucide-react";
import { Loader2 } from "lucide-react";

function formatIST(dateString) {
  if (!dateString) return '';
  const utcStr = dateString.includes('Z') ? dateString : dateString + 'Z';
  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  }).format(d);
}

export default function VideoCallHistory({ clientId }) {
  const { data: callHistory = [], isLoading } = useQuery({
    queryKey: ['videoCallHistory', clientId],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ client_id: clientId });
      return msgs
        .filter(m => m.content_type === 'video_scheduled' || m.content_type === 'video_signal')
        .filter(m => m.content_type === 'video_scheduled')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (callHistory.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <Video className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="font-medium">No scheduled calls yet</p>
        <p className="text-sm mt-1">Use the "Schedule Call" button to plan a video session</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {callHistory.map((call) => {
        const isPast = call.scheduled_time ? new Date(call.scheduled_time) < new Date() : true;
        return (
          <Card key={call.id} className="border border-gray-100 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isPast ? 'bg-gray-100' : 'bg-orange-100'
              }`}>
                {isPast
                  ? <Video className="w-5 h-5 text-gray-500" />
                  : <CalendarClock className="w-5 h-5 text-orange-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{call.message}</p>
                <p className="text-xs text-gray-500 mt-1">Booked: {formatIST(call.created_date)}</p>
              </div>
              <Badge className={isPast ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'}>
                {isPast ? 'Done' : 'Upcoming'}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}