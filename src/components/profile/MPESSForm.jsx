import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function MPESSForm({ data, onChange }) {
  const [formData, setFormData] = useState(data || {
    root_cause: null,
    physical_factors: [],
    emotional_triggers: {},
    social_environmental: {},
    spiritual_self_connection: null,
    body_composition: [],
    motivation_rating: {}
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const handleRootCauseChange = (value) => {
    const updated = { ...formData, root_cause: value };
    setFormData(updated);
    onChange(updated);
  };

  const handlePhysicalFactorToggle = (factor) => {
    const updated = {
      ...formData,
      physical_factors: formData.physical_factors.includes(factor)
        ? formData.physical_factors.filter(f => f !== factor)
        : [...formData.physical_factors, factor]
    };
    setFormData(updated);
    onChange(updated);
  };

  const handleEmotionalTriggerChange = (trigger, column) => {
    const updated = {
      ...formData,
      emotional_triggers: {
        ...formData.emotional_triggers,
        [trigger]: column
      }
    };
    setFormData(updated);
    onChange(updated);
  };

  const handleSocialEnvironmentalChange = (factor, column) => {
    const updated = {
      ...formData,
      social_environmental: {
        ...formData.social_environmental,
        [factor]: column
      }
    };
    setFormData(updated);
    onChange(updated);
  };

  const handleSpiritualChange = (value) => {
    const updated = { ...formData, spiritual_self_connection: value };
    setFormData(updated);
    onChange(updated);
  };

  const handleBodyCompositionToggle = (item) => {
    const updated = {
      ...formData,
      body_composition: formData.body_composition.includes(item)
        ? formData.body_composition.filter(i => i !== item)
        : [...formData.body_composition, item]
    };
    setFormData(updated);
    onChange(updated);
  };

  const handleMotivationRatingChange = (item, rating) => {
    const updated = {
      ...formData,
      motivation_rating: {
        ...formData.motivation_rating,
        [item]: parseInt(rating)
      }
    };
    setFormData(updated);
    onChange(updated);
  };

  const rootCauseOptions = [
    "Low motivation or consistency",
    "All-or-nothing approach",
    "Negative body image / low self-worth",
    "Lack of patience / quick results expectation",
    "Poor discipline in routine",
    "Fear of change or commitment"
  ];

  const physicalFactors = [
    "Lack of exercise / movement",
    "Hormonal imbalance (e.g., PCOS, thyroid)",
    "Sleep disturbances / poor sleep cycle",
    "Digestive issues (acidity, bloating, constipation)",
    "Chronic fatigue / Low energy",
    "Post-pregnancy or post-surgery changes"
  ];

  const emotionalTriggers = [
    "Stress eating / emotional bingeing",
    "Anxiety / restlessness",
    "Past trauma or grief",
    "Mood swings / irritability",
    "Guilt around food choices"
  ];

  const socialEnvironmentalFactors = [
    "Lack of support at home or work",
    "Peer pressure / social eating",
    "Work timings or travel stress",
    "Food cooked for family not suiting your goals",
    "Constant distractions / no \"me time\""
  ];

  const spiritualFactors = [
    "Disconnection from self / lack of self-awareness",
    "Not listening to hunger or fullness cues",
    "Lack of gratitude or mindfulness around eating",
    "Feeling unworthy of healing or success",
    "Living in survival mode, not presence"
  ];

  const motivationItems = [
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

  return (
    <div className="space-y-6">
      {/* ROOT CAUSE ASSESSMENT */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            ROOT CAUSE ASSESSMENT (MPESS framework) <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={formData.root_cause || ""} onValueChange={handleRootCauseChange}>
            <div className="space-y-3">
              {rootCauseOptions.map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`root-${option}`} />
                  <Label htmlFor={`root-${option}`} className="cursor-pointer font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* PHYSICAL FACTORS */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">💪</span>
            P – Physical Factors <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {physicalFactors.map((factor) => (
              <div key={factor} className="flex items-center space-x-3">
                <RadioGroupItem 
                  value={factor} 
                  id={`physical-${factor}`}
                  checked={formData.physical_factors?.includes(factor) || false}
                  onCheckedChange={() => handlePhysicalFactorToggle(factor)}
                />
                <Label htmlFor={`physical-${factor}`} className="cursor-pointer font-normal">
                  {factor}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EMOTIONAL TRIGGERS */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">❤️</span>
            E – Emotional Triggers <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold p-2">Factor</th>
                  {[1, 2, 3, 4, 5].map(col => (
                    <th key={col} className="text-center font-semibold p-2">Column {col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emotionalTriggers.map((trigger) => (
                  <tr key={trigger} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{trigger}</td>
                    {[1, 2, 3, 4, 5].map(col => (
                      <td key={col} className="text-center p-2">
                        <RadioGroup 
                          value={formData.emotional_triggers?.[trigger]?.toString() || ""} 
                          onValueChange={(value) => handleEmotionalTriggerChange(trigger, value)}
                        >
                          <RadioGroupItem 
                            value={col.toString()} 
                            id={`emotion-${trigger}-${col}`}
                          />
                        </RadioGroup>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SOCIAL & ENVIRONMENTAL */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">👥</span>
            S – Social & Environmental <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold p-2">Factor</th>
                  {[1, 2, 3, 4].map(col => (
                    <th key={col} className="text-center font-semibold p-2">Column {col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socialEnvironmentalFactors.map((factor) => (
                  <tr key={factor} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{factor}</td>
                    {[1, 2, 3, 4].map(col => (
                      <td key={col} className="text-center p-2">
                        <RadioGroup 
                          value={formData.social_environmental?.[factor]?.toString() || ""} 
                          onValueChange={(value) => handleSocialEnvironmentalChange(factor, value)}
                        >
                          <RadioGroupItem 
                            value={col.toString()} 
                            id={`social-${factor}-${col}`}
                          />
                        </RadioGroup>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SPIRITUAL & SELF-CONNECTION */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            S – Spiritual & Self-Connection <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={formData.spiritual_self_connection || ""} onValueChange={handleSpiritualChange}>
            <div className="space-y-3">
              {spiritualFactors.map((factor) => (
                <div key={factor} className="flex items-center space-x-3">
                  <RadioGroupItem value={factor} id={`spiritual-${factor}`} />
                  <Label htmlFor={`spiritual-${factor}`} className="cursor-pointer font-normal">
                    {factor}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* BODY COMPOSITION ANALYSIS */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Body Composition Analysis <span className="text-red-500">*</span></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold p-2">Item</th>
                  <th className="text-center font-semibold p-2">Weight Breakdown</th>
                  <th className="text-center font-semibold p-2">Fat Loss vs. Muscle Gain</th>
                  <th className="text-center font-semibold p-2">Metabolic Health</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">Why is it important</td>
                  {["Weight Breakdown", "Fat Loss vs. Muscle Gain", "Metabolic Health"].map(item => (
                    <td key={item} className="text-center p-2">
                      <Checkbox 
                        checked={formData.body_composition?.includes(item) || false}
                        onCheckedChange={() => handleBodyCompositionToggle(item)}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MOTIVATION RATING */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            Rate yourself on a scale of 1 to 10 (1 = very low, 10 = very high) <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold p-2">Item</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <th key={num} className="text-center font-semibold p-2 text-xs">{num}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {motivationItems.map((item) => (
                  <tr key={item} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium text-xs">{item}</td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <td key={num} className="text-center p-2">
                        <RadioGroup 
                          value={formData.motivation_rating?.[item]?.toString() || ""} 
                          onValueChange={(value) => handleMotivationRatingChange(item, value)}
                        >
                          <RadioGroupItem 
                            value={num.toString()} 
                            id={`motivation-${item}-${num}`}
                          />
                        </RadioGroup>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}