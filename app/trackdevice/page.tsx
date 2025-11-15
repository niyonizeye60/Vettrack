"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useEffect, useState } from "react";
import { Activity, MapPin, Heart, RefreshCw, Search, PlusCircle } from "lucide-react";

// Define our data types
type Feed = {
  created_at: string;
  entry_id: number;
  field1: string;
  field2: string | null;
  field3: string | null;
};

type FormattedData = {
  created_at: string;
  timestamp: string;
  bpm: number;
  latitude: number | null;
  longitude: number | null;
  hasLocation: boolean;
};

type Animal = {
  id: string;
  name: string;
  species: string;
  deviceId: string;
};

export default function Page() {
  const [data, setData] = useState<FormattedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("2688413");
  const [apiKey, setApiKey] = useState<string>("WCY7XQTJZVB21DHQ");
  const [results, setResults] = useState<number>(10);
  const [animals, setAnimals] = useState<Animal[]>([
    { id: "1", name: "Max", species: "Dog", deviceId: "2688413" },
    { id: "2", name: "Bella", species: "Cat", deviceId: "2688414" }
  ]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(animals[0]);
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [newAnimal, setNewAnimal] = useState<Partial<Animal>>({ name: "", species: "", deviceId: "" });

  const fetchSensorData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `https://api.thingspeak.com/channels/${deviceId}/feeds.json?api_key=${apiKey}&results=${results}`
      );
      const json = await res.json();
      
      // Format the data
      const formatted = json.feeds.map((feed: Feed) => {
        const date = new Date(feed.created_at);
        return {
          created_at: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: date.toISOString(),
          bpm: parseFloat(feed.field1) || 0,
          latitude: feed.field2 ? parseFloat(feed.field2) : null,
          longitude: feed.field3 ? parseFloat(feed.field3) : null,
          hasLocation: !!feed.field2 && !!feed.field3
        };
      });
      
      // Sort by date
      formatted.sort((a: FormattedData, b: FormattedData) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setData(formatted);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSensorData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [deviceId, apiKey, results]);

  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    setDeviceId(animal.deviceId);
  };

  const handleAddAnimal = () => {
    if (newAnimal.name && newAnimal.species && newAnimal.deviceId) {
      const animal: Animal = {
        id: Date.now().toString(),
        name: newAnimal.name,
        species: newAnimal.species,
        deviceId: newAnimal.deviceId
      };
      setAnimals([...animals, animal]);
      setNewAnimal({ name: "", species: "", deviceId: "" });
      setShowAddAnimal(false);
    }
  };

  // Calculate some stats
  const averageBpm = data.length > 0 
    ? Math.round(data.reduce((sum: number, item: FormattedData) => sum + item.bpm, 0) / data.length) 
    : 0;
  
  const latestBpm = data.length > 0 ? data[data.length - 1].bpm : 0;
  
  // Location data stats
  const locationDataPoints = data.filter((item: FormattedData) => item.hasLocation).length;
  const totalDataPoints = data.length;
  const locationPercentage = totalDataPoints > 0 ? Math.round((locationDataPoints / totalDataPoints) * 100) : 0;

  // BPM status determination
  const getBpmStatus = (bpm: number) => {
    if (bpm === 0) return { label: "No Data", color: "#9CA3AF" };
    if (bpm < 60) return { label: "Low", color: "#3B82F6" };
    if (bpm <= 100) return { label: "Normal", color: "#10B981" };
    if (bpm <= 130) return { label: "Elevated", color: "#F59E0B" };
    return { label: "High", color: "#EF4444" };
  };

  const bpmStatus = getBpmStatus(latestBpm);

  // Data for pie chart
  const statusCounts = data.reduce((acc: Record<string, number>, item: FormattedData) => {
    const status = getBpmStatus(item.bpm).label;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]: [string, number]) => ({
    name,
    value,
    color: getBpmStatus(name === "No Data" ? 0 : name === "Low" ? 50 : name === "Normal" ? 80 : name === "Elevated" ? 120 : 150).color
  }));

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">🐾 Pet Health Monitor</h1>
          
          {/* Animal Selector */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex">
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedAnimal?.id || ""}
                  onChange={(e) => {
                    const animal = animals.find(a => a.id === e.target.value);
                    if (animal) handleAnimalSelect(animal);
                  }}
                >
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name} ({animal.species})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <svg className="h-4 w-4 fill-current text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              <button 
                className="ml-2 p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                onClick={() => setShowAddAnimal(!showAddAnimal)}
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center text-sm text-gray-500">
              <span>Last updated: {lastUpdated}</span>
              <button 
                className="ml-2 p-2 rounded-full bg-white shadow hover:bg-gray-100 transition-colors"
                onClick={fetchSensorData}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Add Animal Form */}
        {showAddAnimal && (
          <div className="bg-white rounded-xl p-6 shadow-md border mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Animal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={newAnimal.name}
                  onChange={(e) => setNewAnimal({...newAnimal, name: e.target.value})}
                  placeholder="Pet name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={newAnimal.species}
                  onChange={(e) => setNewAnimal({...newAnimal, species: e.target.value})}
                  placeholder="Dog, Cat, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={newAnimal.deviceId}
                  onChange={(e) => setNewAnimal({...newAnimal, deviceId: e.target.value})}
                  placeholder="ThingSpeak Channel ID"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg mr-2 hover:bg-gray-300 transition-colors"
                onClick={() => setShowAddAnimal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                onClick={handleAddAnimal}
                disabled={!newAnimal.name || !newAnimal.species || !newAnimal.deviceId}
              >
                Add Animal
              </button>
            </div>
          </div>
        )}
        
        {/* API Configuration */}
        <div className="bg-white rounded-xl p-6 shadow-md border mb-6">
          <h2 className="text-lg font-semibold mb-4">Data Source Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="ThingSpeak Channel ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ThingSpeak API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Results Count</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={results}
                onChange={(e) => setResults(parseInt(e.target.value) || 10)}
                min="1"
                max="100"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={fetchSensorData}
            >
              Fetch Data
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-200 mb-2"></div>
              <div className="text-gray-500">Loading sensor data...</div>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-md border">
            <div className="text-center p-6">
              <div className="text-gray-400 text-5xl mb-4">📡</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Data Available</h3>
              <p className="text-gray-500 mb-4">
                No sensor data found for the selected device. Please verify the Device ID and API Key.
              </p>
              <button
                onClick={fetchSensorData}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Animal Info Card */}
            {selectedAnimal && (
              <div className="bg-white rounded-xl p-6 shadow-md border mb-6">
                <div className="flex items-center">
                  <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                    {selectedAnimal.species === "Dog" ? "🐕" : 
                     selectedAnimal.species === "Cat" ? "🐈" : "🐾"}
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedAnimal.name}</h2>
                    <p className="text-gray-500">{selectedAnimal.species} • Device ID: {selectedAnimal.deviceId}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-md border border-l-4 border-l-gray-400">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-50">
                    <Heart className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-medium text-gray-500">Latest BPM</h2>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-bold">{latestBpm}</p>
                      <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded-full ${
                        bpmStatus.color === "#10B981" ? "bg-green-100 text-green-800" :
                        bpmStatus.color === "#EF4444" ? "bg-red-100 text-red-800" :
                        bpmStatus.color === "#F59E0B" ? "bg-yellow-100 text-yellow-800" :
                        bpmStatus.color === "#3B82F6" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {bpmStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-50">
                    <Activity className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-medium text-gray-500">Average BPM</h2>
                    <p className="text-2xl font-bold">{averageBpm}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-50">
                    <MapPin className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-sm font-medium text-gray-500">Location Data</h2>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-bold">{locationPercentage}%</p>
                      <span className="ml-2 text-sm text-gray-500">
                        ({locationDataPoints}/{totalDataPoints} points)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md border lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4">Heart Rate Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="created_at" 
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                    />
                    <YAxis 
                      label={{ value: 'BPM', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="bpm" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorBpm)" 
                      name="Heart Rate"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-md border">
                <h2 className="text-lg font-semibold mb-4">BPM Distribution</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} readings`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-64 text-gray-400">
                    No BPM data available
                  </div>
                )}
              </div>
            </div>
            
            {/* Location Map Placeholder */}
            {locationDataPoints > 0 && (
              <div className="mt-6 bg-white rounded-xl p-6 shadow-md border">
                <h2 className="text-lg font-semibold mb-4">Location Data</h2>
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-500">Map visualization would appear here</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Latest location: {data.filter((d: FormattedData) => d.hasLocation).pop()?.latitude || 0}, 
                      {data.filter((d: FormattedData) => d.hasLocation).pop()?.longitude || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Data Table */}
            <div className="mt-6 bg-white rounded-xl p-6 shadow-md border">
              <h2 className="text-lg font-semibold mb-4">Recent Readings</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BPM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.slice().reverse().slice(0, 5).map((item, index) => {
                      const status = getBpmStatus(item.bpm);
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.bpm}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              status.color === "#10B981" ? "bg-green-100 text-green-800" :
                              status.color === "#EF4444" ? "bg-red-100 text-red-800" :
                              status.color === "#F59E0B" ? "bg-yellow-100 text-yellow-800" :
                              status.color === "#3B82F6" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.hasLocation ? (
                              <span className="text-green-600">Lat: {item.latitude}, Lng: {item.longitude}</span>
                            ) : (
                              <span className="text-gray-400">No location data</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}