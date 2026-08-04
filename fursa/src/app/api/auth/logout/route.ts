import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete("fursa_session");
  response.cookies.delete("fursa_uid");
  return response;
}
