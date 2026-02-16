import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Save } from "lucide-react";
import { toast } from "sonner";

export default function FeedSettings() {
  const [feedSettings, setFeedSettings] = useState({
    showProgressLogs: true,
    showChallengeCompletions: true,
    showBadgeAwards: true,
    showMilestones: true,
    showLeaderboardUpdates: true,
    showStreakAchievements: true
  });

  const handleSave = () => {
    toast.success("Feed settings saved!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-orange-500" />
            Feed Settings
          </h1>
          <p className="text-gray-600 mt-1">Control what appears in the gamification feed</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Feed Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Show Progress Logs</Label>
              <Switch
                checked={feedSettings.showProgressLogs}
                onCheckedChange={(checked) => setFeedSettings({...feedSettings, showProgressLogs: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Challenge Completions</Label>
              <Switch
                checked={feedSettings.showChallengeCompletions}
                onCheckedChange={(checked) => setFeedSettings({...feedSettings, showChallengeCompletions: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Badge Awards</Label>
              <Switch
                checked={feedSettings.showBadgeAwards}
                onCheckedChange={(checked) => setFeedSettings({...feedSettings, showBadgeAwards: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Milestone Achievements</Label>
              <Switch
                checked={feedSettings.showMilestones}
                onCheckedChange={(checked) => setFeedSettings({...feedSettings, showMilestones: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Leaderboard Updates</Label>
              <Switch
                checked={feedSettings.showLeaderboardUpdates}
                onCheckedChange={(checked) => setFeedSettings({...feedSettings, showLeaderboardUpdates: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Streak Achievements</Label>
              <Switch
                checked={feedSettings.showStreakAchievements}
                onCheckedChange={(checked) => setFeedSettings({...feedSettings, showStreakAchievements: checked})}
              />
            </div>

            <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-red-500 mt-4">
              <Save className="w-4 h-4 mr-2" />
              Save Feed Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}