var CachingWriter = require('broccoli-caching-writer')
var rsvp          = require('rsvp')
var path          = require('path')
var fs            = require('fs');
var readFile      = rsvp.denodeify(fs.readFile);
var writeFile     = rsvp.denodeify(fs.writeFile);
var symlinkOrCopy = require('symlink-or-copy');
var Promise       = rsvp.Promise
var mkdirp        = rsvp.denodeify(require('mkdirp'));
var jsx           = require('jsx-transform')

module.exports = JSXTranspiler;

function JSXTranspiler(inputTree, opts) {
  if (!(this instanceof JSXTranspiler))
    return new JSXTranspiler(inputTree, opts);

  this.enforceSingleInputTree = true;

  opts = opts || {}

  CachingWriter.call(this, inputTree, {
    filterFromCache: {
      include: opts.include || [/\.jsx?$/],
      exclude: opts.exclude || [],
    }
  })

  if (opts.filterExtensions) {
    this.filterExtensions = opts.filterExtensions;
  }
}
JSXTranspiler.prototype = Object.create(CachingWriter.prototype)
JSXTranspiler.prototype.constructor = JSXTranspiler
JSXTranspiler.prototype.filterExtensions = ['js', 'jsx']

JSXTranspiler.prototype.updateCache = function(cwd, destDir) {
  return rsvp.all(this.listFiles().reduce(function(files, f) {
    if (hasExtention(this.filterExtensions, f)) {
      files.push(this.processFile(cwd, destDir, f))
    } else {
      files.push(this.skipFile(cwd, destDir, f))
    }
    return files
  }.bind(this), []))
}

JSXTranspiler.prototype.processFile = function(cwd, destDir, file) {
  return readFile(file, { encoding: this.inputEncoding || 'utf8' }).then(function(v) {
    var output, outputPath = path.join(destDir, file.slice(cwd.length + 1, file.lastIndexOf(".")+1) + "js")
    try {
      output = jsx.transform(v, {passArray: false});
    } catch (err) {
      console.log( "Failed to parse `"+ file+"`", err )
      throw err
    }
    return mkdirp(path.dirname(outputPath)).then(function() {
      return writeFile(outputPath, output, { encoding: this.inputEncoding || 'utf8' }).then(function() {
        return outputPath
      })
    })
  })
}

JSXTranspiler.prototype.skipFile = function(cwd, destDir, file) {
  var outputPath = path.join(destDir, file.slice(cwd.length + 1, file.length))
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
