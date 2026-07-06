import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tracker from "@/pages/Tracker";
import Devices from "@/pages/Devices";
import Geofences from "@/pages/Geofences";
import Events from "@/pages/Events";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { fixLeafletIcons } from "@/lib/leafletIcon";

fixLeafletIcons();

const Protected = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function App() {
  return (
    <div className="App min-h-screen bg-[#09090B] text-[#F4F4F5]">
      <BrowserRouter>
        <AuthProvider>
          <Nav />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Tracker is public: the beacon (old phone) does not log in */}
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/tracker/:code" element={<Tracker />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/devices" element={<Protected><Devices /></Protected>} />
            <Route path="/geofences" element={<Protected><Geofences /></Protected>} />
            <Route path="/events" element={<Protected><Events /></Protected>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

export default App;
