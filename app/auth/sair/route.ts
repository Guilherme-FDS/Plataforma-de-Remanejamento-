import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase-servidor";

export async function POST(request: NextRequest) {
  const supabase = clienteServidor();
  await supabase.auth.signOut();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
