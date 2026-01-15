import browser from "webextension-polyfill";
import { BackgroundManager } from "./manager";
import { ExtensionMessage } from "../types";

const manager = new BackgroundManager();

console.log('[Background] Service Worker starting...');

browser.runtime.onMessage.addListener((msg: unknown, sender: browser.Runtime.MessageSender) => {
    const message = msg as ExtensionMessage;
    const tabId = sender.tab?.id;

    // Handle messages that return a response
    if (message.type === 'GET_STATS') {
        return Promise.resolve({ success: true, data: manager.getStats() });
    }

    // Handle other messages
    return (async () => {
        try {
            let data: any;
            switch (message.type) {
                case 'REGISTER_TAB':
                    data = tabId ? manager.registerTab(tabId, message.payload as any) : false;
                    break;
                case 'JOB_LIST_FOUND':
                    data = await manager.handleJobListFound(message.payload as any);
                    break;
                case 'PROXY_PROMPT_GPT':
                    data = await manager.handleProxyPrompt(message.payload as any, tabId);
                    break;
                case 'REPORT_JOB_STATUS':
                    data = manager.reportJobStatus((message.payload as any).status);
                    break;
                default:
                    return { success: false, error: 'Unknown message type' };
            }
            return { success: true, data };
        } catch (error) {
            console.error('[Background] Error handling message:', error);
            return { success: false, error: String(error) };
        }
    })();
});

browser.tabs.onRemoved.addListener((tabId) => {
    manager.unregisterTab(tabId);
});
