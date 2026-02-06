import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

export default function SubscriptionCalendarView({ subscriptions, plans, onDateSelect }) {
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  // Mark dates with expiring subscriptions
  const expiryDates = subscriptions
    .filter(s => s.end_date && s.status === 'active')
    .map(s => new Date(s.end_date));

  const getDayModifiers = () => {
    const modifiers = {};
    expiryDates.forEach(date => {
      const dateStr = date.toDateString();
      if (!modifiers[dateStr]) {
        modifiers[dateStr] = [];
      }
      modifiers[dateStr].push('expiry');
    });
    return modifiers;
  };

  // Get subscriptions expiring on selected date
  const getSubscriptionsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return subscriptions.filter(s => {
      if (!s.end_date || s.status !== 'active') return false;
      const endDate = new Date(s.end_date).toISOString().split('T')[0];
      return endDate === dateStr;
    });
  };

  const selectedDateSubs = getSubscriptionsForDate(selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 border-none shadow-lg">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-600" />
            Subscription Expiry Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              if (onDateSelect) onDateSelect(date);
            }}
            modifiers={{
              expiry: expiryDates
            }}
            modifiersStyles={{
              expiry: {
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                fontWeight: 'bold',
                color: '#92400e'
              }
            }}
            className="rounded-md border shadow-sm mx-auto"
          />
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Calendar Legend</p>
                <p>Highlighted dates indicate subscription expiry dates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg">
            Expiring on {selectedDate.toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {selectedDateSubs.length > 0 ? (
            <div className="space-y-3">
              {selectedDateSubs.map(sub => {
                const plan = plans.find(p => p.id === sub.plan_id);
                return (
                  <div key={sub.id} className="p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <p className="font-semibold text-gray-900">{sub.coach_name}</p>
                    <p className="text-sm text-gray-600">{sub.coach_email}</p>
                    {plan && (
                      <Badge className="mt-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none">
                        {plan.plan_name}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No subscriptions expiring on this date</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}