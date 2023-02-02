import { Machine, assign } from 'xstate';
import axios from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import {
    getNestedObject,
    updateNestedObject,
} from '../../../../src/utils/nestedObjectHelpers';
import { cache } from '@ivoyant/component-cache';

const axiosRequest = (
    method = 'GET',
    url,
    headers,
    data,
    headerKeysToDelete = [],
    loadingPdf = false
) => {
    const instance = axios.create();
    instance.defaults.headers.common = {};

    let jsonData;

    let cachedSessionInfo = cache.get('sessionInfo');

    if (typeof data === 'object') {
        jsonData = JSON.stringify(data);
    } else {
        jsonData = data;
    }

    let { token } = window[
        window.sessionStorage?.tabId
    ].COM_IVOYANT_VARS;

    // wip hardcode

    Object.keys(headers).forEach((variable) => {
        if (headers[variable] !== undefined) {
            const value = window[window.sessionStorage?.tabId]?.COM_IVOYANT_VARS[headers[variable]]
            if (value) {
                headers[variable] = value;
            }
        }
    });

    if (window[sessionStorage.tabId].COM_IVOYANT_VARS?.authBearer !== false) {
        headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
        };
    }

    if (cachedSessionInfo?.authToken !== undefined) {
        // Set the auth token here
        headers = {
            ...headers,
            'x-voyage-token': cachedSessionInfo.authToken,
        };
    }

    if (window[sessionStorage.tabId].conversationId) {
        headers = {
            ...headers,
            'X-ATT-ConversationId': window[sessionStorage.tabId].conversationId,
        };
    }

    if (method.toLowerCase() === 'delete') {
        return instance({
            // the transformRequest delete headers action is required to make, for example, the device unlock
            // API call work because it uses "accept" instead of "Content-Type". Axios default headers include "Content-Type"
            transformRequest(data, headers) {
                headerKeysToDelete.map((item) => {
                    delete headers.common[item];
                });

                return data;
            },
            method,
            url,
            headers,
        })
            .then((response) => {
                if (typeof response === 'object') {
                    if (Array.isArray(response.data)) {
                        return response.data;
                    }
                    let res = cloneDeep(response.data);
                    if (typeof res === 'string') {
                        res = { data: res };
                    }
                    res.responseStatus = response.status;
                    return res;
                }
                return response.data;
            })
            .catch((error) => {
                console.log(error);
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    // global.console.log(error.response.data);
                    // global.console.log(error.response.status);
                    // global.console.log(error.response.headers)
                    return error.response.data
                        ? error.response.data
                        : error.response;
                }
                if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    // global.console.log(error.request);
                    return error.request;
                }
                // Something happened in setting up the request that triggered an Error
                // global.console.log('Error', error.message);
                return error;
            });
    }

    return instance({
        // the transformRequest delete headers action is required to make, for example, the device unlock
        // API call work because it uses "accept" instead of "Content-Type". Axios default headers include "Content-Type"
        transformRequest(data, headers) {
            headerKeysToDelete.map((item) => {
                delete headers.common[item];
            });

            return data;
        },
        method,
        url,
        headers,
        data: jsonData,
    })
        .then((response) => {
            // console.log(response);
            // wip - need better type rules
            if (typeof response === 'object') {
                if (loadingPdf) {
                    response.responseStatus = response?.status;
                    return response;
                }
                // data must be an object
                if (typeof response.data === 'string') {
                    if (!loadingPdf) {
                        response.data = {};
                    }
                }
                if (Array.isArray(response.data)) {
                    response.data.responseStatus = response.status;
                    return response.data;
                }
                const res = cloneDeep(response.data);
                res.responseStatus = response.status;
                return res;
            }
            return response.data;
        })
        .catch((error) => {
            console.log(error);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const errorResponse = cloneDeep(error.response);
                if (typeof errorResponse === 'object') {
                    // data must be an object
                    if (typeof errorResponse.data === 'string') {
                        return {
                            error: errorResponse.data,
                            responseStatus: errorResponse.status,
                        };
                    }

                    errorResponse.data.responseStatus = errorResponse.status;
                }
                return errorResponse.data;
            }
            if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                return error.request;
            }
            // Something happened in setting up the request that triggered an Error
            return error;
        });
};

