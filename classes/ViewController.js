const Controller = require("./Controller");
const Validator = require("../utils/validator");
const { service_runner } = require("../services/ServiceRunner");
const GeneralResponse = require("../types/GeneralResponse");
const MyError = require("../types/MyError");
const TurboRoute = require("../types/TurboRoute");

/**
 * @doc
 * req.$views { 404: 404, 401: login } match the status with the page;
 * req.$view { the default page is controller send undefined; } 
 * 
 * @case if gresponse is throwed && gresponse.error = true; --> SEND PAGE BY STATUS
 * @case if controller send undefined --> SEND res.$view;
 * @case if controller send string --> update res.$view --> SEND res.$view;
 * 
 * @case // ! controller can make changes to the upper logic;
 * 
 * @doc // ! MyError send always page by status || mp_debug page
 * 
 */

module.exports = class ViewController extends Controller {
  static restapi = false;
  static response_type = "text/html";
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

      gresponse.setView(res.$view); // default behavior;
      console.log(gresponse.getLayoutView(), "#############33 !!!!!!!!!!! 11111;")
      // !debug console.log(gresponse.getLayoutView(), "initial");

      if (req.$validator_error) {
        gresponse.setErrors(req.$validator_errors);
        gresponse.setInfo({
          path: req.route.path,
          method: req.method,
          queries: { ...req.params, ...req.queries, ...req.$params, ...req.$queries },
          body: { ...req.body, ...req.$body }
        });
        throw gresponse;
      }

      if (typeof this[turbo_route.classmethod] !== "function")
        throw new MyError(
          -1,
          "Type of controller method is not a function.",
          turbo_route
        );

      if (turbo_route.authenticated && !req.user)
        throw new MyError(1, null, turbo_route, 401, "Not Authenticated");

      const props_controller = {
        files: req.files,
        queries: req.$queries,
        body: req.$body,
        params: req.$params,
        cookies: req.$cookies,
        user: req.user,
      };

      const result = await this[turbo_route.classmethod](
        express, // has req and res
        props_controller,
        gresponse,
        turbo_route // turbo route,
      );

      if(result === null || result === false) return;

      // ! run service ;
      const current_service = pro.Services[turbo_route.service_classname];
      if (current_service) {
        await service_runner(
          current_service,
          turbo_route.service_methodname,
          req,
          res
        );
      } else if (!current_service && turbo_route.service_methodname) {
        throw new MyError(-1, "Service not found with name = " + turbo_route.service_methodname, turbo_route);
      }

      if (typeof result === "string") {
        gresponse.setView(result);
      } 
      // this.log_dev(req, res, turbo_route, null);
      gresponse.validate();
      res.$mprender(req, res, turbo_route);


    } catch (error) {
      if (error instanceof GeneralResponse) {
        gresponse.validate();
        gresponse.validatePageView(req.$views); // on throw gresponse it is always run this validate view method;
        res.$mprender(req, res, turbo_route);
      } else if (error instanceof MyError) {
        //this.log_dev(req, res, turbo_route, error);
        res.$mpdebugrender(req, res, turbo_route, "index", error);
      } else {
        const myerror = new MyError(-1, error.toString(), turbo_route, 500, "je;;pw asdasd");
        res.$mpdebugrender(req, res, turbo_route, "index", myerror);
      }
    }
  }
};
