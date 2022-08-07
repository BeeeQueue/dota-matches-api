import { APIApplicationCommandInteractionDataStringOption } from "discord-api-types/payloads/v10/_interactions/_applicationCommands/_chatInput/string"
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from "discord-api-types/v10"
import { isTruthy } from "remeda"

import { badRequest } from "@worker-tools/response-creators"

import { decode, encode } from "../msgpack"
import { json } from "../utils"

import { Guild } from "./index"

export enum Command {
  Follow = "follow",
  Unfollow = "unfollow",
  List = "follows",
}

// enum MessageComponentId {}

export const handleFollowCommand = async (
  env: Env,
  body: APIChatInputApplicationCommandInteraction,
) => {
  const guildId = body.guild_id!
  const teamNames = body.data
    .options!.map((option) =>
      option.type === ApplicationCommandOptionType.String ? option.value : null,
    )
    .filter(isTruthy)

  const guildObject = await env.WEBHOOKS.get(guildId)
  if (guildObject == null) {
    return badRequest("Guild not registered.")
  }

  const guild = await decode<Guild>(guildObject)
  guild.subscriptions[body.channel_id] ??= []

  for (const subscribedChannelId in guild.subscriptions) {
    if (subscribedChannelId === body.channel_id) {
      guild.subscriptions[body.channel_id] = [
        // New teams are added _first_ in the array, to make deduping easier
        ...new Set([...teamNames, ...guild.subscriptions[body.channel_id]]),
      ]
    }
  }

  await env.WEBHOOKS.put(guildId, encode(guild))

  const response: APIInteractionResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `Okay, I will now notify you those teams' matches.`,
    },
  }

  return json(response)
}

export const handleUnfollowCommand = async (
  env: Env,
  body: APIChatInputApplicationCommandInteraction,
) => {
  const guildId = body.guild_id!
  const teamOption = body.data.options!.find(
    (option): option is APIApplicationCommandInteractionDataStringOption =>
      option.type === ApplicationCommandOptionType.String && option.name === "team_name",
  )

  if (teamOption == null) {
    return badRequest("Got no team name.")
  }

  const guildObject = await env.WEBHOOKS.get(guildId)
  if (guildObject == null) {
    return badRequest("Guild not registered.")
  }

  const guild = await decode<Guild>(guildObject)
  if (
    guild.subscriptions[body.channel_id] == null ||
    !guild.subscriptions[body.channel_id].includes(teamOption.value)
  ) {
    return badRequest("Channel is not subscribed to that team.")
  }

  const index = guild.subscriptions[body.channel_id].indexOf(teamOption.value)
  guild.subscriptions[body.channel_id].splice(index, 1)

  await env.WEBHOOKS.put(guildId, encode(guild))

  const response: APIInteractionResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `Okay, you will no longer receive notifications for that team.`,
    },
  }

  return json(response)
}

export const handleListCommand = async (
  env: Env,
  body: APIChatInputApplicationCommandInteraction,
) => {
  const guildObject = await env.WEBHOOKS.get(body.guild_id!)
  if (guildObject == null) {
    return badRequest("Guild not registered.")
  }

  const guild = await decode<Guild>(guildObject)
  if (guild.subscriptions[body.channel_id] == null) {
    const response: APIInteractionResponse = {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `This channel is not following any teams. Follow some with '/follow <team>'!`,
      },
    }

    return json(response)
  }

  const response: APIInteractionResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `This channel is following:
\`\`\`
${guild.subscriptions[body.channel_id].join("\n")}
\`\`\``,
    },
  }

  return json(response)
}
