import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/globals.css";

const platformSteps = [
  {
    element: '.sidebar-header',
    popover: {
      title: 'Welcome to Mealie!',
      description: 'This is your branding section. Your logo and business name appear here, creating a white-labeled experience for your clients.'
    }
  },
  {
    element: '#dietitian-tools-nav',
    popover: {
      title: 'Dietitian Tools',
      description: 'This is your command center for client management. You can manage clients, create meal plans, schedule appointments, and communicate with your clients.'
    }
  },
  {
    element: '#payment-plans-nav',
    popover: {
      title: 'Payment & Plans',
      description: 'Manage your subscription, client payment plans, payment gateway, and view your payment history here.'
    }
  },
  {
    element: '#business-tools-nav',
    popover: {
      title: 'Business Tools',
      description: 'Access tools to grow your business, like marketing, team management, and platform branding.'
    }
  },
    {
    element: '.sidebar-footer',
    popover: {
      title: 'Your Profile',
      description: 'Your profile information is displayed here. You can also log out from this section.'
    }
  },
  {
    element: '#notification-bell-container',
    popover: {
        title: 'Notifications',
        description: 'Stay updated with notifications about client activities and important alerts.'
    }
  },
  {
    element: '#start-tour-button',
    popover: {
      title: 'Start Tour',
      description: 'You can restart this platform guide anytime by clicking this button.'
    }
  }
];

export const startPlatformTour = () => {
  const driverObj = driver({
      showProgress: true,
      popoverClass: 'dashboard-tour-popover',
      steps: platformSteps
  });
  driverObj.drive();
};