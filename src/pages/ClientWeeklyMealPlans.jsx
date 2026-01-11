import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Target, Utensils, Star, MessageSquare, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ClientWeeklyMealPlans() {
  const queryClient = useQueryClient();
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, meal: null, plan: null });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [completed, setCompleted] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['myWeeklyMealPlans', clientProfile?.id],
    queryFn: async () => {
      const plans = await base44.entities.WeeklyMealPlan.filter({ 
        client_id: clientProfile?.id,
        status: 'active'
      });
      return plans.sort((a, b) => new Date(b.week_start_date) - new Date(a.week_start_date));
    },
    enabled: !!clientProfile?.id,
    initialData: []
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ planId, feedback }) => {
      const plan = mealPlans.find(p => p.id === planId);
      const existingFeedback = plan.client_feedback || [];
      
      await base44.entities.WeeklyMealPlan.update(planId, {
        client_feedback: [...existingFeedback, feedback]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myWeeklyMealPlans']);
      toast.success('Feedback submitted!');
      setFeedbackDialog({ open: false, meal: null, plan: null });
      setRating(0);
      setComment('');
      setCompleted(false);
    }
  });

  const handleSubmitFeedback = () => {
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    const feedback = {
      date: new Date().toISOString(),
      day: feedbackDialog.meal.day,
      meal_type: feedbackDialog.meal.meal_type,
      rating,
      comment,
      completed
    };

    submitFeedbackMutation.mutate({
      planId: feedbackDialog.plan.id,
      feedback
    });
  };

  const getMealFeedback = (plan, day, mealType) => {
    return plan.client_feedback?.find(f => f.day === day && f.meal_type === mealType);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMealsForDay = (plan, day) => {
    return plan.meals?.filter(m => m.day === day) || [];
  };

  const calculateDayTotals = (plan, day) => {
    const meals = getMealsForDay(plan, day);
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  if (!clientProfile) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Meal Plans</h1>
          <p className="text-gray-600">View your weekly meal plans and provide feedback</p>
        </div>

        {mealPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No active meal plans</p>
              <p className="text-sm text-gray-500 mt-2">Your dietitian will create a plan for you</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {mealPlans.map(plan => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        <CardTitle>
                          Week of {formatDate(plan.week_start_date)}
                        </CardTitle>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Goals */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Daily Goals</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600">Calories</p>
                        <p className="font-semibold">{plan.daily_calorie_goal}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600">Protein</p>
                        <p className="font-semibold">{plan.daily_protein_goal}g</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600">Carbs</p>
                        <p className="font-semibold">{plan.daily_carbs_goal}g</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-600">Fats</p>
                        <p className="font-semibold">{plan.daily_fats_goal}g</p>
                      </div>
                    </div>
                  </div>

                  {plan.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-sm mb-1">Note from your dietitian:</p>
                      <p className="text-sm text-gray-700">{plan.notes}</p>
                    </div>
                  )}

                  {/* Daily Meals */}
                  <div className="grid gap-3">
                    {DAYS.map(day => {
                      const meals = getMealsForDay(plan, day);
                      const totals = calculateDayTotals(plan, day);

                      return (
                        <Card key={day} className="border-l-4 border-l-orange-500">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-base capitalize">{day}</CardTitle>
                              <div className="flex gap-1 text-xs">
                                <Badge variant="outline">{totals.calories} cal</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {meals.length === 0 ? (
                              <p className="text-sm text-gray-500">No meals planned</p>
                            ) : (
                              <div className="space-y-2">
                                {meals.map((meal, idx) => {
                                  const feedback = getMealFeedback(plan, day, meal.meal_type);

                                  return (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                          <Utensils className="w-4 h-4 text-gray-500 mt-1" />
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between mb-1">
                                              <div>
                                                <p className="font-medium text-sm">{meal.recipe_name}</p>
                                                <Badge variant="outline" className="text-xs capitalize mt-1">
                                                  {meal.meal_type}
                                                </Badge>
                                              </div>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">
                                              {meal.calories} cal | {meal.protein}g P | {meal.carbs}g C | {meal.fats}g F
                                            </p>
                                            <p className="text-xs text-gray-600">{meal.servings} serving(s)</p>
                                            
                                            {feedback && (
                                              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                                <div className="flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                                  <span className="text-xs text-green-700 font-medium">
                                                    Feedback submitted
                                                  </span>
                                                  <span className="text-xs">
                                                    {'⭐'.repeat(feedback.rating)}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {!feedback && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setFeedbackDialog({ open: true, meal: { ...meal, day }, plan })}
                                          >
                                            <MessageSquare className="w-3 h-3 mr-1" />
                                            Feedback
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialog.open} onOpenChange={(open) => {
          if (!open) {
            setFeedbackDialog({ open: false, meal: null, plan: null });
            setRating(0);
            setComment('');
            setCompleted(false);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Meal Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {feedbackDialog.meal && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="font-medium">{feedbackDialog.meal.recipe_name}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {feedbackDialog.meal.day} - {feedbackDialog.meal.meal_type}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="text-2xl"
                    >
                      {star <= rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Comments (optional)</label>
                <Textarea
                  placeholder="How was this meal? Any suggestions?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-sm">I completed this meal</label>
              </div>

              <Button
                onClick={handleSubmitFeedback}
                className="w-full"
                disabled={rating === 0 || submitFeedbackMutation.isPending}
              >
                Submit Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}