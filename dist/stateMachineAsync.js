"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = StateMachineAsync;
var _react = _interopRequireWildcard(require("react"));
var _react2 = require("@xstate/react");
var sqrl = _interopRequireWildcard(require("squirrelly"));
var _cloneDeep = _interopRequireDefault(require("lodash/cloneDeep"));
var _asyncMachine = require("./asyncMachine");
var _nestedObjectHelpers = require("../../../../src/utils/nestedObjectHelpers");
var _helpers = require("../../../../src/services/helpers");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
/* eslint-disable complexity */

function StateMachineAsync(props) {
  const {
    data,
    datasources = {},
    workflow = []
  } = props;

  // Params from sample-db.json
  const {
    asyncMachineName,
    datasource = '',
    onDoneConditionsArray = [],
    defaultErrorCommandsArray = []
  } = props.component.params;

  // testing

  const machineDatasource = datasources[datasource] || {};
  const {
    method = '',
    config = {}
  } = machineDatasource;
  let {
    url = ''
  } = machineDatasource;
  url = url.replace('{accountId}', window[window.sessionStorage?.tabId].NEW_BAN || '');
  const asyncMachineParams = {
    method,
    baseUrl: url,
    finalUrl: url,
    ...config
  };
  const {
    asyncContent = {}
  } = asyncMachineParams;

  // withContext() is the state machine factory method
  const asyncMachineRef = _asyncMachine.asyncMachine.withContext({
    ..._asyncMachine.asyncMachine.context,
    ...asyncMachineParams,
    machineName: asyncMachineName
  });
  const [newAsyncMachineRef, sendnewAsyncMachine] = (0, _react2.useMachine)(asyncMachineRef);
  (0, _react.useEffect)(() => {
    window[window.sessionStorage?.tabId][asyncMachineName] = newAsyncMachineRef;
    return () => {
      delete window[window.sessionStorage?.tabId][asyncMachineName];
    };
  });

  // adding these functions to the window object so they can be accessed by the executeJavascriptString function
  (0, _react.useEffect)(() => {
    window[window.sessionStorage?.tabId][`send${asyncMachineName}`] = sendnewAsyncMachine;
    return () => {
      delete window[window.sessionStorage?.tabId][`send${asyncMachineName}`];
    };
  });
  (0, _react.useEffect)(() => {
    if (workflow.length > 0 && typeof window[window.sessionStorage?.tabId][`send${asyncMachineName}`] === 'function') {
      workflow.map(item => {
        if (hasOwnProperty.call(item, 'didMountWorkflowData')) {
          const didMountActions = item.didMountWorkflowData;
          didMountActions.map(action => {
            switch (action.action) {
              case 'SET.REQUEST.DATA.KEY':
                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](action.action, action.value);
                break;
              case 'SET.REQUEST.DATA':
                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](action.action, {
                  value: action.value
                });
                break;
              case 'APPEND.REQUEST.DATA':
                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](action.action, {
                  value: action.value
                });
                break;
              case 'SET.URL':
                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](action.action, {
                  value: action.value
                });
                break;
              case 'APPEND.URL':
                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](action.action, {
                  value: action.value
                });
                break;
              default:
                global.console.log('action did not match defined type', item);
            }
            return action;
          });
        }
        return item;
      });
    }
  }, []);
  const template = (input, data) => {
    const html = input;
    return sqrl.Render(html, data || []);
  };
  function createHTML(input) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    if (input === '') {
      return {
        __html: ''
      };
    }
    return {
      __html: template(input, data)
    };
  }
  function AsyncContent(props, data) {
    const {
      containerClassName = '',
      template = ''
    } = props.props;
    return /*#__PURE__*/_react.default.createElement("div", {
      className: containerClassName,
      dangerouslySetInnerHTML: createHTML(template, data)
    });
  }
  const asyncContentExists = asyncContent !== {};
  let asyncContentTemplate = null;
  if (asyncContentExists) {
    asyncContentTemplate = [/*#__PURE__*/_react.default.createElement(AsyncContent, {
      props: asyncContent,
      data: data,
      key: `${asyncMachineName}content`
    })];
  }

  // Needed for IE 11
  function crossBrowserEval(input) {
    if (window[window.sessionStorage?.tabId].execScript) {
      window[window.sessionStorage?.tabId].execScript(input);
      return null;
    }
    return window[window.sessionStorage?.tabId].eval ? window[window.sessionStorage?.tabId].eval(input) : eval(input);
  }
  const {
    response,
    responseStatus,
    loading,
    error,
    payload,
    requestFinished,
    pdfLoaded,
    pdfFileName = 'document.pdf'
  } = newAsyncMachineRef.context;
  const {
    responseData
  } = newAsyncMachineRef.context;
  if (requestFinished && pdfLoaded) {
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      if (typeof responseData?.data === 'string') {
        const byteCharacters = atob(responseData?.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i += 1) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/pdf'
        });
        window.navigator.msSaveOrOpenBlob(blob, pdfFileName);
      }
      sendnewAsyncMachine('RESET');
    } else {
      if (typeof responseData?.data === 'string') {
        const pdfWindow = window.open('', 'pdfWindow');
        pdfWindow?.document?.write(`<iframe width='100%' height='100%' src='data:application/pdf;base64, ${encodeURI(responseData?.data)}'></iframe>`);
      }
      sendnewAsyncMachine('RESET');
    }
  }
  function isJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Example:
  // let conditionsArray = [{fieldKey: "card", assertValue: "valid"}]

  // Needs support for arrays as well as objects
  function shouldExecute() {
    let dataToCheck = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    let conditionsArray = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let operand = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'AND';
    // If dataToCheck & conditionsArray exist, map through the conditions array and compare the data to the expected value.
    // This will return an array of true or false values.
    // Filter this array to get all the false values only.
    // If the number of false values is 0 (filter....length === 0), all conditions are met. If the number of false values is not 0, then not all conditions are met.
    if (dataToCheck && conditionsArray) {
      const trueFalseArray = conditionsArray.map(item => {
        let finalDataToCheck = (0, _cloneDeep.default)(dataToCheck);
        if (Object.prototype.hasOwnProperty.call(item, 'datasource')) {
          const datasourceID = `datasource_${item.datasource.id}`;
          finalDataToCheck = window[window.sessionStorage?.tabId].alasql.tables[datasourceID];
        }
        if (Object.prototype.hasOwnProperty.call(item, 'assertValue')) {
          if (isJson(finalDataToCheck.message)) {
            return true;
          }
          if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) !== item.assertValue) {
            return false;
          }
          return true;
        }
        // Equals
        // remvoing json check, not sure why it exists - but didnt want to break anything, so created a new condition.
        if (Object.prototype.hasOwnProperty.call(item, 'equals')) {
          if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) === item.equals) {
            return true;
          }
          return false;
        }
        // Not Equals
        if (Object.prototype.hasOwnProperty.call(item, 'notEquals')) {
          if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) !== item.notEquals) {
            return true;
          }
          return false;
        }

        // Includes
        if (Object.prototype.hasOwnProperty.call(item, 'includes')) {
          if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey).includes(item.includes)) {
            return true;
          }
          return false;
        }
        if (Object.prototype.hasOwnProperty.call(item, 'hasKey')) {
          if (Object.prototype.hasOwnProperty.call((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey), item.hasKey)) {
            return true;
          }
          return false;
        }
        if (Object.prototype.hasOwnProperty.call(item, 'doesNotHaveKey')) {
          if (Object.prototype.hasOwnProperty.call((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey), item.doesNotHaveKey)) {
            return true;
          }
          return false;
        }
        if (Object.prototype.hasOwnProperty.call(item, 'operator')) {
          switch (item.operator.operand) {
            case 'gt':
              if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) > item.operator.value) {
                return true;
              }
              return false;
            case 'gte':
              if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) >= item.operator.value) {
                return true;
              }
              return false;
            case 'lt':
              if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) < item.operator.value) {
                return true;
              }
              return false;
            case 'lte':
              if ((0, _nestedObjectHelpers.getNestedObject)(finalDataToCheck, item.fieldKey) <= item.operator.value) {
                return true;
              }
              return false;
            default:
              return false;
          }
        }
      });
      if (operand === 'AND') {
        return trueFalseArray.filter(item => item === false).length === 0;
      }
      if (operand === 'OR') {
        return trueFalseArray.filter(item => item === true).length > 0;
      }
    }
    // If data or conditionsArray don't exist, return false.
    return false;
  }
  if (requestFinished) {
    // let condArray = [
    //   {
    //    conditions: [{fieldKey: "paymentCard.cardHolderName", assertValue: "success"}],
    //    stateMachineCommands: [{"windowFunction": "sendacceptPaymentAsyncMachine4", "commandString": "SET.REQUEST.DATA", "responseDataNestedKey": ""}, {"windowFunction": "sendacceptPaymentAsyncMachine4", "commandString": "FETCH"}]
    //   },
    //   {
    //    conditions: [{fieldKey: "paymentCard.cardHolderName", assertValue: "failure"}],
    //    stateMachineCommands: [{"windowFunction": "sendacceptPaymentModal", "commandString": "SEND.PAYLOAD", "responseDataNestedKey": ""}, {"windowFunction": "sendacceptPaymentModal", "commandString": "OPEN"}]
    //   },
    // ]

    // TODO: keep a stack of async await instead of setTimeout
    const responseDataObject = {
      ...responseData,
      status: responseStatus
    };
    let conditionMet = false;
    onDoneConditionsArray.map(cond => {
      let executeCond = false;
      // if the subConditions use OR, return true if at least one of the conditions is true
      if (hasOwnProperty.call(cond, 'conditions')) {
        cond.conditions.map(item => {
          if (hasOwnProperty.call(item, 'OR')) {
            executeCond = shouldExecute(responseDataObject, item.OR, 'OR');
          } else if (hasOwnProperty.call(item, 'AND')) {
            executeCond = shouldExecute(responseDataObject, item.AND, 'AND');
          } else {
            executeCond = shouldExecute(responseDataObject, cond.conditions);
          }
        });
      }
      if (executeCond) {
        if (cond.stateMachineCommands && cond.stateMachineCommands.length > 0) {
          cond.stateMachineCommands.map(command => {
            const delay = Object.prototype.hasOwnProperty.call(command, 'delay') ? command.delay : 0;
            if (Object.prototype.hasOwnProperty.call(command, 'responseDataNestedKey')) {
              setTimeout(function () {
                (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, (0, _nestedObjectHelpers.getNestedObject)(responseDataObject, command.responseDataNestedKey), Object.prototype.hasOwnProperty.call(command, 'reduxActionType') ? command.reduxActionType : null, Object.prototype.hasOwnProperty.call(command, 'reduxActionPayload') ? command.reduxActionPayload : null);
              }, delay);
            } else if (Object.prototype.hasOwnProperty.call(command, 'responseData')) {
              (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, responseData, Object.prototype.hasOwnProperty.call(command, 'reduxActionType') ? command.reduxActionType : null, Object.prototype.hasOwnProperty.call(command, 'reduxActionPayload') ? command.reduxActionPayload : null);
              conditionMet = true;
            }
            // Send Payload
            else if (Object.prototype.hasOwnProperty.call(command, 'sendPayload')) {
              setTimeout(function () {
                (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, response);
              }, delay);
              conditionMet = true;
            } else if (Object.prototype.hasOwnProperty.call(command, 'log')) {
              setTimeout(function () {
                console.log((0, _nestedObjectHelpers.getNestedObject)(responseDataObject, command.responseDataNestedKey));
              }, delay);
              conditionMet = true;
            } else {
              setTimeout(function () {
                (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, null, Object.prototype.hasOwnProperty.call(command, 'reduxActionType') ? command.reduxActionType : null, Object.prototype.hasOwnProperty.call(command, 'reduxActionPayload') ? command.reduxActionPayload : null);
              }, delay);
            }
          });
        }
        conditionMet = true;
      }
    });
    if (conditionMet === false) {
      defaultErrorCommandsArray.map(command => {
        const delay = Object.prototype.hasOwnProperty.call(command, 'delay') ? command.delay : 0;
        if (Object.prototype.hasOwnProperty.call(command, 'responseDataNestedKey')) {
          (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, (0, _nestedObjectHelpers.getNestedObject)(responseDataObject, command.responseDataNestedKey), Object.prototype.hasOwnProperty.call(command, 'reduxActionType') ? command.reduxActionType : null, Object.prototype.hasOwnProperty.call(command, 'reduxActionPayload') ? command.reduxActionPayload : null);
          conditionMet = true;
        } else if (Object.prototype.hasOwnProperty.call(command, 'responseData')) {
          (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, responseData, Object.prototype.hasOwnProperty.call(command, 'reduxActionType') ? command.reduxActionType : null, Object.prototype.hasOwnProperty.call(command, 'reduxActionPayload') ? command.reduxActionPayload : null);
          conditionMet = true;
        } else if (Object.prototype.hasOwnProperty.call(command, 'log')) {
          console.log((0, _nestedObjectHelpers.getNestedObject)(responseDataObject, command.responseDataNestedKey));
          conditionMet = true;
        } else {
          (0, _helpers.sendStateMachineCommand)(command.windowFunction, Object.prototype.hasOwnProperty.call(command, 'commandString') ? command.commandString : null, null, Object.prototype.hasOwnProperty.call(command, 'reduxActionType') ? command.reduxActionType : null, Object.prototype.hasOwnProperty.call(command, 'reduxActionPayload') ? command.reduxActionPayload : null);
          conditionMet = true;
        }
      });
    }
  }
  let {
    children
  } = props;
  if (children !== false) {
    children = _react.default.Children.map(children, child => {
      return /*#__PURE__*/_react.default.cloneElement(child, {
        responseData,
        loading,
        error,
        payload
      });
    });
  }
  return /*#__PURE__*/_react.default.createElement("div", {
    className: "state-machine-async"
  }, asyncContentExists && asyncContentTemplate, children);
}
module.exports = exports.default;