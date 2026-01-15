import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";

export class IndeedFinder extends BaseExecutor {
    private allJobsSelector = "#mosaic-provider-jobcards ul li"; // Slightly updated selector

    constructor(private page: Page) {
        super();
    }

    init() {
        // Auto-start scanning for now (prototype style)
        setTimeout(() => this.scanJobs(), 3000);
    }

    handleMessage(message: ExtensionMessage) {
        if (message.type === 'PROCESS_NEXT_JOB') {
            // ... logic for next job
            alert("Processing next job");   
        }
    }

    async scanJobs() {
        this.logger.info("Scanning for jobs...");
        try {
            // Wait for list
            await this.page.waitForSelector("#mosaic-provider-jobcards");

            const jobElements = document.querySelectorAll(this.allJobsSelector);
            const jobs: any[] = [];

            jobElements.forEach((el) => {
                const titleEl = el.querySelector("h2.jobTitle span");
                const linkEl = el.querySelector("a.jcs-JobTitle");

                if (titleEl && linkEl) {
                    jobs.push({
                        title: (titleEl as HTMLElement).innerText,
                        jobUrl: (linkEl as HTMLAnchorElement).href,
                        id: (linkEl as HTMLAnchorElement).getAttribute('data-jk')
                    });
                }
            });

            this.logger.success(`Found ${jobs.length} jobs.`);

            await api.jobListFound(jobs);

        } catch (e) {
            this.logger.error("Failed to scan jobs", e);
        }
    }
}
