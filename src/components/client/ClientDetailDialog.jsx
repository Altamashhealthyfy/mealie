import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit, Send, FileText, Plus, Stethoscope, UserPlus, KeyRound, Sparkles, TrendingUp, Calculator, ChefHat, Zap, Activity
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClientMedicalProgress from "@/components/client/ClientMedicalProgress";

export default function ClientDetailDialog({
  client,
  onClose,
  onEdit,
  onEmail,
  onViewPlans,
  onCreatePlan,
  onAssignCoach,
  onAssignTeam,
  onCreatePassword,
  onWelcomeMessage,
  onDelete,
  onQuickActions,
  onProPlan,
  userType,
  teamMembers,
  healthCoaches,
  isDeleting,
}) {
  if (!client) return null;

  return (
    <Dialog open={!!client} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {client.profile_photo_url ? (
              <img src={client.profile_photo_url} alt={client.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-orange-500" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{client.full_name?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
            {client.full_name}
          </DialogTitle>
          <DialogDescription>Detailed information and actions for {client.full_name}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Profile
              </TabsTrigger>
              <TabsTrigger value="medical" className="flex items-center gap-2">
                <Activity className="w-4 h-4" /> Progress & Medical
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-gray-600" /> Basic Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Email:</span> {client.email}</p>
                {client.phone && <p><span className="font-semibold">Phone:</span> {client.phone}</p>}
                <p><span className="font-semibold">Status:</span> <Badge>{client.status}</Badge></p>
                <p><span className="font-semibold">Joined:</span> {client.join_date ? format(new Date(client.join_date), 'MMM d, yyyy') : 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-gray-600" /> Health Data</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Age:</span> {client.age || 'N/A'}</p>
                <p><span className="font-semibold">Gender:</span> {client.gender || 'N/A'}</p>
                <p><span className="font-semibold">Height:</span> {client.height ? `${client.height} cm` : 'N/A'}</p>
                <p><span className="font-semibold">Weight:</span> {client.weight ? `${client.weight} kg` : 'N/A'}</p>
                <p><span className="font-semibold">Target Weight:</span> {client.target_weight ? `${client.target_weight} kg` : 'N/A'}</p>
                <p><span className="font-semibold">Goal:</span> <Badge className="capitalize">{client.goal?.replace('_', ' ')}</Badge></p>
              </CardContent>
            </Card>

            {client.target_calories && (
              <Card className="col-span-2">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calculator className="w-5 h-5 text-gray-600" /> Macros</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div><p className="text-xs text-gray-600">Calories</p><p className="text-lg font-bold">{client.target_calories}</p></div>
                    <div><p className="text-xs text-gray-600">Protein</p><p className="text-lg font-bold">{client.target_protein}g</p></div>
                    <div><p className="text-xs text-gray-600">Carbs</p><p className="text-lg font-bold">{client.target_carbs}g</p></div>
                    <div><p className="text-xs text-gray-600">Fats</p><p className="text-lg font-bold">{client.target_fats}g</p></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="col-span-2">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ChefHat className="w-5 h-5 text-gray-600" /> Preferences & Notes</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Food Preference:</span> {client.food_preference?.replace('_', ' ') || 'N/A'}</p>
                <p><span className="font-semibold">Regional Preference:</span> {client.regional_preference?.replace('_', ' ') || 'N/A'}</p>
                {client.notes && (
                  <div>
                    <p className="font-semibold mb-1">Notes:</p>
                    <Textarea value={client.notes} readOnly rows={4} className="bg-gray-50 resize-none" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
            </TabsContent>

            <TabsContent value="medical" className="mt-4">
              <ClientMedicalProgress client={client} />
            </TabsContent>
          </Tabs>

          {/* Quick Actions CTA */}
          <Button
            onClick={() => onQuickActions(client)}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold"
          >
            <Zap className="w-4 h-4 mr-2" />
            Quick Actions (Assign Meal Plan · MPESS · Call · Notify)
          </Button>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button variant="outline" onClick={() => { onClose(); onEdit(client); }}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
            <Button variant="outline" onClick={() => { onClose(); onEmail(client); }} className="text-blue-600 hover:bg-blue-50"><Send className="w-4 h-4 mr-2" /> Email</Button>
            <Button variant="outline" onClick={() => { onClose(); onViewPlans(client); }}><FileText className="w-4 h-4 mr-2" /> Plans</Button>
            <Button variant="outline" onClick={() => { onClose(); onCreatePlan(client); }}><Plus className="w-4 h-4 mr-2" /> Basic Plan</Button>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={() => { onClose(); onProPlan(client); }}><Stethoscope className="w-4 h-4 mr-2" /> Pro Plan</Button>
          </div>

          {userType === 'super_admin' && healthCoaches?.length > 0 && (
            <Button variant="outline" className="w-full text-green-600 hover:bg-green-50" onClick={() => onAssignCoach(client)}>
              <UserPlus className="w-4 h-4 mr-2" /> Assign to Health Coach
            </Button>
          )}

          {(userType === 'super_admin' || userType === 'student_coach') && teamMembers?.length > 0 && (
            <Button variant="outline" className="w-full text-purple-600 hover:bg-purple-50" onClick={() => onAssignTeam(client)}>
              <UserPlus className="w-4 h-4 mr-2" />
              {client.assigned_to ? 'Reassign to Team Member' : 'Assign to Team Member'}
            </Button>
          )}

          <Button variant="outline" className="w-full text-green-600 hover:bg-green-50" onClick={() => onCreatePassword(client)}>
            <KeyRound className="w-4 h-4 mr-2" /> Create Login Password
          </Button>

          <Button variant="outline" className="w-full text-orange-600 hover:bg-orange-50" onClick={() => onWelcomeMessage(client)}>
            <Sparkles className="w-4 h-4 mr-2" /> Send Welcome Message
          </Button>

          <Button variant="destructive" onClick={() => onDelete(client)} disabled={isDeleting} className="w-full">
            {isDeleting ? 'Deleting...' : 'Delete Client'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}