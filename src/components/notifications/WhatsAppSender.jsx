import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Loader2, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WhatsAppSender({ client, onClose, template = null }) {
  const [message, setMessage] = useState(template || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Simple WhatsApp Web link approach - Always works!
  const sendViaWhatsAppWeb = () => {
    if (!message.trim()) {
      alert("⚠️ Please enter a message first!");
      return;
    }

    // Validate and format phone number
    let phone = client.phone?.replace(/\D/g, ''); // Remove all non-digits
    
    if (!phone || phone.length < 10) {
      setError("❌ Invalid phone number. Please update client's phone number.");
      return;
    }

    // Add country code if not present (assuming India +91)
    if (!phone.startsWith('91') && phone.length === 10) {
      phone = '91' + phone;
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp Web URL
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    console.log("Opening WhatsApp with:", { phone, message });
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
    
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-600" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Sending to:</p>
            <p className="font-bold text-lg text-gray-900">{client.full_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-gray-700">{client.phone || "No phone number"}</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-700 ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {sent ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <AlertDescription className="text-green-700 ml-2">
                <strong>✅ WhatsApp opened successfully!</strong>
                <p className="text-sm mt-2">
                  A new tab has opened with WhatsApp Web. Click "Send" in WhatsApp to deliver your message.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* How It Works Alert */}
              <Alert className="bg-blue-50 border-blue-300">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900 ml-2">
                  <strong>📱 How it works:</strong> This will open WhatsApp Web in a new tab with your message pre-filled. 
                  You just need to click "Send" in WhatsApp!
                </AlertDescription>
              </Alert>

              {/* Message Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  💬 Your Message:
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here...&#10;&#10;Example:&#10;Hi [Name], this is your dietitian.&#10;&#10;Just checking in on your progress! 😊"
                  rows={8}
                  className="resize-none text-base border-2 border-green-300 focus:border-green-500"
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Keep it short and friendly. Add emojis for a personal touch! 😊
                </p>
              </div>

              {/* Phone Number Validation */}
              {client.phone ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900">
                    ✅ Phone number found: <strong>{client.phone}</strong>
                  </p>
                </div>
              ) : (
                <Alert className="border-orange-500 bg-orange-50">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-orange-900 ml-2">
                    <strong>⚠️ No phone number!</strong> Please add a phone number to this client's profile first.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendViaWhatsAppWeb}
                  disabled={sending || !client.phone || !message.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-lg font-semibold shadow-lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Open WhatsApp
                    </>
                  )}
                </Button>
              </div>

              {/* Help Text */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 font-semibold mb-2">📋 What happens next:</p>
                <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                  <li>WhatsApp Web opens in a new tab</li>
                  <li>Your message is pre-filled</li>
                  <li>You click "Send" in WhatsApp</li>
                  <li>Message delivered! ✅</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}