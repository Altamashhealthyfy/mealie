import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Eye, Users, Search } from 'lucide-react';
import WeeklyMealPlanBuilder from '@/components/mealplanner/WeeklyMealPlanBuilder';
import WeeklyMealPlanView from '@/components/mealplanner/WeeklyMealPlanView';

export default function WeeklyMealPlans() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date', 100);
      
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => 
          client.created_by === user?.email || 
          client.assigned_coach === user?.email
        );
      }
      
      if (['team_member', 'student_team_member'].includes(user?.user_type)) {
        return allClients.filter(client => client.created_by === user?.email);
      }
      
      return [];
    },
    enabled: !!user,
    initialData: []
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['weeklyMealPlans'],
    queryFn: () => base44.entities.WeeklyMealPlan.list('-created_date', 100),
    initialData: []
  });

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientPlans = (clientId) => {
    return mealPlans.filter(p => p.client_id === clientId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Weekly Meal Plans</h1>
          <p className="text-gray-600">Create and manage client meal plans with recipes</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="grid gap-4">
          {filteredClients.map(client => {
            const clientPlans = getClientPlans(client.id);
            const activePlans = clientPlans.filter(p => p.status === 'active');

            return (
              <Card key={client.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        {client.full_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{client.email}</p>
                    </div>
                    <Dialog open={showBuilder && selectedClient?.id === client.id} onOpenChange={(open) => {
                      setShowBuilder(open);
                      if (!open) setSelectedClient(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedClient(client)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create Weekly Meal Plan</DialogTitle>
                        </DialogHeader>
                        <WeeklyMealPlanBuilder 
                          clientId={client.id}
                          onComplete={() => {
                            setShowBuilder(false);
                            setSelectedClient(null);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientPlans.length === 0 ? (
                    <p className="text-sm text-gray-500">No meal plans created yet</p>
                  ) : (
                    <div className="space-y-2">
                      {clientPlans.slice(0, 3).map(plan => (
                        <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="font-medium text-sm">
                                Week of {formatDate(plan.week_start_date)}
                              </p>
                              <p className="text-xs text-gray-600">
                                {plan.meals?.length || 0} meals planned
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                              {plan.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingPlan(plan)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {clientPlans.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{clientPlans.length - 3} more plans
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No clients found</p>
            </CardContent>
          </Card>
        )}

        {/* View Plan Dialog */}
        <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meal Plan Details</DialogTitle>
            </DialogHeader>
            {viewingPlan && <WeeklyMealPlanView plan={viewingPlan} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}