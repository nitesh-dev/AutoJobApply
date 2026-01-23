export type Role = 'GPT' | 'FINDER' | 'ANALYZER' | 'FORM_FILLER';

export interface Job {
    id: string;
    title: string;
    url: string;
    status: 'pending' | 'analyzing' | 'applying' | 'completed' | 'skipped' | 'failed';
    message?: string;
}

export interface Stats {
    totalFound: number;
    analyzed: number;
    skipped: number;
    applying: number;
    completed: number;
    failed: number;
    queueSize: number;
    pending: number;
    isRunning: boolean;
    currentJob: Job | null;
    jobQueue: Job[];
    tabs: Record<string, { role: Role; platform?: string }>;
}

export interface UserConfig {
    resumeText: string;
    runInBackground: boolean;
    useLocalGpt: boolean;
    localGptEndpoint: string;
    localGptModel: string;
    query: {
        search: string;
        location: string;
    }[];
    platform: {
        indeed: boolean;
        linkedin: boolean;
    };
}

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
    'REPORT_JOB_STATUS': { status: 'analyzing' | 'applying' | 'completed' | 'skipped' | 'failed', message?: string };
    'PROCESS_NEXT_JOB': void;
    'GET_STATS': void;
    'GET_CONFIG': void;
    'UPDATE_CONFIG': Partial<UserConfig>;
    'START_AUTOMATION': void;
    'STOP_AUTOMATION': void;
    'FETCH_JOBS': void;
    'CLEAR_CACHE': void;
};

export type MessageType = keyof MessageMap;

export type ExtensionMessage<K extends MessageType = MessageType> = {
    type: K;
    payload: MessageMap[K];
    requestId?: string;
};

