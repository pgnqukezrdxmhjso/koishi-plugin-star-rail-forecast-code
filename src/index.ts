import { Context, Logger, Schema } from "koishi";
import packageJson from "../package.json";

export const logger = new Logger(packageJson.name);

import Code from "./Code";

export const name = "star-rail-forecast-code";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx.command("星铁前瞻").action(async ({ session }) => {
    try {
      const msg = await Code.get({ http: ctx.http });
      await session.send(msg);
    } catch (e) {
      logger.error(e);
      await session.send(e.eMsg ? e.eMsg : "获取失败");
    }
  });
}
