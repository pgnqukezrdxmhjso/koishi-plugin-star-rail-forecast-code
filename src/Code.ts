import { HTTP } from "koishi";

const DefaultHeads = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Origin: "https://www.miyoushe.com",
  Referer: "https://www.miyoushe.com/",
};
const DefaultHeads2 = {
  ...DefaultHeads,
  Origin: "https://webstatic.mihoyo.com",
  Referer: "https://webstatic.mihoyo.com/",
};
const getUrl = async ({
  http,
  url,
  heads = {},
  type = 0,
}: {
  http: HTTP;
  url: string;
  heads?: {};
  type?: 0 | 1;
}) => {
  const config = {
    headers: {
      ...(type === 0 ? DefaultHeads : DefaultHeads2),
      ...heads,
    },
  };
  const res = await http.get(url, config);
  if (res.retcode + "" !== "0") {
    const error = new Error(JSON.stringify(res));
    error["eMsg"] = res.message;
    throw error;
  }
  return res.data;
};

const Code = {
  async getActData({ http }: { http: HTTP }) {
    const data = await getUrl({
      http,
      url: "https://bbs-api.miyoushe.com/post/wapi/userPost?size=20&uid=80823548",
    });
    const list: any[] = data?.list || [];
    const target = list.filter((item) =>
      item?.post?.subject?.includes("版本前瞻"),
    )[0];
    if (!target) {
      throw { eMsg: "没有获取到前瞻信息" };
    }
    const createdAt = target.post.created_at;
    if (createdAt) {
      const date = new Date(
        +(createdAt + ((createdAt + "").length < 13 ? "000" : "")),
      );
      date.setHours(23, 59, 59, 999);
      if (date.getTime() + 24 * 60 * 60 * 1000 < Date.now()) {
        throw { eMsg: "已经结束了" };
      }
    }
    const structuredContent: any[] = JSON.parse(target.post.structured_content);
    const linkContent = structuredContent?.filter((item) =>
      item?.attributes?.link?.includes("act_id="),
    )[0];
    if (!linkContent) {
      throw { eMsg: "没有获取到前瞻信息." };
    }
    const actId = new URL(linkContent.attributes.link).searchParams.get(
      "act_id",
    );
    if (!actId) {
      throw { eMsg: "没有获取到前瞻信息.." };
    }
    return { actId, data };
  },
  async getCode({ http, actId }: { http: HTTP; actId: string }) {
    const data = await getUrl({
      http,
      type: 1,
      url: "https://api-takumi.mihoyo.com/event/miyolive/index",
      heads: {
        "x-rpc-act_id": actId,
      },
    });
    const codeVer = data?.live?.code_ver;
    if (!codeVer) {
      throw { eMsg: "没有获取到前瞻信息..." };
    }
    const codeData = await getUrl({
      http,
      type: 1,
      url: `https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode?version=${codeVer}&time=${(Date.now() + "").replace(/\d{3}$/, "").length}`,
      heads: {
        "x-rpc-act_id": actId,
      },
    });
    const codeList: any[] = codeData.code_list || [];
    if (!codeList || codeList.length < 1) {
      throw { eMsg: "没有获取到兑换码" };
    }
    let msg = "";
    codeList.forEach((item) => {
      msg += item.code + "\n";
    });
    return msg;
  },
  async get({ http }: { http: HTTP }): Promise<string> {
    const { actId } = await Code.getActData({ http });
    return await Code.getCode({ http, actId });
  },
};

export default Code;
