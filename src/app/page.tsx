import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";

export default async function RootPage() {
  const session = await getCurrentSession();
  redirect(session ? "/dashboard" : "/login");
}
