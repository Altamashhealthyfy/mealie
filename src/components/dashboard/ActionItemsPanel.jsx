import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, TrendingDown, Calendar, MessageCircle, 
  ClipboardList, Target, CheckCircle2, ArrowRight 
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ActionItemsPanel({ 
  clients = [], 
  progressLogs = [], 
  foodLogs = [], 
  assessments = [],
  goals = [],
  appointments = [] 
}) {
  const today = new Date();

  // Clients with no activity in 7 days
  const inactiveClients = clients.filter(client => {
    const clientProgress = progressLogs.filter(l => l.client_id === client.id);
    const clientFood = foodLogs.filter(l => l.client_id === client.id);
    
    const lastProgress = clientProgress[0];
    const lastFood = clientFood[0];
    
    const daysSinceProgress = lastProgress ? differenceInDays(today, new Date(lastProgress.date)) : 999;
    const daysSinceFood = lastFood ? differenceInDays(today, new Date(lastFood.date)) : 999;
    
    return daysSinceProgress > 7 && daysSinceFood > 7;
  });

  // Clients losing weight rapidly (>1kg/week)
  const rapidWeightLoss = clients
    .map(client => {
      const clientLogs = progressLogs
        .filter(l => l.client_id === client.id && l.weight)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (clientLogs.length < 2) return null;
      
      const recent = clientLogs[0];
      const previous = clientLogs[1];
      const daysBetween = differenceInDays(new Date(recent.date), new Date(previous.date));
      const weightChange = recent.weight - previous.weight;
      const weeklyRate = (weightChange / daysBetween) * 7;
      
      if (weeklyRate < -1) {
        return { client, weeklyRate: weeklyRate.toFixed(1), lastLog: recent };
      }
      return null;
    })
    .filter(Boolean);

  // Pending assessments
  const pendingAssessments = assessments.filter(a => a.status === 'pending');

  // Goals nearing deadline
  const urgentGoals = goals.filter(g => {
    if (g.status !== 'active' || !g.target_date) return false;
    try {
      const daysUntil = differenceInDays(new Date(g.target_date), today);
      return daysUntil <= 7 && daysUntil >= 0;
    } catch {
      return false;
    }
  });

  // Appointments today
  const todayAppointments = appointments.filter(a => {
    if (!a.date || !a.appointment_date) return false;
    try {
      const appointmentDate = a.date || a.appointment_date;
      return format(new Date(appointmentDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') && a.status === 'scheduled';
    } catch {
      return false;
    }
  });

  const actionItems = [
    {
      icon: AlertTriangle,
      title: 'Inactive Clients',
      count: inactiveClients.length,
      color: 'red',
      description: 'No activity in 7+ days',
      clients: inactiveClients.slice(0, 3),
      link: createPageUrl("ClientAnalyticsDashboard"),
      priority: 'high'
    },
    {
      icon: TrendingDown,
      title: 'Rapid Weight Loss',
      count: rapidWeightLoss.length,
      color: 'yellow',
      description: 'Losing >1kg/week',
      clients: rapidWeightLoss.slice(0, 3).map(r => r.client),
      priority: 'medium'
    },
    {
      icon: ClipboardList,
      title: 'Pending Assessments',
      count: pendingAssessments.length,
      color: 'blue',
      description: 'Awaiting completion',
      link: createPageUrl("ClientAssessments"),
      priority: 'medium'
    },
    {
      icon: Target,
      title: 'Goals Due Soon',
      count: urgentGoals.length,
      color: 'purple',
      description: 'Deadline within 7 days',
      priority: 'medium'
    },
    {
      icon: Calendar,
      title: 'Appointments Today',
      count: todayAppointments.length,
      color: 'green',
      description: 'Scheduled for today',
      link: createPageUrl("Appointments"),
      priority: 'high'
    },
  ];

  const highPriorityItems = actionItems.filter(item => item.count > 0 && item.priority === 'high');
  const otherItems = actionItems.filter(item => item.count > 0 && item.priority !== 'high');

  if (highPriorityItems.length === 0 && otherItems.length === 0) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up! 🎉</h3>
          <p className="text-gray-600">No urgent action items at the moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
          Action Items ({highPriorityItems.length + otherItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* High Priority */}
        {highPriorityItems.map((item, idx) => (
          <Alert key={idx} className={`border-2 ${
            item.color === 'red' ? 'bg-red-50 border-red-300' :
            item.color === 'green' ? 'bg-green-50 border-green-300' :
            'bg-yellow-50 border-yellow-300'
          }`}>
            <item.icon className={`w-5 h-5 ${
              item.color === 'red' ? 'text-red-600' :
              item.color === 'green' ? 'text-green-600' :
              'text-yellow-600'
            }`} />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  {item.clients && item.clients.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.clients.map(client => (
                        <Badge key={client.id} variant="outline" className="text-xs">
                          {client.full_name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Badge className={`${
                    item.color === 'red' ? 'bg-red-600' :
                    item.color === 'green' ? 'bg-green-600' :
                    'bg-yellow-600'
                  } text-white text-lg px-3 py-1`}>
                    {item.count}
                  </Badge>
                  {item.link && (
                    <Link to={item.link}>
                      <Button size="sm" variant="outline">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}

        {/* Other Items */}
        {otherItems.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border-2 ${
              item.color === 'blue' ? 'bg-blue-50 border-blue-200' :
              item.color === 'purple' ? 'bg-purple-50 border-purple-200' :
              'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <item.icon className={`w-5 h-5 ${
                  item.color === 'blue' ? 'text-blue-600' :
                  item.color === 'purple' ? 'text-purple-600' :
                  'text-yellow-600'
                }`} />
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-lg px-3 py-1">{item.count}</Badge>
                {item.link && (
                  <Link to={item.link}>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}