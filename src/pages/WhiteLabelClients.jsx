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
import { Users, Search, Crown, Edit, Eye, Save, Plus, TrendingUp, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WhiteLabelClients() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [planDialog, setPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
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

  const { data: securitySettings } = useQuery({
    queryKey: ['securitySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AppSecuritySettings.list();
      return settings[0] || null;
    },
    enabled: !!user && user.user_type === 'super_admin',
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

  const assignPlanMutation = useMutation({
    mutationFn: async ({ clientId, planData }) => {
      const existing = clientSubscriptions.find(s => s.client_id === clientId && s.status === 'active');
      if (existing) {
        return await base44.entities.ClientSubscription.update(existing.id, planData);
      } else {
        return await base44.entities.ClientSubscription.create(planData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientSubscriptions']);
      setPlanDialog(false);
      alert('✅ Plan assigned successfully! Features enabled.');
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

  const handleAssignPlan = (client) => {
    setSelectedClient(client);
    const existingSub = getClientSubscription(client.id);
    setSelectedPlan(existingSub?.plan_tier || '');
    setBillingCycle(existingSub?.billing_cycle || 'monthly');
    setPlanDialog(true);
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

  const handleSavePlan = () => {
    if (!selectedPlan) {
      alert('Please select a plan');
      return;
    }

    const planConfig = securitySettings?.membership_plans?.[`${selectedPlan}_plan`];
    if (!planConfig) {
      alert('Plan configuration not found');
      return;
    }

    const amount = billingCycle === 'yearly' ? planConfig.yearly_price : planConfig.monthly_price;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    const planData = {
      client_id: selectedClient.id,
      client_email: selectedClient.email,
      client_name: selectedClient.full_name,
      plan_tier: selectedPlan,
      billing_cycle: billingCycle,
      amount,
      currency: planConfig.currency || 'INR',
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      next_billing_date: endDate.toISOString().split('T')[0],
      status: 'active',
      payment_gateway: 'manual',
      coach_email: selectedClient.created_by,
      auto_renew: true
    };

    assignPlanMutation.mutate({ clientId: selectedClient.id, planData });
  };

  const plans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      icon: Users,
      color: 'from-gray-500 to-slate-600',
      monthly: securitySettings?.membership_plans?.basic_plan?.monthly_price || 999,
      yearly: securitySettings?.membership_plans?.basic_plan?.yearly_price || 9999,
      features: ['5 AI generations/month', 'Unlimited downloads', 'Basic support']
    },
    {
      id: 'advanced',
      name: 'Advanced Plan',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-600',
      monthly: securitySettings?.membership_plans?.advanced_plan?.monthly_price || 2999,
      yearly: securitySettings?.membership_plans?.advanced_plan?.yearly_price || 29999,
      popular: true,
      features: ['40 AI generations/month', 'Advanced features', 'Priority support']
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      icon: Crown,
      color: 'from-purple-500 to-pink-600',
      monthly: securitySettings?.membership_plans?.pro_plan?.monthly_price || 4999,
      yearly: securitySettings?.membership_plans?.pro_plan?.yearly_price || 49999,
      best: true,
      features: ['Unlimited AI', 'All features', 'Business tools', '24/7 support']
    }
  ];

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
            {clientSub ? (
              <Badge className="bg-green-100 text-green-700 capitalize">
                {clientSub.plan_tier} Plan
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-700">
                No Plan
              </Badge>
            )}
            {subscription && (
              <Badge className="bg-blue-100 text-blue-700 capitalize">
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
            <Button 
              size="sm" 
              onClick={() => handleAssignPlan(client)} 
              className={`flex-1 ${clientSub ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
            >
              <Crown className="w-4 h-4 mr-1" />
              {clientSub ? 'Change' : 'Assign'}
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
            <p className="text-gray-600">Manage clients under health coaches with plan-based features</p>
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

        {/* Plan Assignment Dialog */}
        {selectedClient && (
          <Dialog open={planDialog} onOpenChange={setPlanDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Plan to {selectedClient.full_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <Alert className="bg-blue-50 border-blue-500">
                  <Crown className="w-5 h-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Plan-Based Features:</strong> Selecting a plan automatically enables all features configured for that plan in Feature Control settings.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map(plan => {
                    const PlanIcon = plan.icon;
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <Card 
                        key={plan.id} 
                        className={`cursor-pointer transition-all ${isSelected ? 'ring-4 ring-purple-500' : ''} ${plan.popular ? 'ring-2 ring-blue-400' : ''} ${plan.best ? 'ring-2 ring-purple-400' : ''}`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <CardHeader className={`bg-gradient-to-r ${plan.color} text-white`}>
                          <div className="flex items-center justify-between mb-2">
                            <PlanIcon className="w-6 h-6" />
                            {plan.popular && <Badge className="bg-blue-600">Popular</Badge>}
                            {plan.best && <Badge className="bg-purple-600">Best</Badge>}
                            {isSelected && <Check className="w-6 h-6" />}
                          </div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <div className="mt-2">
                            <p className="text-sm opacity-90">Monthly</p>
                            <p className="text-2xl font-bold">₹{plan.monthly}</p>
                          </div>
                          <div className="mt-1 p-2 bg-white/20 rounded">
                            <p className="text-xs opacity-90">Yearly</p>
                            <p className="text-xl font-bold">₹{plan.yearly}</p>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-xs">{feature}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly (Save money!)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setPlanDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSavePlan} 
                    disabled={!selectedPlan || assignPlanMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {assignPlanMutation.isPending ? 'Assigning...' : 'Assign Plan'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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