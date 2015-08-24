elementOpen("div");
  queries.forEach(function(query) {
    return elementVoid("div", query.id);;
  });
  a();
  text(message);
  text(data.message);
  elementOpen("div");a();elementClose("div");
  elementOpen("div");text(message);elementClose("div");
  elementOpen("div");text(data.message);elementClose("div");
elementClose("div");;
