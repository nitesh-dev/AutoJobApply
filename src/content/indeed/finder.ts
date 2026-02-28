import { Page } from "../automation/page";
import { api } from "@/services/extensionApi";
import { BaseExecutor } from "../common/BaseExecutor";
import { ExtensionMessage } from "@/types";
import { delay } from "../utils";
import { Jobs } from "./types";

export class IndeedFinder extends BaseExecutor {
    private allJobsSelector = "#mosaic-provider-jobcards ul li"; // Slightly updated selector

    constructor(private page: Page) {
        super();
    }

    init(url: string, options?: { noClick?: boolean }) {
        this.logger.info("IndeedFinder initialized.");
        // Check if already running
        api.getStats().then(stats => {
            if (stats.isRunning) {
                this.scanJobs();
            }
        });
    }

    handleMessage(message: ExtensionMessage) {
        if (message.type === 'START_AUTOMATION') {
            this.scanJobs();
        }
    }

    async scanJobs() {
        await delay(3000)
        this.logger.info("Scanning for jobs...");
        try {
            // Wait for list
            await this.page.waitForSelector("#mosaic-provider-jobcards");

            const jobElements = Array.from(document.querySelectorAll(this.allJobsSelector))
                .filter(el => el.checkVisibility() && el.clientHeight > 0);
            const jobs: Jobs[] = [];

            const config = await api.getConfig();
            const locationKeywords = config.locationKeywords || [];

            jobElements.forEach((el) => {
                const titleEl = el.querySelector("h2.jobTitle span");
                const linkEl = el.querySelector("a.jcs-JobTitle");
                const id = linkEl?.getAttribute('data-jk');
                const isEasilyApply = !!el.querySelector('[data-testid="indeedApply"]');
                const locationEl = el.querySelector('[data-testid="text-location"]');
                const locationText = (locationEl as HTMLElement)?.innerText.trim() || "";

                if (titleEl && linkEl && id && isEasilyApply) {
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

                    jobs.push({
                        title: (titleEl as HTMLElement).innerText,
                        jobUrl: (linkEl as HTMLAnchorElement).href,
                        id,
                        location: locationText,
                        element: el as HTMLLIElement
                    });
                }
            });

            this.logger.success(`Found ${jobs.length} jobs.`);
            console.log({jobs})

            await api.jobListFound(jobs);

        } catch (e) {
            this.logger.error("Failed to scan jobs", e);
        }
    }
}



// // 1. Parse all cards with their URLs
// const jobCards = Array.from(document.querySelectorAll('.cardOutline')).map(card => {
//     const linkElement = card.querySelector('a[id^="job_"]') || card.querySelector('h2.jobTitle a');
//     return {
//         title: card.querySelector('h2.jobTitle')?.innerText.trim(),
//         url: linkElement ? linkElement.href : 'N/A',
//         jobId: linkElement?.dataset.jk || linkElement?.id
//     };
// });
// console.log("Job Cards:", jobCards);

// // 2. Parse active Job Content and Apply Button
// // Trigger this after clicking a job card
// const getActiveJobDetails = () => {
//     const detailPane = document.querySelector('#jobsearch-ViewjobPaneWrapper');
//     if (!detailPane) return "Please click a job card first.";

//     // Select the primary action button (Apply Now)
//     const applyBtn = detailPane.querySelector('[data-testid="jobsearch-ViewJobButtons-container"] button') || 
//                      detailPane.querySelector('.jobsearch-ViewJobButtons-container button') ||
//                      detailPane.querySelector('button.css-17qy6hn');

//     return {
//         title: detailPane.querySelector('h2')?.innerText.trim(),
//         description: document.querySelector('#jobDescriptionText')?.innerText.replace(/\s+/g, ' ').trim(),
//         applyButton: {
//             text: applyBtn?.innerText.trim(),
//             isVisible: !!applyBtn,
//             isExternal: applyBtn?.innerText.toLowerCase().includes('apply on company site'),
//             element: applyBtn
//         }
//     };
// };

// console.log("Active Job Details:", getActiveJobDetails());