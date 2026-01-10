import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ScheduleMessageDialog({ onSchedule, children }) {
  const [open, setOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const handleSchedule = () => {
    if (scheduledDate && scheduledTime) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      onSchedule(scheduledDateTime);
      setOpen(false);
      setScheduledDate('');
      setScheduledTime('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Message Delivery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSchedule}
            disabled={!scheduledDate || !scheduledTime}
            className="w-full"
          >
            Schedule Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}