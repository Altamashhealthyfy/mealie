import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function MealPhotoAnalysis() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    meal_type: "breakfast",
    photo: null,
    notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date')
  });

  const { data: selectedClientData } = useQuery({
    queryKey: ['client', selectedClient],
    queryFn: () => base44.entities.Client.filter({ id: selectedClient }).then(res => res[0]),
    enabled: !!selectedClient
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ['foodLogs', selectedClient, selectedDate],
    queryFn: () => selectedClient && selectedDate
      ? base44.entities.FoodLog.filter({ 
          client_id: selectedClient,
          date: selectedDate
        })
      : Promise.resolve([]),
    enabled: !!selectedClient && !!selectedDate
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data) => {
      setAnalyzing(true);
      
      // Upload photo
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.photo });
      
      // AI Analysis
      const analysisPrompt = `You are a nutrition expert analyzing a meal photo for a health coaching client.

Client Profile:
- Goal: ${selectedClientData?.goal || 'not specified'}
- Food Preference: ${selectedClientData?.food_preference || 'not specified'}
- Target Calories: ${selectedClientData?.target_calories || 'not specified'} kcal/day

Analyze this ${data.meal_type} photo and provide:
1. Identify all food items visible
2. Estimate portion sizes
3. Calculate approximate nutritional content (calories, protein, carbs, fats)
4. Assess meal quality based on the client's goal
5. Provide specific feedback and suggestions

Return in this JSON format:
{
  "items_identified": ["item 1", "item 2"],
  "portion_estimate": "Description of portions",
  "nutritional_estimate": {
    "calories": 500,
    "protein": 25,
    "carbs": 60,
    "fats": 15
  },
  "quality_score": 8,
  "feedback": "Detailed feedback paragraph",
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "alignment_with_goal": "How well this aligns with their goal"
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            items_identified: { type: "array", items: { type: "string" } },
            portion_estimate: { type: "string" },
            nutritional_estimate: {
              type: "object",
              properties: {
                calories: { type: "number" },
                protein: { type: "number" },
                carbs: { type: "number" },
                fats: { type: "number" }
              }
            },
            quality_score: { type: "number" },
            feedback: { type: "string" },
            suggestions: { type: "array", items: { type: "string" } },
            alignment_with_goal: { type: "string" }
          }
        }
      });

      // Create food log with analysis
      return await base44.entities.FoodLog.create({
        client_id: selectedClient,
        date: selectedDate,
        meal_type: data.meal_type,
        food_items: analysis.items_identified.join(", "),
        photo_url: file_url,
        calories: analysis.nutritional_estimate.calories,
        protein: analysis.nutritional_estimate.protein,
        carbs: analysis.nutritional_estimate.carbs,
        fats: analysis.nutritional_estimate.fats,
        notes: `${data.notes}\n\nAI Analysis:\n${analysis.feedback}\n\nPortion: ${analysis.portion_estimate}\nQuality Score: ${analysis.quality_score}/10\nGoal Alignment: ${analysis.alignment_with_goal}\n\nSuggestions:\n${analysis.suggestions.map(s => `• ${s}`).join('\n')}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['foodLogs']);
      setDialogOpen(false);
      setAnalyzing(false);
      setFormData({
        meal_type: "breakfast",
        photo: null,
        notes: ""
      });
    }
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
    }
  };

  const handleSubmit = () => {
    if (!formData.photo || !selectedClient) return;
    analyzeMutation.mutate(formData);
  };

  const calculateDailyTotals = () => {
    return foodLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  const totals = calculateDailyTotals();
  const targetCalories = selectedClientData?.target_calories || 2000;
  const calorieProgress = (totals.calories / targetCalories) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Meal Photo Analysis
          </h1>
          <p className="text-gray-600 mt-1">AI-powered nutritional analysis from meal photos</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-600 to-red-600" disabled={!selectedClient}>
              <Camera className="w-4 h-4 mr-2" />
              Analyze Meal Photo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload & Analyze Meal Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Meal Type</Label>
                <Select value={formData.meal_type} onValueChange={(v) => setFormData({...formData, meal_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Upload Photo</Label>
                <Input 
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
                {formData.photo && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {formData.photo.name}</p>
                )}
              </div>

              <div>
                <Label>Additional Notes (Optional)</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any context about the meal..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={!formData.photo || analyzing}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Photo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Client</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {selectedClient && selectedClientData && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle>Daily Summary - {new Date(selectedDate).toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Calories</p>
                <p className="text-2xl font-bold">{totals.calories}</p>
                <p className="text-xs text-gray-500">Target: {targetCalories}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${calorieProgress > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Protein</p>
                <p className="text-2xl font-bold">{totals.protein}g</p>
                <p className="text-xs text-gray-500">Target: {selectedClientData.target_protein || 0}g</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Carbs</p>
                <p className="text-2xl font-bold">{totals.carbs}g</p>
                <p className="text-xs text-gray-500">Target: {selectedClientData.target_carbs || 0}g</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fats</p>
                <p className="text-2xl font-bold">{totals.fats}g</p>
                <p className="text-xs text-gray-500">Target: {selectedClientData.target_fats || 0}g</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClient && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Analyzed Meals</h2>
          {foodLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Camera className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No meals logged for this date. Start by uploading a meal photo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {foodLogs.map(log => (
                <Card key={log.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{log.meal_type}</span>
                      <Badge>{log.calories} kcal</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {log.photo_url && (
                      <img 
                        src={log.photo_url} 
                        alt={log.meal_type}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Items:</p>
                      <p className="text-sm text-gray-700">{log.food_items}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs text-gray-600">Protein</p>
                        <p className="font-bold">{log.protein}g</p>
                      </div>
                      <div className="bg-orange-50 rounded p-2">
                        <p className="text-xs text-gray-600">Carbs</p>
                        <p className="font-bold">{log.carbs}g</p>
                      </div>
                      <div className="bg-yellow-50 rounded p-2">
                        <p className="text-xs text-gray-600">Fats</p>
                        <p className="font-bold">{log.fats}g</p>
                      </div>
                    </div>

                    {log.notes && (
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <p className="whitespace-pre-wrap text-gray-700">{log.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}