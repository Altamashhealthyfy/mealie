import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Phone, TrendingUp, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default function SegmentedClientList({ clients, progressLogs = [] }) {
  const getProgressIndicator = (client) => {
    const logs = progressLogs.filter(l => l.client_id === client.id);
    if (logs.length < 2) return { value: 0, status: 'no_data' };
    
    const latestLog = logs[logs.length - 1];
    const startLog = logs[0];
    
    if (!latestLog.weight || !startLog.weight) return { value: 0, status: 'no_data' };
    
    const weightChange = startLog.weight - latestLog.weight;
    const percentage = (weightChange / startLog.weight) * 100;
    
    if (percentage >= 5) return { value: percentage.toFixed(1), status: 'excellent' };
    if (percentage >= 2) return { value: percentage.toFixed(1), status: 'good' };
    if (percentage > 0) return { value: percentage.toFixed(1), status: 'fair' };
    return { value: percentage.toFixed(1), status: 'no_progress' };
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'no_progress': return 'bg-red-100 text-red-800';
      case 'no_data': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysInactive = (client) => {
    const logs = progressLogs.filter(l => l.client_id === client.id);
    if (logs.length === 0) return null;
    
    const lastLog = logs[logs.length - 1];
    const daysInactive = Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24));
    return daysInactive;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Segmented Clients ({clients.length})</span>
          <Badge variant="outline">{clients.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No clients match the selected segments</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Inactive Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const progress = getProgressIndicator(client);
                  const daysInactive = getDaysInactive(client);

                  return (
                    <TableRow key={client.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {client.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{client.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{client.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {client.goal?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          <Badge className={`text-xs ${getStatusColor(progress.status)}`}>
                            {progress.value}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {daysInactive !== null ? (
                          <span className={`text-sm font-medium ${daysInactive > 30 ? 'text-red-600' : 'text-green-600'}`}>
                            {daysInactive} days
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            client.status === 'active' ? 'bg-green-100 text-green-800' :
                            client.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            client.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {client.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Email">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Call">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}