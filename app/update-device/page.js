'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchUserDetails, fetchBinDevices, fetchWeatherDevices, updateDeviceSoftware } from '@/lib/dataProvider';
import dynamic from 'next/dynamic';
import { subscribeToTableChanges } from '@/lib/realtimeSubscription';
import { FaTrash, FaSun } from 'react-icons/fa';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function UpdateDevicesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState("bin");
  const [binHeight, setBinHeight] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mapDevices, setMapDevices] = useState([]);

  useEffect(() => {
    if (!session) {
      router.push('/login');
    } else {
      router.push('/update-device');
      fetchUserDetails(session.user.id).then(data => {
        if (!data) router.push('/login');
      });
      loadDevices(deviceType);

      const unsubscribe = subscribeToTableChanges(deviceType === 'bin' ? 'devices' : 'weather_sensors', () => {
        loadDevices(deviceType);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [session, router]);

  useEffect(() => {
    loadDevices(deviceType);

    const unsubscribe = subscribeToTableChanges(deviceType === 'bin' ? 'devices' : 'weather_sensors', () => {
      loadDevices(deviceType);
    });

    return () => {
      unsubscribe();
    };
  }, [deviceType]);

  useEffect(() => {
    if (selectedDeviceId) {
      const device = devices.find(d => d.unique_id === selectedDeviceId);
      setSelectedDevice(device);
      if (device) {
        setLatitude(device.lat);
        setLongitude(device.lng);
        setBinHeight(deviceType === "bin" ? device.bin_height : "");
      }
    } else {
      clearInputs();
    }
  }, [selectedDeviceId, devices, deviceType]);

  useEffect(() => {
    if (selectedDevice) {
      setMapDevices([selectedDevice]);
    } else {
      setMapDevices([]);
    }
  }, [selectedDevice]);

  const loadDevices = (type) => {
    if (type === "bin") {
      fetchBinDevices().then(data => setDevices(data));
    } else {
      fetchWeatherDevices().then(data => setDevices(data));
    }
  };

  const handleUpdateDevice = async () => {
    if (!selectedDeviceId) {
      setFormError("Please select a device.");
      return;
    }

    const updatedDevice = {
      id: selectedDeviceId,
      bin_height: deviceType === "bin" ? binHeight : null,
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
    };

    const { data, error } = await updateDeviceSoftware(updatedDevice, deviceType);

    if (error) {
      setFormError("Failed to update device. Please try again.");
    } else {
      setSuccessMessage("Device updated successfully.");
      setFormError(""); // Clear error message on successful submission

      // Clear the success message after a few seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
  };

  const clearInputs = () => {
    setSelectedDeviceId("");
    setBinHeight("");
    setLatitude("");
    setLongitude("");
    setSelectedDevice(null);
  };

  const handleMapClick = (latLng) => {
    setLatitude(latLng.lat);
    setLongitude(latLng.lng);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setFormError("Failed to get location. Please try again.");
        }
      );
    } else {
      setFormError("Geolocation is not supported by this browser.");
    }
  };

  const isFormDisabled = devices.length === 0;

  if (!session || !session.user) return null;

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      <div className="flex-1 lg:w-1/2 p-4">
        <main>
          <h1 className="text-2xl font-bold mb-4">Update Devices</h1>
          {formError && <p className="text-red-500 mb-4">{formError}</p>}
          {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
          <div className="mb-6">
            <select
              value={deviceType === 'bin' ? 'waste bins' : 'weather sensors'}
              onChange={(e) => {
                const newDeviceType = e.target.value === 'waste bins' ? 'bin' : 'weather';
                setDeviceType(newDeviceType);
                clearInputs();
              }}
              className={`p-2 border border-gray-300 rounded w-full mb-2`}
            >
              <option value="waste bins">
                <FaTrash className="inline mr-2" />Waste Bins
              </option>
              <option value="weather sensors">
                <FaSun className="inline mr-2" />Weather Sensors
              </option>
            </select>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                setFormError(""); // Clear any existing error when user changes the value
              }}
              className={`p-2 border border-gray-300 rounded w-full mb-2 ${isFormDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
              disabled={isFormDisabled}
            >
              <option value="">{devices.length > 0 ? "Select a device to update" : "No devices to update"}</option>
              {devices.map((device) => (
                <option key={device.id} value={device.unique_id}>
                  ID: {device.unique_id}, Battery: {device.battery}%, Level: {device.level}%
                </option>
              ))}
            </select>
            {deviceType === "bin" && (
              <input
                type="text"
                placeholder={selectedDevice ? `Current Height: ${selectedDevice.bin_height}` : "Bin Height..."}
                value={binHeight}
                onChange={(e) => {
                  setBinHeight(e.target.value);
                  setFormError(""); // Clear any existing error when user changes the value
                }}
                className={`p-2 border border-gray-300 rounded w-full mb-2 ${isFormDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                disabled={isFormDisabled}
              />
            )}
            <input
              type="text"
              placeholder={selectedDevice ? `Current Latitude: ${selectedDevice.lat}` : "Latitude..."}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className={`p-2 border border-gray-300 rounded w-full mb-2 ${isFormDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
              disabled={isFormDisabled}
            />
            <input
              type="text"
              placeholder={selectedDevice ? `Current Longitude: ${selectedDevice.lng}` : "Longitude..."}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className={`p-2 border border-gray-300 rounded w-full mb-2 ${isFormDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
              disabled={isFormDisabled}
            />
            <div className="mb-4">
              <button onClick={handleGetLocation} className={`p-2 bg-blue-500 text-white rounded mb-4 mr-4 ${isFormDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`} disabled={isFormDisabled}>
                Use My Location
              </button>
              <button onClick={handleUpdateDevice} className={`p-2 bg-green-500 text-white rounded ${isFormDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`} disabled={isFormDisabled}>
                Update Device
              </button>
            </div>
          </div>
        </main>
      </div>
      <div className="flex-1 lg:w-1/2 p-4">
        <MapView
          devices={mapDevices} // Pass the mapDevices to the map
          mapWidth="100%"
          mapHeight="600px"
          onClick={handleMapClick}
          userLocation={userLocation}
          showLegend={false}
        />
      </div>
    </div>
  );
}
