import { logger } from '../logger';

export class Page {
    // ========= WAIT HELPERS ==========

    async waitForTimeout(ms: number): Promise<void> {
        logger.debug(`Waiting for ${ms}ms...`);
        return new Promise((r) => setTimeout(r, ms));
    }

    async waitForSelector<T extends Element>(
        selector: string,
        timeout: number = 5000
    ): Promise<T> {
        logger.info(`Waiting for selector: ${selector}`);
        return new Promise((resolve, reject) => {
            const existing = document.querySelector<T>(selector);
            if (existing) {
                logger.success(`Selector found immediately: ${selector}`);
                return resolve(existing);
            }

            const observer = new MutationObserver(() => {
                const el = document.querySelector<T>(selector);
                if (el) {
                    logger.success(`Selector appeared: ${selector}`);
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });

            setTimeout(() => {
                observer.disconnect();
                logger.error(`Timeout waiting for selector: ${selector}`);
                reject(new Error(`Timeout waiting for selector: ${selector}`));
            }, timeout);
        });
    }

    async waitForSelectorVisible<T extends HTMLElement>(
        selector: string,
        timeout: number = 5000
    ): Promise<T> {
        logger.info(`Waiting for visible selector: ${selector}`);

        const start = Date.now();

        while (Date.now() - start < timeout) {
            const el = document.querySelector<T>(selector);
            if (el && this.isVisible(el)) {
                logger.success(`Visible selector found: ${selector}`);
                return el;
            }

            await this.waitForTimeout(100);
        }

        logger.error(`Timeout waiting for visible selector: ${selector}`);
        throw new Error(`Timeout waiting for visible selector: ${selector}`);
    }

    private isVisible(el: HTMLElement): boolean {
        const style = getComputedStyle(el);
        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0 &&
            el.offsetParent !== null
        );
    }

    // ========= NETWORK IDLE ==========

    async waitForNetworkIdle(
        idleTime: number = 1000,
        timeout: number = 5000
    ): Promise<void> {
        logger.info(`Waiting for network idle (${idleTime}ms)...`);
        return new Promise((resolve, reject) => {
            let active = 0;
            let lastChange = Date.now();
            const start = Date.now();

            const origFetch = window.fetch;
            window.fetch = (...args) => {
                active++;
                lastChange = Date.now();
                return origFetch(...args).finally(() => {
                    active--;
                    lastChange = Date.now();
                });
            };

            const origXHROpen = XMLHttpRequest.prototype.open;
            const origXHRSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function (...args: any[]) {
                (this as any)._tracked = true;
                return origXHROpen.apply(this, args as Parameters<typeof origXHROpen>);
            };

            XMLHttpRequest.prototype.send = function (...args: any[]) {
                if ((this as any)._tracked) {
                    active++;
                    lastChange = Date.now();
                    this.addEventListener("loadend", () => {
                        active--;
                        lastChange = Date.now();
                    });
                }
                return origXHRSend.apply(this, args as Parameters<typeof origXHRSend>);
            };

            const checkInterval = setInterval(() => {
                const now = Date.now();

                if (active === 0 && now - lastChange >= idleTime) {
                    logger.success(`Network is idle`);
                    cleanup();
                    return resolve();
                }

                if (now - start >= timeout) {
                    logger.error(`Timeout waiting for network idle (${active} active requests)`);
                    cleanup();
                    return reject(new Error("Timeout waiting for network idle"));
                }
            }, 100);

            const cleanup = () => {
                clearInterval(checkInterval);
                window.fetch = origFetch;
                XMLHttpRequest.prototype.open = origXHROpen;
                XMLHttpRequest.prototype.send = origXHRSend;
            };
        });
    }

    // ========= INTERACTION API ==========

    async click(selector: string): Promise<void> {
        logger.processing(`Clicking: ${selector}`);
        const el = await this.waitForSelectorVisible<HTMLElement>(selector);
        el.click();
        await this.waitForTimeout(50);
    }

    async type(selector: string, text: string): Promise<void> {
        logger.processing(`Typing into: ${selector}`);
        const el = await this.waitForSelectorVisible<HTMLInputElement>(selector);
        el.focus();
        el.value = "";
        for (const char of text) {
            el.value += char;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            await this.waitForTimeout(10);
        }
        logger.success(`Typed: "${text}"`);
    }

    async select(selector: string, value: string): Promise<void> {
        logger.processing(`Selecting value "${value}" in: ${selector}`);
        const el = await this.waitForSelectorVisible<HTMLSelectElement>(selector);
        el.value = value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        await this.waitForTimeout(50);
    }

    async uploadFile(selector: string, file: File): Promise<void> {
        logger.processing(`Uploading file "${file.name}" to: ${selector}`);

        const input = await this.waitForSelectorVisible<HTMLInputElement>(selector);

        const dt = new DataTransfer();
        dt.items.add(file);

        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));

        await this.waitForTimeout(200);
        logger.success(`File uploaded successfully`);
    }

    // ========= NAVIGATION WAIT ==========

    async waitForNavigation(timeout: number = 5000): Promise<void> {
        logger.info(`Waiting for navigation...`);
        return new Promise((resolve, reject) => {
            const startUrl = location.href;

            const check = () => {
                if (location.href !== startUrl) {
                    logger.success(`Navigation detected: ${startUrl} -> ${location.href}`);
                    resolve();
                }
            };

            window.addEventListener("popstate", check);
            window.addEventListener("pushState", check as any);

            setTimeout(() => {
                logger.error(`Timeout waiting for navigation`);
                reject(new Error("Timeout waiting for navigation"));
            }, timeout);
        });
    }
}
