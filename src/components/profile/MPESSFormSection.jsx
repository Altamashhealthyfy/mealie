import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Heart, AlertCircle, GripVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function MPESSFormSection({ formData, onChange }) {
  const [expandedSections, setExpandedSections] = useState({
    rootCause: true,
    physical: false,
    emotional: false,
    social: false,
    spiritual: false,
    bodyComposition: false,
    willingness: false
  });

  const [sectionOrder, setSectionOrder] = useState([
    'rootCause',
    'physical',
    'emotional',
    'social',
    'spiritual',
    'bodyComposition',
    'willingness'
  ]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Load section order from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mpess_section_order');
    if (saved) {
      setSectionOrder(JSON.parse(saved));
    }
  }, []);

  // Check if drag and drop is allowed
  const canDragDrop = user && ['client', 'student_coach', 'student_team_member'].includes(user?.user_type);

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const newOrder = Array.from(sectionOrder);
    const [removed] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, removed);
    setSectionOrder(newOrder);
    localStorage.setItem('mpess_section_order', JSON.stringify(newOrder));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRootCauseChange = (value) => {
    onChange({
      ...formData,
      mpess_root_cause: value
    });
  };

  const handlePhysicalChange = (key) => {
    const currentPhysical = formData.mpess_physical || {};
    onChange({
      ...formData,
      mpess_physical: {
        ...currentPhysical,
        [key]: !currentPhysical[key]
      }
    });
  };

  const handleEmotionalChange = (key, column) => {
    const currentEmotional = formData.mpess_emotional || {};
    onChange({
      ...formData,
      mpess_emotional: {
        ...currentEmotional,
        [key]: column
      }
    });
  };

  const handleSocialChange = (key, column) => {
    const currentSocial = formData.mpess_social || {};
    onChange({
      ...formData,
      mpess_social: {
        ...currentSocial,
        [key]: column
      }
    });
  };

  const handleSpiritualChange = (value) => {
    onChange({
      ...formData,
      mpess_spiritual: value
    });
  };

  const handleBodyCompositionChange = (key) => {
    const currentBC = formData.mpess_body_composition || {};
    onChange({
      ...formData,
      mpess_body_composition: {
        ...currentBC,
        [key]: !currentBC[key]
      }
    });
  };

  const handleWillingnessChange = (key, column) => {
    const currentWilling = formData.mpess_willingness || {};
    onChange({
      ...formData,
      mpess_willingness: {
        ...currentWilling,
        [key]: column
      }
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

  const sections = {
    rootCause: {
      icon: '🔍',
      title: 'ROOT CAUSE ASSESSMENT (MPESS framework)',
      content: 'rootCauseContent'
    },
    physical: {
      icon: '💪',
      title: 'P – Physical Factors',
      content: 'physicalContent'
    },
    emotional: {
      icon: '❤️',
      title: 'E – Emotional Triggers',
      content: 'emotionalContent'
    },
    social: {
      icon: '👥',
      title: 'S – Social & Environmental',
      content: 'socialContent'
    },
    spiritual: {
      icon: '🌱',
      title: 'S – Spiritual & Self-Connection',
      content: 'spiritualContent'
    },
    bodyComposition: {
      icon: '📊',
      title: 'Body Composition Analysis',
      content: 'bodyCompositionContent'
    },
    willingness: {
      icon: '✨',
      title: 'Your willingness to Heal & Grow',
      content: 'willingnessContent'
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50">
        <Heart className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          The MPESS Framework helps identify root causes of health challenges across Mind, Physical, Emotional, Social, and Spiritual dimensions.
          {canDragDrop && <span className="block mt-1 text-xs">💡 Drag sections to reorder them</span>}
        </AlertDescription>
      </Alert>

      {canDragDrop ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="mpess-sections">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}
              >
                {sectionOrder.map((sectionKey, index) => (
                  <Draggable key={sectionKey} draggableId={sectionKey} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="mb-4"
                      >
                        <Card className={`border-none shadow-lg ${snapshot.isDragging ? 'shadow-2xl' : ''}`}>
                          <CardHeader
                            className="cursor-pointer hover:bg-gray-50 flex flex-row items-center gap-3"
                            onClick={() => toggleSection(sectionKey)}
                            {...provided.dragHandleProps}
                          >
                            <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <CardTitle className="text-base flex items-center gap-2 flex-1">
                              <span className="text-xl">{sections[sectionKey].icon}</span>
                              {sections[sectionKey].title}
                              <span className="text-red-500 ml-1">*</span>
                            </CardTitle>
                          </CardHeader>
                          {renderSectionContent(sectionKey)}
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="space-y-4">
          {sectionOrder.map((sectionKey) => (
            <Card key={sectionKey} className="border-none shadow-lg">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection(sectionKey)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">{sections[sectionKey].icon}</span>
                  {sections[sectionKey].title}
                  <span className="text-red-500 ml-1">*</span>
                </CardTitle>
              </CardHeader>
              {renderSectionContent(sectionKey)}
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  function renderSectionContent(sectionKey) {
    if (sectionKey === 'rootCause') {
      return expandedSections.rootCause ? (
        <CardContent className="space-y-3" key={sectionKey}>
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
                <Label htmlFor={`root-${option}`} className="cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      ) : null;
    }

    if (sectionKey === 'physical') {
      return expandedSections.physical ? (
        <CardContent className="space-y-3" key={sectionKey}>
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
              <Label htmlFor={`physical-${item}`} className="cursor-pointer">{item}</Label>
            </div>
          ))}
        </CardContent>
      ) : null;
    }

    if (sectionKey === 'emotional') {
      return expandedSections.emotional ? (
        <CardContent key={sectionKey}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-2">Trigger</th>
                  {[1, 2, 3, 4, 5].map(col => (
                    <th key={col} className="text-center py-2 px-1">Col {col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {emotionalRows.map((row) => (
                  <tr key={row} className="border-b">
                    <td className="py-2 pr-2">{row}</td>
                    {[1, 2, 3, 4, 5].map(col => (
                      <td key={col} className="text-center py-2 px-1">
                        <RadioGroup
                          value={formData.mpess_emotional?.[row] || ""}
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
      ) : null;
    }

    if (sectionKey === 'social') {
      return expandedSections.social ? (
        <CardContent key={sectionKey}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-2">Factor</th>
                  {[1, 2, 3, 4].map(col => (
                    <th key={col} className="text-center py-2 px-1">Col {col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {socialRows.map((row) => (
                  <tr key={row} className="border-b">
                    <td className="py-2 pr-2">{row}</td>
                    {[1, 2, 3, 4].map(col => (
                      <td key={col} className="text-center py-2 px-1">
                        <RadioGroup
                          value={formData.mpess_social?.[row] || ""}
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
      ) : null;
    }

    if (sectionKey === 'spiritual') {
      return expandedSections.spiritual ? (
        <CardContent className="space-y-3" key={sectionKey}>
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
                <Label htmlFor={`spirit-${option}`} className="cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      ) : null;
    }

    if (sectionKey === 'bodyComposition') {
      return expandedSections.bodyComposition ? (
        <CardContent className="space-y-3" key={sectionKey}>
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
              <Label htmlFor={`bc-${item}`} className="cursor-pointer">{item}</Label>
            </div>
          ))}
        </CardContent>
      ) : null;
    }

    if (sectionKey === 'willingness') {
      return expandedSections.willingness ? (
        <CardContent key={sectionKey}>
          <p className="text-sm text-gray-600 mb-4">Rate yourself on a scale of 1 to 10 (1 = very low, 10 = very high)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-2">Dimension</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(col => (
                    <th key={col} className="text-center py-2 px-1">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {willingnessRows.map((row) => (
                  <tr key={row} className="border-b">
                    <td className="py-2 pr-2 text-xs">{row}</td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(col => (
                      <td key={col} className="text-center py-2 px-1">
                        <RadioGroup
                          value={formData.mpess_willingness?.[row] || ""}
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
      ) : null;
    }
  }
}