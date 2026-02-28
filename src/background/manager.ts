import { Job, RegisterTabPayload, Role, Stats, UserConfig } from "../types";
import browser from "webextension-polyfill";

export class BackgroundManager {
    private tabs: Record<number, { role: Role; platform?: string }> = {};
    private jobQueue: Job[] = [];
    private currentJob: Job | null = null;
    private isRunning = false;
    private isProcessing = false; // Lock for processNextJob
    private jobTimeoutTimer: any = null;
    private readonly JOB_TIMEOUT_MS = 2 * 60 * 1000; // 2 minute timeout

    private config: UserConfig = {
        resumeText: "",
        resumeFile: undefined,
        runInBackground: false,
        useLocalGpt: false,
        localGptEndpoint: "http://localhost:11434/api/generate",
        localGptModel: "gemma:2b",
        aiProvider: 'gpt',
        query: [],
        platform: {
            indeed: true,
            linkedin: false
        },
        locationKeywords: []
    };

    // Track special tabs
    private gptTabId: number | null = null;
    private geminiTabId: number | null = null;
    private activeJobTabId: number | null = null;
    private automationWindowId: number | null = null;

    private stats = {
        totalFound: 0,
        analyzed: 0,
        skipped: 0,
        applying: 0,
        completed: 0,
        failed: 0
    };

    getStats(): Stats {
        return {
            ...this.stats,
            queueSize: this.jobQueue.length,
            pending: this.jobQueue.filter(j => j.status === 'pending').length,
            currentJob: this.currentJob,
            jobQueue: this.jobQueue,
            tabs: this.tabs as any,
            isRunning: this.isRunning
        };
    }

    async startAutomation(browserId: number | null = null) {
        this.isRunning = true;
        this.currentJob = null;
        this.clearJobTimeout();
        console.log("[Manager] Automation started");


        if(browserId) {
            this.automationWindowId = browserId;
        }else{
            // get current window and use it, otherwise create new
            try {
                const currentWindow = await browser.windows.getCurrent();
                if (currentWindow && currentWindow.id) {
                    this.automationWindowId = currentWindow.id;
                    console.log(`[Manager] Using current window for automation: ${this.automationWindowId}`);
                } else {
                    throw new Error("No current window found");
                }
            } catch (error) {
                console.warn("[Manager] Could not get current window", error);
            }
        }

        // Notify all tabs that automation has started
        for (const tabId of Object.keys(this.tabs)) {
            browser.tabs.sendMessage(Number(tabId), { type: 'START_AUTOMATION' }).catch(() => {});
        }

        // Ensure AI provider is open if not already (only if not using local GPT)
        if (!this.config.useLocalGpt) {
            if (this.config.aiProvider === 'gpt' && !this.gptTabId) {
                await browser.tabs.create({ 
                    url: 'https://chatgpt.com/?temporary-chat=true&bot=true',
                    active: true,
                    windowId: this.automationWindowId ?? undefined
                });
            } else if (this.config.aiProvider === 'gemini' && !this.geminiTabId) {
                await browser.tabs.create({ 
                    url: 'https://gemini.google.com/app?bot=true',
                    active: true,
                    windowId: this.automationWindowId ?? undefined
                });
            }
        }

        // move failed to pending for retry
        for (const job of this.jobQueue) {
            if (job.status === 'failed') {
                job.status = 'pending';
            }
        }

        await this.saveState();



        // Start processing if we have jobs
        this.processNextJob();
    }

    async startAutomationWindow() {
        console.log("[Manager] Starting automation in a new window");
        const window = await browser.windows.create({
            focused: true,
            type: 'normal'
        });
        await this.startAutomation(window.id);
    }

    async fetchJobs() {
        console.log("[Manager] Fetching jobs...");
        
        let maxPages = 1;
        for (const q of this.config.query) {
            if (this.config.platform.indeed && q.search.trim() !== '') {
                for (let page = 0; page < maxPages; page++) {
                    const indeedUrl = `https://in.indeed.com/jobs?q=${encodeURIComponent(q.search)}&l=${encodeURIComponent(q.location)}&start=${page * 10}&bot=true`;
                    await browser.tabs.create({ 
                        url: indeedUrl, 
                        active: !this.config.runInBackground,
                        windowId: this.automationWindowId ?? undefined
                    });
                }
            }
        }
    }

    async stopAutomation() {
        this.isRunning = false;
        this.clearJobTimeout();
        this.automationWindowId = null;
        console.log("[Manager] Automation stopped");

        // Notify all tabs that automation has stopped
        for (const tabId of Object.keys(this.tabs)) {
            browser.tabs.sendMessage(Number(tabId), { type: 'STOP_AUTOMATION' }).catch(() => {});
        }

        // Optionally, close all tabs related to the automation
        for (const tabId of Object.keys(this.tabs)) {
            await browser.tabs.remove(Number(tabId));
        }
    }

