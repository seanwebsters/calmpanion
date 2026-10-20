import { connection } from "next/server";
import { capabilities } from "@/lib/server/config";

export async function GET() {
  await connection();
  return Response.json(capabilities());
}
