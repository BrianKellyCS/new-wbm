'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MapView from '@/components/MapView';
import ListView from '@/components/ListView';
import { supabase } from '@/lib/supabaseClient';

const Legend = () => (
  <div className="flex flex-col space-y-2 p-4">
    <div className="flex items-center">
      <span className="w-4 h-4 bg-purple-500 inline-block mr-2"></span>
      <span>Full bin + low battery</span>
    </div>
    <div className="flex items-center">
      <span className="w-4 h-4 bg-red-500 inline-block mr-2"></span>
      <span>Full bin</span>
    </div>
    <div className="flex items-center">
      <span className="w-4 h-4 bg-yellow-300 inline-block mr-2"></span>
      <span>Low battery</span>
    </div>
    <div className="flex items-center">
      <span className="w-4 h-4 bg-green-300 inline-block mr-2"></span>
      <span>No issues</span>
    </div>
  </div>
);

export default function BinView() {
  const [devices, setDevices] = useState([]);
  const [view, setView] = useState('map');
  console.log(devices);

  useEffect(() => {
    fetchDevices();

    const subscription = supabase
      .channel('public:devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, (payload) => {
        console.log('Change received!', payload);
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('is_registered', true);

    if (error) {
      console.error(error);
    } else {
      setDevices(helperToConvertLevelToPercentage(data));
    }
  };

  const helperToConvertLevelToPercentage = (devices) => {
    return devices.map((device) => {
      let distanceInCM = device.level;
      let binHeight = device.bin_height;
      let trashHeight = binHeight - distanceInCM;
      device.level = parseInt((trashHeight * 100) / binHeight);
      device.lat = parseFloat(device.lat);
      device.lng = parseFloat(device.lng);
      return device;
    });
  };

  const mapListToggle = () => {
    if (view === 'map') {
      return <MapView devices={devices} />;
    } else if (view === 'list') {
      return <ListView devices={devices} />;
    } else {
      return null;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 transition-all duration-300">
        <Navbar />
        <main className="p-4">
          <div className="flex justify-center mb-4 space-x-4">
            <button
              onClick={() => setView('map')}
              className={`px-4 py-2 ${view === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Map View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              List View
            </button>
          </div>
          
          {mapListToggle()}
        </main>
      </div>
    </div>
  );
}