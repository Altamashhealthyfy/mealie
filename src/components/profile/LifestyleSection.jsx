import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Coffee } from "lucide-react";

const NA = "not_applicable";

export default function LifestyleSection({ formData, onChange }) {
  const l = formData.lifestyle || {};
  const set = (key, value) => onChange({ ...formData, lifestyle: { ...l, [key]: value } });

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="w-5 h-5 text-amber-500" />
          Lifestyle Details
        </CardTitle>
        <CardDescription>Habits that impact your health and nutrition plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Smoking */}
          <div className="space-y-2">
            <Label>Smoking Status</Label>
            <Select value={l.smoking_status || ''} onValueChange={v => set('smoking_status', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never Smoked</SelectItem>
                <SelectItem value="former">Former Smoker</SelectItem>
                <SelectItem value="occasional">Occasional</SelectItem>
                <SelectItem value="current">Current Smoker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alcohol */}
          <div className="space-y-2">
            <Label>Alcohol Consumption</Label>
            <Select value={l.alcohol_consumption || ''} onValueChange={v => set('alcohol_consumption', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="occasional">Occasional (social)</SelectItem>
                <SelectItem value="weekly">Weekly (1–2 drinks/week)</SelectItem>
                <SelectItem value="frequent">Frequent (3–6 drinks/week)</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sleep */}
          <div className="space-y-2">
            <Label>Average Sleep (hours/night)</Label>
            <Input type="number" step="0.5" min="1" max="14" placeholder="e.g. 7.5" value={l.sleep_hours || ''} onChange={e => set('sleep_hours', e.target.value)} />
          </div>

          {/* Sleep Quality */}
          <div className="space-y-2">
            <Label>Sleep Quality</Label>
            <Select value={l.sleep_quality || ''} onValueChange={v => set('sleep_quality', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="poor">Poor (frequent waking)</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stress Level */}
          <div className="space-y-2">
            <Label>Stress Level</Label>
            <Select value={l.stress_level || ''} onValueChange={v => set('stress_level', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="very_high">Very High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Work Nature */}
          <div className="space-y-2">
            <Label>Work Nature</Label>
            <Select value={l.work_nature || ''} onValueChange={v => set('work_nature', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desk_job">Desk Job (sedentary)</SelectItem>
                <SelectItem value="standing">Standing / On Feet</SelectItem>
                <SelectItem value="physical">Physical Labour</SelectItem>
                <SelectItem value="shift_work">Shift Work / Night Shifts</SelectItem>
                <SelectItem value="work_from_home">Work from Home</SelectItem>
                <SelectItem value="homemaker">Homemaker</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Water Intake */}
          <div className="space-y-2">
            <Label>Daily Water Intake (litres)</Label>
            <Input type="number" step="0.5" min="0" max="10" placeholder="e.g. 2.5" value={l.water_intake_litres || ''} onChange={e => set('water_intake_litres', e.target.value)} />
          </div>

          {/* Exercise per week */}
          <div className="space-y-2">
            <Label>Exercise Frequency (days/week)</Label>
            <Select value={String(l.exercise_days_per_week ?? '')} onValueChange={v => set('exercise_days_per_week', parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4,5,6,7].map(n => (
                  <SelectItem key={n} value={String(n)}>{n === 0 ? 'No exercise' : `${n} day${n > 1 ? 's' : ''}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Occupation */}
        <div className="space-y-2">
          <Label>Occupation / Job Title</Label>
          <Input placeholder="e.g. Software Engineer, Teacher..." value={l.occupation || ''} onChange={e => set('occupation', e.target.value)} />
        </div>

        {/* Additional lifestyle notes */}
        <div className="space-y-2">
          <Label>Additional Lifestyle Notes</Label>
          <Textarea
            placeholder="Any other relevant habits, routines, or lifestyle factors..."
            className="resize-none h-20"
            value={l.notes || ''}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}