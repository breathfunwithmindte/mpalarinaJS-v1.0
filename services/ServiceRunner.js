const MyError = require("../types/MyError");
const ValidationError = require("../types/ValidationError");

module.exports = {

  /**
   * @doc primary service runner - run the service used in Rest/Veiw -- Controllers ... not in the parent Controller;
   * @param {class} Service 
   * @param {string} service_method 
   * @returns 
   */
  service_runner: async function (Service, service_method, req, res)
  {
    if(!Service) throw new MyError(-1, "Not Service");
    if(!service_method || service_method === "none") return 0;
    if(typeof Service[service_method] !== "function") throw new MyError(-1, "Service method is not a function", {
      service_method: service_method
    });
    const result = await Service[service_method](req.$service_props || {
      queries: { ...req.query, ...req.params }, formstate: req.body, req, res, gresponse: res.$gresponse, populate: req.$populate || undefined
    });
    // if(result["service_error"]) {
    //   pro.logs.logerr("Service error " + result.description)
    //   res.$gresponse.setResponse(400, "Oups !! Something went wrong.")
    //   res.$gresponse.setErrors([new ValidationError("service", result["field"] || "unknow", result.description)])
    // }
    // if(result) {

    // }
    res.$gresponse.setData(result);
    return 0;
  }

}