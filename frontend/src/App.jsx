import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import Dashboard     from "./pages/Dashboard";
import LiveTracking  from "./pages/LiveTracking";
import Alerts        from "./pages/Alerts";
import Billing       from "./pages/Billing";
import Geofences     from "./pages/Geofences";
import Devices       from "./pages/Devices";
import Trips         from "./pages/Trips";
import DriverScore   from "./pages/DriverScore";
import Users         from "./pages/Users";
import Reports       from "./pages/Reports";
import Settings      from "./pages/Settings";
import Support       from "./pages/Support";
import Navbar        from "./components/Navbar";
import Sidebar       from "./components/Sidebar";
import DeviceTest    from "./pages/DeviceTest";

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Layout({ children }) {
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8fafc" }}>
      <Sidebar />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"auto" }}>
        <Navbar />
        <main style={{ flex:1, padding:"24px" }}>{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/"           element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/tracking"   element={<Protected><Layout><LiveTracking /></Layout></Protected>} />
          <Route path="/devices"    element={<Protected><Layout><Devices /></Layout></Protected>} />
          <Route path="/trips"      element={<Protected><Layout><Trips /></Layout></Protected>} />
          <Route path="/alerts"     element={<Protected><Layout><Alerts /></Layout></Protected>} />
          <Route path="/geofences"  element={<Protected><Layout><Geofences /></Layout></Protected>} />
          <Route path="/driver-score" element={<Protected><Layout><DriverScore /></Layout></Protected>} />
          <Route path="/billing"    element={<Protected><Layout><Billing /></Layout></Protected>} />
          <Route path="/reports"    element={<Protected><Layout><Reports /></Layout></Protected>} />
          <Route path="/users"      element={<Protected roles={["ADMIN","SUPER_ADMIN","RESELLER"]}><Layout><Users /></Layout></Protected>} />
          <Route path="/support"    element={<Protected><Layout><Support /></Layout></Protected>} />
          <Route path="/settings"   element={<Protected><Layout><Settings /></Layout></Protected>} />
          <Route path="/device-test" element={<Protected roles={["ADMIN","SUPER_ADMIN"]}><DeviceTest /></Protected>} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
