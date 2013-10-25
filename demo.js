var critter = require('voxel-critter')
var ndarray = require('ndarray')
var fill = require("ndarray-fill")
var url = require('url')
var voxel2dprinter = require('./')

var sword = "http://i.imgur.com/pwXXF1Q.png"
var mario = "http://i.imgur.com/ccBkMVY.png"
var car = "http://i.imgur.com/ZcSVaqy.png"

var png = mario

var parsed = url.parse(window.location.href, true)
if (parsed.query && parsed.query.png) png = parsed.query.png

getProxyImage(png, function(image) {
  var hash = critter.load(image)
  var data = critter.convertToVoxels(hash)
  var l = data.bounds[0]
  var h = data.bounds[1]
  var d = [ h[0]-l[0] + 1, h[1]-l[1] + 1, h[2]-l[2] + 1]
  var len = d[0] * d[1] * d[2]
  var voxels = ndarray(new Int32Array(len), [d[0], d[1], d[2]])
  
  function generateVoxels(x, y, z) {
    var offset = [x + l[0], y + l[1], z + l[2]]
    var val = data.voxelData[offset.join('|')]
    return val || 0
  }
  
  fill(voxels, generateVoxels)
  
  document.body.appendChild(image)

  var voxelFaces = voxel2dprinter(voxels, data.colors)

  image.style.width = '800px'
  
})

function getProxyImage(imgURL, cb) {
  var proxyURL = 'http://maxcors.jit.su/' + imgURL // until imgur gets CORS on GETs
  var img = new Image()
  img.crossOrigin = ''
  img.src = proxyURL
  img.onload = function() {
    cb(img)
  }
}

// // Specify a width and height of the starting atlas
// var atlas = require('atlaspack')(512, 512);
// 
// (function loop() {
//   var width  = Math.random() * 32;
//   var height = Math.random() * 32;
// 
//   var node = atlas.pack({width: width, height: height});
// 
//   var div = document.createElement('div');
//   div.style.position = 'absolute';
//   div.style.width  = width + 'px';
//   div.style.height = height + 'px';
//   div.style.left   = node.rect.x + 'px';
//   div.style.top    = node.rect.y + 'px';
//   document.body.appendChild(div);
// 
//   setTimeout(loop, 1000);
// }());