<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="hide" :class="[$style.hidden, (module.isSensitive && defaultStore.state.highlightSensitiveMedia) && $style.sensitiveContainer]" @click="hide = false">
	<!-- 【注意】dataSaverMode が有効になっている際には、hide が false になるまでサムネイルや動画を読み込まないようにすること -->
	<div :class="$style.sensitive">
		<b v-if="module.isSensitive" style="display: block;"><i class="ph-warning ph-bold ph-lg"></i> {{ i18n.ts.sensitive }}{{ defaultStore.state.dataSaver.media ? ` (${i18n.ts.module}${module.size ? ' ' + bytes(module.size) : ''})` : '' }}</b>
		<b v-else style="display: block;"><i class="ph-music-notes ph-bold ph-lg"></i> {{ defaultStore.state.dataSaver.media && module.size ? bytes(module.size) : i18n.ts.module }}</b>
		<span>{{ i18n.ts.clickToShow }}</span>
	</div>
</div>
<div v-else :class="[$style.visible, (module.isSensitive && defaultStore.state.highlightSensitiveMedia) && $style.sensitiveContainer]">
	<SkModPlayer ref="moduleEl" :src="module.url"/>
	<div v-if="moduleEl" :class="$style.controls">
		<button v-if="!moduleEl.loading" @click="moduleEl.playPause()">
			<i v-if="moduleEl.playing" class="ph-pause ph-bold ph-lg"></i>
			<i v-else class="ph-play ph-bold ph-lg"></i>
		</button>
		<MkLoading v-else :em="true"/>
		<button @click="moduleEl.stop()">
			<i class="ph-stop ph-bold ph-lg"></i>
		</button>
		<button @click="moduleEl.toggleLoop()">
			<i v-if="moduleEl.loop" class="ph-repeat ph-bold ph-lg"></i>
			<i v-else class="ph-repeat-once ph-bold ph-lg"></i>
		</button>
		<input ref="progress" v-model="moduleEl.position" :class="$style.progress" type="range" min="0" :max="moduleEl.length" step="0.1" @mousedown="moduleEl.initSeek()" @mouseup="moduleEl.performSeek()"/>
		<input v-model="moduleEl.volume" type="range" min="0" max="1" step="0.1"/>
		<a :title="i18n.ts.download" :href="module.url" target="_blank">
			<i class="ph-download ph-bold ph-lg"></i>
		</a>
	</div>
	<i class="ph-eye-slash ph-bold ph-lg" :class="$style.hide" @click="hide = true"></i>
</div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, watch } from 'vue';
import * as Misskey from 'misskey-js';
import bytes from '@/filters/bytes.js';
import SkModPlayer from '@/components/SkModPlayer.vue';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	module: Misskey.entities.DriveFile;
}>();

const hide = ref((defaultStore.state.nsfw === 'force' || defaultStore.state.dataSaver.media) ? true : (props.module.isSensitive && defaultStore.state.nsfw !== 'ignore'));

const moduleEl = shallowRef<typeof SkModPlayer>();

watch(moduleEl, () => {
	if (moduleEl.value) {
		moduleEl.value.volume.value = 0.3;
	}
});
</script>

<style lang="scss" module>
.visible {
	position: relative;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.sensitiveContainer {
	position: relative;

	&::after {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		border-radius: inherit;
		box-shadow: inset 0 0 0 4px var(--warn);
	}
}

.hide {
	display: block;
	position: absolute;
	border-radius: var(--radius-sm);
	background-color: black;
	color: var(--accentLighten);
	font-size: 14px;
	opacity: .5;
	padding: 3px 6px;
	text-align: center;
	cursor: pointer;
	top: 12px;
	right: 12px;
}

.hidden {
	display: flex;
	justify-content: center;
	align-items: center;
	background: #111;
	color: #fff;
}

.sensitive {
	display: table-cell;
	text-align: center;
	font-size: 12px;
}

.controls {
	display: flex;
	width: 100%;
	background-color: var(--bg);
	z-index: 1;

	> * {
		padding: 4px 8px;
	}

	> button, a {
		border: none;
		background-color: transparent;
		color: var(--accent);
		cursor: pointer;

		&:hover {
			background-color: var(--fg);
		}
	}

	> input[type=range] {
		height: 21px;
		-webkit-appearance: none;
		width: 90px;
		padding: 0;
		margin: 4px 8px;
		overflow-x: hidden;

		&:focus {
			outline: none;

			&::-webkit-slider-runnable-track {
				background: var(--bg);
			}

			&::-ms-fill-lower, &::-ms-fill-upper {
				background: var(--bg);
			}
		}

		&::-webkit-slider-runnable-track {
			width: 100%;
			height: 100%;
			cursor: pointer;
			border-radius: 0;
			animate: 0.2s;
			background: var(--bg);
			border: 1px solid var(--fg);
			overflow-x: hidden;
		}

		&::-webkit-slider-thumb {
			border: none;
			height: 100%;
			width: 14px;
			border-radius: 0;
			background: var(--accentLighten);
			cursor: pointer;
			-webkit-appearance: none;
			box-shadow: calc(-100vw - 14px) 0 0 100vw var(--accent);
			clip-path: polygon(1px 0, 100% 0, 100% 100%, 1px 100%, 1px calc(50% + 10.5px), -100vw calc(50% + 10.5px), -100vw calc(50% - 10.5px), 0 calc(50% - 10.5px));
			z-index: 1;
		}

		&::-moz-range-track {
			width: 100%;
			height: 100%;
			cursor: pointer;
			border-radius: 0;
			animate: 0.2s;
			background: var(--bg);
			border: 1px solid var(--fg);
		}

		&::-moz-range-progress {
			cursor: pointer;
			height: 100%;
			background: var(--accent);
		}

		&::-moz-range-thumb {
			border: none;
			height: 100%;
			border-radius: 0;
			width: 14px;
			background: var(--accentLighten);
			cursor: pointer;
		}

		&::-ms-track {
			width: 100%;
			height: 100%;
			cursor: pointer;
			border-radius: 0;
			animate: 0.2s;
			background: transparent;
			border-color: transparent;
			color: transparent;
		}

		&::-ms-fill-lower {
			background: var(--accent);
			border: 1px solid var(--fg);
			border-radius: 0;
		}

		&::-ms-fill-upper {
			background: var(--bg);
			border: 1px solid var(--fg);
			border-radius: 0;
		}

		&::-ms-thumb {
			margin-top: 1px;
			border: none;
			height: 100%;
			width: 14px;
			border-radius: 0;
			background: var(--accentLighten);
			cursor: pointer;
		}

		&.progress {
			flex-grow: 1;
			min-width: 0;
		}
	}
}
</style>
