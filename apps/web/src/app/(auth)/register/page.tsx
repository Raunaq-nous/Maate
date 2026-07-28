// ============================================
// MAATE WEB — Signup Page
// Patient Account Registration
// ============================================

"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/auth.schema";
import { useAuth } from "@/hooks/use-auth";
import { MedicalInput } from "@/components/ui/medical-input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const { register: signup, isLoading } = useAuth();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: true,
    }
  });

  const passwordValue = watch("password", "");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold font-outfit tracking-tight text-foreground">Create account</h2>
        <p className="text-muted-foreground">Start your secure health management journey.</p>
      </div>

      <form onSubmit={handleSubmit(signup)} className="space-y-4">
        <MedicalInput
          label="Full Name"
          placeholder="Vaibhav Singh"
          {...register("fullName")}
          error={errors.fullName?.message}
          disabled={isLoading}
        />
        <MedicalInput
          label="Email Address"
          placeholder="vaibhav@email.com"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          disabled={isLoading}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MedicalInput
            label="Password"
            placeholder="••••••••"
            type="password"
            {...register("password")}
            error={errors.password?.message}
            disabled={isLoading}
          />
          <MedicalInput
            label="Confirm Password"
            placeholder="••••••••"
            type="password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            disabled={isLoading}
          />
        </div>

        {/* Password Strength Checklist */}
        <div className="bg-muted/30 p-3 rounded-xl space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Security Requirements</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <PasswordRequirement label="8+ chars" met={passwordValue.length >= 8} />
            <PasswordRequirement label="Lowercase" met={/[a-z]/.test(passwordValue)} />
            <PasswordRequirement label="Uppercase" met={/[A-Z]/.test(passwordValue)} />
            <PasswordRequirement label="Number" met={/[0-9]/.test(passwordValue)} />
            <PasswordRequirement label="Symbol" met={/[^A-Za-z0-9]/.test(passwordValue)} />
          </div>
        </div>

        <div className="flex items-start gap-2 px-1">
          <input 
            type="checkbox" 
            id="terms" 
            {...register("terms")}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
            I agree to the <Link href="/terms" className="font-bold text-primary">Terms of Service</Link> and <Link href="/privacy" className="font-bold text-primary">Privacy Policy</Link>.
          </label>
        </div>
        {errors.terms && <p className="text-[12px] text-health-critical font-medium ml-1">{errors.terms.message}</p>}

        <Button 
          type="submit" 
          className="w-full rounded-xl h-12 font-bold shadow-health-md"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
          {!isLoading && <ArrowRight className="ml-2" size={18} />}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Login instead
        </Link>
      </p>
    </div>
  );
}

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${met ? "text-health-normal" : "text-muted-foreground"}`}>
      <CheckCircle2 size={12} className={met ? "fill-health-normal/10" : "opacity-30"} />
      {label}
    </div>
  );
}
