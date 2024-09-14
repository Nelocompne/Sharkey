/*
 * SPDX-FileCopyrightText: marie and sharkey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defineAsyncComponent } from 'vue';
import { $i } from '@/account.js';
import { i18n } from '@/i18n.js';
import { popup } from '@/os.js';

export function confirmId(path?: string) {
	if (!$i) {
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkSigninDialog.vue')), {
			autoSet: true,
			message: i18n.ts.signinRequired,
		}, {
			cancelled: () => {
				if (path) {
					window.location.href = path;
				}
			},
			closed: () => dispose(),
		});
		throw new Error('User Account required for id verification');
	}

	if ($i && $i.idVerified) return;

	const { dispose } = popup(defineAsyncComponent(() => import('@/components/SkStripeIdDialog.vue')), {
	}, {
		closed: () => {
			dispose();
			if (path) {
				window.location.href = path;
			}
		},
	});

	throw new Error('id confirmation required');
}
