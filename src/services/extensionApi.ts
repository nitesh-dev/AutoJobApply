import { ChromeApiResponse } from "@/background/type";
import { ExtensionMessage, MessageMap, MessageType } from "@/types";
import browser from "webextension-polyfill";

export async function sendMessage<K extends MessageType>(
    type: K,
    payload: MessageMap[K]
): Promise<any> {
    const msg: ExtensionMessage<K> = { type, payload };
    const response: ChromeApiResponse<any> = await browser.runtime.sendMessage(msg);

    if (response && response.success) {
        return response.data;
    }

    throw new Error(response?.error || 'Unknown extension API error');
}

// Specific API functions
export const api = {
    registerTab: (payload: MessageMap['REGISTER_TAB']) =>
        sendMessage('REGISTER_TAB', payload),

    jobListFound: (jobs: MessageMap['JOB_LIST_FOUND']['jobs']) =>
        sendMessage('JOB_LIST_FOUND', { jobs }),

    proxyGpt: (prompt: string) =>
        sendMessage('PROXY_PROMPT_GPT', { prompt }),

    reportJobStatus: (status: MessageMap['REPORT_JOB_STATUS']['status']) =>
        sendMessage('REPORT_JOB_STATUS', { status }),

    getStats: () =>
        sendMessage('GET_STATS', undefined),
};



