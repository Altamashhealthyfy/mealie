
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  TrendingUp,
  Calendar,
  MessageSquare,
  Edit,
  Eye,
  Plus,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewingClientPlans, setViewingClientPlans] = useState(null); // New state for viewing plans dialog
  const [formData, setFormData] = useState({
    status: 'active',
    join_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      // Filter based on user type
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      // Team members and student coaches see only their own plans
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (selectedClient) {
        return base44.entities.Client.update(selectedClient.id, data);
      }
      return base44.entities.Client.create(data);
    },
    onSuccess: (savedClient) => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      
      // Show success with option to create meal plan
      const shouldCreatePlan = window.confirm(
        `✅ Client saved successfully!\n\n` +
        `Would you like to create a meal plan for ${savedClient.full_name} now?`
      );
      
      if (shouldCreatePlan) {
        // Navigate to meal planner with client pre-selected
        navigate(`${createPageUrl("MealPlanner")}?client=${savedClient.id}`);
      }
      
      setSelectedClient(null);
      setFormData({ status: 'active', join_date: format(new Date(), 'yyyy-MM-dd') });
    },
  });

  const calculateMacros = () => {
    const { weight, height, age, gender, activity_level, goal } = formData;
    
    if (!weight || !height || !age || !gender || !activity_level || !goal) {
      alert("Please fill in required fields first");
      return;
    }

    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    
    const tdee = bmr * activityMultipliers[activity_level];

    let targetCalories;
    switch (goal) {
      case 'weight_loss':
        targetCalories = tdee - 500;
        break;
      case 'weight_gain':
        targetCalories = tdee + 500;
        break;
      case 'muscle_gain':
        targetCalories = tdee + 300;
        break;
      default:
        targetCalories = tdee;
    }

    const protein = (targetCalories * 0.225) / 4;
    const carbs = (targetCalories * 0.55) / 4;
    const fats = (targetCalories * 0.225) / 9;

    setFormData({
      ...formData,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target_calories: Math.round(targetCalories),
      target_protein: Math.round(protein),
      target_carbs: Math.round(carbs),
      target_fats: Math.round(fats),
      initial_weight: weight,
    });
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData(client);
    setShowAddDialog(true);
  };

  const handleCreatePlan = (client) => {
    navigate(`${createPageUrl("MealPlanner")}?client=${client.id}`);
  };

  const handleViewPlans = (client) => {
    const clientPlans = mealPlans.filter(p => p.client_id === client.id);
    setViewingClientPlans({ client, plans: clientPlans });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">Manage your client roster</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                onClick={() => {
                  setSelectedClient(null);
                  setFormData({ status: 'active', join_date: format(new Date(), 'yyyy-MM-dd') });
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedClient ? 'Edit Client' : 'Add New Client'}
                </DialogTitle>
                <DialogDescription>
                  {selectedClient ? 'Update client information and health data' : 'Add a new client with their health information and goals'}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="health">Health Data</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Join Date</Label>
                      <Input
                        type="date"
                        value={formData.join_date || ''}
                        onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status || 'active'}
                        onValueChange={(value) => setFormData({...formData, status: value})}
                      >
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
                  </div>
                </TabsContent>

                <TabsContent value="health" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={formData.age || ''}
                        onChange={(e) => setFormData({...formData, age: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender || ''}
                        onValueChange={(value) => setFormData({...formData, gender: value})}
                      >
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
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        value={formData.height || ''}
                        onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.weight || ''}
                        onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.target_weight || ''}
                        onChange={(e) => setFormData({...formData, target_weight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Activity Level</Label>
                      <Select
                        value={formData.activity_level || ''}
                        onValueChange={(value) => setFormData({...formData, activity_level: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentary</SelectItem>
                          <SelectItem value="lightly_active">Lightly Active</SelectItem>
                          <SelectItem value="moderately_active">Moderately Active</SelectItem>
                          <SelectItem value="very_active">Very Active</SelectItem>
                          <SelectItem value="extremely_active">Extremely Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Goal</Label>
                      <Select
                        value={formData.goal || ''}
                        onValueChange={(value) => setFormData({...formData, goal: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight_loss">Weight Loss</SelectItem>
                          <SelectItem value="weight_gain">Weight Gain</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                          <SelectItem value="health_improvement">Health Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={calculateMacros}
                    className="w-full"
                    variant="outline"
                  >
                    Calculate Macros
                  </Button>

                  {formData.target_calories && (
                    <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Calories</p>
                        <p className="text-lg font-bold">{formData.target_calories}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Protein</p>
                        <p className="text-lg font-bold">{formData.target_protein}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Carbs</p>
                        <p className="text-lg font-bold">{formData.target_carbs}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Fats</p>
                        <p className="text-lg font-bold">{formData.target_fats}g</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Food Preference</Label>
                      <Select
                        value={formData.food_preference || ''}
                        onValueChange={(value) => setFormData({...formData, food_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Regional Preference</Label>
                      <Select
                        value={formData.regional_preference || ''}
                        onValueChange={(value) => setFormData({...formData, regional_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="north">North Indian</SelectItem>
                          <SelectItem value="south">South Indian</SelectItem>
                          <SelectItem value="west">West Indian</SelectItem>
                          <SelectItem value="east">East Indian</SelectItem>
                          <SelectItem value="all">All Regions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={5}
                      placeholder="Any important notes about the client..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500"
              >
                {saveMutation.isPending ? 'Saving...' : selectedClient ? 'Update Client' : 'Add Client'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const clientPlans = mealPlans.filter(p => p.client_id === client.id);
            const activePlan = clientPlans.find(p => p.active);
            
            return (
              <Card key={client.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {client.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.full_name}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge className={
                            client.status === 'active' ? 'bg-green-100 text-green-700' :
                            client.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {client.status}
                          </Badge>
                          {clientPlans.length > 0 && (
                            <Badge className="bg-purple-100 text-purple-700">
                              📅 {clientPlans.length} {clientPlans.length === 1 ? 'Plan' : 'Plans'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  
                  {/* Show active meal plan info - CLICKABLE */}
                  {activePlan && (
                    <div 
                      className="p-3 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
                      onClick={() => handleViewPlans(client)}
                    >
                      <p className="text-xs text-purple-600 font-medium mb-1">Active Meal Plan (Click to view)</p>
                      <p className="text-sm font-semibold text-purple-900">{activePlan.name}</p>
                      <p className="text-xs text-purple-600">{activePlan.duration} days • {activePlan.target_calories} kcal</p>
                    </div>
                  )}
                  
                  {client.weight && client.target_weight && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Current</p>
                        <p className="text-lg font-bold text-gray-900">{client.weight} kg</p>
                      </div>
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-xs text-gray-600">Target</p>
                        <p className="text-lg font-bold text-gray-900">{client.target_weight} kg</p>
                      </div>
                    </div>
                  )}

                  {client.goal && (
                    <Badge variant="outline" className="capitalize">
                      {client.goal.replace('_', ' ')}
                    </Badge>
                  )}

                  {/* THREE BUTTONS: Message, View Plans, New Plan */}
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    <Link to={`${createPageUrl("Communication")}?client=${client.id}`}>
                      <Button variant="outline" size="sm" className="w-full" title="Message Client">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleViewPlans(client)}
                      title="View All Plans"
                      disabled={clientPlans.length === 0}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleCreatePlan(client)}
                      title="Create New Plan"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clients Found</h3>
              <p className="text-gray-600">Add your first client to get started</p>
            </CardContent>
          </Card>
        )}

        {/* View Client Plans Dialog */}
        <Dialog open={!!viewingClientPlans} onOpenChange={() => setViewingClientPlans(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {viewingClientPlans?.client?.full_name}'s Meal Plans
              </DialogTitle>
              <DialogDescription>
                View all meal plans created for this client. Click "View Details" to see the full plan.
              </DialogDescription>
            </DialogHeader>
            {viewingClientPlans && (
              <div className="space-y-4 mt-4">
                {viewingClientPlans.plans.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No meal plans created yet</p>
                    <Button onClick={() => {
                      setViewingClientPlans(null);
                      handleCreatePlan(viewingClientPlans.client);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Plan
                    </Button>
                  </div>
                ) : (
                  <>
                    {viewingClientPlans.plans.map((plan) => (
                      <Card key={plan.id} className="border-2 hover:border-orange-300 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{plan.name}</h3>
                                {plan.active && (
                                  <Badge className="bg-green-500 text-white">Active</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="outline">{plan.duration} Days</Badge>
                                <Badge variant="outline" className="capitalize">{plan.food_preference}</Badge>
                                <Badge variant="outline">{plan.target_calories} kcal</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                Created: {format(new Date(plan.created_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingClientPlans(null);
                                navigate(`${createPageUrl("MealPlanner")}?viewPlan=${plan.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                      onClick={() => {
                        setViewingClientPlans(null);
                        handleCreatePlan(viewingClientPlans.client);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Plan for {viewingClientPlans.client.full_name}
                    </Button>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
