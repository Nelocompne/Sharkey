<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div ref="thumbnail" :class="$style.root">
	<template v-if="isThumbnailAvailable && is === 'image'">
		<div class="relative">
			<ImgWithBlurhash :hash="file.blurhash" :src="file.thumbnailUrl" :alt="file.name" :title="file.name" :cover="fit !== 'contain'"/>

			<div v-if="props.file.comment" v-tooltip="getTrimmedAltText()" :class="$style.hasAltText">ALT</div>
		</div>
	</template>
	<template v-else>
		<i v-if="is === 'image'" class="ph-image-square ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else-if="is === 'video'" class="ph-video ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else-if="is === 'audio' || is === 'midi'" class="ph-file-audio ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else-if="is === 'csv'" class="ph-file-text ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else-if="is === 'pdf'" class="ph-file-text ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else-if="is === 'textfile'" class="ph-file-text ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else-if="is === 'archive'" class="ph-file-zip ph-bold ph-lg" :class="$style.icon"></i>
		<i v-else class="ph-file ph-bold ph-lg" :class="$style.icon"></i>

		<i v-if="isThumbnailAvailable && is === 'video'" class="ph-video ph-bold ph-lg" :class="$style.iconSub"></i>
	</template>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import * as Misskey from 'misskey-js';
import ImgWithBlurhash from '@/components/MkImgWithBlurhash.vue';

const props = defineProps<{
	file: Misskey.entities.DriveFile;
	fit: string;
}>();

const is = computed(() => {
	if (props.file.type.startsWith('image/')) return 'image';
	if (props.file.type.startsWith('video/')) return 'video';
	if (props.file.type === 'audio/midi') return 'midi';
	if (props.file.type.startsWith('audio/')) return 'audio';
	if (props.file.type.endsWith('/csv')) return 'csv';
	if (props.file.type.endsWith('/pdf')) return 'pdf';
	if (props.file.type.startsWith('text/')) return 'textfile';
	if ([
		'application/zip',
		'application/x-cpio',
		'application/x-bzip',
		'application/x-bzip2',
		'application/java-archive',
		'application/x-rar-compressed',
		'application/x-tar',
		'application/gzip',
		'application/x-7z-compressed',
	].some(archiveType => archiveType === props.file.type)) return 'archive';
	return 'unknown';
});

const isThumbnailAvailable = computed(() => {
	return props.file.thumbnailUrl
		? (is.value === 'image' as const || is.value === 'video')
		: false;
});

const getTrimmedAltText = () => {
	if (props.file.comment == null) {
		return '';
	}
	const maxCharacters = 40;

	const alt = props.file.comment as unknown as string;
	if (alt.length > maxCharacters) {
		return alt.substring(0, maxCharacters) + '...';
	}

	return alt;
};
</script>

<style lang="scss" module>
.root {
	position: relative;
	display: flex;
	background: var(--panel);
	border-radius: var(--radius-sm);
	overflow: clip;
}

.iconSub {
	position: absolute;
	width: 30%;
	height: auto;
	margin: 0;
	right: 4%;
	bottom: 4%;
}

.icon {
	pointer-events: none;
	margin: auto;
	font-size: 32px;
	color: #777;
}

.hasAltText {
	position: absolute;
	bottom: 0px;
	right: 0px;
	z-index: 3;
	margin: 5px;
	cursor: help;

	background-color: black;
	border-radius: var(--radius-sm);
	color: var(--accentLighten);
	display: inline-block;
	font-weight: bold;
	font-size: 0.8em;
	padding: 2px 5px;
}
</style>
