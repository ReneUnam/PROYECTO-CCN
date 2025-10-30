import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/registerPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { QuestionsPage } from "@/features/questions/pages/QuestionsPage";
import { Layout } from "@/core/components/Layout";
import { RouteGuard } from "./route-guards";
import { AssignmentSessionPage } from "@/features/questions/pages/AssignmentSessionPage";
import { JournalHubPage } from "@/features/journal/pages/JournalHubPage";
import { JournalTypePage } from "@/features/journal/pages/JournalTypePage";
import { JournalEmotionSessionPage } from "@/features/journal/pages/sessions/JournalEmotionSessionPage";
import { JournalSelfCareSessionPage } from "@/features/journal/pages/sessions/JournalSelfCareSessionPage";

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
            element: <QuestionsPage />
          }, {
            path: "/questions/session/:id",
            element: <AssignmentSessionPage />
          },
          {
            path: "/journal",
            element: <JournalHubPage />,
          },
          {
            path: "/journal/emotions",
            element: <JournalTypePage type="emotions" />,
          },
          {
            path: "/journal/self-care",
            element: <JournalTypePage type="self-care" />,
          },
          {
            path: "/journal/session/emotions",
            element: <JournalEmotionSessionPage />,
          },
          {
            path: "/journal/session/self-care",
            element: <JournalSelfCareSessionPage />,
          }

          // aquí luego agregas más rutas internas protegidas
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
