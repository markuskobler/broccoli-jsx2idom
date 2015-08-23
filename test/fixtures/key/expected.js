elementOpen("div");
  elementVoid("div", null, ["key", true]);
  elementVoid("div", "1");
  elementVoid("div", key);
  elementVoid("div", props.key);
  elementVoid("div", props.key, ["key", props.key]);
  elementVoid("div", props.key, null, "key", props.key);
elementClose("div");;
