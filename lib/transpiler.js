var espree    = require('espree');
var visit     = require('ast-types').visit;
var b         = require('ast-types').builders;
var recast    = require('recast');
//var sourceMap = require('source-map');

/*
// TODO
// jsx.JSXNamespacedName = function() {console.log( "?")},
// jsx.JSXSpreadAttribute = function() {console.log( "?")}
*/

function transform(src, filename) {
  var options = {
    range: true,
    loc: true,
    comments: true,
    attachComment: true,
    sourceType: 'module',
    ecmaFeatures: {jsx: true}
  }

  var ast = parse(src, options)

  visit(ast, mainVisitor)

  // TODO replace recast
  var output = recast.print(ast, {tabWidth: 2})

  return output.code
}
module.exports = exports = transform

var mainVisitor = {
  visitJSXElement: function(path) {
    this.traverse(path);

    for (var i = 0; i < path.node.children.length; i++) {
      var child = path.node.children[i];
      switch (child.type) {
        case 'Literal':
          var textPath = path.get("children", i);
          var text = child.value

          var prefix = /^[\t\n\r ]+/mg.exec(text);
          if( prefix ) {
            var space = prefix[0];
            // safe to ignore only whitespace
            if (space.length === text.length) {
              break
            }
            textPath.insertBefore(b.literal(space))
            i++;
            text = text.substring(space.length)
          }

          var suffix = /[\t\n\r ]+$/mg.exec(text);
          if (suffix) {
            var space = suffix[0];
            textPath.insertAfter(b.literal(space))
            i++;
            text = text.substring(0, suffix.index)
          }

          textPath.replace(
            b.expressionStatement(
              b.callExpression(
                b.identifier("text"), [
                  b.literal(text)])))

          break;

        case 'JSXExpressionContainer':
          var expr = child.expression
          var p = path.get("children", i)
          switch (expr.type) {
            case 'Literal':
              p.replace(
                b.expressionStatement(
                  b.callExpression(
                    b.identifier("text"), [expr])))
              break;

            case 'ArrayExpression':
              for (var l = 0; l< expr.elements.length; l++) {
                var e = expr.elements[l]
                if (e.type === 'Literal') {
                    p.insertBefore(
                      b.expressionStatement(
                        b.callExpression(
                         b.identifier("text"), [e])))
                } else {
                  p.insertBefore(e)
                }
                i++
              }
              p.replace(null)
              break;

            case 'Identifier':
            case 'MemberExpression':
              p.replace(
                b.expressionStatement(
                  b.callExpression(
                   b.identifier("text"), [expr])))
              break;
            default:
              p.replace(b.expressionStatement(expr))
          }
      }
    }
  },

  visitJSXOpeningElement: function(path) {
    var name = replaceName(path.node.name);

    var statics = []
    var noKey = b.literal(null)
    var args = [name, noKey, b.arrayExpression(statics)];
    var hasChildren = path.parent.node.children.length > 0;

    this.traverse(path, {
      visitJSXAttribute: function(path) {
        var node = path.node;
        var ns, name, value, update = args

        switch (node.name.type) {
          case "JSXIdentifier":
            name = node.name.name
          break
          case "JSXNamespacedName":
            name = node.name.name.name
            ns = node.name.namespace.name
        }

        if (name === "key") {
          if (!node.value) {
            value = b.literal(true)
            ns = ns || "s"
          } else {
            if (node.value.type === "JSXExpressionContainer") {
               value = args[1] = node.value.expression
            } else {
               value = args[1] = node.value
            }
          }
          if (ns === "s") {
            statics.push(b.literal("key"))
            statics.push(value)
          } else if (ns === "d") {
            args.push(b.literal("key"))
            args.push(value)
          }
          return false;
        }
        if (!node.value) {
          value = b.literal(true)
          update = statics
        } else {
          switch (node.value.type) {
          case "Literal":
            value = node.value
            update = statics
            break;
          case "JSXExpressionContainer":
            value = node.value.expression
            if (value.type === "Literal") {
              update = statics
            }
            break
          default:
            throw Error("Unexpected attribute value: " + node.value.type);
          }
        }
        if (ns === "s") {
          update = statics
        } else if (ns === "d") {
          update = args
        }
        update.push(b.literal(name))
        update.push(value)
        return false
      }
    })

    if( args.length < 4 && statics.length === 0 ) {
      args = args.slice(0, args[1] === noKey ? 1 : 2)
    } else if (statics.length === 0) {
      args[2] = b.literal(null)
    }

    path.replace(
      b.expressionStatement(
        b.callExpression(
          b.identifier(hasChildren ? "elementOpen" : "elementVoid"), args)))
  },

  visitJSXClosingElement: function(path) {
    if (path.parent.node.children.length > 0) {
      path.replace(
        b.expressionStatement(
          b.callExpression(
            b.identifier("elementClose"),
            [replaceName(path.node.name)])))
    } else {
      path.replace(null)
    }
    return false
  }
}

function parse(src, options) {
  try {
    return espree.parse(src, options);
  } catch (err) {
      // Output error line
      throw err
  }
}

function replaceName(node) {
  switch (node.type) {
      case 'JSXIdentifier':
        if (!/[a-z\-]*/.exec(node.name)) {
          throw new Error("Components not yet supported")
        }
        return b.literal(node.name)
      case 'JSXMemberExpression':
        throw new Error("my.Components not yet supported")
      break
      default:
        throw new Error("unknown type "+node.type)
  }
}

function attachToParent(path, nodes) {
  var node = path.node
  var parent = path.parent.node
  switch (parent.type) {
    case 'ExpressionStatement':
      attachToParent(path.parent, nodes)
//      parent.expression.replace(node);
      break;
    case 'Program':
      for (var i = 0; i < nodes.length; i++) {
          path.insertBefore(nodes[i])
//          path.replace(null);
      }
      break;
    case 'JSXElement':
      attachToParent(path.parent, nodes)
      // ignore
      break;
    default:
      console.log( "Dont know how to handle parent '"+parent.type+"'")
  }
}
