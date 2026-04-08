import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fwldimnufoblhdsflkrm.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bGRpbW51Zm9ibGhkc2Zsa3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMzNTMsImV4cCI6MjA5MTE0OTM1M30.vEhlWZEXZfQs0tESkQKu7QUSQueNu7JDaQ2D0BwDzrg"

export const supabase = createClient(supabaseUrl, supabaseKey)