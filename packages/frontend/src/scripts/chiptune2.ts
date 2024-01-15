type HandlerFunction = Function;

interface Handler {
	eventName: string,
	handler: HandlerFunction,
}

export class ChiptuneJsPlayer {
	libopenmpt;
	audioContext: AudioContext;
	context: GainNode;
	currentPlayingNode: ChiptuneProcessorNode | null;
	private handlers: Handler[];
	private touchLocked: boolean;

	constructor() {
		this.libopenmpt = null;
		this.audioContext = new AudioContext();
		this.context = this.audioContext.createGain();
		this.currentPlayingNode = null;
		this.handlers = [];
		this.touchLocked = true;
	}

	fireEvent(eventName: string, response) {
		const handlers = this.handlers;
		if (handlers.length > 0) {
			for (const handler of handlers) {
				if (handler.eventName === eventName) {
					handler.handler(response);
				}
			}
		}
	}

	addHandler(
		eventName: string,
		handler: HandlerFunction,
	) {
		this.handlers.push({ eventName, handler });
	}

	clearHandlers() {
		this.handlers = [];
	}

	onEnded(handler: HandlerFunction) {
		this.addHandler('onEnded', handler);
	}

	onError(handler: HandlerFunction) {
		this.addHandler('onError', handler);
	}

	duration(): number {
		if (!this.currentPlayingNode) {
			return 0;
		}

		return this.libopenmpt._openmpt_module_get_duration_seconds(
			this.currentPlayingNode.modulePtr,
		);
	}

	position(): number {
		if (!this.currentPlayingNode) {
			return 0;
		}

		return this.libopenmpt._openmpt_module_get_position_seconds(
			this.currentPlayingNode.modulePtr,
		);
	}

	repeat(repeatCount: number) {
		if (!this.currentPlayingNode) {
			return;
		}

		this.libopenmpt._openmpt_module_set_repeat_count(
			this.currentPlayingNode.modulePtr,
			repeatCount,
		);
	}

	seek(position: number) {
		if (!this.currentPlayingNode) {
			return;
		}

		this.libopenmpt._openmpt_module_set_position_seconds(
			this.currentPlayingNode.modulePtr,
			position,
		);
	}

	metadata() {
		if (this.currentPlayingNode == null) {
			return null;
		}

		const data: {[key: string]: string} = {};
		const keys = this.libopenmpt
			.UTF8ToString(
				this.libopenmpt._openmpt_module_get_metadata_keys(
					this.currentPlayingNode.modulePtr,
				),
			)
			.split(';');
		let keyNameBuffer = 0;
		for (const key of keys) {
			keyNameBuffer = this.libopenmpt._malloc(key.length + 1);
			this.libopenmpt.stringToUTF8(key, keyNameBuffer);
			data[key] = this.libopenmpt.UTF8ToString(
				this.libopenmpt._openmpt_module_get_metadata(
					this.currentPlayingNode.modulePtr,
					keyNameBuffer,
				),
			);
			this.libopenmpt._free(keyNameBuffer);
		}
		return data;
	}

	unlock() {
		const buffer = this.audioContext.createBuffer(1, 1, 22050);
		const unlockSource = this.audioContext.createBufferSource();
		unlockSource.buffer = buffer;
		unlockSource.connect(this.context);
		this.context.connect(this.audioContext.destination);
		unlockSource.start(0);
		this.touchLocked = false;
	}

	async load(input: string): Promise<ArrayBuffer> {
		if (this.touchLocked) {
			this.unlock();
		}

		const response = await fetch(input);
		const arrayBuffer = await response.arrayBuffer();
		return arrayBuffer;
	}

	async play(buffer: ArrayBuffer) {
		this.unlock();
		this.stop();
		const processNode = await this.createLibopenmptNode(buffer);
		this.libopenmpt._openmpt_module_set_repeat_count(
			processNode.modulePtr,
			0,
		);
		this.currentPlayingNode = processNode;
		processNode.processNode.connect(this.context);
		this.context.connect(this.audioContext.destination);
	}

	stop() {
		if (this.currentPlayingNode == null) {
			return;
		}

		this.currentPlayingNode.processNode.disconnect();
		this.currentPlayingNode.cleanup();
		this.currentPlayingNode = null;
	}

	togglePause() {
		if (this.currentPlayingNode == null) {
			return;
		}

		this.currentPlayingNode.togglePause();
	}

	getPattern() {
		if (this.currentPlayingNode?.modulePtr) {
			return this.libopenmpt._openmpt_module_get_current_pattern(
				this.currentPlayingNode.modulePtr,
			);
		}
		return 0;
	}

	getRow() {
		if (this.currentPlayingNode?.modulePtr) {
			return this.libopenmpt._openmpt_module_get_current_row(
				this.currentPlayingNode.modulePtr,
			);
		}
		return 0;
	}

	getNumPatterns() {
		if (this.currentPlayingNode?.modulePtr) {
			return this.libopenmpt._openmpt_module_get_num_patterns(
				this.currentPlayingNode.modulePtr,
			);
		}
		return 0;
	}

	getPatternNumRows(pattern: number) {
		if (this.currentPlayingNode?.modulePtr) {
			return this.libopenmpt._openmpt_module_get_pattern_num_rows(
				this.currentPlayingNode.modulePtr,
				pattern,
			);
		}
		return 0;
	}

	getPatternRowChannel(
		pattern: number,
		row: number,
		channel: number,
	) {
		if (this.currentPlayingNode?.modulePtr) {
			return this.libopenmpt.UTF8ToString(
				this.libopenmpt._openmpt_module_format_pattern_row_channel(
					this.currentPlayingNode.modulePtr,
					pattern,
					row,
					channel,
					0,
					true,
				),
			);
		}
		return '';
	}

