import { writable } from 'svelte/store';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

// V2.9 audit S160 : action optionnelle (pattern Gmail "Annuler" pendant N secondes).
export interface ToastAction {
	label: string;
	handler: () => void | Promise<void>;
}

export interface Toast {
	id: number;
	message: string;
	variant: ToastVariant;
	action?: ToastAction;
}

let nextId = 0;

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(message: string, variant: ToastVariant = 'success', duration = 4000, action?: ToastAction) {
		const id = nextId++;
		update((toasts) => [...toasts, { id, message, variant, action }]);
		setTimeout(() => remove(id), duration);
		return id;
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
		// Toast undo : 5s par défaut (pattern Gmail), action obligatoire (label + handler).
		withAction: (msg: string, action: ToastAction, variant: ToastVariant = 'info', duration = 5000) =>
			add(msg, variant, duration, action),
		remove,
	};
}

export const toasts = createToastStore();
