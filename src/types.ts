import { IRequest, Route, RouterType } from "itty-router"

export type CustomRouter = RouterType & {
  get: Route
  post: Route
  all: Route
}

export type CustomRequest = IRequest & Request
