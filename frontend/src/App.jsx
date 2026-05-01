import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon missing in React builds
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
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

  // 2. Fetch from Overpass API (Free Google Places Alternative)
  const findNearby = async (category) => {
    setLoading(true);
    const [lat, lng] = position;
    
    // Mapping your buttons to OpenStreetMap "Tags"
    const tags = {
      hospital: 'node["amenity"="hospital"]',
      mall: 'node["shop"="mall"]',
      cinema: 'node["amenity"="cinema"]',
      restaurant: 'node["amenity"="restaurant"]',
      "Railway station": 'node["railway"="station"]'
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
    map.setView(coords, map.getZoom());
    return null;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4">
      <h1 className="text-2xl text-center font-bold mb-4 text-purple-400"> Find My Place</h1>
      
      {/* The Map */}
      <div className="h-64 w-full rounded-lg overflow-hidden border-2 border-purple-500 mb-6">
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={position}><Popup>You are here</Popup></Marker>
          <RecenterMap coords={position} />
          
          {places.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lon]}>
              <Popup>{p.tags.name || "Unknown Place"}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Discovery Buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {['restaurant', 'mall', 'hospital', 'cinema', 'Railway station'].map(cat => (
          <button 
            key={cat}
            onClick={() => findNearby(cat)}
            className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-purple-400 transition-colors uppercase text-xs"
          >
            Nearby {cat}
          </button>
        ))}
        <div className="w-full flex items-center justify-center mt-4">  
        <h2 className="text-lg mt-2">Search Radius(meter):</h2>
        <input 
          type="number" 
          value={range} 
          onChange={(e) => setRange(e.target.value)} 
          className="ml-4 bg-gray-800 text-white text-lg px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-400  w-24"
          placeholder="Range (m)"
        />
        </div>
      </div>

      {/* Results List */}
      <div className="max-w-md mx-auto">
        {loading && <p className="text-center animate-bounce">Scanning the area...</p>}
        {places.map((p, i) => (
          <div key={i} className="bg-gray-800 p-3 rounded mb-2 border-l-4 border-green-500">
            <h3 className="font-bold">{p.tags.name || "Unnamed Point"}</h3>
            <p className="text-xs text-gray-400">Dist: ~{Math.round(L.latLng(position).distanceTo([p.lat, p.lon]))}m away</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;