//replicates most of core.js API surface so it can be called into
import {
	MypaintBrush,
	MypaintSurface,
	ColorRGB
} from './mybrush'

export class FastPaintCore {
	//exportable consts

	static get brushModeErase() {
		return 0;
	}
	static get brushModeDraw() {
		return 1;
	}
	static get brushModeMove() {
		return 2;
	}

	static get brushToolCircle() {
		return 0;
	}
	static get brushToolSquare() {
		return 1;
	}

	static get layerShown() {
		return 2;
	}
	static get layerHidden() {
		return 1;
	}

	//global variables--------------------------------------------

	//consts

	static canvasStyle = `
		border: 1px solid black;
        image-rendering:  pixelated;
        position: absolute;
        top: 0px;
        left: 0px;
        transform-origin: 0 0;
	`;

	//switch absolute back to relative once I figure out what's going on

	static inputSurfaceStyle = `
		border: 1px solid black;
        image-rendering:  pixelated;
        position: absolute;
        top: 0px;
        left: 0px;
        transform-origin: 0 0;
        z-index: 999;
	`;

	static drawAreaStyle = `
		background-color: gray;
        overflow: scroll;
        width:  80%;
        height:  100vh;
        float:  left;
	`;

	static windowShimStyle = `
		position: relative;
	`;

	static windowShimStyle2 = `
		background-color: gray;
    	overflow: auto;
    	display: flex;
    	align-items: center;
    	justify-content: center;
	`;
	//element bindings--------------------------------------------

	//canvas binds

