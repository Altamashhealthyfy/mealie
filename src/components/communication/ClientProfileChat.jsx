import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare, Phone, Video, Mail, MapPin, Calendar,
  CheckCircle2, AlertCircle, TrendingUp
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import QuickChatPanel from './QuickChatPanel';

export default function ClientProfileChat({ 
  client, 
  coachEmail, 
  isClient = false,
  onVideoCall,
  expanded = false 
}) {
  const [showChat, setShowChat] = useState(expanded);

  if (!client) return null;

  const daysActive = client.join_date ? differenceInDays(new Date(), new Date(client.join_date)) : 0;
  const statusColor = client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-4">
      {/* Client Profile Header */}
      {!isClient && (
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{client.full_name}</h3>
                    <Badge className={statusColor}>{client.status || 'active'}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.join_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{daysActive} days</span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Goal</p>
                    <p className="text-sm font-bold text-gray-900 capitalize">{client.goal || '--'}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Current Weight</p>
                    <p className="text-sm font-bold text-gray-900">{client.weight || '--'} kg</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Target</p>
                    <p className="text-sm font-bold text-gray-900">{client.target_weight || '--'} kg</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setShowChat(!showChat)}
                  className="gap-2 bg-blue-500 hover:bg-blue-600"
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>
                <Button
                  onClick={() => onVideoCall?.()}
                  variant="outline"
                  className="gap-2"
                  size="sm"
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Call</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Chat Panel */}
      {showChat && (
        <div className="h-[500px]">
          <QuickChatPanel
            clientId={client.id}
            clientName={client.full_name}
            coachEmail={coachEmail}
            onVideoCall={onVideoCall}
            isClient={isClient}
          />
        </div>
      )}
    </div>
  );
}