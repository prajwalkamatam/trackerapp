import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";

export function fixLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: icon2x,
    iconUrl: icon,
    shadowUrl: iconShadow,
  });
}

export function pulseIcon(color = "#F59E0B") {
  const html = `<div style="position:relative;width:14px;height:14px">
    <div style="width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 2px #09090B, 0 0 0 4px ${color}55"></div>
    <div style="position:absolute;inset:-6px;border-radius:9999px;border:2px solid ${color};animation:pulse-ring 1.8s ease-out infinite"></div>
  </div>`;
  return L.divIcon({ className: "trailbeacon-pulse", html, iconSize: [14, 14], iconAnchor: [7, 7] });
}
