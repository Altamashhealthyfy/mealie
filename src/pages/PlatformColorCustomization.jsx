import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, RefreshCw, Save, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PlatformColorCustomization() {
  const queryClient = useQueryClient();

  const defaultColors = {
    primary_from: "#f97316",
    primary_to: "#dc2626",
    sidebar_bg: "#ffffff",
    health_coach_sidebar_bg: "#ffffff",
    client_sidebar_bg: "#ffffff",
    accent_color: "#f97316",
    menu_text_color: "#22c55e",
    highlight_button_color: "#f97316",
  };

  const [themeColors, setThemeColors] = useState(defaultColors);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachProfile } = useQuery({
    queryKey: ['coachProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.CoachProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (coachProfile?.theme_colors) {
      setThemeColors(prev => ({ ...defaultColors, ...coachProfile.theme_colors }));
    }
  }, [coachProfile]);

  const updateColorsMutation = useMutation({
    mutationFn: async (colorData) => {
      if (coachProfile) {
        return await base44.entities.CoachProfile.update(coachProfile.id, {
          theme_colors: colorData
        });
      } else {
        return await base44.entities.CoachProfile.create({
          theme_colors: colorData
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachProfile'] });
      alert("✅ Colors saved! You may need to refresh the page to see all changes.");
    },
    onError: (err) => {
      console.error("Failed to save colors:", err);
      alert("❌ Failed to save colors. Please try again.");
    }
  });

  const handleSave = () => {
    updateColorsMutation.mutate(themeColors);
  };

  const handleReset = () => {
    setThemeColors(defaultColors);
  };

  const handleColorChange = (key, value) => {
    setThemeColors({ ...themeColors, [key]: value });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Palette className="w-10 h-10 text-orange-500" />
            Platform Color Customization
          </h1>
          <p className="text-gray-600">Customize the color scheme for all panels</p>
        </div>

        <Alert className="bg-blue-50 border-blue-300">
          <AlertDescription className="text-blue-900">
            <strong>Note:</strong> These colors will apply to all panels (Platform, Health Coach, and Client). Changes will take effect after page refresh.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Color Settings */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Color Settings</CardTitle>
              <CardDescription>Choose your brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Primary Gradient Start</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={themeColors.primary_from}
                    onChange={(e) => handleColorChange('primary_from', e.target.value)}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={themeColors.primary_from}
                    onChange={(e) => handleColorChange('primary_from', e.target.value)}
                    className="flex-1"
                    placeholder="#f97316"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Primary Gradient End</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={themeColors.primary_to}
                    onChange={(e) => handleColorChange('primary_to', e.target.value)}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={themeColors.primary_to}
                    onChange={(e) => handleColorChange('primary_to', e.target.value)}
                    className="flex-1"
                    placeholder="#dc2626"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Sidebar Background</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={themeColors.sidebar_bg}
                    onChange={(e) => handleColorChange('sidebar_bg', e.target.value)}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={themeColors.sidebar_bg}
                    onChange={(e) => handleColorChange('sidebar_bg', e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Accent Color</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={themeColors.accent_color}
                    onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={themeColors.accent_color}
                    onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    className="flex-1"
                    placeholder="#f97316"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Menu Text Color</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={themeColors.menu_text_color}
                    onChange={(e) => handleColorChange('menu_text_color', e.target.value)}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={themeColors.menu_text_color}
                    onChange={(e) => handleColorChange('menu_text_color', e.target.value)}
                    className="flex-1"
                    placeholder="#22c55e"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Highlight Button Color</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={themeColors.highlight_button_color}
                    onChange={(e) => handleColorChange('highlight_button_color', e.target.value)}
                    className="w-20 h-12 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={themeColors.highlight_button_color}
                    onChange={(e) => handleColorChange('highlight_button_color', e.target.value)}
                    className="flex-1"
                    placeholder="#f97316"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateColorsMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateColorsMutation.isPending ? 'Saving...' : 'Save Colors'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
              <CardDescription>See how your colors will look</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Primary Gradient</Label>
                <div
                  className="h-20 rounded-lg shadow-md"
                  style={{
                    background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`
                  }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Button Styles</Label>
                <div className="space-y-2">
                  <button
                    className="w-full py-3 px-4 rounded-lg text-white font-semibold shadow-md"
                    style={{
                      background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="w-full py-3 px-4 rounded-lg font-semibold border-2 shadow-sm"
                    style={{
                      borderColor: themeColors.accent_color,
                      color: themeColors.accent_color,
                      backgroundColor: themeColors.sidebar_bg
                    }}
                  >
                    Outline Button
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Sidebar Preview</Label>
                <div
                  className="h-32 rounded-lg shadow-md p-4"
                  style={{ backgroundColor: themeColors.sidebar_bg }}
                >
                  <div className="space-y-2">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 text-white font-medium"
                      style={{
                        background: `linear-gradient(to right, ${themeColors.primary_from}, ${themeColors.primary_to})`
                      }}
                    >
                      Active Menu Item
                    </div>
                    <div className="h-10 rounded-lg flex items-center px-3 text-sm font-medium" style={{ color: themeColors.menu_text_color }}>
                      Inactive Menu Item
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Menu Text Color</Label>
                <div className="space-y-1 p-3 rounded-lg border" style={{ backgroundColor: themeColors.sidebar_bg }}>
                  <div style={{ color: themeColors.menu_text_color }} className="text-sm font-medium">📊 Dashboard</div>
                  <div style={{ color: themeColors.menu_text_color }} className="text-sm font-medium">👥 Clients</div>
                  <div style={{ color: themeColors.menu_text_color }} className="text-sm font-medium">💬 Messages</div>
                  <div style={{ color: themeColors.menu_text_color }} className="text-sm font-medium">📅 Appointments</div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Accent Elements</Label>
                <div className="flex gap-2 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: themeColors.accent_color }}
                  >
                    Badge
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: themeColors.accent_color + '20',
                      color: themeColors.accent_color
                    }}
                  >
                    Light Badge
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}