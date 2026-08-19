import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BetsList } from "./pages/BetsList";
import { BetForm } from "./pages/BetForm";
import { BetDetail } from "./pages/BetDetail";
import { BetEdit } from "./pages/BetEdit";
import { DistributionCalculator } from "./pages/DistributionCalculator";
import { FreeBetCalculator } from "./pages/FreeBetCalculator";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bets"
            element={
              <ProtectedRoute>
                <BetsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bets/new"
            element={
              <ProtectedRoute>
                <BetForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bets/:id"
            element={
              <ProtectedRoute>
                <BetDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bets/:id/edit"
            element={
              <ProtectedRoute>
                <BetEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/distribution"
            element={
              <ProtectedRoute>
                <DistributionCalculator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculators/free-bet"
            element={
              <ProtectedRoute>
                <FreeBetCalculator />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
