"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Heart, ThumbsDown, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

const AccessibleIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const InaccessibleIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const STANFORD_COORDS: [number, number] = [37.4275, -122.1697];

const INITIAL_PLACES = [
  {
    id: 1,
    name: 'Jen-Hsun Huang Engineering Center',
    coordinates: [37.4299, -122.1753] as [number, number],
    accessible: true,
    username: 'user123',
    description: 'This building is fully accessible with ramps and elevators.',
    likes: 10,
    dislikes: 2,
  },
  {
    id: 2,
    name: 'Stanford Library',
    coordinates: [37.4263, -122.1664] as [number, number],
    accessible: false,
    username: 'user456',
    description: 'No wheelchair access to the main entrance.',
    likes: 5,
    dislikes: 8,
  },
];

interface Feedback {
    likes: number;
    dislikes: number;
    clicked: 'like' | 'dislike' | null;
}  

// Modified CenterMarker now accepts a callback to update the selected position
function CenterMarker({ onPositionChange }: { onPositionChange?: (position: [number, number]) => void }) {
  const map = useMap();
  const [position, setPosition] = useState(map.getCenter());

  useEffect(() => {
    const updatePosition = () => {
      const newCenter = map.getCenter();
      setPosition(newCenter);
      if (onPositionChange) onPositionChange([newCenter.lat, newCenter.lng]);
    };
    // Using 'moveend' ensures we update after the user stops panning
    map.on('moveend', updatePosition);
    // Also update immediately on mount
    updatePosition();
    return () => {
      map.off('moveend', updatePosition);
    };
  }, [map, onPositionChange]);

  return (
    <Marker
      position={position}
      icon={L.divIcon({
        className: 'center-marker',
        iconSize: [32, 32],
        html: `<svg viewBox="0 0 24 24" fill="none" stroke="blue" stroke-width="2">
                 <path d="M12 2v20M2 12h20"/>
               </svg>`
      })}
      interactive={false}
    />
  );
}

export default function Map() {
  const [places, setPlaces] = useState(INITIAL_PLACES);
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    description: '',
    accessible: true,
  });
  // This state now holds the center position from the modal map (i.e. the crosshair)
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>(
    INITIAL_PLACES.reduce<Record<number, Feedback>>((acc, place) => {
      acc[place.id] = {
        likes: place.likes,
        dislikes: place.dislikes,
        clicked: null,
      };
      return acc;
    }, {})
  );

  const handleFeedback = (placeId: number, type: 'like' | 'dislike') => {
    setFeedback((prev) => {
      const currentFeedback = prev[placeId];
      const feedbackKey = type === 'like' ? 'likes' : 'dislikes';
  
      if (currentFeedback.clicked === type) {
        return {
          ...prev,
          [placeId]: {
            ...currentFeedback,
            [feedbackKey]: currentFeedback[feedbackKey] - 1,
            clicked: null,
          },
        };
      } else if (currentFeedback.clicked) {
        return {
          ...prev,
          [placeId]: {
            likes: type === 'like' ? currentFeedback.likes + 1 : currentFeedback.likes - 1,
            dislikes: type === 'dislike' ? currentFeedback.dislikes + 1 : currentFeedback.dislikes - 1,
            clicked: type,
          },
        };
      } else {
        return {
          ...prev,
          [placeId]: {
            ...currentFeedback,
            [feedbackKey]: currentFeedback[feedbackKey] + 1,
            clicked: type,
          },
        };
      }
    });
  };
  

  // Set an initial center for the add-pin modal (using geolocation if available)
  useEffect(() => {
    if (showAddPinModal) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedPosition([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location', error);
          setSelectedPosition(STANFORD_COORDS);
        }
      );
    }
  }, [showAddPinModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;

    const newPlace = {
      id: places.length + 1,
      name: formData.name,
      coordinates: selectedPosition,
      accessible: formData.accessible,
      username: formData.username,
      description: formData.description,
      likes: 0,
      dislikes: 0,
    };

    setPlaces([...places, newPlace]);
    setFeedback(prev => ({
      ...prev,
      [newPlace.id]: { likes: 0, dislikes: 0, clicked: null }
    }));
    setShowAddPinModal(false);
    setFormData({ username: '', name: '', description: '', accessible: true });
    setSelectedPosition(null);
  };

  // No longer using AddPinMap or a draggable Marker.
  // Instead, the CenterMarker in the modal will update the selectedPosition automatically.

  const handleUseCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedPosition([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error('Error getting location', error);
        alert('Unable to retrieve your location. Please adjust the map manually.');
      }
    );
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={STANFORD_COORDS}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {places.map((place) => {
          const { likes, dislikes, clicked } = feedback[place.id];
          return (
            <Marker
              key={place.id}
              position={place.coordinates}
              icon={place.accessible ? AccessibleIcon : InaccessibleIcon}
            >
              <Popup>
                <div>
                  <h3>{place.name}</h3>
                  <p><strong>Username:</strong> {place.username}</p>
                  <p><strong>Description:</strong> {place.description}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                      onClick={() => handleFeedback(place.id, 'like')}
                      style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: clicked === 'like' ? '#ff6b6b' : '#ccc',
                      }}
                    >
                      <Heart size={16} />
                      <span>Like ({likes})</span>
                    </div>
                    <div
                      onClick={() => handleFeedback(place.id, 'dislike')}
                      style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: clicked === 'dislike' ? '#6b6bff' : '#ccc',
                      }}
                    >
                      <ThumbsDown size={16} />
                      <span>Dislike ({dislikes})</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <button
        onClick={() => setShowAddPinModal(true)}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={24} />
      </button>

      {showAddPinModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[1001]">
          <div className="bg-white p-5 rounded-lg w-[80%] max-w-[600px] max-h-[90vh] overflow-auto">
            <h2 className="text-2xl font-bold text-black">Add New Location</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name:</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="text-black p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="text-black p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.accessible}
                    onChange={(e) => setFormData({ ...formData, accessible: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Accessible</span>
                </label>
              </div>

              <div className="relative h-[300px] w-full">
                <div className="absolute top-2 right-2 z-[1000] flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    Use Current Location
                  </button>
                </div>

                <MapContainer
                  center={selectedPosition || STANFORD_COORDS}
                  zoom={15}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {/* Use the CenterMarker to display a fixed crosshair and update selectedPosition */}
                  <CenterMarker onPositionChange={setSelectedPosition} />
                </MapContainer>
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddPinModal(false)}
                  className="text-black px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
