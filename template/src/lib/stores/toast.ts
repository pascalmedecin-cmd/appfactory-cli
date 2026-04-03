import { writable } from 'svelte/store';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: number;
	message: string;
	variant: ToastVariant;
}

let nextId = 0;

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(message: string, variant: ToastVariant = 'success', duration = 4000) {
		const id = nextId++;
		update((toasts) => [...toasts, { id, message, variant }]);
		setTimeout(() => remove(id), duration);
	}

	function remove(id: number) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (msg: string) => add(msg, 'success'),
		error: (msg: string) => add(msg, 'error', 6000),
		warning: (msg: string) => add(msg, 'warning'),
		info: (msg: string) => add(msg, 'info'),
		remove,
	};
}

export const toasts = createToastStore();
