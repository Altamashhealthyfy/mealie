import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, AlertCircle, Loader2, CheckCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientMPESSAssessment() {
  const [formData, setFormData] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    rootCause: true,
    physical: false,
    emotional: false,
    social: false,
    spiritual: false,
    bodyComposition: false,
    willingness: false
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Auth error:', error);
        return null;
      }
    },
    retry: false,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
        return profiles[0] || null;
      } catch (error) {
        console.error('Profile error:', error);
        return null;
      }
    },
    enabled: !!user?.email,
  });

  const { data: assessmentHistory } = useQuery({
    queryKey: ['assessmentHistory', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const trackers = await base44.entities.MPESSTracker.filter({ client_id: user.email });
        return trackers.sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));
      } catch (error) {
        console.error('Assessment history error:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  React.useEffect(() => {
    if (userProfile) {
      setFormData({
        mpess_root_cause: userProfile.mpess_root_cause || "",
        mpess_physical: userProfile.mpess_physical || {},
        mpess_emotional: userProfile.mpess_emotional || {},
        mpess_social: userProfile.mpess_social || {},
        mpess_spiritual: userProfile.mpess_spiritual || "",
        mpess_body_composition: userProfile.mpess_body_composition || {},
        mpess_willingness: userProfile.mpess_willingness || {}
      });
    }
  }, [userProfile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Save to UserProfile
      let profileResult;
      if (userProfile?.id) {
        profileResult = await base44.entities.UserProfile.update(userProfile.id, {
          ...data,
          mpess_last_submission: today
        });
      } else {
        profileResult = await base44.entities.UserProfile.create({
          ...data,
          created_by: user.email,
          mpess_last_submission: today
        });
      }
      
      // Also create a tracker record for monthly tracking
      await base44.entities.MPESSTracker.create({
        client_id: user.email,
        submission_date: today,
        submission_data: data
      });
      
      return profileResult;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['userProfile'] });
       queryClient.invalidateQueries({ queryKey: ['assessmentHistory'] });
       setSubmitSuccess(true);
       setShowForm(false);
     },
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRootCauseChange = (value) => {
    setFormData({ ...formData, mpess_root_cause: value });
  };

  const handlePhysicalChange = (key) => {
    const current = formData.mpess_physical || {};
    setFormData({
      ...formData,
      mpess_physical: { ...current, [key]: !current[key] }
    });
  };

  const handleEmotionalChange = (key, column) => {
    const current = formData.mpess_emotional || {};
    setFormData({
      ...formData,
      mpess_emotional: { ...current, [key]: column }
    });
  };

  const handleSocialChange = (key, column) => {
    const current = formData.mpess_social || {};
    setFormData({
      ...formData,
      mpess_social: { ...current, [key]: column }
    });
  };

  const handleSpiritualChange = (value) => {
    setFormData({ ...formData, mpess_spiritual: value });
  };

  const handleBodyCompositionChange = (key) => {
    const current = formData.mpess_body_composition || {};
    setFormData({
      ...formData,
      mpess_body_composition: { ...current, [key]: !current[key] }
    });
  };

  const handleWillingnessChange = (key, column) => {
    const current = formData.mpess_willingness || {};
    setFormData({
      ...formData,
      mpess_willingness: { ...current, [key]: column }
    });
  };

  const emotionalRows = [
    "Stress eating / emotional bingeing",
    "Anxiety / restlessness",
    "Past trauma or grief",
    "Mood swings / irritability",
    "Guilt around food choices"
  ];

  const socialRows = [
    "Lack of support at home or work",
    "Peer pressure / social eating",
    "Work timings or travel stress",
    "Food cooked for family not suiting your goals",
    "Constant distractions / no 'me time'"
  ];

  const willingnessRows = [
    "Dedication to your goal",
    "Willpower to say no to temptations",
    "Commitment & Consistency",
    "Patience with your body",
    "Trust in the healing process",
    "Self-belief and confidence",
    "Readiness to commit 100%",
    "Discipline in following health habits",
    "Patience with slow progress",
    "Self-belief & confidence"
  ];

  const handleSubmit = () => {
    if (!formData.mpess_root_cause) {
      alert("Please complete Root Cause Assessment");
      return;
    }
    if (!formData.mpess_physical || Object.keys(formData.mpess_physical).length === 0) {
      alert("Please complete Physical Factors");
      return;
    }
    if (!formData.mpess_emotional || Object.keys(formData.mpess_emotional).length === 0) {
      alert("Please complete Emotional Triggers");
      return;
    }
    if (!formData.mpess_social || Object.keys(formData.mpess_social).length === 0) {
      alert("Please complete Social & Environmental");
      return;
    }
    if (!formData.mpess_spiritual) {
      alert("Please complete Spiritual & Self-Connection");
      return;
    }
    saveMutation.mutate(formData);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-500" />
            MPESS Assessment
          </h1>
          <p className="text-gray-600 text-lg">Track your comprehensive health assessment across Mind, Physical, Emotional, Social & Spiritual dimensions</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="new" className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="new">New Assessment</TabsTrigger>
            <TabsTrigger value="history">History ({assessmentHistory?.length || 0})</TabsTrigger>
          </TabsList>

        {/* New Assessment Tab */}
        <TabsContent value="new" className="space-y-6">
          {submitSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Your MPESS assessment has been saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {!showForm ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Submitted!</h2>
            <p className="text-gray-600 mb-6">Your MPESS assessment has been saved successfully.</p>
            <Button
              onClick={() => {
                setShowForm(true);
                setFormData({});
                setSubmitSuccess(false);
                setExpandedSections({
                  rootCause: true,
                  physical: false,
                  emotional: false,
                  social: false,
                  spiritual: false,
                  bodyComposition: false,
                  willingness: false
                });
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 text-lg"
            >
              Fill New Assessment
            </Button>
          </div>
        ) : (
          <>
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Heart className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                This assessment helps identify root causes of health challenges and create personalized healing strategies.
              </AlertDescription>
            </Alert>

            {/* ROOT CAUSE ASSESSMENT */}
            <Card className="border-none shadow-lg mb-4">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('rootCause')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">🔍</span>
              ROOT CAUSE ASSESSMENT (MPESS framework)
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          {expandedSections.rootCause && (
            <CardContent className="space-y-3">
              <RadioGroup value={formData.mpess_root_cause || ""} onValueChange={handleRootCauseChange}>
                {[
                  "Low motivation or consistency",
                  "All-or-nothing approach",
                  "Negative body image / low self-worth",
                  "Lack of patience / quick results expectation",
                  "Poor discipline in routine",
                  "Fear of change or commitment"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`root-${option}`} />
                    <Label htmlFor={`root-${option}`} className="cursor-pointer text-gray-700">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          )}
        </Card>

        {/* PHYSICAL FACTORS */}
        <Card className="border-none shadow-lg mb-4">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('physical')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">💪</span>
              P – Physical Factors
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          {expandedSections.physical && (
            <CardContent className="space-y-3">
              {[
                "Lack of exercise / movement",
                "Hormonal imbalance (e.g., PCOS, thyroid)",
                "Sleep disturbances / poor sleep cycle",
                "Digestive issues (acidity, bloating, constipation)",
                "Chronic fatigue / Low energy",
                "Post-pregnancy or post-surgery changes"
              ].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`physical-${item}`}
                    checked={formData.mpess_physical?.[item] || false}
                    onCheckedChange={() => handlePhysicalChange(item)}
                  />
                  <Label htmlFor={`physical-${item}`} className="cursor-pointer text-gray-700">{item}</Label>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

            {/* EMOTIONAL TRIGGERS */}
            <Card className="border-none shadow-lg mb-4">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('emotional')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">❤️</span>
              E – Emotional Triggers
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          {expandedSections.emotional && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-2 font-semibold">Trigger</th>
                      {[1, 2, 3, 4, 5].map(col => (
                        <th key={col} className="text-center py-3 px-1 font-semibold text-xs">Col {col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {emotionalRows.map((row) => (
                      <tr key={row} className="border-b">
                        <td className="py-3 pr-2 text-gray-700">{row}</td>
                        {[1, 2, 3, 4, 5].map(col => (
                          <td key={col} className="text-center py-3 px-1">
                            <RadioGroup
                              value={formData.mpess_emotional?.[row]?.toString() || ""}
                              onValueChange={(val) => val === col.toString() ? handleEmotionalChange(row, col) : null}
                            >
                              <div className="flex justify-center">
                                <RadioGroupItem value={col.toString()} id={`emotion-${row}-${col}`} />
                              </div>
                            </RadioGroup>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

            {/* SOCIAL & ENVIRONMENTAL */}
            <Card className="border-none shadow-lg mb-4">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('social')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">👥</span>
              S – Social & Environmental
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          {expandedSections.social && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-2 font-semibold">Factor</th>
                      {[1, 2, 3, 4].map(col => (
                        <th key={col} className="text-center py-3 px-1 font-semibold text-xs">Col {col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {socialRows.map((row) => (
                      <tr key={row} className="border-b">
                        <td className="py-3 pr-2 text-gray-700">{row}</td>
                        {[1, 2, 3, 4].map(col => (
                          <td key={col} className="text-center py-3 px-1">
                            <RadioGroup
                              value={formData.mpess_social?.[row]?.toString() || ""}
                              onValueChange={(val) => val === col.toString() ? handleSocialChange(row, col) : null}
                            >
                              <div className="flex justify-center">
                                <RadioGroupItem value={col.toString()} id={`social-${row}-${col}`} />
                              </div>
                            </RadioGroup>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

            {/* SPIRITUAL & SELF-CONNECTION */}
            <Card className="border-none shadow-lg mb-4">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('spiritual')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">🌱</span>
              S – Spiritual & Self-Connection
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          {expandedSections.spiritual && (
            <CardContent className="space-y-3">
              <RadioGroup value={formData.mpess_spiritual || ""} onValueChange={handleSpiritualChange}>
                {[
                  "Disconnection from self / lack of self-awareness",
                  "Not listening to hunger or fullness cues",
                  "Lack of gratitude & mindfulness around eating",
                  "Feeling unworthy of healing or success",
                  "Living in survival mode, not presence"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`spirit-${option}`} />
                    <Label htmlFor={`spirit-${option}`} className="cursor-pointer text-gray-700">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          )}
        </Card>

            {/* BODY COMPOSITION ANALYSIS */}
            <Card className="border-none shadow-lg mb-4">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('bodyComposition')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">📊</span>
              Body Composition Analysis
            </CardTitle>
          </CardHeader>
          {expandedSections.bodyComposition && (
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Why is it important</p>
              {[
                "Weight Breakdown",
                "Fat Loss vs. Muscle Gain",
                "Metabolic Health"
              ].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bc-${item}`}
                    checked={formData.mpess_body_composition?.[item] || false}
                    onCheckedChange={() => handleBodyCompositionChange(item)}
                  />
                  <Label htmlFor={`bc-${item}`} className="cursor-pointer text-gray-700">{item}</Label>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

            {/* WILLINGNESS TO HEAL & GROW */}
            <Card className="border-none shadow-lg mb-6">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('willingness')}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">✨</span>
              Your willingness to Heal & Grow
            </CardTitle>
          </CardHeader>
          {expandedSections.willingness && (
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Rate yourself on a scale of 1 to 10 (1 = very low, 10 = very high)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-2 font-semibold">Dimension</th>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(col => (
                        <th key={col} className="text-center py-3 px-1 font-semibold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {willingnessRows.map((row) => (
                      <tr key={row} className="border-b">
                        <td className="py-3 pr-2 text-xs text-gray-700">{row}</td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(col => (
                          <td key={col} className="text-center py-3 px-1">
                            <RadioGroup
                              value={formData.mpess_willingness?.[row]?.toString() || ""}
                              onValueChange={(val) => val === col.toString() ? handleWillingnessChange(row, col) : null}
                            >
                              <div className="flex justify-center">
                                <RadioGroupItem value={col.toString()} id={`will-${row}-${col}`} />
                              </div>
                            </RadioGroup>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-6 text-lg font-semibold"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Assessment"
                )}
              </Button>
            </div>
          </>
          )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
          {assessmentHistory && assessmentHistory.length > 0 ? (
           <div className="space-y-4">
             <Alert className="border-blue-200 bg-blue-50">
               <Calendar className="w-4 h-4 text-blue-600" />
               <AlertDescription className="text-blue-900">
                 View your past assessments to track progress over time
               </AlertDescription>
             </Alert>
             {assessmentHistory.map((assessment, index) => (
               <Card key={assessment.id} className="border-none shadow-lg">
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <div>
                       <CardTitle className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-orange-500" />
                         {format(new Date(assessment.submission_date), 'MMMM d, yyyy')}
                       </CardTitle>
                       <p className="text-sm text-gray-600 mt-1">
                         Root Cause: <span className="font-semibold text-gray-900">{assessment.submission_data?.mpess_root_cause || 'N/A'}</span>
                       </p>
                     </div>
                     {assessment.coach_reviewed && (
                       <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                         <CheckCircle className="w-4 h-4 text-green-600" />
                         <span className="text-xs font-semibold text-green-700">Reviewed</span>
                       </div>
                     )}
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-orange-50 p-4 rounded-lg">
                       <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Physical Factors Selected</p>
                       <p className="text-gray-900">{Object.keys(assessment.submission_data?.mpess_physical || {}).length} items</p>
                     </div>
                     <div className="bg-pink-50 p-4 rounded-lg">
                       <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Spiritual Connection</p>
                       <p className="text-gray-900 text-sm">{assessment.submission_data?.mpess_spiritual?.substring(0, 40) || 'N/A'}...</p>
                     </div>
                   </div>
                   {assessment.coach_notes && (
                     <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                       <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">Coach Notes</p>
                       <p className="text-gray-900">{assessment.coach_notes}</p>
                     </div>
                   )}
                 </CardContent>
               </Card>
             ))}
           </div>
          ) : (
           <Alert>
             <Heart className="w-4 h-4 text-gray-600" />
             <AlertDescription>
               No previous assessments yet. Complete your first assessment above!
             </AlertDescription>
           </Alert>
          )}
          </TabsContent>
          </Tabs>
          </div>
          </div>
          );
          }