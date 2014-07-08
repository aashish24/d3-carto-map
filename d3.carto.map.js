d3.carto = {};
d3.carto.map = function() {

    var mapSVG;
    var tileSVG;
    var mapDiv;
    var canvasCanvas;
    var layerBox;
    var mapProjection;
    var mapZoom;
    var mapCenter = [12,42];
    var mapHeight = 10;
    var mapWidth = 10;

    var d3MapCanvasG;
    var d3MapCanvasImage;
    
    var d3MapTileG = [];
    var d3MapTileLayer = [{id: "tl0", visible: true, path: "examples.map-zgrqqx0w", name: "base", active: true}];
    
    var d3MapCanvasPointsData = [];

    var d3MapSVGPointsG = [];
    var d3MapSVGPointsLayer = [];

    var d3MapRasterPointsG = [];
    var d3MapRasterPointsLayer = [];
    
    var d3MapRasterFeatureG = [];
    var d3MapRasterFeatureLayer = [];

    var d3MapSVGFeatureG = [];
    var d3MapSVGFeatureLayer = [];
            
    var d3MapTile = d3.geo.tile()
    .size([10, 10]);

    var d3MapProjection = d3.geo.mercator()
    .scale((1 << 13) / 2 / Math.PI)
    .scale(4096)
    .translate([5, 5]);

    var d3MapPath = d3.geo.path()
        .projection(d3MapProjection);

    var c = d3MapProjection([12, 42]);
    
    var d3MapZoom = d3.behavior.zoom()
    .scale(d3MapProjection.scale() * 2 * Math.PI)
    .scaleExtent([700, 15052461])
    .translate([mapWidth - c[0], mapHeight - c[1]])
//    .translate([0, 0])
    .on("zoom", d3MapZoomed)
    .on("zoomstart", d3MapZoomInitialize)
    .on("zoomend", d3MapZoomComplete)
    ;
    
    d3MapProjection
    .scale(1 / 2 / Math.PI)
    .translate([0, 0]);
    
    function map(selectedDiv) {

    mapDiv = selectedDiv;

    //Multiple SVGs because we draw the tiles underneath and sandwich a canvas layer between the tiles and the interactive SVG layer
    tileSVG = selectedDiv.append("svg").attr("id", "d3TileSVG").style("height", "100%").style("width", "100%").style("position", "absolute").style("z-index", -1);
    canvasCanvas = selectedDiv.append("canvas").attr("id", "d3MapCanvas").style("height", "100%").style("width", "100%").style("pointer-events", "none")
    .attr("height", 5).attr("width", 5).style("position", "absolute").style("z-index", 0);
    mapSVG = selectedDiv.append("svg").attr("id", "d3MapSVG").style("height", "100%").style("width", "100%")
    .style("position", "absolute").style("z-index", 1)
    .call(d3MapZoom);

    d3MapCanvasImage = mapSVG.append("g").attr("id","d3MapCanvasG").append("image");
    
    d3MapTileG.push(tileSVG.insert("g", "#d3MapCanvasG").attr("id", "tl0"));
    layerBox = selectedDiv.insert("div", "svg").attr("id", "d3MapLayerBox");
    layerBox.append("div").attr("id", "layerBoxContent");

    zoomBox = selectedDiv.insert("div", "svg").attr("id", "d3MapZoomBox");
    
    zoomBox.selectAll("button").data(["in", "out"]).enter().append("button")
    .on("click", manualZoom).html(function(d) {return d=="in" ? "+" : "-"})
    
    updateLayers();

        //TO DO: Change this so that it appends the functionality and doesn't overwrite it
        //Or find a viable solution that recognizes <div> resizing
        var existingOnResize = window.onresize;
        window.onresize = function(event) {
            resizeMap();
            existingOnResize();
        }
        resizeMap();
        map.centerOn([12,42],"latlong",0)
    }
    
    //Internal Functions
    
    function resizeMap() {
	mapHeight = parseFloat(mapSVG.node().clientHeight || mapSVG.node().parentNode.clientHeight);
	mapWidth = parseFloat(mapSVG.node().clientWidth || mapSVG.node().parentNode.clientWidth);
	d3MapTile.size([mapWidth, mapHeight]);
        canvasCanvas.attr("height", mapHeight).attr("width", mapWidth).style("height",mapHeight + "px").style("width", mapWidth + "px")
        d3MapCanvasImage.attr("height", mapHeight).attr("width", mapWidth).style("height",mapHeight + "px").style("width", mapWidth + "px")
        
        d3MapZoomed();
        
    }
    
    function updateLayers() {
        layerBox.select("#layerBoxContent").selectAll("*").remove();

        var newLines = layerBox.select("#layerBoxContent").append("ul");
        
        newLines.selectAll("li.nothing").data(d3MapTileLayer).enter().append("li")
        .on("click", showHideLayer).attr("id", function(d) {return d.id});

        newLines.selectAll("li.nothing").data(d3MapSVGPointsLayer).enter().append("li")
        .on("click", showHideLayer).attr("id", function(d) {return d.id});

        newLines.selectAll("li.nothing").data(d3MapRasterPointsLayer.filter(function(d) {return !d.mixed})).enter().append("li")
        .on("click", showHideLayer).attr("id", function(d) {return d.id});

	newLines.selectAll("li.nothing").data(d3MapSVGFeatureLayer).enter().append("li")
        .on("click", showHideLayer).attr("id", function(d) {return d.id});

        newLines.selectAll("li.nothing").data(d3MapRasterFeatureLayer).enter().append("li")
        .on("click", showHideLayer).attr("id", function(d) {return d.id});
        
        newLines.selectAll("li").append("input").attr("type", "checkbox").property("checked", function(d) {return d.active});
        newLines.selectAll("li").append("span").html(function(d) {return d.name})
        
    }
    
    function showHideLayer(d,i,sentNode) {
        var n = sentNode || this;

    var imgUrl = canvasCanvas.node().toDataURL("image/png");
    d3MapCanvasImage.attr("xlink:href", imgUrl).style("opacity", 1);

        //TO DO: Put transitions back in by adding a transition Canvas Image
        if (!d.active) {
            d.visible = true;
            d.active = true;
	    if (d.mixed) {
		d3MapRasterPointsLayer.forEach(function(p) {
		    if (p.id == d.mixedupDup) {
			p.active = true;
			p.visible = true;
		    }
		})
	    }
	    renderTiles();
            mapDiv.select("g#" + d.id).style("opacity", 0).transition().duration(1000).style("opacity", 1);
//            mapDiv.select("g#" + d.id).style("opacity", 1);
            d3.select(n).select("input").property("checked", true);
        }
        else {
            mapDiv.select("g#" + d.id).transition().duration(1000).style("opacity", 0);
//            mapDiv.select("g#" + d.id).style("opacity", 0);
            d3.select(n).select("input").property("checked", false);
            d.visible = false;
            d.active = false;
	    if (d.mixed) {
		d3MapRasterPointsLayer.forEach(function(p) {
		    if (p.id == d.mixedupDup) {
			p.active = false;
			p.visible = false;
		    }
		})
	    }
        }
	renderCanvas("zoomcomplete");
	    d3MapCanvasImage.transition().duration(1000).style("opacity", 0);
    }

    // MAP ZOOMING
    function d3MapZoomed() {
    
    renderTiles();
      
      ///POINTS
      for (x in d3MapSVGPointsG) {
        if (d3MapSVGPointsLayer[x].renderFrequency == "drawAlways" && d3MapSVGPointsLayer[x].active) {
            renderSVGPoints(x);
        }
    }
    // FEATURES
        for (x in d3MapSVGFeatureG) {
            if (d3MapSVGFeatureLayer[x].renderFrequency == "drawAlways"  && d3MapSVGFeatureLayer[x].active) {
            renderSVGFeatures(x);
            }
        }
	
    //CANVAS RENDERING
    renderCanvas("zoom");

    }

    function d3MapZoomInitialize() {
        //TO DO: Split out the rendering into separate functions and call those with renderVector("always") or renderVector("once") and the like
        for (x in d3MapSVGPointsG) {
        if (d3MapSVGPointsLayer[x].renderFrequency == "drawEnd" || !d3MapSVGPointsLayer[x].active) {
            d3MapSVGPointsG[x].style("display", "none");
        }
        }
        
        for (x in d3MapSVGFeatureG) {
            if (d3MapSVGFeatureLayer[x].renderFrequency == "drawEnd" || !d3MapSVGFeatureLayer[x].active) {
            d3MapSVGFeatureG[x].style("display", "none");
            }
        }
    
    renderCanvas("zoom");

    }
    
    
    function d3MapZoomComplete() {

    renderTiles();
    renderCanvas("zoomcomplete")
        
        for (x in d3MapSVGPointsG) {
            if ((d3MapSVGPointsLayer[x].renderFrequency == "drawEnd" || d3MapSVGPointsLayer[x].renderFrequency == "drawAlways")  && d3MapSVGPointsLayer[x].active) {
            d3MapSVGPointsG[x].style("display", "block");
            renderSVGPoints(x);
            }
        }

        for (x in d3MapSVGFeatureG) {
            if ((d3MapSVGFeatureLayer[x].renderFrequency == "drawEnd" || d3MapSVGFeatureLayer[x].renderFrequency == "drawAlways")  && d3MapSVGFeatureLayer[x].active) {
            d3MapSVGFeatureG[x].style("display", "block");
            renderSVGFeatures(x);
            }
        }

    }
    
    function renderCanvas(zoomMode) {
	var context = canvasCanvas.node().getContext("2d");
        context.clearRect(0,0,mapWidth,mapHeight);
    
        for (x in d3MapRasterFeatureG) {
          if ((d3MapRasterFeatureLayer[x].renderFrequency == "drawAlways" || (d3MapRasterFeatureLayer[x].renderFrequency == "drawDuring" && zoomMode == "zoom")) && d3MapRasterFeatureLayer[x].active) {
            renderCanvasFeatures(x, context);
          }	
        }

        for (x in d3MapRasterPointsG) {
	    d3MapRasterPointsLayer
          if ((d3MapRasterPointsLayer[x].renderFrequency == "drawAlways" || (d3MapRasterPointsLayer[x].renderFrequency == "drawDuring" && zoomMode == "zoom")) && d3MapRasterPointsLayer[x].active) {
            renderCanvasPoints(x, context);
          }
        }
    }
    
    function renderSVGPoints(i) {
        d3MapSVGPointsG[i]
            .attr("transform", "translate(" + d3MapZoom.translate() + ")scale(" + d3MapZoom.scale() + ")");

        d3MapSVGPointsG[i].selectAll("circle")
            .attr("r", function(d) {return scaled(d._d3Map.size) * 7.8})
            .style("stroke-width", function(d) {return scaled(d._d3Map.strokeWidth) * 3})

    }
    
    function renderSVGFeatures(i) {
        d3MapSVGFeatureG[i]
            .attr("transform", "translate(" + d3MapZoom.translate() + ")scale(" + d3MapZoom.scale() + ")");

        d3MapSVGFeatureG[i].selectAll("path")
            .style("stroke-width", function(d) {return scaled(parseFloat(d._d3Map.strokeWidth)) * 3})
    }

    function renderCanvasFeatures(i,context) {

	var topoData = d3MapRasterFeatureG[i]

	var canvasProjection = d3.geo.mercator().scale(d3MapProjection.scale() * d3MapZoom.scale()).translate(d3MapZoom.translate());
	var canvasPath = d3.geo.path().projection(canvasProjection);
    
	for (x in topoData) {
	    context.strokeStyle = topoData[x]._d3Map.stroke;
	    context.fillStyle = topoData[x]._d3Map.color;
	    context.lineWidth = topoData[x]._d3Map.strokeWidth;
	    context.beginPath(), canvasPath.context(context)(topoData[x]);
	    if (topoData[x]._d3Map.stroke != "none") {
		context.stroke()
	    }
	    if (topoData[x]._d3Map.color != "none") {
		context.fill();
	    }
	}
    }
    
    function renderCanvasPoints(i,context) {
        for (y in d3MapRasterPointsG[i]) {

        var projectedPoint = d3MapProjection([d3MapRasterPointsG[i][y].x,d3MapRasterPointsG[i][y].y])
        var projX = projectedPoint[0] * d3MapZoom.scale() + d3MapZoom.translate()[0];
        var projY = projectedPoint[1] * d3MapZoom.scale() + d3MapZoom.translate()[1];

        //Transform fill and opacity to rgba        
        var rgbMarker = d3.rgb(d3MapRasterPointsG[i][y]._d3Map.color)
        var rgbaMarker = "rgba(" + rgbMarker.r + "," + rgbMarker.g + "," + rgbMarker.b + "," + d3MapRasterPointsG[i][y]._d3Map.opacity + ")";
        
        context.beginPath();
        context.arc(projX,projY,d3MapRasterPointsG[i][y]._d3Map.size,0,2*Math.PI);
        context.fillStyle = rgbaMarker;
        context.strokeStyle = d3MapRasterPointsG[i][y]._d3Map.stroke;
        context.lineWidth = parseFloat(d3MapRasterPointsG[i][y]._d3Map.strokeWidth);
        context.stroke();
        context.fill();

      }
    }
    
    function renderTiles() {
          //Tile drawing needs to only draw the topmost baselayer, or designate base layers through the layer control dialogue
  var tiles = d3MapTile
      .scale(d3MapZoom.scale())
      .translate(d3MapZoom.translate())
      ();

      for (x in d3MapTileG) {
        if (d3MapTileLayer[x].visible) {
  var image = d3MapTileG[x]
      .attr("transform", "scale(" + tiles.scale + ")translate(" + tiles.translate + ")")
    .selectAll("image")
      .data(tiles, function(d) { return d; });

  image.exit()
      .remove();

  image.enter().append("image")
      .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/"+d3MapTileLayer[x].path+"/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
      .attr("width", 1)
      .attr("height", 1)
      .attr("x", function(d) { return d[0]; })
      .attr("y", function(d) { return d[1]; });
      }
      }
    }
function manualZoom(zoomDirection) {


  if (zoomDirection == "in") {
    if (d3MapZoom.scale() >= d3MapZoom.scaleExtent()[1]) {
      return;
    }
        var newZoom = d3MapZoom.scale() * 1.5;
        var newX = ((d3MapZoom.translate()[0] - (mapWidth / 2)) * 1.5) + mapWidth / 2;
        var newY = ((d3MapZoom.translate()[1] - (mapHeight / 2)) * 1.5) + mapHeight / 2;
  }

  else {
    if (d3MapZoom.scale() <= d3MapZoom.scaleExtent()[0]) {
      return;
    }
        var newZoom = d3MapZoom.scale() * .75;
        var newX = ((d3MapZoom.translate()[0] - (mapWidth / 2)) * .75) + mapWidth / 2;
        var newY = ((d3MapZoom.translate()[1] - (mapHeight / 2)) * .75) + mapHeight / 2;    
    }

        mapSVG.call(d3MapZoom.translate([newX,newY]).scale(newZoom).event);
      }
      
      function scaled(incomingNumber) {
          return parseFloat(incomingNumber) / d3MapZoom.scale();
        }

	function cssFromClass(incomingClass) {
	    var marker = {};
        var dummyMarker = mapSVG.append("circle").attr("class", incomingClass);
        marker.markerStroke = dummyMarker.style("stroke") || "black";
        marker.markerStrokeWidth = dummyMarker.style("stroke-width") || 1;
        marker.markerFill = dummyMarker.style("fill") || "white";
        marker.markerOpacity = dummyMarker.style("opacity") || 1;
        dummyMarker.remove();
	return marker;
	}

    function processFeatures(featureData, marker, featureLayerName, featureLayerClass, renderType, renderFrequency) {
	for (x in featureData) {
                      featureData[x]._d3Map = {};
                      featureData[x]._d3Map.color = marker.markerFill;
		      //Override Fill for lines?
		      if (featureData[x].geometry.type == "LineString") {
                          featureData[x]._d3Map.color = "none";
		      }
                      featureData[x]._d3Map.stroke = marker.markerStroke;
                      featureData[x]._d3Map.opacity = marker.markerOpacity;
                      featureData[x]._d3Map.strokeWidth = marker.markerStrokeWidth;
	      }

		    if (renderType == "canvas") {
			d3MapRasterFeatureG.push(featureData);
			var layerObj = {id: "to" + d3MapRasterFeatureLayer.length, drawOrder: d3MapRasterFeatureLayer.length, path: "", visible: true, name: featureLayerName, active: true, renderFrequency: "drawAlways"}
			d3MapRasterFeatureLayer.push(layerObj);
		    }

		    else {

                    var layerG = mapSVG.insert("g", ".points").attr("class", "features").attr("id", "to" + d3MapSVGFeatureLayer.length);
                    d3MapSVGFeatureG.push(layerG);
                    var layerObj = {id: "to" + d3MapSVGFeatureLayer.length, drawOrder: d3MapSVGFeatureLayer.length, path: "", visible: true, name: featureLayerName, active: true, renderFrequency: "drawAlways"}
                    d3MapSVGFeatureLayer.push(layerObj)

                    layerG.attr("transform", "translate(" + d3MapZoom.translate() + ")scale(" + d3MapZoom.scale() + ")");
  
                  layerG.selectAll("path")
                  .data(featureData)
                  .enter()
                  .append("path")
                  .attr("class", featureLayerClass)
                  .attr("d", d3MapPath)
                  .style("stroke-linecap", "round")
                  .style("stroke-width", function(d) {return scaled(d._d3Map.strokeWidth)})
		    }
	    updateLayers();
	}

    //Exposed Functions
    
    map.aFunction = function (incomingData) {
        if (!arguments.length) return false;
        
        return this;
    }

    map.addTileLayer = function (newTileLayer, newTileLayerName, tileType, disabled) {
        if (!arguments.length) return false;
        var tName = newTileLayerName || "Raster " + d3MapTileLayer.length
        var tDisabled = disabled || false;
        var tPosition = d3MapTileLayer.length;
        var tID = "tl" + d3MapTileLayer.length;
        var tObj = {id: tID, drawOrder: d3MapTileLayer.length, path: newTileLayer, visible: true, name: tName, active: true, renderFrequency: "drawAlways"};
        d3MapTileLayer.push(tObj);
        d3MapTileG.push(tileSVG.insert("g", tID).attr("class", "tiles").attr("id", tID));
        if (tDisabled) {
            updateLayers();
            showHideLayer(tObj,tPosition,mapDiv.select("li#" + tID).node())
        }
        else {
            d3MapZoomed();
        }
        updateLayers();
        return this;
    }
    
    map.addCSVLayer = function (newCSVLayer, newCSVLayerName, newCSVLayerClass, markerSize, renderType, xcoord, ycoord, renderFrequency) {
        //TO DO: Render Type "mixed" creates two layers, a canvas layer drawnAlways and an SVG layer drawnOnce
        var rFreq = renderFrequency || "mixed";
        if (!arguments.length) return false;
        var cName = newCSVLayerName || "CSV " + d3Layer.length
        var cID = "cps" + d3MapSVGPointsLayer.length;
        var ccID = "cpc" + d3MapRasterPointsLayer.length;

        if (renderType == "canvas") {
        var pointsObj = {id: ccID, drawOrder: d3MapRasterPointsLayer.length, path: "", visible: true, name: cName, active: true, renderFrequency: "drawAlways", mixed: false}
            d3MapRasterPointsLayer.push(pointsObj);
        }
        else if (renderType == "svg") {
        var pointsObj = {id: cID, drawOrder: d3MapSVGPointsLayer.length, path: "", visible: true, name: cName, active: true, renderFrequency: "drawAlways", mixed: false}
            d3MapSVGPointsLayer.push(pointsObj);
        }
        else if (renderType == "mixed") {
        var pointsObj = {id: ccID, path: "",drawOrder: d3MapRasterPointsLayer.length, visible: true, name: cName, active: true, renderFrequency: "drawDuring", mixed: true, mixedDup: cID}
            d3MapRasterPointsLayer.push(pointsObj);
        var pointsObj2 = {id: cID, path: "",drawOrder: d3MapSVGPointsLayer.length, visible: true, name: cName, active: true, renderFrequency: "drawEnd", mixed: true, mixedDup: ccID}
            d3MapSVGPointsLayer.push(pointsObj2);
            
        }
        d3.csv(newCSVLayer, function(error, points) {
            //To access CSS properties
	    var marker = cssFromClass(newCSVLayerClass);
        
          for (x in points) {
            if(points[x]) {
              //Create and store fixed display data in the _d3Map object
              points[x]._d3Map = {};
              points[x]._d3Map.color = marker.markerFill;
              points[x]._d3Map.stroke = marker.markerStroke;
              points[x]._d3Map.opacity = marker.markerOpacity;
              points[x]._d3Map.strokeWidth = marker.markerStrokeWidth;
              points[x]._d3Map.size = markerSize;
              points[x]._d3Map.x = points[x][xcoord];
              points[x]._d3Map.y = points[x][ycoord];
            }
          }
            
        if (renderType == "canvas" || renderType == "mixed") {
            d3MapRasterPointsG.push(points);
        }
        if (renderType == "svg" || renderType == "mixed") {
        var pointsG = mapSVG.append("g").attr("class", "points").attr("id", cID);
        d3MapSVGPointsG.push(pointsG);

  pointsG.attr("transform", "translate(" + d3MapZoom.translate() + ")scale(" + d3MapZoom.scale() + ")");
  
  var appendedPointsEnter = pointsG.selectAll("g.blank")
  .data(points)
  .enter()
  .append("g")
  .attr("id", function(d,i) {return cName + "_g_" + i})
  .attr("class", cName + " pointG")
  .attr("transform", function(d) {return "translate(" + d3MapProjection([d._d3Map.x,d._d3Map.y]) + ")scale(" + d3MapProjection.scale() + ")"})
  .style("cursor", "pointer")

  .each(function(d) {
    d._d3Map.originalTranslate = "translate(" + d3MapProjection([d._d3Map.x,d._d3Map.y]) + ")scale(" + d3MapProjection.scale() + ")";
  });
  
  appendedPointsEnter
  .append("circle")
  .style("stroke", function(d) {return d._d3Map.stroke})
  .style("fill", function(d) {return d._d3Map.color})
  .style("opacity", function(d) {return d._d3Map.opacity})
  .attr("class", cName);
        }
            d3MapZoomed();        
        })
        updateLayers();
        return this;
        
    }

    map.addTopoJSONLayer = function (newTopoLayer, newTopoLayerName, newTopoLayerClass, renderType, specificFeature, renderFrequency) {
        d3.json(newTopoLayer, function(error, topoData) {

	    var layerDataType = "topojson";
	    var marker = cssFromClass(newTopoLayerClass);

            for (x in topoData.objects) {
                if (x == specificFeature || specificFeature == "all") {
		    
		    var topoLayerData = topojson.feature(topoData, topoData.objects[x]).features;
		    processFeatures(topoLayerData, marker, newTopoLayerName, newTopoLayerClass, renderType, renderFrequency);
		    
                }
            }
            d3MapZoomComplete();
	    updateLayers();
        })
    }    

    map.addGeoJSONLayer = function (newGeoLayer, newGeoLayerName, newGeoLayerClass, renderType, specificFeature, renderFrequency) {
	    var layerDataType = "geojson";
	    var marker = cssFromClass(newGeoLayerClass);

        d3.json(newGeoLayer, function(error, geoData) {
		processFeatures(geoData.features, marker, newGeoLayerName, newGeoLayerClass, renderType, renderFrequency);
        })
    }

    map.addFeatureLayer = function (featureArray, newLayerName, newLayerClass, renderType, renderFrequency) {
	    var layerDataType = "featurearray";
	    var marker = cssFromClass(newLayerClass);

	    processFeatures(featureArray, marker, newLayerName, newLayerClass, renderType, renderFrequency);
    }
    // #map.getLayerAttributes("layerName")
    
    map.center = function (newCenter) {
        if (!arguments.length) return mapCenter;
        mapCenter = newCenter;
        return this;
    }
    
    map.centerOn = function (newSetCenter, type, transitionSpeed) {
        var tSpeed = transitionSpeed || 0;
        if (!arguments.length) return false;

	var projectedCenter = newSetCenter;

	if (type == "latlong") {
            var projectedCenter = d3MapProjection(newSetCenter);
	}

        var s = d3MapZoom.scale();
        var t = [mapWidth / 2 - (s * projectedCenter[0]), mapHeight / 2 - (s * projectedCenter[1])];

        if (tSpeed == 0) {
        mapSVG
            .call(d3MapZoom.translate(t).scale(s).event);
        }
        else {
        mapSVG.transition()
            .duration(tSpeed)
            .call(d3MapZoom.translate(t).scale(s).event);            
        }

        return this;
    }
    
    map.zoomTo = function (boundingBox, type, margin, transitionSpeed) {

        if (!arguments.length) return false;

	var m = margin || .9;
        var tSpeed = transitionSpeed || 0;

	if (type == "latlong") {
            boundingBox = [d3MapProjection(boundingBox[0]),d3MapProjection(boundingBox[1])];
	}
	
      dx = boundingBox[1][0] - boundingBox[0][0],
      dy = boundingBox[1][1] - boundingBox[0][1],
      x = (boundingBox[0][0] + boundingBox[1][0]) / 2,
      y = (boundingBox[0][1] + boundingBox[1][1]) / 2,
      s = m / Math.max(dx / mapWidth, dy / mapHeight),
      t = [mapWidth / 2 - s * x, mapHeight / 2 - s * y];

        if (tSpeed == 0) {
            mapSVG
                .call(d3MapZoom.translate(t).scale(s).event);
        }
        else {
	    mapSVG.transition()
              .duration(transitionSpeed)
              .call(d3MapZoom.translate(t).scale(s).event);
	}
        return this;
    }

    map.zoom = function (newZoom) {
        if (!arguments.length) return d3MapZoom;
        d3MapZoom = newZoom;
        return this;
    }

    map.projection = function (newProjection) {
        if (!arguments.length) return d3MapProjection;
        d3MapProjection = newProjection;
        return this;
    }

    return map;
}
