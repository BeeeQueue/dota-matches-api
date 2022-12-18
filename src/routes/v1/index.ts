import { Router } from "itty-router"

import { ExecutionContext } from "@cloudflare/workers-types"

import { createDb } from "../../db"
import { createDotaClient } from "../../dota"
import { CustomRouter } from "../../types"
import {
  buildCacheResponse,
  EDGE_CACHE_TIMEOUT,
  getBrowserCacheTtl,
  getCountry,
  getTtl,
  json,
  MetaKey,
} from "../../utils"

import { discordRouter } from "./discord"

export const v1Router = Router({ base: "/v1" }) as CustomRouter

v1Router.all("/discord/*", discordRouter.handle)

v1Router.get("/matches", async (request, env: Env, ctx: ExecutionContext) => {
  const cached = await caches.default.match(request.url)
  if (cached != null) {
    const lastFetched = Number((await env.META.get(MetaKey.MATCHES_LAST_FETCHED))!)

    return json(await cached.json(), {
      ...cached,
      headers: {
        ...cached.headers,
        "Cache-Control": `public, max-age=${getBrowserCacheTtl(
          getTtl(lastFetched, EDGE_CACHE_TIMEOUT),
        )}`,
      },
    })
  }

  const dota = createDotaClient(env, createDb(env))

  const country = getCountry(request)
  const { matches, lastFetched } = await dota.getMatches(country)

  ctx.waitUntil(
    caches.default
      .put(request.url, buildCacheResponse(matches, lastFetched))
      .catch((error: Error) => console.log(`Failed to cache response: ${error.message}`)),
  )

  return buildCacheResponse(matches, lastFetched)
})