	constructor(shim) {
		//brushlib data
		this.pen = {
			opaque: {
				base_value: 1.0
			},
			opaque_multiply: {
				base_value: 0.000,
				pointsList: {
					pressure: [0.000, 0.000, 0.015, 0.000, 0.015, 1.000, 1.000, 1.000]
				}
			},
			opaque_linearize: {
				base_value: 0.9
			},
			radius_logarithmic: {
				base_value: 0.75
			},
			hardness: {
				base_value: 0.5
			},
			dabs_per_basic_radius: {
				base_value: 0.000
			},
			dabs_per_actual_radius: {
				base_value: 10.500
			},
			dabs_per_second: {
				base_value: 0.000
			},
			radius_by_random: {
				base_value: 0.000
			},
			speed1_slowness: {
				base_value: 0.040
			},
			speed2_slowness: {
				base_value: 0.800
			},
			speed1_gamma: {
				base_value: 2.870
			},
			speed2_gamma: {
				base_value: 4.000
			},
			offset_by_random: {
				base_value: 0.000
			},
			offset_by_speed: {
				base_value: 0.000
			},
			offset_by_speed_slowness: {
				base_value: 1.000
			},
			slow_tracking: {
				base_value: 0.650
			},
			slow_tracking_per_dab: {
				base_value: 0.800
			},
			tracking_noise: {
				base_value: 0.000
			},
			color_h: {
				base_value: 0.000
			},
			color_s: {
				base_value: 0.000
			},
			color_v: {
				base_value: 0.000
			},
			change_color_h: {
				base_value: 0.000
			},
			change_color_l: {
				base_value: 0.000
			},
			change_color_hsl_s: {
				base_value: 0.000
			},
			change_color_v: {
				base_value: 0.000
			},
			change_color_hsv_s: {
				base_value: 0.000
			},
			smudge: {
				base_value: 0.000
			},
			smudge_length: {
				base_value: 0.500
			},
			smudge_radius_log: {
				base_value: 0.000
			},
			eraser: {
				base_value: 0.000
			},
			stroke_threshold: {
				base_value: 0.000
			},
			stroke_duration_logarithmic: {
				base_value: 4.000
			},
			stroke_holdtime: {
				base_value: 0.000
			},
			custom_input: {
				base_value: 0.000
			},
			custom_input_slowness: {
				base_value: 0.000
			},
			elliptical_dab_ratio: {
				base_value: 1
			}, //1 for circle
			elliptical_dab_angle: {
				base_value: 90
			}, //90 for circle
			direction_filter: {
				base_value: 2.000
			},
			version: {
				base_value: 2.000
			}
		};

		//initalize globals
		this.width = 400;
		this.height = 400;

		this.byteSize = this.height * this.width * 4;

		//variables
		this.clicked = false;
		this.points = [];

		this.brushColor = [0, 0, 0, 0];

		this.scaleConstant = 1.0;

		this.sizeConstant = 100

		this.lastPosX = -1;
		this.lastPosY = -1;

		this.moveMode = false;

		//undo/redo subsystem
		this.currentActionPath = [];
		this.actionQueue = [];
		this.redoActionQueue = [];

		this.undoStride = 10; //number of times we will record stroke before grabbing a snapshot
		this.maxUndoHistory = 50;

		//track save status
		this.edited = false;

		//create draw area
		this.windowShim = shim;
		shim.setAttribute('style', FastPaintCore.windowShimStyle2);

		this.drawArea = document.createElement('div');
		this.drawArea.setAttribute('style', FastPaintCore.windowShimStyle);
		this.drawArea.style.width = `${this.width}px`;
		this.drawArea.style.height = `${this.height}px`;

		//create canvas
		this.canvas = document.createElement('canvas');
		this.canvas.setAttribute('style', FastPaintCore.canvasStyle);
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.drawArea.appendChild(this.canvas);
		shim.appendChild(this.drawArea);

		//bind canvas
		this.rect = this.canvas.getBoundingClientRect();
		this.ctx = this.canvas.getContext('2d');

		//create input surface
		this.inputSurface = document.createElement('canvas');
		this.inputSurface.setAttribute('style', FastPaintCore.inputSurfaceStyle);
		this.inputSurface.width = this.width;
		this.inputSurface.height = this.height;
		this.drawArea.appendChild(this.inputSurface);

		//bind controls for zooming, etc
		this.inputSurface.addEventListener('mousemove', this.drawOnCanvas.bind(this));
		this.inputSurface.addEventListener('touchmove', this.drawOnCanvas.bind(this));

		this.inputSurface.addEventListener('mouseup', this.handleMouseUp.bind(this));
		this.inputSurface.addEventListener('touchend', this.handleMouseUp.bind(this));

		this.inputSurface.addEventListener('mousedown', this.handleMouseDown.bind(this));
		this.inputSurface.addEventListener('touchstart', this.handleMouseDown.bind(this));


		this.inputSurface.addEventListener('mouseleave', this.handlePathEnd.bind(this));

		//recalculate bounds on scroll
		this.windowShim.addEventListener('scroll', this.updateBoundingRectAndCursor.bind(this));

		//shortcur
		document.addEventListener('keydown', this.handleShortcut.bind(this));

		//resiz
		window.addEventListener('resize', this.updateBoundingRect.bind(this));

		//NEW support
		this.brush = new MypaintBrush(this.pen)
		this.surface = new MypaintSurface(this.canvas);

		//layer 
		this.layers = []
		this.layers.push({
			surface: this.surface,
			domRef: this.canvas,
			status: FastPaintCore.layerShown,
			history: [],
			snapshots: [],
			strokes: 0
		})
		this.currentLayer = this.layers[0]
		this.currentLayerIndex = 0

		//draw white base
		this.ctx.fillStyle = 'rgba(255,255,255,255)';
		this.ctx.fillRect(0, 0, this.width, this.height);

		//todo: initialize surface 10x times for each layer...
	}

