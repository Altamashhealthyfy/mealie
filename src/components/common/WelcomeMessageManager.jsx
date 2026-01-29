import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Mail, MessageSquare, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function WelcomeMessageManager({ client, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('template');
  const [customMessage, setCustomMessage] = useState('');

  const defaultWelcomeMessage = `Hi ${client?.full_name}! 👋

Welcome to your personalized health journey with Mealie Pro! 🎉

I'm excited to be your nutrition coach and help you achieve your health goals. Here's what you can expect:

✅ Personalized meal plans tailored to your preferences
✅ Regular progress tracking and adjustments
✅ 24/7 support - message me anytime!
✅ Expert guidance on nutrition and lifestyle

Next Steps:
1️⃣ Complete your profile and preferences (if not done yet)
2️⃣ Check your dashboard for your first meal plan
3️⃣ Start logging your meals daily
4️⃣ Share your progress - photos, weight, measurements

Remember, I'm here to support you every step of the way. Feel free to reach out with any questions!

Let's make this journey amazing together! 💪

Best regards,
Your Coach`;

  const sendEmailMutation = useMutation({
    mutationFn: async (message) => {
      return await base44.functions.invoke('sendGoogleWorkspaceEmail', {
        to: client.email,
        subject: '🎉 Welcome to Your Health Journey!',
        body: message,
      });
    },
    onSuccess: () => {
      alert('✅ Welcome email sent successfully!');
      onClose();
    },
    onError: (error) => {
      alert(`❌ Error sending email: ${error.message}`);
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (message) => {
      return await base44.functions.invoke('sendWhatsAppMessage', {
        phone: client.phone,
        message: message,
        clientName: client.full_name,
      });
    },
    onSuccess: () => {
      alert('✅ Welcome WhatsApp message sent successfully!');
      onClose();
    },
    onError: (error) => {
      alert(`❌ Error sending WhatsApp: ${error.message}`);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (message) => {
      return await base44.entities.Notification.create({
        user_email: client.email,
        title: '🎉 Welcome to Mealie Pro!',
        message: message,
        type: 'announcement',
        priority: 'high',
        read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      alert('✅ In-app notification sent successfully!');
      onClose();
    },
    onError: (error) => {
      alert(`❌ Error creating notification: ${error.message}`);
    },
  });

  const handleSend = (channel) => {
    const message = activeTab === 'template' ? defaultWelcomeMessage : customMessage;
    
    if (!message.trim()) {
      alert('Please write a message first!');
      return;
    }

    if (channel === 'email') {
      sendEmailMutation.mutate(message);
    } else if (channel === 'whatsapp') {
      if (!client.phone) {
        alert('❌ Client has no phone number registered for WhatsApp');
        return;
      }
      sendWhatsAppMutation.mutate(message);
    } else if (channel === 'notification') {
      createNotificationMutation.mutate(message);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            Send Welcome Message to {client?.full_name}
          </DialogTitle>
          <DialogDescription>
            Send a personalized welcome message to help your new client get started
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="template">
                <Sparkles className="w-4 h-4 mr-2" />
                Use Template
              </TabsTrigger>
              <TabsTrigger value="custom">
                <MessageSquare className="w-4 h-4 mr-2" />
                Custom Message
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="space-y-4">
              <Alert className="bg-blue-50 border-blue-300">
                <AlertDescription>
                  <strong>📝 Default Welcome Template</strong><br/>
                  This is a pre-written welcome message you can send directly. Edit it if needed!
                </AlertDescription>
              </Alert>
              <Textarea
                value={defaultWelcomeMessage}
                readOnly
                rows={15}
                className="font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <Label>Write Your Custom Message</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Hi ${client?.full_name}!\n\nWrite your personalized welcome message here...`}
                  rows={15}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300">
            <AlertDescription>
              <strong>💡 Pro Tip:</strong> Welcome messages help clients feel supported from day one and increase engagement!
            </AlertDescription>
          </Alert>

          {/* Send Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Choose how to send:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleSend('email')}
                disabled={sendEmailMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>

              <Button
                onClick={() => handleSend('whatsapp')}
                disabled={sendWhatsAppMutation.isPending || !client.phone}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {sendWhatsAppMutation.isPending ? 'Sending...' : 'Send WhatsApp'}
              </Button>

              <Button
                onClick={() => handleSend('notification')}
                disabled={createNotificationMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {createNotificationMutation.isPending ? 'Sending...' : 'In-App Notification'}
              </Button>
            </div>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}