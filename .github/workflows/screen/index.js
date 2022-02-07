const core = require("@actions/core");

const result = "Hello, World!";
console.log(result);

core.setOutput("result", result);
