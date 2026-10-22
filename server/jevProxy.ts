import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { config as loadEnv } from 'dotenv'

loadEnv()

interface CurateBody {
  recentTitles: string[]
  candidates: Array<{
    id: string
    title: string
    overview?: string
    mediaType?: string
  }>
  rowIds: string[]
}

async function readJsonBody(req: IncomingMessage): Promise<CurateBody> {
  const parts: string[] = []
  for await (const chunk of req) {
    parts.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
  }
  return JSON.parse(parts.join('')) as CurateBody
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

/**
 * Proxy server-side do Jev (TypeSafe).
 * A chave TYPESAFE_API_KEY nunca vai para o bundle do browser/TV.
 */
export function jevProxyPlugin(): Plugin {
  return {
    name: 'jev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/jev/curate', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        void (async () => {
          try {
            const body = await readJsonBody(req)
            const apiKey = process.env.TYPESAFE_API_KEY?.trim()
            if (!apiKey) {
              sendJson(res, 503, {
                ok: false,
                reason: 'TYPESAFE_API_KEY ausente',
              })
              return
            }

            const { TypeSafeClient, choice, score } = await import(
              '@typesafe-ai/sdk'
            )
            const client = new TypeSafeClient({ apiKey })

            const top = body.candidates.slice(0, 8)
            const criteria = Object.fromEntries(
              top.map((c) => [
                c.id,
                `${c.title} (${c.mediaType ?? 'title'}): ${(c.overview ?? '').slice(0, 120)}`,
              ]),
            )

            const rowCriteria = Object.fromEntries(
              body.rowIds.slice(0, 8).map((id) => [id, `Fileira de catálogo: ${id}`]),
            )

            const questions: Record<string, unknown> = {}
            if (Object.keys(criteria).length >= 2) {
              questions.featured = choice(
                'Qual título merece destaque na coluna lateral para este espectador?',
                criteria,
              )
            }
            if (Object.keys(rowCriteria).length >= 2) {
              questions.primaryRow = choice(
                'Qual fileira deve aparecer mais perto do topo?',
                rowCriteria,
              )
            }
            if (top[0]) {
              questions.relevance = score(
                `Quão relevante é "${top[0].title}" dado o histórico recente?`,
                [
                  'Irrelevante',
                  'Pouco relacionado',
                  'Moderado',
                  'Bem alinhado',
                  'Perfeito para o gosto',
                ],
              )
            }

            if (Object.keys(questions).length === 0) {
              sendJson(res, 200, {
                ok: true,
                featuredId: null,
                primaryRowId: null,
                relevanceScore: null,
              })
              return
            }

            const response = await client.systemOne({
              state: {
                recentTitles: body.recentTitles.slice(0, 5),
                note: 'Curadoria de launcher de streaming para TV no Brasil.',
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
              questions: questions as any,
            })

            const answers = response.answers as {
              featured?: { choice?: string; confidence?: number }
              primaryRow?: { choice?: string }
              relevance?: { score?: number }
            }

            sendJson(res, 200, {
              ok: true,
              featuredId: answers.featured?.choice ?? null,
              featuredConfidence: answers.featured?.confidence ?? null,
              primaryRowId: answers.primaryRow?.choice ?? null,
              relevanceScore: answers.relevance?.score ?? null,
            })
          } catch (err) {
            sendJson(res, 500, {
              ok: false,
              reason: err instanceof Error ? err.message : 'Falha Jev',
            })
          }
        })()
      })
    },
  }
}
