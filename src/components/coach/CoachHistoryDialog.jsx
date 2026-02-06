import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  History, 
  Crown, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function CoachHistoryDialog({ coach, open, onOpenChange }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['coachHistory', coach?.email],
    queryFn: async () => {
      const records = await base44.entities.CoachSubscriptionHistory.filter({ 
        coach_email: coach.email 
      });
      return records.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!coach && open,
  });

  const getActionIcon = (actionType) => {
    switch(actionType) {
      case 'plan_assigned': return Crown;
      case 'plan_upgraded': return TrendingUp;
      case 'plan_downgraded': return TrendingDown;
      case 'plan_extended': return Calendar;
      case 'credits_added': return Sparkles;
      case 'access_enabled': return Eye;
      case 'access_disabled': return EyeOff;
      default: return History;
    }
  };

  const getActionColor = (actionType) => {
    switch(actionType) {
      case 'plan_assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'plan_upgraded': return 'bg-green-100 text-green-800 border-green-200';
      case 'plan_downgraded': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'plan_extended': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'credits_added': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'access_enabled': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'access_disabled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (actionType) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            Change History
          </DialogTitle>
          <DialogDescription>
            Complete history of plan changes and AI credit allocations for {coach?.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading history...</p>
          ) : history?.length > 0 ? (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 to-red-600"></div>
              {history.map((record, index) => {
                const Icon = getActionIcon(record.action_type);
                return (
                  <div key={record.id} className="relative pl-12 pb-8">
                    <div className={`absolute left-3 w-4 h-4 rounded-full border-2 border-white ${
                      index === 0 ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gray-300'
                    }`}></div>
                    
                    <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <Badge className={`${getActionColor(record.action_type)} border`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {getActionLabel(record.action_type)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(record.created_date).toLocaleString()}
                          </span>
                        </div>

                        {record.action_type === 'credits_added' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900">
                              <span className="font-semibold">Added:</span> {record.amount} AI Credits
                            </p>
                          </div>
                        )}

                        {(record.action_type.includes('plan') && !record.action_type.includes('extended')) && (
                          <div className="space-y-1">
                            {record.old_value && (
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">From:</span> {record.old_value}
                              </p>
                            )}
                            <p className="text-sm text-gray-900">
                              <span className="font-semibold">To:</span> {record.new_value}
                            </p>
                          </div>
                        )}

                        {record.action_type === 'plan_extended' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900">
                              <span className="font-semibold">Extended until:</span> {record.new_value}
                            </p>
                          </div>
                        )}

                        {(record.action_type === 'access_enabled' || record.action_type === 'access_disabled') && (
                          <p className="text-sm text-gray-900">
                            Access {record.action_type === 'access_enabled' ? 'enabled' : 'disabled'} for this coach
                          </p>
                        )}

                        {record.notes && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            Note: {record.notes}
                          </p>
                        )}

                        <p className="text-xs text-gray-400 mt-2">
                          By: {record.performed_by}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No history available</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}