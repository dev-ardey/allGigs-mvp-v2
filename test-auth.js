// Test script to check Supabase auth functionality
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPasswordReset() {
  console.log('Testing password reset...')
  console.log('Supabase URL:', supabaseUrl)
  console.log('Using test email: test@example.com')
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail('test@example.com', {
      redirectTo: 'http://localhost:3001/auth/callback'
    })
    
    if (error) {
      console.error('❌ Password reset failed:', error.message)
      console.error('Error details:', error)
    } else {
      console.log('✅ Password reset email sent successfully')
      console.log('Response data:', data)
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

testPasswordReset()
