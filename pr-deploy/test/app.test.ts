/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// mock decompressAndMove dependency before importing '../src/app'
jest.mock('../src/zipper', () => {
  return {
    decompressAndMove: jest
      .fn()
      .mockReturnValue(Promise.resolve('gs://serving-bucket/headSha')),
  };
});

process.env.GH_CHECK = 'test-check';
process.env.GH_OWNER = 'test-owner';
process.env.GH_REPO = 'test-repo';

import nock from 'nock';
import prDeployAppFn from '../src/app';
import {WebhookEvent} from '@octokit/webhooks';
import {CheckRunRequestedActionEvent, PullRequestEvent} from '@octokit/webhooks-types';
import {Probot, ProbotOctokit, Server} from 'probot';

const apiUrl = 'https://api.github.com';

describe('test pr deploy app', () => {
  let server: Server;

  beforeEach(() => {
    nock.disableNetConnect();
    server = new Server({
      Probot: Probot.defaults({
        githubToken: 'test',
      // Disable throttling & retrying requests for easier testing
        Octokit: ProbotOctokit.defaults({
          retry: {enabled: false},
          throttle: {enabled: false},
        }),
      }),
    });
    server.load(prDeployAppFn); 
  });

  afterEach(() => {
    expect(nock.isDone()).toBeTruthy();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('creates a check when a pull request is opened', async() => {
    const prOpenedEvent: WebhookEvent<PullRequestEvent> = {
      id: 'prId',
      name: 'pull_request.opened',
      payload: {
        pull_request: {head: {sha: 'abcde'}},
        repository: {
          owner: {name: 'test-owner'},
          name: 'test-repo',
        },
      } as PullRequestEvent
    };

    nock(apiUrl)
      .get(
        '/repos/test-owner/test-repo/commits/' +
          'abcde/check-runs?check_name=test-check'
      )
      .reply(200, null) // make sure no checks already exist
      .post('/repos/test-owner/test-repo/check-runs', body => {
        expect(body).toMatchObject({
          'head_sha': 'abcde',
          'name': 'test-check',
          'status': 'queued',
        });
        return true;
      })
      .reply(200);

    await server.probotApp.receive(prOpenedEvent);
  });

  test(
    'refreshes the check when a pull request is synchronized or reopened',
    async() => {
      nock(apiUrl)
        .get(
          '/repos/test-owner/test-repo/commits/' +
            'abcde/check-runs?check_name=test-check'
        )
        .reply(200, {data: {total_count: 1, check_runs: [{id: 12345}]}}) // make sure a check already exists
        .post('/repos/test-owner/test-repo/check-runs', body => {
          expect(body).toMatchObject({
            'head_sha': 'abcde',
            'name': 'test-check',
            'status': 'queued',
          });
          return true;
        })
        .reply(200);

      const prSynchronizedEvent: WebhookEvent<PullRequestEvent> = {
        id: 'prId',
        name: 'pull_request.synchronize',
        payload: {
          pull_request: {head: {sha: 'abcde'}},
          repository: {owner: {name: 'test-owner'}, name: 'test-repo'},
        } as PullRequestEvent
      };

      await server.probotApp.receive(prSynchronizedEvent);
    }
  );

  test('deploys the PR check when action is triggered', async() => {
    nock(apiUrl)
      .get(
        '/repos/test-owner/test-repo/commits/abcde/' +
          'check-runs?check_name=test-check'
      )
      .times(2)
      .reply(200, {
        total_count: 1,
        check_runs: [{id: 12345, head_sha: 'abcde'}],
      }) // make sure a check already exists
      .patch('/repos/test-owner/test-repo/check-runs/12345')
      .times(2)
      .reply(201);

    const requestedActionEvent: WebhookEvent<CheckRunRequestedActionEvent> = {
      id: 'prId',
      name: 'check_run.requested_action',
      payload: {
        check_run: {
          id: 1,
          name: 'test-check',
          head_sha: 'abcde',
          pull_requests: [{head: {sha: 'abcde'}}],
        },
        repository: {owner: {name: 'test-owner'}, name: 'test-repo'},
        requested_action: {},
        sender: {},
      } as CheckRunRequestedActionEvent
    };

    await server.probotApp.receive(requestedActionEvent);
  });
});
