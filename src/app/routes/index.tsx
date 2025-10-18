import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from '@/features/auth/pages/registerPage';

// import {TestAuthfrom "@/features/auth/pages/testAuth";

const router = createBrowserRouter([
    {
        path: "/",
        element: <LoginPage />,
    },
    {
        path: "/register",
        element: <RegisterPage />,
    }
    // {
    //     path: "/test-auth",
    //     element: <TestAuth />,
    // },
    
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};
