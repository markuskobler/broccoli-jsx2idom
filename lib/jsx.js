var acorn     = require('acorn-jsx/inject')(require('acorn'));
var walk      = require('acorn/dist/walk');
var escodegen = require('escodegen');
var b         = require('ast-types').builders;
var recast    = require('recast');


var jsx = walk.make({
  JSXElement: function(node, st, c) {
    var parent = st[st.length - 2];

    var expr = b.blockStatement([]);
    var hasChildren = node.children.length > 0;


    var name = node.openingElement.name.name;
//    console.log( node.openingElement.name ) // might be a path?
    var args = [b.literal(name)]

    c(node.openingElement, st)

    expr.body.push(node.openingElement);

    for (var i = 0; i < node.children.length; ++i) {
      var child = node.children[i];
      c(child, [expr])
    }

    if (node.children.length > 0) {
      c(node.closingElement, st)
      expr.body.push(node.closingElement)
    }

    switch (parent.type) {
    case 'ExpressionStatement':
      expr.loc = node.loc
      parent.expression = expr
      break
    case 'BlockStatement':
      parent.body = parent.body.concat(expr.body)
      break
    case 'ReturnStatement':
      parent.argument = null;
//      parent.body = parent.body.concat(expr.body)
      break;
    default:
      throw Error("Unexpected parent type: " + parent.type);
    }
  },

  JSXOpeningElement: function(node, st, c) {
    var expr, call, elem, tag, parent = st[st.length - 2];

    var hasChildren = parent.children.length > 0;

    tag = b.literal(node.name.name)
    tag.loc = node.name.loc

    var statics = [];
    var args = [tag, null, b.arrayExpression(statics)];

    for (var i=0; i<node.attributes.length; i++) {
      c(node.attributes[i], [args])
    }

    if( args.length < 4 && statics.length === 0 ) {
      args = args.slice(0, args[1] === null ? 1 : 2)
    } else if (statics.length === 0) {
      args[2] = b.literal(null)
    }
    if (args[1] === null) {
      args[1] = b.literal(null)
    }

    expr =
      b.expressionStatement(
        call = b.callExpression(
          elem = b.identifier(hasChildren ? "elementOpen" : "elementVoid"), args))

    expr.loc = call.loc = elem.loc = tag.loc = node.loc;
//    call.start = node.start ??

    parent.openingElement = expr
  },

  JSXClosingElement: function(node, st, c) {
    var expr, call, elem, tag, parent = st[st.length - 2];

    tag = b.literal(node.name.name)
    tag.loc = node.name.loc

    expr =
      b.expressionStatement(
        call = b.callExpression(
          elem = b.identifier("elementClose"), [tag]))

    expr.loc = call.loc = elem.loc = node.loc;
    expr.start = node.start
    expr.end = node.end

    parent.closingElement = expr
  },

  JSXAttribute: function(node, st, c) {
    if (node.name.name === "key") {
      if (node.value) {
        if (node.value.type === "JSXExpressionContainer") {
          st[0][1] = node.value.expression
        } else {
          st[0][1] = node.value
        }
      }
      return
    }
    // todo check namespace?
    var args = st[0], k = b.literal(node.name.name), v;
    if (node.value) {
      switch (node.value.type) {
      case "Literal":
        args = args[2].elements
        v = node.value
        break;
      case "JSXExpressionContainer":
        v = node.value.expression
        if (v.type === "Literal") {
          args = args[2].elements
        }
        break
      default:
        throw Error("Unexpected attribute value: " + node.value.type);
      }
    } else {
      args = args[2].elements
      v = b.literal(true)
    }

    args.push(k)
    if (v) {
      args.push(v)
    }
  },

  JSXExpressionContainer: function(node, st, c) {
    var owner = st[0]
    c(node.expression, st)
    owner.body.push(b.expressionStatement(node.expression))
  },

//  JSXMemberExpression: function() {console.log( "?")}

  JSXEmptyExpression: function(node, st, c) {
    console.log( node )
//    console.log( "?")
  },


  l: function(){}

}, walk.base)

// jsx.JSXIdentifier = function() { console.log( "?" ); }
// jsx.JSXNamespacedName = function() {console.log( "?")},
// jsx.JSXEmptyExpression = function() {console.log( "?")}
// jsx.JSXSpreadAttribute = function() {console.log( "?")}

function transform(source, filename) {
  var ast = acorn.parse(source, {
    ranges: true,
    locations: true,
    ecmaVersion: 6,
    sourceType: 'module',
    plugins: { jsx: true },
    sourceFile: filename,
    allowReturnOutsideFunction: true,

    onComment: function() {
      console.log( "COMMMENTS", arguments );
    }
  });

  walk.ancestor(ast, {}, jsx)

  // console.log( "==============");
  // console.log( ast.body );
  // console.log( "==============");

  var output = recast.print(ast, {
    sourceMap: true
  });

  return output.code
}

exports.transform = transform
