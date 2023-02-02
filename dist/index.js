"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _stateMachineAsync = _interopRequireDefault(require("./stateMachineAsync"));
var _stateMachineAsync2 = require("./stateMachineAsync.schema");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _default = {
  component: _stateMachineAsync.default,
  schema: _stateMachineAsync2.schema,
  ui: _stateMachineAsync2.ui
};
exports.default = _default;
module.exports = exports.default;