	//external function binds below this line - call these from GUI
	//will need to switch it up to the chisel brush here
	setToolShape(tool) {
		var elliptical_dab_ratio
		var elliptical_dab_angle

		switch (tool) {
			case FastPaintCore.brushToolCircle:
				elliptical_dab_angle = 90
				elliptical_dab_ratio = 1
				break;
			case FastPaintCore.brushToolSquare:
				elliptical_dab_angle = 45.920
				elliptical_dab_ratio = 5.460
				break;
		}

		var bs = this.pen
		bs.elliptical_dab_angle.base_value = elliptical_dab_angle
		bs.elliptical_dab_ratio.base_value = elliptical_dab_ratio
		this.brush.readmyb_json(bs);

	}

	//called into when switching between tools
	//here is where we change the brush type
	setToolMode(mode) {
		this.brushMode = mode;
		switch (mode) {
			case FastPaintCore.brushModeErase:
				this.moveMode = false;
				this.setEraseMode(true)

				this.brushEraseMode = 1;

				break;
			case FastPaintCore.brushModeDraw:
				this.moveMode = false;
				this.setEraseMode(false)

				break;
			case FastPaintCore.brushModeMove:
				this.moveMode = true;

				break;
		}
	}

	setEraseMode(erase) {
		let eraseValue = 0.00;
		if (erase) {
			eraseValue = 1.00
		}

		var bs = this.pen
		bs.eraser.base_value = eraseValue
		this.brush.readmyb_json(bs);
	}

	//sets brush radius
	setToolSize(radius) {
		radius = radius / 10
		var bs = this.pen

		bs.radius_logarithmic.base_value = radius

		bs.hardness.base_value = radius - 0.25
		bs.smudge_length.base_value = radius / 4
		bs.dabs_per_actual_radius.base_value = (radius * 10) / 2
		this.brush.readmyb_json(bs);
	}

	//sets brush color
	setToolColor(red, green, blue) {
		let color = new ColorRGB(red / 255, green / 255, blue / 255)
		color.rgb_to_hsv_float()

		console.log(color)
		console.log(red)

		var bs = this.pen
		bs.color_h.base_value = color.h
		bs.color_s.base_value = color.s
		bs.color_v.base_value = color.v
		this.brush.readmyb_json(bs);
	}

	//sets brush alpha transparency
	setAlpha(alpha) {
		alpha = alpha / 100
		var bs = this.pen
		bs.opaque.base_value = alpha
		//bs.opaque_linearize.base_value = alpha
		this.brush.readmyb_json(bs);
	}

	//adds layer to canvas
	addLayer() {
		//add layer to top of DOM stack
		let canvas = document.createElement('canvas');
		canvas.setAttribute('style', FastPaintCore.canvasStyle);
		canvas.width = this.width;
		canvas.height = this.height;

		this.drawArea.appendChild(canvas);

		//add layer to controller
		let surface = new MypaintSurface(canvas);
		this.layers.push({
			surface: surface,
			domRef: canvas,
			status: FastPaintCore.layerShown,
			history: [],
			snapshots: [],
			strokes: 0
		})
	}

	//get list of all layers, to be displayed by UI
	getLayers() {
		const layerStatus = this.layers

		let layerStatusOut = [];
		for (let i = 0; i < layerStatus.length; i++) {
			layerStatusOut.push({
				'pos': i,
				'status': layerStatus[i].status
			})
		}

		return layerStatusOut;
	}

	//hides layer at index
	hideLayer(layer) {
		//hide layer
		if (this.layers[layer].status == FastPaintCore.layerHidden) {
			this.layers[layer].domRef.style.visibility = "visible";
			this.layers[layer].status = FastPaintCore.layerShown
		} else {
			this.hideLayerCore()
		}

	}

	//handles core hiding layer
	hideLayerCore(layer) {
		this.layers[layer].domRef.style.visibility = "hidden";
		this.layers[layer].status = FastPaintCore.layerHidden
	}

	//set current layer as the active layer
	selectLayer(layer) {
		this.currentLayer = this.layers[layer]
		this.currentLayerIndex = layer
	}

	//gets binary data for a layer at index
	dumpLayer(layer) {
		const dataURL = this.layers[layer].domRef.toDataURL("image/png")

		return {
			data: dataURL,
			status: this.layers[layer].status
		}
	}

