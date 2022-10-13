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
  controller_type = "rest"

  /**
   * @interface - you can override this default behaviour of a rest controller;
   * @doc - controller error handler
   * @param {*} error - Enum(GeneralResponse | MyError | Any)
   * @param {Object} req - http request instance
   * @param {Object} res - http response instance 
   * @param {TurboRoute} turbo_route 
   * @returns 
   */
  error_handler_rest (error, req, res, turbo_route)
  {
    if(error instanceof GeneralResponse) {
      error.validate();
      if(pro.mode === "development") { logwarn("[ERR] 'GeneralResponse' - status=" + error.status) }
      res.status(error.status).json(error);
      this.log_dev(req, res, turbo_route, null)
      return;
    }

    if(error instanceof MyError) {
      if(pro.mode === "development") { logwarn("[ERR] 'MyError' - status=" + error.status) }
      // ! here on production if severirty is -1 or -2 error will be recorded;
      this.log_dev(req, res, turbo_route, error);
      res.status(error.status).json(error.response());
      return;
    }

    // ? try to avoid this kind of errors;
    if(pro.mode === "development") { logwarn("[ERR] 'unknown' - msg=" + error?.toString()) }
    const myerror = new MyError(-1, error?.toString(), turbo_route, 500);
    res.status(500).json(myerror.response());
  
  }

  error_handler_view ()
  {

  }

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

      // ? unsure why this exist ... will implement something later;
      if (res.$error) {
        throw gresponse;
        return;
      }

      // primary validation stuff of a controller;
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

      if (typeof this[turbo_route.classmethod] !== "function") {
        throw new MyError(
          -1,
          "Type of Controller method is not a function.",
          turbo_route
        );
      }

      if (pro.Services[turbo_route.pre_service_classname]) {
        await service_runner(
          pro.Services[turbo_route.pre_service_classname],
          turbo_route.pre_service_methodname,
          req,
          res
        );
      } else if (!pro.Services[turbo_route.pre_service_classname] && turbo_route.pre_service_methodname) {
        gresponse.setResponse(
          500,
          "Pre Service not found with name = " + turbo_route.pre_service_classname
        );
      }
      

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
      res.status(gresponse.status || 500).json(gresponse);
    } catch (error) {
      this.error_handler_rest(error, req, res, turbo_route);
    }
  }
};
