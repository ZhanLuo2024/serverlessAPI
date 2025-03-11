#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ServerlessAPIStack } from '../lib/cdk-stack';

const app = new cdk.App();
new ServerlessAPIStack(app, 'CdkStack');