	//gets binary data for all layers
	dumpAllLayers() {
		let exportLayers = []

		for (let i = 0; i < this.layers.length; i++) {
			exportLayers.push(this.dumpLayer(i))
		}

		return exportLayers
	}

	//imports binary data for all layers
	importAllLayers(obj) {
		this.layers = []

		for (let i = 0; i < obj.length; i++) {
			//create layer
			this.addLayer()

			this.importLayerCore(i, obj)
		}

		this.currentLayer = this.layers[0]
		this.currentLayerIndex = 0
	}

	//imports data to a specific layer
	importLayer(pos, obj) {
		if (this.layers.length < pos) {
			this.addLayer()
		}

		this.importLayerCore(pos, obj[pos])
	}

	//core layer importer. called by inportlayer and undo
	async importLayerCore(i, obj) {
		return new Promise(resolve => {
			//metadata
			this.layers[i].status = obj.status
			if (this.layers[i].status == FastPaintCore.layerHidden) {
				this.hideLayerCore(i)
			}

			//load actual image
			let ctx = this.layers[i].domRef.getContext('2d')

			let im = new Image()
			im.src = obj.data
			im.onload = function() {
				ctx.drawImage(this, 0, 0)
				resolve()
			}
		})
	}

	//export entire canvas as data url. Used for exporting the visible canvas area
	exportDataURL() {
		//create virtual canvas
		let target = document.createElement('canvas')
		target.width = this.width;
		target.height = this.height;
		let tCtx = target.getContext('2d')


		//merge from bottom to top
		for (let i = 0; i < this.layers.length; i++) {
			let layer = this.layers[i]

			if (layer.status == FastPaintCore.layerShown) {
				tCtx.drawImage(layer.domRef, 0, 0)
			}
		}

		//export url as canvas
		const dataURL = target.toDataURL("image/png");
		return dataURL;
	}

	//saves visible canvas export to file
	export () {
		const dataURL = this.exportDataURL()
		const a = document.createElement('a');
		a.href = dataURL;
		a.download = "hello.png";
		a.click();
	}

	//handles mouse down/start path logic
	handleMouseDown(e) {
		let x = (event.clientX - this.rect.left) / this.scaleConstant;
		let y = (event.clientY - this.rect.top) / this.scaleConstant;

		this.sourceX = e.clientX;
		this.sourceY = e.clientY;
		this.sourceLeft = this.drawArea.scrollLeft;
		this.sourceTop = this.drawArea.scrollTop;

		this.clicked = true;

		if (e.touches) {
			x = (e.touches[0].clientX - this.rect.left) / this.scaleConstant;
			y = (e.touches[0].clientY - this.rect.top) / this.scaleConstant;
			this.sourceX = e.touches[0].clientX;
			this.sourceY = e.touches[0].clientY;
		}

		if (!this.moveMode) {
			//grab layer snapshot for undo buffer, if we need one
			this.startPathEvent()

			//old undo code might work the same?? idk
			this.startStroke(x, y)
			//TODO: emulate first click here
			this.drawOnCanvas(e)

			this.currentActionPath.push([x, y]);

			this.currentLayer.strokes--;
		}
	}

	//core bridge to brush library, used to stard stroke
	startStroke(x, y) {
		this.t1 = (new Date()).getTime();
		this.brush.new_stroke(this.currentLayer.surface, x, y);
	}

	//logs path start to snapshot queue, if we need to
	startPathEvent() {
		this.redoActionQueue = [];

		if ((this.currentLayer.strokes % this.undoStride) == 0) {
			this.currentLayer.snapshots.push({
				'data': this.dumpLayer(this.currentLayerIndex),
				'stackState': this.actionQueue.length
			});

		}
	}

	//handles all mouse up actions
	handleMouseUp() {
		this.pathEndDriver();
	}

