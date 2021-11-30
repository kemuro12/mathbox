const resolution = 32;

class App {
	constructor(core){
		this.core = core;
		this.view = core.view;
		this.domain = core.domain;
		this.domainColors = core.domainColors;
		this.graphs = [];
	}

	savePNG(){
		let downloadLink = document.createElement('a');
		downloadLink.setAttribute('download', 'graph.png');
		let canvas = document.querySelector('canvas');
		let dataURL = canvas.toDataURL('image/png');
		let url = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
		downloadLink.setAttribute('href', url);
		downloadLink.click();
	}

	render(){
		this.graphs.forEach(g => g.update())
	}

	addGraph(xF, yF, zF, uMin = 0, uMax = 6.282, vMin = 0, vMax = 6.282, isVisible = true) {
		var newGraphData = this.domain.area({
			width: resolution, height: resolution,
			axes: [1,2],  // u,v
			channels: 3,  // 3D space
		});

		this.domainColors = this.domain.area({
			width: resolution, height: resolution,
			channels: 4, // RGBA
		});

		this.surfaceViewFill = this.view.surface({
			points: newGraphData,
			visible: isVisible,
			fill: true, shaded: false, lineX: false, lineY: false,
			color: "white", colors: this.domainColors,
		});
		  
		this.surfaceViewLine = this.view.surface({
			points: newGraphData,
			visible: isVisible,
			fill: false, shaded: false, lineX: true, lineY: true,
			color: "black",
		});

		var newGraph = new Graph(this.domain, this.domainColors, this.view, this.surfaceViewFill, this.surfaceViewLine, newGraphData);

		newGraph.update(xF, yF, zF)
		
		this.graphs.push(newGraph);
		
		
		if (this.graphColorStyle == "Синий"){		
			this.domainColors.set("expr", function (emit, u,v, i,j, t) 
				{ emit( 0.5, 0.5, 1.0, 1.0 ); }
			);
		} else if (this.graphColorStyle == "Красный верх, зеленый низ"){	
			this.domainColors.set("expr", function (emit, u,v, i,j, t) 
				{
					var percentU = (u - uMin) / (uMax - uMin);
					var percentV = (v - vMin) / (vMax - vMin);
					emit(percentU, percentV, 0.0, 1.0);
				}
			);
		}
		else if (this.graphColorStyle == "Радужный"){	
			this.domainColors.set("expr", function (emit, u,v, i,j, t) 
				{
					var percent = (u - uMin) / (uMax - uMin);
					var color = new THREE.Color( 0xffffff );
					color.setHSL( percent, 1, 0.5 );
					emit( color.r, color.g, color.b, 1.0 );
				}
			);
		}
		return newGraph
	}
}

class Core {
	constructor(){
		this.mathbox = mathBox({
			plugins: ['core', 'controls', 'cursor', 'mathbox'],
			controls: {klass: THREE.OrbitControls}
		});
		if (this.mathbox.fallback) throw "WebGL not supported"
		this.three = this.mathbox.three;
		this.three.renderer.setClearColor(new THREE.Color(0xFFFFFF), 1.0);

		this.camera = this.mathbox.camera( { proxy: true, position: [2, 1, 2] } );
    	
		this.view = this.mathbox.cartesian({
			range: [[-3, 3], [-2, 2], [-3, 3]],
			scale: [2,1,2],
		});
		var view = this.view;
		var xAxis = view.axis( {axis: 1, width: 8, detail: 40, color:"red"} );
		var xScale = view.scale( {axis: 1, divide: 10, nice:true, zero:true} );
		var xTicks = view.ticks( {width: 5, size: 15, color: "red", zBias:2} );
		var xFormat = view.format( {digits: 2, font:"Arial", weight: "bold", style: "normal", source: xScale} );
		var xTicksLabel = view.label( {color: "red", zIndex: 0, offset:[0,-20], points: xScale, text: xFormat} );
		
		var yAxis = view.axis( {axis: 3, width: 8, detail: 40, color:"green"} );
		var yScale = view.scale( {axis: 3, divide: 5, nice:true, zero:false} );
		var yTicks = view.ticks( {width: 5, size: 15, color: "green", zBias:2} );
		var yFormat = view.format( {digits: 2, font:"Arial", weight: "bold", style: "normal", source: yScale} );
		var yTicksLabel = view.label( {color: "green", zIndex: 0, offset:[0,0], points: yScale, text: yFormat} );
		
		var zAxis = view.axis( {axis: 2, width: 8, detail: 40, color:"blue"} );
		var zScale = view.scale( {axis: 2, divide: 5, nice:true, zero:false} );
		var zTicks = view.ticks( {width: 5, size: 15, color: "blue", zBias:2} );
		var zFormat = view.format( {digits: 2, font:"Arial", weight: "bold", style: "normal", source: zScale} );
		var zTicksLabel = view.label( {color: "blue", zIndex: 0, offset:[0,0], points: zScale, text: zFormat} );

		this.view.grid( {axes:[1,3], width: 2, divideX: 20, divideY: 20, opacity:0.25} );

		this.domain = this.mathbox.cartesian({
			range: [[0, 6.282], [0, 6.282]]
		});	
	}
}

