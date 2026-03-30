import { qwenModel } from '@renderer/config/models/default'
import { loggerService } from '@renderer/services/LoggerService'
import store from '@renderer/store'
import type { SerializedError } from '@renderer/types/error'

import { fetchGenerate } from './ApiService'

const logger = loggerService.withContext('ErrorDiagnosisService')

export interface DiagnosisStep {
  text: string
  link?: string
  nav?: string
}

export interface DiagnosisResult {
  summary: string
  steps: DiagnosisStep[]
}

function getDiagnosisModel() {
  const defaultModel = store.getState().llm.defaultModel
  if (defaultModel && defaultModel.id !== 'qwen') {
    return defaultModel
  }
  return qwenModel
}

export async function diagnoseError(error: SerializedError, language: string): Promise<DiagnosisResult> {
  const model = getDiagnosisModel()

  const errorInfo: Record<string, unknown> = {
    name: error.name,
    message: error.message
  }

  const status = (error as Record<string, unknown>).statusCode ?? (error as Record<string, unknown>).status
  if (status) errorInfo.status = status

  const cause = (error as Record<string, unknown>).cause
  if (cause && typeof cause === 'string') {
    errorInfo.responseBody = cause.slice(0, 500)
  }

  const prompt = `You are an error diagnosis assistant for Cherry Studio, an AI chat desktop application.
Analyze the following error and provide a diagnosis in ${language}.

IMPORTANT:
- Respond ONLY with valid JSON, no markdown code blocks
- The JSON must match this exact structure: { "summary": "string", "steps": [{ "text": "string", "link?": "url", "nav?": "internal route" }] }
- "summary" is a brief explanation of what went wrong and why
- "steps" are 2-4 actionable steps to fix the issue
- Each step can optionally have "link" (external URL) or "nav" (internal app route like "/settings/provider")
- Do NOT include API keys, personal data, or file paths in your response`

  const content = `Error details:\n${JSON.stringify(errorInfo, null, 2)}`

  try {
    const response = await fetchGenerate({ prompt, content, model })
    if (!response) {
      throw new Error('Empty response from AI model')
    }

    // Strip markdown code blocks if AI wraps response in ```json ... ```
    const cleaned = response.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(cleaned) as DiagnosisResult
    if (!parsed.summary || !Array.isArray(parsed.steps)) {
      throw new Error('Invalid diagnosis response format')
    }

    return parsed
  } catch (err) {
    logger.error('Error diagnosing error', err as Error)
    throw err
  }
}
