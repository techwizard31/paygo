// src/app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const response = await fetch("/api/profiles/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
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
        } else if (response.status === 409) {
          // Email already exists
          setApiError(data.error || "Email already registered");
        } else {
          setApiError(data.error || "Failed to create account");
        }
        return;
      }

      // Successful registration
      console.log("Account created successfully:", data);
      
      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Signup error:", error);
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
            Create your account
          </h2>
          <p className="mt-3 text-center text-lg text-gray-400">
            Join our platform today
          </p>
        </div>
        
        {apiError && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-sm text-red-300">{apiError}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-base font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-400">{errors.name}</p>
            )}
          </div>
          
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
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-400">{errors.email}</p>
            )}
          </div>
          
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
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
          
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-base font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
              placeholder="********"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white transition-colors ${
                loading ? "bg-indigo-600 opacity-70 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>
          
          <div className="text-center pt-4">
            <p className="text-base text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Log in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}