class Graph {
	constructor(domain, domainColors, view, fill, line, graphData) {
		this.data = graphData;
		this.domain = domain;
		this.domainColors = domainColors;
		this.fill = fill;
		this.line = line;
		this.view = view;
		this.xF, this.yF, this.zF;
	}
	
	toggleVisible(){
		this.object.graph2.fill.set("visible", !secantVisible)
		this.object.graph2.line.set("visible", !secantVisible)		
	}

	update(xF = null, yF = null, zF = null) {
		if(!xF || !yF || !zF) { 
			if(this.xF) { xF = this.xF; yF = this.yF; zF = this.zF }
			else {var { xF, yF, zF } = this.object.graph1;}
		} else { 
			this.xF = xF; 
			this.yF = yF;
			this.zF = zF; 
		}
		
		var x = Parser.parse( xF ).toJSFunction( ['u','v'] );
		var y = Parser.parse( yF ).toJSFunction( ['u','v'] );
		var z = Parser.parse( zF ).toJSFunction( ['u','v'] );

		if(!this.data)
			this.object.graph1.data.set("expr", 
				function (emit, u, v, i, j, t) { 
					emit( x(u,v), z(u,v), y(u,v) );
				}
			);
		else 
			this.data.set("expr", 
				function (emit, u, v, i, j, t) { 
					emit( x(u,v), z(u,v), y(u,v) );
				}
			);
		if(this.view){
			this.view.set("range", [[xMin, xMax], [yMin, yMax], [zMin,zMax]]); 
			this.domain.set("range", [[uMin, uMax], [vMin, vMax]]  );
		}else {
			this.object.graph1.view.set("range", [[xMin, xMax], [yMin, yMax], [zMin,zMax]]); 
			this.object.graph1.domain.set("range", [[uMin, uMax], [vMin, vMax]]  );
		}
		
		if(this.object && this.object.graph1)
		if (graphColorStyle == "Синий"){	
			this.object.graph1.domainColors.set("expr", function (emit, u,v, i,j, t) 
				{ emit( 0.5, 0.5, 1.0, 1.0 ); }
			);
		} else if (graphColorStyle == "Красный верх, зеленый низ"){	
			this.object.graph1.domainColors.set("expr", function (emit, u,v, i,j, t) 
				{
					var percentU = (u - uMin) / (uMax - uMin);
					var percentV = (v - vMin) / (vMax - vMin);
					emit(percentU, percentV, 0.0, 1.0);
				}
			);
		}
		else if (graphColorStyle == "Радужный"){	
			this.object.graph1.domainColors.set("expr", function (emit, u,v, i,j, t) 
				{
					var percent = (u - uMin) / (uMax - uMin);
					var color = new THREE.Color( 0xffffff );
					color.setHSL( percent, 1, 0.5 );
					emit( color.r, color.g, color.b, 1.0 );
				}
			);
		}
	}
}

var core = new Core()
var app = new App(core);

var xFunctionText = "cos(u)*(a + b*cos(v))";
var yFunctionText = "sin(u)*(a + b*cos(v))";
var zFunctionText = "b*sin(v)";

var xSecantFunctionText = "u";
var ySecantFunctionText = "v";
var zSecantFunctionText = "0";

var a = 1, b = 0.5, c = 0;
var	xMin = -3, xMax = 3, yMin = -2,	yMax = 2, zMin = -3, zMax = 3;
var uMin = 0, uMax = 6.282, vMin = 0, vMax = 6.282;

var graph1 = app.addGraph(xFunctionText, yFunctionText, zFunctionText, uMin, uMax, vMin, vMax)
var graph2 = app.addGraph(xSecantFunctionText, ySecantFunctionText, zSecantFunctionText, uMin, uMax, vMin, vMax, false)

var Ui = new dat.GUI();

var main = Ui.addFolder('Построение плоскости');
var xFuncGUI = main.add( graph1, 'xF' ).name('x = f(u,v) = ');
var yFuncGUI = main.add( graph1, 'yF' ).name('y = g(u,v) = ');
var zFuncGUI = main.add( graph1, 'zF' ).name('z = h(u,v) = ');
main.open();


