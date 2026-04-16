export default function Login() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <a href="/" className="text-xl font-semibold">
          Safe<span className="text-emerald-600">Tag</span>
        </a>
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </a>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm">

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your SafeTag account</p>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 mb-6">
            <button className="flex-1 py-2 text-sm font-medium text-emerald-600 border-b-2 border-emerald-600">
              Phone
            </button>
            <button className="flex-1 py-2 text-sm text-gray-400">
              Email
            </button>
          </div>

          {/* Phone login */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mobile number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
              Send OTP
            </button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{" "}
            <a href="/signup" className="text-emerald-600 hover:underline">
              Sign up
            </a>
          </p>

        </div>
      </div>

    </main>
  )
}