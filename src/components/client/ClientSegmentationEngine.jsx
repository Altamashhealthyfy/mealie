import React, { useMemo } from "react";

export const useClientSegmentation = (clients = [], progressLogs = []) => {
  const segmentClients = useMemo(() => {
    const segments = {};

    // Demographics segmentation
    segments.byAge = {
      under_25: clients.filter(c => c.age && c.age < 25),
      age_25_35: clients.filter(c => c.age && c.age >= 25 && c.age < 35),
      age_35_45: clients.filter(c => c.age && c.age >= 35 && c.age < 45),
      age_45_plus: clients.filter(c => c.age && c.age >= 45),
    };

    segments.byGender = {
      male: clients.filter(c => c.gender === 'male'),
      female: clients.filter(c => c.gender === 'female'),
      other: clients.filter(c => c.gender === 'other'),
    };

    // Health goals segmentation
    segments.byGoal = {
      weight_loss: clients.filter(c => c.goal === 'weight_loss'),
      weight_gain: clients.filter(c => c.goal === 'weight_gain'),
      muscle_gain: clients.filter(c => c.goal === 'muscle_gain'),
      maintenance: clients.filter(c => c.goal === 'maintenance'),
      health_improvement: clients.filter(c => c.goal === 'health_improvement'),
      disease_reversal: clients.filter(c => c.goal === 'disease_reversal'),
    };

    // Food preference segmentation
    segments.byFoodPreference = {
      veg: clients.filter(c => c.food_preference === 'veg'),
      non_veg: clients.filter(c => c.food_preference === 'non_veg'),
      jain: clients.filter(c => c.food_preference === 'jain'),
      eggetarian: clients.filter(c => c.food_preference === 'eggetarian'),
      mixed: clients.filter(c => c.food_preference === 'mixed'),
    };

    // Activity level segmentation
    segments.byActivityLevel = {
      sedentary: clients.filter(c => c.activity_level === 'sedentary'),
      lightly_active: clients.filter(c => c.activity_level === 'lightly_active'),
      moderately_active: clients.filter(c => c.activity_level === 'moderately_active'),
      very_active: clients.filter(c => c.activity_level === 'very_active'),
      extremely_active: clients.filter(c => c.activity_level === 'extremely_active'),
    };

    // Status segmentation
    segments.byStatus = {
      active: clients.filter(c => c.status === 'active'),
      inactive: clients.filter(c => c.status === 'inactive'),
      completed: clients.filter(c => c.status === 'completed'),
      on_hold: clients.filter(c => c.status === 'on_hold'),
    };

    // Progress-based segmentation
    const calculateProgress = (client) => {
      const logs = progressLogs.filter(l => l.client_id === client.id);
      if (logs.length === 0) return null;

      const latestLog = logs[logs.length - 1];
      const startLog = logs[0];
      
      if (!latestLog.weight || !startLog.weight) return null;
      const weightLoss = startLog.weight - latestLog.weight;
      const percentage = (weightLoss / startLog.weight) * 100;
      
      return { weightLoss, percentage, logsCount: logs.length };
    };

    const clientsWithProgress = clients.map(c => ({
      ...c,
      progress: calculateProgress(c),
    }));

    segments.byProgress = {
      high_achievers: clientsWithProgress.filter(c => c.progress && c.progress.percentage >= 5),
      moderate_progress: clientsWithProgress.filter(c => c.progress && c.progress.percentage >= 2 && c.progress.percentage < 5),
      early_stage: clientsWithProgress.filter(c => c.progress && c.progress.percentage > 0 && c.progress.percentage < 2),
      no_progress: clientsWithProgress.filter(c => c.progress && c.progress.percentage <= 0),
      not_tracked: clientsWithProgress.filter(c => !c.progress),
    };

    // Engagement segmentation
    const calculateEngagement = (client) => {
      const logs = progressLogs.filter(l => l.client_id === client.id);
      const logsCount = logs.length;
      const joinDate = new Date(client.join_date);
      const daysSinceJoin = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceJoin === 0) return 'new';
      const logsPerDay = logsCount / daysSinceJoin;
      
      if (logsPerDay >= 0.7) return 'highly_engaged';
      if (logsPerDay >= 0.3) return 'engaged';
      if (logsPerDay > 0) return 'low_engagement';
      return 'no_engagement';
    };

    segments.byEngagement = {
      highly_engaged: clientsWithProgress.filter(c => calculateEngagement(c) === 'highly_engaged'),
      engaged: clientsWithProgress.filter(c => calculateEngagement(c) === 'engaged'),
      low_engagement: clientsWithProgress.filter(c => calculateEngagement(c) === 'low_engagement'),
      no_engagement: clientsWithProgress.filter(c => calculateEngagement(c) === 'no_engagement'),
      new: clientsWithProgress.filter(c => calculateEngagement(c) === 'new'),
    };

    // At-risk segmentation (inactive but enrolled)
    segments.atRisk = clients.filter(c => {
      const logs = progressLogs.filter(l => l.client_id === c.id);
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
      if (!lastLog) return true;
      
      const daysSinceLastLog = Math.floor((new Date() - new Date(lastLog.date)) / (1000 * 60 * 60 * 24));
      return daysSinceLastLog > 30;
    });

    return segments;
  }, [clients, progressLogs]);

  return segmentClients;
};

export const getSegmentDescription = (segmentKey, segmentName) => {
  const descriptions = {
    // Age
    under_25: "Young adults pursuing fitness goals",
    age_25_35: "Working professionals managing health",
    age_35_45: "Mid-career adults focused on wellness",
    age_45_plus: "Mature clients prioritizing health",

    // Gender
    male: "Male clients",
    female: "Female clients",
    other: "Non-binary clients",

    // Goals
    weight_loss: "Clients focused on losing weight",
    weight_gain: "Clients aiming to gain weight",
    muscle_gain: "Clients building muscle",
    maintenance: "Clients maintaining current weight",
    health_improvement: "Clients improving overall health",
    disease_reversal: "Clients managing chronic diseases",

    // Food Preference
    veg: "Vegetarian clients",
    non_veg: "Non-vegetarian clients",
    jain: "Jain diet followers",
    eggetarian: "Egg-consuming vegetarians",
    mixed: "Flexible diet clients",

    // Activity
    sedentary: "Sedentary lifestyle clients",
    lightly_active: "Lightly active clients",
    moderately_active: "Moderately active clients",
    very_active: "Very active clients",
    extremely_active: "Highly athletic clients",

    // Status
    active: "Currently enrolled clients",
    inactive: "Paused/inactive clients",
    completed: "Graduated/completed clients",
    on_hold: "On-hold clients",

    // Progress
    high_achievers: "Clients with 5%+ progress",
    moderate_progress: "Clients with 2-5% progress",
    early_stage: "Clients with early progress",
    no_progress: "Clients with no weight change",
    not_tracked: "Clients without tracking data",

    // Engagement
    highly_engaged: "Active daily trackers",
    engaged: "Regular trackers",
    low_engagement: "Occasional trackers",
    no_engagement: "Non-tracking clients",
    new: "New enrollments",

    // At-risk
    atRisk: "Inactive 30+ days",
  };

  return descriptions[segmentKey] || segmentName;
};