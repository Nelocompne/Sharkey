<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	ref="playerEl"
	:class="[
		$style.moduleContainer,
		controlsShowing && $style.active,
		(module.isSensitive && defaultStore.state.highlightSensitiveMedia) && $style.sensitive,
	]"
	@mouseover="onMouseOver"
	@mouseleave="onMouseLeave"
	@contextmenu.stop
>
	<button v-if="hide" :class="$style.hidden" @click="hide = false">
		<div :class="$style.hiddenTextWrapper">
			<b v-if="module.isSensitive" style="display: block;"><i class="ph-warning ph-bold ph-lg"></i> {{ i18n.ts.sensitive }}{{ defaultStore.state.dataSaver.media ? ` (${i18n.ts.module}${module.size ? ' ' + bytes(module.size) : ''})` : '' }}</b>
			<b v-else style="display: block;"><i class="ph-film-strip ph-bold ph-lg"></i> {{ defaultStore.state.dataSaver.media && module.size ? bytes(module.size) : i18n.ts.module }}</b>
			<span style="display: block;">{{ i18n.ts.clickToShow }}</span>
		</div>
	</button>
	<div v-else :class="$style.moduleRoot" @click.self="showPattern">
		<SkModPlayer
			ref="moduleEl"
			:class="$style.module"
			:src="module.url"
			:alt="module.comment"
		/>
		<button v-if="isReady && !isPlaying" class="_button" :class="$style.moduleOverlayPlayButton" @click="togglePlayPause"><i class="ph-play ph-bold ph-lg"></i></button>
		<i class="ti ti-eye-off" :class="$style.hide" @click="hide = true"></i>
		<div :class="$style.indicators">
			<div v-if="module.comment" :class="$style.indicator">ALT</div>
			<div v-if="module.isSensitive" :class="$style.indicator" style="color: var(--warn);" :title="i18n.ts.sensitive"><i class="ph-warning ph-bold ph-lg"></i></div>
		</div>
		<div :class="$style.moduleControls" @click.self="showPattern">
			<div :class="[$style.controlsChild, $style.controlsLeft]">
				<button class="_button" :class="$style.controlButton" @click="togglePlayPause">
					<i v-if="isPlaying" class="ph-pause ph-bold ph-lg"></i>
					<i v-else class="ph-play ph-bold ph-lg"></i>
				</button>
			</div>
			<div :class="[$style.controlsChild, $style.controlsRight]">
				<button class="_button" :class="$style.controlButton" @click="showMenu">
					<i class="ph-settings ph-bold ph-lg"></i>
				</button>
			</div>
			<div :class="[$style.controlsChild, $style.controlsTime]">{{ hms(elapsedTimeMs, {}) }}</div>
			<div :class="[$style.controlsChild, $style.controlsVolume]">
				<button class="_button" :class="$style.controlButton" @click="toggleMute">
					<i v-if="volume === 0" class="ph-speaker-x ph-bold ph-lg"></i>
					<i v-else class="ph-speaker-high ph-bold ph-lg"></i>
				</button>
				<MkMediaRange
					v-model="volume"
					:sliderBgWhite="true"
					:class="$style.volumeSeekbar"
				/>
			</div>
			<MkMediaRange
				v-model="rangePercent"
				:sliderBgWhite="true"
				:class="$style.seekbarRoot"
			/>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, computed, watch, onDeactivated, onActivated, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import type { MenuItem } from '@/types/menu.js';
import bytes from '@/filters/bytes.js';
import { hms } from '@/filters/hms.js';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import MkMediaRange from '@/components/MkMediaRange.vue';
import SkModPlayer from '@/components/SkModPlayer.vue';
import { iAmModerator } from '@/account.js';

const props = defineProps<{
	module: Misskey.entities.DriveFile;
}>();

// eslint-disable-next-line vue/no-setup-props-destructure
const hide = ref((defaultStore.state.nsfw === 'force' || defaultStore.state.dataSaver.media) ? true : (props.module.isSensitive && defaultStore.state.nsfw !== 'ignore'));

