elementOpen("div");
  elementVoid("div", null, ["class", "my-class"]);
  elementVoid("div", null, null, "class", "my-class");
  elementVoid("div", null, ["class", "my-class"]);
  elementVoid("div", null, null, "class", myClass);
  elementVoid("div", null, null, "class", props.myClass);
  elementVoid("div", null, ["class", props.myClass]);
elementClose("div");;
