import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, clientName, reportPeriod, dateRange, metrics, customNotes, clientData } = body;

    // Fetch habit data
    const habits = await base44.asServiceRole.entities.Habit.filter({ client_id: clientId, active: true });
    const habitLogs = await base44.asServiceRole.entities.HabitLog.filter({ client_id: clientId });
    
    const periodHabitLogs = habitLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= new Date(dateRange.start) && logDate <= new Date(dateRange.end);
    });

    const habitStats = {
      totalHabits: habits.length,
      totalCompletions: periodHabitLogs.length,
      bestStreak: Math.max(...habits.map(h => h.best_streak || 0), 0),
      avgStreak: habits.length > 0 
        ? habits.reduce((sum, h) => sum + (h.current_streak || 0), 0) / habits.length 
        : 0,
    };

    // Create PDF
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFillColor(249, 115, 22); // Orange
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Client Progress Report', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(dateRange.label, 105, 30, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Client Information
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Client Information', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${clientName}`, 20, yPos);
    yPos += 7;
    doc.text(`Email: ${clientData.email || 'N/A'}`, 20, yPos);
    yPos += 7;
    doc.text(`Goal: ${clientData.goal?.replace(/_/g, ' ') || 'Not set'}`, 20, yPos);
    yPos += 7;
    doc.text(`Target Weight: ${clientData.target_weight || '-'} kg`, 20, yPos);
    yPos += 15;

    // Summary Box
    doc.setFillColor(59, 130, 246); // Blue
    doc.roundedRect(15, yPos, 180, 40, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Report Summary', 105, yPos + 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const periodText = reportPeriod === 'month' ? 'Monthly Report' : 'Quarterly Report';
    doc.text(`Period: ${periodText} | Logs: ${metrics.totalProgressLogs} progress, ${metrics.totalFoodLogs} food`, 105, yPos + 20, { align: 'center' });
    doc.text(`Adherence: ${metrics.avgAdherence.toFixed(1)}% | Weight Change: ${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange.toFixed(1)} kg`, 105, yPos + 28, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos += 50;

    // Weight Progress
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Weight Progress', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    // Weight table
    const weightData = [
      ['Starting Weight', `${metrics.startWeight?.toFixed(1) || '-'} kg`],
      ['Ending Weight', `${metrics.endWeight?.toFixed(1) || '-'} kg`],
      ['Weight Change', `${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange.toFixed(1)} kg`],
      ['Progress', metrics.weightChange < 0 ? '✓ On Track' : '⚠ Review Needed']
    ];

    weightData.forEach((row, idx) => {
      doc.text(row[0] + ':', 25, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(row[1], 80, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 7;
    });
    yPos += 10;

    // Adherence & Activity
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Adherence & Activity', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Average Meal Plan Adherence: ${metrics.avgAdherence.toFixed(1)}%`, 25, yPos);
    yPos += 7;
    doc.text(`Total Progress Logs: ${metrics.totalProgressLogs}`, 25, yPos);
    yPos += 7;
    doc.text(`Total Food Logs: ${metrics.totalFoodLogs}`, 25, yPos);
    yPos += 15;

    // Wellness Metrics
    if (metrics.avgEnergy > 0 || metrics.avgSleep > 0 || metrics.avgStress > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Wellness Metrics (Average)', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      if (metrics.avgEnergy > 0) {
        doc.text(`Energy Level: ${metrics.avgEnergy.toFixed(1)}/5`, 25, yPos);
        yPos += 7;
      }
      if (metrics.avgSleep > 0) {
        doc.text(`Sleep Quality: ${metrics.avgSleep.toFixed(1)}/5`, 25, yPos);
        yPos += 7;
      }
      if (metrics.avgStress > 0) {
        doc.text(`Stress Level: ${metrics.avgStress.toFixed(1)}/5`, 25, yPos);
        yPos += 7;
      }
      yPos += 10;
    }

    // Habit Tracking
    if (habitStats.totalHabits > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Habit Consistency', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Active Habits: ${habitStats.totalHabits}`, 25, yPos);
      yPos += 7;
      doc.text(`Completions This Period: ${habitStats.totalCompletions}`, 25, yPos);
      yPos += 7;
      doc.text(`Best Streak: ${habitStats.bestStreak} days`, 25, yPos);
      yPos += 7;
      doc.text(`Average Current Streak: ${habitStats.avgStreak.toFixed(1)} days`, 25, yPos);
      yPos += 15;
    }

    // Coach's Notes
    if (customNotes) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("Coach's Notes & Recommendations", 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const notes = doc.splitTextToSize(customNotes, 170);
      doc.text(notes, 20, yPos);
      yPos += notes.length * 7 + 10;
    }

    // Key Observations
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Key Observations', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const observations = [];
    
    if (metrics.avgAdherence >= 80) {
      observations.push('✓ Excellent adherence - client is highly committed');
    } else if (metrics.avgAdherence >= 60) {
      observations.push('• Good adherence - encourage consistency');
    } else {
      observations.push('⚠ Low adherence - requires attention and support');
    }

    if (metrics.weightChange < -2) {
      observations.push('✓ Excellent weight loss progress');
    } else if (metrics.weightChange < 0) {
      observations.push('✓ Steady weight loss progress');
    } else if (metrics.weightChange > 0 && clientData.goal === 'weight_loss') {
      observations.push('⚠ Weight increased - review plan and adherence');
    }

    if (metrics.totalProgressLogs < 4) {
      observations.push('⚠ Low tracking frequency - encourage daily logging');
    } else {
      observations.push('✓ Good tracking consistency');
    }

    observations.forEach(obs => {
      doc.text(obs, 25, yPos);
      yPos += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerY = 285;
    doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 105, footerY, { align: 'center' });
    doc.text('Mealie Health Coach Platform', 105, footerY + 4, { align: 'center' });

    // Generate PDF buffer
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${clientName.replace(/\s/g, '_')}_Report.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});