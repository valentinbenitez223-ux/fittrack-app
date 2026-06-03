const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gwpkeeboywqsydjqumzk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGtlZWJveXdxc3lkanF1bXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE4NDksImV4cCI6MjA5NjA2Nzg0OX0.Ysat6PVUMQEfd0Q6LnIniX98tF7blD2fTjtlVN8Nuu0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('Signing up test user...');
  const email = 'test' + Date.now() + '@example.com';
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authError) {
    console.error('Sign up failed:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('User created:', userId);

  console.log('Attempting to upsert student...');
  const studentId = '123e4567-e89b-12d3-a456-426614174000';
  const { data: insertData, error: insertError } = await supabase.from('students').upsert({
    id: studentId,
    name: 'Test Student',
    is_deleted: false,
    created_by: userId
  }).select();

  if (insertError) {
    console.error('Upsert failed:', insertError);
  } else {
    console.log('Upsert succeeded:', insertData);
  }

  console.log('Attempting to query students...');
  const { data: selectData, error: selectError } = await supabase.from('students').select('*');
  
  if (selectError) {
    console.error('Select failed:', selectError);
  } else {
    console.log('Select succeeded. Students found:', selectData.length);
    console.log(selectData);
  }
}

test();
