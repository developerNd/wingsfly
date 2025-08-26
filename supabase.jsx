import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://gfarawteoddiohfggxyj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYXJhd3Rlb2RkaW9oZmdneHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MzE5MzksImV4cCI6MjA3MDIwNzkzOX0.42dW6rD5Ebqrcc5hQPz4849hYYda0V0KBPo-BfqU8c4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
 //   debug: __DEV__, 
  },
});