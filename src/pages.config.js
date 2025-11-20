import Home from './pages/Home';
import Profile from './pages/Profile';
import MealPlanner from './pages/MealPlanner';
import Recipes from './pages/Recipes';
import FoodLookup from './pages/FoodLookup';
import MPESSTracker from './pages/MPESSTracker';
import DietitianDashboard from './pages/DietitianDashboard';
import ClientManagement from './pages/ClientManagement';
import BusinessPlan from './pages/BusinessPlan';
import MarketingHub from './pages/MarketingHub';
import PaymentSetup from './pages/PaymentSetup';
import Appointments from './pages/Appointments';
import Communication from './pages/Communication';
import ClientCommunication from './pages/ClientCommunication';
import Documentation from './pages/Documentation';
import MyAssignedMealPlan from './pages/MyAssignedMealPlan';
import FoodLog from './pages/FoodLog';
import ProgressTracking from './pages/ProgressTracking';
import TeamManagement from './pages/TeamManagement';
import BusinessGPTs from './pages/BusinessGPTs';
import BusinessHub from './pages/BusinessHub';
import LeadsPipeline from './pages/LeadsPipeline';
import WebinarManagement from './pages/WebinarManagement';
import PaymentTracking from './pages/PaymentTracking';
import TaskBoard from './pages/TaskBoard';
import TeamDashboard from './pages/TeamDashboard';
import ProjectManagement from './pages/ProjectManagement';
import CallCenter from './pages/CallCenter';
import CallCenterAdmin from './pages/CallCenterAdmin';
import BulkImport from './pages/BulkImport';
import TeamAttendance from './pages/TeamAttendance';
import IncomeExpense from './pages/IncomeExpense';
import InstallmentTracker from './pages/InstallmentTracker';
import VerticalManagement from './pages/VerticalManagement';
import TemplateLibraryManager from './pages/TemplateLibraryManager';
import TemplateLibrary from './pages/TemplateLibrary';
import UsageDashboard from './pages/UsageDashboard';
import TeamSetup from './pages/TeamSetup';
import WebinarPerformanceTracker from './pages/WebinarPerformanceTracker';
import ClientFinanceManager from './pages/ClientFinanceManager';
import ClinicalIntake from './pages/ClinicalIntake';
import MealPlansPro from './pages/MealPlansPro';
import PlatformReference from './pages/PlatformReference';
import PricingPlans from './pages/PricingPlans';
import NotificationSettings from './pages/NotificationSettings';
import SecuritySettings from './pages/SecuritySettings';
import FeatureControl from './pages/FeatureControl';
import PaymentGatewaySettings from './pages/PaymentGatewaySettings';
import ClientPlanManagement from './pages/ClientPlanManagement';
import PaymentHistory from './pages/PaymentHistory';
import CoachSubscription from './pages/CoachSubscription';
import ClientPlans from './pages/ClientPlans';
import WhiteLabelSubscription from './pages/WhiteLabelSubscription';
import UserPermissionManagement from './pages/UserPermissionManagement';
import HealthCoachPlans from './pages/HealthCoachPlans';
import CoachSubscriptions from './pages/CoachSubscriptions';
import ClientPlanBuilder from './pages/ClientPlanBuilder';
import CoachPaymentSetup from './pages/CoachPaymentSetup';
import AdminSubscriptionManager from './pages/AdminSubscriptionManager';
import CustomDomainSettings from './pages/CustomDomainSettings';
import ClientAnalyticsDashboard from './pages/ClientAnalyticsDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Profile": Profile,
    "MealPlanner": MealPlanner,
    "Recipes": Recipes,
    "FoodLookup": FoodLookup,
    "MPESSTracker": MPESSTracker,
    "DietitianDashboard": DietitianDashboard,
    "ClientManagement": ClientManagement,
    "BusinessPlan": BusinessPlan,
    "MarketingHub": MarketingHub,
    "PaymentSetup": PaymentSetup,
    "Appointments": Appointments,
    "Communication": Communication,
    "ClientCommunication": ClientCommunication,
    "Documentation": Documentation,
    "MyAssignedMealPlan": MyAssignedMealPlan,
    "FoodLog": FoodLog,
    "ProgressTracking": ProgressTracking,
    "TeamManagement": TeamManagement,
    "BusinessGPTs": BusinessGPTs,
    "BusinessHub": BusinessHub,
    "LeadsPipeline": LeadsPipeline,
    "WebinarManagement": WebinarManagement,
    "PaymentTracking": PaymentTracking,
    "TaskBoard": TaskBoard,
    "TeamDashboard": TeamDashboard,
    "ProjectManagement": ProjectManagement,
    "CallCenter": CallCenter,
    "CallCenterAdmin": CallCenterAdmin,
    "BulkImport": BulkImport,
    "TeamAttendance": TeamAttendance,
    "IncomeExpense": IncomeExpense,
    "InstallmentTracker": InstallmentTracker,
    "VerticalManagement": VerticalManagement,
    "TemplateLibraryManager": TemplateLibraryManager,
    "TemplateLibrary": TemplateLibrary,
    "UsageDashboard": UsageDashboard,
    "TeamSetup": TeamSetup,
    "WebinarPerformanceTracker": WebinarPerformanceTracker,
    "ClientFinanceManager": ClientFinanceManager,
    "ClinicalIntake": ClinicalIntake,
    "MealPlansPro": MealPlansPro,
    "PlatformReference": PlatformReference,
    "PricingPlans": PricingPlans,
    "NotificationSettings": NotificationSettings,
    "SecuritySettings": SecuritySettings,
    "FeatureControl": FeatureControl,
    "PaymentGatewaySettings": PaymentGatewaySettings,
    "ClientPlanManagement": ClientPlanManagement,
    "PaymentHistory": PaymentHistory,
    "CoachSubscription": CoachSubscription,
    "ClientPlans": ClientPlans,
    "WhiteLabelSubscription": WhiteLabelSubscription,
    "UserPermissionManagement": UserPermissionManagement,
    "HealthCoachPlans": HealthCoachPlans,
    "CoachSubscriptions": CoachSubscriptions,
    "ClientPlanBuilder": ClientPlanBuilder,
    "CoachPaymentSetup": CoachPaymentSetup,
    "AdminSubscriptionManager": AdminSubscriptionManager,
    "CustomDomainSettings": CustomDomainSettings,
    "ClientAnalyticsDashboard": ClientAnalyticsDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};