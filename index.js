var ndarray = require('ndarray')
var savePixels = require('save-pixels')
var color = require('color')

var dirs = {
  "right": [1, 0],
  "left": [-1, 0],
  "top": [0, -1],
  "bottom": [0, 1]
}

var usedColors

module.exports = function(voxels, colors, size) {
  if (!size) size = 50
  colors = colors.map(function(c) {
    var col = color('rgb(' + c.map(function(v) { return v * 255 }).join(', ') + ')')
    return col.hexString()
  })
  usedColors = {}
  var layers = sliceLayers(voxels)
  var canvases = []
  Object.keys(layers).map(function(layer) {
    var canvas = layerCanvas(voxels, layers, layer, size, colors)
    canvases.push(canvas)
  })

  var strips = extraStrips(size, Object.keys(usedColors))
  document.body.appendChild(strips)
  
  canvases.map(function(canv) { document.body.appendChild(canv) })
}

function sliceLayers(voxels) {
  var s = voxels.shape
  var layers = {}
  for (var x = 0; x < s[0]; x++) {
    for (var z = 0; z < s[2]; z++) {
      for (var y = 0; y < s[1]; y++) {
        var val = voxels.get(x, y, z)
        if (!val) continue
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
  canvas.setAttribute('height', h * 2 * size)
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
      
      ctx.fillStyle = "black"
      ctx.font = "10pt Arial"
      ctx.fillText("" + layerIdx, 10, 20)
      
      ctx.fillStyle = colors[val]
      ctx.fillRect(x * size, z * size, size, size)
      usedColors[colors[val]] = true
      
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