	//ends drawing path
	pathEndDriver() {
		if (!this.moveMode) {
			//this.instance.exports.endPath();
			this.edited = true;

			this.endPathEvent()

			this.currentActionPath = [];
		}

		this.clicked = false;
	}

	//manages history queue for end of path drawing 
	endPathEvent() {
		if (this.currentActionPath.length > 0) {
			const actionHistoryItem = {
				'path': this.currentActionPath,
				'type': 'draw',
				'brushStatus': this.getTool(), //will need to improve this,
				'layer': this.currentLayerIndex
			}

			//add action here. Cut at some length because of limited memory...
			if (this.actionQueue.length < this.maxUndoHistory) {
				this.actionQueue.push(actionHistoryItem);
			}
		}
	}

	//exports JSON brush
	//todo: figure out how to compress this a little better to only reflect current changes
	getTool() {
		return {
			...this.pen
		}
	}

	//switches to JSON brush
	setTool(tool) {
		this.brush.readmyb_json(tool);
	}

	//core handler that takes in mouse events during drawing
	drawOnCanvas(event) {
		let x = (event.clientX - this.rect.left) / this.scaleConstant;
		let y = (event.clientY - this.rect.top) / this.scaleConstant;

		if (event.touches) {
			x = (event.touches[0].clientX - this.rect.left) / this.scaleConstant;
			y = (event.touches[0].clientY - this.rect.top) / this.scaleConstant;
		}

		this.drawOnCanvasDriver(x, y);
	}

	//handles drawing a path from user input
	drawOnCanvasDriver(x, y) {
		this.lastPosX = x;
		this.lastPosY = y;

		if (this.currentLayer.status == FastPaintCore.layerHidden) {
			console.log('oops')
			return;
		}

		if (!this.moveMode) {
			let willBlendLayers = 0;
			if (!this.clicked) {
				willBlendLayers = 1;
			}

			if (this.clicked) {
				this.points.push([x, y]);

				if (this.points.length > 1) { //flosting avg
					var ax = 0;
					var ay = 0;
					for (let i = 0; i < this.points.length; i++) {
						ax += this.points[i][0];
						ay += this.points[i][1];
					}
					ax /= this.points.length;
					ay /= this.points.length;

					//add to path core
					this.addStroke(x, y);

					this.points = [];
				}

				this.currentActionPath.push([x, y]);
			}
		} else {
			if (this.clicked) {
				this.drawArea.scroll(this.sourceLeft - (event.clientX - this.sourceX), this.sourceTop - (event.clientY - this.sourceY))
			}
		}
	}

	//core function to draw line to a point
	addStroke(x, y) {
		this.brush.stroke_to(this.currentLayer.surface, x, y, 1.0, 90, 0, ((new Date()).getTime() - this.t1) / 1000);
	}

	//called when path ends 
	handlePathEnd(e) {
		this.pathEndDriver()
	}

	//handles zoom in/zoom out keyboard shortcuts
	handleShortcut(e) {
		if (e.keyCode == 187 && e.shiftKey) {
			this.zoomIn(true);
		}
		if (e.keyCode == 189 && e.shiftKey) {
			this.zoomOut(true);
		}
	}

	//handles call to zoom in on canvas from ui
	zoomIn(scrollAboutCursor) {
		this.scaleConstant += 0.1;
		this.drawArea.style.transform = `scale(${this.scaleConstant})`;

		this.sizeConstant += 100
		//this.drawArea.style.padding = `${this.sizeConstant}px`;

		if (scrollAboutCursor) {
			//this.windowShim.scroll(this.sizeConstant + (this.lastPosX - this.width), this.sizeConstant + (this.lastPosY - this.height));
			this.windowShim.scroll(this.sizeConstant, this.sizeConstant)
		} else {
			//this.windowShim.scroll(this.sizeConstant, this.sizeConstant);
		}

		this.updateBoundingRect()
	}

