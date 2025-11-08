import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit, 
  Save, 
  X, 
  Target, 
  DollarSign, 
  Calendar,
  Award,
  TrendingUp,
  Info
} from "lucide-react";

export default function ProgrammeLevelManager() {
  const [levels, setLevels] = useState({
    L1: {
      name: "L1 - Entry Level",
      programmes: ["Silver", "7 Days Detox", "One Month Programme"],
      priceRange: "₹5,000 - ₹25,000",
      description: "Entry-level programmes for new customers",
      targetAudience: "First-time buyers, trial customers",
      duration: "1 week to 1 month",
      benefits: "Basic coaching, introduction to health transformation",
      color: "bg-blue-100 text-blue-700"
    },
    L2: {
      name: "L2 - Intermediate Level",
      programmes: ["Gold", "3 Month Programme", "FOP"],
      priceRange: "₹30,000 - ₹60,000",
      description: "Intermediate programmes for committed customers",
      targetAudience: "Customers ready for deeper transformation",
      duration: "3 months",
      benefits: "Advanced coaching, detailed meal plans, regular follow-ups",
      color: "bg-yellow-100 text-yellow-700"
    },
    L3: {
      name: "L3 - Premium Level",
      programmes: ["Diploma", "Diamond", "MOP", "12 Month Programme"],
      priceRange: "₹80,000 - ₹2,00,000+",
      description: "Premium programmes for serious health transformation",
      targetAudience: "High-commitment customers, career aspirants",
      duration: "6 months to 1 year",
      benefits: "Certification, business mentoring, lifetime support",
      color: "bg-purple-100 text-purple-700"
    }
  });

  const [editingLevel, setEditingLevel] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEdit = (levelKey) => {
    setEditingLevel(levelKey);
    setEditData({ ...levels[levelKey] });
  };

  const handleSave = (levelKey) => {
    setLevels({
      ...levels,
      [levelKey]: editData
    });
    setEditingLevel(null);
    setEditData({});
  };

  const handleCancel = () => {
    setEditingLevel(null);
    setEditData({});
  };

  const allProgrammes = [
    "Silver", "Gold", "Diploma", "Diamond",
    "FOP", "MOP",
    "One Month Programme", "3 Month Programme", "12 Month Programme",
    "7 Days Detox"
  ];

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-500">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription>
          <strong>Programme Levels (L1, L2, L3)</strong> help you categorize your offerings by price, commitment, and transformation depth. This makes it easier to track sales pipeline and design upgrade paths.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(levels).map(([levelKey, level]) => {
          const isEditing = editingLevel === levelKey;
          const currentData = isEditing ? editData : level;

          return (
            <Card key={levelKey} className="border-none shadow-lg">
              <CardHeader className={`${level.color} border-b`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Award className="w-6 h-6" />
                    {levelKey}
                  </CardTitle>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(levelKey)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSave(levelKey)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Level Name</Label>
                      <Input
                        value={currentData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={currentData.description}
                        onChange={(e) => setEditData({...editData, description: e.target.value})}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Price Range</Label>
                      <Input
                        value={currentData.priceRange}
                        onChange={(e) => setEditData({...editData, priceRange: e.target.value})}
                        placeholder="₹5,000 - ₹25,000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input
                        value={currentData.duration}
                        onChange={(e) => setEditData({...editData, duration: e.target.value})}
                        placeholder="1 week to 1 month"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Textarea
                        value={currentData.targetAudience}
                        onChange={(e) => setEditData({...editData, targetAudience: e.target.value})}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Benefits</Label>
                      <Textarea
                        value={currentData.benefits}
                        onChange={(e) => setEditData({...editData, benefits: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{currentData.name}</h3>
                      <p className="text-sm text-gray-600">{currentData.description}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{currentData.priceRange}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{currentData.duration}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{currentData.targetAudience}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 mb-2">Programmes in this level:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentData.programmes.map((prog) => (
                          <Badge key={prog} variant="outline" className="text-xs">
                            {prog}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Key Benefits:</p>
                      <p className="text-xs text-gray-600">{currentData.benefits}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upgrade Path Visualization */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Typical Customer Journey & Upgrade Path
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="text-center">
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-700">L1</p>
                  <p className="text-xs text-blue-600">Entry</p>
                </div>
              </div>
              <p className="text-sm font-medium">Silver / 7 Days Detox</p>
              <p className="text-xs text-gray-600">₹5K - ₹25K</p>
            </div>

            <div className="flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-700">L2</p>
                  <p className="text-xs text-yellow-600">Intermediate</p>
                </div>
              </div>
              <p className="text-sm font-medium">Gold / 3 Month</p>
              <p className="text-xs text-gray-600">₹30K - ₹60K</p>
            </div>

            <div className="flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-700">L3</p>
                  <p className="text-xs text-purple-600">Premium</p>
                </div>
              </div>
              <p className="text-sm font-medium">Diploma / Diamond</p>
              <p className="text-xs text-gray-600">₹80K - ₹2L+</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Upgrade Strategy Tips:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span><strong>L1 → L2:</strong> After 7-30 days, offer deeper transformation programmes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span><strong>L2 → L3:</strong> For committed customers, present certification & business opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span><strong>Direct to L3:</strong> Some customers skip levels - identify high-intent leads early</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span><strong>Track Upgrade Rate:</strong> Monitor how many L1 customers upgrade to L2, and L2 to L3</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* All Programmes Reference */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>All Available Programmes (Quick Reference)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {allProgrammes.map((prog) => {
              let level = "L1";
              if (levels.L2.programmes.includes(prog)) level = "L2";
              if (levels.L3.programmes.includes(prog)) level = "L3";
              
              const levelColor = level === "L1" ? "bg-blue-100 text-blue-700" :
                                level === "L2" ? "bg-yellow-100 text-yellow-700" :
                                "bg-purple-100 text-purple-700";

              return (
                <div key={prog} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium mb-1">{prog}</p>
                  <Badge className={`text-xs ${levelColor}`}>{level}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}