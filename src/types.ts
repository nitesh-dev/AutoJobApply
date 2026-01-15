export type Role = 'GPT' | 'FINDER' | 'ANALYZER' | 'FORM_FILLER';

export interface RegisterTabPayload {
    role: Role;
    platform?: 'INDEED' | 'LINKEDIN';
}

export type MessageMap = {
    'REGISTER_TAB': RegisterTabPayload;
    'JOB_LIST_FOUND': { jobs: any[] };
    'GPT_READY': void;
    'PROMPT_GPT': { prompt: string, requestId?: string }; // Direct to GPT tab
    'PROXY_PROMPT_GPT': { prompt: string }; // From content script to background, returns string
    'REPORT_JOB_STATUS': { status: 'analyzing' | 'applying' | 'completed' | 'skipped' | 'failed' };
    'PROCESS_NEXT_JOB': void;
    'GET_STATS': void;
};

export type MessageType = keyof MessageMap;

export type ExtensionMessage<K extends MessageType = MessageType> = {
    type: K;
    payload: MessageMap[K];
    requestId?: string;
};

