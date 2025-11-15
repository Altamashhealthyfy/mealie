import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Crown, Edit, Eye, Save, Plus } from "lucide-react";

export default function WhiteLabelClients() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [addFormData, setAddFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    status: 'active'
  });

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

  const { data: clientSubscriptions } = useQuery({
    queryKey: ['clientSubscriptions'],
    queryFn: () => base44.entities.ClientSubscription.list(),
    enabled: !!user && user.user_type === 'super_admin',
    initialData: [],
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allClients']);
      setEditDialog(false);
      alert('✅ Client updated successfully!');
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allClients']);
      setAddDialog(false);
      setAddFormData({
        full_name: '',
        email: '',
        phone: '',
        age: '',
        gender: 'male',
        weight: '',
        height: '',
        status: 'active'
      });
      alert('✅ Client added successfully!');
    },
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

  const whiteLabelClients = allClients.filter(client => {
    const creatorUser = allUsers.find(u => u.email === client.created_by);
    return creatorUser?.user_type === 'student_coach';
  });

  const getCoachInfo = (clientEmail) => {
    const creator = allUsers.find(u => u.email === clientEmail);
    const subscription = subscriptions.find(s => s.coach_email === creator?.email && s.status === 'active');
    return { creator, subscription };
  };

  const getClientSubscription = (clientId) => {
    return clientSubscriptions.find(s => s.client_id === clientId && s.status === 'active');
  };

  const filteredWhiteLabelClients = whiteLabelClients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (client) => {
    setSelectedClient(client);
    setViewDialog(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setEditFormData({
      full_name: client.full_name || '',
      email: client.email || '',
      phone: client.phone || '',
      age: client.age || '',
      gender: client.gender || '',
      weight: client.weight || '',
      height: client.height || '',
      status: client.status || 'active'
    });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    updateClientMutation.mutate({
      id: selectedClient.id,
      data: editFormData
    });
  };

  const handleAddClient = () => {
    if (!addFormData.full_name || !addFormData.email) {
      alert('Please fill in required fields: Name and Email');
      return;
    }
    createClientMutation.mutate(addFormData);
  };

  const ClientCard = ({ client }) => {
    const { creator, subscription } = getCoachInfo(client.created_by);
    const clientSub = getClientSubscription(client.id);

    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">{client.full_name}</h3>
              <p className="text-sm text-gray-600">{client.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge className="bg-purple-100 text-purple-700">White-Label</Badge>
            {client.status && (
              <Badge variant="outline" className="capitalize">{client.status}</Badge>
            )}
            {clientSub && (
              <Badge className="bg-green-100 text-green-700 capitalize">
                {clientSub.plan_tier}
              </Badge>
            )}
            {subscription && (
              <Badge className="bg-orange-100 text-orange-700 capitalize">
                Coach: {subscription.plan_type}
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
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => handleView(client)} className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(client)} className="flex-1">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">White-Label Client Management</h1>
            <p className="text-gray-600">Manage clients under health coaches</p>
          </div>
          <Users className="w-10 h-10 text-purple-500" />
        </div>

        <div className="flex gap-4">
          <Card className="border-none shadow-lg flex-1">
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
          <Button
            onClick={() => setAddDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Client
          </Button>
        </div>

        <Card className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              White-Label Clients ({filteredWhiteLabelClients.length})
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
            {filteredWhiteLabelClients.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}

        {/* View Dialog */}
        {selectedClient && (
          <Dialog open={viewDialog} onOpenChange={setViewDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Client Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Name</Label>
                    <p className="font-semibold">{selectedClient.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Email</Label>
                    <p className="font-semibold">{selectedClient.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Phone</Label>
                    <p className="font-semibold">{selectedClient.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Status</Label>
                    <Badge className="capitalize">{selectedClient.status || 'N/A'}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Age</Label>
                    <p className="font-semibold">{selectedClient.age || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Gender</Label>
                    <p className="font-semibold capitalize">{selectedClient.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Weight</Label>
                    <p className="font-semibold">{selectedClient.weight ? `${selectedClient.weight} kg` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Height</Label>
                    <p className="font-semibold">{selectedClient.height ? `${selectedClient.height} cm` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {selectedClient && (
          <Dialog open={editDialog} onOpenChange={setEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={editFormData.full_name}
                      onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editFormData.status} onValueChange={(val) => setEditFormData({...editFormData, status: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={editFormData.age}
                      onChange={(e) => setEditFormData({...editFormData, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={editFormData.gender} onValueChange={(val) => setEditFormData({...editFormData, gender: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      value={editFormData.weight}
                      onChange={(e) => setEditFormData({...editFormData, weight: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      value={editFormData.height}
                      onChange={(e) => setEditFormData({...editFormData, height: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={updateClientMutation.isPending} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500">
                    <Save className="w-4 h-4 mr-2" />
                    {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Client Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={addFormData.full_name}
                    onChange={(e) => setAddFormData({...addFormData, full_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({...addFormData, email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})}
                    placeholder="+91 1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={addFormData.status} onValueChange={(val) => setAddFormData({...addFormData, status: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={addFormData.age}
                    onChange={(e) => setAddFormData({...addFormData, age: e.target.value})}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={addFormData.gender} onValueChange={(val) => setAddFormData({...addFormData, gender: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={addFormData.weight}
                    onChange={(e) => setAddFormData({...addFormData, weight: e.target.value})}
                    placeholder="70"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={addFormData.height}
                    onChange={(e) => setAddFormData({...addFormData, height: e.target.value})}
                    placeholder="175"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddClient} disabled={createClientMutation.isPending} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
                  <Plus className="w-4 h-4 mr-2" />
                  {createClientMutation.isPending ? 'Adding...' : 'Add Client'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}