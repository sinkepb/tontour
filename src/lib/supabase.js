import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Mode démo : aucune variable d'environnement Supabase renseignée.
// L'application entière (4 interfaces) fonctionne alors en local via
// demoStore.js — pratique pour tester sans backend avant de brancher Supabase.
export const isDemo = !url || !anonKey

export const supabase = isDemo ? null : createClient(url, anonKey)
