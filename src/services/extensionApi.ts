import { ChromeApiResponse } from "@/background/type";
import { ExtensionMessage, MessageMap, MessageType, Stats, UserConfig } from "@/types";
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
    registerTab: (payload: MessageMap['REGISTER_TAB']): Promise<boolean> =>
        sendMessage('REGISTER_TAB', payload),

    jobListFound: (jobs: MessageMap['JOB_LIST_FOUND']['jobs']): Promise<void> =>
        sendMessage('JOB_LIST_FOUND', { jobs }),

    proxyGpt: (prompt: string): Promise<string> =>
        sendMessage('PROXY_PROMPT_GPT', { prompt }),

    reportJobStatus: (status: MessageMap['REPORT_JOB_STATUS']['status']): Promise<void> =>
        sendMessage('REPORT_JOB_STATUS', { status }),

    getStats: (): Promise<Stats> =>
        sendMessage('GET_STATS', undefined),

    getConfig: (): Promise<UserConfig> =>
        sendMessage('GET_CONFIG', undefined),

    updateConfig: (config: Partial<UserConfig>): Promise<UserConfig> =>
        sendMessage('UPDATE_CONFIG', config),

    startAutomation: (): Promise<void> =>
        sendMessage('START_AUTOMATION', undefined),

    stopAutomation: (): Promise<void> =>
        sendMessage('STOP_AUTOMATION', undefined),

    fetchJobs: (): Promise<void> =>
        sendMessage('FETCH_JOBS', undefined),

    clearCache: (): Promise<boolean> =>
        sendMessage('CLEAR_CACHE', undefined),
};



