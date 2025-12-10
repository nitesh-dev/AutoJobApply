
export class Page {
    // ========= WAIT HELPERS ==========

    async waitForTimeout(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
    }

    async waitForSelector<T extends Element>(
        selector: string,
        timeout: number = 5000
    ): Promise<T> {

        
        return new Promise((resolve, reject) => {
            const existing = document.querySelector<T>(selector);
            if (existing) {
                return resolve(existing);
            }

            const observer = new MutationObserver(() => {
                const el = document.querySelector<T>(selector);
                if (el) {
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
                reject(new Error(`Timeout waiting for selector: ${selector}`));
            }, timeout);
        });
    }

    async waitForSelectorVisible<T extends HTMLElement>(
        selector: string,
        timeout: number = 5000
    ): Promise<T> {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const el = document.querySelector<T>(selector);
            if (el && this.isVisible(el)) {
                return el;
            }

            await this.waitForTimeout(100);
        }

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
                    cleanup();
                    return resolve();
                }

                if (now - start >= timeout) {
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
        const el = await this.waitForSelectorVisible<HTMLElement>(selector);
        el.click();
        await this.waitForTimeout(50);
    }

    async type(selector: string, text: string): Promise<void> {
        const el = await this.waitForSelectorVisible<HTMLInputElement>(selector);
        el.focus();
        el.value = "";
        for (const char of text) {
            el.value += char;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            await this.waitForTimeout(10);
        }
    }

    async select(selector: string, value: string): Promise<void> {
        const el = await this.waitForSelectorVisible<HTMLSelectElement>(selector);
        el.value = value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        await this.waitForTimeout(50);
    }

    async uploadFile(selector: string, file: File): Promise<void> {
        const input = await this.waitForSelectorVisible<HTMLInputElement>(selector);

        const dt = new DataTransfer();
        dt.items.add(file);

        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));

        await this.waitForTimeout(200);
    }

    async waitForNavigation(timeout: number = 5000): Promise<void> {
        return new Promise((resolve, reject) => {
            const startUrl = location.href;

            const check = () => {
                if (location.href !== startUrl) {
                    resolve();
                }
            };

            window.addEventListener("popstate", check);
            window.addEventListener("pushState", check as any);

            setTimeout(() => {
                reject(new Error("Timeout waiting for navigation"));
            }, timeout);
        });
    }
}
