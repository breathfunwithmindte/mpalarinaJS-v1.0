const Mpalarina = require("./core/Mpalarina");
const test = require("./services/test");


async function main (application_path)
{
  global["mp"] = new Mpalarina();
  await mp.start(application_path);
}

module.exports = { Mpalarina, main, test }