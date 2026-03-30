import type { SerializedError } from '@renderer/types/error'

export interface ErrorClassification {
  category: 'auth' | 'model' | 'quota' | 'network' | 'content' | 'server' | 'mcp' | 'knowledge' | 'unknown'
  i18nKey: string
  navTarget: string | null
}

export function classifyError(error?: SerializedError): ErrorClassification {
  if (!error) {
    return { category: 'unknown', i18nKey: 'error.diagnosis.unknown', navTarget: null }
  }

  const status = (error as Record<string, unknown>).statusCode ?? (error as Record<string, unknown>).status
  const numStatus = typeof status === 'number' ? status : typeof status === 'string' ? parseInt(status, 10) : undefined
  const msg = ((error.message as string) || '').toLowerCase()

  // Auth errors
  if (
    numStatus === 401 ||
    msg.includes('invalid_api_key') ||
    msg.includes('authentication') ||
    msg.includes('unauthorized')
  ) {
    return { category: 'auth', i18nKey: 'error.diagnosis.auth', navTarget: '/settings/provider' }
  }

  // Model not found
  if (numStatus === 404 || msg.includes('model_not_found') || msg.includes('does not exist')) {
    return { category: 'model', i18nKey: 'error.diagnosis.model', navTarget: '/settings/provider' }
  }

  // Quota / rate limit
  if (
    numStatus === 429 ||
    msg.includes('quota') ||
    msg.includes('rate_limit') ||
    msg.includes('rate limit') ||
    msg.includes('insufficient_balance') ||
    msg.includes('insufficient_quota')
  ) {
    return { category: 'quota', i18nKey: 'error.diagnosis.quota', navTarget: '/settings/provider' }
  }

  // Network errors
  if (
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('enotfound')
  ) {
    return { category: 'network', i18nKey: 'error.diagnosis.network', navTarget: '/settings/general' }
  }

  // Content filter
  if (
    numStatus === 400 &&
    (msg.includes('content_filter') || msg.includes('safety') || msg.includes('content_policy'))
  ) {
    return { category: 'content', i18nKey: 'error.diagnosis.content', navTarget: null }
  }

  // Server errors (5xx)
  if (numStatus && numStatus >= 500) {
    return { category: 'server', i18nKey: 'error.diagnosis.server', navTarget: null }
  }

  // Knowledge base / embedding
  if (msg.includes('embedding') || msg.includes('vectorize') || msg.includes('knowledge')) {
    return { category: 'knowledge', i18nKey: 'error.diagnosis.knowledge', navTarget: '/settings/provider' }
  }

  // MCP errors
  if (msg.includes('mcp')) {
    return { category: 'mcp', i18nKey: 'error.diagnosis.mcp', navTarget: '/settings/mcp/servers' }
  }

  return { category: 'unknown', i18nKey: 'error.diagnosis.unknown', navTarget: null }
}
