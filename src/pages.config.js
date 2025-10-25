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
import Layout from './Layout.jsx';


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
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};