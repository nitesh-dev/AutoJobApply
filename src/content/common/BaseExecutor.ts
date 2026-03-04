import { Logger } from "../logger/logger";
import { ExtensionMessage } from "@/types";

export abstract class BaseExecutor {

    protected logger: Logger = new Logger();

    onInit() { 
        console.log("BaseExecutor onInit called. Override this method if you need to run code before role is determined.");
    }

    /**
     * Initialize the executor. Called when the page role is determined.
     */
    abstract onBegin(url: string, options?: { isManual?: boolean }): void | Promise<void>;

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
