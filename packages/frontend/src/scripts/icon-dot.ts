class FavIconDot {
	_canvas : HTMLCanvasElement;
	private canvas() {
		if (!this._canvas) {
			this._canvas = document.createElement('canvas');
		}
		return this._canvas;
	}

	_ctx : CanvasRenderingContext2D | null = null;
	private ctx() {
		if (!this._ctx) {
			this._ctx = this.canvas().getContext('2d');
		}
		return this._ctx;
	}

	_favIconEl : HTMLLinkElement;
	private favIconEl() {
		if (!this._favIconEl) {
			this._favIconEl = document.querySelector<HTMLLinkElement>('link[rel$=icon]') ?? this._createFaviconElem();
		}
		return this._favIconEl;
	}

	_favIconImage : HTMLImageElement | null = null;
	private favIconImage() {
		if (!this._favIconImage) {
			const canvas = this.canvas();
			const image = document.createElement('img');

			this._hasLoaded = new Promise((resolve) => {
				image.onload = () => {
					canvas.width = image.width;
					canvas.height = image.height;

					resolve();
				};
			});

			image.src = this.favIconEl().href;

			this._favIconImage = image;
		}
		return this._favIconImage;
	}

	_hasLoaded : Promise;
	private hasLoaded() {
		if (!this._hasLoaded) {
			this.favIconImage();
		}
		return this._hasLoaded;
	}

	private _createFaviconElem() {
		const newLink = document.createElement('link');
		newLink.rel = 'icon';
		newLink.href = '/favicon.ico';
		document.head.appendChild(newLink);
		return newLink;
	}

	private _drawIcon() {
		const ctx = this.ctx();
		const favIconImage = this.favIconImage();
		const canvas = this.canvas();

		if (!ctx || !favIconImage) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(favIconImage, 0, 0, favIconImage.width, favIconImage.height);
	}

	private _drawDot() {
		const ctx = this.ctx();
		const favIconImage = this.favIconImage();

		if (!ctx || !favIconImage) return;

		ctx.beginPath();
		ctx.arc(favIconImage.width - 10, 10, 10, 0, 2 * Math.PI);
		ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--navIndicator');
		ctx.strokeStyle = 'white';
		ctx.fill();
		ctx.stroke();
	}

	private _setFavicon() {
		this.favIconEl().href = this.canvas().toDataURL('image/png');
	}

	async setVisible(isVisible : boolean) {
		await this.hasLoaded();
		this._drawIcon();
		if (isVisible) this._drawDot();
		this._setFavicon();
	}
}

let icon: FavIconDot;

export function setFavIconDot(visible: boolean) {
	if (!icon) {
		icon = new FavIconDot();
	}
	icon.setVisible(visible);
}
