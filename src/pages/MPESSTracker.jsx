import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Brain, Activity, Smile, Users, Sparkles, Save, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MPESSTracker() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [trackingData, setTrackingData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    mind_practices: {},
    physical_practices: {},
    emotional_practices: {},
    social_practices: {},
    spiritual_practices: {},
    overall_rating: 3,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: todayTracking } = useQuery({
    queryKey: ['todayTracking', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const records = await base44.entities.MPESSTracker.filter({
        date: format(selectedDate, 'yyyy-MM-dd'),
        created_by: user?.email,
      });
      return records[0] || null;
    },
    enabled: !!user,
  });

  const { data: recentTracking } = useQuery({
    queryKey: ['recentTracking'],
    queryFn: () => base44.entities.MPESSTracker.list('-created_date', 30),
    enabled: !!user,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (todayTracking) {
        return base44.entities.MPESSTracker.update(todayTracking.id, data);
      }
      return base44.entities.MPESSTracker.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todayTracking']);
      queryClient.invalidateQueries(['recentTracking']);
      alert('Progress saved successfully!');
    },
  });

  React.useEffect(() => {
    if (todayTracking) {
      setTrackingData(todayTracking);
    }
  }, [todayTracking]);

  const handleSave = () => {
    saveMutation.mutate({
      ...trackingData,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const updatePractice = (category, field, value) => {
    setTrackingData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      }
    }));
  };

  const mpessCategories = [
    {
      key: 'mind',
      title: 'Mind - Mental Wellness',
      icon: Brain,
      color: 'from-blue-500 to-cyan-500',
      practices: [
        { id: 'affirmations_completed', label: 'Completed 5-10 affirmations' },
        { id: 'stress_relief_done', label: 'Practiced stress-relief technique' },
        { id: 'sleep_guidance_followed', label: 'Followed sleep guidance' },
      ],
    },
    {
      key: 'physical',
      title: 'Physical - Body Wellness',
      icon: Activity,
      color: 'from-green-500 to-emerald-500',
      practices: [
        { id: 'movement_done', label: 'Daily movement/exercise' },
        { id: 'posture_awareness', label: 'Maintained posture awareness' },
        { id: 'hydration_met', label: 'Met hydration goal' },
      ],
    },
    {
      key: 'emotional',
      title: 'Emotional - Heart Wellness',
      icon: Smile,
      color: 'from-yellow-500 to-orange-500',
      practices: [
        { id: 'journaling_done', label: 'Completed journaling' },
        { id: 'emotion_release_done', label: 'Released emotions safely' },
        { id: 'breathwork_done', label: 'Practiced breathwork' },
      ],
    },
    {
      key: 'social',
      title: 'Social - Connection',
      icon: Users,
      color: 'from-pink-500 to-rose-500',
      practices: [
        { id: 'bonding_activity_done', label: 'Bonding activity completed' },
        { id: 'connection_made', label: 'Made meaningful connection' },
      ],
    },
    {
      key: 'spiritual',
      title: 'Spiritual - Soul Wellness',
      icon: Sparkles,
      color: 'from-purple-500 to-indigo-500',
      practices: [
        { id: 'breathwork_done', label: 'Breathing exercises' },
        { id: 'meditation_done', label: 'Meditation practice' },
        { id: 'gratitude_journaling_done', label: 'Gratitude journaling' },
      ],
    },
  ];

  const getCompletionRate = () => {
    let total = 0;
    let completed = 0;
    
    mpessCategories.forEach(cat => {
      const practices = trackingData[`${cat.key}_practices`] || {};
      cat.practices.forEach(practice => {
        total++;
        if (practices[practice.id]) completed++;
      });
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">MPESS Tracker</h1>
            <p className="text-gray-600">Track your holistic wellness journey</p>
          </div>
          <Heart className="w-10 h-10 text-pink-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar and Stats */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Today's Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    {getCompletionRate()}%
                  </div>
                  <p className="text-gray-600 text-sm">Completion Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  You've tracked {recentTracking.length} days in the last 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* MPESS Categories */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="mind" className="space-y-6">
              <TabsList className="grid grid-cols-5 bg-white/80 backdrop-blur shadow-lg">
                {mpessCategories.map(cat => (
                  <TabsTrigger
                    key={cat.key}
                    value={cat.key}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:text-white capitalize"
                    style={{
                      '--tw-gradient-from': cat.color.split(' ')[0].replace('from-', ''),
                      '--tw-gradient-to': cat.color.split(' ')[1].replace('to-', ''),
                    }}
                  >
                    <cat.icon className="w-4 h-4 mr-2" />
                    {cat.key}
                  </TabsTrigger>
                ))}
              </TabsList>

              {mpessCategories.map(cat => (
                <TabsContent key={cat.key} value={cat.key}>
                  <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg`}>
                          <cat.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">{cat.title}</CardTitle>
                          <CardDescription>Track your daily practices</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Checklist */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900 mb-3">Daily Practices</h3>
                        {cat.practices.map(practice => (
                          <div key={practice.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <Checkbox
                              id={`${cat.key}-${practice.id}`}
                              checked={trackingData[`${cat.key}_practices`]?.[practice.id] || false}
                              onCheckedChange={(checked) => 
                                updatePractice(`${cat.key}_practices`, practice.id, checked)
                              }
                            />
                            <Label
                              htmlFor={`${cat.key}-${practice.id}`}
                              className="flex-1 cursor-pointer text-gray-700"
                            >
                              {practice.label}
                            </Label>
                          </div>
                        ))}
                      </div>

                      {/* Additional Fields */}
                      {cat.key === 'physical' && (
                        <div className="space-y-2">
                          <Label>Water Intake (liters)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={trackingData.physical_practices?.water_intake || ''}
                            onChange={(e) => updatePractice('physical_practices', 'water_intake', parseFloat(e.target.value))}
                            placeholder="e.g., 2.5"
                          />
                        </div>
                      )}

                      {cat.key === 'emotional' && (
                        <div className="space-y-2">
                          <Label>Today's Mood</Label>
                          <Select
                            value={trackingData.emotional_practices?.mood || ''}
                            onValueChange={(value) => updatePractice('emotional_practices', 'mood', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="How are you feeling?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="great">😊 Great</SelectItem>
                              <SelectItem value="good">🙂 Good</SelectItem>
                              <SelectItem value="okay">😐 Okay</SelectItem>
                              <SelectItem value="low">😔 Low</SelectItem>
                              <SelectItem value="stressed">😰 Stressed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={trackingData[`${cat.key}_practices`]?.notes || ''}
                          onChange={(e) => updatePractice(`${cat.key}_practices`, 'notes', e.target.value)}
                          placeholder={`Any additional notes about your ${cat.key} practices today...`}
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            {/* Overall Rating and Save */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50 mt-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold mb-2 block">Overall Day Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <Button
                          key={rating}
                          variant={trackingData.overall_rating === rating ? "default" : "outline"}
                          className={`flex-1 h-12 ${
                            trackingData.overall_rating === rating 
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                              : ''
                          }`}
                          onClick={() => setTrackingData({...trackingData, overall_rating: rating})}
                        >
                          {rating}⭐
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Today\'s Progress'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}