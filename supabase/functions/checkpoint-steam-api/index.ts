import { createHandler } from './handler.mjs';
// The Supabase gateway validates the browser's public anon JWT. No database client is used.
// Only this app-specific Steam secret is read; no Supabase service-role key is accessed.
Deno.serve(createHandler({getKey:()=>Deno.env.get('CHECKPOINT_STEAM_API_KEY')}));
