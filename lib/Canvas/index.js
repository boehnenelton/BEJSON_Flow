/**
 * Index:          Lib_JS/Canvas
 * Family:         Canvas
 * Description:    Entry point re-exporting the Canvas core, errors, schemas, and templates modules.
 * Version:        1.2.0
 * RELATIONAL_ID:  d4129b7a-81c4-4e3f-9d1a-5f0c82e7b931
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 */
'use strict';
module.exports = {
  ...require('./lib_bejson_Canvas_errors.js'),
  ...require('./lib_bejson_canvas_core.js'),
  ...require('./lib_bejson_Canvas_canvas_schemas.js'),
  ...require('./lib_bejson_Canvas_canvas_templates.js'),
  CanvasCLI: require('./canvas_cli.js')
};
