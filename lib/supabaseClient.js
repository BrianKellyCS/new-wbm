import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to fetch user details
export const fetchUserDetails = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('fname, lname,role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
  return data;
};

// Function to fetch devices
export const fetchBinDevices = async () => {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('is_registered', true);
  if (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
  return data;
};


// Function to fetch weather devices
export const fetchWeatherDevices = async () => {
  const { data, error } = await supabase
    .from('weather_sensors')
    .select('*')
    .eq('is_registered', true);
  if (error) {
    console.error('Error fetching weather:', error);
    return [];
  }
  return data;
};

// Function to fetch unregistered bin devices
export const fetchNewBinDevices = async () => {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('is_registered', false);
  if (error) {
    console.error('Error fetching new devices:', error);
    return [];
  }
  return data;
};

// Function to fetch unregistered bin devices
export const fetchNewWeatherDevices = async () => {
  const { data, error } = await supabase
    .from('weather_sensors')
    .select('*')
    .eq('is_registered', false);
  if (error) {
    console.error('Error fetching new devices:', error);
    return [];
  }
  return data;
};

// Function to fetch feedbacks
export const fetchFeedbacks = async () => {
  const { data, error } = await supabase.from('feedbacks').select('*');
  if (error) {
    console.error('Error fetching feedbacks:', error);
    return [];
  }
  return data;
};

// Function to add feedback
export const addFeedback = async (feedback) => {
  const { data, error } = await supabase.from('feedbacks').insert([feedback]);
  return { data, error };
};

// Function to update feedback
export const updateFeedback = async (feedbackId, updateData) => {
  const { data, error } = await supabase
    .from('feedbacks')
    .update(updateData)
    .eq('id', feedbackId);

  return { data, error };
};


// Function to fetch historical data
export const fetchHistoricalData = async () => {
  const { data, error } = await supabase.from('historical').select('*');
  if (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
  // Sort data by saved_time
  data.sort((a, b) => new Date(a.saved_time) - new Date(b.saved_time));
  return data;
};
  
  // Function to clear historical data
  export const clearHistoricalData = async () => {
    const { error } = await supabase.from('historical').delete().neq('id', 0);
    if (error) {
      console.error('Error clearing historical data:', error);
      return false;
    }
    return true;
  };
  

// Function to update device registration
export const updateDeviceRegistration = async (updatedDevice, deviceType) => {
  let updateData = {
    lat: updatedDevice.latitude,
    lng: updatedDevice.longitude,
    is_registered: updatedDevice.is_registered
  };

  if (deviceType === 'bin') {
    updateData.bin_height = updatedDevice.bin_height;
  }

  const tableName = deviceType === 'bin' ? 'devices' : 'weather_sensors';

  const { data, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('unique_id', updatedDevice.id);

  if (error) {
    console.error('Error updating device registration:', error);
    return { data: null, error };
  }

  return { data, error: null };
};


//fetch routes for dashboard
export const fetchRecentRoutes = async () => {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching recent routes:', error);
    return [];
  }
  return data;
};



// Function to create a new route
export const createRoute = async (route) => {
  const { data, error } = await supabase
    .from('routes')
    .insert([route]);

  if (error) {
    console.error('Error creating route:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

// Function to update route status
export const updateRouteStatus = async (id, status, timestampField) => {
  const updateData = { status };
  updateData[timestampField] = new Date();

  const { data, error } = await supabase
    .from('routes')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error(`Error updating route status to ${status}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
};

// Function to delete a route
export const deleteRoute = async (id) => {
  const { data, error } = await supabase
    .from('routes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting route:', error);
    return { data: null, error };
  }

  return { data, error: null };
};




// Function to check if an email already exists
export const checkEmailExists = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('email', email);

  if (error) {
    console.error('Error checking email existence:', error);
    return false;
  }

  return data.length > 0;
};

// Function to create a new user
export const createUser = async (user) => {
  const { data, error } = await supabase
    .from('users')
    .insert([user]);

  if (error) {
    console.error('Error creating user:', error);
    return { data: null, error };
  }

  return { data, error: null };
};


// Function to fetch a user by email
export const fetchUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, password, role')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('Error fetching user by email:', error);
    return null;
  }

  return data;
};

// Function to update device info
export const updateDeviceSoftware = async (updatedDevice, deviceType) => {
  let updateData = {
    lat: updatedDevice.lat,
    lng: updatedDevice.lng
  };

  if (deviceType === 'bin') {
    updateData.bin_height = updatedDevice.bin_height;
  }

  const tableName = deviceType === 'bin' ? 'devices' : 'weather_sensors';

  const { data, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('unique_id', updatedDevice.id);

  if (error) {
    console.error('Error updating device info:', error);
    return { data: null, error };
  }

  return { data, error: null };
};






//detect fill times
export const fetchEmptyEvents = async () => {
  const { data, error } = await supabase.from('historical').select('*');
  if (error) {
    console.error('Error fetching historical data:', error);
    return {};
  }

  // Sort data by unique_id and saved_time
  data.sort((a, b) => {
    if (a.unique_id !== b.unique_id) {
      return a.unique_id - b.unique_id;
    }
    return new Date(a.saved_time) - new Date(b.saved_time);
  });

  // Detect emptying events
  const emptyingCounts = {};
  let prevLevel = {};
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    if (!prevLevel[record.unique_id]) {
      prevLevel[record.unique_id] = { level: null, time: null };
    }

    if (
      prevLevel[record.unique_id].level !== null &&
      prevLevel[record.unique_id].level >= 20 &&
      record.level_in_percents <= 10
    ) {
      if (!emptyingCounts[record.unique_id]) {
        emptyingCounts[record.unique_id] = 0;
      }
      emptyingCounts[record.unique_id]++;
    }

    prevLevel[record.unique_id] = {
      level: record.level_in_percents,
      time: record.saved_time,
    };
  }

  return emptyingCounts;
};


export const updateDeviceHardware = async (unique_id, updateFields) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .update(updateFields)
      .eq('unique_id', unique_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(`Error updating device: ${error.message}`);
  }
};

export const insertNewDevice = async (deviceData) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .insert(deviceData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(`Error inserting new device: ${error.message}`);
  }
};

export const saveToHistorical = async (historicalData) => {
  try {
    const { data, error } = await supabase
      .from('historical')
      .insert(historicalData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(`Error saving to historical: ${error.message}`);
  }
};

export const getDeviceById = async (unique_id) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('bin_height, is_registered')
      .eq('unique_id', unique_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw new Error(`Error fetching device: ${error.message}`);
  }
};


export const updateWeatherDevice = async (unique_id, updateFields) => {
  const { data, error } = await supabase
    .from('weather_sensors')
    .update(updateFields)
    .eq('unique_id', unique_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const insertNewWeatherDevice = async (deviceData) => {
  const { data, error } = await supabase
    .from('weather_sensors')
    .insert(deviceData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getWeatherDeviceById = async (unique_id) => {
  const { data, error } = await supabase
    .from('weather_sensors')
    .select('is_registered')
    .eq('unique_id', unique_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};