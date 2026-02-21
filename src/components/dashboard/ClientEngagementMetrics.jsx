import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Zap } from "lucide-react";

export default function ClientEngagementMetrics({ clients }) {
  const engagementLevels = clients.map(c => {
    const score = (c.messageReplyCount + c.logsCount) / 2;
    let level = 'Low';
    let color = 'bg-red-100 text-red-800';

    if (score >= 8) {
      level = 'Excellent';
      color = 'bg-green-100 text-green-800';
    } else if (score >= 5) {
      level = 'Good';
      color = 'bg-blue-100 text-blue-800';
    } else if (score >= 2) {
      level = 'Fair';
      color = 'bg-yellow-100 text-yellow-800';
    }

    return {
      ...c,
      engagementScore: score.toFixed(1),
      engagementLevel: level,
      color
    };
  }).sort((a, b) => b.engagementScore - a.engagementScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Client Engagement Levels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {engagementLevels.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No client data yet</p>
          ) : (
            engagementLevels.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{client.clientName}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    {client.messageReplyCount} replies • {client.logsCount} logs
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={client.color}>
                    {client.engagementLevel}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">
                    {client.engagementScore}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}