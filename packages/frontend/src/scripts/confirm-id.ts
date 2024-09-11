/*
 * SPDX-FileCopyrightText: marie and sharkey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent } from 'vue';
import { $i } from '@/account.js';
import { popup } from '@/os.js';

export function confirmId(path?: string) {
	if ($i && !$i.idCheckRequired) return;

	const { dispose } = popup(defineAsyncComponent(() => import('@/components/SkStripeIdDialog.vue')), {
	}, {
		closed: () => {
			dispose()
			if (path) {
				window.location.href = path;
			}
		},
	});

	throw new Error('id confirmation required');
}
