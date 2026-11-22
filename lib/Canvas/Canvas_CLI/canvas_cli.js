#!/usr/bin/env node
/**
 * Script Name:    Canvas_CLI/canvas_cli.js
 * Description:    Forwarding wrapper for Universal Canvas CLI in Lib_JS/Canvas.
 * Version:        1.0.0
 * Date Created:   2026-11-21
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

module.exports = require('../canvas_cli.js');

if (require.main === module) {
  const cli = require('../canvas_cli.js');
  const code = cli.main(process.argv);
  process.exit(code);
}
