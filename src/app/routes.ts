import { createBrowserRouter } from "react-router";
import { Onboarding } from "./components/Onboarding";
import { Permissions } from "./components/Permissions";
import { MainDashboard } from "./components/MainDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Onboarding,
  },
  {
    path: "/permissions",
    Component: Permissions,
  },
  {
    path: "/dashboard",
    Component: MainDashboard,
  },
]);
