export const schema = {
    title: 'State Machine Async settings',
    type: 'object',
    required: [],

    // TODOS:
    // Finish schema
    // make the "add" button work for adding new headers/header keys to delete
    // Make arrays and arrays of objects work with the schema

    properties: {
        asyncMachineName: {
            title: 'Async Machine Name',
            type: 'string',
            default: '',
        },
        asyncMachineParams: {
            title: 'Async Machine Params',
            type: 'object',
            properties: {
                method: {
                    title: 'Axios Request Method',
                    type: 'string',
                    enum: ['GET', 'POST', 'PUT', 'DELETE'],
                    default: 'GET',
                },
                baseUrl: {
                    title: 'Base URL',
                    type: 'string',
                    default: 'https://yourURLhere.com/endpoint',
                },
                finalUrl: {
                    title: 'Final URL',
                    type: 'string',
                    default: 'https://yourURLhere.com/endpoint',
                },
                headers: {
                    title: 'Request Headers',
                    type: 'object',
                    properties: {
                        Accept: {
                            title: 'Accept',
                            type: 'string',
                            default:
                                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        },
                        Authorization: {
                            title: 'Authorization',
                            type: 'string',
                            default: '',
                        },
                    },
                },
                // subscribersArray: {
                //   title: 'Array of State Machine Subscribers',
                //   type: 'array',
                //   properties: {
                //     key: {
                //       default: 'State Machine Name Here',
                //       type: 'string'
                //     }
                //   },
                //   default: []
                // },
                maxRetries: {
                    title: 'Max Retries',
                    type: 'number',
                    default: 5,
                },
                timeout: {
                    title: 'Request Timeout (milliseconds)',
                    type: 'number',
                    default: 10000,
                },
                headerKeysToDelete: {
                    title: 'Header Keys to Delete',
                    type: 'array',
                    items: {
                        key: {
                            default: 'Your Key Here',
                            type: 'string',
                        },
                    },
                    example: ['Content-Type'],
                    default: ['Your Key Here'],
                },
            },
        },
        styles: {
            title: 'CSS Styles',
            type: 'string',
            default: '',
        },
    },
};

export const ui = {
    asyncMachineName: {
        'ui:widget': 'textarea',
    },
    styles: {
        'ui:widget': 'textarea',
    },
    baseUrl: {
        'ui:widget': 'textarea',
    },
    finalUrl: {
        'ui:widget': 'textarea',
    },
};
