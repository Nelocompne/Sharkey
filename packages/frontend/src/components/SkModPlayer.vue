<template>
<div v-if="!available" :class="$style.disabled">
	<MkLoading v-if="fetching"/>
	<MkError v-else-if="error" @retry="load()"/>
</div>
<div v-else-if="hide" :class="$style.disabled" @click="toggleVisible()">
	<div>
		<b><i class="ph-eye ph-bold ph-lg"></i> {{ i18n.ts.sensitive }}</b>
		<span>{{ i18n.ts.clickToShow }}</span>
	</div>
</div>

<div v-else :class="$style.enabled">
	<div :class="$style.patternDisplay">
		<div v-if="patternShow">
			<div v-if="patData.length !== 0" ref="modPattern" :class="$style.pattern">
				<span
					v-for="(row, i) in patData[currentPattern]"
					ref="initRow"
					:key="i"
					:class="[$style.row, { [$style.active]: isRowActive(i) }]"
				>
					<span :class="{ [$style.colQuarter]: i % 4 === 0 }">{{ indexText(i) }}</span>
					<span :class="$style.inner">{{ getRowText(row) }}</span>
				</span>
			</div>
			<MkLoading v-else/>
		</div>
		<div v-else :class="$style.pattern" @click="showPattern()">
			<p>{{ i18n.ts.patternHidden }}</p>
		</div>
	</div>
	<div :class="$style.controls">
		<button v-if="!loading" :class="$style.play" @click="playPause()">
			<i v-if="playing" class="ph-pause ph-bold ph-lg"></i>
			<i v-else class="ph-play ph-bold ph-lg"></i>
		</button>
		<MkLoading v-else :em="true"/>
		<button :class="$style.stop" @click="stop()">
			<i class="ph-stop ph-bold ph-lg"></i>
		</button>
		<button :class="$style.loop" @click="toggleLoop()">
			<i v-if="loop" class="ph-repeat ph-bold ph-lg"></i>
			<i v-else class="ph-repeat-once ph-bold ph-lg"></i>
		</button>
		<input ref="progress" v-model="position" :class="$style.progress" type="range" min="0" :max="length" step="0.1" @mousedown="initSeek()" @mouseup="performSeek()"/>
		<input v-model="player.context.gain.value" type="range" min="0" max="1" step="0.1"/>
		<a :class="$style.download" :title="i18n.ts.download" :href="module.url" target="_blank">
			<i class="ph-download ph-bold ph-lg"></i>
		</a>
	</div>
	<i :class="$style.hide" class="ph-eye-slash ph-bold ph-lg" @click="toggleVisible()"></i>
</div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, nextTick, onDeactivated, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import { i18n } from '@/i18n.js';
import { defaultStore } from '@/store.js';
import { ChiptuneJsPlayer } from '@/scripts/chiptune2.js';

const props = defineProps<{
	module: Misskey.entities.DriveFile
}>();

interface ModRow {
	notes: string[];
	insts: string[];
	vols: string[];
	fxs: string[];
	ops: string[];
}

const available = ref(false);
const initRow = shallowRef<HTMLSpanElement>();
const hide = ref(defaultStore.state.nsfw === 'force' ? true : props.module.isSensitive && defaultStore.state.nsfw !== 'ignore');
const patternShow = ref(false);
const playing = ref(false);
const modPattern = ref<HTMLDivElement>();
const progress = ref<HTMLProgressElement>();
const position = ref(0);
const player = shallowRef(new ChiptuneJsPlayer());
const patData = shallowRef<readonly ModRow[][]>([]);
const currentPattern = ref(0);
const nbChannels = ref(0);
const length = ref(1);
const loop = ref(false);
const fetching = ref(true);
const error = ref(false);
const loading = ref(false);

let currentRow = 0;
let rowHeight = 0;
let buffer: ArrayBuffer|null = null;
let isSeeking = false;

async function load() {
	try {
		buffer = await player.value.load(props.module.url);
		available.value = true;
		error.value = false;
		fetching.value = false;
	} catch (err) {
		console.error(err);
		error.value = true;
		fetching.value = false;
	}
}

onMounted(load);

function showPattern() {
	patternShow.value = !patternShow.value;
	nextTick(() => {
		if (playing.value) display();
		else stop();
	});
}

function getRowText(row: ModRow) {
	let text = '';
	for (let i = 0; i < row.notes.length; i++) {
		text = text.concat(
			'|',
			row.notes[i],
			row.insts[i],
			row.vols[i],
			row.fxs[i],
			row.ops[i],
		);
	}
	return text;
}

function playPause() {
	if (buffer === null) {
		return;
	}

	player.value.addHandler('onRowChange', (i: { index: number }) => {
		currentRow = i.index;
		currentPattern.value = player.value.getPattern();
		length.value = player.value.duration();
		if (!isSeeking) {
			position.value = player.value.position() % length.value;
		}
		requestAnimationFrame(() => display());
	});

	player.value.addHandler('onEnded', () => {
		stop();
	});

	if (player.value.currentPlayingNode === null) {
		loading.value = true;
		player.value.play(buffer).then(() => {
			player.value.seek(position.value);
			player.value.repeat(loop.value ? -1 : 0);
			playing.value = true;
			loading.value = false;
		});
	} else {
		player.value.togglePause();
		playing.value = !player.value.currentPlayingNode.paused;
	}
}

