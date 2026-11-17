// Public configuration. The Supabase anon key is designed to be public;
// what it can read and write is controlled by the row-level-security policies
// in supabase/schema.sql.
export const SUPABASE_URL = 'https://lcayhsjrmjkwxekutiih.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjYXloc2pybWprd3hla3V0aWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUzMjQzNjMsImV4cCI6MjA0MDkwMDM2M30.HO8ykfrFvwxjhFt5XuDJ1aMvbbIRpnvYO4n18NqXqLc';
export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Minimum number of community submissions before they're offered as a comparison population.
export const COMMUNITY_MIN_N = 30;
