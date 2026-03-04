import { BaseExecutor } from "../common/BaseExecutor";
import { injectManualAddButton } from "../utils";
import { api } from "@/services/extensionApi";

export abstract class IndeedUIEnhancer extends BaseExecutor {
    protected allJobsSelector = "#mosaic-provider-jobcards ul li";
    protected enhancedJobIds = new Set<string>();

    onInit() {
        this.logger.info("IndeedUIEnhancer initialized (onInit). Starting enhancement observer.");
        this.startUIEnhancementObserver();
    }

    protected startUIEnhancementObserver() {
        // Run once on init
        this.enhanceVisibleJobs();

        // Observe for new jobs (infinite scroll/pagination)
        const observer = new MutationObserver(() => {
            this.enhanceVisibleJobs();
        });

        const target = document.querySelector("#mosaic-provider-jobcards") || document.body;
        observer.observe(target, { childList: true, subtree: true });
    }

    protected async enhanceVisibleJobs() {
        const jobElements = Array.from(document.querySelectorAll(this.allJobsSelector))
            .filter(el => el.checkVisibility() && el.clientHeight > 0);

        const config = await api.getConfig();
        const locationKeywords = config.locationKeywords || [];

        jobElements.forEach((el) => {
            const titleEl = el.querySelector("h2.jobTitle span") || el.querySelector("h2.jobTitle a span");
            const linkEl = el.querySelector("a.jcs-JobTitle");
            const id = linkEl?.getAttribute('data-jk');
            const isEasilyApply = !!el.querySelector('[data-testid="indeedApply"]');
            
            //first inner child
            const injectableDiv = el.querySelector('div[role="presentation"]>div:first-child');
            if (id && titleEl && linkEl && isEasilyApply && injectableDiv) {
                // 1. Inject Manual Toggle Button (Independent of Automation state)
                injectManualAddButton(injectableDiv as HTMLElement, {
                    id,
                    title: (titleEl as HTMLElement).innerText.trim(),
                    url: (linkEl as HTMLAnchorElement).href
                });

                // 2. Apply Location Filtering Styles (Visual only)
                if (!this.enhancedJobIds.has(id)) {
                    const locationEl = el.querySelector('[data-testid="text-location"]');
                    const locationText = (locationEl as HTMLElement)?.innerText.trim() || "";

                    if (locationKeywords.length > 0) {
                        const matches = locationKeywords.some(keyword => 
                            locationText.toLowerCase().includes(keyword.toLowerCase())
                        );
                        if (!matches) {
                            (el as HTMLElement).style.opacity = '0.3';
                        }
                    }
                    this.enhancedJobIds.add(id);
                }
            }
        });
    }

    protected getJobData(el: Element) {
        const titleEl = el.querySelector("h2.jobTitle span") || el.querySelector("h2.jobTitle a span");
        const linkEl = el.querySelector("a.jcs-JobTitle");
        const id = linkEl?.getAttribute('data-jk');
        const locationEl = el.querySelector('[data-testid="text-location"]');
        const isEasilyApply = !!el.querySelector('[data-testid="indeedApply"]');

        if (!titleEl || !linkEl || !id || !isEasilyApply) return null;

        return {
            id,
            title: (titleEl as HTMLElement).innerText.trim(),
            jobUrl: (linkEl as HTMLAnchorElement).href,
            location: (locationEl as HTMLElement)?.innerText.trim() || "",
            element: el as HTMLLIElement
        };
    }
}
