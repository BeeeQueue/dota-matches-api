import { describe, expect, it } from "vitest"

import { BOT_PERMISSIONS } from "../../discord"
import { GUILD_ID } from "../../test-utils"

import { discordRouter } from "./discord"

describe("POST /api/discord/callback", () => {
  it("returns 400 on missing parameters", async (ctx) => {
    const params = new URLSearchParams({})
    const url = new URL(`https://localhost:8787/v1/discord/callback?${params.toString()}`)
    const request = new Request(url.toString())

    const response: Response = await discordRouter.handle(request as never, ctx.env)

    expect(response).toMatchObject({
      status: 400,
    })
  })

  it("returns 200 and saves guild data", async (ctx) => {
    ctx.agent
      .get("https://discord.com")
      .intercept({ path: "/api/v10/oauth2/token", method: "POST" })
      .reply(200, {
        access_token: "access_token",
        expires_in: 60,
        guild: {
          id: GUILD_ID,
        },
      })

    const params = new URLSearchParams({
      code: "123456",
      guild_id: GUILD_ID,
      permissions: BOT_PERMISSIONS,
    })
    const url = new URL(`https://localhost:8787/v1/discord/callback?${params.toString()}`)
    const request = new Request(url.toString())

    const response: Response = await discordRouter.handle(request as never, ctx.env)

    expect(response).toMatchObject({
      status: 200,
    })
  })
})
