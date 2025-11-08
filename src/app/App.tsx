import { AppRouter } from "./routes";
import { ConfirmProvider } from "@/components/confirm/ConfirmProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";

export function App() {
  return (
      <ConfirmProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </ConfirmProvider>
  );
}
