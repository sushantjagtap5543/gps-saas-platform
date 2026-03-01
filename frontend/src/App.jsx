import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LiveTracking from "./pages/LiveTracking";
import Alerts from "./pages/Alerts";
import Billing from "./pages/Billing";
import Geofences from "./pages/Geofences";
import Navbar from "./components/Navbar";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return <><Navbar /><main style={{ minHeight: "calc(100vh - 56px)" }}>{children}</main></>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"          element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/tracking"  element={<Protected><Layout><LiveTracking /></Layout></Protected>} />
          <Route path="/alerts"    element={<Protected><Layout><Alerts /></Layout></Protected>} />
          <Route path="/billing"   element={<Protected><Layout><Billing /></Layout></Protected>} />
          <Route path="/geofences" element={<Protected><Layout><Geofences /></Layout></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
