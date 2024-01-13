<template>
<div :class="$style.root">
	<div v-if="patternShow">
		<div v-if="patData.length !== 0" ref="modPattern" :class="$style.pattern">
			<span
				v-for="(row, i) in patData[currentPattern]"
				ref="initRow"
				:key="i"
				:class="[$style.row, { [$style.active]: isRowActive(i) }]"
			>
				<span :class="{ [$style.quarter]: i % 4 === 0 }">{{ indexText(i) }}</span>
				<span :class="$style.column">{{ getRowText(row) }}</span>
			</span>
		</div>
		<MkLoading v-else/>
	</div>
	<div v-else :class="$style.pattern" @click="showPattern()">
		<p>{{ i18n.ts.patternHidden }}</p>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, shallowRef, onDeactivated, onMounted, nextTick, watch } from 'vue';
import { i18n } from '@/i18n.js';
import { ChiptuneJsPlayer } from '@/scripts/chiptune2.js';

const props = defineProps<{
	src: string
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
const patternShow = ref(false);
const playing = ref(false);
const modPattern = ref<HTMLDivElement>();
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
const currentRow = ref(0);

const volume = computed({
	get() {
		return player.value.context.gain.value;
	},

	set(value) {
		player.value.context.gain.value = value;
	},
});

let buffer: ArrayBuffer|null = null;
let rowHeight = 0;
let isSeeking = false;

watch(currentRow, (row) => {
	if (!modPattern.value) {
		return;
	}

	if (rowHeight === 0 && initRow.value) rowHeight = initRow.value[0].getBoundingClientRect().height;
	modPattern.value.scrollTop = row * rowHeight;
});

async function load() {
	try {
		buffer = await player.value.load(props.src);
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
		currentRow.value = i.index;
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
	currentRow.value = 0;
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

function isRowActive(i: number) {
	return i === currentRow.value;
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

defineExpose({
	initSeek,
	performSeek,
	playPause,
	stop,
	toggleLoop,
	length,
	loading,
	loop,
	playing,
	position,
	volume,
});
</script>

<style lang="scss" module>
.root {
	width: 100%;
	height: 100%;
	overflow: hidden;
	color: white;
	background-color: black;
	text-align: center;
	font: 12px monospace;
	white-space: pre;
	user-select: none;
}

.pattern {
	display: grid;
	overflow-y: hidden;
	height: 0;
	padding-top: calc((56.25% - 48px) / 2);
	padding-bottom: calc((56.25% - 48px) / 2);
	content-visibility: auto;
}

.row {
	opacity: 0.5;
}

.active {
	opacity: 1;
}

.quarter {
	color: var(--badge);
}

.column {
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
</style>
