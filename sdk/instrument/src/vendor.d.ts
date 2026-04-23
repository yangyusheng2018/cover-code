declare module "babel-plugin-istanbul" {
  import type { PluginObj } from "@babel/core";
  const plugin: (...args: unknown[]) => PluginObj;
  export default plugin;
}
