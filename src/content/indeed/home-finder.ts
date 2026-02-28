import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";
import { Jobs } from "./types";

export class IndeedHomeFinder extends BaseExecutor {
    private allJobsSelector = "#mosaic-provider-jobcards ul li";
    private processedJobIds = new Set<string>();
    private isScanning = false;

    constructor(private page: Page) {
        super();
    }

    async init(url: string, options?: { noClick?: boolean }) {
        this.logger.info("IndeedHomeFinder initialized.");
        
        // Check if automation is already running
        const stats = await api.getStats();
        if (stats.isRunning) {
            this.startScanning();
        }
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
            const newJobs: Jobs[] = [];

            jobElements.forEach((el) => {
                const titleEl = el.querySelector("h2.jobTitle span") || el.querySelector("h2.jobTitle a span");
                const linkEl = el.querySelector("a.jcs-JobTitle");
                const id = linkEl?.getAttribute('data-jk');
                const isEasilyApply = !!el.querySelector('[data-testid="indeedApply"]');
                const locationEl = el.querySelector('[data-testid="text-location"]');
                const locationText = (locationEl as HTMLElement)?.innerText.trim() || "";

                if (titleEl && linkEl && id && isEasilyApply && !this.processedJobIds.has(id)) {
                    // Filter by location keywords
                    if (locationKeywords.length > 0) {
                        const matches = locationKeywords.some(keyword => 
                            locationText.toLowerCase().includes(keyword.toLowerCase())
                        );
                        if (!matches) {
                            this.logger.info(`Skipping job ${id} - location "${locationText}" does not match keywords.`);
                            (el as HTMLElement).style.opacity = '0.3';
                            return;
                        }
                    }

                    this.processedJobIds.add(id);
                    newJobs.push({
                        title: (titleEl as HTMLElement).innerText.trim(),
                        jobUrl: (linkEl as HTMLAnchorElement).href,
                        id,
                        location: locationText,
                        element: el as HTMLLIElement
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
