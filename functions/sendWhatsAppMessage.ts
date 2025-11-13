import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    console.log("📱 WhatsApp function called at:", new Date().toISOString());
    
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        console.log("🔐 Checking authentication...");
        const user = await base44.auth.me();
        if (!user) {
            console.error("❌ No user authenticated");
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }
        console.log("✅ User authenticated:", user.email);

        // Get request body
        const body = await req.json();
        const { phone, message, clientName } = body;

        console.log("📱 WhatsApp Request:", { 
            phone: phone, 
            clientName: clientName,
            messageLength: message?.length 
        });

        if (!phone || !message) {
            console.error("❌ Missing required fields");
            return Response.json({ 
                success: false,
                error: 'Missing required fields: phone, message'
            }, { status: 400 });
        }

        // Get AISensy credentials
        console.log("🔑 Reading AISensy credentials...");
        const projectId = Deno.env.get("AISENSY_PROJECT_ID");
        const projectPassword = Deno.env.get("AISENSY_PROJECT_PASSWORD");

        console.log("📝 Project ID:", projectId || "❌ NOT SET");
        console.log("📝 Project Password:", projectPassword ? "✅ SET" : "❌ NOT SET");

        if (!projectId || !projectPassword) {
            console.error("❌ AISensy credentials missing!");
            return Response.json({ 
                success: false,
                error: 'AISensy credentials not configured',
                details: {
                    projectId: projectId ? 'SET' : 'MISSING',
                    password: projectPassword ? 'SET' : 'MISSING'
                }
            }, { status: 500 });
        }

        // Format phone number (remove all non-digits, ensure country code)
        let formattedPhone = phone.replace(/\D/g, '');
        
        // If phone doesn't start with country code, assume India (+91)
        if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }

        console.log("📞 Formatted phone:", formattedPhone);

        // AISensy API endpoint
        const apiUrl = `https://backend.aisensy.com/campaign/t1/api/v2`;

        console.log("🌐 Calling AISensy API...");

        // Send WhatsApp message via AISensy
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apiKey: projectPassword,
                campaignName: 'client_welcome',
                destination: formattedPhone,
                userName: 'Healthyfy',
                templateParams: [],
                source: 'api',
                media: {},
                buttons: [],
                carouselCards: [],
                location: {},
                paramsFallbackValue: {
                    FirstName: clientName || 'Client'
                }
            })
        });

        const result = await response.json();

        console.log("📊 AISensy Response:", {
            status: response.status,
            result: result
        });

        if (!response.ok || !result.success) {
            console.error("❌ AISensy API Error:", result);
            return Response.json({ 
                success: false,
                error: 'Failed to send WhatsApp message',
                details: result
            }, { status: 500 });
        }

        console.log("✅ WhatsApp message sent successfully!");

        return Response.json({ 
            success: true,
            messageId: result.messageId,
            phone: formattedPhone,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("=" .repeat(60));
        console.error("❌ FATAL ERROR");
        console.error("=" .repeat(60));
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Full error:", error);
        console.error("=" .repeat(60));
        
        return Response.json({ 
            success: false,
            error: error.message,
            type: error.constructor.name,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});