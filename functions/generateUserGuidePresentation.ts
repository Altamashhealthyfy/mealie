import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google Slides access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googleslides');

    // Create a new presentation
    const createResponse = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${user.full_name}'s Platform User Guide - ${new Date().toLocaleDateString()}`,
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create presentation: ${await createResponse.text()}`);
    }

    const presentation = await createResponse.json();
    const presentationId = presentation.presentationId;

    // Define page content for all major sections
    const pageGuides = [
      {
        title: "Dashboard Overview",
        subtitle: "Your command center for client management",
        bullets: [
          "View key metrics: total clients, active programs, and revenue",
          "Monitor client alerts and action items requiring attention",
          "Access quick shortcuts to frequently used features",
          "Track your weekly performance and goals"
        ]
      },
      {
        title: "Client Management",
        subtitle: "Managing your client roster",
        bullets: [
          "Add new clients using the '+' button with their details",
          "Search and filter clients by status, plan, or coach",
          "View client cards showing key information and progress",
          "Edit client details or assign them to different coaches",
          "Access bulk actions for managing multiple clients"
        ]
      },
      {
        title: "Meal Planning",
        subtitle: "Creating personalized nutrition plans",
        bullets: [
          "Generate AI-powered meal plans based on client profile",
          "Choose between Basic (RDA) or Pro (Disease-specific) plans",
          "Select meal patterns: Daily or 3-3-4 rotation",
          "Review and edit generated meals before assignment",
          "Access meal plan templates for quick customization"
        ]
      },
      {
        title: "Appointments",
        subtitle: "Scheduling and managing sessions",
        bullets: [
          "Create appointments with date, time, and duration",
          "Link appointments to specific clients",
          "Sync with Google Calendar automatically",
          "Mark appointments as completed or cancelled",
          "Send automated reminders to clients"
        ]
      },
      {
        title: "Progress Tracking",
        subtitle: "Monitoring client progress",
        bullets: [
          "View weight trends and body measurements over time",
          "Review wellness metrics: mood, energy, sleep quality",
          "Analyze progress photos with before/after comparisons",
          "Add coach feedback and suggestions to progress logs",
          "Set and track client goals and milestones"
        ]
      },
      {
        title: "Communication",
        subtitle: "Staying connected with clients",
        bullets: [
          "Send direct messages to individual clients",
          "Create and manage client groups for announcements",
          "Share files, documents, and resources securely",
          "Schedule messages for later delivery",
          "Track message read receipts and responses"
        ]
      },
      {
        title: "Recipe Library",
        subtitle: "Building your recipe collection",
        bullets: [
          "Browse recipes by meal type, cuisine, and dietary preference",
          "Add custom recipes with ingredients and instructions",
          "Include nutritional information per serving",
          "Tag recipes for easy filtering and organization",
          "Import recipes from templates for quick setup"
        ]
      },
      {
        title: "Payment Management",
        subtitle: "Handling client subscriptions and payments",
        bullets: [
          "Create client plans with pricing and features",
          "Set up payment gateway (Razorpay/Stripe)",
          "Track payment history and pending invoices",
          "Generate payment links for client purchases",
          "Assign plans to clients and manage subscriptions"
        ]
      },
      {
        title: "Programs & Challenges",
        subtitle: "Creating group programs",
        bullets: [
          "Design programs with weekly schedules and milestones",
          "Set duration, pricing, and participant limits",
          "Enroll clients and track program completion",
          "Monitor engagement and progress across participants",
          "Issue completion certificates automatically"
        ]
      },
      {
        title: "Analytics Dashboard",
        subtitle: "Understanding your business performance",
        bullets: [
          "View revenue trends over time with visual charts",
          "Analyze client retention and churn rates",
          "Track appointment attendance and completion rates",
          "Monitor client satisfaction scores and feedback",
          "Export reports for deeper analysis"
        ]
      },
      {
        title: "Team Management",
        subtitle: "Collaborating with your team",
        bullets: [
          "Invite team members via email with role assignment",
          "Set permissions for different team roles",
          "Assign clients to specific team members",
          "Track team performance and activities",
          "Manage team attendance and schedules"
        ]
      },
      {
        title: "Resource Library",
        subtitle: "Sharing educational content",
        bullets: [
          "Upload PDFs, videos, and documents for clients",
          "Organize resources into custom categories",
          "Assign resources to specific clients or groups",
          "Track resource views and downloads",
          "Create resource assignments with deadlines"
        ]
      },
      {
        title: "Pro Plans (Disease Management)",
        subtitle: "Advanced disease-specific meal planning",
        bullets: [
          "Access specialized plans for diabetes, PCOS, hypertension",
          "Generate meals with disease-specific nutritional guidelines",
          "Include medication conflict warnings and interactions",
          "Integrate MPESS wellness practices for holistic care",
          "Audit plans for compliance with medical standards"
        ]
      },
      {
        title: "Client Assessments",
        subtitle: "Conducting structured evaluations",
        bullets: [
          "Create assessment templates with custom questions",
          "Use conditional logic for dynamic questionnaires",
          "Assign assessments to clients with due dates",
          "Review submitted responses and generate reports",
          "Track assessment completion and scores over time"
        ]
      },
      {
        title: "Marketing Hub",
        subtitle: "Growing your coaching business",
        bullets: [
          "Generate your unique referral link to share",
          "Track lead sources and conversion rates",
          "Create coupon codes for promotional campaigns",
          "Monitor webinar attendance and conversion",
          "Manage leads through the sales pipeline"
        ]
      }
    ];

    // Create slides with content
    const requests = [];
    let slideIndex = 1;

    // Add title slide
    requests.push({
      createSlide: {
        insertionIndex: slideIndex++,
        slideLayoutReference: {
          predefinedLayout: 'TITLE'
        }
      }
    });

    // Add content for each page
    for (const guide of pageGuides) {
      requests.push({
        createSlide: {
          insertionIndex: slideIndex++,
          slideLayoutReference: {
            predefinedLayout: 'TITLE_AND_BODY'
          }
        }
      });
    }

    // Apply all slide creations
    const batchUpdateResponse = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!batchUpdateResponse.ok) {
      throw new Error(`Failed to create slides: ${await batchUpdateResponse.text()}`);
    }

    const batchResult = await batchUpdateResponse.json();

    // Get the updated presentation to get slide IDs
    const getResponse = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const updatedPresentation = await getResponse.json();
    const slides = updatedPresentation.slides;

    // Now add text to each slide
    const textRequests = [];

    // Title slide
    if (slides[0]) {
      const titleSlide = slides[0];
      const titleShape = titleSlide.pageElements?.find(el => 
        el.shape?.placeholder?.type === 'CENTERED_TITLE' || el.shape?.placeholder?.type === 'TITLE'
      );
      const subtitleShape = titleSlide.pageElements?.find(el => 
        el.shape?.placeholder?.type === 'SUBTITLE'
      );

      if (titleShape) {
        textRequests.push({
          insertText: {
            objectId: titleShape.objectId,
            text: 'Platform User Guide',
            insertionIndex: 0,
          }
        });
      }

      if (subtitleShape) {
        textRequests.push({
          insertText: {
            objectId: subtitleShape.objectId,
            text: `Complete guide to using all features\nPrepared by ${user.full_name}`,
            insertionIndex: 0,
          }
        });
      }
    }

    // Content slides
    for (let i = 0; i < pageGuides.length; i++) {
      const slide = slides[i + 1];
      if (!slide) continue;

      const guide = pageGuides[i];

      const titleShape = slide.pageElements?.find(el => 
        el.shape?.placeholder?.type === 'TITLE'
      );
      const bodyShape = slide.pageElements?.find(el => 
        el.shape?.placeholder?.type === 'BODY'
      );

      if (titleShape) {
        textRequests.push({
          insertText: {
            objectId: titleShape.objectId,
            text: guide.title,
            insertionIndex: 0,
          }
        });
      }

      if (bodyShape) {
        const bodyText = `${guide.subtitle}\n\n${guide.bullets.map(b => `• ${b}`).join('\n')}`;
        textRequests.push({
          insertText: {
            objectId: bodyShape.objectId,
            text: bodyText,
            insertionIndex: 0,
          }
        });
      }
    }

    // Apply text updates
    if (textRequests.length > 0) {
      await fetch(
        `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: textRequests }),
        }
      );
    }

    const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    return Response.json({
      success: true,
      presentationId,
      presentationUrl,
      message: 'User guide presentation created successfully',
      totalSlides: pageGuides.length + 1,
    });

  } catch (error) {
    console.error('Error generating presentation:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate presentation' 
    }, { status: 500 });
  }
});