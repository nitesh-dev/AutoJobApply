// import { openUrls } from "./handlers/url";
import { openTab, closeTab } from "./handlers/tabs";

const handlers = {
    openTab,
    closeTab,
};

export async function dispatch(msg: { action: string; data?: any }) {
    const handler = (handlers as any)[msg.action];
    if (!handler) return { error: `Unknown action: ${msg.action}` };
    return handler(msg.data);
}