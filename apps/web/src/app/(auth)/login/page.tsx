// ============================================
// MAATE WEB — Login Page
// Secure authentication with Social & Email
// ============================================

"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/auth.schema";
import { useAuth } from "@/hooks/use-auth";
import { MedicalInput } from "@/components/ui/medical-input";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { Chrome as Google, Apple, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, socialAuth, isLoading } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold font-outfit tracking-tight text-foreground">Welcome back</h2>
        <p className="text-muted-foreground">Please enter your credentials to access your records.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          className="rounded-xl h-12 gap-2" 
          onClick={() => socialAuth('google')}
          disabled={isLoading}
        >
          <Google size={20} />
          Google
        </Button>
        <Button 
          variant="outline" 
          className="rounded-xl h-12 gap-2" 
          onClick={() => socialAuth('apple')}
          disabled={isLoading}
        >
          <Apple size={20} />
          Apple
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-semibold">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(login)} className="space-y-4">
        <MedicalInput
          label="Email Address"
          placeholder="vaibhav@email.com"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          disabled={isLoading}
        />
        <div className="space-y-1">
          <MedicalInput
            label="Password"
            placeholder="••••••••"
            type="password"
            {...register("password")}
            error={errors.password?.message}
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <Link 
              href="/forgot-password" 
              className="text-xs font-bold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full rounded-xl h-12 font-bold shadow-health-md"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Login to Maate"}
          {!isLoading && <ArrowRight className="ml-2" size={18} />}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Register now
        </Link>
      </p>
    </div>
  );
}
