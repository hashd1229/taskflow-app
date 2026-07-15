import dotenv from "dotenv";
dotenv.config();

console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY =", process.env.SUPABASE_ANON_KEY ? "Loaded" : "Missing");

export const config = {
  port: process.env.PORT || 3001,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};