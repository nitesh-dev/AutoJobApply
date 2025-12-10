import { StateStorage } from "zustand/middleware";
import browser from "webextension-polyfill";

export const chromeStorage: StateStorage = {
    getItem: async (name) => {

        let result = await browser.storage.local.get([name])
        return result[name] ? JSON.stringify(result[name]) : null
        // return new Promise((resolve) => {
        //     chrome.storage.local.get([name], (result) => {
        //         resolve();
        //     });
        // });
    },
    setItem: async (name, value) => {
        await browser.storage.local.set({ [name]: JSON.parse(value) })


        // return new Promise<void>((resolve) => {
        //     chrome.storage.local.set({ [name]: JSON.parse(value) }, () => resolve());
        // });
    },
    removeItem: async (name) => {

        await browser.storage.local.set({ name })
        // return new Promise<void>((resolve) => {
        //     chrome.storage.local.remove(name, () => resolve());
        // });
    },
};
