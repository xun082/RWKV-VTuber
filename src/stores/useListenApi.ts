import { create } from "zustand";
import { get, listenApiList, set } from "../lib/utils.ts";

type API = {
  listen: ListenApi | null;
  testListen: ListenApiTest | null;
  listenApiList: ListenApiList;
  currentListenApi: string;
  setListenApi: (name: string) => Promise<void>;
};

const localListenApi = await get("default_listen_api");
const defaultLoad =
  listenApiList.find(({ name }) => name === localListenApi) ?? listenApiList[0];
const defaultApi = defaultLoad.api ? defaultLoad.api(undefined) : null;

export const useListenApi = create<API>()((setState) => ({
  listen: defaultApi?.api ?? null,
  testListen: defaultApi?.test ?? null,
  listenApiList: listenApiList,
  currentListenApi: defaultLoad.name,
  setListenApi: async (name) => {
    const item = listenApiList.find((api) => api.name === name);
    if (item && item.api) {
      const api = item.api(undefined);
      setState({
        currentListenApi: name,
        listen: api.api,
        testListen: api.test,
      });
      await set("default_listen_api", name);
    }
  },
}));