	//handles call to zoom out on canvas from ui
	zoomOut(scrollAboutCursor) {
		this.scaleConstant -= 0.1;
		this.drawArea.style.transform = `scale(${this.scaleConstant})`;

		this.sizeConstant -= 100
		//this.drawArea.style.padding = `${this.sizeConstant}px`;

		if (scrollAboutCursor) {
			//this.windowShim.scroll(this.sizeConstant - (this.lastPosX - 250), this.sizeConstant - (this.lastPosY - 250));
			this.windowShim.scroll(this.sizeConstant, this.sizeConstant)
		} else {
			//this.windowShim.scroll(this.sizeConstant, this.sizeConstant)
		}

		this.updateBoundingRect();
	}

	//handles call from undo in UI
	async undoAction() {
		//start with last stack image
		if (this.actionQueue.length == 0) {
			return;
		}

		//get layer we are drawing on to go back to it
		//const currentSelectedLayer = this.instance.exports.getCurrentLayer();
		const currentTools = this.getTool();
		const currentLayer = this.currentLayerIndex;

		//target layer for undo
		const layer = this.actionQueue[this.actionQueue.length - 1].layer;

		//clear selected layer
		this.clearLayer(layer);

		//get last relevant snapshot and restore to there
		const nextSnapshot = this.currentLayer.snapshots[this.currentLayer.snapshots.length - 1].data

		//NEED to wait for this to complete before the next steps
		await this.importLayerCore(layer, nextSnapshot);

		//reduce stroke count for this layer by 1
		this.currentLayer.strokes--;

		//add action to redo queue
		this.redoActionQueue.push(this.actionQueue.pop());

		//figure out where in action stack to start to replicate (from last snapshot -> end)
		const aqStart = this.currentLayer.snapshots[this.currentLayer.snapshots.length - 1].stackState;
		const aqEnd = this.actionQueue.length - 1;

		for (let i = aqStart; i <= aqEnd; i++) {
			const action = this.actionQueue[i];

			if (action.layer == layer) {
				this.actionReplay(action);
			}
		}

		//if we need to, pop last snapshot off the stack so we can go back to the last one
		if (this.currentLayer.strokes % this.undoStride == 0 && this.currentLayer.snapshots.length > 1) {
			this.currentLayer.snapshots.pop();
		}

		//restore old layer
		this.selectLayer(currentLayer);
		this.setTool(currentTools)

		//restore old tools
	}

	//handles call to redo from UI
	redoAction() {
		if (this.redoActionQueue.length == 0) {
			return;
		}

		//get last selected layer for restore
		const currentSelectedLayer = this.currentLayerIndex
		const currentTools = this.getTool();

		const action = this.redoActionQueue.pop()
		this.actionQueue.push(action);

		this.currentLayer.strokes++;

		//if we are on current layer, undo starting here
		this.actionReplay(action);

		//restore old layer
		this.selectLayer(currentSelectedLayer);

		//restore old tools
		this.setTool(currentTools)
	}

	//executes action stored in an action struct
	actionReplay(action) {
		if (action.type == 'draw') {
			//adjust settings
			this.setTool(action.brushStatus);
			this.selectLayer(action.layer)

			//redraw path
			const myPath = action.path;
			this.startStroke(myPath[0][0], myPath[0][1]);
			for (let j = 1; j < myPath.length; j++) {
				this.addStroke(myPath[j][0], myPath[j][1]);
			}
		}
	}

	//helpers below this line
	updateBoundingRect() {
		this.rect = this.canvas.getBoundingClientRect();
	}

	updateBoundingRectAndCursor(event) {
		this.updateBoundingRect();
	}

	clearLayer(layer) {
		this.layers[layer].domRef.getContext('2d').clearRect(0, 0, this.width, this.height)
	}

	clearDOM() {
		this.drawArea.remove()
	}
}

/*
undo/redo testing (should be done)
smooth zoom 
tools aren't reactive during undo?

future: need to remember settings - tools and selected layer
*/