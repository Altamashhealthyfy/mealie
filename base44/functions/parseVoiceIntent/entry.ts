import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url, text } = await req.json();

    const prompt = `You are a calendar assistant that parses voice commands in English and Hinglish.
Parse the command and return a strict JSON response.

Today's date is ${new Date().toISOString().split('T')[0]} (Asia/Kolkata timezone).

Rules:
- "aaj" or "today" => use today's date
- "kal" or "tomorrow" => use tomorrow's date
- "parso" => day after tomorrow
- If time is missing, set it to null (we'll ask user)
- Default duration is 30 minutes
- Support formats: "3 baje", "3pm", "15:00", "11am"
- Month names in Hindi/English: "December", "दिसंबर", "Dec"

Examples:
- "Aaj ke appointments dikhao" => action: list_events, query_range: today
- "Kal 3 baje Rahul follow-up 30 min add karo" => action: create_event, date: tomorrow, start_time: 15:00, duration: 30
- "17 Dec 11am consultation add karo" => action: create_event, date: 2025-12-17, start_time: 11:00

Return ONLY valid JSON, no extra text.

User command: ${text || '[from audio]'}`;

    const response_json_schema = {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create_event", "list_events", "update_event", "cancel_event"]
        },
        title: { type: "string" },
        date: { type: "string" },
        start_time: { type: "string" },
        duration_minutes: { type: "number" },
        notes: { type: "string" },
        query_date: { type: "string" },
        query_range: {
          type: "string",
          enum: ["today", "tomorrow", "this_week", "custom"]
        },
        event_id: { type: "string" },
        timezone: { type: "string" },
        confidence: { type: "number" }
      }
    };

    // Call LLM with audio or text
    const llmParams = {
      prompt,
      response_json_schema
    };

    if (audio_url) {
      llmParams.file_urls = [audio_url];
    }

    const result = await base44.integrations.Core.InvokeLLM(llmParams);

    // Add default values
    const parsed = {
      timezone: 'Asia/Kolkata',
      duration_minutes: 30,
      ...result
    };

    return Response.json({
      success: true,
      parsed,
      transcription: text || result.transcription || null
    });

  } catch (error) {
    console.error('Error parsing voice intent:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});