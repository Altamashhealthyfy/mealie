import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";

export default function ConsentsSection({ formData, onChange }) {
  const c = formData.consents || {};
  const p = formData.preferences || {};

  const setConsents = (key, value) => onChange({ ...formData, consents: { ...c, [key]: value } });
  const setPrefs = (key, value) => onChange({ ...formData, preferences: { ...p, [key]: value } });

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-violet-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-600" />
          Consents & Preferences
        </CardTitle>
        <CardDescription>Privacy, communication preferences, and data sharing settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-7">
        {/* Consents */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-4">Data & Privacy Consents</p>
          <div className="space-y-3">
            {[
              { key: 'data_storage', label: 'I consent to my health data being stored and used to provide personalised coaching.' },
              { key: 'data_sharing_coach', label: 'I consent to my health data being shared with my assigned health coach(es).' },
              { key: 'anonymous_research', label: 'I consent to my anonymised data being used for research and platform improvement.' },
              { key: 'progress_photos', label: 'I consent to uploading and storing progress photos within the platform.' },
              { key: 'third_party_labs', label: 'I consent to my lab results being reviewed and stored on this platform.' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-white/70 border border-violet-100">
                <Checkbox
                  id={`consent_${key}`}
                  checked={!!c[key]}
                  onCheckedChange={v => setConsents(key, v)}
                  className="mt-0.5 border-violet-400"
                />
                <label htmlFor={`consent_${key}`} className="text-sm text-gray-700 cursor-pointer leading-snug">{label}</label>
              </div>
            ))}
          </div>
          {/* Consent date */}
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-gray-500">Consent Acknowledgement Date</Label>
            <Input
              type="date"
              className="max-w-xs"
              value={c.consent_date || ''}
              onChange={e => setConsents('consent_date', e.target.value)}
            />
          </div>
        </div>

        {/* Communication Preferences */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-4">Communication Preferences</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred Contact Method</Label>
              <Select value={p.contact_method || ''} onValueChange={v => setPrefs('contact_method', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Messages</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={p.preferred_language || ''} onValueChange={v => setPrefs('preferred_language', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="tamil">Tamil</SelectItem>
                  <SelectItem value="telugu">Telugu</SelectItem>
                  <SelectItem value="kannada">Kannada</SelectItem>
                  <SelectItem value="marathi">Marathi</SelectItem>
                  <SelectItem value="bengali">Bengali</SelectItem>
                  <SelectItem value="gujarati">Gujarati</SelectItem>
                  <SelectItem value="punjabi">Punjabi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notification Frequency</Label>
              <Select value={p.notification_frequency || ''} onValueChange={v => setPrefs('notification_frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately">Immediately</SelectItem>
                  <SelectItem value="daily_digest">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="none">Don't notify</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Check-in Time</Label>
              <Select value={p.checkin_time || ''} onValueChange={v => setPrefs('checkin_time', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (7am – 10am)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm – 3pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm – 8pm)</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notification toggles */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Notification Opt-ins</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'notify_meal_reminders', label: '🍽️ Meal reminders' },
              { key: 'notify_progress_reminders', label: '📊 Progress log reminders' },
              { key: 'notify_appointment', label: '📅 Appointment reminders' },
              { key: 'notify_new_plans', label: '📋 New meal plan assigned' },
              { key: 'notify_coach_messages', label: '💬 Coach messages' },
              { key: 'notify_achievements', label: '🏆 Achievement & badge alerts' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-50">
                <Checkbox
                  id={`pref_${key}`}
                  checked={p[key] !== false}
                  onCheckedChange={v => setPrefs(key, v)}
                  className="border-violet-400"
                />
                <label htmlFor={`pref_${key}`} className="text-sm cursor-pointer text-gray-700">{label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Special notes */}
        <div className="space-y-2">
          <Label>Special Requests / Notes for Coach</Label>
          <Textarea
            placeholder="Anything specific you'd like your coach to know about your preferences or needs..."
            className="resize-none h-20"
            value={p.special_notes || ''}
            onChange={e => setPrefs('special_notes', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}