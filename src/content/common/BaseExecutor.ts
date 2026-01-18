import { Logger } from "../logger/logger";
import { ExtensionMessage } from "@/types";

export abstract class BaseExecutor {

    protected logger: Logger = new Logger();

    /**
     * Initialize the executor. Called when the page role is determined.
     */
    abstract init(url: string, options?: { noClick?: boolean }): void | Promise<void>;

    /**
     * Handle incoming messages from the background script.
     * @param message The message received via browser.runtime.onMessage
     */
    abstract handleMessage(message: ExtensionMessage): any;

    /**
     * Optional: Handle URL changes within the same tab (for SPAs).
     */
    onUrlChange?(url: string): void;
}
