var ndarray = require('ndarray')
var savePixels = require('save-pixels')
var contour = require('contour-2d')

var dirs = {
  "right": [1, 0],
  "left": [-1, 0],
  "top": [0, -1],
  "bottom": [0, 1]
}

var usedColors
var paperSize = [210, 280];

module.exports = function(voxels, colors) {
  usedColors = {}
  var bounds = [[Infinity, Infinity], [0, 0]];
  var layers = sliceLayers(voxels, bounds);

  var boundDims = [
    bounds[1][0] - bounds[0][0],
    bounds[1][1] - bounds[0][1]
  ];

  var ratio = paperSize.map(function(p, i) {
    return p / boundDims[i];
  });

  var size = Math.min(ratio[0], ratio[1]) * (72 / 25.4);

  var canvases = []
  Object.keys(layers).map(function(layer) {
    var canvas = layerCanvas(voxels, layers, layer, size, colors)
    canvases.push(canvas)
  })

  // add a few extra strips of each color at the top, just so theres extra material
  // to use for the construction if there ar e.g. holes or accidents
  var strips = extraStrips(size, Object.keys(usedColors))
  
  return {strips: strips, canvases: canvases}
}

function prepareBoundingBox(x, z, box) {
  box[0][0] = Math.min(box[0][0], x);
  box[0][1] = Math.min(box[0][1], z);

  box[1][0] = Math.max(box[1][0], x);
  box[1][1] = Math.max(box[1][1], z);
}

function sliceLayers(voxels, bounds) {
  var s = voxels.shape
  var layers = {}

  for (var x = 0; x < s[0]; x++) {
    for (var z = 0; z < s[2]; z++) {
      for (var y = 0; y < s[1]; y++) {
        var val = voxels.get(x, y, z)
        if (!val) continue

        prepareBoundingBox(x, z, bounds);

        var dims = [voxels.shape[0] + 4, voxels.shape[2] + 4]
        if (!layers[y]) layers[y] = ndarray(new Uint32Array(dims[0] * dims[1]), dims)
        layers[y].set(x + 2, z + 2, val)
      }
    }
  }

  return layers
}

function extraStrips(size, colors, canvas) {
  if (!canvas) canvas = document.createElement('canvas')
  var w = 10
  var h = colors.length
  canvas.setAttribute('width', w * size)
  canvas.setAttribute('height', h * size)
  var ctx = canvas.getContext('2d')

  for (var x = 0; x < w; x++) {
    for (var z = 0; z < h * 2; z += 2) {
      var currentColor = colors[z / 2]
      ctx.fillStyle = currentColor
      ctx.fillRect(x * size, z * size, size, size)
    }
  }
  
  return canvas
}

function layerCanvas(voxels, layers, layerIdx, size, colors, canvas) {
  if (!canvas) canvas = document.createElement('canvas')
  var layer = layers[layerIdx]
  var w = layer.shape[0]
  var h = layer.shape[1]
  canvas.setAttribute('width', w * size)
  canvas.setAttribute('height', h * size)
  var ctx = canvas.getContext('2d')

  
  for (var x = 0; x < w; x++) {
    for (var z = 0; z < h; z++) {
      var val = layer.get(x, z)
      if (!val) continue
      
      // label page number to keep track of layers after printing
      ctx.fillStyle = "black"
      ctx.font = "10pt Arial"
      ctx.fillText("" + layerIdx, 10, 20)
      
      // fill in colored square
      ctx.fillStyle = colors[val]
      ctx.fillRect(x * size, z * size, size, size)
      usedColors[colors[val]] = true
      
      // render dotted lines
      var neighbors = emptyNeighbors([x,z], layer)
      neighbors.map(function(dir) {
        var d = dirs[dir]
        var nPos = [(x + d[0]), (z + d[1])]
        
        ctx.fillStyle = colors[val]
        ctx.fillRect(nPos[0] * size, nPos[1] * size, size, size)
        
        ctx.beginPath()
        ctx.setLineDash([5])
        var s = [x * size, z * size]
        var end
        if (dir === 'right') {
          s[0] += size
          s[1] += size
          end = [s[0], s[1] - size]
        }
        if (dir === 'left') {
          end = [s[0], s[1] + size]
        }
        if (dir === 'top') {
          end = [s[0] + size, s[1]]
        }
        if (dir === 'bottom') {
          s[1] = s[1] + size
          end = [s[0] + size, s[1]]
        }
        ctx.moveTo(s[0], s[1])
        ctx.lineTo(end[0], end[1])
        ctx.stroke()
      })
    }
  }

  //Render tabs
  var dilated = ndarray(new Uint8Array((w+2)*(h+2)), [w+2, h+2])
  for(var i=0; i<w; ++i) {
    for(var j=0; j<h; ++j) {
      if(layer.get(i,j) !== 0) {
        dilated.set(i+1,j+1,1)
        dilated.set(i,j+1,1)
        dilated.set(i+2,j+1,1)
        dilated.set(i+1,j,1)
        dilated.set(i+1,j+2,1)
      }
    }
  }


  function clamp(x) {
    return (x < 0) ? -1 : ((x > 0) ? 1 : 0)
  }


  var loops = contour(dilated.transpose(1,0))
  for(var n=0; n<loops.length; ++n) {
    var loop = loops[n]
    for(var i=0; i<loop.length; ++i) {
      var a = loop[i]
      var b = loop[(i+1) % loop.length]

      var par  = [b[0]-a[0], b[1]-a[1]].map(clamp)
      var perp = [-par[1], par[0]]

      ctx.beginPath()
      ctx.setLineDash([5])

      ctx.moveTo(size*(a[0]-1), 
                 size*(a[1]-1))
      ctx.lineTo(size*(a[0]-1+0.4*(par[0]+0.9*perp[0])), 
                 size*(a[1]-1+0.4*(par[1]+0.9*perp[1])))
      ctx.lineTo(size*(b[0]-1+0.4*(-par[0]+0.9*perp[0])), 
                 size*(b[1]-1+0.4*(-par[1]+0.9*perp[1])))
      ctx.lineTo(size*(b[0]-1), 
                 size*(b[1]-1))

      ctx.stroke()
    }
  }

  
  return canvas
}

function emptyNeighbors(pos, layer) {
  var neighbors = []
  var l = [0, 0]
  var h = layer.shape
  Object.keys(dirs).map(function eachDir(dir) {
    var d = dirs[dir]
    var neighbor = [pos[0] + d[0], pos[1] + d[1]]
    if (neighbor[0] >= l[0] && neighbor[1] >= l[1] &&
        neighbor[0] <= h[0] && neighbor[1] <= h[1]) {
      var val = layer.get(neighbor[0], neighbor[1])
      if (val) return
      neighbors.push(dir)
    }
  })
  return neighbors
}