export const asyncMachine = Machine({
    id: 'async-machine',
    initial: 'idle',
    context: {
        loading: false,
        requestFinished: false,
        pdfLoaded: false,
        pdfFileName: 'document.pdf',
        method: 'get',
        // store the original URL in this variable so when we modify the URL and then reset the request, we can reference the original URL
        baseUrl: '',
        finalUrl: '',
        headers: {},
        headerKeysToDelete: [],
        requestData: undefined,
        response: {},
        responseStatus: '',
        responseData: {},
        payload: {},
        error: undefined,
        numberOfRetries: 0,
        maxRetries: 5,
        machineName: 'async-machine',
        subscribersArray: [],
    },
    states: {
        idle: {
            on: {
                FETCH: {
                    target: 'loading',
                    actions: [
                        assign({ loading: true }),
                        (context, event) => {
                            if (context.subscribersArray !== []) {
                                context.subscribersArray.map((subscriber) => {
                                    window[window.sessionStorage?.tabId][
                                        `send${subscriber}`
                                    ]('SEND.PAYLOAD', {
                                        value: {
                                            [context.machineName]: context,
                                        },
                                    });
                                });
                            }
                        },
                    ],
                },
                'FETCH.PDF': {
                    target: 'loadingPDF',
                    actions: [
                        assign({ loading: true }),
                        (context, event) => {
                            if (context.subscribersArray !== []) {
                                context.subscribersArray.map((subscriber) => {
                                    window[window.sessionStorage?.tabId][
                                        `send${subscriber}`
                                    ]('SEND.PAYLOAD', {
                                        value: {
                                            [context.machineName]: context,
                                        },
                                    });
                                });
                            }
                        },
                    ],
                },
            },
        },
        loading: {
            invoke: {
                id: 'asyncRequest',
                src: (context, event) =>
                    axiosRequest(
                        context.method,
                        context.finalUrl !== ''
                            ? context.finalUrl
                            : context.baseUrl,
                        context.headers,
                        context.requestData,
                        context.headerKeysToDelete
                    ),
                onDone: {
                    target: 'success',
                    actions: [
                        assign({
                            response: (context, event) => event,
                            responseStatus: (context, event) => {
                                return event.data && event.data.status
                                    ? event.data.status
                                    : undefined;
                            },
                            responseData: (context, event) => event.data,
                            loading: false,
                            requestFinished: true,
                        }),
                        (context, event) => {
                            if (context.subscribersArray !== []) {
                                context.subscribersArray.map((subscriber) => {
                                    window[window.sessionStorage?.tabId][
                                        `send${subscriber}`
                                    ]('SEND.PAYLOAD', {
                                        value: {
                                            [context.machineName]: context,
                                        },
                                    });
                                });
                            }
                        },
                    ],
                },
                // TODO: even when there is an error with Vlad's device unlock API, it will still recognize the axios call as being done and append error data to responseData.
                onError: {
                    target: 'failure',
                    actions: [
                        assign({
                            error: (context, event) => event,
                            loading: false,
                            requestFinished: true,
                        }),
                        (context, event) => {
                            if (context.subscribersArray !== []) {
                                context.subscribersArray.map((subscriber) => {
                                    window[window.sessionStorage?.tabId][
                                        `send${subscriber}`
                                    ]('SEND.PAYLOAD', {
                                        value: {
                                            [context.machineName]: context,
                                        },
                                    });
                                });
                            }
                        },
                    ],
                },
            },
        },
        loadingPDF: {
            invoke: {
                id: 'asyncRequest',
                src: (context, event) =>
                    axiosRequest(
                        context.method,
                        context.finalUrl !== ''
                            ? context.finalUrl
                            : context.baseUrl,
                        context.headers,
                        context.data,
                        context.headerKeysToDelete,
                        true
                    ),
                onDone: {
                    target: 'success',
                    actions: [
                        assign({
                            response: (context, event) => event,
                            responseStatus: (context, event) =>
                                event.data && event.data.status
                                    ? event.data.status
                                    : undefined,
                            responseData: (context, event) => event.data,
                            loading: false,
                            requestFinished: true,
                            pdfLoaded: true,
                        }),
                        (context, event) => {
                            if (context.subscribersArray !== []) {
                                context.subscribersArray.map((subscriber) => {
                                    window[window.sessionStorage?.tabId][
                                        `send${subscriber}`
                                    ]('SEND.PAYLOAD', {
                                        value: {
                                            [context.machineName]: context,
                                        },
                                    });
                                });
                            }
                        },
                    ],
                },
                // TODO: even when there is an error with Vlad's device unlock API, it will still recognize the axios call as being done and append error data to responseData.
                onError: {
                    target: 'failure',
                    actions: [
                        assign({
                            error: (context, event) => event,
                            loading: false,
                            requestFinished: true,
                        }),
                        (context, event) => {
                            if (context.subscribersArray !== []) {
                                context.subscribersArray.map((subscriber) => {
                                    window[window.sessionStorage?.tabId][
                                        `send${subscriber}`
                                    ]('SEND.PAYLOAD', {
                                        value: {
                                            [context.machineName]: context,
                                        },
                                    });
                                });
                            }
                        },
                    ],
                },
            },
        },
        success: {},
        failure: {
            on: {
                RETRY: [
                    {
                        target: 'loading',
                        cond: (context) =>
                            context.numberOfRetries < context.maxRetries,
                    },
                ],
            },
        },
        maxRetries: {
            actions: assign({ data: 'Max number of retries reached' }),
        },
    },
    on: {
        'SEND.PAYLOAD': {
            actions: assign({
                payload: (ctx, e) => e,
            }),
        },
        // Example usage: window[window.sessionStorage?.tabId].sendtestAsyncMachine("SET.REQUEST.DATA", { value: { new: "asdf" }})
        'SET.REQUEST.DATA': {
            actions: [
                assign({
                    requestData: (ctx, e) => e.value,
                }),
                (context, event) => {
                    if (context.subscribersArray !== []) {
                        context.subscribersArray.map((subscriber) => {
                            window[window.sessionStorage?.tabId][
                                `send${subscriber}`
                            ]('SEND.PAYLOAD', context);
                        });
                    }
                },
            ],
        },
        // Example usage: window[window.sessionStorage?.tabId].sendtestAsyncMachine("APPEND.REQUEST.DATA", { value: { new: "asdf" }})
        'APPEND.REQUEST.DATA': {
            actions: [
                assign({
                    requestData: (ctx, e) =>
                        Object.assign(ctx.requestData, e.value),
                }),
                (context, event) => {
                    if (context.subscribersArray !== []) {
                        context.subscribersArray.map((subscriber) => {
                            window[window.sessionStorage?.tabId][
                                `send${subscriber}`
                            ]('SEND.PAYLOAD', context);
                        });
                    }
                },
            ],
        },
        // Example usage: window[window.sessionStorage?.tabId].sendtestAsyncMachine("SET.REQUEST.DATA.KEY", { key: "resourceKey", value: "123456789112345"})
        'SET.REQUEST.DATA.KEY': {
            actions: [
                assign({
                    requestData: (ctx, e) => {
                        if (
                            getNestedObject(ctx.requestData, e.key) !==
                            undefined
                        ) {
                            const requestDataCopy = cloneDeep(ctx.requestData);
                            updateNestedObject(requestDataCopy, e.key, e.value);
                            return requestDataCopy;
                        }
                        if (ctx.requestData !== undefined) {
                            return { ...ctx.requestData, [e.key]: e.value };
                        }
                        return { ...ctx.requestData, [e.key]: e.value };
                    },
                }),
                (context, event) => {
                    if (context.subscribersArray !== []) {
                        context.subscribersArray.map((subscriber) => {
                            window[window.sessionStorage?.tabId][
                                `send${subscriber}`
                            ]('SEND.PAYLOAD', context);
                        });
                    }
                },
            ],
        },
        // Example usage: window[window.sessionStorage?.tabId].sendtestAsyncMachine("SET.URL", { value: 'http://localhost:5001/api'})
        'SET.URL': {
            actions: assign({
                finalUrl: (ctx, e) => e.value,
            }),
        },
        'APPEND.URL': {
            actions: assign({
                finalUrl: (ctx, e) => ctx.finalUrl + e.value,
            }),
        },
        RESET: {
            target: 'idle',
            actions: [
                assign({
                    loading: false,
                    requestFinished: false,
                    response: {},
                    responseData: {},
                    error: undefined,
                    numberOfRetries: 0,
                    finalUrl: (ctx) => ctx.baseUrl,
                }),
                (context, event) => {
                    if (context.subscribersArray !== []) {
                        context.subscribersArray.map((subscriber) => {
                            window[window.sessionStorage?.tabId][
                                `send${subscriber}`
                            ]('SEND.PAYLOAD', {
                                id: context.machineName,
                                payload: context,
                            });
                        });
                    }
                },
            ],
        },
        REFETCH: {
            target: 'loading',
            actions: [
                assign({ loading: true }),
                (context, event) => {
                    if (context.subscribersArray !== []) {
                        context.subscribersArray.map((subscriber) => {
                            window[window.sessionStorage?.tabId][
                                `send${subscriber}`
                            ]('SEND.PAYLOAD', {
                                value: {
                                    [context.machineName]: context,
                                },
                            });
                        });
                    }
                },
            ],
        },
        'SET.PDF.NAME': {
            actions: [
                assign({
                    pdfFileName: (context, event) => event.value,
                }),
                (context, event) => {
                    if (context.subscribersArray !== []) {
                        context.subscribersArray.map((subscriber) => {
                            window[window.sessionStorage?.tabId][
                                `send${subscriber}`
                            ]('SEND.PAYLOAD', {
                                id: context.machineName,
                                payload: context,
                            });
                        });
                    }
                },
            ],
        },
    },
    // The below code doesn't work for some reason, it's probably an issue with XState. Having the action implementation defined separately would be great
    // instead of having to reuse the same code.
    // actions: {
    //   sendSubscribers: (context, event) => {
    //     if (context.subscribersArray !== []) {
    //       context.subscribersArray.map(subscriber => {
    //         window[window.sessionStorage?.tabId]["send"+subscriber]("SEND.PAYLOAD", context);
    //       })
    //     }
    //   }
    // }
});
