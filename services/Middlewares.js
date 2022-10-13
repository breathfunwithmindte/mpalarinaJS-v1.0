const Validator = require("../utils/validator");
const TurboRoute = require("../types/TurboRoute");
const ejs = require("ejs");
const GeneralResponse = require("../types/GeneralResponse");
const MyError = require("../types/MyError");

/**
 * @primary middleware that checking the request current schema, and pass data to the validator ... (if error and send response happens inside the controller not here);
 * @param {Request} req 
 * @param {Response} res 
 * @param {import("express").NextFunction} next 
 * @param {TurboRoute} turbo_route 
 * @doc the first thing that happens on each request, is to set the default data to the Request req instance;
 * ! serius performance issues ... this logic should be rebuild somehow ...
 * @todo // todo split this initial setup to 2 different middlewares ... remove unused parts for each controller for better performance;
 * @returns 
 */
exports["primary_middleware"] = function (req, res, next, turbo_route) {
  
  res.$gresponse = new GeneralResponse(req.method ? (req.method.toLowerCase() === "post" ? 201 : 200) : 200); // General Response;
  
  res.$mprender = mprender;
  res.$mpdebugrender = mpdebugrender;

  req.$views = { 400: "400", 401: "401", 500: "500", 404: "404", 200: "200" }; 

  req.$savefilesync = savefilesync;
  
  req.$cookies = getCookies(req.headers["cookie"])
  if(!turbo_route.schema)
  {
    next();
    return;
  }
  req.$validator_errors = new Array(); // only if there is a schema we need this array;

  if(turbo_route.schema.view) { res.$view = turbo_route.schema.view; }
  if(turbo_route.schema.views) { req.$views = turbo_route.schema.views; }

  if (turbo_route.schema.query) {

    const result_queries = Validator(turbo_route.schema.query, req.query, "queries");
    if(result_queries.errors.length > 0) {
      req.$validator_error = true;
      result_queries.errors.map(i => req.$validator_errors.push(i));
    }
    req.query = result_queries.data;

  } else {
    req.query = req.query;
  }

  if (turbo_route.schema.body) {

    const result_body = Validator(turbo_route.schema.body, req.body || {}, "body");
    if(result_body.errors.length > 0) {
      req.$validator_error = true;
      result_body.errors.map(i => req.$validator_errors.push(i));
    }
    req.body = result_body.data;

  } else {
    req.body = req.body;
  }

  next();

}



/**
 * @param {String | undefined} cookie_string;
 */
function getCookies (cookie_string)
{
  if(!cookie_string) return new Object();
  const cookies = new Object();
  const key_value_pairs = cookie_string.split(";").map(i => i.trim());
  key_value_pairs.map(p => {
    const [k, v] = p.split("=").map(i => i.trim());
    cookies[k] = v || "";
  })
  return cookies;
}

function savefilesync (file, body, key) {
  try {
    require("fs").writeFileSync(`${pro.root}/storage/${file.name}`, file.data);
    body[key || "file"] = file.name;
    return 0;
  } catch (err) {
    console.log(err);
    console.log("make sure you have a folder /storage in your root directory.")
    return -1;
  }
}

/**
 * @param {*} req 
 * @param {*} res 
 * @param {*} turbo_route 
 * @param {String} view_string 
 * @param {MyError} error 
 */
function mpdebugrender (req, res, turbo_route, layout_view, error) {
  
  if(error.severity === -1 || error.severity === -2) {

    if(pro.mode === "development") {
      res.render("pages/system_pages/mp_error", { gstate: { turbo_route, error } });
      return;
    } else {
      res.send(actual_render(layout_view, error.status.toString(), error.response()));
      return;
    }

  } else {

      return res.send(actual_render(layout_view, error.status.toString(), { ...error.response() }));
      

  }
}

function mprender (req, res, turbo_route, page_view_prop) {
    /**
    * @type {GeneralResponse}
    */
    const gresponse = res.$gresponse;

    const { layout_view, page_view } = gresponse.getLayoutView();

    console.log(page_view);


    if(!page_view) {
      console.log("weeeee are here in ifffffffffffff", res.$view)
      return res.send(actual_render(layout_view, page_view_prop, gresponse));
    }

    return res.send(actual_render(layout_view, page_view, gresponse));

}

function actual_render (layout_view, page_view, gstate) {
  console.log(page_view, "########################@@@@@@@@@@@@@")
  try {
    let current_layout = pro.Layouts.get(layout_view);
    if(!current_layout) return "Layout not found";

    current_layout = current_layout.replace("%%yield%%", pro.Views.get(page_view));
  
    let template = ejs.compile(current_layout, {
      root: [
        `${root}${mpapp.view_path}/`,
        `${root}${mpapp.view_path}/turbo_components/`, 
        `${root}${mpapp.view_path}/components/`
      ]
    })

    return template({ gstate: gstate });

  } catch (err) {
    return "error actual render" + err.toString()
  }

}