    getConfig() {
        return this.config;
    }

    async updateConfig(newConfig: Partial<UserConfig>) {
        this.config = { ...this.config, ...newConfig };
        await this.saveState();
        return this.config;
    }

    handleWindowRemoved(windowId: number) {
        if (this.automationWindowId === windowId) {
            console.log("[Manager] Automation window closed. Stopping automation.");
            this.automationWindowId = null;
            this.stopAutomation();
        }
    }

    async clearCache() {
        console.log("[Manager] Clearing cache (queue and stats)");
        this.clearJobTimeout();
        this.jobQueue = [];
        this.currentJob = null;
        this.stats = {
            totalFound: 0,
            analyzed: 0,
            skipped: 0,
            applying: 0,
            completed: 0,
            failed: 0
        };
        await this.saveState();
        return true;
    }

    private async loadState() {
        const data = await browser.storage.local.get(['jobQueue', 'currentJob', 'config']);
        if (data.jobQueue) this.jobQueue = data.jobQueue as Job[];
        if (data.currentJob) this.currentJob = data.currentJob as Job;
        if (data.config) this.config = data.config as UserConfig;
    }

    constructor() {
        this.loadState();
    }

    private async saveState() {
        await browser.storage.local.set({
            jobQueue: this.jobQueue,
            currentJob: this.currentJob,
            config: this.config
        });
    }

    registerTab(tabId: number, payload: RegisterTabPayload) {
        this.tabs[tabId] = { role: payload.role, platform: payload.platform };
        console.log(`[Manager] Registered Tab ${tabId} as ${payload.role}`);

        if (payload.role === 'GPT') {
            this.gptTabId = tabId;
        }

        if (payload.role === 'GEMINI') {
            this.geminiTabId = tabId;
        }

        return true
    }

    unregisterTab(tabId: number) {
        if (this.tabs[tabId]) {
            console.log(`[Manager] Unregistering Tab ${tabId} (${this.tabs[tabId].role})`);
            delete this.tabs[tabId];
        }

        if (this.gptTabId === tabId) this.gptTabId = null;
        if (this.geminiTabId === tabId) this.geminiTabId = null;

        if (this.activeJobTabId === tabId) {
            console.log(`[Manager] Active job tab ${tabId} closed.`);
            this.activeJobTabId = null;
            // If the job was still in progress, mark it as failed
            if (this.currentJob && ['analyzing', 'applying'].includes(this.currentJob.status)) {
                console.log(`[Manager] Job ${this.currentJob.title} was in progress but tab was closed. Marking as failed.`);
                this.reportJobStatus('failed');
            }
        }


        return true
    }

    async handleJobListFound(payload: { jobs: any[] }) {
        console.log(`[Manager] Found ${payload.jobs.length} jobs. Adding to queue.`);

        // https://www.indeed.com/viewjob?jk=fb1dc0b6f9d2e067&from=serp&vjs=3 get jk
        const newJobs = payload.jobs.map(j => ({
            id: j.id || j.url, // fallback ID
            title: j.title,
            url: j.jobUrl,
            status: 'pending' as const
        }));

        // Simple dedup based on URL
        for (const job of newJobs) {
            if (!this.jobQueue.find(q => q.id === job.id)) {
                this.jobQueue.push(job);
                this.stats.totalFound++;
            } else {
                console.log(`[Manager] Job already in queue, skipping: ${job.title}`);
            }
        }

        await this.saveState();
        this.processNextJob();
    }

