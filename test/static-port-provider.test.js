import assert from "node:assert/strict";
import test from "node:test";

import { StaticPortProvider } from "../src/ui/StaticPortProvider.js";

test("StaticPortProvider manages independent input and output ports", () => {
  const provider = new StaticPortProvider({
    controlId:"transformer",
    portElements:{
      left:{ getBoundingClientRect:() => ({ left:10, top:20, width:12, height:120 }) },
      right:{ getBoundingClientRect:() => ({ left:210, top:20, width:12, height:120 }) }
    },
    ports:[
      { id:"in-1", side:"left" },
      { id:"out-1", side:"right" }
    ]
  });
  provider.addPort({ id:"in-2", side:"left" });
  assert.equal(provider.getPorts().length, 3);
  assert.equal(provider.getPortPosition({ controlId:"transformer", itemId:"in-1", side:"left" }).x, 16);
  assert.equal(provider.removePort("in-2", "left").id, "in-2");
  assert.equal(provider.all().length, 2);
  provider.destroy();
});
