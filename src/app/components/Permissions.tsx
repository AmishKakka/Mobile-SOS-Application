import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, AlertCircle, CheckCircle2 } from "lucide-react";

export function Permissions() {
  const navigate = useNavigate();
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const handleRequestPermission = () => {
    setIsRequesting(true);
    
    // Simulate permission request
    setTimeout(() => {
      setIsRequesting(false);
      setPermissionGranted(true);
      
      // Navigate to dashboard after a brief success display
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">
        {/* Icon */}
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg transition-colors ${
          permissionGranted ? "bg-green-600" : "bg-red-600"
        }`}>
          {permissionGranted ? (
            <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
          ) : (
            <MapPin className="w-14 h-14 text-white" strokeWidth={2.5} />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {permissionGranted ? "Permission Granted!" : "Location Access Required"}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            {permissionGranted
              ? "You're all set! Redirecting to your dashboard..."
              : "SafeGuard needs access to your device location to send live GPS coordinates during an emergency."}
          </p>
        </div>

        {/* Alert Box */}
        {!permissionGranted && (
          <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3 text-left">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-900">Background Location Access</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                We require continuous background location access to ensure your coordinates are transmitted even when the app is in the background or your screen is locked.
              </p>
            </div>
          </div>
        )}

        {/* Features List */}
        {!permissionGranted && (
          <div className="w-full space-y-3 text-left">
            <p className="text-sm font-semibold text-gray-900">Why we need this:</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Send your exact location to emergency responders in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Track your movement during an active SOS alert</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                <span>Function correctly even when your phone is locked</span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Button */}
        {!permissionGranted && (
          <button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="w-full bg-red-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isRequesting ? "Requesting..." : "Allow Location Access"}
          </button>
        )}

        {/* Skip Link */}
        {!permissionGranted && (
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
