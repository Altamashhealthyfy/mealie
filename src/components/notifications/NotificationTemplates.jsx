// Email and WhatsApp templates for common notifications

export const EMAIL_TEMPLATES = {
  WELCOME: {
    subject: "Welcome to Mealie! 🎉",
    body: `Hi [CLIENT_NAME],

Welcome to Mealie - Your personalized health and nutrition platform!

We're excited to have you on board. Here's what you can expect:

✅ Personalized meal plans tailored to your goals
✅ Progress tracking and analytics
✅ Direct communication with your health coach
✅ Recipe library and food lookup tools
✅ MPESS wellness framework integration

Your health coach will be in touch shortly to set up your first consultation.

In the meantime, complete your health profile to help us serve you better.

Looking forward to being part of your health journey!`
  },

  MEAL_PLAN_READY: {
    subject: "Your Personalized Meal Plan is Ready! 🍽️",
    body: `Hi [CLIENT_NAME],

Great news! Your customized [PLAN_TYPE] meal plan is now ready.

📋 Plan Details:
- Duration: [DURATION] days
- Target Calories: [CALORIES] kcal/day
- Focus: [GOAL]

You can view and download your meal plan from your dashboard.

💡 Pro Tips:
- Follow the meal timings for best results
- Stay hydrated (8-10 glasses of water daily)
- Track your progress regularly
- Reach out if you have any questions

Need modifications? Just reply to this email.

To your health!`
  },

  APPOINTMENT_REMINDER: {
    subject: "Appointment Reminder - Tomorrow! 📅",
    body: `Hi [CLIENT_NAME],

This is a friendly reminder about your upcoming appointment:

📅 Date: [DATE]
⏰ Time: [TIME]
📍 Meeting Link: [LINK]
⏱️ Duration: [DURATION] minutes

Please prepare:
- Your progress report
- Any questions or concerns
- Food log (if applicable)

Can't make it? Please reschedule at least 24 hours in advance.

See you soon!`
  },

  PROGRESS_MILESTONE: {
    subject: "Congratulations on Your Progress! 🎉",
    body: `Hi [CLIENT_NAME],

Amazing news! You've achieved an important milestone:

🎯 Achievement: [MILESTONE]
📊 Progress: [PROGRESS_DETAILS]
💪 You're doing great!

Keep up the excellent work. Your dedication is paying off!

Remember:
- Stay consistent with your meal plan
- Don't skip meals
- Keep moving and stay active
- Get adequate sleep

Your next goal: [NEXT_GOAL]

We're proud of you!`
  },

  INACTIVE_CLIENT: {
    subject: "We Miss You! Come Back to Your Health Journey 💚",
    body: `Hi [CLIENT_NAME],

We noticed you haven't logged in for a while. Is everything okay?

We're here to support you on your health journey:

✅ Updated meal plans
✅ New recipes added
✅ Progress tracking tools
✅ Your coach is ready to help

Getting back on track is easy! Just log in and pick up where you left off.

Need help? Reply to this email and we'll assist you.

Looking forward to seeing you back!`
  }
};

export const WHATSAPP_TEMPLATES = {
  MEAL_PLAN_ASSIGNED: `Hi [CLIENT_NAME]! 🎉

Your personalized meal plan is ready!

View here: [LINK]

Questions? Reply to this message.

- Team Mealie`,

  APPOINTMENT_REMINDER: `Hi [CLIENT_NAME]! 📅

Reminder: Appointment tomorrow

🕐 Time: [TIME]
📍 Link: [LINK]

See you soon!`,

  PROGRESS_UPDATE: `Congratulations [CLIENT_NAME]! 🎉

You've [ACHIEVEMENT]! 💪

Keep going strong!

Your coach is proud of you! 🌟`,

  QUICK_CHECKIN: `Hi [CLIENT_NAME]! 👋

How are you doing with your meal plan?

Reply with:
1️⃣ Going great
2️⃣ Need help
3️⃣ Want to modify

We're here to help!`,

  PAYMENT_REMINDER: `Hi [CLIENT_NAME],

Friendly reminder: Your payment of ₹[AMOUNT] is due on [DATE].

Pay now to continue uninterrupted service.

Questions? Reply here.`,

  BIRTHDAY_WISH: `🎂 Happy Birthday [CLIENT_NAME]! 🎉

Wishing you a healthy and happy year ahead!

Enjoy your special day!

- Team Mealie 💚`
};

// Helper function to replace placeholders
export function fillTemplate(template, data) {
  let filled = template;
  Object.keys(data).forEach(key => {
    const placeholder = `[${key.toUpperCase()}]`;
    filled = filled.replace(new RegExp(placeholder, 'g'), data[key] || '');
  });
  return filled;
}