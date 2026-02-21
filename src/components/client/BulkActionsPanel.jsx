import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckSquare, X, Send, Mail, MessageCircle, ClipboardList, 
  Users, Loader2, AlertTriangle, Trash2
} from "lucide-react";

export default function BulkActionsPanel({ selectedClients, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState(null);
  const [emailMessage, setEmailMessage] = useState({ subject: '', body: '' });
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates } = useQuery({
    queryKey: ['assessmentTemplates'],
    queryFn: async () => {
      const all = await base44.entities.AssessmentTemplate.filter({ active: true });
      return all;
    },
    initialData: [],
  });

  const assignTemplateMutation = useMutation({
    mutationFn: async ({ templateId, clientIds }) => {
      const template = templates.find(t => t.id === templateId);
      const assignments = [];

      for (const clientId of clientIds) {
        const client = selectedClients.find(c => c.id === clientId);
        const assessment = await base44.entities.ClientAssessment.create({
          client_id: clientId,
          client_name: client.full_name,
          assigned_by: user.email,
          template_id: templateId,
          status: 'pending',
        });
        assignments.push(assessment);
      }

      return assignments;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['assessments']);
      alert(`✅ Successfully assigned template to ${data.length} clients!`);
      onSuccess?.();
      onClose();
    },
  });

  const sendBulkEmailMutation = useMutation({
    mutationFn: async ({ subject, body, clientEmails }) => {
      const results = [];
      for (const email of clientEmails) {
        try {
          await base44.functions.invoke('sendGoogleWorkspaceEmail', {
            to: email,
            subject,
            body,
          });
          results.push({ email, status: 'success' });
        } catch (error) {
          results.push({ email, status: 'failed', error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.status === 'success').length;
      alert(`✅ Sent ${successCount}/${results.length} emails successfully!`);
      onSuccess?.();
      onClose();
    },
  });

  const sendBulkWhatsAppMutation = useMutation({
    mutationFn: async ({ message, clients }) => {
      const results = [];
      for (const client of clients) {
        if (!client.phone) {
          results.push({ client: client.full_name, status: 'skipped', reason: 'No phone number' });
          continue;
        }
        try {
          await base44.functions.invoke('sendWhatsAppMessage', {
            phone: client.phone,
            message,
            clientName: client.full_name,
          });
          results.push({ client: client.full_name, status: 'success' });
        } catch (error) {
          results.push({ client: client.full_name, status: 'failed', error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.status === 'success').length;
      alert(`✅ Sent ${successCount}/${results.length} WhatsApp messages successfully!`);
      onSuccess?.();
      onClose();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (clientIds) => {
      const results = [];
      for (const clientId of clientIds) {
        try {
          await base44.entities.Client.delete(clientId);
          results.push({ clientId, status: 'success' });
        } catch (error) {
          results.push({ clientId, status: 'failed', error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.status === 'success').length;
      alert(`✅ Successfully deleted ${successCount}/${results.length} clients!`);
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      alert(`❌ Error deleting clients: ${error.message}`);
    },
  });

  const handleAssignTemplate = () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }
    assignTemplateMutation.mutate({
      templateId: selectedTemplate,
      clientIds: selectedClients.map(c => c.id),
    });
  };

  const handleSendEmails = () => {
    if (!emailMessage.subject || !emailMessage.body) {
      alert('Please enter subject and message');
      return;
    }
    sendBulkEmailMutation.mutate({
      subject: emailMessage.subject,
      body: emailMessage.body,
      clientEmails: selectedClients.map(c => c.email),
    });
  };

  const handleSendWhatsApp = () => {
    if (!whatsappMessage) {
      alert('Please enter a message');
      return;
    }
    const clientsWithPhone = selectedClients.filter(c => c.phone);
    if (clientsWithPhone.length === 0) {
      alert('None of the selected clients have phone numbers');
      return;
    }
    sendBulkWhatsAppMutation.mutate({
      message: whatsappMessage,
      clients: selectedClients,
    });
  };

  const handleBulkDelete = () => {
    const confirmMessage = `⚠️ Are you sure you want to delete ${selectedClients.length} client(s)?\n\nThis action CANNOT be undone!\n\nClients to delete:\n${selectedClients.map(c => `• ${c.full_name}`).join('\n')}`;
    
    if (window.confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(selectedClients.map(c => c.id));
    }
  };

  return (
    <Card className="border-2 border-orange-500 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-orange-600" />
              Bulk Actions
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Selected Clients */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
          {selectedClients.map(client => (
            <Badge key={client.id} className="bg-orange-100 text-orange-700">
              {client.full_name}
            </Badge>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Button
            variant={activeAction === 'template' ? 'default' : 'outline'}
            onClick={() => setActiveAction('template')}
            className="h-16"
          >
            <div className="text-center">
              <ClipboardList className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Assign Template</span>
            </div>
          </Button>
          <Button
            variant={activeAction === 'email' ? 'default' : 'outline'}
            onClick={() => setActiveAction('email')}
            className="h-16"
          >
            <div className="text-center">
              <Mail className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Send Email</span>
            </div>
          </Button>
          <Button
            variant={activeAction === 'whatsapp' ? 'default' : 'outline'}
            onClick={() => setActiveAction('whatsapp')}
            className="h-16"
          >
            <div className="text-center">
              <MessageCircle className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Send WhatsApp</span>
            </div>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setActiveAction('delete')}
            className="h-16"
          >
            <div className="text-center">
              <Trash2 className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Delete</span>
            </div>
          </Button>
        </div>

        {/* Action Forms */}
        {activeAction === 'template' && (
          <div className="space-y-3 p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold">Assign Assessment Template</h3>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignTemplate}
              disabled={assignTemplateMutation.isPending || !selectedTemplate}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {assignTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Assign to {selectedClients.length} Clients
                </>
              )}
            </Button>
          </div>
        )}

        {activeAction === 'email' && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold">Send Bulk Email</h3>
            <input
              type="text"
              value={emailMessage.subject}
              onChange={(e) => setEmailMessage({ ...emailMessage, subject: e.target.value })}
              placeholder="Email subject"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <Textarea
              value={emailMessage.body}
              onChange={(e) => setEmailMessage({ ...emailMessage, body: e.target.value })}
              placeholder="Email message..."
              rows={5}
            />
            <Button
              onClick={handleSendEmails}
              disabled={sendBulkEmailMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {sendBulkEmailMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send to {selectedClients.length} Clients
                </>
              )}
            </Button>
          </div>
        )}

        {activeAction === 'whatsapp' && (
          <div className="space-y-3 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold">Send Bulk WhatsApp</h3>
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-xs">
                Only clients with phone numbers will receive messages
              </AlertDescription>
            </Alert>
            <Textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="WhatsApp message..."
              rows={5}
            />
            <Button
              onClick={handleSendWhatsApp}
              disabled={sendBulkWhatsAppMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {sendBulkWhatsAppMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send to {selectedClients.filter(c => c.phone).length} Clients
                </>
              )}
            </Button>
          </div>
        )}

        {activeAction === 'delete' && (
          <div className="space-y-3 p-4 bg-red-50 rounded-lg border-2 border-red-300">
            <h3 className="font-semibold text-red-900">🗑️ Delete Clients</h3>
            <Alert className="bg-red-100 border-red-400">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                <strong>Warning:</strong> Deleting {selectedClients.length} client(s) will permanently remove all their data including meal plans, progress logs, and messages. This action cannot be undone!
              </AlertDescription>
            </Alert>
            <div className="bg-white p-3 rounded border border-red-200 max-h-40 overflow-y-auto">
              <p className="text-sm font-semibold text-gray-700 mb-2">Clients to be deleted:</p>
              <ul className="space-y-1">
                {selectedClients.map(client => (
                  <li key={client.id} className="text-sm text-gray-600">
                    • {client.full_name} ({client.email})
                  </li>
                ))}
              </ul>
            </div>
            <Button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}