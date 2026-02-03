/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AddTeamAppointment from './pages/AddTeamAppointment';
import AdminSubscriptionManager from './pages/AdminSubscriptionManager';
import Appointments from './pages/Appointments';
import AssessmentTemplates from './pages/AssessmentTemplates';
import BroadcastNotification from './pages/BroadcastNotification';
import BulkImport from './pages/BulkImport';
import BulkStudentOnboarding from './pages/BulkStudentOnboarding';
import BusinessGPTs from './pages/BusinessGPTs';
import BusinessHub from './pages/BusinessHub';
import BusinessPlan from './pages/BusinessPlan';
import CallCenter from './pages/CallCenter';
import CallCenterAdmin from './pages/CallCenterAdmin';
import ClientAnalyticsDashboard from './pages/ClientAnalyticsDashboard';
import ClientAppointments from './pages/ClientAppointments';
import ClientAssessments from './pages/ClientAssessments';
import ClientCommunication from './pages/ClientCommunication';
import ClientCommunicationHub from './pages/ClientCommunicationHub';
import ClientDashboard from './pages/ClientDashboard';
import ClientFinanceManager from './pages/ClientFinanceManager';
import ClientManagement from './pages/ClientManagement';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientOnboardingWizard from './pages/ClientOnboardingWizard';
import ClientPlanBuilder from './pages/ClientPlanBuilder';
import ClientPlanManagement from './pages/ClientPlanManagement';
import ClientPlans from './pages/ClientPlans';
import ClientProgressAnalytics from './pages/ClientProgressAnalytics';
import ClientRecipes from './pages/ClientRecipes';
import ClientReports from './pages/ClientReports';
import ClientResourceLibrary from './pages/ClientResourceLibrary';
import ClientResourceTracker from './pages/ClientResourceTracker';
import ClientWeeklyMealPlans from './pages/ClientWeeklyMealPlans';
import ClinicalIntake from './pages/ClinicalIntake';
import CoachPaymentSetup from './pages/CoachPaymentSetup';
import CoachSubscription from './pages/CoachSubscription';
import CoachSubscriptions from './pages/CoachSubscriptions';
import Communication from './pages/Communication';
import CouponManagement from './pages/CouponManagement';
import DailyProgressLogger from './pages/DailyProgressLogger';
import DietitianDashboard from './pages/DietitianDashboard';
import Documentation from './pages/Documentation';
import FeatureControl from './pages/FeatureControl';
import FoodLog from './pages/FoodLog';
import FoodLookup from './pages/FoodLookup';
import GoogleCalendarSettings from './pages/GoogleCalendarSettings';
import HealthCoachPlans from './pages/HealthCoachPlans';
import HealthReportAnalysis from './pages/HealthReportAnalysis';
import Home from './pages/Home';
import IncomeExpense from './pages/IncomeExpense';
import InstallmentTracker from './pages/InstallmentTracker';
import LeadsPipeline from './pages/LeadsPipeline';
import MPESSTracker from './pages/MPESSTracker';
import MarketingHub from './pages/MarketingHub';
import MealPhotoAnalysis from './pages/MealPhotoAnalysis';
import MealPlanner from './pages/MealPlanner';
import MealPlansPro from './pages/MealPlansPro';
import MyAssessment from './pages/MyAssessment';
import MyAssignedMealPlan from './pages/MyAssignedMealPlan';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import PaymentGatewaySettings from './pages/PaymentGatewaySettings';
import PaymentHistory from './pages/PaymentHistory';
import PaymentSetup from './pages/PaymentSetup';
import PaymentTracking from './pages/PaymentTracking';
import PlatformBrandingTracker from './pages/PlatformBrandingTracker';
import PlatformColorCustomization from './pages/PlatformColorCustomization';
import PricingPlans from './pages/PricingPlans';
import Profile from './pages/Profile';
import ProgressTracking from './pages/ProgressTracking';
import ProjectManagement from './pages/ProjectManagement';
import PublicPlanPurchase from './pages/PublicPlanPurchase';
import PurchaseAICredits from './pages/PurchaseAICredits';
import PurchaseClientPlan from './pages/PurchaseClientPlan';
import PurchaseCoachPlan from './pages/PurchaseCoachPlan';
import RecipeManagement from './pages/RecipeManagement';
import Recipes from './pages/Recipes';
import ResourceLibrary from './pages/ResourceLibrary';
import ResourceLibraryEnhanced from './pages/ResourceLibraryEnhanced';
import SecuritySettings from './pages/SecuritySettings';
import StudentTraining from './pages/StudentTraining';
import TaskBoard from './pages/TaskBoard';
import TeamAppointmentsCalendar from './pages/TeamAppointmentsCalendar';
import TeamDashboard from './pages/TeamDashboard';
import TeamManagement from './pages/TeamManagement';
import TeamSetup from './pages/TeamSetup';
import TemplateLibrary from './pages/TemplateLibrary';
import TemplateLibraryManager from './pages/TemplateLibraryManager';
import UserPermissionManagement from './pages/UserPermissionManagement';
import VoiceCalendarAssistant from './pages/VoiceCalendarAssistant';
import WebinarManagement from './pages/WebinarManagement';
import WebinarPerformanceTracker from './pages/WebinarPerformanceTracker';
import WeeklyMealPlans from './pages/WeeklyMealPlans';
import WhiteLabelSubscription from './pages/WhiteLabelSubscription';
import CoachReferralLink from './pages/CoachReferralLink';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddTeamAppointment": AddTeamAppointment,
    "AdminSubscriptionManager": AdminSubscriptionManager,
    "Appointments": Appointments,
    "AssessmentTemplates": AssessmentTemplates,
    "BroadcastNotification": BroadcastNotification,
    "BulkImport": BulkImport,
    "BulkStudentOnboarding": BulkStudentOnboarding,
    "BusinessGPTs": BusinessGPTs,
    "BusinessHub": BusinessHub,
    "BusinessPlan": BusinessPlan,
    "CallCenter": CallCenter,
    "CallCenterAdmin": CallCenterAdmin,
    "ClientAnalyticsDashboard": ClientAnalyticsDashboard,
    "ClientAppointments": ClientAppointments,
    "ClientAssessments": ClientAssessments,
    "ClientCommunication": ClientCommunication,
    "ClientCommunicationHub": ClientCommunicationHub,
    "ClientDashboard": ClientDashboard,
    "ClientFinanceManager": ClientFinanceManager,
    "ClientManagement": ClientManagement,
    "ClientOnboarding": ClientOnboarding,
    "ClientOnboardingWizard": ClientOnboardingWizard,
    "ClientPlanBuilder": ClientPlanBuilder,
    "ClientPlanManagement": ClientPlanManagement,
    "ClientPlans": ClientPlans,
    "ClientProgressAnalytics": ClientProgressAnalytics,
    "ClientRecipes": ClientRecipes,
    "ClientReports": ClientReports,
    "ClientResourceLibrary": ClientResourceLibrary,
    "ClientResourceTracker": ClientResourceTracker,
    "ClientWeeklyMealPlans": ClientWeeklyMealPlans,
    "ClinicalIntake": ClinicalIntake,
    "CoachPaymentSetup": CoachPaymentSetup,
    "CoachSubscription": CoachSubscription,
    "CoachSubscriptions": CoachSubscriptions,
    "Communication": Communication,
    "CouponManagement": CouponManagement,
    "DailyProgressLogger": DailyProgressLogger,
    "DietitianDashboard": DietitianDashboard,
    "Documentation": Documentation,
    "FeatureControl": FeatureControl,
    "FoodLog": FoodLog,
    "FoodLookup": FoodLookup,
    "GoogleCalendarSettings": GoogleCalendarSettings,
    "HealthCoachPlans": HealthCoachPlans,
    "HealthReportAnalysis": HealthReportAnalysis,
    "Home": Home,
    "IncomeExpense": IncomeExpense,
    "InstallmentTracker": InstallmentTracker,
    "LeadsPipeline": LeadsPipeline,
    "MPESSTracker": MPESSTracker,
    "MarketingHub": MarketingHub,
    "MealPhotoAnalysis": MealPhotoAnalysis,
    "MealPlanner": MealPlanner,
    "MealPlansPro": MealPlansPro,
    "MyAssessment": MyAssessment,
    "MyAssignedMealPlan": MyAssignedMealPlan,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "PaymentGatewaySettings": PaymentGatewaySettings,
    "PaymentHistory": PaymentHistory,
    "PaymentSetup": PaymentSetup,
    "PaymentTracking": PaymentTracking,
    "PlatformBrandingTracker": PlatformBrandingTracker,
    "PlatformColorCustomization": PlatformColorCustomization,
    "PricingPlans": PricingPlans,
    "Profile": Profile,
    "ProgressTracking": ProgressTracking,
    "ProjectManagement": ProjectManagement,
    "PublicPlanPurchase": PublicPlanPurchase,
    "PurchaseAICredits": PurchaseAICredits,
    "PurchaseClientPlan": PurchaseClientPlan,
    "PurchaseCoachPlan": PurchaseCoachPlan,
    "RecipeManagement": RecipeManagement,
    "Recipes": Recipes,
    "ResourceLibrary": ResourceLibrary,
    "ResourceLibraryEnhanced": ResourceLibraryEnhanced,
    "SecuritySettings": SecuritySettings,
    "StudentTraining": StudentTraining,
    "TaskBoard": TaskBoard,
    "TeamAppointmentsCalendar": TeamAppointmentsCalendar,
    "TeamDashboard": TeamDashboard,
    "TeamManagement": TeamManagement,
    "TeamSetup": TeamSetup,
    "TemplateLibrary": TemplateLibrary,
    "TemplateLibraryManager": TemplateLibraryManager,
    "UserPermissionManagement": UserPermissionManagement,
    "VoiceCalendarAssistant": VoiceCalendarAssistant,
    "WebinarManagement": WebinarManagement,
    "WebinarPerformanceTracker": WebinarPerformanceTracker,
    "WeeklyMealPlans": WeeklyMealPlans,
    "WhiteLabelSubscription": WhiteLabelSubscription,
    "CoachReferralLink": CoachReferralLink,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};