	async createLibopenmptNode(buffer: ArrayBuffer) {
		if (!this.libopenmpt) {
			const libopenmpt = await import('libopenmpt-wasm');
			this.libopenmpt = await libopenmpt.default( _DEV_ ? {
				// hack to make libopenmpt load in dev mode
				locateFile(file) {
					const url = new URL(window.location.href);
					url.pathname = `/@fs/${__DIRNAME__}/node_modules/libopenmpt-wasm/${file}`;
					return url.href;
				},
			} : {});
		}

		return new ChiptuneProcessorNode(this, buffer);
	}
}

class ChiptuneProcessorNode {
	player: ChiptuneJsPlayer;
	processNode: ScriptProcessorNode;
	paused: boolean;

	nbChannels: number;
	patternIndex: number;

	modulePtr: number;
	leftBufferPtr: number;
	rightBufferPtr: number;

	constructor(player: ChiptuneJsPlayer, buffer: ArrayBuffer) {
		const maxFramesPerChunk = 4096;

		this.player = player;
		this.processNode = this.player.audioContext.createScriptProcessor(2048, 0, 2);

		const libopenmpt = player.libopenmpt;
		const byteArray = new Int8Array(buffer);
		const ptrToFile = libopenmpt._malloc(byteArray.byteLength);
		libopenmpt.HEAPU8.set(byteArray, ptrToFile);

		this.modulePtr = libopenmpt._openmpt_module_create_from_memory(
			ptrToFile,
			byteArray.byteLength,
			0,
			0,
			0,
		);
		this.nbChannels = libopenmpt._openmpt_module_get_num_channels(
			this.modulePtr,
		);
		this.patternIndex = -1;
		this.paused = false;
		this.leftBufferPtr = libopenmpt._malloc(4 * maxFramesPerChunk);
		this.rightBufferPtr = libopenmpt._malloc(4 * maxFramesPerChunk);

		this.processNode.addEventListener('audioprocess', (ev) => {
			const outputL = ev.outputBuffer.getChannelData(0);
			const outputR = ev.outputBuffer.getChannelData(1);
			let framesToRender = outputL.length;
			if (this.modulePtr === 0) {
				for (let i = 0; i < framesToRender; ++i) {
					outputL[i] = 0;
					outputR[i] = 0;
				}
				this.processNode.disconnect();
				this.cleanup();
				return;
			}
			if (this.paused) {
				for (let i = 0; i < framesToRender; ++i) {
					outputL[i] = 0;
					outputR[i] = 0;
				}
				return;
			}
			let framesRendered = 0;
			let ended = false;
			let error = false;

			const currentPattern =
				this.player.libopenmpt._openmpt_module_get_current_pattern(
					this.modulePtr,
				);
			const currentRow =
				this.player.libopenmpt._openmpt_module_get_current_row(
					this.modulePtr,
				);
			if (currentPattern !== this.patternIndex) {
				this.player.fireEvent('onPatternChange');
			}
			this.player.fireEvent('onRowChange', { index: currentRow });

			while (framesToRender > 0) {
				const framesPerChunk = Math.min(framesToRender, maxFramesPerChunk);
				const actualFramesPerChunk =
					this.player.libopenmpt._openmpt_module_read_float_stereo(
						this.modulePtr,
						this.processNode.context.sampleRate,
						framesPerChunk,
						this.leftBufferPtr,
						this.rightBufferPtr,
					);
				if (actualFramesPerChunk === 0) {
					ended = true;
					// modulePtr will be 0 on openmpt: error: openmpt_module_read_float_stereo: ERROR: module * not valid or other openmpt error
					error = !this.modulePtr;
				}
				const rawAudioLeft = this.player.libopenmpt.HEAPF32.subarray(
					this.leftBufferPtr / 4,
					this.leftBufferPtr / 4 + actualFramesPerChunk,
				);
				const rawAudioRight = this.player.libopenmpt.HEAPF32.subarray(
					this.rightBufferPtr / 4,
					this.rightBufferPtr / 4 + actualFramesPerChunk,
				);
				for (let i = 0; i < actualFramesPerChunk; ++i) {
					outputL[framesRendered + i] = rawAudioLeft[i];
					outputR[framesRendered + i] = rawAudioRight[i];
				}
				for (let i = actualFramesPerChunk; i < framesPerChunk; ++i) {
					outputL[framesRendered + i] = 0;
					outputR[framesRendered + i] = 0;
				}
				framesToRender -= framesPerChunk;
				framesRendered += framesPerChunk;
			}
			if (ended) {
				this.processNode.disconnect();
				this.cleanup();
				error
					? this.player.fireEvent('onError', { type: 'openmpt' })
					: this.player.fireEvent('onEnded');
			}
		});
	}

	cleanup() {
		if (this.modulePtr !== 0) {
			this.player.libopenmpt._openmpt_module_destroy(this.modulePtr);
			this.modulePtr = 0;
		}
		if (this.leftBufferPtr !== 0) {
			this.player.libopenmpt._free(this.leftBufferPtr);
			this.leftBufferPtr = 0;
		}
		if (this.rightBufferPtr !== 0) {
			this.player.libopenmpt._free(this.rightBufferPtr);
			this.rightBufferPtr = 0;
		}
	}

	stop() {
		this.processNode.disconnect();
		this.cleanup();
	}

	pause() {
		this.paused = true;
	}

	unpause() {
		this.paused = false;
	}

	togglePause() {
		this.paused = !this.paused;
	}
}

