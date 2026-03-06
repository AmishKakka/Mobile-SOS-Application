import { useNavigate } from "react-router";
import { Shield, MapPin, Bell } from "lucide-react";

export function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">
        {/* App Icon */}
        <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center shadow-lg">
          <Shield className="w-14 h-14 text-white" strokeWidth={2.5} />
        </div>

        {/* App Title */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">SafeGuard</h1>
          <p className="text-xl text-gray-600">Emergency Safety App</p>
        </div>

        {/* Features */}
        <div className="space-y-4 w-full">
          <div className="flex items-start gap-3 text-left">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Live Location Tracking</h3>
              <p className="text-sm text-gray-600">Share your real-time GPS coordinates during emergencies</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Instant SOS Alert</h3>
              <p className="text-sm text-gray-600">Trigger emergency alerts with one tap to notify responders</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">24/7 Protection</h3>
              <p className="text-sm text-gray-600">Always-on safety monitoring when you need it most</p>
            </div>
          </div>
        </div>

        {/* Get Started Button */}
        <button
          onClick={() => navigate("/permissions")}
          className="w-full bg-red-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors"
        >
          Get Started
        </button>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 max-w-sm">
          Your location data is only transmitted when you actively trigger an SOS alert. We respect your privacy.
        </p>
      </div>
    </div>
  );
}
