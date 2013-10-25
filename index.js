var ndarray = require('ndarray')
var savePixels = require('save-pixels')
var color = require('color')

module.exports = function(voxels, colors) {
  window.voxels = voxels
  colors = colors.map(function(c) {
    var col = color('rgb(' + c.map(function(v) { return v * 255 }).join(', ') + ')')
    return col.hexString()
  })
  window.colors = colors
  var layers = sliceLayers(voxels)
  Object.keys(layers).map(function(layer) {
    var l = layers[layer]
    var canvas = layerCanvas(l, 50, colors)
    document.body.appendChild(canvas)
  })
  window.layers = layers
}

function sliceLayers(voxels) {
  var s = voxels.shape
  var layers = {}
  for (var x = 0; x < s[0]; x++) {
    for (var z = 0; z < s[2]; z++) {
      for (var y = 0; y < s[1]; y++) {
        var val = voxels.get(x,y,z)
        if (!val) continue
        var dims = [voxels.shape[0], voxels.shape[2]]
        if (!layers[y]) layers[y] = ndarray(new Uint32Array(dims[0] * dims[1]), dims)
        layers[y].set(x,z,val)
      }
    } 
  }
  return layers
}

function layerCanvas(layer, size, colors, canvas) {
  if (!canvas) canvas = document.createElement('canvas')
  var w = layer.shape[0]
  var h = layer.shape[1]
  canvas.setAttribute('width', w * size)
  canvas.setAttribute('height', h * size)
  var ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ff0'
  
  for (var x = 0; x < w; x++) {
    for (var z = 0; z < h; z++) {
      var val = layer.get(x,z)
      if (!val) continue
      ctx.fillStyle = colors[val]
      ctx.fillRect(x * size, z * size, size, size)
    }
  }
  
  return canvas
}