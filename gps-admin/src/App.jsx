import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./api/auth/AuthContext";
import ProtectedRoute from "./api/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Users from "./pages/Users";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"   element={<Login />} />
          <Route path="/"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
          <Route path="/alerts"  element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/users"   element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
