import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tracker from "@/pages/Tracker";
import Devices from "@/pages/Devices";
import Geofences from "@/pages/Geofences";
import Events from "@/pages/Events";
import Nav from "@/components/Nav";
import { fixLeafletIcons } from "@/lib/leafletIcon";

fixLeafletIcons();

function App() {
  return (
    <div className="App min-h-screen bg-[#09090B] text-[#F4F4F5]">
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/tracker/:code" element={<Tracker />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/geofences" element={<Geofences />} />
          <Route path="/events" element={<Events />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

export default App;
