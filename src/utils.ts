import { IRequest } from "itty-router"
import ms, { StringValue } from "ms"

import { ok, RequestInitExStatus } from "@worker-tools/response-creators"

export enum MetaKey {
  MATCHES_LAST_FETCHED = "MATCHES_LAST_FETCHED",
  TEAMS_LAST_FETCHED = "TEAMS_LAST_FETCHED",
}

export const ms2s = (n: number) => Math.round(n / 1000)

export const nowSeconds = () => ms2s(Date.now())

export const seconds = (input: StringValue) => ms2s(ms(input))

const jsonInit: RequestInitExStatus = {
  headers: { "Content-Type": "application/json" },
}
export const json = <T = unknown>(data: T, init?: RequestInitExStatus) =>
  ok(
    JSON.stringify(data, null, 2),
    init == null
      ? jsonInit
      : {
          ...init,
          headers: {
            "Content-Type": "application/json",
            // eslint-disable-next-line unicorn/no-useless-fallback-in-spread
            ...(init.headers ?? {}),
          },
        },
  )

export const getCountry = (request: IRequest) => {
  if (request.cf != null && "country" in request.cf) {
    return request.cf.country
  }

  return "UNKNOWN"
}

export const EDGE_CACHE_TIMEOUT = 10_800 // seconds("3h")
const BROWSER_CACHE_TIMEOUT = 3600 // seconds("1h")

export const getTtl = (lastFetchedAt: number, ttl: number) => {
  const now = nowSeconds()
  const fetchedAtSeconds = ms2s(lastFetchedAt)
  const expiresAt = fetchedAtSeconds + ttl

  return Math.max(0, expiresAt - now)
}

export const getBrowserCacheTtl = (ttl: number) => Math.min(BROWSER_CACHE_TIMEOUT, ttl)

export const buildCacheResponse = <T = unknown>(data: T, lastFetched: number) => {
  const ttl = getTtl(lastFetched, EDGE_CACHE_TIMEOUT)

  return json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${ttl} max-age=${getBrowserCacheTtl(ttl)}`,
    },
  })
}
