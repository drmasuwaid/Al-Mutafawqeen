import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-test-loader.mjs", pathToFileURL("./scripts/"));
