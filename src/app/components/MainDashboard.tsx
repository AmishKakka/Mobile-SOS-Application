import { useState } from "react";
import { AlertCircle, Phone, MapPin, Radio } from "lucide-react";

export function MainDashboard() {
  const [sosActive, setSosActive] = useState(false);

  const handleTriggerSOS = () => {
    setSosActive(true); 
  };

  const handleCancelSOS = () => {
    setSosActive(false); 
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">SafeGuard</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Ready</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full flex flex-col items-center space-y-8">
          
          {/* Status Card */}
          {sosActive && (
            <div className="w-full bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-bold text-red-900 text-lg mb-1">Emergency Alert Active</h2>
                  <p className="text-sm text-red-800">Your location is being shared with emergency responders.</p>
                </div>
              </div>
            </div>
          )}

          {/* Main SOS Button */}
          <div className="relative">
            {/* Outer pulsing ring (only when active) */}
            {sosActive && (
              <>
                <div className="absolute inset-0 -m-8 bg-red-400 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-0 -m-4 bg-red-400 rounded-full animate-pulse opacity-30"></div>
              </>
            )}
            
            {/* Main Button */}
            <button
              onClick={handleTriggerSOS}
              disabled={sosActive}
              className={`relative w-72 h-72 rounded-full font-bold text-2xl shadow-2xl transition-all duration-300 ${
                sosActive
                  ? "bg-red-600 text-white cursor-not-allowed animate-pulse"
                  : "bg-red-600 text-white hover:bg-red-700 active:scale-95 hover:shadow-3xl"
              }`}
              style={{
                border: sosActive ? "8px solid #DC2626" : "8px solid #B91C1C",
              }}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-20 h-20" strokeWidth={3} />
                <span className="text-3xl tracking-wide">
                  {sosActive ? "SOS ACTIVE" : "TRIGGER SOS"}
                </span>
              </div>
            </button>
          </div>

          {/* Live Status Indicator */}
          {sosActive && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-4 shadow-md w-full">
                <div className="relative flex items-center justify-center">
                  <Radio className="w-6 h-6 text-red-600" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Live GPS coordinates sending via Socket.io...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-600 font-medium">LIVE</span>
                  </div>
                </div>
              </div>

              {/* Location Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Location accuracy: High (±5m)</span>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelSOS}
                className="w-full max-w-xs bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:bg-gray-800 active:bg-gray-700 transition-colors"
              >
                Cancel SOS
              </button>
            </div>
          )}

          {/* Idle State Info */}
          {!sosActive && (
            <div className="text-center space-y-4 max-w-sm">
              <p className="text-gray-600">
                Press the button above to trigger an emergency SOS alert and share your live location.
              </p>
              
              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <Phone className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-900">Emergency</p>
                  <p className="text-xs text-gray-600">Contacts Notified</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <MapPin className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-900">Live GPS</p>
                  <p className="text-xs text-gray-600">Real-time Tracking</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <p className="text-xs text-center text-gray-500">
          In case of immediate danger, always call local emergency services (911)
        </p>
      </div>
    </div>
  );
}