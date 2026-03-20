import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Archive from "./pages/Archive";
import Login from "./pages/Login";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<"login" | "archive">(() =>
    user ? "archive" : "login",
  );

  const handleLogin = () => setView("archive");
  const handleLogout = () => {
    logout();
    setView("login");
  };

  if (user && view === "archive") {
    return <Archive onLogout={handleLogout} />;
  }

  return <Login onLogin={handleLogin} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}
