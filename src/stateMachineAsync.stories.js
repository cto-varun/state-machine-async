import React from 'react';
import { storiesOf } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs';
import { SandboxComponent, mock } from '../../component-loader';
import {
    staticDatasource,
    staticURL,
} from '../../component-loader/dist/knobs';
import { component } from '../dist';

mock();

storiesOf('State Machine Async', module)
    .addDecorator(withKnobs)
    .add('Basic demo', () => {
        const props = {
            url: staticURL,
            properties: {},
            datasource: staticDatasource,
        };
        const C = component;
        return <SandboxComponent component={C} {...props} />;
    });
