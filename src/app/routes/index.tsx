import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";

const router = createBrowserRouter([
    {
        path: "/",
        element: <LoginPage />,
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};
