import { Router } from "itty-router"

import { notFound, temporaryRedirect } from "@worker-tools/response-creators"

import { notifier } from "./notify"
import { v1Router } from "./routes/v1"
import { CustomRouter } from "./types"

const router = Router() as CustomRouter

router.all("/v1/*", v1Router.handle)

router.get("/", () => temporaryRedirect("https://github.com/BeeeQueue/dota-matches-api"))

router.all("*", () => notFound())

const worker: ExportedHandler<Env> = {
  fetch: router.handle as never,
  scheduled: notifier,
}

export default worker
