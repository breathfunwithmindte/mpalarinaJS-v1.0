const Controller = require("./Controller");
const Validator = require("../utils/validator");
const { service_runner } = require("../services/ServiceRunner");
const GeneralResponse = require("../types/GeneralResponse");
const MyError = require("../types/MyError");
const TurboRoute = require("../types/TurboRoute");
const { logwarn } = require("../utils/logs");
const ejs = require("ejs");

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

  error_handler_rest (error, req, res, turbo_route)
  {
    if(error instanceof GeneralResponse) {
      error.validate();
      if(pro.mode === "development") { logwarn("[ERR] 'GeneralResponse' - status=" + error.status) }
      this.render(res, error, error);
      this.log_dev(req, res, turbo_route, null)
      return;
    }

    if(error instanceof MyError) {
      if(pro.mode === "development") { logwarn("[ERR] 'MyError' - status=" + error.status) }
      // ! here on production if severirty is -1 or -2 error will be recorded;
      this.log_dev(req, res, turbo_route, error);
      this.render(res, res.$gresponse, error.response());
      return;
    }

    if(pro.mode === "development") { logwarn("[ERR] 'unknown' - msg=" + error?.toString()) }
    const myerror = new MyError(-1, error?.toString(), turbo_route, 500);
    this.render(res, res.$gresponse, myerror.response());
  }


  /**
   *
   * @param {*} express
   * @param {TurboRoute} turbo_route
   * @returns
   */
  async run(express, turbo_route) {
    const { req, res } = express;
    /** @type {GeneralResponse} */
    const gresponse = res.$gresponse;

    try {
      // ? unsure why this exist ... will implement something later;
      if (res.$error) {throw gresponse;}

      if (req.$validator_error && req.$validator_errors instanceof Array === true) this.on_validation_error(req, gresponse);

      await this.run_preservice(turbo_route, req, res);

      const result = await this[turbo_route.classmethod](
        express,
        { files: req.files, queries: req.query, body: req.body, params: req.params, cookies: req.$cookies, user: req.user },
        gresponse, turbo_route 
      );
      if (result === null || result === false) return;
      if (typeof result === "string") { gresponse.setView(result); }
      if (typeof result === "object") gresponse.setData(result);
      if (result === undefined) await this.run_service(turbo_route, req, res);

      gresponse.validate();

      this.auto_detect_view(gresponse, turbo_route);

      this.render(res, gresponse, gresponse)

    } catch (error) {
      this.error_handler_rest(error, req, res, turbo_route);
    }
  }

  /**
   * @param {HttpResponse} res - http response instance;
   * @param {GeneralResponse} gresponse 
   * @returns 
   */
  render (res, gresponse, gstate) {
    try {
      let current_layout = pro.Layouts.get(gresponse.getLayout());
      if(!current_layout) return res.send("Layout not found");
  
      current_layout = current_layout.replace("%%yield%%", pro.Views.get(gresponse.getView()));
    
      let template = ejs.compile(current_layout, {
        root: [
          `${root}${mpapp.view_path}/`,
          `${root}${mpapp.view_path}/turbo_components/`, 
          `${root}${mpapp.view_path}/components/`
        ]
      })
      // maybe deep clone ? JSON.parse(JSON.stringify(gstate))
      return res.send(template({ gstate: gstate, gresponse: gresponse }));
  
    } catch (err) {
      return res.send("error actual render" + err.toString())
    }
  }

  /**
   * @param {GeneralResponse} gresponse 
   * @param {TurboRoute} turbo_route 
   */
  auto_detect_view (gresponse, turbo_route)
  {
    console.log(gresponse.getView());
    console.log(this.name);
    console.log(turbo_route.turbo_name);
  }


};
