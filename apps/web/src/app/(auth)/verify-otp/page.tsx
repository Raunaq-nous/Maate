// ============================================
// MAATE WEB — OTP Verification
// Secure account activation
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpSchema, OtpInput } from "@/lib/auth.schema";
import { MedicalInput } from "@/components/ui/medical-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";

export default function VerifyOtpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
  });

  useEffect(() => {
    const checkDevMode = () => {
      const isDev = process.env.NODE_ENV === 'development' || 
                    (typeof window !== 'undefined' && window.location.hostname === 'localhost');
      setIsDevMode(isDev);
      if (isDev && email) {
        // Fetch the last generated OTP for dev helpers
        apiClient.get(`/auth/dev/last-otp?email=${encodeURIComponent(email)}`)
          .then((res) => {
            if (res.data?.otp) {
              setDevOtp(res.data.otp);
            }
          })
          .catch((err) => {
            console.warn("Could not fetch dev OTP:", err);
          });
      }
    };
    checkDevMode();
  }, [email]);

  const onSubmit = async (data: OtpInput) => {
    setIsLoading(true);
    try {
      await apiClient.post("/auth/verify-otp", { email, otp: data.otp });
      toast({
        title: "Account verified",
        description: "Your secure clinical profile is now active.",
      });
      router.push("/login");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: err.response?.data?.message || "Invalid or expired OTP.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;
    try {
      await apiClient.post("/auth/send-otp", { email });
      toast({
        title: "OTP Resent",
        description: "A new 6-digit verification code has been sent to your email.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Resend failed",
        description: err.response?.data?.message || "Failed to resend OTP. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-health-normal/10 flex items-center justify-center text-health-normal mb-6">
          <ShieldCheck size={28} />
        </div>
        <h2 className="text-3xl font-bold font-outfit tracking-tight text-foreground">Check your email</h2>
        <p className="text-muted-foreground leading-relaxed">
          We've sent a 6-digit verification code to <span className="text-foreground font-bold">{email}</span>.
        </p>
      </div>

      {isDevMode && devOtp && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 space-y-2 text-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            Development Helper
          </div>
          <p className="text-xs opacity-90 leading-relaxed">
            Email sending is running in development fallback mode (no SMTP configured). The generated code for this session is: <strong className="font-mono text-base tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mx-1">{devOtp}</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setValue("otp", devOtp, { shouldValidate: true });
              toast({
                title: "Code Auto-filled",
                description: "The development code has been automatically entered for you.",
              });
            }}
            className="text-xs font-bold underline hover:text-amber-500 transition-colors inline-block mt-1"
          >
            Auto-fill Code
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <MedicalInput
          label="Verification Code"
          placeholder="000000"
          maxLength={6}
          {...register("otp")}
          error={errors.otp?.message}
          disabled={isLoading}
          className="text-center text-2xl tracking-[0.5em] font-bold"
        />

        <Button 
          type="submit" 
          className="w-full rounded-xl h-12 font-bold shadow-health-md"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify Account"}
          {!isLoading && <ArrowRight className="ml-2" size={18} />}
        </Button>
      </form>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button 
            type="button"
            onClick={handleResendOtp}
            className="font-bold text-primary hover:underline"
          >
            Resend OTP
          </button>
        </p>
        <button 
          onClick={() => router.back()}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          Change email address
        </button>
      </div>
    </div>
  );
}
