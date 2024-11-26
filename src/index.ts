import { Context, Schema } from "koishi";
// noinspection ES6UnusedImports
import {} from "koishi-plugin-message-topic-service";
// noinspection ES6UnusedImports
import {} from "koishi-plugin-cron";
import Code from "./Code";

export const name = "star-rail-forecast-code";

export const inject = ["messageTopicService", "cron"];

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  const topic = "星铁.前瞻.开播";
  ctx.messageTopicService.registerTopic(topic).then();
  ctx.cron("0 19 * * *", async () => {
    try {
      const rows =
        await ctx.messageTopicService.getTopicSubscribeByTopic(topic);
      if (rows.length < 1) {
        return;
      }
      let act = await Code.getActData({ http: ctx.http });
      const createdAt = act.data.post.created_at;
      if (createdAt) {
        const date = new Date(
          +(createdAt + ((createdAt + "").length < 13 ? "000" : "")),
        );
        date.setHours(23, 59, 59, 999);
        if (date.getTime() < Date.now()) {
          return;
        }
      }
      ctx.messageTopicService
        .sendMessageToTopic(topic, "今天有星铁前瞻！")
        .then();
    } catch (e) {
      ctx.logger.error(e);
    }
  });
  ctx.command("星铁前瞻订阅").action(async ({ session }) => {
    await ctx.messageTopicService.topicSubscribe({
      platform: session.bot.platform,
      selfId: session.bot.selfId,
      channelId: session.channelId,
      bindingKey: topic,
      enable: true,
    });
    return "订阅成功";
  });
  ctx.command("星铁前瞻不订阅").action(async ({ session }) => {
    await ctx.messageTopicService.topicSubscribe({
      platform: session.bot.platform,
      selfId: session.bot.selfId,
      channelId: session.channelId,
      bindingKey: topic,
      enable: false,
    });
    return "不订阅成功";
  });
  ctx.command("星铁前瞻").action(async ({ session }) => {
    try {
      const msg = await Code.get({ http: ctx.http });
      await session.send(msg);
    } catch (e) {
      ctx.logger.error(e);
      await session.send(e.eMsg ? e.eMsg : "获取失败");
    }
  });
}
