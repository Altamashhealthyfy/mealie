import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WorkoutPlanBuilder({ clientId, clientEmail, clientName, dietitianEmail }) {
  const [open, setOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [duration, setDuration] = useState("4");
  const [frequency, setFrequency] = useState("3");
  const [workoutType, setWorkoutType] = useState("mixed");
  const [workouts, setWorkouts] = useState([]);
  const [currentExercise, setCurrentExercise] = useState({
    day: 1,
    day_name: "Day 1",
    exercise_name: "",
    description: "",
    sets: 3,
    reps: "10-12",
    rest_seconds: 60
  });

  const queryClient = useQueryClient();

  const createPlanMutation = useMutation({
    mutationFn: async (planData) => {
      return await base44.entities.WorkoutPlan.create(planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutPlans'] });
      resetForm();
      setOpen(false);
      alert("✅ Workout plan created and assigned to client!");
    },
    onError: (error) => {
      alert("❌ Failed to create plan: " + error.message);
    }
  });

  const resetForm = () => {
    setPlanName("");
    setDescription("");
    setDifficulty("beginner");
    setDuration("4");
    setFrequency("3");
    setWorkoutType("mixed");
    setWorkouts([]);
    setCurrentExercise({
      day: 1,
      day_name: "Day 1",
      exercise_name: "",
      description: "",
      sets: 3,
      reps: "10-12",
      rest_seconds: 60
    });
  };

  const addExercise = () => {
    if (!currentExercise.exercise_name.trim()) {
      alert("Please enter exercise name");
      return;
    }
    setWorkouts([...workouts, { ...currentExercise }]);
    setCurrentExercise({
      day: currentExercise.day,
      day_name: currentExercise.day_name,
      exercise_name: "",
      description: "",
      sets: 3,
      reps: "10-12",
      rest_seconds: 60
    });
  };

  const removeExercise = (index) => {
    setWorkouts(workouts.filter((_, i) => i !== index));
  };

  const handleCreatePlan = () => {
    if (!planName.trim() || workouts.length === 0) {
      alert("Please add a plan name and at least one exercise");
      return;
    }

    createPlanMutation.mutate({
      client_id: clientId,
      client_email: clientEmail,
      dietitian_email: dietitianEmail,
      plan_name: planName,
      description,
      difficulty_level: difficulty,
      duration_weeks: parseInt(duration),
      frequency_per_week: parseInt(frequency),
      workout_type: workoutType,
      workouts,
      assigned_date: new Date().toISOString(),
      is_active: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 gap-2">
          <Dumbbell className="w-4 h-4" />
          Create Workout Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-green-600" />
            Create Workout Plan for {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Plan Name</label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., Beginner Strength Training"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the goals and benefits of this plan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Workout Type</label>
                  <Select value={workoutType} onValueChange={setWorkoutType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="flexibility">Flexibility</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Duration (Weeks)</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Days/Week</label>
                  <Input
                    type="number"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    min="1"
                    max="7"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Exercises</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Exercise Name</label>
                <Input
                  value={currentExercise.exercise_name}
                  onChange={(e) => setCurrentExercise({ ...currentExercise, exercise_name: e.target.value })}
                  placeholder="e.g., Push-ups, Squats"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Sets</label>
                  <Input
                    type="number"
                    value={currentExercise.sets}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Reps</label>
                  <Input
                    value={currentExercise.reps}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, reps: e.target.value })}
                    placeholder="e.g., 10-12"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Rest (sec)</label>
                  <Input
                    type="number"
                    value={currentExercise.rest_seconds}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, rest_seconds: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Button onClick={addExercise} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Add Exercise
              </Button>
            </CardContent>
          </Card>

          {/* Added Exercises List */}
          {workouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exercises ({workouts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workouts.map((exercise, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{exercise.exercise_name}</p>
                        <p className="text-xs text-gray-600">
                          {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_seconds}s rest
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(idx)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleCreatePlan}
            disabled={createPlanMutation.isPending || workouts.length === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {createPlanMutation.isPending ? 'Creating...' : 'Create & Assign Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}