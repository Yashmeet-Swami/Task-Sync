import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import Lottie from "lottie-react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

import { signInSchema } from "@/lib/schema";
import { useLoginMutation } from "@/hooks/use-auth";
import { useAuth } from "@/provider/auth-context";
import { toast } from "sonner";
import loginAnimation from "@/assets/taskmanagement5.json";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type SigninFormData = z.infer<typeof signInSchema>;

export function SignInParticles() {
  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: false },
        background: { color: { value: "#f9fafb" } },
        fpsLimit: 60,
        particles: {
          number: { value: 80, density: { enable: true, area: 800 } },
          color: { value: "#a3a3a3" },
          shape: { type: "circle" },
          opacity: { value: 0.3 },
          size: { value: 3 },
          move: { enable: true, speed: 1, direction: "none", outMode: "bounce" },
        },
        detectRetina: true,
      }}
      className="absolute inset-0 z-0"
    />
  );
}

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm<SigninFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending } = useLoginMutation();

  const handleOnSubmit = (values: SigninFormData) => {
    mutate(values, {
      onSuccess: (data) => {
        login(data);
        toast.success("Login Successful");
        navigate("/dashboard");
      },
      onError: (error: any) => {
        const errormsg = error.response?.data?.message || "An error occurred";
        toast.error(errormsg);
      },
    });
  };

  const handleDemoLogin = () => {
    mutate(
      { email: "yashmeetswami@gmail.com", password: "xjyixy6n" },
      {
        onSuccess: (data) => {
          login(data);
          toast.success("Logged in as Demo User");
          navigate("/dashboard");
        },
        onError: (error: any) => {
          const errormsg = error.response?.data?.message || "Demo login failed";
          toast.error(errormsg);
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-2 sm:p-4 relative overflow-hidden">
      <SignInParticles />
      <Button
        variant="ghost"
        className="absolute top-4 left-4 z-20 text-xs sm:text-sm"
        onClick={() => navigate("/")}
      >
        ← Back to Home
      </Button>

      <div className="absolute top-1/4 left-[-10%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-gradient-to-tr from-indigo-400 to-purple-500 opacity-30 rounded-full blur-3xl animate-pulse z-0" />

      <div className="w-full max-w-4xl h-auto sm:h-[90vh] flex flex-col md:flex-row rounded-xl sm:rounded-2xl overflow-hidden shadow-lg z-10 bg-white">
        {/* Left Section - Hidden on mobile */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 p-4 sm:p-6 flex-col justify-between">
          <h2 className="text-xl font-bold text-white">TaskSync</h2>

          <div className="mt-4 sm:mt-6">
            <div aria-hidden="true">
              <Lottie
                animationData={loginAnimation}
                loop
                className="w-full max-w-[280px] sm:max-w-xs mx-auto"
              />
            </div>
            <h3 className="text-white text-lg font-semibold mt-4 sm:mt-6 text-center">Welcome to TaskSync</h3>
            <p className="text-blue-100 text-sm text-center mt-1">Organize your work and boost productivity</p>
          </div>

          <p className="text-blue-100 text-xs text-center">
            © {new Date().getFullYear()} TaskSync. All rights reserved.
          </p>
        </div>

        {/* Right Section */}
        <div className="w-full md:w-3/5 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-md mx-auto">
            <div className="flex justify-end text-xs sm:text-sm mb-3">
              <span className="text-gray-600">
                Don't have an account?{" "}
                <Link to="/sign-up" className="text-blue-600 hover:underline font-medium">
                  Sign up
                </Link>
              </span>
            </div>

            <div className="mb-4 sm:mb-5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Please enter your email and password</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleOnSubmit)} className="space-y-3 sm:space-y-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm text-gray-700">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@gmail.com"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs sm:text-sm text-gray-700">Password</FormLabel>
                        <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Terms Checkbox */}
                <div className="flex items-center text-xs text-gray-600">
                  <input
                    type="checkbox"
                    id="terms"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="ml-2">
                    By login, you agree to our{" "}
                    <a href="#" className="text-blue-600 hover:underline font-medium">
                      Terms & Conditions
                    </a>
                  </label>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="w-full h-9 sm:h-10 my-1 text-xs sm:text-sm"
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" /> : "Sign In"}
                </Button>

                {/* Demo Login */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 sm:h-10 my-1 sm:my-2 text-xs sm:text-sm"
                  onClick={handleDemoLogin}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" /> : "Log in as Demo User"}
                </Button>
              </form>
            </Form>

            {/* Divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">or continue with</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-4">
              <Button variant="outline" className="h-9 sm:h-10 text-xs sm:text-sm">
                Google
              </Button>
              <Button variant="outline" className="h-9 sm:h-10 text-xs sm:text-sm">
                GitHub
              </Button>
            </div>

            <p className="text-center text-xs text-gray-500">
              Need help?{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;