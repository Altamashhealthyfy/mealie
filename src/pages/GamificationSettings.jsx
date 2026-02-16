import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

export default function GamificationSettings() {
  const [settings, setSettings] = useState({
    pointsPerLog: 10,
    pointsPerChallenge: 100,
    pointsPerGoal: 50,
    streakBonusMultiplier: 1.5,
    levelThreshold: 100
  });

  const handleSave = () => {
    toast.success("Settings saved!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-orange-500" />
            Gamification Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure point rewards and thresholds</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Point Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Points per Progress Log</Label>
              <Input
                type="number"
                value={settings.pointsPerLog}
                onChange={(e) => setSettings({...settings, pointsPerLog: parseInt(e.target.value)})}
              />
            </div>

            <div>
              <Label>Points per Challenge Completion</Label>
              <Input
                type="number"
                value={settings.pointsPerChallenge}
                onChange={(e) => setSettings({...settings, pointsPerChallenge: parseInt(e.target.value)})}
              />
            </div>

            <div>
              <Label>Points per Goal Achievement</Label>
              <Input
                type="number"
                value={settings.pointsPerGoal}
                onChange={(e) => setSettings({...settings, pointsPerGoal: parseInt(e.target.value)})}
              />
            </div>

            <div>
              <Label>Streak Bonus Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.streakBonusMultiplier}
                onChange={(e) => setSettings({...settings, streakBonusMultiplier: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <Label>Points per Level</Label>
              <Input
                type="number"
                value={settings.levelThreshold}
                onChange={(e) => setSettings({...settings, levelThreshold: parseInt(e.target.value)})}
              />
            </div>

            <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-red-500">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}