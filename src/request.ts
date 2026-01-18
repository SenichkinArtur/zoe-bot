import https from "node:https";
import axios from "axios";

// agent that skips TLS verification for www.zoe.com.ua host
const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
  servername: "www.zoe.com.ua",
});

export const getData = async (
  url: string,
): Promise<{ data: string } | { error: Error }> => {
  return axios
    .get(url, { httpsAgent: insecureAgent, proxy: false })
    .then((response) => ({ data: response.data }))
    .catch((error) => ({ error }));
};
