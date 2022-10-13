const Controller = require("./Controller");
const Validator = require("../utils/validator");
const { service_runner } = require("../services/ServiceRunner");
const GeneralResponse = require("../types/GeneralResponse");
const MyError = require("../types/MyError");
const TurboRoute = require("../types/TurboRoute");
const { logwarn } = require("../utils/logs");

module.exports = class RestController extends Controller {
  static restapi = true;
  static response_type = "application/json";

  /**
   *
   * @param {*} express
   * @param {TurboRoute} turbo_route
   * @returns
   */
  async run(express, turbo_route) {
    const { req, res } = express;

    /**
     * @type {GeneralResponse}
     */
    const gresponse = res.$gresponse;
    
    try {

      if (res.$error) {
        throw gresponse;
        return;
      }

      if (req.$validator_error && req.$validator_errors instanceof Array === true) {
        gresponse.setErrors(req.$validator_errors);
        gresponse.setInfo({
          path: req.route.path,
          method: req.method,
          queries: req.query,
          body: req.body,
        });
        throw gresponse;
      }


      if (typeof this[turbo_route.classmethod] !== "function")
        throw new MyError(
          -1,
          "Type of controller method is not a function.",
          turbo_route
        );

      if (turbo_route.authenticated && !req.user) throw new MyError(
        -1, null, turbo_route, 401, "Not Authenticated"
      )

      const props_controller = {
        files: req.files,
        queries: req.query,
        body: req.body,
        params: req.params,
        cookies: req.$cookies,
        user: req.user,
      };

      const result = await this[turbo_route.classmethod](
        express, // has req and res
        props_controller,
        gresponse,
        turbo_route // turbo route,
      );
      if (result === null || result === false) return;

      
      if (typeof result === "string") {
        res.send(result);
        return;
      }

      if (res.$error) {
        throw gresponse;
        return;
      }

      // ? ~~~~~ if result from controller is object 
      if (typeof result === "object") {
        gresponse.setData(result);
      }

      // ? ~~~~~ if result from controller is undefined
      if (result === undefined) {
        const current_service = pro.Services[turbo_route.service_classname];

        if (current_service) {
          await service_runner(
            current_service,
            turbo_route.service_methodname,
            req,
            res
          );
        } else if (!current_service && turbo_route.service_methodname) {
          gresponse.setResponse(
            500,
            "Service not found with name = " + turbo_route.service_methodname
          );
        }
      }

      this.log_dev(req, res, turbo_route, null);
      gresponse.validate();
      res.status(gresponse.status).json(gresponse);
    } catch (error) {
      if (error instanceof GeneralResponse) {
        if(pro.mode === "development") { logwarn("thrown error - general error") }
        // ! error.validate() if response has status not in the know_error list, then error will be recorded;
        error.validate();
        this.log_dev(req, res, turbo_route, null);
        res.status(error.status).json(error);
      } else if (error instanceof MyError) {
        if(pro.mode === "development") { logwarn("thrown error - myerror") }
        // ! here on production if severirty is -1 or -2 error will be recorded;
        this.log_dev(req, res, turbo_route, error);
        res.status(error.status).json(error.response());
      } else {
        if(pro.mode === "development") { logwarn("thrown error - unknow error") }
        const myerror = new MyError(-1, error.toString(), turbo_route, 500);
        res.status(500).json(myerror.response());
      }
    }
  }
};
