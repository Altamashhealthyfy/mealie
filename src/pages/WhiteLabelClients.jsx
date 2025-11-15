import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Crown, TrendingUp, User } from "lucide-react";

export default function WhiteLabelClients() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allClients } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: !!user && user.user_type === 'super_admin',
    initialData: [],
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && user.user_type === 'super_admin',
    initialData: [],
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    enabled: !!user && user.user_type === 'super_admin',
    initialData: [],
  });

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-900">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Only Platform Owner can view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const platformClients = allClients.filter(client => {
    const creatorUser = allUsers.find(u => u.email === client.created_by);
    return creatorUser?.user_type === 'super_admin';
  });

  const whiteLabelClients = allClients.filter(client => {
    const creatorUser = allUsers.find(u => u.email === client.created_by);
    return creatorUser?.user_type === 'student_coach';
  });

  const getCoachInfo = (clientEmail) => {
    const creator = allUsers.find(u => u.email === clientEmail);
    const subscription = subscriptions.find(s => s.coach_email === creator?.email && s.status === 'active');
    return { creator, subscription };
  };

  const filteredPlatformClients = platformClients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWhiteLabelClients = whiteLabelClients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">Platform clients vs White-label clients</p>
          </div>
          <Users className="w-10 h-10 text-purple-500" />
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
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

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full md:w-96">
            <TabsTrigger value="platform">
              Platform Clients ({filteredPlatformClients.length})
            </TabsTrigger>
            <TabsTrigger value="whitelabel">
              White-Label Clients ({filteredWhiteLabelClients.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="space-y-4">
            <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Your Platform Clients
                </CardTitle>
              </CardHeader>
            </Card>

            {filteredPlatformClients.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No platform clients found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlatformClients.map(client => (
                  <Card key={client.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{client.full_name}</h3>
                          <p className="text-sm text-gray-600">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className="bg-blue-100 text-blue-700">Platform Client</Badge>
                        {client.status && (
                          <Badge variant="outline" className="capitalize">{client.status}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="whitelabel" className="space-y-4">
            <Card className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  White-Label Clients
                </CardTitle>
              </CardHeader>
            </Card>

            {filteredWhiteLabelClients.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No white-label clients found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWhiteLabelClients.map(client => {
                  const { creator, subscription } = getCoachInfo(client.created_by);
                  
                  return (
                    <Card key={client.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{client.full_name}</h3>
                            <p className="text-sm text-gray-600">{client.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge className="bg-purple-100 text-purple-700">White-Label</Badge>
                          {subscription && (
                            <Badge className="bg-green-100 text-green-700 capitalize">
                              {subscription.plan_type}
                            </Badge>
                          )}
                        </div>
                        {creator && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500">Coach:</p>
                            <p className="text-sm font-medium text-gray-900">{creator.full_name}</p>
                            <p className="text-xs text-gray-600">{creator.email}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}