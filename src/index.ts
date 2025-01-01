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
  const todayActNotify = async () => {
    const rows = await ctx.messageTopicService.getTopicSubscribeByTopic(topic);
    if (rows.length < 1) {
      return;
    }
    const actNotify = await Code.getActNotify({ http: ctx.http });
    if (!actNotify.actData) {
      actNotify.actData = (
        await Code.getActData({ http: ctx.http, actId: actNotify.actId })
      )?.live?.start;
    }
    const date = new Date(actNotify.actData);
    const time = date.getTime();
    if (!actNotify.actData || isNaN(time)) {
      ctx.logger.error("没有获取到前瞻时间");
      return;
    }
    const nowS = new Date();
    const nowE = new Date();
    nowS.setHours(0, 0, 0, 0);
    nowE.setHours(23, 59, 59, 999);
    if (time < nowS.getTime() || nowE.getTime() < time) {
      return;
    }
    return actNotify;
  };
  const cronTask = async () => {
    try {
      const actNotify = await todayActNotify();
      if (!actNotify) {
        return;
      }
      ctx.messageTopicService
        .sendMessageToTopic(
          topic,
          Code.liveBroadcastTime(new Date(actNotify.actData)),
        )
        .then();
      startWatch();
    } catch (e) {
      ctx.logger.error(e);
    }
  };
  ctx.cron("15 19 * * *", cronTask);

  (async () => {
    const date = new Date();
    if (
      date.getHours() < 19 ||
      (date.getHours() === 19 && date.getMinutes() < 15)
    ) {
      return;
    }
    try {
      const actNotify = await todayActNotify();
      if (!actNotify) {
        return;
      }
      startWatch();
    } catch (e) {
      ctx.logger.error(e);
    }
  })();

  let watchDayStart: number = null;
  let watchDayEnd: number = null;
  const startWatch = () => {
    const nowS = new Date();
    const nowE = new Date();
    nowS.setHours(0, 0, 0, 0);
    nowE.setHours(23, 59, 59, 999);
    watchDayStart = nowS.getTime();
    watchDayEnd = nowE.getTime();
    watch();
  };

  const watch = () => {
    ctx.setTimeout(
      async () => {
        const time = Date.now();
        if (time < watchDayStart || watchDayEnd < time) {
          return;
        }
        try {
          const msg = await Code.get({ http: ctx.http });
          ctx.messageTopicService
            .sendMessageToTopic(topic, "星铁兑换码\n" + msg)
            .then();
          if (msg.split("\n").length >= 3) {
            return;
          }
        } catch (e) {
          ctx.logger.debug(e);
        }
        watch();
      },
      5 * 60 * 1000,
    );
  };

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
