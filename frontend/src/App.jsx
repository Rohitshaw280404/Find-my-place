import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default Leaflet icon missing in React builds
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const [position, setPosition] = useState([22.5726, 88.3639]); // Default: Kolkata
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState(5000); // 5km default search radius

  // 1. Live Location Tracker
  useEffect(() => {
    const watchID = navigator.geolocation.watchPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchID);
  }, []);

  // 2. Fetch from Overpass API
  const findNearby = async (category) => {
    setLoading(true);
    const [lat, lng] = position;

    // Mapping buttons to OpenStreetMap Tags
    const tags = {
      restaurant: 'node["amenity"="restaurant"]',
      mall: 'node["shop"="mall"]',
      hospital: 'node["amenity"="hospital"]',
      cinema: 'node["amenity"="cinema"]',
      "Railway station": 'node["railway"="station"]',
    };

    const query = `[out:json];${tags[category]}(around:${range},${lat},${lng});out;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      setPlaces(data.elements || []);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper component to jump the map to your live location
  function RecenterMap({ coords }) {
    const map = useMap();
    useEffect(() => {
      map.setView(coords, map.getZoom());
    }, [coords, map]);
    return null;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 font-sans">
      <header className="mb-6">
        <h1 className="text-3xl text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Find My Place
        </h1>
     
      </header>

      {/* The Map Section */}
      <div className="h-72 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-purple-500 shadow-2xl shadow-purple-500/20 mb-8">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={position}>
            <Popup>You are here</Popup>
          </Marker>
          <RecenterMap coords={position} />

          {places.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lon]}>
              <Popup className="text-black">
                <strong className="block border-b mb-1">{p.tags.name || "Point of Interest"}</strong>
                <span className="text-xs text-gray-600 uppercase tracking-tighter">OSM Node: {p.id}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Controls Section */}
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Range Slider UI */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-purple-400">📏</span> Search Radius
            </h2>
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-mono shadow-md">
              {range >= 1000 ? `${(range / 1000).toFixed(1)} km` : `${range} m`}
            </span>
          </div>
          <input
            type="range"
            min="500"
            max="15000"
            step="500"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 transition-all hover:accent-purple-400"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">
            <span>0.5 km</span>
            <span>15 km</span>
          </div>
        </div>

        {/* Discovery Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          {["restaurant", "mall", "hospital", "cinema", "Railway station"].map((cat) => (
            <button
              key={cat}
              onClick={() => findNearby(cat)}
              className="group relative bg-gray-800 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-gray-700 active:scale-95"
            >
              <span className="relative z-10 uppercase text-xs tracking-wider">Nearby {cat}</span>
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="space-y-3 pb-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-70">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="animate-pulse tracking-widest uppercase text-xs">Scanning Map Data...</p>
            </div>
          ) : (
            places.map((p, i) => (
              <div
                key={i}
                className="group bg-gray-800 hover:bg-gray-750 p-4 rounded-xl border-l-4 border-purple-500 transition-all hover:scale-[1.02] cursor-default shadow-md"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg group-hover:text-purple-300 transition-colors">
                    {p.tags.name || "Unnamed Point"}
                  </h3>
                  <span className="text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-400">
                    {Math.round(L.latLng(position).distanceTo([p.lat, p.lon]))}m
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 italic">
                  {p.tags.amenity || p.tags.shop || p.tags.railway || "Facility"}
                </p>
              </div>
            ))
          )}
          {!loading && places.length === 0 && (
            <p className="text-center text-red-500 text-sm py-5 ">Select a category to find nearby locations.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;