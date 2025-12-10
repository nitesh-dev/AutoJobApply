// storage/debouncedStorage.ts
import type { StateStorage } from "zustand/middleware";
import { chromeStorage } from "./chromeStorage";

// Simple debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer); // cancel previous
        timer = setTimeout(() => fn(...args), delay); // schedule new
    };
}

// Wrap chromeStorage with debounced setItem
export const debouncedChromeStorage: StateStorage = {
    getItem: (name) => chromeStorage.getItem(name),
    setItem: debounce((name, value) => {
        console.log("Saving to storage:", name); // useful for debugging
        chromeStorage.setItem(name, value);
    }, 1000), // delay of 1000ms (1s)
    removeItem: (name) => chromeStorage.removeItem(name),
};
