const TurboRoute = require("../types/TurboRoute");
const classapimethods = require("../utils/classmethodapis");

module.exports = class Controller {
  static use_pre_path;
  static api_methods;

  static init() {
    const { pre_path, middlewares, router, authenticated } = this;

    const pre_api_path = this.restapi === false ? "" : `api/v1/`;
    this.use_pre_path =
      typeof pre_path === "string"
        ? `${pre_api_path}${pre_path}`
        : `${pre_api_path}${this.name.toLowerCase()}`;
    this.user_router = router;
    this.api_methods = classapimethods(this);
    this.use_middlewares = middlewares
      ? middlewares
          .map((m) => {
            if (pro.Middlewares[m]) {
              return pro.Middlewares[m];
            } else {
              pro.logs.logc(31, `Middleware not found with name ${m}`);
            }
          })
          .filter((f) => typeof f === "function")
      : [];
    this.turbo_routes = new Array();
    this.api_methods.map((i, index) =>
      this.turbo_routes.push(
        new TurboRoute(i, this.name, this.use_pre_path, this.authenticated, index)
      )
    );
    // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1", this.turbo_routes, classapimethods)
  }

  constructor() {}


  log_dev(req, res, turbo_route, err) {
    const fs = require("fs");
    if (pro.mode === "development") {
      try {
        const writable_obj = {
          name: "Rest Controller Info",
          $main: err ? err : res.$gresponse,
          $validator_error: req.$validator_error,
          $validator_errors: req.$validator_errors,
          $cookies: req.$cookies,
          $queries: req.$queries,
          $params: req.$params,
          $body: req.$body,
          $turbo_route: turbo_route,
          $service_props: req.$service_props,
          $error: req.$error,
          $view: req.$view,
          createdAt: new Date(),
          timestamp1: new Date().toLocaleDateString(),
          timestamp2: new Date().toLocaleTimeString()
        };
        fs.writeFileSync(
          pro.root + "/tmp/logs/RestController.info.json",
          `${JSON.stringify(writable_obj, null, 2)}`
        );
        const currdata = new Date().toLocaleDateString();
        const currdatetime = new Date().toLocaleTimeString();
        const filename =
          currdata.replaceAll("/", "_") +
          " " +
          currdatetime.replaceAll(":", "_").replaceAll(".", "");
        if (fs.existsSync(pro.root + "/tmp/logs/DELETEME_restinfo")) {
          fs.writeFileSync(
            pro.root + `/tmp/logs/DELETEME_restinfo/${filename}.info.json`,
            `${JSON.stringify(writable_obj, null, 2)}`
          );
        } else {
          fs.mkdirSync(pro.root + "/tmp/logs/DELETEME_restinfo");
          fs.writeFileSync(
            pro.root + `/tmp/logs/DELETEME_restinfo/${filename}.info.json`,
            `${JSON.stringify(writable_obj, null, 2)}`
          );
        }
      } catch (e) {
        console.log(e);
        console.log(e.toString());
      }
    }
  }
};
