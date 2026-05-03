import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Fix for default Leaflet icons
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- FEATURE 1: ROUTING COMPONENT ---
function RoutingControl({ source, destination }) {
  const map = useMap();
  const routingRef = useRef(null);

  useEffect(() => {
    if (!map || !destination) return;

    if (routingRef.current) {
      map.removeControl(routingRef.current);
    }

    routingRef.current = L.Routing.control({
      waypoints: [L.latLng(source[0], source[1]), L.latLng(destination[0], destination[1])],
      lineOptions: { styles: [{ color: "#a855f7", weight: 6 }] },
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false, 
    }).addTo(map);

    return () => {
        if (routingRef.current) map.removeControl(routingRef.current);
    }
  }, [map, source, destination]);

  return null;
}

function App() {
  const [position, setPosition] = useState([22.5726, 88.3639]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState(5000);
  const [target, setTarget] = useState(null); 
  
  // --- FEATURE 2: FAVORITES (LocalStorage) ---
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("my-places");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("my-places", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (place) => {
    const isFav = favorites.find(f => f.id === place.id);
    if (isFav) {
      setFavorites(favorites.filter(f => f.id !== place.id));
    } else {
      setFavorites([...favorites, place]);
    }
  };

  // --- FEATURE 3: GEOFENCING LOGIC ---
  useEffect(() => {
    const watchID = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);

        // Check if user is near any searched place
        places.forEach(p => {
          const dist = L.latLng(newPos).distanceTo([p.lat, p.lon]);
          if (dist < 500) {
            console.log(`Alert: Within 500m of ${p.tags.name || 'a destination'}`);
          }
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchID);
  }, [places]);

  const findNearby = async (category) => {
    setLoading(true);
    setTarget(null); 
    
    // Mapping our friendly names to OSM Overpass Tags
    const tags = {
      restaurant: 'node["amenity"="restaurant"]',
      mall: 'node["shop"="mall"]',
      hospital: 'node["amenity"="hospital"]',
      cinema: 'node["amenity"="cinema"]',
      "Railway station": 'node["railway"="station"]'
    };

    const activeTag = tags[category];
    const query = `[out:json];${activeTag}(around:${range},${position[0]},${position[1]});out;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      setPlaces(data.elements || []);
    } catch (error) { 
      console.error("Fetch Error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  // Helper to recenter map smoothly
  function RecenterMap({ coords }) {
    const map = useMap();
    useEffect(() => {
      map.setView(coords, map.getZoom());
    }, [coords, map]);
    return null;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 font-sans">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
         Find My Place
        </h1>
        <div className="flex justify-center gap-4 mt-2">
           <span className="text-[10px] bg-gray-800 px-2 py-1 rounded border border-gray-700">Favorites: {favorites.length}</span>
           <span className="text-[10px] bg-gray-800 px-2 py-1 rounded border border-gray-700 font-mono">GPS: {position[0].toFixed(3)}, {position[1].toFixed(3)}</span>
        </div>
      </header>

      <div className="h-72 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border-2 border-purple-500 mb-6 shadow-2xl relative">
        <MapContainer center={position} zoom={13} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={position}><Popup>You are here</Popup></Marker>
          <RecenterMap coords={position} />
          
          {target && <RoutingControl source={position} destination={target} />}

          {places.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lon]}>
              <Popup className="text-black font-bold">{p.tags.name || "Station/Point"}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Radius Slider Card */}
        <div className="bg-gray-800 p-5 rounded-2xl mb-8 border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">Search Radius</span>
            <span className="bg-purple-600 px-3 py-1 rounded-full text-xs font-bold tracking-widest">{range} METERS</span>
          </div>
          <input 
            type="range" 
            min="500" 
            max="15000" 
            step="500" 
            value={range} 
            onChange={(e) => setRange(Number(e.target.value))} 
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-pink-500 transition-all" 
          />
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {["restaurant", "mall", "hospital", "cinema", "Railway station"].map(cat => (
            <button 
              key={cat} 
              onClick={() => findNearby(cat)} 
              className="px-5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:bg-purple-600 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-md"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Enhanced Results List */}
        <div className="space-y-4 pb-20">
          {loading && <div className="text-center py-10 animate-pulse text-purple-400 tracking-tighter">SURVEYING LOCAL AREA...</div>}
          
          {places.length > 0 ? places.map((p, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-2xl border-l-4 border-purple-500 flex justify-between items-center shadow-lg group hover:bg-gray-800 transition-colors">
              <div>
                <h3 className="font-bold text-gray-100 group-hover:text-purple-300 transition-colors">{p.tags.name || "Unnamed Entry"}</h3>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Distance: {Math.round(L.latLng(position).distanceTo([p.lat, p.lon]))}m</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTarget([p.lat, p.lon])} 
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-[10px] font-bold uppercase transition-colors"
                >
                  🚀 Route
                </button>
                <button 
                  onClick={() => toggleFavorite(p)} 
                  className={`p-2 rounded-lg text-sm transition-all hover:scale-110 ${favorites.find(f => f.id === p.id) ? 'bg-pink-500/20 text-pink-500 border border-pink-500/50' : 'bg-gray-700 text-gray-400'}`}
                >
                  {favorites.find(f => f.id === p.id) ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          )) : !loading && (
            <div className="text-center py-10 text-gray-600 text-xs italic tracking-widest uppercase">
              No points found. Try increasing the radius or choosing a category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;