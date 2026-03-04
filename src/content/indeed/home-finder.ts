import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { IndeedUIEnhancer } from "./BaseIndeedEnhancer";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";
import { Jobs } from "./types";

export class IndeedHomeFinder extends IndeedUIEnhancer {
    private processedJobIds = new Set<string>();
    private isScanning = false;

    constructor(private page: Page) {
        super();
    }

    async onBegin(url: string, options?: { isManual?: boolean }) {
        this.logger.info("IndeedHomeFinder initialized.");
        
        this.startScanning();
    }

    async handleMessage(message: ExtensionMessage) {
        if (message.type === 'START_AUTOMATION') {
            this.startScanning();
        } else if (message.type === 'STOP_AUTOMATION') {
            this.isScanning = false;
        }
    }

    private async startScanning() {
        if (this.isScanning) return;
        this.isScanning = true;
        this.logger.info("Starting auto-scroll and job finding...");

        while (this.isScanning) {
            await this.scanNewJobs();
            const scrolled = await this.scrollAndLoadMore();
            if (!scrolled) {
                this.logger.info("Reached end or couldn't load more jobs.");
                break;
            }
            await delay(2000); // Wait for new content to settle
        }
        this.isScanning = false;
    }

    private async scanNewJobs() {
        try {
            const jobElements = Array.from(document.querySelectorAll(this.allJobsSelector))
                .filter(el => el.checkVisibility() && el.clientHeight > 0);
            
            const config = await api.getConfig();
            const locationKeywords = config.locationKeywords || [];
            const newJobs: { title: string; jobUrl: string; id: string; location: string }[] = [];

            jobElements.forEach((el) => {
                const job = this.getJobData(el);
                if (!job) return;

                if (!this.processedJobIds.has(job.id)) {
                    // Filter by location keywords
                    if (locationKeywords.length > 0) {
                        const matches = locationKeywords.some(keyword => 
                            job.location.toLowerCase().includes(keyword.toLowerCase())
                        );
                        if (!matches) {
                            return;
                        }
                    }

                    this.processedJobIds.add(job.id);
                    newJobs.push({
                        title: job.title,
                        jobUrl: job.jobUrl,
                        id: job.id,
                        location: job.location,
                    });
                }
            });

            if (newJobs.length > 0) {
                this.logger.success(`Found ${newJobs.length} new 'Easy Apply' jobs.`);
                await api.jobListFound(newJobs);
            }
        } catch (e) {
            this.logger.error("Failed to scan jobs", e);
        }
    }

    private async scrollAndLoadMore(): Promise<boolean> {
        // Attempt to find the "Show more jobs" button first
        const showMoreBtn = document.querySelector('button[data-cy="show-more"]') as HTMLButtonElement;
        
        if (showMoreBtn && showMoreBtn.checkVisibility()) {
            this.logger.info("Clicking 'Show more jobs' button...");
            showMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(500);
            showMoreBtn.click();
            await delay(2000);
            return true;
        }

        // Otherwise, scroll to bottom to trigger infinite scroll
        this.logger.info("Scrolling down to load more...");
        const previousHeight = document.body.scrollHeight;
        window.scrollTo({
            top: previousHeight,
            behavior: 'smooth'
        });

        // Wait to see if height increases
        await delay(2000);
        return document.body.scrollHeight > previousHeight;
    }
}
