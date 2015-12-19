var CachingWriter = require('broccoli-caching-writer')
var rsvp          = require('rsvp')
var path          = require('path')
var fs            = require('fs');
var readFile      = rsvp.denodeify(fs.readFile);
var writeFile     = rsvp.denodeify(fs.writeFile);
var symlinkOrCopy = require('symlink-or-copy');
var Promise       = rsvp.Promise
var mkdirp        = rsvp.denodeify(require('mkdirp'));
var jsx           = require('./transpiler')

module.exports = JSXTranspiler;

function JSXTranspiler(inputTree, opts) {
  if (!(this instanceof JSXTranspiler))
    return new JSXTranspiler(inputTree, opts);

  opts = opts || {}

  CachingWriter.call(this, inputTree, {
    cacheInclude: opts.include || [/\.jsx?$/],
    cacheExclude: opts.exclude || [],
  })

  if (opts.filterExtensions) {
    this.filterExtensions = opts.filterExtensions;
  }
}
JSXTranspiler.prototype = Object.create(CachingWriter.prototype)
JSXTranspiler.prototype.constructor = JSXTranspiler
JSXTranspiler.prototype.filterExtensions = ['jsx']

JSXTranspiler.prototype.build = function() {
  return rsvp.all(this.listFiles().reduce(function(files, f) {
    if (hasExtention(this.filterExtensions, f)) {
      files.push(this.processFile(f))
    } else {
      files.push(this.skipFile(f))
    }
    return files
  }.bind(this), []))
}

JSXTranspiler.prototype.processFile = function(file) {
  return readFile(file, { encoding: this.inputEncoding || 'utf8' }).then(function(v) {
    var output, outputPath = path.join(this.outputPath, file.slice(this.inputPaths[0].length + 1, file.lastIndexOf(".")+1) + "js")
    try {
      output = jsx(v, file);
    } catch (err) {
      console.log( "Failed to parse `"+ file+"`", err )
      throw err
    }
    return mkdirp(path.dirname(outputPath)).then(function() {
      return writeFile(outputPath, output, { encoding: this.inputEncoding || 'utf8' }).then(function() {
        return outputPath
      })
    })
  }.bind(this))
}

JSXTranspiler.prototype.skipFile = function(file) {
  var outputPath = path.join(this.outputPath, file.slice(this.inputPaths[0].length + 1, file.length))
  return mkdirp(path.dirname(outputPath)).then(function() {
    symlinkOrCopy.sync(file, outputPath)
    return outputPath
  })
}

function hasExtention(exts, f) {
  for (var i = 0; i < exts.length; i++) {
    var ext = exts[i]
    if (f.lastIndexOf("."+ext) === f.length - (ext.length + 1))
      return ext
  }
  return
}
