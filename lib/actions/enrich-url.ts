'use server'

/**
 * Server Action wrapper around the enrichment pipeline.
 *
 * Delegates to lib/enrichment/enrich.ts which holds the actual implementation
 * (and is also called directly by /api/enrich-stream for the streaming UX).
 *
 * Client components that want the simple one-shot enrichment call import
 * this; client components that want progressive streaming hit
 * /api/enrich-stream instead.
 */

import {
  enrichUrl as enrichUrlImpl,
  type EnrichedUrl,
  type ExtractedData,
} from '@/lib/enrichment/enrich'

export async function enrichUrl(rawUrl: string): Promise<EnrichedUrl> {
  return enrichUrlImpl(rawUrl)
}

export type { EnrichedUrl, ExtractedData }
