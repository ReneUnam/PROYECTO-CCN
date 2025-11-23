import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/registerPage";
import TermsAndConditions from "@/features/auth/pages/Terms-and-conditionsPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { QuestionsPage } from "@/features/questions/pages/QuestionsPage";
import MaterialsList from '@/features/materials/pages/MaterialsList';
import { Layout } from "@/core/components/Layout";
import { RequireAuth, RequireAdmin } from "./route-guards";
import { AssignmentSessionPage } from "@/features/questions/pages/AssignmentSessionPage";
import { JournalHubPage } from "@/features/journal/pages/JournalHubPage";
import { JournalTypePage } from "@/features/journal/pages/JournalTypePage";
import { JournalEmotionSessionPage } from "@/features/journal/pages/sessions/JournalEmotionSessionPage";
import { JournalSelfCareSessionPage } from "@/features/journal/pages/sessions/JournalSelfCareSessionPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import ConfirmEmailPage from "@/features/auth/pages/ConfirmEmailPage";
import VerifyEmailPage from "@/features/auth/pages/VerifyEmailPage";
import AdminAssignmentsPage from "@/features/questions/pages/AdminAssignmentsPage";
import AdminQuestionsDashboard from "@/features/questions/pages/AdminQuestionsDashboard";
import { JournalAdminPage } from "@/features/journal/pages/JournalAdminPage";
import MailboxPage from "@/features/mailbox/pages/MailboxPage";
import AdminMailboxPage from "@/features/mailbox/pages/AdminMailboxPage";
import ChatWindow from "@/features/chatbot/components/ChatWindow";
import AdminPanel from '@/features/admin';

const router = createBrowserRouter([
  
  // Públicas
  { path: '/login', element: <LoginPage /> },
  { path: '/terms', element: <TermsAndConditions /> },
  { path: '/auth/confirm-email', element: <ConfirmEmailPage /> },
  { path: '/auth/verify-email', element: <VerifyEmailPage /> },

  // Rutas privadas (requiere sesión)
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/dashboard", element:<DashboardPage /> },
          { path: "/resources", element: <MaterialsList /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/questions", element: <QuestionsPage /> },
          { path: "/questions/session/:assignmentId", element: <AssignmentSessionPage /> },
          { path: "/journal", element: <JournalHubPage /> },
          { path: "/journal/emotions", element: <JournalTypePage type="emotions" /> },
          { path: "/journal/self-care", element: <JournalTypePage type="self-care" /> },
          { path: "/journal/session/emotions", element: <JournalEmotionSessionPage /> },
          { path: "/journal/session/self-care", element: <JournalSelfCareSessionPage /> },
          { path: "/forum", element: <MailboxPage /> },
          { path: "/chatbot", element: <ChatWindow /> },

          // Solo administradores
          {
            element: <RequireAdmin />,
            children: [
              { path: "/register", element: <RegisterPage /> },
              { path: "/admin/assignments/manage", element: <AdminAssignmentsPage /> },
              { path: "/admin/questions/dashboard", element: <AdminQuestionsDashboard /> },
              { path: "/admin/journal", element: <JournalAdminPage /> },
              { path: "/admin/mailbox", element: <AdminMailboxPage /> },
              { path: "/admin/alerts", element: <AdminPanel /> },
            ],
          },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;