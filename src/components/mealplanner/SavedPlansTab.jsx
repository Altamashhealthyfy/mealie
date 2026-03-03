import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, Eye, Edit, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";

export default function SavedPlansTab({
  mealPlans, clients, deletePlanMutation,
  onViewPlan, onEditPlan, onDeletePlan, onBrowseTemplates,
  coachPlan
}) {
  if (mealPlans.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plans Created Yet</h3>
          <p className="text-gray-600 mb-4">Create a new plan or clone a template to get started</p>
          <Button onClick={onBrowseTemplates} className="bg-gradient-to-r from-green-500 to-emerald-500">
            <Star className="w-4 h-4 mr-2" />
            Browse Templates (FREE)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {mealPlans.map((plan) => {
          const planClient = clients.find(c => c.id === plan.client_id);
          return (
            <Card key={plan.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-lg sm:text-xl md:text-2xl break-words">{plan.name}</CardTitle>
                      {plan.active && (
                        <Badge className="bg-green-500 text-white flex-shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />Active
                        </Badge>
                      )}
                    </div>
                    {planClient ? (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">{planClient.full_name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{planClient.full_name}</p>
                          <p className="text-xs text-gray-600">{planClient.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600 mb-3">⚠️ Client not found</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-orange-100 text-orange-700">{plan.duration} Days</Badge>
                      <Badge className="bg-blue-100 text-blue-700 capitalize">{plan.food_preference}</Badge>
                      <Badge className="bg-green-100 text-green-700 capitalize">{plan.regional_preference}</Badge>
                      <Badge className="bg-gray-100 text-gray-700">{plan.target_calories} kcal</Badge>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs sm:text-sm text-gray-600">Created</p>
                    <p className="text-xs sm:text-sm font-semibold">{format(new Date(plan.created_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => onViewPlan(plan)}>
                    <Eye className="w-4 h-4 mr-2" />View Details
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={() => onEditPlan(plan, planClient)}>
                    <Edit className="w-4 h-4 mr-2" />Edit Plan
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:bg-red-50"
                    onClick={() => onDeletePlan(plan)} disabled={deletePlanMutation.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}