import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/registerPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { QuestionsPage } from "@/features/dashboard/pages/QuestionsPage";
import { Layout } from "@/core/components/Layout";
import { RouteGuard } from "./route-guards";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <RouteGuard />,
    children: [
      {
        // Layout con Navbar + Sidebar + Outlet
        element: <Layout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/questions",
            element: <QuestionsPage/>
          }
          // aquí luego agregas más rutas internas protegidas
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
