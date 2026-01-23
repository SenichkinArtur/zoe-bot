import "dotenv/config";
import https from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxyUrl = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
const agent = new HttpsProxyAgent(proxyUrl);

export const getData = async (): Promise<
  { data: string } | { error: Error }
> => {
  try {
    const targetUrl = new URL("https://www.zoe.com.ua/outage/");

    return await new Promise((resolve) => {
      const req = https.get(
        targetUrl,
        {
          agent,
          servername: targetUrl.hostname,
          rejectUnauthorized: false,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
            "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            Connection: "close",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () =>
            resolve({ data: Buffer.concat(chunks).toString("utf8") }),
          );
        },
      );

      req.on("error", (e) =>
        resolve({ error: e instanceof Error ? e : new Error(String(e)) }),
      );
      req.setTimeout(25_000, () => req.destroy(new Error("Request timeout")));
    });
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
};
