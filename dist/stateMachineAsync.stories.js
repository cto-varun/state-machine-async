"use strict";

var _react = _interopRequireDefault(require("react"));
var _react2 = require("@storybook/react");
var _addonKnobs = require("@storybook/addon-knobs");
var _componentLoader = require("../../component-loader");
var _knobs = require("../../component-loader/dist/knobs");
var _dist = require("../dist");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
(0, _componentLoader.mock)();
(0, _react2.storiesOf)('State Machine Async', module).addDecorator(_addonKnobs.withKnobs).add('Basic demo', () => {
  const props = {
    url: _knobs.staticURL,
    properties: {},
    datasource: _knobs.staticDatasource
  };
  const C = _dist.component;
  return /*#__PURE__*/_react.default.createElement(_componentLoader.SandboxComponent, _extends({
    component: C
  }, props));
});