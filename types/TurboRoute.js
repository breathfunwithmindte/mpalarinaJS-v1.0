module.exports = class TurboRoute {

  path = String;
  classmethod = String;
  http_method = String;
  schema_name = String;
  controller_method = String;
  service_classname = String;
  service_methodname = String;
  schema_classname = String;
  authenticated = false;
  schema = null;
  pre_path;

  constructor (class_api_method_name, classname, pre_path, authenticated)
  {
    const { method, path, service_name, schema_name } = this.#prepare_obj_config(class_api_method_name);
    this.classname = classname;
    this.classmethod = class_api_method_name;
    this.http_method = method;
    this.path = path;
    this.schema_name = schema_name;
    this.#setService(service_name);
    this.#setSchema();
    this.pre_path = pre_path;
    this.authenticated = authenticated || false;

  }

  #setService (service_name)
  {
    const parts = service_name.split("#")
    this.service_classname = parts.length > 1 ? parts[0] : this.classname;
    if(service_name === ".") {
      this.service_methodname = null;
      return;
    }
    this.service_methodname = parts.length > 1 ? parts[1] : parts[0];
  }
  #setSchema()
  {
    this.schema_classname = this.classname;
    if(this.schema_name === ".") return;
    if(this.schema_name === "..") {
      this.schema_name = "null";
      this.schema = { query: {}, body: {} }
      return;
    }
    if(this.schema_name.split("#").length > 1) {
      const [schema_classname, schema_objname] = this.schema_name.split("#").map(i => i.trim());
      if(!pro.SchemaList.get(schema_classname)) return;
      this.schema_name = schema_objname;
      this.schema_classname = schema_classname;
      this.schema = pro.SchemaList.get(schema_classname)[schema_objname];
    }else{
      if(!pro.SchemaList.get(this.classname)) return;
      this.schema = pro.SchemaList.get(this.classname)[this.schema_name];
    }
  }

  #prepare_obj_config (string)
  {
    const clear_string = string.substring(1, string.length);
    const params = clear_string.split("---");

    const method = params[0] ? params[0] : "get";
    const path = params[1] ? params[1] : "/";
    const service_name = params[2] || null;
    const schema_name = params[3] || null
    return {
      method, path, service_name, schema_name
    }
  }

  log() 
  {
    return {
      path: this.http_method + "::" + "/" + this.pre_path + this.path,
      classname: this.classname, 
      servicename_method: this.service_classname + "_" + this.service_methodname,
      has_schema: this.schema ? true : false
    }
  }

  getFullpath ()
  {
    if(this.pre_path === "") return this.path;
    return "/" + this.pre_path + this.path;
  }

  getSchemaName ()
  {
    return this.schema_classname + " # " + this.schema_name;
  }

}