const GenericResponse = require("./GenericResponse");
const ValidationError = require("./ValidationError");

module.exports = class GeneralResponse extends GenericResponse {
  /**
   * @type {ValidationError[]} errors;
   */
  errors = new Array();

  /**
   * @type {Number} total_errors;
   */
  total_errors = 0;

  /**
   * @type {Object?} info
   */
  info;

  /**
   * @type {String | null} page_view;
   */
  #page_view = null;

  #layout_view = "index";
  #view_validation_on = true;

  /**
   * @param {Number} status
   * @param {String} message
   * @param {ValidationError[]} errors
   */
  constructor(status = 200, message = "ok", errors = [], info) {
    super(status, message, errors.length !== 0);

    if (errors.length > 0) {
      this.errors = errors;
      this.total_errors = errors.length;
    }

    if (info) {
      this.setInfo(info);
    }
  }

  /**
   * @param {Object?} info
   */
  setInfo(info) {
    for (const key in info) {
      if (Object.hasOwnProperty.call(info, key)) {
        this[key] = info[key];
      }
    }
  }

  /**
   * @param {ValidationError} error
   * @param {Number?} status
   * @param {String?} message
   */
  addError(error, status, message) {
    if (this.errors.length === 0) {
      this.errors.push(error);
      this.#default_enable_error(status, message);
    } else {
      this.errors.push(error);
    }
  }
  /**
   * @param {ValidationError[]} errors
   * @param {Number?} status
   * @param {String?} message
   */
  setErrors(errors, status, message) {
    if(errors instanceof Array === false) return;
    this.errors = errors;
    this.#default_enable_error(status, message);
  }

  validate () {
    this.validate_status();
    if(this.errors && this.errors.length === 0) {
      delete this.total_errors;
      delete this.errors;
    }
  }

  setView (view_string) {
    if(typeof view_string !== "string") return;
    const parts = view_string.split("#");
    if(typeof view_string !== "string") {
      this.#layout_view = "index"; this.#page_view = this.status.toString();
    } else if (parts.length > 1) {
      this.#layout_view = parts[0]; this.#page_view = parts[1];
    } else {
      this.#layout_view = "index"; this.#page_view = parts[0];
    }
  }

  setPageView (page_view_prop) { this.#page_view = page_view_prop; }

  /**
   * @param {Boolean} boolean_prop 
   */
  setView_validation_on (boolean_prop) { this.#view_validation_on = boolean_prop; };
  getView_validation_on () { return this.#view_validation_on; }

  validatePageView(config) {
    console.log(this.#view_validation_on, this.error, "@@@")
    if(this.#view_validation_on === false) return;
    if(this.error === false) return;
    if(config[this.status]) {
      this.#page_view = config[this.status];
    }
  }

  getLayoutView() {
    return { layout_view: this.#layout_view, page_view: this.#page_view }
  }

  setLayout (layout_string) {
    this.#layout_view = layout_string;
  }

  /**
   * @param {Number?} status
   * @param {String?} message
   */
  #default_enable_error(status = 400, message = "Oups!! Bad Request format.") {
    this.error = true;
    this.status = status;
    this.message = message;
    if(this.errors.length > 0) { this.total_errors = this.errors.length }
  }

  
};

