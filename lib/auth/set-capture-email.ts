'use server'

import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function setCaptureEmail(userId: string, email: string): Promise<void> {
  const domain = process.env.INBOUND_EMAIL_DOMAIN
  if (!domain) throw new Error('INBOUND_EMAIL_DOMAIN is not set')

  const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  const suffix = randomBytes(2).toString('hex') // 4 hex chars
  const captureEmail = `${username}-${suffix}@${domain}`

  const supabase = await createClient()
  const { error } = await supabase
    .from('users')
    .update({ capture_email: captureEmail })
    .eq('id', userId)
    .is('capture_email', null) // idempotent — only set if not already assigned

  if (error) throw error
}
