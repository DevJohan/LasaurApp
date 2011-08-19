

/**
  SVG parser for simple documents. Converts SVG DOM to a flat collection of paths.

  var boundarys = SVGReader.parse(svgstring, config)

  Features:
    * <svg> width and height, viewBox clipping.
    * Clipping (objectBoundingBox clipping too)
    * Paths, rectangles, ellipses, circles, lines, polylines and polygons
    * Nested transforms
    * Transform lists (transform="rotate(30) translate(2,2) scale(4)")
    * Parsing simple stylesheets (tag, class or id)
    * Non-pixel units (cm, mm, in, pt, pc, em, ex, %)
    * 'style' attribute and presentation attributes
    
  Intentinally not Supported:
    * viewBox
    * markers
    * masking
    * % units
    * text (needs to be converted to paths)
    * raster image
    * style sheets
    
  TODO
    * rounded rects

*/
SVGReader = {
  
  /**
    Parses an SVG DOM into CAKE scenegraph.

    Config hash parameters:
      filename: Filename for the SVG document. Used for parsing image paths.
      width: Width of the bounding box to fit the SVG in.
      height: Height of the bounding box to fit the SVG in.
      fontSize: Default font size for the SVG document.
      currentColor: HTML text color of the containing element.

    @param svgstring a string representing a SVG document.
    @param config The config hash.
    @returns the boundarys of all the shapes.
    */
  
  var boundarys = {}
    // output path flattened (world coords)
    // hash of segments by color
    // each segment is a list of paths
    // each path is a list of verteces
  var style : {},  
    // style at current parsing position
  var defs = {},
    // for storing all the defs in the svg
    // http://www.w3.org/TR/SVG11/struct.html#Head

    
  parse : function(svgstring, config) {
    
    // parse xml
    var svgRootElement;
		if (window.DOMParser) {
			var parser = new DOMParser();
			svgRootElement = parser.parseFromString(svgstring, 'text/xml').documentElement;
		}
		else {
			xml = xml.replace(/<!DOCTYPE svg[^>]*>/, '');
			var xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
			xmlDoc.async = 'false';
			xmlDoc.loadXML(svgstring); 
			svgRootElement = xmlDoc.documentElement;
		}
    
    // let the fun begin
    var node = {}
    node.xformToWorld = [1,0,0,1,0,0]
    this.parseChildren(this, svgRootElement, node)
    
    return this.boundarys
  },
  
  
  parseChildren : function(domNode, parentNode) {
    var childNodes = []
    for (var i=0; i<domNode.childNodes.length; i++) {
      var tag = domNode.childNodes[i]
      if (tag.childNodes) {
        if (tag.tagName) {
          // we are looping here through 
          // all nodes with child nodes
          // others are irrelevant
          // console.log("parsing: %s", tag.tagName);

          var node = {}
          
          // parse transform and style attributes
          if (tag.attributes) {
            for (var j=0; j<tag.attributes.length; j++) {
              var attr = tag.attributes[j]
              if (this.SVGAttributeMapping[attr.nodeName])
                this.SVGAttributeMapping[attr.nodeName].call(node, attr.nodeValue)
            }
          }
          
          node.xformToWorld = this.matrixMult(parentNode.xformToWorld, node.xform)
          node.segments = []
          
          // parse tag    
          if (this.SVGTagMapping[tag.tagName]) {
            this.SVGTagMapping[tag.tagName].call(this, tag, node)
          }
          
          // compile boundarys
          node.xformSegmentsToWorld()
          for (var s=0; s<node.segments.length; s++) {
            boundarys[color].push(node.segments[s])
          }          
          
        }
        
        // recursive call
        this.parseChildren(tag, node)
      }
    }
  },
  


  ///////////////////////////
  // recognized svg elements
  
  SVGTagMapping : {
    svg : function(tag, node) {
      // has style attributes
            
      this.node.width = 0
      this.node.height = 0
      this.node.fill = 'black'
      this.node.stroke = 'none'
      
      var w = tag.getAttribute('width')
      var h = tag.getAttribute('height')
      if (!w) w = h
      else if (!h) h = w
      if (w) {
        var wpx = this.parseUnit(w, cn, 'x')
        var hpx = this.parseUnit(h, cn, 'y')
      }
    },
    
    
    g : function(tag, node) {
      // http://www.w3.org/TR/SVG11/struct.html#Groups
      // has transform and style attributes
    },


    polygon : function(tag, node) {
      // has transform and style attributes
      var path = []
      var vertnums = c.getAttribute("points").toString().strip().split(/[\s,]+/).map(parseFloat)
      if (vertnums.length % 2 == 0) {
        for (var i=0; i<vertnums.length; i+=2) {
          path.push([vertnums[i], vertnums[i+1]])
        }
        // close if necessary
        var first = path[0]
        var last = path[path.length-1]
        if (Math.abs(first[0]-last[0]) > 0.00001 || Math.abs(first[1]-last[1]) > 0.00001) {
          path.push(path[0])
        }
        node.segments.push(path)        
      } else {
        alert('ERROR in polygon: odd number of vertex numbers')
      }
    },


    polyline : function(tag, node) {
      // has transform and style attributes
      var path = []
      var vertnums = c.getAttribute("points").toString().strip().split(/[\s,]+/).map(parseFloat)
      if (vertnums.length % 2 == 0) {
        for (var i=0; i<vertnums.length; i+=2) {
          path.push([vertnums[i], vertnums[i+1]])
        }
        node.segments.push(path)
      } else {
        alert('ERROR in polyline: odd number of vertex numbers')
      }
    },


    rect : function(tag, node) {
      // has transform and style attributes      
      var w = this.parseUnit(c.getAttribute('width'))
      var h = this.parseUnit(c.getAttribute('height'))
      var x = this.parseUnit(c.getAttribute('x'))
      var y = this.parseUnit(c.getAttribute('y'))
      var rx = this.parseUnit(c.getAttribute('rx'))
      var ry = this.parseUnit(c.getAttribute('ry'))

      var path = []
      path.push( [x,y] )
      path.push( [x+w,y] )
      path.push( [x+w,y+h] )
      path.push( [x,y+h] )
      path.push( [x,y] )
      node.segments.push(path)

      // FIXME: implement rx, ry
      // see: http://www.w3.org/TR/SVG11/shapes.html#RectElement
    },


    line : function(tag, node) {
      // has transform and style attributes
      var x1 = this.parseUnit(c.getAttribute('x1')) || 0
      var y1 = this.parseUnit(c.getAttribute('y1')) || 0
      var x2 = this.parseUnit(c.getAttribute('x2')) || 0
      var y2 = this.parseUnit(c.getAttribute('y2')) || 0
      
      var path = []
      path.push( [x1,y1] )
      path.push( [x2,y2] )
      node.segments.push(path)      
    },


    circle : function(tag, node) {
      // has transform and style attributes
      var scaleToWorld = this.matrixGetScale(node.xformToWorld)  // use this for tolerance
      
      var r = this.parseUnit(c.getAttribute('r'))
      var cx = this.parseUnit(c.getAttribute('cx'))
      var cy = this.parseUnit(c.getAttribute('cy'))

      var path = []
      // calc circle
      node.segments.push(path)        
    },


    ellipse : function(tag, node) {
      // has transform and style attributes
      var scaleToWorld = this.matrixGetScale(node.xformToWorld)  // use this for tolerance
      
      var rx = this.parseUnit(c.getAttribute('rx'))
      var ry = this.parseUnit(c.getAttribute('ry'))
      var cx = this.parseUnit(c.getAttribute('cx'))
      var cy = this.parseUnit(c.getAttribute('cy'))

      var path = []
      // calc ellipse
      node.segments.push(path)
    },

    
    path : function(tag, node) {
      // http://www.w3.org/TR/SVG11/paths.html
      // has transform and style attributes
      var scaleToWorld = this.matrixGetScale(node.xformToWorld)  // use this for tolerance

      var segs = c.getAttribute("d").split(/(?=[a-z])/i)
      var x = 0
      var y = 0
      var px,py
      var pc
      var commands = []
      for (var i=0; i<segs.length; i++) {
        var seg = segs[i]
        var cmd = seg.match(/[a-z]/i)
        if (!cmd) return [];
        cmd = cmd[0];
        var coords = seg.match(/[+-]?\d+(\.\d+(e\d+(\.\d+)?)?)?/gi)
        if (coords) coords = coords.map(parseFloat)
        switch(cmd) {
          case 'M':
            x = coords[0]
            y = coords[1]
            px = py = null
            commands.push(['moveTo', [x, y]])
            break
          case 'm':
            x += coords[0]
            y += coords[1]
            px = py = null
            commands.push(['moveTo', [x, y]])
            break
          case 'L':
            x = coords[0]
            y = coords[1]
            px = py = null
            commands.push(['lineTo', [x, y]])
            break
          case 'l':
            x += coords[0]
            y += coords[1]
            px = py = null
            commands.push(['lineTo', [x, y]])
            break
          case 'H':
            x = coords[0]
            px = py = null
            commands.push(['lineTo', [x, y]])
            break
          case 'h':
            x += coords[0]
            px = py = null
            commands.push(['lineTo', [x,y]])
            break
          case 'V':
            y = coords[0]
            px = py = null
            commands.push(['lineTo', [x,y]])
            break
          case 'v':
            y += coords[0]
            px = py = null
            commands.push(['lineTo', [x,y]])
            break
          case 'C':
            x = coords[4]
            y = coords[5]
            px = coords[2]
            py = coords[3]
            commands.push(['bezierCurveTo', coords])
            break
          case 'c':
            commands.push(['bezierCurveTo',[
              coords[0] + x, coords[1] + y,
              coords[2] + x, coords[3] + y,
              coords[4] + x, coords[5] + y
            ]])
            px = x + coords[2]
            py = y + coords[3]
            x += coords[4]
            y += coords[5]
            break
          case 'S':
            if (px == null || !pc.match(/[sc]/i)) {
              px = x
              py = y
            }
            commands.push(['bezierCurveTo',[
              x-(px-x), y-(py-y),
              coords[0], coords[1],
              coords[2], coords[3]
            ]])
            px = coords[0]
            py = coords[1]
            x = coords[2]
            y = coords[3]
            break
          case 's':
            if (px == null || !pc.match(/[sc]/i)) {
              px = x
              py = y
            }
            commands.push(['bezierCurveTo',[
              x-(px-x), y-(py-y),
              x + coords[0], y + coords[1],
              x + coords[2], y + coords[3]
            ]])
            px = x + coords[0]
            py = y + coords[1]
            x += coords[2]
            y += coords[3]
            break

          case 'Q':
            px = coords[0]
            py = coords[1]
            x = coords[2]
            y = coords[3]
            commands.push(['quadraticCurveTo', coords])
            break
          case 'q':
            commands.push(['quadraticCurveTo',[
              coords[0] + x, coords[1] + y,
              coords[2] + x, coords[3] + y
            ]])
            px = x + coords[0]
            py = y + coords[1]
            x += coords[2]
            y += coords[3]
            break
          case 'T':
            if (px == null || !pc.match(/[qt]/i)) {
              px = x
              py = y
            } else {
              px = x-(px-x)
              py = y-(py-y)
            }
            commands.push(['quadraticCurveTo',[
              px, py,
              coords[0], coords[1]
            ]])
            px = x-(px-x)
            py = y-(py-y)
            x = coords[0]
            y = coords[1]
            break
          case 't':
            if (px == null || !pc.match(/[qt]/i)) {
              px = x
              py = y
            } else {
              px = x-(px-x)
              py = y-(py-y)
            }
            commands.push(['quadraticCurveTo',[
              px, py,
              x + coords[0], y + coords[1]
            ]])
            x += coords[0]
            y += coords[1]
            break
          case 'A':
            var arc_segs = this.solveArc(x,y, coords)
            for (var l=0; l<arc_segs.length; l++) arc_segs[l][2] = i
            commands.push.apply(commands, arc_segs)
            x = coords[5]
            y = coords[6]
            break
          case 'a':
            coords[5] += x
            coords[6] += y
            var arc_segs = this.solveArc(x,y, coords)
            for (var l=0; l<arc_segs.length; l++) arc_segs[l][2] = i
            commands.push.apply(commands, arc_segs)
            x = coords[5]
            y = coords[6]
            break
          case 'Z':
            commands.push(['closePath', []])
            break
          case 'z':
            commands.push(['closePath', []])
            break
        }
        pc = cmd
      }      
    },    
    
    image : function(tag, node) {
      // not supported
      // has transform and style attributes
    },
    
    defs : function(tag, node) {
      // not supported
      // http://www.w3.org/TR/SVG11/struct.html#Head
      // has transform and style attributes      
    },
    
    style : function(tag, node) {
      // not supported: embedded style sheets
      // http://www.w3.org/TR/SVG11/styling.html#StyleElement
      // instead presentation attributes and the 'style' attribute      
      // var style = tag.getAttribute("style")
      // if (style) {
      //   var segs = style.split(";")
      //   for (var i=0; i<segs.length; i++) {
      //     var kv = segs[i].split(":")
      //     var k = kv[0].strip()
      //     if (this.SVGAttributeMapping[k]) {
      //       var v = kv[1].strip()
      //       this.SVGAttributeMapping[k].call(v, defs, st)
      //     }
      //   }
      // }      
    }    
        
  },

  // recognized svg elements
  ///////////////////////////


  solveArc : function(x, y, coords) {
    var rx = coords[0]
    var ry = coords[1]
    var rot = coords[2]
    var large = coords[3]
    var sweep = coords[4]
    var ex = coords[5]
    var ey = coords[6]
    var segs = this.arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y)
    var retval = []
    for (var i=0; i<segs.length; i++) {
      retval.push(['bezierCurveTo', this.segmentToBezier.apply(this, segs[i])])
    }
    return retval
  },


  // Copied from Inkscape svgtopdf, thanks!
  arcToSegments : function(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
    var th = rotateX * (Math.PI/180)
    var sin_th = Math.sin(th)
    var cos_th = Math.cos(th)
    rx = Math.abs(rx)
    ry = Math.abs(ry)
    var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5
    var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5
    var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry)
    if (pl > 1) {
      pl = Math.sqrt(pl)
      rx *= pl
      ry *= pl
    }

    var a00 = cos_th / rx
    var a01 = sin_th / rx
    var a10 = (-sin_th) / ry
    var a11 = (cos_th) / ry
    var x0 = a00 * ox + a01 * oy
    var y0 = a10 * ox + a11 * oy
    var x1 = a00 * x + a01 * y
    var y1 = a10 * x + a11 * y

    var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0)
    var sfactor_sq = 1 / d - 0.25
    if (sfactor_sq < 0) sfactor_sq = 0
    var sfactor = Math.sqrt(sfactor_sq)
    if (sweep == large) sfactor = -sfactor
    var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0)
    var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0)

    var th0 = Math.atan2(y0-yc, x0-xc)
    var th1 = Math.atan2(y1-yc, x1-xc)

    var th_arc = th1-th0
    if (th_arc < 0 && sweep == 1){
      th_arc += 2*Math.PI
    } else if (th_arc > 0 && sweep == 0) {
      th_arc -= 2 * Math.PI
    }

    var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)))
    var result = []
    for (var i=0; i<segments; i++) {
      var th2 = th0 + i * th_arc / segments
      var th3 = th0 + (i+1) * th_arc / segments
      result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th]
    }

    return result
  },

  segmentToBezier : function(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
    var a00 = cos_th * rx
    var a01 = -sin_th * ry
    var a10 = sin_th * rx
    var a11 = cos_th * ry

    var th_half = 0.5 * (th1 - th0)
    var t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half)
    var x1 = cx + Math.cos(th0) - t * Math.sin(th0)
    var y1 = cy + Math.sin(th0) + t * Math.cos(th0)
    var x3 = cx + Math.cos(th1)
    var y3 = cy + Math.sin(th1)
    var x2 = x3 + t * Math.sin(th1)
    var y2 = y3 - t * Math.cos(th1)
    return [
      a00 * x1 + a01 * y1,      a10 * x1 + a11 * y1,
      a00 * x2 + a01 * y2,      a10 * x2 + a11 * y2,
      a00 * x3 + a01 * y3,      a10 * x3 + a11 * y3
    ]
  },
  

  
  /////////////////////////////
  // recognized svg attributes
  
  SVGAttributeMapping : {
    DEG_TO_RAD : Math.PI / 180,
    RAD_TO_DEG : 180 / Math.PI,

    id : function(node, v) {
      node.id = v
    },   

    transform : function(node, v) {
      // http://www.w3.org/TR/SVG11/coords.html#EstablishingANewUserSpace
      var xforms = []
      var segs = transform.match(/[a-z]+\s*\([^)]*\)/ig)
      for (var i=0; i<segs.length; i++) {
        var kv = segs[i].split("(")
        var k = kv[0].strip()
        var params = kv[1].strip().slice(0,-1)
        
        // translate
        if (k == 'translate') {
          var xy = params.split(/[\s,]+/).map(parseFloat)
          xforms.push([1, 0, 0, 1, xy[0], xy[1]])
        // rotate         
        } else if (k == 'rotate') {
          if (params != 'auto' && params != 'auto-reverse') {
            var rot = params.split(/[\s,]+/).map(parseFloat)
            var angle = rot[0] * this.DEG_TO_RAD
            if (rot.length > 1) {
              xforms.push([1, 0, 0, 1, rot[1], rot[2]])
              xforms.push([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0])
              xforms.push([1, 0, 0, 1, -rot[1], -rot[2]])
            } else {
              xforms.push([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0])
            }
          }
        //scale       
        } else if (k == 'scale') {
          var xy = params.split(/[\s,]+/).map(parseFloat)
          var trans = ['scale']
          if (xy.length > 1) {
            xforms.push([xy[0], 0, 0, xy[1], 0, 0])
          } else {
            xforms.push([xy[0], 0, 0, xy[0], 0, 0])
          }
        // matrix
        } else if (k == 'matrix') {
          var mat = v.split(/[\s,]+/).map(parseFloat)
          if (mat.length == 6) {
            xforms.push(mat)
          }
        // skewX        
        } else if (k == 'skewX') {
          var angle = parseFloat(v)*this.DEG_TO_RAD
          xforms.push([1, 0, Math.tan(angle), 1, 0, 0])
        // skewY
        } else if (k == 'skewY') {
          var angle = parseFloat(v)*this.DEG_TO_RAD
          xforms.push([1, Math.tan(angle), 0, 1, 0, 0])
        }
      }

      //calculate combined transformation matrix
      xform_combined = [1,0,0,1,0,0]
      for (var i=0; i<xforms.length; i++) {
        xform_combined = matrixMult(xform_combined, xforms[i])
      }
      
      // assign
      node.xform = xform_combined
    },

    style : function(node, v) {
      // style attribute
      // http://www.w3.org/TR/SVG11/styling.html#StyleAttribute
      // <rect x="200" y="100" width="600" height="300" 
      //   style="fill: red; stroke: blue; stroke-width: 3"/>
    }, 
    
    ///////////////////////////
    // Presentations Attributes 
    // http://www.w3.org/TR/SVG11/styling.html#UsingPresentationAttributes
    // <rect x="200" y="100" width="600" height="300" 
    //   fill="red" stroke="blue" stroke-width="3"/>
    
    opacity : function(node, v) {
      node.opacity = parseFloat(v)
    },

    display : function (node, v) {
      node.display = v
    },

    visibility : function (node, v) {
      node.visibility = v
    },

    fill : function(node, v, defs, style) {
      node.fill = this.__parseStyle(v, node.fill, defs, node.color)
    },

    stroke : function(node, v, defs, style) {
      node.stroke = this.__parseStyle(v, node.stroke, defs, node.color)
    },

    color : function(node, v, defs, style) {
      if (v == 'inherit') return
      node.color = this.__parseStyle(v, false, defs, node.color)
    },

    'fill-opacity' : function(node, v) {
      node.fillOpacity = Math.min(1,Math.max(0,parseFloat(v)))
    },

    'stroke-opacity' : function(node, v) {
      node.strokeOpacity = Math.min(1,Math.max(0,parseFloat(v)))
    },

    // Presentations Attributes 
    ///////////////////////////

    __parseStyle : function(v, currentStyle, defs, currentColor) {

      if (v.charAt(0) == '#') {
        if (v.length == 4)
          v = v.replace(/([^#])/g, '$1$1')
        var a = v.slice(1).match(/../g).map(
          function(i) { return parseInt(i, 16) })
        return a

      } else if (v.search(/^rgb\(/) != -1) {
        var a = v.slice(4,-1).split(",")
        for (var i=0; i<a.length; i++) {
          var c = a[i].strip()
          if (c.charAt(c.length-1) == '%')
            a[i] = Math.round(parseFloat(c.slice(0,-1)) * 2.55)
          else
            a[i] = parseInt(c)
        }
        return a

      } else if (v.search(/^rgba\(/) != -1) {
        var a = v.slice(5,-1).split(",")
        for (var i=0; i<3; i++) {
          var c = a[i].strip()
          if (c.charAt(c.length-1) == '%')
            a[i] = Math.round(parseFloat(c.slice(0,-1)) * 2.55)
          else
            a[i] = parseInt(c)
        }
        var c = a[3].strip()
        if (c.charAt(c.length-1) == '%')
          a[3] = Math.round(parseFloat(c.slice(0,-1)) * 0.01)
        else
          a[3] = Math.max(0, Math.min(1, parseFloat(c)))
        return a

      } else if (v.search(/^url\(/) != -1) {
        var id = v.match(/\([^)]+\)/)[0].slice(1,-1).replace(/^#/, '')
        if (defs[id]) {
          return defs[id]
        } else { // missing defs, let's make it known that we're screwed
          return 'rgba(255,0,255,1)'
        }

      } else if (v == 'currentColor') {
        return currentColor

      } else if (v == 'none') {
        return 'none'

      } else if (v == 'freeze') { // SMIL is evil, but so are we
        return null

      } else if (v == 'remove') {
        return null

      } else { // unknown value, maybe it's an ICC color
        return v
      }
    }
  },
  
  // recognized svg attributes
  /////////////////////////////
  

  parseUnit : function(v) {
    if (v == null) {
      return null
    } else {
      var multiplier = 1.0
      var cm = this.getCmInPixels()
      if (v.search(/cm$/i) != -1) {
        multiplier = cm
      } else if (v.search(/mm$/i) != -1) {
        multiplier = 0.1 * cm
      } else if (v.search(/pt$/i) != -1) {
        multiplier = 0.0352777778 * cm
      } else if (v.search(/pc$/i) != -1) {
        multiplier = 0.4233333333 * cm
      } else if (v.search(/in$/i) != -1) {
        multiplier = 2.54 * cm
      } else if (v.search(/em$/i) != -1) {
        multiplier = parent.fontSize
      } else if (v.search(/ex$/i) != -1) {
        multiplier = parent.fontSize / 2
      }
      return multiplier * parseFloat(v.strip())
    }
  },

  getCmInPixels : function() {
    if (!this.cmInPixels) {
      var e = E('div',{ style: {
        margin: '0px',
        padding: '0px',
        width: '1cm',
        height: '1cm',
        position: 'absolute',
        visibility: 'hidden'
      }})
      document.body.appendChild(e)
      var cm = e.offsetWidth
      document.body.removeChild(e)
      this.cmInPixels = cm || 38
    }
    return this.cmInPixels
  },  
  
  matrixMult : function(mA, mB) {
    return [ mA[0]*mB[0] + mA[2]*mB[1],
             mA[1]*mB[0] + mA[3]*mB[1],
             mA[0]*mB[2] + mA[2]*mB[3],
             mA[1]*mB[2] + mA[3]*mB[3],
             mA[0]*mB[4] + mA[2]*mB[5] + mA[4],
             mA[1]*mB[4] + mA[3]*mB[5] + mA[5] ]
  },
  
  matrixApply : function(mat, vec) {
    return [ mat[0]*vec[0] + mat[2]*vec[1] + mat[4],
             mat[1]*vec[0] + mat[3]*vec[1] + mat[5] ]     
  },
  
  matrixGetScale : function(mat) {
    function sign(x) {
      if(x>0)return 1;
      else if(x<0)return -1;
      else return 0;
    }
    var sx = sign(mat[0]) * Math.sqrt(mat[0]*mat[0] + mat[1]*mat[1])
    var sy = sign(mat[3]) * Math.sqrt(mat[2]*mat[2] + mat[3]*mat[3])
    return [sx,sy]
  }
  
}