// Menu
const menuShowing = ref(false);

function showMenu(ev: MouseEvent) {
	let menu: MenuItem[] = [];

	menu = [
		// TODO: 再生キューに追加
		{
			text: i18n.ts.hide,
			icon: 'ti ti-eye-off',
			action: () => {
				hide.value = true;
			},
		},
	];

	if (iAmModerator) {
		menu.push({
			type: 'divider',
		}, {
			text: props.module.isSensitive ? i18n.ts.unmarkAsSensitive : i18n.ts.markAsSensitive,
			icon: props.module.isSensitive ? 'ti ti-eye' : 'ti ti-eye-exclamation',
			danger: true,
			action: () => toggleSensitive(props.module),
		});
	}

	menuShowing.value = true;
	os.popupMenu(menu, ev.currentTarget ?? ev.target, {
		align: 'right',
		onClosing: () => {
			menuShowing.value = false;
		},
	});
}

function toggleSensitive(file: Misskey.entities.DriveFile) {
	os.apiWithDialog('drive/files/update', {
		fileId: file.id,
		isSensitive: !file.isSensitive,
	});
}

// MediaControl: Module State
const moduleEl = shallowRef<typeof SkModPlayer>();
const playerEl = shallowRef<HTMLDivElement>();
const isHoverring = ref(false);
const controlsShowing = computed(() => {
	if (!oncePlayed.value) return true;
	if (isHoverring.value) return true;
	if (menuShowing.value) return true;
	return false;
});
let controlStateTimer: string | number;

// MediaControl: Common State
const oncePlayed = ref(false);
const isReady = ref(false);
const isPlaying = computed(() => moduleEl.value?.playing ?? false);
const elapsedTimeMs = ref(0);
const rangePercent = computed({
	get: () => {
		if (!moduleEl.value) return 0;
		return moduleEl.value.position / moduleEl.value.duration;
	},
	set: (to) => {
		if (!moduleEl.value) return;
		moduleEl.value.position = to * moduleEl.value.duration;
		moduleEl.value.performSeek();
	},
});
const volume = ref(.5);

// MediaControl Events
function onMouseOver() {
	if (controlStateTimer) {
		clearTimeout(controlStateTimer);
	}
	isHoverring.value = true;
}

function onMouseLeave() {
	controlStateTimer = window.setTimeout(() => {
		isHoverring.value = false;
	}, 100);
}

function showPattern() {
	if (!isReady.value || !moduleEl.value) return;

	if (moduleEl.value.patternVisible) {
		togglePlayPause();
	} else {
		moduleEl.value.showPattern();
	}
}

function togglePlayPause() {
	if (!isReady.value || !moduleEl.value) return;

	moduleEl.value.playPause();
	if (!isPlaying.value) {
		oncePlayed.value = true;
	}
}

function toggleMute() {
	if (volume.value === 0) {
		volume.value = .5;
	} else {
		volume.value = 0;
	}
}

let onceInit = false;
let stopModuleElWatch: () => void;

function init() {
	if (onceInit) return;
	onceInit = true;

	stopModuleElWatch = watch(moduleEl, () => {
		if (moduleEl.value) {
			isReady.value = true;

			function updateMediaTick() {
				if (moduleEl.value) {
					elapsedTimeMs.value = moduleEl.value.position * 1000;
				}
				window.requestAnimationFrame(updateMediaTick);
			}

			updateMediaTick();

			moduleEl.value.volume = volume.value;
		}
	}, {
		immediate: true,
	});
}

watch(volume, (to) => {
	if (moduleEl.value) moduleEl.value.volume = to;
});

onMounted(() => {
	init();
});

onActivated(() => {
	init();
});

onDeactivated(() => {
	isReady.value = false;
	elapsedTimeMs.value = 0;
	hide.value = (defaultStore.state.nsfw === 'force' || defaultStore.state.dataSaver.media) ? true : (props.module.isSensitive && defaultStore.state.nsfw !== 'ignore');
	stopModuleElWatch();
	onceInit = false;
});
</script>

