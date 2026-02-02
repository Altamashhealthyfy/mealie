import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserPlus, 
  Calendar, 
  MessageSquare, 
  ClipboardList, 
  TrendingUp,
  Home,
  Settings,
  ChefHat,
  FileText,
  Target,
  LogIn,
  Crown,
  Mail
} from "lucide-react";

export default function StudentTraining() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Healthyfy Institute Training",
      subtitle: "Complete Guide for Health Coaches",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl">
              <ChefHat className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Healthyfy Institute Platform</h2>
            <p className="text-xl text-gray-600 mb-6">Your All-in-One Health Coaching Solution</p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <h3 className="font-bold text-gray-900">Client Management</h3>
              <p className="text-sm text-gray-600">Track unlimited clients</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
              <ChefHat className="w-8 h-8 text-green-600 mb-2" />
              <h3 className="font-bold text-gray-900">AI Meal Planning</h3>
              <p className="text-sm text-gray-600">Generate personalized plans</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl">
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="font-bold text-gray-900">Progress Tracking</h3>
              <p className="text-sm text-gray-600">Monitor client results</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl">
              <MessageSquare className="w-8 h-8 text-orange-600 mb-2" />
              <h3 className="font-bold text-gray-900">Communication</h3>
              <p className="text-sm text-gray-600">Chat with clients directly</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Login & Getting Started",
      subtitle: "Access Your Coach Dashboard",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-xl text-white">
            <LogIn className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Login Process</h3>
            <p className="text-white/90">Use your registered email and password to access the platform</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">1</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Navigate to Login Page</h4>
                <p className="text-sm text-gray-600">Visit the Healthyfy Institute login page</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">2</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Enter Credentials</h4>
                <p className="text-sm text-gray-600">Input your email and password provided during registration</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">3</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Access Dashboard</h4>
                <p className="text-sm text-gray-600">You'll be redirected to your Coach Dashboard automatically</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700"><strong>💡 Tip:</strong> Bookmark the dashboard URL for quick access. You can stay logged in on your device for convenience.</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 2: Understanding Your Dashboard",
      subtitle: "Navigate the Platform Efficiently",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-xl text-white">
            <Home className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Dashboard Overview</h3>
            <p className="text-white/90">Your central hub for all coaching activities</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-bold text-gray-900">Client Stats</h4>
              <p className="text-sm text-gray-600">Total clients, active plans, appointments</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-bold text-gray-900">Analytics</h4>
              <p className="text-sm text-gray-600">Success rates, progress metrics</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <Calendar className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-bold text-gray-900">Today's Schedule</h4>
              <p className="text-sm text-gray-600">Upcoming appointments</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <MessageSquare className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-bold text-gray-900">Messages</h4>
              <p className="text-sm text-gray-600">Unread messages from clients</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-gray-700"><strong>📊 Key Metrics:</strong> Dashboard shows real-time data. Refresh to see latest updates on client activities.</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Subscription & Plan Selection",
      subtitle: "Choose Your Coach Plan",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl text-white">
            <Crown className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">My Subscription</h3>
            <p className="text-white/90">Select the plan that fits your coaching practice</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-2 border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Mealie Basic</h4>
              <p className="text-2xl font-bold text-orange-600 mb-2">₹999/mo</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Up to 25 clients</li>
                <li>✓ Basic meal plans</li>
                <li>✓ 50 AI credits</li>
                <li>✓ Communication tools</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg shadow border-2 border-orange-500">
              <Badge className="bg-orange-600 mb-2">POPULAR</Badge>
              <h4 className="font-bold text-gray-900 mb-2">Mealie Pro</h4>
              <p className="text-2xl font-bold text-orange-600 mb-2">₹2,999/mo</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Unlimited clients</li>
                <li>✓ Pro meal plans</li>
                <li>✓ 200 AI credits</li>
                <li>✓ Business tools</li>
                <li>✓ Custom branding</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border-2 border-gray-200">
              <h4 className="font-bold text-gray-900 mb-2">Advance Plan</h4>
              <p className="text-2xl font-bold text-orange-600 mb-2">₹4,999/mo</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Up to 10 clients</li>
                <li>✓ 50 AI generations</li>
                <li>✓ Bulk import</li>
                <li>✓ Analytics</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <p className="text-sm text-gray-700"><strong>💳 Payment:</strong> Go to "My Subscription" in sidebar → Choose plan → Complete payment via Razorpay → Instant activation</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 4: Adding Your First Client",
      subtitle: "Client Onboarding Process",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl text-white">
            <UserPlus className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Client Onboarding</h3>
            <p className="text-white/90">Add and set up new clients in minutes</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-green-600">1</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Navigate to Clients</h4>
                <p className="text-sm text-gray-600">Click "Clients" in the sidebar menu</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-green-600">2</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Click "Add Client"</h4>
                <p className="text-sm text-gray-600">Find the button at the top right of the page</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-green-600">3</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Fill Basic Information</h4>
                <p className="text-sm text-gray-600">Name, Email, Phone, Age, Gender, Height, Weight</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-green-600">4</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Add Health Details</h4>
                <p className="text-sm text-gray-600">Goal (weight loss/gain), Activity level, Food preferences</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-green-600">5</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Set Targets</h4>
                <p className="text-sm text-gray-600">Target weight, Calories, Protein, Carbs, Fats (auto-calculated or manual)</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <p className="text-sm text-gray-700"><strong>✉️ Note:</strong> Client will receive an email invitation to access their portal. They can track progress and view meal plans.</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 5: Creating Meal Plans",
      subtitle: "AI-Powered Meal Plan Generation",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-xl text-white">
            <ChefHat className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Meal Plan Creation</h3>
            <p className="text-white/90">Generate personalized meal plans instantly</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">1</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Go to Meal Plans</h4>
                <p className="text-sm text-gray-600">Click "Meal Plans" in the sidebar</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">2</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Select Client</h4>
                <p className="text-sm text-gray-600">Choose the client for whom you want to create a plan</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">3</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Choose Generation Method</h4>
                <p className="text-sm text-gray-600">AI Generation (automatic) or Manual (custom recipes)</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">4</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Review & Customize</h4>
                <p className="text-sm text-gray-600">AI generates meals → You can edit/replace items → Save plan</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow">
              <Badge className="bg-orange-600">5</Badge>
              <div>
                <h4 className="font-bold text-gray-900">Assign to Client</h4>
                <p className="text-sm text-gray-600">Client can view the plan in their portal immediately</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm text-gray-700"><strong>🤖 AI Tip:</strong> AI considers client's preferences, allergies, goals, and creates balanced Indian meals automatically!</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 6: Communication with Clients",
      subtitle: "Stay Connected with Your Clients",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-xl text-white">
            <MessageSquare className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Client Communication</h3>
            <p className="text-white/90">Real-time messaging and updates</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-bold text-gray-900 mb-2">Direct Messages</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Chat one-on-one</li>
                <li>• Share files/images</li>
                <li>• Read receipts</li>
                <li>• Schedule messages</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-bold text-gray-900 mb-2">Group Messages</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Create client groups</li>
                <li>• Broadcast updates</li>
                <li>• Share resources</li>
                <li>• Community support</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gray-900">How to Send a Message:</h4>
            <div className="bg-white p-3 rounded-lg shadow text-sm">
              <p className="text-gray-700">1. Go to "Messages" in sidebar</p>
              <p className="text-gray-700">2. Select client from list</p>
              <p className="text-gray-700">3. Type message and hit send</p>
              <p className="text-gray-700">4. Attach files using the 📎 icon</p>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <p className="text-sm text-gray-700"><strong>💬 Pro Tip:</strong> Use scheduled messages for reminders and follow-ups. Mark important messages with a flag!</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 7: Tracking Client Progress",
      subtitle: "Monitor Results and Adjustments",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 rounded-xl text-white">
            <TrendingUp className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Progress Tracking</h3>
            <p className="text-white/90">Comprehensive analytics and reports</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <Target className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-bold text-gray-900">Weight Logs</h4>
              <p className="text-sm text-gray-600">Weekly weight tracking with trend charts</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <ClipboardList className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-bold text-gray-900">Food Logs</h4>
              <p className="text-sm text-gray-600">Daily meal compliance tracking</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-bold text-gray-900">MPESS Wellness</h4>
              <p className="text-sm text-gray-600">Holistic wellness monitoring</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-bold text-gray-900 mb-3">Access Progress Data:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge>1</Badge>
                <p className="text-gray-700">Go to "Clients" → Select client → View "Progress" tab</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>2</Badge>
                <p className="text-gray-700">Check weight trends, body measurements, photos</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>3</Badge>
                <p className="text-gray-700">Review food logs and compliance rates</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>4</Badge>
                <p className="text-gray-700">Generate progress reports for clients</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <p className="text-sm text-gray-700"><strong>📈 Analytics:</strong> Use "Client Analytics Dashboard" to see overall performance metrics across all clients.</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 8: Appointments & Scheduling",
      subtitle: "Manage Your Calendar Efficiently",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl text-white">
            <Calendar className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Appointments</h3>
            <p className="text-white/90">Schedule and manage client consultations</p>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-bold text-gray-900 mb-2">Creating an Appointment</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>1. Go to "Appointments" in sidebar</p>
                <p>2. Click "Add Appointment"</p>
                <p>3. Select client, date, and time</p>
                <p>4. Add meeting notes (optional)</p>
                <p>5. Save - client gets automatic notification</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-bold text-gray-900 mb-2">Calendar View</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Daily, Weekly, Monthly views</li>
                <li>✓ Color-coded by client</li>
                <li>✓ Drag & drop to reschedule</li>
                <li>✓ Google Calendar sync available</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
            <p className="text-sm text-gray-700"><strong>📅 Reminder:</strong> Clients receive email reminders 24 hours before appointments. You can also send manual reminders.</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 9: Advanced Features",
      subtitle: "Pro Tools for Scaling Your Business",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-xl text-white">
            <Settings className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Advanced Features</h3>
            <p className="text-white/90">Unlock powerful business tools</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <FileText className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-bold text-gray-900">Template Library</h4>
              <p className="text-sm text-gray-600">Pre-made meal plan templates for quick assignment</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <Users className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-bold text-gray-900">Team Management</h4>
              <p className="text-sm text-gray-600">Add team members to help manage clients</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <Crown className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-bold text-gray-900">Client Plans</h4>
              <p className="text-sm text-gray-600">Create paid subscription plans for your clients</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <Mail className="w-8 h-8 text-orange-600 mb-2" />
              <h4 className="font-bold text-gray-900">Marketing Hub</h4>
              <p className="text-sm text-gray-600">Email templates and automation for client outreach</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-bold text-gray-900 mb-3">Available in Pro Plans:</h4>
            <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <li>✓ Finance Manager</li>
              <li>✓ Business GPTs (AI assistants)</li>
              <li>✓ Custom Branding</li>
              <li>✓ White Label Options</li>
              <li>✓ Bulk Import Tools</li>
              <li>✓ Advanced Analytics</li>
            </ul>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
            <p className="text-sm text-gray-700"><strong>🚀 Scale Up:</strong> Upgrade to Pro plans to unlock these features and grow your coaching business!</p>
          </div>
        </div>
      )
    },
    {
      title: "Step 10: Best Practices & Tips",
      subtitle: "Maximize Your Success on the Platform",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl text-white">
            <Target className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Success Tips</h3>
            <p className="text-white/90">Expert recommendations for health coaches</p>
          </div>
          
          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <h4 className="font-bold text-gray-900 mb-2">📱 Stay Active</h4>
              <p className="text-sm text-gray-600">Check messages and respond to clients daily. Quick responses build trust!</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-bold text-gray-900 mb-2">📊 Monitor Progress</h4>
              <p className="text-sm text-gray-600">Review client progress weekly. Adjust meal plans based on results.</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
              <h4 className="font-bold text-gray-900 mb-2">🤖 Use AI Wisely</h4>
              <p className="text-sm text-gray-600">Let AI generate initial meal plans, then customize based on client feedback.</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
              <h4 className="font-bold text-gray-900 mb-2">📝 Document Everything</h4>
              <p className="text-sm text-gray-600">Add notes to client profiles. Track preferences, dislikes, and special requirements.</p>
            </div>
            
            <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-pink-500">
              <h4 className="font-bold text-gray-900 mb-2">🎯 Set Clear Goals</h4>
              <p className="text-sm text-gray-600">Define specific, measurable goals with clients. Update them regularly.</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-gray-700"><strong>💡 Remember:</strong> Consistent engagement = Better client results = Growing business!</p>
          </div>
        </div>
      )
    },
    {
      title: "Need Help? Support Resources",
      subtitle: "We're Here to Help You Succeed",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-2xl">
              <MessageSquare className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">We're Here for You!</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Mail className="w-10 h-10 text-blue-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Email Support</h4>
              <p className="text-sm text-gray-600 mb-3">Get help via email within 24 hours</p>
              <Button variant="outline" className="w-full">Contact Support</Button>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <FileText className="w-10 h-10 text-green-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Documentation</h4>
              <p className="text-sm text-gray-600 mb-3">Detailed guides and tutorials</p>
              <Button variant="outline" className="w-full">View Docs</Button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Ready to Start?</h3>
            <p className="text-white/90 mb-4">Begin your journey as a successful health coach today!</p>
            <Button className="bg-white text-green-600 hover:bg-green-50">
              Go to Dashboard
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-700">
              <strong>🎓 Pro Tip:</strong> Bookmark this training page for future reference. Share it with your team members!
            </p>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Health Coach Training Program
          </h1>
          <p className="text-gray-600">Complete Step-by-Step Guide</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Slide {currentSlide + 1} of {slides.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(((currentSlide + 1) / slides.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Slide Card */}
        <Card className="border-none shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-xl">
            <CardTitle className="text-3xl">{slides[currentSlide].title}</CardTitle>
            <p className="text-white/90 text-lg">{slides[currentSlide].subtitle}</p>
          </CardHeader>
          <CardContent className="p-8">
            {slides[currentSlide].content}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            variant="outline"
            className="gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>

          <div className="flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-orange-500 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="gap-2 bg-gradient-to-r from-orange-500 to-red-500"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Jump Menu */}
        <Card className="mt-8 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Quick Jump to Section</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {slides.map((slide, index) => (
                <Button
                  key={index}
                  onClick={() => goToSlide(index)}
                  variant={currentSlide === index ? "default" : "outline"}
                  size="sm"
                  className="text-xs justify-start"
                >
                  {index + 1}. {slide.title.split(':')[0]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}