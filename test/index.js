var path   = require("path").join;
var fs     = require("fs");
var assert = require("assert");
var jsx    = require("../lib/jsx");

describe("jsx2idom", () => {
  var fixtures = path(__dirname, "fixtures");

  fs.readdirSync(fixtures).map((name) => {
    var run = it.bind(void 0, should(name));
    if (name.startsWith("_")) {
      run = it.skip.bind(void 0, should(name));
    }

    run(() => {
      var fixture = path(fixtures, name);
      var filename = path(fixture, "actual.js")
      var source = fs.readFileSync(filename, {encoding: 'utf8'})

      var actual = jsx.transform(source, filename)
      var expected = fs.readFileSync(path(fixture, "expected.js")).toString();

      assert.equal(actual.trim(), expected.trim())
    });
  });
});

function should(name) {
  return "should "+name.replace(/-/g, " ")
}
