import { redirect } from "next/navigation";

export default function RootPage() {
  // In a real app, check auth state here. 
  // For now, redirect to dashboard as the primary entry point.
  redirect("/dashboard");
}
