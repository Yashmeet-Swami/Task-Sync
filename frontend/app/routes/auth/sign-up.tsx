import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import LoginAnimation from "@/assets/Login.json";

import { signUpSchema } from "@/lib/schema";
import { useSignUpMutation } from "@/hooks/use-auth";
import { toast } from "sonner";

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

import { Mail, User, Lock, Check } from "lucide-react";

export type SignupFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const navigate = useNavigate();
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useSignUpMutation();

  const handleOnSubmit = (values: SignupFormData) => {
    mutate(values, {
      onSuccess: () => {
        toast.success("Email Verification Required", {
          description: "Check your email for a verification link.",
        });
        form.reset();
        navigate("/sign-in");
      },
      onError: (error: any) => {
        const errMsg = error.response?.data?.message || "An error occurred";
        toast.error(errMsg);
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#c2d4ff] via-[#e2d6f3] to-[#f3e8ff] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl flex w-full max-w-5xl overflow-hidden border border-indigo-100"
      >
        {/* Lottie Animation - purely decorative, hidden from the accessibility tree
            (also avoids exposing whatever ARIA the animation JSON's generated SVG carries) */}
        <div
          className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-100 to-purple-100 items-center justify-center p-6"
          aria-hidden="true"
        >
          <Lottie
            animationData={LoginAnimation}
            loop
            autoplay
            className="w-full h-auto max-w-md"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 md:p-10">
          <h1 className="text-2xl font-bold text-indigo-700 text-center mb-1">
            Create Your Account
          </h1>
          <p className="text-sm text-center text-gray-500 mb-6">
            Start your journey with us 🚀
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleOnSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <Input
                          className="pl-10 focus-visible:ring-indigo-400"
                          placeholder="John Doe"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <Input
                          className="pl-10 focus-visible:ring-indigo-400"
                          placeholder="email@example.com"
                          type="email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <Input
                          className="pl-10 focus-visible:ring-indigo-400"
                          placeholder="••••••••"
                          type="password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                        <Input
                          className="pl-10 focus-visible:ring-indigo-400"
                          placeholder="••••••••"
                          type="password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold py-2 rounded-md transition-all shadow-md"
                disabled={isPending}
              >
                {isPending ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-gray-500 mt-6 text-center">
            Already have an account?{" "}
            <Link
              to="/sign-in"
              className="text-indigo-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUp;
