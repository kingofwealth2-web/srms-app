import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kfcqkgvuluftnwzeqzmw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmY3FrZ3Z1bHVmdG53emVxem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzkwMTUsImV4cCI6MjA4NzQ1NTAxNX0.dOW3c8XIfFbIq2ls9gEjgowWguIlWLVflR7nErXojDI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
