import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"; // futura página
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
          // aquí luego agregas más rutas internas protegidas
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
