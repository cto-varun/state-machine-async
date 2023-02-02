/* eslint-disable complexity */
import React, { useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import * as sqrl from 'squirrelly';
import cloneDeep from 'lodash/cloneDeep';
import { asyncMachine } from './asyncMachine';
import { getNestedObject } from '../../../../src/utils/nestedObjectHelpers';
import { sendStateMachineCommand } from '../../../../src/services/helpers';

export default function StateMachineAsync(props) {
    const { data, datasources = {}, workflow = [] } = props;

    // Params from sample-db.json
    const {
        asyncMachineName,
        datasource = '',
        onDoneConditionsArray = [],
        defaultErrorCommandsArray = [],
    } = props.component.params;

    // testing

    const machineDatasource = datasources[datasource] || {};

    const { method = '', config = {} } = machineDatasource;
    let { url = '' } = machineDatasource;
    url = url.replace('{accountId}', window[window.sessionStorage?.tabId].NEW_BAN || '');

    const asyncMachineParams = {
        method,
        baseUrl: url,
        finalUrl: url,
        ...config,
    };

    const { asyncContent = {} } = asyncMachineParams;

    // withContext() is the state machine factory method
    const asyncMachineRef = asyncMachine.withContext({
        ...asyncMachine.context,
        ...asyncMachineParams,
        machineName: asyncMachineName,
    });

    const [newAsyncMachineRef, sendnewAsyncMachine] = useMachine(
        asyncMachineRef
    );

    useEffect(() => {
        window[window.sessionStorage?.tabId][asyncMachineName] = newAsyncMachineRef;

        return () => {
            delete window[window.sessionStorage?.tabId][asyncMachineName];
        };
    });

    // adding these functions to the window object so they can be accessed by the executeJavascriptString function
    useEffect(() => {
        window[window.sessionStorage?.tabId][`send${asyncMachineName}`] = sendnewAsyncMachine;

        return () => {
            delete window[window.sessionStorage?.tabId][`send${asyncMachineName}`];
        };
    });

    useEffect(() => {
        if (
            workflow.length > 0 &&
            typeof window[window.sessionStorage?.tabId][`send${asyncMachineName}`] === 'function'
        ) {
            workflow.map((item) => {
                if (hasOwnProperty.call(item, 'didMountWorkflowData')) {
                    const didMountActions = item.didMountWorkflowData;
                    didMountActions.map((action) => {
                        switch (action.action) {
                            case 'SET.REQUEST.DATA.KEY':
                                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](
                                    action.action,
                                    action.value
                                );
                                break;
                            case 'SET.REQUEST.DATA':
                                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](
                                    action.action,
                                    { value: action.value }
                                );
                                break;
                            case 'APPEND.REQUEST.DATA':
                                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](
                                    action.action,
                                    { value: action.value }
                                );
                                break;
                            case 'SET.URL':
                                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](
                                    action.action,
                                    { value: action.value }
                                );
                                break;
                            case 'APPEND.URL':
                                window[window.sessionStorage?.tabId][`send${asyncMachineName}`](
                                    action.action,
                                    { value: action.value }
                                );
                                break;
                            default:
                                global.console.log(
                                    'action did not match defined type',
                                    item
                                );
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

    function createHTML(input, data = []) {
        if (input === '') {
            return { __html: '' };
        }
        return { __html: template(input, data) };
    }

    function AsyncContent(props, data) {
        const { containerClassName = '', template = '' } = props.props;
        return (
            <div
                className={containerClassName}
                dangerouslySetInnerHTML={createHTML(template, data)}
            />
        );
    }

    const asyncContentExists = asyncContent !== {};
    let asyncContentTemplate = null;

    if (asyncContentExists) {
        asyncContentTemplate = [
            <AsyncContent
                props={asyncContent}
                data={data}
                key={`${asyncMachineName}content`}
            />,
        ];
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
        pdfFileName = 'document.pdf',
    } = newAsyncMachineRef.context;

    const { responseData } = newAsyncMachineRef.context;

    if (requestFinished && pdfLoaded) {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            if (typeof responseData?.data === 'string') {
                const byteCharacters = atob(responseData?.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i += 1) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                window.navigator.msSaveOrOpenBlob(blob, pdfFileName);
            }
            sendnewAsyncMachine('RESET');
        } else {
            if (typeof responseData?.data === 'string') {
                const pdfWindow = window.open('', 'pdfWindow');
                pdfWindow?.document?.write(
                    `<iframe width='100%' height='100%' src='data:application/pdf;base64, ${encodeURI(
                        responseData?.data
                    )}'></iframe>`
                );
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
    function shouldExecute(
        dataToCheck = null,
        conditionsArray = null,
        operand = 'AND'
    ) {
        // If dataToCheck & conditionsArray exist, map through the conditions array and compare the data to the expected value.
        // This will return an array of true or false values.
        // Filter this array to get all the false values only.
        // If the number of false values is 0 (filter....length === 0), all conditions are met. If the number of false values is not 0, then not all conditions are met.
        if (dataToCheck && conditionsArray) {
            const trueFalseArray = conditionsArray.map((item) => {
                let finalDataToCheck = cloneDeep(dataToCheck);
                if (Object.prototype.hasOwnProperty.call(item, 'datasource')) {
                    const datasourceID = `datasource_${item.datasource.id}`;
                    finalDataToCheck = window[window.sessionStorage?.tabId].alasql.tables[datasourceID];
                }
                if (Object.prototype.hasOwnProperty.call(item, 'assertValue')) {
                    if (isJson(finalDataToCheck.message)) {
                        return true;
                    }
                    if (
                        getNestedObject(finalDataToCheck, item.fieldKey) !==
                        item.assertValue
                    ) {
                        return false;
                    }
                    return true;
                }
                // Equals
                // remvoing json check, not sure why it exists - but didnt want to break anything, so created a new condition.
                if (Object.prototype.hasOwnProperty.call(item, 'equals')) {
                    if (
                        getNestedObject(finalDataToCheck, item.fieldKey) ===
                        item.equals
                    ) {
                        return true;
                    }
                    return false;
                }
                // Not Equals
                if (Object.prototype.hasOwnProperty.call(item, 'notEquals')) {
                    if (
                        getNestedObject(finalDataToCheck, item.fieldKey) !==
                        item.notEquals
                    ) {
                        return true;
                    }
                    return false;
                }

                // Includes
                if (Object.prototype.hasOwnProperty.call(item, 'includes')) {
                    if (
                        getNestedObject(
                            finalDataToCheck,
                            item.fieldKey
                        ).includes(item.includes)
                    ) {
                        return true;
                    }
                    return false;
                }
                if (Object.prototype.hasOwnProperty.call(item, 'hasKey')) {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            getNestedObject(finalDataToCheck, item.fieldKey),
                            item.hasKey
                        )
                    ) {
                        return true;
                    }
                    return false;
                }
                if (
                    Object.prototype.hasOwnProperty.call(item, 'doesNotHaveKey')
                ) {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            getNestedObject(finalDataToCheck, item.fieldKey),
                            item.doesNotHaveKey
                        )
                    ) {
                        return true;
                    }
                    return false;
                }
                if (Object.prototype.hasOwnProperty.call(item, 'operator')) {
                    switch (item.operator.operand) {
                        case 'gt':
                            if (
                                getNestedObject(
                                    finalDataToCheck,
                                    item.fieldKey
                                ) > item.operator.value
                            ) {
                                return true;
                            }
                            return false;
                        case 'gte':
                            if (
                                getNestedObject(
                                    finalDataToCheck,
                                    item.fieldKey
                                ) >= item.operator.value
                            ) {
                                return true;
                            }
                            return false;
                        case 'lt':
                            if (
                                getNestedObject(
                                    finalDataToCheck,
                                    item.fieldKey
                                ) < item.operator.value
                            ) {
                                return true;
                            }
                            return false;
                        case 'lte':
                            if (
                                getNestedObject(
                                    finalDataToCheck,
                                    item.fieldKey
                                ) <= item.operator.value
                            ) {
                                return true;
                            }
                            return false;
                        default:
                            return false;
                    }
                }
            });

            if (operand === 'AND') {
                return (
                    trueFalseArray.filter((item) => item === false).length === 0
                );
            }
            if (operand === 'OR') {
                return (
                    trueFalseArray.filter((item) => item === true).length > 0
                );
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
        const responseDataObject = { ...responseData, status: responseStatus };
        let conditionMet = false;
        onDoneConditionsArray.map((cond) => {
            let executeCond = false;
            // if the subConditions use OR, return true if at least one of the conditions is true
            if (hasOwnProperty.call(cond, 'conditions')) {
                cond.conditions.map((item) => {
                    if (hasOwnProperty.call(item, 'OR')) {
                        executeCond = shouldExecute(
                            responseDataObject,
                            item.OR,
                            'OR'
                        );
                    } else if (hasOwnProperty.call(item, 'AND')) {
                        executeCond = shouldExecute(
                            responseDataObject,
                            item.AND,
                            'AND'
                        );
                    } else {
                        executeCond = shouldExecute(
                            responseDataObject,
                            cond.conditions
                        );
                    }
                });
            }
            if (executeCond) {
                if (
                    cond.stateMachineCommands &&
                    cond.stateMachineCommands.length > 0
                ) {
                    cond.stateMachineCommands.map((command) => {
                        const delay = Object.prototype.hasOwnProperty.call(
                            command,
                            'delay'
                        )
                            ? command.delay
                            : 0;
                        if (
                            Object.prototype.hasOwnProperty.call(
                                command,
                                'responseDataNestedKey'
                            )
                        ) {
                            setTimeout(function () {
                                sendStateMachineCommand(
                                    command.windowFunction,
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'commandString'
                                    )
                                        ? command.commandString
                                        : null,
                                    getNestedObject(
                                        responseDataObject,
                                        command.responseDataNestedKey
                                    ),
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'reduxActionType'
                                    )
                                        ? command.reduxActionType
                                        : null,
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'reduxActionPayload'
                                    )
                                        ? command.reduxActionPayload
                                        : null
                                );
                            }, delay);
                        } else if (
                            Object.prototype.hasOwnProperty.call(
                                command,
                                'responseData'
                            )
                        ) {
                            sendStateMachineCommand(
                                command.windowFunction,
                                Object.prototype.hasOwnProperty.call(
                                    command,
                                    'commandString'
                                )
                                    ? command.commandString
                                    : null,
                                responseData,
                                Object.prototype.hasOwnProperty.call(
                                    command,
                                    'reduxActionType'
                                )
                                    ? command.reduxActionType
                                    : null,
                                Object.prototype.hasOwnProperty.call(
                                    command,
                                    'reduxActionPayload'
                                )
                                    ? command.reduxActionPayload
                                    : null
                            );
                            conditionMet = true;
                        }
                        // Send Payload
                        else if (
                            Object.prototype.hasOwnProperty.call(
                                command,
                                'sendPayload'
                            )
                        ) {
                            setTimeout(function () {
                                sendStateMachineCommand(
                                    command.windowFunction,
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'commandString'
                                    )
                                        ? command.commandString
                                        : null,
                                    response
                                );
                            }, delay);

                            conditionMet = true;
                        } else if (
                            Object.prototype.hasOwnProperty.call(command, 'log')
                        ) {
                            setTimeout(function () {
                                console.log(
                                    getNestedObject(
                                        responseDataObject,
                                        command.responseDataNestedKey
                                    )
                                );
                            }, delay);

                            conditionMet = true;
                        } else {
                            setTimeout(function () {
                                sendStateMachineCommand(
                                    command.windowFunction,
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'commandString'
                                    )
                                        ? command.commandString
                                        : null,
                                    null,
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'reduxActionType'
                                    )
                                        ? command.reduxActionType
                                        : null,
                                    Object.prototype.hasOwnProperty.call(
                                        command,
                                        'reduxActionPayload'
                                    )
                                        ? command.reduxActionPayload
                                        : null
                                );
                            }, delay);
                        }
                    });
                }
                conditionMet = true;
            }
        });
        if (conditionMet === false) {
            defaultErrorCommandsArray.map((command) => {
                const delay = Object.prototype.hasOwnProperty.call(
                    command,
                    'delay'
                )
                    ? command.delay
                    : 0;
                if (
                    Object.prototype.hasOwnProperty.call(
                        command,
                        'responseDataNestedKey'
                    )
                ) {
                    sendStateMachineCommand(
                        command.windowFunction,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'commandString'
                        )
                            ? command.commandString
                            : null,
                        getNestedObject(
                            responseDataObject,
                            command.responseDataNestedKey
                        ),
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'reduxActionType'
                        )
                            ? command.reduxActionType
                            : null,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'reduxActionPayload'
                        )
                            ? command.reduxActionPayload
                            : null
                    );
                    conditionMet = true;
                } else if (
                    Object.prototype.hasOwnProperty.call(
                        command,
                        'responseData'
                    )
                ) {
                    sendStateMachineCommand(
                        command.windowFunction,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'commandString'
                        )
                            ? command.commandString
                            : null,
                        responseData,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'reduxActionType'
                        )
                            ? command.reduxActionType
                            : null,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'reduxActionPayload'
                        )
                            ? command.reduxActionPayload
                            : null
                    );
                    conditionMet = true;
                } else if (
                    Object.prototype.hasOwnProperty.call(command, 'log')
                ) {
                    console.log(
                        getNestedObject(
                            responseDataObject,
                            command.responseDataNestedKey
                        )
                    );

                    conditionMet = true;
                } else {
                    sendStateMachineCommand(
                        command.windowFunction,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'commandString'
                        )
                            ? command.commandString
                            : null,
                        null,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'reduxActionType'
                        )
                            ? command.reduxActionType
                            : null,
                        Object.prototype.hasOwnProperty.call(
                            command,
                            'reduxActionPayload'
                        )
                            ? command.reduxActionPayload
                            : null
                    );
                    conditionMet = true;
                }
            });
        }
    }

    let { children } = props;
    if (children !== false) {
        children = React.Children.map(children, (child) => {
            return React.cloneElement(child, {
                responseData,
                loading,
                error,
                payload,
            });
        });
    }

    return (
        <div className="state-machine-async">
            {asyncContentExists && asyncContentTemplate}
            {children}
        </div>
    );
}
