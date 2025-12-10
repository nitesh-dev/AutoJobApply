// store/ui.store.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { CheckField } from "./types";
import { debouncedChromeStorage } from "./storage/debouncedStorage";


 
// export type OpeningBehaviourType = {
//     openTabAsActive: CheckField;
//     openInReverseOrder: CheckField,
//     autoScrollPage: CheckField,
//     autoCloseTab: CheckField,
//     saveAppState: CheckField
//     groupTabs: CheckField;

// }

// interface OpeningBehaviourState extends OpeningBehaviourType {
//     toggleAutoCloseTab: () => void;
//     toggleOpenTabAsActive: () => void;
//     toggleOpenInReverseOrder: () => void;
//     toggleAutoScrollPage: () => void;
//     toggleSaveAppState: () => void;
//     toggleGroupTabs: () => void;

// }

// const defaultValue: OpeningBehaviourType = {
//     autoCloseTab: {
//         checked: false
//     },
//     openTabAsActive: { checked: false },
//     openInReverseOrder: { checked: false },
//     autoScrollPage: { checked: false },
//     saveAppState: { checked: false },
//     groupTabs: { checked: false },
// }




// export const useOpeningBehaviourStore = create<OpeningBehaviourState>()(
//     persist(
//         immer((set) => ({
//             ...defaultValue,
//             toggleOpenTabAsActive: () =>
//                 set((state) => {
//                     state.openTabAsActive.checked = !state.openTabAsActive.checked;
//                 }),
//             toggleOpenInReverseOrder: () =>
//                 set((state) => {
//                     state.openInReverseOrder.checked = !state.openInReverseOrder.checked;
//                 }),
//             toggleAutoScrollPage: () =>
//                 set((state) => {
//                     state.autoScrollPage.checked = !state.autoScrollPage.checked;
//                 }),
//             toggleSaveAppState: () =>
//                 set((state) => {
//                     state.saveAppState.checked = !state.saveAppState.checked;
//                 }),
//             toggleAutoCloseTab: () =>
//                 set((state) => {
//                     state.autoCloseTab.checked = !state.autoCloseTab.checked;
//                 }),
            
//             toggleGroupTabs: () =>
//                 set((state) => {
//                     state.groupTabs.checked = !state.groupTabs.checked;
//                 }),
//         })),
//         {
//             name: "opening-behaviour-settings",
//             storage: createJSONStorage(() => debouncedChromeStorage),
//         }
//     )
// );
