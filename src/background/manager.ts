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
        query: [],
        platform: {
            indeed: true,
            linkedin: false
        }
    };

    // Track special tabs
    private gptTabId: number | null = null;
    private activeJobTabId: number | null = null;

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

    async startAutomation() {
        this.isRunning = true;
        this.currentJob = null;
        this.clearJobTimeout();
        console.log("[Manager] Automation started");

        // Ensure GPT is open if not already
        if (!this.gptTabId) {
            await browser.tabs.create({ url: 'https://chatgpt.com/?temporary-chat=true&bot=true' });
        }

        // Start processing if we have jobs
        this.processNextJob();
    }

    async fetchJobs() {
        console.log("[Manager] Fetching jobs...");
        
        let maxPages = 1;
        for (const q of this.config.query) {
            if (this.config.platform.indeed && q.search.trim() !== '') {
                for (let page = 0; page < maxPages; page++) {
                    const indeedUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(q.search)}&l=${encodeURIComponent(q.location)}&start=${page * 10}&bot=true`;
                    await browser.tabs.create({ url: indeedUrl });
                }
            }
        }
    }

    async stopAutomation() {
        this.isRunning = false;
        this.clearJobTimeout();
        console.log("[Manager] Automation stopped");
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
        // if (data.jobQueue) this.jobQueue = data.jobQueue as Job[];
        // if (data.currentJob) this.currentJob = data.currentJob as Job;
        if (data.config) this.config = data.config as UserConfig;
    }

    constructor() {
        this.loadState();
    }

    private async saveState() {
        await browser.storage.local.set({
            // jobQueue: this.jobQueue,
            // currentJob: this.currentJob,
            config: this.config
        });
    }

    registerTab(tabId: number, payload: RegisterTabPayload) {
        this.tabs[tabId] = { role: payload.role, platform: payload.platform };
        console.log(`[Manager] Registered Tab ${tabId} as ${payload.role}`);

        if (payload.role === 'GPT') {
            this.gptTabId = tabId;
        }

        return true
    }

    unregisterTab(tabId: number) {
        if (this.tabs[tabId]) {
            console.log(`[Manager] Unregistering Tab ${tabId} (${this.tabs[tabId].role})`);
            delete this.tabs[tabId];
        }

        if (this.gptTabId === tabId) this.gptTabId = null;

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
            const tab = await browser.tabs.create({ url: nextJob.url, active: true });
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
        if (!this.gptTabId) {
            console.error('[Manager] No GPT tab registered!');
            throw new Error('GPT tab not found');
        }

        // Focus GPT Tab
        await browser.tabs.update(this.gptTabId, { active: true });

        const response = await browser.tabs.sendMessage(this.gptTabId, {
            type: 'PROMPT_GPT',
            payload: { prompt: payload.prompt },
            requestId: this.currentJob?.id,
        });



        console.log('[Manager] GPT Response:', { response });

        if (senderTabId && this.tabs[senderTabId]) {
            await browser.tabs.update(senderTabId, { active: true });
        }

        return response;
    }

    reportJobStatus(status: 'analyzing' | 'applying' | 'completed' | 'skipped' | 'failed', senderTabId?: number) {
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

        console.log(`[Manager] Reporting Status: ${status} for ${this.currentJob.title}`);

        if (status === 'analyzing') this.stats.analyzed++;

        if (['applying', 'completed', 'skipped', 'failed'].includes(status)) {
            this.finishCurrentJob(status as any);

            // // close the tab
            // if (tabId && this.tabs[tabId]) {
            //     browser.tabs.remove(tabId);
            // }
        }
    }

    private async finishCurrentJob(status: 'completed' | 'skipped' | 'applying' | 'failed') {
        if (this.currentJob) {
            this.currentJob.status = status;

            // Increment stats
            if (status === 'skipped') this.stats.skipped++;
            if (status === 'applying') this.stats.applying++;
            if (status === 'completed') this.stats.completed++;
            if (status === 'failed') this.stats.failed++;

            // Update in queue
            const idx = this.jobQueue.findIndex(j => j.url === this.currentJob?.url);
            if (idx !== -1) this.jobQueue[idx].status = status;

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
