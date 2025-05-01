import { HTTPFetchError, type WebhookRequestBody, validateSignature } from "@line/bot-sdk"
import { type Env as EnvBase } from "hono"
import { messageEventHandler } from "./line"
import { Hono } from "hono"
import { ApplicationIntegrationType, PermissionFlagsBits } from "discord.js"

interface Env extends EnvBase {
  Variables: {
    lineReq: WebhookRequestBody
  }
}

const app = new Hono<Env>()
  .get("/", (c) => {
    return c.json({
      status: "success",
      message: "Connected successfully!",
    })
  })
  .get("/invite", (c) => {
    const permissions =
      PermissionFlagsBits.CreatePublicThreads |
      PermissionFlagsBits.ManageThreads |
      PermissionFlagsBits.ReadMessageHistory |
      PermissionFlagsBits.SendMessages |
      PermissionFlagsBits.ViewChannel |
      PermissionFlagsBits.UseApplicationCommands
    const oAuth2Url = new URL("https://discord.com/oauth2/authorize")
    oAuth2Url.search = new URLSearchParams({
      permissions: `${permissions}`,
      integration_type: `${ApplicationIntegrationType.GuildInstall}`,
      scope: "bot",
      client_id: Bun.env.DISCORD_CLIENT_ID,
    }).toString()
    return c.redirect(oAuth2Url)
  })
  .post(
    "/line",
    async (c, next) => {
      const rawBody = Buffer.from(await c.req.arrayBuffer())
      const signature = c.req.header("x-line-signature")
      const isValid =
        !!signature && validateSignature(rawBody, Bun.env.LINE_CHANNEL_SECRET, signature)
      if (!isValid) return c.text("Invalid signature", 403)
      c.set("lineReq", JSON.parse(new TextDecoder().decode(rawBody)) as WebhookRequestBody)
      return await next()
    },
    async (c) => {
      const events = c.var.lineReq.events

      // Process all the received events asynchronously.
      const results = await Promise.all(
        events.map(async (event) => {
          try {
            await messageEventHandler(event)
          } catch (err: unknown) {
            if (err instanceof HTTPFetchError) {
              console.error(err.status)
              console.error(err.headers.get("x-line-request-id"))
              console.error(err.body)
            } else if (err instanceof Error) {
              console.error(err)
            }

            // Return an error message.
            return c.json(
              {
                status: "error",
              },
              500,
            )
          }
        }),
      )

      // Return a successful message.
      return c.json({
        status: "success",
        results,
      })
    },
  )

export default app
