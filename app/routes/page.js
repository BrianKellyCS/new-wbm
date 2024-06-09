// app/routes/page.js
'use client'
import React, { useState, useEffect } from "react";
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MapView from "@/components/MapView";
import {
  calculateFillRate,
  estimateHoursUntilFull,
  predictFullTime,
  binsDueForPickup,
  findLowFillRateBins,
} from "@/utils/binPredictions";
import { supabase } from '@/lib/supabaseClient';

const Routes = () => {
  const [devices, setDevices] = useState([]);
  const [predictedDevices, setPredictedDevices] = useState([]);
  const [newPredicted, setNewPredicted] = useState([]);
  const [historical, setHistorical] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [travelMode, setTravelMode] = useState("WALKING");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [directions, setDirections] = useState(null);
  const [devicesToWorkOn, setDevicesToWorkOn] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [filters, setFilters] = useState({
    changeBattery: true,
    emptyBin: true,
  });
  let fillRates;
  let numHours;
  let predictedTimes;
  let lowFillRateBins;

  useEffect(() => {
    if (predictedDevices.length > 0 && allDevices.length > 0) {
      const updatedDevices = allDevices.filter((device) =>
        predictedDevices.includes(device.unique_id)
      );
      setNewPredicted(updatedDevices);
    }
  }, [predictedDevices, allDevices]);

  const getDevices = async () => {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('is_registered', true)
      .order('unique_id');

    if (error) {
      console.error('Error fetching devices:', error);
    } else {
      let tmpAll = helperToConvertLevelToPercentage(data);
      setAllDevices(tmpAll);
      const filteredDevices = pickDevicesWithIssues(tmpAll);
      setDevices(filteredDevices);
    }
  };

  const getDevicesHistorical = async () => {
    const { data, error } = await supabase
      .from('historical')
      .select('*');

    if (error) {
      console.error('Error fetching historical data:', error);
    } else {
      setHistorical(data);
    }
  };

  useEffect(() => {
    if (historical.length > 0) {
      fillRates = calculateFillRate(historical);
      numHours = estimateHoursUntilFull(historical, fillRates);
      predictedTimes = predictFullTime(historical, numHours);
      let tmpArray = binsDueForPickup(predictedTimes, 6);
      setPredictedDevices(tmpArray);

      lowFillRateBins = findLowFillRateBins(fillRates);
    }
  }, [historical]);

  const mergeAndSetDevices = (filteredDevices) => {
    const filteredIds = new Set(filteredDevices.map((device) => device.unique_id));
    const uniquePredictedDevices = newPredicted.filter((device) => !filteredIds.has(device.unique_id));
    const combinedDevices = [...filteredDevices, ...uniquePredictedDevices];
    setDevices(combinedDevices);
  };

  useEffect(() => {
    if (newPredicted.length > 0 && allDevices.length > 0) {
      const filteredDevices = pickDevicesWithIssues(allDevices);
      mergeAndSetDevices(filteredDevices);
    }
  }, [newPredicted, allDevices]);

  useEffect(() => {
    getDevices();
    getDevicesHistorical();

    const deviceSubscription = supabase
      .channel('public:devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, (payload) => {
        console.log('Device change received!', payload);
        switch (payload.eventType) {
          case 'INSERT':
            setDevices((prevDevices) => [...prevDevices, payload.new]);
            break;
          case 'UPDATE':
            setDevices((prevDevices) =>
              prevDevices.map((device) =>
                device.id === payload.new.id ? payload.new : device
              )
            );
            break;
          case 'DELETE':
            setDevices((prevDevices) =>
              prevDevices.filter((device) => device.id !== payload.old.id)
            );
            break;
          default:
            break;
        }
      })
      .subscribe();

    const historicalSubscription = supabase
      .channel('public:historical')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historical' }, (payload) => {
        console.log('Historical change received!', payload);
        switch (payload.eventType) {
          case 'INSERT':
            setHistorical((prevHistorical) => [...prevHistorical, payload.new]);
            break;
          case 'UPDATE':
            setHistorical((prevHistorical) =>
              prevHistorical.map((entry) =>
                entry.id === payload.new.id ? payload.new : entry
              )
            );
            break;
          case 'DELETE':
            setHistorical((prevHistorical) =>
              prevHistorical.filter((entry) => entry.id !== payload.old.id)
            );
            break;
          default:
            break;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(deviceSubscription);
      supabase.removeChannel(historicalSubscription);
    };
  }, []);

  const handleFilterChange = (e) => {
    const { name, checked, type } = e.target;
    console.log(`Filter changed: ${name}, Checked: ${checked}`);
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: type === "checkbox" ? checked : e.target.value,
    }));
  };

  useEffect(() => {
    const filterDevices = () => {
      const filtered = devices.filter((device) => {
        const needsBatteryChange = device.battery < 25;
        const needsEmptying = device.level >= 80;
        const isPredicted = predictedDevices.includes(device.unique_id);

        return (
          (filters.changeBattery && needsBatteryChange) ||
          (filters.emptyBin && (needsEmptying || isPredicted))
        );
      });
      setDevicesToWorkOn(filtered);
    };
    filterDevices();
  }, [filters, devices]);

  const fetchDirections = () => {
    if (devicesToWorkOn.length < 2) {
      setDirections(null);
      setEstimatedTime("");
      return;
    }

    const waypoints = devicesToWorkOn.slice(1, -1).map((bin) => ({
      location: { lat: bin.lat, lng: bin.lng },
      stopover: true,
    }));

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: devicesToWorkOn[0].lat, lng: devicesToWorkOn[0].lng },
        destination: {
          lat: devicesToWorkOn[devicesToWorkOn.length - 1].lat,
          lng: devicesToWorkOn[devicesToWorkOn.length - 1].lng,
        },
        waypoints: waypoints,
        travelMode: travelMode,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          const duration = result.routes[0].legs.reduce(
            (total, leg) => total + leg.duration.value,
            0
          );
          setEstimatedTime(`${Math.floor(duration / 60)} minutes`);
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      }
    );
  };

  useEffect(() => {
    if (
      typeof window.google === "undefined" ||
      typeof window.google.maps === "undefined"
    ) {
      console.error("Google Maps API is not loaded yet.");
      return;
    } else {
      fetchDirections();
    }
  }, [devicesToWorkOn, travelMode, filters]);

  const decideWorkToDo = (bin) => {
    let emptyBin = false;
    let changeBattery = false;

    if (filters.emptyBin && bin.level >= 80) {
      emptyBin = true;
    }

    if (filters.changeBattery && bin.battery < 25) {
      changeBattery = true;
    }

    return {
      emptyBin,
      changeBattery,
    };
  };

  const renderWorkToDo = () => {
    if (!devicesToWorkOn.length) return;

    return devicesToWorkOn.map((device) => {
      return (
        <div key={device.id} className="p-4 mb-4 bg-gray-100 rounded shadow-md">
          <p>
            <strong>Device ID:</strong> {device.unique_id}
          </p>
          <div>
            {decideWorkToDo(device).emptyBin && (
              <div className="text-red-500">
                Empty Bin
              </div>
            )}
            {decideWorkToDo(device).changeBattery && (
              <div className="text-yellow-500">
                Change Battery
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const createRoute = async () => {
    if (!devicesToWorkOn.length) return;

    const { data, error } = await supabase
      .from('routes')
      .insert([
        {
          employeeid: 1, // Replace with actual user ID
          deviceids: devicesToWorkOn.map((device) => device.unique_id),
          emptybin: filters.emptyBin,
          changebattery: filters.changeBattery,
          status: 'pending',
          timestamp: new Date(),
        },
      ]);

    if (error) {
      console.error('Error creating route:', error);
    } else {
      console.log('Route created successfully:', data);
      getRoutes();
    }
  };

  const getRoutes = async () => {
    const { data, error } = await supabase
      .from('routes')
      .select('*, employees (fname, lname)')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching routes:', error);
    } else {
      setAllRoutes(data);
    }
  };

  useEffect(() => {
    getRoutes();
  }, []);

  const startRoute = async (id) => {
    const { data, error } = await supabase
      .from('routes')
      .update({ status: 'started', started: new Date() })
      .eq('id', id);

    if (error) {
      console.error('Error starting route:', error);
    } else {
      console.log('Route started:', data);
      getRoutes();
    }
  };

  const finishRoute = async (id) => {
    const { data, error } = await supabase
      .from('routes')
      .update({ status: 'finished', finished: new Date() })
      .eq('id', id);

    if (error) {
      console.error('Error finishing route:', error);
    } else {
      console.log('Route finished:', data);
      getRoutes();
    }
  };

  const deleteRoute = async (id) => {
    const { data, error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting route:', error);
    } else {
      console.log('Route deleted:', data);
      getRoutes();
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 transition-all duration-300">
        <Navbar />
        <main className="p-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Manage Routes</h1>
          </div>

          <div className="mb-4 p-4 bg-white rounded shadow-md">
            <h2 className="text-xl font-bold mb-2">Route #1</h2>
            <div className="mb-4">
              <label className="mr-4">
                <input
                  type="checkbox"
                  name="changeBattery"
                  checked={filters.changeBattery}
                  onChange={handleFilterChange}
                  className="mr-2"
                />
                Change Battery
              </label>
              <label>
                <input
                  type="checkbox"
                  name="emptyBin"
                  checked={filters.emptyBin}
                  onChange={handleFilterChange}
                  className="mr-2"
                />
                Empty Bin
              </label>
            </div>
            <div className="mb-4">
              <div className="flex items-center">
                <span className="mr-4">Estimated time: {estimatedTime}</span>
                <select
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                  className="border border-gray-300 p-2 rounded"
                >
                  <option value="DRIVING">Driving</option>
                  <option value="WALKING">Walking</option>
                </select>
              </div>
            </div>
            <button
              onClick={createRoute}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Start Route
            </button>
          </div>

          <div className="mb-4 p-4 bg-white rounded shadow-md">
            <h3 className="text-lg font-bold mb-2">Route Summary</h3>
            <p className="mb-4">Total Bins: {devices.length}</p>
            {renderWorkToDo()}
          </div>

          <div className="flex mb-4">
            <MapView
              devices={devices}
              directions={directions}
            />
          </div>

          <table className="min-w-full bg-white border-collapse">
            <thead>
              <tr className="border border-gray-300">
                <th className="p-2 border border-gray-300">Route ID</th>
                <th className="p-2 border border-gray-300">Created By</th>
                <th className="p-2 border border-gray-300">Bin Id's</th>
                <th className="p-2 border border-gray-300">Status</th>
                <th className="p-2 border border-gray-300">Created at</th>
                <th className="p-2 border border-gray-300">Started</th>
                <th className="p-2 border border-gray-300">Finished</th>
                <th className="p-2 border border-gray-300">Controls</th>
              </tr>
            </thead>
            <tbody>
              {allRoutes.map((route) => {
                return (
                  <tr key={route.id} className="border border-gray-300">
                    <td className="p-2 border border-gray-300">{route.id}</td>
                    <td className="p-2 border border-gray-300">{route.employees ? `${route.employees.fname} ${route.employees.lname}` : 'N/A'}</td>
                    <td className="p-2 border border-gray-300">{route.deviceids.join(", ")}</td>
                    <td className="p-2 border border-gray-300">{route.status}</td>
                    <td className="p-2 border border-gray-300">{new Date(route.timestamp).toLocaleString()}</td>
                    <td className="p-2 border border-gray-300">
                      {route.started !== null ? new Date(route.started).toLocaleString() : null}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {route.finished !== null ? new Date(route.finished).toLocaleString() : null}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {route.status === "pending" && (
                        <button onClick={() => startRoute(route.id)} className="bg-green-500 text-white px-2 py-1 rounded">
                          Start
                        </button>
                      )}
                      {route.status === "started" && (
                        <button onClick={() => finishRoute(route.id)} className="bg-blue-500 text-white px-2 py-1 rounded">
                          Complete
                        </button>
                      )}
                      {route.status === "finished" && (
                        <button onClick={() => deleteRoute(route.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
};

export default Routes;

const helperToConvertLevelToPercentage = (devices) => {
  let tmpDevices = devices.map((device) => {
    let distanceInCM = device.level;
    let binHeight = device.bin_height;
    let trashHeight = binHeight - distanceInCM;
    device.level = parseInt((trashHeight * 100) / binHeight);
    device.lat = parseFloat(device.lat);
    device.lng = parseFloat(device.lng);
    return device;
  });
  return tmpDevices;
};

const pickDevicesWithIssues = (devices) => {
  let tmpDevices = devices.filter((device) => {
    return device.level >= 80 || device.battery <= 25;
  });
  return tmpDevices;
};