    async processNextJob() {
        if (!this.isRunning) {
            console.log('[Manager] Automation is stopped. Skipping next job.');
            return;
        }

        if (this.isProcessing) {
            console.log('[Manager] processNextJob already in progress, skipping.');
            return;
        }

        if (this.currentJob) {
            console.log('[Manager] Already processing a job:', this.currentJob.title);
            return;
        }

        this.isProcessing = true;
        try {
            const nextJob = this.jobQueue.find(j => j.status === 'pending');
            if (!nextJob) {
                console.log('[Manager] No pending jobs in queue.');
                return;
            }

            this.currentJob = nextJob;
            this.currentJob.status = 'analyzing';
            await this.saveState();

            console.log('[Manager] Starting job:', nextJob.title);

            // Set timeout for the job
            this.startJobTimeout();

            // Open the job URL
            const tab = await browser.tabs.create({ 
                url: nextJob.url, 
                active: !this.config.runInBackground,
                windowId: this.automationWindowId ?? undefined
            });
            this.activeJobTabId = tab.id ?? null;
            // The new tab will load, recognize itself as ANALYZER, and send REGISTER_TAB
            
        } catch (error) {
            console.error('[Manager] Error in processNextJob:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private startJobTimeout() {
        this.clearJobTimeout();
        this.jobTimeoutTimer = setTimeout(() => {
            console.warn(`[Manager] Job timeout reached for: ${this.currentJob?.title}`);
            this.reportJobStatus('failed');
        }, this.JOB_TIMEOUT_MS);
    }

    private clearJobTimeout() {
        if (this.jobTimeoutTimer) {
            clearTimeout(this.jobTimeoutTimer);
            this.jobTimeoutTimer = null;
        }
    }

    async handleProxyPrompt(payload: { prompt: string }, senderTabId?: number) {
        if (this.config.useLocalGpt) {
            console.log('[Manager] Using local GPT endpoint:', this.config.localGptEndpoint);
            try {
                const response = await fetch(this.config.localGptEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: this.config.localGptModel,
                        prompt: payload.prompt,
                        stream: false
                    })
                });

                if (!response.ok) {
                    throw new Error(`Local GPT request failed: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('[Manager] Local GPT Response:', data.response);
                return data.response;
            } catch (error) {
                console.error('[Manager] Local GPT Error:', error);
                throw error;
            }
        }

        const provider = this.config.aiProvider;
        const targetTabId = provider === 'gpt' ? this.gptTabId : this.geminiTabId;
        const promptMessageType = provider === 'gpt' ? 'PROMPT_GPT' : 'PROMPT_GEMINI';

        if (!targetTabId) {
            console.error(`[Manager] No ${provider.toUpperCase()} tab registered!`);
            throw new Error(`${provider.toUpperCase()} tab not found`);
        }

        // Focus AI Tab
        await browser.tabs.update(targetTabId, { active: !this.config.runInBackground });

        const response = await browser.tabs.sendMessage(targetTabId, {
            type: promptMessageType,
            payload: { prompt: payload.prompt },
            requestId: this.currentJob?.id,
        });

        console.log(`[Manager] ${provider.toUpperCase()} Response:`, { response });

        if (senderTabId && this.tabs[senderTabId]) {
            await browser.tabs.update(senderTabId, { active: !this.config.runInBackground });
        }

        return response;
    }

    reportJobStatus(status: 'analyzing' | 'applying' | 'completed' | 'skipped' | 'failed', senderTabId?: number, message?: string) {
        if (!this.currentJob) {
            console.log(`[Manager] Received status ${status} but no current job.`);
            return;
        }

        // Optional: verify that the report comes from the active job tab
        if (senderTabId && this.activeJobTabId && senderTabId !== this.activeJobTabId) {
            // Check if this tab is one we know about and if it's a role that should be reporting
            const tabInfo = this.tabs[senderTabId];
            if (tabInfo?.role !== 'FORM_FILLER' && tabInfo?.role !== 'ANALYZER') {
                 console.warn(`[Manager] Status ${status} reported from non-job tab ${senderTabId}. Ignoring.`);
                 return;
            }
            // If it is a FORM_FILLER or ANALYZER, maybe it's a redirect? 
            // We'll be lenient for now but log it.
            console.log(`[Manager] Status ${status} from tab ${senderTabId} (active is ${this.activeJobTabId}).`);
        }

        console.log(`[Manager] Reporting Status: ${status} for ${this.currentJob.title}${message ? ` - ${message}` : ''}`);

        if (status === 'analyzing') this.stats.analyzed++;

        if (['applying', 'completed', 'skipped', 'failed'].includes(status)) {
            this.finishCurrentJob(status as any, message);

            // // close the tab
            // if (tabId && this.tabs[tabId]) {
            //     browser.tabs.remove(tabId);
            // }
        }
    }

    private async finishCurrentJob(status: 'completed' | 'skipped' | 'applying' | 'failed', message?: string) {
        if (this.currentJob) {
            this.currentJob.status = status;
            if (message) this.currentJob.message = message;

            // Increment stats
            if (status === 'skipped') this.stats.skipped++;
            if (status === 'applying') this.stats.applying++;
            if (status === 'completed') this.stats.completed++;
            if (status === 'failed') this.stats.failed++;

            // Update in queue
            const idx = this.jobQueue.findIndex(j => j.url === this.currentJob?.url);
            if (idx !== -1) {
                this.jobQueue[idx].status = status;
                if (message) this.jobQueue[idx].message = message;
            }

            await this.saveState();

            if (status === 'applying') {
                console.log('[Manager] Job status set to APPLYING. Waiting for form completion...');
                return;
            }

            this.clearJobTimeout();
            
            // Close the job tab
            if (this.activeJobTabId) {
                try {
                    console.log(`[Manager] Closing job tab: ${this.activeJobTabId}`);
                    await browser.tabs.remove(this.activeJobTabId);
                } catch (e) {
                    console.warn(`[Manager] Could not close tab ${this.activeJobTabId}:`, e);
                }
                this.activeJobTabId = null;
            }

            this.currentJob = null;
            await this.saveState();

            this.processNextJob();
        }
    }
}
