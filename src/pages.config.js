import Home from './pages/Home';
import Profile from './pages/Profile';
import MealPlanner from './pages/MealPlanner';
import Recipes from './pages/Recipes';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Profile": Profile,
    "MealPlanner": MealPlanner,
    "Recipes": Recipes,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};