import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WhatsAppSender({ client, onClose, template = null }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(template || "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const sendWhatsApp = async () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    // Validate phone number
    const phone = client.phone?.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      setError("Invalid phone number");
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Format phone with country code if not present
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

      // Call Aisensy API via fetch
      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.AISENSY_API_KEY || "YOUR_API_KEY",
          campaignName: "mealie_custom_message",
          destination: formattedPhone,
          userName: "Mealie Platform",
          templateParams: [client.full_name, message],
          source: "mealie-app",
          media: {},
          buttons: [],
          carouselCards: [],
          location: {}
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.message || "Failed to send WhatsApp message");
      }
    } catch (err) {
      console.error("WhatsApp send error:", err);
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">To:</p>
            <p className="font-semibold">{client.full_name}</p>
            <p className="text-sm text-gray-600">{client.phone}</p>
          </div>

          {error && (
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {sent ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ✅ WhatsApp message sent successfully!
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Keep it short and friendly. WhatsApp works best with concise messages.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendWhatsApp}
                  disabled={sending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}