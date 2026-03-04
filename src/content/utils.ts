

import { api } from "@/services/extensionApi";
import { Job } from "@/types";

export function getUUID() {
    return "id-" + self.crypto.randomUUID();
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function injectManualAddButton(element: HTMLElement, jobData: { id: string; title: string; url: string }) {
    if (element.querySelector('.manual-add-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'manual-add-btn';
    
    // Initial check for status
    const stats = await api.getStats();
    const isInQueue = stats.jobQueue.some((q: any) => q.id === jobData.id);

    const updateBtnState = (inQueue: boolean) => {
        if (inQueue) {
            btn.innerHTML = '<span>Remove</span>';
            btn.style.backgroundColor = '#fecaca'; // red-200
            btn.style.color = '#b91c1c'; // red-700
            btn.style.borderColor = '#ef4444';
        } else {
            btn.innerHTML = '<span>Add to Queue</span>';
            btn.style.backgroundColor = '#dcfce7'; // green-100
            btn.style.color = '#15803d'; // green-700
            btn.style.borderColor = '#22c55e';
        }
    };

    updateBtnState(isInQueue);

    // Basic styling
    Object.assign(btn.style, {
        marginLeft: '10px',
        padding: '2px 8px',
        fontSize: '11px',
        borderRadius: '4px',
        border: '1px solid',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        transition: 'all 0.2s'
    });

    btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        btn.disabled = true;
        btn.style.opacity = '0.5';

        try {
            const currentStats = await api.getStats();
            const alreadyInQueue = currentStats.jobQueue.some((q: any) => q.id === jobData.id);

            if (alreadyInQueue) {
                await api.removeManualJob(jobData.id);
                updateBtnState(false);
            } else {
                await api.addManualJob({
                    id: jobData.id,
                    title: jobData.title,
                    url: jobData.url,
                    status: 'pending'
                } as Job);
                updateBtnState(true);
            }
        } catch (err) {
            console.error('Failed to toggle job manual state', err);
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    };

    // Find a good place to append
    const target = element.querySelector('.jobMetaDataGroup') || element.querySelector('.company_location') || element;
    target.appendChild(btn);
}