async function stop(noDisplayUpdate = false) {
	if (buffer === null) {
		return;
	}

	player.value.stop();
	playing.value = false;
	if (!noDisplayUpdate) {
		try {
			await player.value.play(buffer);
			display(true);
		} catch (err) {
			console.warn(err);
		}
	}
	player.value.stop();
	position.value = 0;
	currentRow = 0;
	player.value.clearHandlers();
}

function toggleLoop() {
	loop.value = !loop.value;
	player.value.repeat(loop.value ? -1 : 0);
}

function initSeek() {
	isSeeking = true;
}

function performSeek() {
	player.value.seek(position.value);
	display();
	isSeeking = false;
}

function toggleVisible() {
	hide.value = !hide.value;
	nextTick(() => { stop(hide.value); });
}

function isRowActive(i: number) {
	if (i !== currentRow) {
		return false;
	}

	if (modPattern.value) {
		if (rowHeight === 0 && initRow.value) rowHeight = initRow.value[0].getBoundingClientRect().height;
		modPattern.value.scrollTop = currentRow * rowHeight;
	}
	return true;
}

function indexText(i: number) {
	return i.toString(16).padStart(2, '0');
}

function getRow(pattern: number, rowOffset: number): ModRow {
	const notes: string[] = [];
	const insts: string[] = [];
	const vols: string[] = [];
	const fxs: string[] = [];
	const ops: string[] = [];

	for (let channel = 0; channel < nbChannels.value; channel++) {
		const part = player.value.getPatternRowChannel(
			pattern,
			rowOffset,
			channel,
		);

		notes.push(part.substring(0, 3));
		insts.push(part.substring(4, 6));
		vols.push(part.substring(6, 9));
		fxs.push(part.substring(10, 11));
		ops.push(part.substring(11, 13));
	}

	return {
		notes,
		insts,
		vols,
		fxs,
		ops,
	};
}

function display(reset = false) {
	if (!patternShow.value) return;

	if (reset) {
		currentPattern.value = player.value.getPattern();
	}

	if (patData.value.length === 0) {
		const nbPatterns = player.value.getNumPatterns();
		currentPattern.value = player.value.getPattern();

		if (player.value.currentPlayingNode) {
			nbChannels.value = player.value.currentPlayingNode.nbChannels;
		}

		const patternsArray: ModRow[][] = [];

		for (let patOffset = 0; patOffset < nbPatterns; patOffset++) {
			const rowsArray: ModRow[] = [];
			const nbRows = player.value.getPatternNumRows(patOffset);
			for (let rowOffset = 0; rowOffset < nbRows; rowOffset++) {
				rowsArray.push(getRow(patOffset, rowOffset));
			}
			patternsArray.push(rowsArray);
		}

		patData.value = Object.freeze(patternsArray);
	}
}

onDeactivated(() => {
	stop();
});
</script>

<style lang="scss" module>
.hide {
	border-radius: var(--radius-sm) !important;
	background-color: black !important;
	color: var(--accentLighten) !important;
	font-size: 12px !important;
}

.enabled {
	position: relative;
	overflow: hidden;
	display: flex;
	flex-direction: column;

	> i {
		display: block;
		position: absolute;
		border-radius: var(--radius-sm);
		background-color: var(--fg);
		color: var(--accentLighten);
		font-size: 14px;
		opacity: .5;
		padding: 3px 6px;
		text-align: center;
		cursor: pointer;
		top: 12px;
		right: 12px;
	}

	> .patternDisplay {
		width: 100%;
		height: 100%;
		overflow: hidden;
		color: white;
		background-color: black;
		text-align: center;
		font: 12px monospace;
		white-space: pre;
		user-select: none;

		.pattern {
			display: grid;
			overflow-y: hidden;
			height: 0;
			padding-top: calc((56.25% - 48px) / 2);
			padding-bottom: calc((56.25% - 48px) / 2);
			content-visibility: auto;

			.row {
				opacity: 0.5;

				&.active {
					opacity: 1;
				}

				> .colQuarter {
					color: var(--badge);
				}

				> .inner {
					background: repeating-linear-gradient(
						to right,
						var(--fg) 0 4ch,
						var(--codeBoolean) 4ch 6ch,
						var(--codeNumber) 6ch 9ch,
						var(--codeString) 9ch 10ch,
						var(--error) 10ch 12ch
					);
					background-clip: text;
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
				}
			}
		}
	}

	> .controls {
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
}

.disabled {
	display: flex;
	justify-content: center;
	align-items: center;
	background: #111;
	color: #fff;

	> div {
		display: table-cell;
		text-align: center;
		font-size: 12px;

		> b {
			display: block;
		}
	}
}
</style>