<style lang="scss" module>
.moduleContainer {
	container-type: inline-size;
	position: relative;
	overflow: clip;
}

.sensitive {
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

.indicators {
	display: inline-flex;
	position: absolute;
	top: 10px;
	left: 10px;
	pointer-events: none;
	opacity: .5;
	gap: 6px;
}

.indicator {
	/* Hardcode to black because either --bg or --fg makes it hard to read in dark/light mode */
	background-color: black;
	border-radius: 6px;
	color: var(--accentLighten);
	display: inline-block;
	font-weight: bold;
	font-size: 0.8em;
	padding: 2px 5px;
}

.hide {
	display: block;
	position: absolute;
	border-radius: var(--radius-sm);
	background-color: black;
	color: var(--accentLighten);
	font-size: 12px;
	opacity: .5;
	padding: 5px 8px;
	text-align: center;
	cursor: pointer;
	top: 12px;
	right: 12px;
}

.hidden {
	width: 100%;
	background: none;
	border: none;
	outline: none;
	font: inherit;
	color: inherit;
	cursor: pointer;
	padding: 120px 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #000;
}

.hiddenTextWrapper {
	text-align: center;
	font-size: 0.8em;
	color: #fff;
}

.moduleRoot {
	background: #000;
	position: relative;
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.module {
	display: block;
	height: 100%;
	width: 100%;
}

.moduleOverlayPlayButton {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%,-50%);

	opacity: 0;
	transition: opacity .4s ease-in-out;

	background: var(--accent);
	color: #fff;
	padding: 1rem;
	border-radius: 99rem;

	font-size: 1.1rem;
}

.moduleLoading {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.moduleControls {
	display: grid;
	grid-template-areas:
		"left time . volume right"
		"seekbar seekbar seekbar seekbar seekbar";
	grid-template-columns: auto auto 1fr auto auto;
	align-items: center;
	gap: 4px 8px;
	pointer-events: none;

	padding: 35px 10px 10px 10px;
	background: linear-gradient(rgba(0, 0, 0, 0),rgba(0, 0, 0, .75));

	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;

	transform: translateY(100%);
	pointer-events: none;
	opacity: 0;
	transition: opacity .4s ease-in-out, transform .4s ease-in-out;
}

.active {
	.moduleControls {
		transform: translateY(0);
		opacity: 1;
		pointer-events: auto;
	}

	.moduleOverlayPlayButton {
		opacity: 1;
	}
}

.controlsChild {
	display: flex;
	align-items: center;
	gap: 4px;
	color: #fff;

	.controlButton {
		padding: 6px;
		border-radius: calc(var(--radius) / 2);
		transition: background-color .2s ease-in-out;
		font-size: 1.05rem;

		&:hover {
			background-color: var(--accent);
		}
	}
}

.controlsLeft {
	grid-area: left;
}

.controlsRight {
	grid-area: right;
}

.controlsTime {
	grid-area: time;
	font-size: .9rem;
}

.controlsVolume {
	grid-area: volume;

	.volumeSeekbar {
		display: none;
	}
}

.seekbarRoot {
	grid-area: seekbar;
}

@container (min-width: 500px) {
	.moduleControls {
		grid-template-areas: "left seekbar time volume right";
		grid-template-columns: auto 1fr auto auto auto;
	}

	.controlsVolume {
		.volumeSeekbar {
			max-width: 90px;
			display: block;
			flex-grow: 1;
		}
	}
}
.indicators {
	display: inline-flex;
	position: absolute;
	top: 10px;
	left: 10px;
	pointer-events: none;
	opacity: .5;
	gap: 6px;
}

.indicator {
	/* Hardcode to black because either --bg or --fg makes it hard to read in dark/light mode */
	background-color: black;
	border-radius: var(--radius-sm);
	color: var(--accentLighten);
	display: inline-block;
	font-weight: bold;
	font-size: 0.8em;
	padding: 2px 5px;
}
</style>