var f0 = Ui.addFolder('Параметры (a,b,c)');
var aGUI = f0.add( this, 'a' ).min(0).max(5).step(0.01).name('a = ');
var bGUI = f0.add( this, 'b' ).min(0).max(5).step(0.01).name('b = ');
var cGUI = f0.add( this, 'c' ).min(0).max(5).step(0.01).name('c = ');
f0.close();

var f2 = Ui.addFolder('Ограничения (u,v)');
var uMinGUI = f2.add( this, 'uMin' ).step(0.01).onChange( graph1.update );
var uMaxGUI = f2.add( this, 'uMax' ).step(0.01).onChange( graph1.update );
var vMinGUI = f2.add( this, 'vMin' ).step(0.01).onChange( graph1.update );
var vMaxGUI = f2.add( this, 'vMax' ).step(0.01).onChange( graph1.update );
f2.close();

var f3 = Ui.addFolder('Построение секущей');
var xSecantFuncGUI = f3.add( graph2, 'xF' ).name('x = f(u,v) = ');
var ySecantFuncGUI = f3.add( graph2, 'yF' ).name('y = g(u,v) = ');
var zSecantFuncGUI = f3.add( graph2, 'zF' ).name('z = h(u,v) = ');
var secantVisible = true;
var isVisible = f3.add( this, "secantVisible" ).name("Скрыть").onChange( graph2.toggleVisible );
f3.close();

var graphs = Ui.addFolder("Примеры поверхностей");
graphs.open();

const precetCreator = (eqX, eqY, eqZ, uMin, uMax, vMin, vMax, a = null, b = null, c = null) => () => {
	xFuncGUI.setValue(eqX); yFuncGUI.setValue(eqY); zFuncGUI.setValue(eqZ);
	uMinGUI.setValue(uMin); uMaxGUI.setValue(uMax); 
	vMinGUI.setValue(vMin); vMaxGUI.setValue(vMax);
	if(a || b || c){
		aGUI.setValue(a); bGUI.setValue(b);
		cGUI.setValue(c);
	} 
	graph1.update(eqX, eqY, eqZ);
}

var squre = precetCreator("u", "v", "0", -1, 1, -1, 1)
graphs.add( this, "squre" ).name("Плоскость");

var plane = precetCreator("1.5 * u - 1.0 * v + 1.0", "1.0 * u + 1.0 * v + 0.5", "1.0 * u + 1.0 * v + 1.0", -1, 1, -1, 1)
graphs.add( this, "plane" ).name("Наклонная");

var cone = precetCreator("a*u*cos(v)", "b*u*sin(v)", "c*u", -1, 1, 0, 6.282, 1, 1, 1)
graphs.add( this, "cone" ).name("Конус");

var cylinder = precetCreator("cos(u)", "sin(u)", "v", 0, 6.282, -1, 1)
graphs.add( this, "cylinder" ).name("Цилиндр");

var sphere = precetCreator("sin(u) * cos(v)", "sin(u) * sin(v)", "cos(u)", 0, 3.141, 0, 6.282)
graphs.add( this, "sphere" ).name("Сфера");

var torus = precetCreator("cos(u)*(a + b*cos(v))", "sin(u)*(a + b*cos(v))", "b*sin(v)", 0, 6.282, 0, 6.282, 1, 0.5)
graphs.add( this, "torus" ).name("Торус");

var helical = precetCreator("u * cos(v)", "u * sin(v)", "0.5 * v", -2, 2, -3.14, 3.14)
graphs.add( this, "helical" ).name("Спираль");

var astroid = precetCreator("cos(u)^3 * cos(v)^3", "sin(u)^3 * cos(v)^3", "sin(v)^3", 0, 3.141, 0, 6.28)
graphs.add( this, "astroid" ).name("Астроид");


var f1 = Ui.addFolder('Оси');
var xMinGUI = f1.add( this, 'xMin' ).onChange( graph1.update );
var xMaxGUI = f1.add( this, 'xMax' ).onChange( graph1.update );
var zMinGUI = f1.add( this, 'zMin' ).name("yMin").onChange( graph1.update );
var zMaxGUI = f1.add( this, 'zMax' ).name("yMax").onChange( graph1.update );
var yMinGUI = f1.add( this, 'yMin' ).name("zMin").onChange( graph1.update );
var yMaxGUI = f1.add( this, 'yMax' ).name("zMax").onChange( graph1.update );
f1.close();


var graphColorStyle = "Синий";
var graphColorStyleList = ["Синий", "Красный верх, зеленый низ", "Радужный"];
var graphColorGUI = Ui.add( this, "graphColorStyle", graphColorStyleList ).name('Цвет графиков').onChange( graph1.update );


window.update = graph1.update;
Ui.add( app, 'savePNG' ).name("Сохранить в PNG");
Ui.add( app, 'render' ).name("Обновить график");

Ui.open();