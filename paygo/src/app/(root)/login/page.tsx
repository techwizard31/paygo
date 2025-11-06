// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Clear API error when user starts typing
    if (apiError) {
      setApiError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    setApiError("");
    
    try {
      const response = await fetch("/api/profiles/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from the API
        if (response.status === 400 && data.details) {
          const fieldErrors: Record<string, string> = {};
          if (data.details.fieldErrors) {
            Object.entries(data.details.fieldErrors).forEach(([key, value]) => {
              fieldErrors[key] = (value as string[])[0];
            });
          }
          setErrors(fieldErrors);
        } else if (response.status === 401) {
          // Invalid credentials
          setApiError(data.error || "Invalid email or password");
        } else {
          setApiError(data.error || "Login failed");
        }
        return;
      }

      // Successful login
      console.log("Login successful:", data);
      
      // Store user data and UUID in localStorage
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Store the UUID separately for easy access
        if (data.user.uuid) {
          localStorage.setItem("user_uuid", data.user.uuid);
          console.log("User UUID stored:", data.user.uuid);
        }
      }
      
      // Redirect to dashboard
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-md w-full bg-gray-800 p-10 rounded-2xl shadow-xl">
        <div className="mb-10">
          <h2 className="text-center text-4xl font-bold text-white">
            Welcome back
          </h2>
          <p className="mt-3 text-center text-lg text-gray-400">
            Sign in to your account
          </p>
        </div>
        
        {apiError && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-sm text-red-300">{apiError}</p>
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-300 mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
              placeholder="example@gmail.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email}</p>
            )}
          </div>
          
          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-base font-medium text-gray-300">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
              placeholder="********"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center">
            <input
              id="remember_me"
              name="remember_me"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded bg-gray-700"
            />
            <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-300">
              Remember me
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white transition-colors ${
                loading ? "bg-indigo-600 opacity-70 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg`}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
          
          <div className="text-center pt-4">
            <p className="text-base text-gray-400">
              Don't have an account?{" "}
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}