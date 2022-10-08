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
    //element bindings--------------------------------------------

    //canvas binds

    constructor(shim, guide) {
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

        //sloppy asf but what can you do
        //need to keep track of strokes/layer somehow
        this.snapshotQueue = [
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ];
        this.snapshotStrokeCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        this.undoStride = 10; //number of times we will record stroke before grabbing a snapshot
        this.maxUndoHistory = 50;

        //track save status
        this.edited = false;

        //create draw area
        this.windowShim = shim;
        shim.setAttribute('style', FastPaintCore.windowShimStyle2);

        this.drawArea = document.createElement('div');
        this.drawArea.setAttribute('style', FastPaintCore.windowShimStyle);


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

        //bind controls for zooming, etc
        this.canvas.addEventListener('mousemove', this.drawOnCanvas.bind(this));
        this.canvas.addEventListener('touchmove', this.drawOnCanvas.bind(this));

        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('touchend', this.handleMouseUp.bind(this));

        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('touchstart', this.handleMouseDown.bind(this));


        this.canvas.addEventListener('mouseleave', this.handlePathEnd.bind(this));

        this.canvas.addEventListener('wheel', this.handleMouseZoom.bind(this));

        //shortcur
        document.addEventListener('keydown', this.handleShortcut.bind(this));

        //resiz
        window.addEventListener('resize', this.updateBoundingRect.bind(this));

        //guide specifc code lives here
        this.guide = document.getElementById(guide)
        this.guideCtx = this.guide.getContext('2d')
        let guideWidth = ((this.width / this.height) * this.guide.offsetWidth)
        this.guide.style.height = guideWidth + "px"
        this.guide.width = this.width
        this.guide.height = this.height

        //attach listeners to guide
        /*
        this.guide.addEventListener('mousedown', this.guideMouseDown.bind(this))
        this.guide.addEventListener('mousemove', this.guideMouseMode.bind(this))
        this.guide.addEventListener('mouseup', this.guideMouseUp.bind(this))
        this.guide.addEventListener('mouseleave', this.guideMouseLeave.bind(this))
        */

        //now, center canvas
        this.setPosition(this.canvas, (this.windowShim.offsetWidth / 2) - (this.canvas.offsetWidth / 2), (this.windowShim.offsetHeight / 2) - (this.canvas.offsetHeight / 2))
        this.updateBoundingRect()

        this.guideBounds = []

    }

    guideMouseDown(event){
    	this.guideClicked = true;
    	this.posX = event.offsetX;
        this.posY = event.offsetY;
    }

    guideMouseUp(event){
    	this.guideClicked = false;
    }

    guideMouseMode(event){
    	 if (this.guideClicked) {
                this.canvasMoveDriver(event, this.guide, true)
            }
    }

    guideMouseLeave(event){
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
        let resp = await fetch("buffer.wasm");
        let bytes = await resp.arrayBuffer();

        const lI = await WebAssembly.instantiate(bytes, {
            env: { memory }
        });
        this.instance = lI.instance;
        this.memory = memory;

        //allocate canvas and init
        this.pointer = this.instance.exports.allocate(this.width, this.height);
        this.instance.exports.initSystem();

        this.configTools(configObject)

        this.updateCanvas(false);
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
        this.instance.exports.addLayer();
        this.updateCanvas(false);
    }

    getLayers() {
        const layerArrayAddress = this.instance.exports.layerArrayAddress();
        const layerStatus = new Uint8Array(this.memory.buffer, layerArrayAddress, 10);

        let layerStatusOut = [];
        for (let i = 1; i < layerStatus.length; i++) {
            if (layerStatus[i] != 0) {
                layerStatusOut.push({ 'pos': i, 'status': layerStatus[i] })
            }
        }

        return layerStatusOut;
    }

    hideLayer(layer) {
        this.instance.exports.toggleLayerVisibility(layer);
        this.updateCanvas(false);
    }

    selectLayer(layer) {
        this.instance.exports.selectActiveLayer(layer);
        this.updateCanvas(true);
    }

    exportLayer(layer) {
        const layerAddress = this.instance.exports.getLayer(layer);
        const layerData = new Uint8Array(this.memory.buffer, layerAddress, this.byteSize);

        return layerData;
    }

    importLayer(layer, status, data) {
        const layerAddress = this.instance.exports.getLayer(layer);
        const localData = new Uint8Array(this.memory.buffer, layerAddress, this.byteSize);
        localData.set(data);

        this.instance.exports.allocateSavedLayer(localData.byteOffset, layer, status); //data, layer, status
    }

    exportDataURL() {
        const dataURL = this.canvas.toDataURL("image/png");
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
        //allow dynamic height
        this.edited = false;

        this.width = width;
        this.height = height;

        this.byteSize = this.height * this.width * 4;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.updateBoundingRect();

        //free old memory
        this.instance.exports.dealloc();

        this.pointer = this.instance.exports.allocate(this.width, this.height); //should normally be width, height but...
        this.instance.exports.initSystem();

        this.configTools(configObject);

        this.updateCanvas(false);

        //clear history objects
        this.snapshotQueue = [
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ];
        this.currentActionPath = [];
        this.actionQueue = [];
        this.redoActionQueue = [];
        this.snapshotStrokeCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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

            //grab layer snapshot for undo buffer, if we need one
            this.redoActionQueue = [];
            const currentLayer = this.instance.exports.getCurrentLayer();
            if ((this.snapshotStrokeCount[currentLayer] % this.undoStride) == 0) {
                this.snapshotQueue[currentLayer].push({
                    'data': new Uint8Array(this.exportLayer(currentLayer)),
                    'stackState': this.actionQueue.length
                });

            }

            this.instance.exports.startPath(x, y);
            this.updateCanvas(false);
            this.currentActionPath.push([x, y]);

            this.snapshotStrokeCount[currentLayer]++;
        } else {
            this.posX = e.offsetX;
            this.posY = e.offsetY;
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
                    'path': this.currentActionPath,
                    'type': 'draw',
                    'brushStatus': this.getTools(),
                    'layer': this.instance.exports.getCurrentLayer()
                }

                //add action here. Cut at some length because of limited memory...
                if (this.actionQueue.length < this.maxUndoHistory) {
                    this.actionQueue.push(actionHistoryItem);
                }
            }

            this.currentActionPath = [];
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
        let rect = target.getBoundingClientRect()
        let offsetX = event.clientX - rect.left;
        let offsetY = event.clientY - rect.top;

        if (invertAxis) {
            this.setPosition(this.canvas, (this.posX - offsetX), (this.posY - offsetY))
        } else {
            this.setPosition(this.canvas, (offsetX - this.posX), (offsetY - this.posY))
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
        this.canvas.style.transform = `scale(${this.scaleConstant})`

        this.updateBoundingRect()
        this.updateGuide()
    }

    zoomOut() {

        if (this.scaleConstant > 0) {
            this.scaleConstant -= 0.02
        }
        this.canvas.style.transform = `scale(${this.scaleConstant})`

        this.updateBoundingRect();
        this.updateGuide()
    }

    //undo/redo lives here
    undoAction() {
        //start with last stack image
        if (this.actionQueue.length == 0) {
            return;
        }

        //get layer we are drawing on to go back to it
        const currentSelectedLayer = this.instance.exports.getCurrentLayer();
        const currentTools = this.getTools();

        //target layer for undo
        const layer = this.actionQueue[this.actionQueue.length - 1].layer;

        //clear selected layer
        this.instance.exports.clearLayer(layer);

        //get last relevant snapshot and restore to there
        const nextSnapshot = this.snapshotQueue[layer][this.snapshotQueue[layer].length - 1].data;
        this.importLayer(layer, 2, nextSnapshot);

        //reduce stroke count for this layer by 1
        this.snapshotStrokeCount[layer]--;

        //add action to redo queue
        this.redoActionQueue.push(this.actionQueue.pop());

        //figure out where in action stack to start to replicate (from last snapshot -> end)
        const aqStart = this.snapshotQueue[layer][this.snapshotQueue[layer].length - 1].stackState;
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
        if (this.snapshotStrokeCount[layer] % this.undoStride == 0 && this.snapshotQueue[layer].length > 1) {
            this.snapshotQueue[layer].pop();
        }

        //restore old layer
        this.selectLayer(currentSelectedLayer);
        this.configTools(currentTools)

        //restore old tools
    }

    redoAction() {
        if (redoActionQueue.length == 0) {
            return;
        }

        //get last selected layer for restore
        const currentSelectedLayer = this.instance.exports.getCurrentLayer();
        const currentTools = this.getTools();

        const action = this.redoActionQueue.pop()
        this.actionQueue.push(action);

        this.snapshotStrokeCount[action.layer]++;

        //if we are on current layer, undo starting here
        this.actionReplay(action);

        this.updateCanvas(false);

        //restore old layer
        this.selectLayer(currentSelectedLayer);

        //restore old tools
        this.configTools(currentTools)
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
        if (!skipBlend) {
            this.instance.exports.blendLayers();
        }

        const usub = new Uint8ClampedArray(this.memory.buffer, this.pointer, this.byteSize);
        this.img = new ImageData(usub, this.width, this.height);
        this.ctx.putImageData(this.img, 0, 0);
        this.updateGuideImage()
        this.drawGuideBounds()
    }

    updateGuideImage() {
        this.guideCtx.putImageData(this.img, 0, 0)
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


}