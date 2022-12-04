export class FastPaintCore {
    //exportable consts

    static get brushModeErase() { return 0; }
    static get brushModeDraw() { return 1; }
    static get brushModeMove() { return 2; }

    static get brushToolCircle() { return 0; }
    static get brushToolSquare() { return 1; }

    //global variables--------------------------------------------

    //consts

    static canvasStyle = `
		border: 1px solid black;
        image-rendering:  pixelated;
  		position: absolute;
	`;

    static drawAreaStyle = `
		background-color: gray;
        overflow: scroll;
        width:  80%;
        height:  100vh;
        float:  left;
	`;

    static windowShimStyle = `
		width: 100%;
		height: 100%;
		overflow: hidden;
		background-color: gray;

		position: relative;
	`;

    static windowShimStyle2 = `
		background-color: gray;
    	overflow: auto;
	`;

    static canvasParentStyle = `
		position: absolute;
		width: 400px;
		height: 400px;

	`
    //element bindings--------------------------------------------

    //canvas binds

    constructor(shim, guide) {
        this.undoStride = 10; //number of times we will record stroke before grabbing a snapshot
        this.maxUndoHistory = 50;

        //create draw area
        this.windowShim = shim;
        shim.setAttribute('style', FastPaintCore.windowShimStyle2);

        this.drawArea = document.createElement('div');
        this.drawArea.setAttribute('style', FastPaintCore.windowShimStyle);

        //can undo later.... just append diretly to drawArea
        this.canvasParent = document.createElement('div');
        this.canvasParent.setAttribute('style', FastPaintCore.canvasParentStyle);
        this.drawArea.appendChild(this.canvasParent);
        shim.appendChild(this.drawArea);

        //shortcur
        document.addEventListener('keydown', this.handleShortcut.bind(this));

        //resiz
        window.addEventListener('resize', this.handleResize.bind(this));

        //guide specifc code lives here
        this.guide = document.getElementById(guide);
        this.guideCtx = this.guide.getContext('2d');

        //attach listeners to guide
        /*
        this.guide.addEventListener('mousedown', this.guideMouseDown.bind(this))
        this.guide.addEventListener('mousemove', this.guideMouseMode.bind(this))
        this.guide.addEventListener('mouseup', this.guideMouseUp.bind(this))
        this.guide.addEventListener('mouseleave', this.guideMouseLeave.bind(this))
        */
    }

    setupArea(width, height) {
        //initalize globals
        this.width = width;
        this.height = height;

        this.byteSize = this.height * this.width * 4;

        //variables
        this.clicked = false;
        this.points = [];

        this.brushColor = [0, 0, 0, 0];

        this.scaleConstant = 1.0;

        this.lastPosX = -1;
        this.lastPosY = -1;
        this.lastPosXUt = -1;
        this.lastPosYUt = -1;

        this.moveMode = false;

        this.edited = false;

        //global undo/redo subsystem. All layer-related metadata is stored on the layer object
        this.currentActionPath = [];
        this.actionQueue = [];
        this.redoActionQueue = [];

        //layer status
        this.currentLayer = 0;
        this.layers = []

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('style', FastPaintCore.canvasStyle);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.zIndex = 100;

        //can undo later.... just append diretly to drawArea
        this.canvasParent.appendChild(this.canvas);

        //bind canvas
        this.rect = this.canvas.getBoundingClientRect();
        this.ctx = this.canvas.getContext('2d');

        //bind controls for zooming, etc
        this.canvas.addEventListener('mousemove', this.drawOnCanvas.bind(this));
        this.canvas.addEventListener('touchmove', this.drawOnCanvas.bind(this));

        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('touchend', this.handleMouseUp.bind(this));

        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('touchstart', this.handleMouseDown.bind(this));

        this.canvas.addEventListener('mouseleave', this.handlePathEnd.bind(this));

        this.canvas.addEventListener('wheel', this.handleMouseZoom.bind(this));

        //now, center canvas
        this.updateCanvasPosition()
        this.updateBoundingRect()

        this.guideWidth = ((this.width / this.height) * this.guide.offsetWidth)
        this.guide.style.height = this.guideWidth + "px"
        this.guide.width = this.width
        this.guide.height = this.height

        this.guideBounds = []
    }

    async setupDraw(width, height, drawConfigObject){
    	this.setupArea(width, height)
    	this.addLayerCore()
    	await this.init(drawConfigObject)
    }

    newCanvas(width, height, drawConfigObject){
    	this.freeState(width, height, drawConfigObject)
    	this.addLayer()
    	this.fillLayer(255, 255, 255, 255);
    	this.updateCanvas(false);
    }

    handleResize() {
        this.updateCanvasPosition()
        this.updateBoundingRect()
    }

    updateCanvasPosition() {
        this.setPosition(this.canvasParent, (this.windowShim.offsetWidth / 2) - (this.canvas.offsetWidth / 2), (this.windowShim.offsetHeight / 2) - (this.canvas.offsetHeight / 2));
    }

    guideMouseDown(event) {
        this.guideClicked = true;
        this.posX = event.offsetX;
        this.posY = event.offsetY;
    }

    guideMouseUp(event) {
        this.guideClicked = false;
    }

    guideMouseMode(event) {
        if (this.guideClicked) {
        	
            this.canvasMoveDriver(event, this.guide, true)
        }
    }

    guideMouseLeave(event) {
        this.guideClicked = false
    }

    setPosition(element, x, y) {
        element.style.left = x + "px";
        element.style.top = y + "px";

        element.x = x
        element.y = y
    }

    async init(configObject) {
        //init system
        const b2p = function bytesToPages(bytes) { return Math.ceil(bytes / 64_000); }
        const memory = new WebAssembly.Memory({ initial: 2000 });
        let resp = await fetch("nl.wasm");
        let bytes = await resp.arrayBuffer();

        const lI = await WebAssembly.instantiate(bytes, {
            env: { memory }
        });
        this.instance = lI.instance;
        this.memory = memory;

        //allocate canvas and init
        this.pointer = this.instance.exports.allocate(this.width, this.height);
        this.instance.exports.initSystem();
        this.overlayPointer = this.instance.exports.getOverlayRef()

        this.configTools(configObject)
        this.fillLayer(255, 255, 255, 255);

        this.updateCanvas(false);
    }

    fillLayer(red, green, blue, alpha) {
        this.instance.exports.fillLayer(red, green, blue, alpha);
    }

    configTools(configObject) {
        this.brushTool = configObject.shape;
        this.brushAlpha = configObject.color[3];
        this.brushRadius = configObject.size;

        //todo: color
        this.setToolColor(configObject.color[0], configObject.color[1], configObject.color[2])
        this.setAlpha(configObject.color[3]);
        this.setToolMode(configObject.mode);
        this.updateTool();
    }

    //external function binds below this line - call these from GUI
    setToolShape(tool) {
        this.brushTool = tool;
        this.updateTool();
    }

    setToolMode(mode) {
        this.brushMode = mode;
        switch (mode) {
            case FastPaintCore.brushModeErase:
                this.moveMode = false;
                this.brushEraseMode = 1;
                this.updateTool();
                break;
            case FastPaintCore.brushModeDraw:
                this.moveMode = false;
                this.brushEraseMode = 0;
                this.updateTool();
                break;
            case FastPaintCore.brushModeMove:
                this.moveMode = true;
                break;
        }
    }

    setToolSize(radius) {
        this.brushRadius = radius;
        this.updateTool();
    }

    setToolColor(red, green, blue) {
        this.brushColor[0] = red;
        this.brushColor[1] = green;
        this.brushColor[2] = blue;
        this.instance.exports.setColor(red, green, blue);
    }

    setAlpha(alpha) {
        this.brushColor[3] = alpha;
        this.brushAlpha = alpha;
        this.updateTool();
    }

    updateTool() {
        //this is nasty, w/e
        this.instance.exports.setBrushProperties(this.brushRadius, this.brushTool, this.brushAlpha, this.brushEraseMode);
    }

    addLayer() {
        this.addLayerCore()

        const actionHistoryItem = {
        	'type': "addLayer",
        }
        this.actionQueue.push(actionHistoryItem)
    }

    addLayerCore(){
    	let canvas = this.addDOMLayer(this.width, this.height)

        const newLayerName = `layer ${this.layers.length}`
        this.addToLayersObject(true, "", newLayerName, canvas, canvas.getContext('2d'))
    }

    undoAddLayer(){
    	const action = this.actionQueue.pop()

    	this.deleteLayerCore(this.layers.length - 1)

    	this.redoActionQueue.push(action);
    }

    redoAddLayer(){
    	const action = this.redoActionQueue.pop()

    	this.addLayerCore()

    	this.actionQueue.push(action);
    }

    addDOMLayer(width, height, pos) {
        let canvas = document.createElement('canvas');
        canvas.setAttribute('style', FastPaintCore.canvasStyle);
        canvas.width = width;
        canvas.height = height;

        if(pos !== undefined && pos < this.layers.length){
        	//this.canvasParent.insertBefore(canvas, this.layers[pos].domRef)
        }
        else {
        	this.canvasParent.appendChild(canvas);
        }

        return canvas
    }

    addToLayersObject(shown, data, name, domRef, drawCtx, pos) {
    	let newLayer = {
            shown: true,
            data: data,
            name: name,
            domRef: domRef,
            drawCtx: drawCtx,
            history: [],
            snapshots: [],
            strokes: 0
        }

        if(pos !== undefined){
        	this.layers.splice(pos, 0, newLayer)
        }
        else {
        	this.layers.push(newLayer)
        }
        
    }

    getLayers() {
        return this.layers
    }

    getLayer(layer) {
        return this.layers[layer].data
    }

    hideLayer(layer) {
        this.layers[layer].shown = !this.layers[layer].shown

        console.log(layer)

        if (this.layers[layer].shown) {
            this.layers[layer].domRef.style.visibility = "visible"
        } else {
            this.layers[layer].domRef.style.visibility = "hidden"
        }

    }

    /*
	doesn't seem to stop "leak" until the first stroke is done...
    */

    selectLayer(layer) {
        /*

		we need to do two new things here: reset the current layer, and load the old one
        */

        //won't work off the bat
        this.saveCurrentLayer()

        this.instance.exports.clearLayer();

        this.currentLayer = layer

        const newData = this.layers[layer].data
        if (newData != "") {
            this.importLayerFlat(newData)
            this.instance.exports.endPath() //bit of a misnomer. Will copy buffer into blend array
            this.updateCanvas(false)
        }


    }

    saveCurrentLayer() {
        //const usub = new Uint8ClampedArray(this.memory.buffer, this.pointer, this.byteSize);
        const copyDest = this.instance.exports.getLayerRef()
        const oldData = new Uint8ClampedArray(this.memory.buffer, copyDest, this.byteSize);
        this.layers[this.currentLayer].data = new Uint8Array(oldData)
    }

    exportLayer() {
        const layerAddress = this.instance.exports.getLayerRef()
        const layerData = new Uint8ClampedArray(this.memory.buffer, layerAddress, this.byteSize);

        return layerData;
    }

    importLayer(layer, status, data) {
        const layerAddress = this.getLayer(layer);
        const localData = new Uint8ClampedArray(this.memory.buffer, layerAddress, this.byteSize);
        localData.set(data);

        this.instance.exports.allocateSaved(localData.byteOffset); //data, layer, status
    }

    importLayerFlat(data) {
        const copyDest = this.instance.exports.getLayerRef()
        const localData = new Uint8ClampedArray(this.memory.buffer, copyDest, this.byteSize);
        localData.set(data);

        //this.instance.exports.allocateSaved(localData.byteOffset); //data, layer, status
    }

    exportDataURL() {
        //will need to do things a little different
        //create virtual canvas
        let target = document.createElement('canvas')
        target.width = this.width;
        target.height = this.height;
        let tCtx = target.getContext('2d')

        //merge from bottom to top
        for (let i = 0; i < this.layers.length; i++) {
            let layer = this.layers[i]

            if (layer.shown) {
                tCtx.drawImage(layer.domRef, 0, 0)
            }
        }

        //export url as canvas
        const dataURL = target.toDataURL("image/png");
        return dataURL;
    }

    export () {
        const dataURL = canvas.toDataURL("image/png");
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = "hello.png";
        a.click();
    }

    freeState(width, height, configObject) {
        this.canvasParent.innerHTML = ""

        this.setupArea(width, height)

        //free old memory
        this.instance.exports.dealloc();

        this.pointer = this.instance.exports.allocate(this.width, this.height); //should normally be width, height but...
        this.instance.exports.initSystem();
        this.overlayPointer = this.instance.exports.getOverlayRef()

        this.configTools(configObject);
    }

    //event handlers below this line
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

        	if(this.layers.length <= 0){
        		return;
        	}

            //grab layer snapshot for undo buffer, if we need one
            this.redoActionQueue = [];

            if ((this.layers[this.currentLayer].strokes % this.undoStride) == 0) {
                
                this.layers[this.currentLayer].snapshots.push({
                    'data': new Uint8ClampedArray(this.exportLayer()),
                    'stackState': this.actionQueue.length
                });

            }

            this.instance.exports.startPath(x, y);
            this.updateCanvas(false);
            this.currentActionPath.push([x, y]);

            this.layers[this.currentLayer].strokes++;
        } 
        else { //will move canvas
            this.posX = e.offsetX * this.scaleConstant;
            this.posY = e.offsetY * this.scaleConstant;
        }
    }

    handleMouseUp() {
        this.pathEndDriver();
    }

    pathEndDriver() {
        if (!this.moveMode) {
            this.instance.exports.endPath();
            this.updateCanvas(true); //spot fix for now. Need to blend better around cursor
            this.edited = true;

            if (this.currentActionPath.length > 0) {
                const actionHistoryItem = {
                	'type': "paint",
                    'path': this.currentActionPath,
                    'type': 'draw',
                    'brushStatus': this.getTools(),
                    'layer': this.currentLayer
                }

                //add action here. Cut at some length because of limited memory...
                if (this.actionQueue.length < this.maxUndoHistory) {
                    this.actionQueue.push(actionHistoryItem);
                }
            }

            this.currentActionPath = [];

            //update canvas preview
            this.updateGuideImage()
        } else {

        }

        this.clicked = false;
    }

    getTools() {
        return {
            'color': [...this.brushColor],
            'shape': this.brushTool,
            'size': this.brushRadius,
            'mode': this.brushMode
        }
    }

    drawOnCanvas(event) {
        let x = (event.clientX - this.rect.left) / this.scaleConstant;
        let y = (event.clientY - this.rect.top) / this.scaleConstant;

        this.lastPosXUt = event.clientX;
        this.lastPosYUt = event.clientY;

        if (event.touches) {
            x = (event.touches[0].clientX - this.rect.left) / this.scaleConstant;
            y = (event.touches[0].clientY - this.rect.top) / this.scaleConstant;
        }

        this.drawOnCanvasDriver(x, y, event);
    }

    drawOnCanvasDriver(x, y, event) {
        this.lastPosX = x;
        this.lastPosY = y;

        if (!this.moveMode) {
            let willBlendLayers = 0;
            if (!this.clicked) {
                willBlendLayers = 1;
            }

            this.instance.exports.setOverlay(x, y, willBlendLayers);

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

                    this.instance.exports.addPoint(x, y);

                    this.points = [];
                }

                this.currentActionPath.push([x, y]);
            }

            this.updateCanvas(true);
        } else {
            if (this.clicked) {
                this.canvasMoveDriver(event, this.drawArea, false)
            }

        }
    }

    /*
	guide precision issue might be:
	bounding rect gets true size, while posX gets relative to outer
    */

    canvasMoveDriver(event, target, invertAxis) {
        let rect = target.getBoundingClientRect();
        let offsetX = event.clientX - rect.left;
        let offsetY = event.clientY - rect.top;

        if (invertAxis) { //change in position comes from guide
        	offsetX *= (this.width / this.guideWidth) * this.scaleConstant
      		offsetY *= (this.width / this.guideWidth) * this.scaleConstant

      		offsetX -= ((this.width - this.rect.width) / 2)
      		offsetY -= ((this.height - this.rect.height) / 2)

            this.setPosition(this.canvasParent, (this.posX - offsetX) * (this.width / rect.width), (this.posY - offsetY) * (this.height / rect.height))
        } 
        else { // change in position comes from screen
        	offsetX -= ((this.width - this.rect.width) / 2) //diff between new + old
      		offsetY -= ((this.height - this.rect.height) / 2)

            this.setPosition(this.canvasParent, (offsetX - this.posX), (offsetY - this.posY))
        }

        this.updateGuide()
        this.updateBoundingRect()
    }

    setPosition(element, x, y) {
        element.style.left = x + "px";
        element.style.top = y + "px";

        element.x = x
        element.y = y
    }

    updateGuide() {
        //draw window loc w/contents
        let rect = this.canvas.getBoundingClientRect()

        this.updateGuideImage()

        const offTop = 0;
        const offLeft = 0;

        let top = (rect.top - offTop) * (this.height / rect.height) * -1
        let left = (rect.left - offLeft) * (this.height / rect.height) * -1
        let width = (this.drawArea.offsetWidth / rect.width) * this.width
        let height = (this.drawArea.offsetHeight / rect.height) * this.height

        this.guideBounds = [top, left, width, height]

        this.drawGuideBounds()
    }

    handlePathEnd(e) {
        this.pathEndDriver()

        this.instance.exports.clearOverlay();
        this.updateCanvas(false);
    }

    //zoom helpers, for now
    handleShortcut(e) {
        if (e.keyCode == 187 && e.shiftKey) {
            this.zoomIn(true);
        }
        if (e.keyCode == 189 && e.shiftKey) {
            this.zoomOut(true);
        }
    }

    handleMouseZoom(event) {
        if (event.deltaY < 0) {
            this.zoomOut()
        } else {
            this.zoomIn()
        }
    }

    zoomIn() {
        if (this.scaleConstant < 5) {
            this.scaleConstant += 0.02
        }
        this.canvasParent.style.transform = `scale(${this.scaleConstant})`

        this.updateBoundingRect()
        this.updateGuide()

        //retransform
        this.recalcOverlay()
    }

    zoomOut() {

        if (this.scaleConstant > 0) {
            this.scaleConstant -= 0.02
        }
        this.canvasParent.style.transform = `scale(${this.scaleConstant})`

        this.updateBoundingRect();
        this.updateGuide()

        this.recalcOverlay()
    }

    recalcOverlay(){
    	let x = (this.lastPosXUt - this.rect.left) / this.scaleConstant;
        let y = (this.lastPosYUt - this.rect.top) / this.scaleConstant;

        this.instance.exports.setOverlay(x, y, 1);
        this.updateCanvas(true);
    }

    undoPaint(){
    	//start with last stack image
        if (this.actionQueue.length == 0) {
            return;
        }

        //get layer we are drawing on to go back to it
        const currentSelectedLayer = this.currentLayer
        const currentTools = this.getTools();

        //target layer for undo
        const layer = this.actionQueue[this.actionQueue.length - 1].layer;

        //new: swap back to last layer for a moment
        this.selectLayer(layer)

        //clear selected layer
        this.instance.exports.clearLayer(layer);

        //get last relevant snapshot and restore to there
        const nextSnapshot = this.layers[this.currentLayer].snapshots[this.layers[this.currentLayer].snapshots.length - 1].data;
        this.importLayerFlat(nextSnapshot);

        //reduce stroke count for this layer by 1
        this.layers[this.currentLayer].strokes--;

        //add action to redo queue
        this.redoActionQueue.push(this.actionQueue.pop());

        //figure out where in action stack to start to replicate (from last snapshot -> end)
        const aqStart = this.layers[this.currentLayer].snapshots[this.layers[this.currentLayer].snapshots.length - 1].stackState;
        const aqEnd = this.actionQueue.length - 1;

        for (let i = aqStart; i <= aqEnd; i++) {
            const action = this.actionQueue[i];

            if (action.layer == layer) {
                this.actionReplay(action);
            }
        }

        //update canvas
        this.updateCanvas(false);

        //if we need to, pop last snapshot off the stack so we can go back to the last one
        if (this.layers[this.currentLayer].strokes % this.undoStride == 0 && this.layers[this.currentLayer].snapshots.length > 1) {
            this.layers[this.currentLayer].snapshots.pop();
        }

        //restore old layer
        this.selectLayer(currentSelectedLayer);
        this.configTools(currentTools);

        //restore old tools

        //re-draw the layer guide
        this.updateGuideImage()
    }

    redoPaint(){
    	if (this.redoActionQueue.length == 0) {
            return;
        }

        //get last selected layer for restore
        const currentSelectedLayer = this.currentLayer
        const currentTools = this.getTools();

        const action = this.redoActionQueue.pop()
        this.actionQueue.push(action);

        this.layers[this.currentLayer].strokes++;

        //if we are on current layer, undo starting here
        this.actionReplay(action);

        this.updateCanvas(false);

        //restore old layer
        this.selectLayer(currentSelectedLayer);

        //restore old tools
        this.configTools(currentTools)

        //update guide
        this.updateGuideImage()
    }

    //undo/redo actions are routed out here
    undoAction() {
        const action = this.actionQueue[this.actionQueue.length - 1]

        switch (action.type) {
        	case "draw":
        		this.undoPaint();
        	break;
        	case "addLayer":
        		this.undoAddLayer();
        	break;
        	case "reorderLayer":
        		this.undoSwapLayer();
        	break;
        	case "deleteLayer":
        		this.undoDeleteLayer();
        	break;
        	default:
        	this.dlog(`missing undo action ${action.type}`)
        }
    }

    redoAction() {
        const action = this.redoActionQueue[this.redoActionQueue.length - 1]

        switch (action.type) {
        	case "draw":
        		this.redoPaint();
        	break;
        	case "addLayer":
        		this.redoAddLayer();
        	break;
        	case "reorderLayer":
        		this.redoSwapLayer();
        	break;
        	case "deleteLayer":
        		this.redoDeleteLayer();
        	break;
        	default:
        	this.dlog(`missing redo action ${action.type}`)
        }
    }

    //generic helper, will execute action stored in struct
    actionReplay(action) {
        if (action.type == 'draw') {
            //adjust settings
            this.configTools(action.brushStatus);
            this.selectLayer(action.layer)

            //redraw path
            const myPath = action.path;
            this.instance.exports.startPath(myPath[0][0], myPath[0][1]);
            for (let j = 1; j < myPath.length; j++) {
                this.instance.exports.addPoint(myPath[j][0], myPath[j][1]);
            }
            this.instance.exports.endPath();
        }
    }

    //helpers below this line
    updateBoundingRect() {
        this.rect = this.canvas.getBoundingClientRect();
    }

    updateCanvas(skipBlend) {
    	if(this.layers.length <= 0){
    		return;
    	}

        if (!skipBlend) {
            this.instance.exports.blendLayers();
        }

        //draw on canvas layer
        const usub = new Uint8ClampedArray(this.memory.buffer, this.pointer, this.byteSize);
        this.img = new ImageData(usub, this.width, this.height);
        this.layers[this.currentLayer].drawCtx.putImageData(this.img, 0, 0);

        //draw on overlay layer
        const usubOverlay = new Uint8ClampedArray(this.memory.buffer, this.overlayPointer, this.byteSize);
        const overlay = new ImageData(usubOverlay, this.width, this.height);
        this.ctx.putImageData(overlay, 0, 0);

        //too performance intensive to use directly here
        //this.updateGuideImage()
        this.drawGuideBounds()
    }

    updateGuideImage() {
        this.guideCtx.clearRect(0, 0, this.width, this.height)

        for (let i = 0; i < this.layers.length; i++) {
            let layer = this.layers[i]

            if (layer.shown) {
                this.guideCtx.drawImage(layer.domRef, 0, 0)
            }
        }
    }

    drawGuideBounds() {
        const [top, left, width, height] = this.guideBounds

        if (this.guideBounds.length > 0 && width < this.drawArea.offsetWidth && height < this.drawArea.offsetHeight) {
            this.guideCtx.strokeStyle = "black"
            this.guideCtx.strokeRect(left, top, width, height)
        }
    }

    //vestigel code lives here :)

    handleClearLayer() {
        this.instance.exports.clearCurrentLayer();
    }

    //turns canvas into frozen object
    dehydrate(name) {
        this.saveCurrentLayer()
        const content = this.exportDataURL()

        for (let i = 0; i < this.layers.length; i++) {
            delete this.layers[i].domRef;
            delete this.layers[i].drawCtx;
        }

        const saveObject = {
            'name': name,
            'content': content,
            'layers': this.layers,
            'width': this.width,
            'height': this.height,
            'currentLayer': this.currentLayer
        }

        return saveObject
    }

    //will load canvas from memory into workspace
    hydrate(saveObject, drawConfigObject) {
        this.freeState(saveObject.width, saveObject.height, drawConfigObject)
        //copy to object storage first
        this.currentLayer = saveObject.currentLayer;

        //sync to dom nodes
        for (let i = 0; i < saveObject.layers.length; i++) {
            let layer = saveObject.layers[i]
            let canvas = this.addDOMLayer(saveObject.width, saveObject.height);
            this.addToLayersObject(layer.shown, layer.data, layer.name, canvas, canvas.getContext('2d'))
        }

        //paint back layers
        for (let i = 0; i < this.layers.length; i++) {
            let layer = this.layers[i]

            if (layer.shown) {
                let img = new ImageData(new Uint8ClampedArray(layer.data), this.width, this.height);

                layer.drawCtx.putImageData(img, 0, 0);
            }
        }

        //update render from core
        let newData = this.layers[this.currentLayer].data
        this.importLayerFlat(newData)
        this.instance.exports.endPath()
        this.updateCanvas(false)
        //this.selectLayer(this.currentLayer + 1);
        //this.updateCanvas(false);
    }

    undoDisabled(){
    	if (this.actionQueue.length > 0){
    		return false
    	}
    	return true
    }

    redoDisabled() {
    	if(this.redoActionQueue.length > 0){
    		return false
    	}
    	return true
    }

    dlog(text){
    	console.log(text)
    }

    changeLayerName(layer, newName){
    	this.layers[layer].name = newName
    }

    //todo/to implement
    deleteSelectedLayer(){
    	this.deleteLayer(this.currentLayer)
    }

    deleteLayer(layerToRemove){
    	//cache
    	const cachedLayer = this.layers[layerToRemove]

    	const newLayer = this.deleteLayerCore(layerToRemove)

    	//add to history
    	const actionHistoryItem = {
        	'type': "deleteLayer",
            'layer': cachedLayer,
            'index': layerToRemove
        }
        this.actionQueue.push(actionHistoryItem)
    
    	return newLayer
    }

    deleteLayerCore(layerToRemove){
    	let newLayer = -1

    	//reselect next layer (if we can)
    	if(this.layers.length > 1){ //might be glitchy
    		if(layerToRemove == 0){
    			newLayer = 1
    			this.selectLayer(newLayer)
    		} 
    		else {
    			newLayer = layerToRemove - 1
    			this.selectLayer(newLayer)
    		}
    	} 
    	else if(this.layers.length == 1){
    		this.instance.exports.clearLayer();
    	}

    	//remove from DOM
    	this.layers[layerToRemove].domRef.remove()

    	//remove from layers object
    	this.layers.splice(layerToRemove, 1)
    	
    	//rerender guide
    	this.updateGuideImage()
    	
    	return newLayer
    }

    //TODO
    undoDeleteLayer(){
    	const action = this.actionQueue.pop()

    	//add back layer at index
    	let index = action.index
    	let canvas = this.addDOMLayer(this.width, this.height, index)
    	this.addToLayersObject(action.layer.shown, action.layer.data, action.layer.name, canvas, canvas.getContext('2d'));

    	//paint back layer, if we need to
    	if (action.layer.shown) {
            let img = new ImageData(new Uint8ClampedArray(action.layer.data), this.width, this.height);

            this.layers[index].drawCtx.putImageData(img, 0, 0); //might not be the right way to do it
        }

    	//rerender guide
    	this.updateGuideImage()

    	//add action to redo queue
        this.redoActionQueue.push(action);
    }

    redoDeleteLayer(){
    	const action = this.redoActionQueue.pop()

    	//re delete
    	this.deleteLayerCore(action.index)

    	//add action to undo queue
        this.actionQueue.push(action);
    }

    swapLayer(oldPos, newPos){
    	this.swapLayerCore(oldPos, newPos);

    	//log to history
    	const actionHistoryItem = {
        	'type': "reorderLayer",
            'from': oldPos,
            'to': newPos
        }
        this.actionQueue.push(actionHistoryItem)
    }

    swapLayerCore(oldPos, newPos){
    	//rearrange layers data structure (easiest thing)
    	const newLayers = this.layers

	    if(oldPos < newPos){ //push the rest of the layers forward
	      newLayers.splice(newPos + 1, 0, newLayers[oldPos])
	      newLayers.splice(oldPos, 1)
	    }
	    else { //push old layer back
	      newLayers.splice(newPos, 0, newLayers[oldPos])
	      newLayers.splice(oldPos + 1, 1)
	    }

	    this.layers = newLayers

	    //rearrange on DOM
	    for(let i = 0; i < this.layers.length; i++){
	    	this.canvasParent.appendChild(this.layers[i].domRef)
	    }

	    //select new node
        this.currentLayer = newPos

        //swap data back into memory buffer
        const newData = this.layers[newPos].data
        this.importLayerFlat(newData)
        this.instance.exports.endPath() //bit of a misnomer. Will copy buffer into blend array
        this.updateCanvas(false)

	    //rerender guide
    	this.updateGuideImage()

    	//memory for current layer not getting copied to draw buffer/is wiped out
    }

    undoSwapLayer(){
    	const action = this.actionQueue.pop()

    	//un swap
    	this.swapLayerCore(action.to, action.from)

    	//add action to redo queue
        this.redoActionQueue.push(action);
    }

    redoSwapLayer(){
    	const action = this.redoActionQueue.pop()

    	//re swap
    	this.swapLayerCore(action.to, action.from)

    	//add action to undo queue
        this.actionQueue.push(action);
    }

    getSelectedLayer(){
    	return this.currentLayer;
    }

}

/*
bug tracker:
control canvas position from guide
better hex validation in color input
lower key:
logging
clean up appsvelte
clear cursor when moving
white space glitch on top
new canvases don't clear
*/
