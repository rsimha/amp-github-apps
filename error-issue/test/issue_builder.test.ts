/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
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

import {IssueBuilder} from '../src/issue_builder';
import {ErrorReport} from '../src/types';

const FULL_ISSUE_BODY = `Details
---
**Error report:** [link](go/ampe/CL6chqbN2-bzBA)
**First seen:** Feb 25, 2020
**Frequency:** ~ 54,647/day

Stacktrace
---
\`\`\`
Error: null is not an object (evaluating 'b.acceleration.x')
    at x (https://raw.githubusercontent.com/ampproject/amphtml/2004030010070/extensions/amp-delight-player/0.1/amp-delight-player.js:421:13)
    at event (https://raw.githubusercontent.com/ampproject/amphtml/2004030010070/src/event-helper-listen.js:58:27)
\`\`\`

Notes
---
\`@xymw\` modified \`extensions/amp-delight-player/0.1/amp-delight-player.js:396-439\` in #17939 (Nov 12, 2018)
\`@rsimha\` modified \`src/event-helper-listen.js:57-59\` in #12450 (Dec 13, 2017)`;

describe('IssueBuilder', () => {
  let builder: IssueBuilder;
  const report: ErrorReport = {
    errorId: 'CL6chqbN2-bzBA',
    firstSeen: new Date('Feb 25, 2020'),
    dailyOccurrences: 54647,
    stacktrace: `Error: null is not an object (evaluating 'b.acceleration.x')
        at x (https://raw.githubusercontent.com/ampproject/amphtml/2004030010070/extensions/amp-delight-player/0.1/amp-delight-player.js:421:13)
        at event (https://raw.githubusercontent.com/ampproject/amphtml/2004030010070/src/event-helper-listen.js:58:27)`,
  };
  const blames = [
    {
      path: 'extensions/amp-delight-player/0.1/amp-delight-player.js',
      startingLine: 396,
      endingLine: 439,
      author: 'xymw',
      committedDate: new Date('2018-11-12T21:22:43.000Z'),
      changedFiles: 15,
      prNumber: 17939,
    },
    {
      path: 'src/event-helper-listen.js',
      startingLine: 57,
      endingLine: 59,
      author: 'rsimha',
      committedDate: new Date('2017-12-13T23:56:40.000Z'),
      changedFiles: 340,
      prNumber: 12450,
    },
  ];

  beforeEach(() => {
    builder = new IssueBuilder(report, blames);
  });

  describe('title', () => {
    it('contains the error message', () => {
      expect(builder.title).toEqual(
        "🚨 Error: null is not an object (evaluating 'b.acceleration.x')"
      );
    });
  });

  describe('labels', () => {
    it('contains the error report label', () => {
      expect(builder.labels).toContain('Type: Error Report');
    });
  });

  describe('bodyDetails', () => {
    it('links to the error', () => {
      expect(builder.bodyDetails).toContain(
        '**Error report:** [link](go/ampe/CL6chqbN2-bzBA'
      );
    });

    it('records the date first seen', () => {
      expect(builder.bodyDetails).toContain('**First seen:** Feb 25, 2020');
    });

    it('records the daily frequency', () => {
      expect(builder.bodyDetails).toContain('**Frequency:** ~ 54,647/day');
    });
  });

  describe('bodyStacktrace', () => {
    it('renders the indented stacktrace in markdown', () => {
      expect(builder.bodyStacktrace).toContain(
        '```\n' +
          "Error: null is not an object (evaluating 'b.acceleration.x')\n" +
          '    at x (https://raw.githubusercontent.com/ampproject/amphtml/2004030010070/extensions/amp-delight-player/0.1/amp-delight-player.js:421:13)\n' +
          '    at event (https://raw.githubusercontent.com/ampproject/amphtml/2004030010070/src/event-helper-listen.js:58:27)\n' +
          '```'
      );
    });
  });

  describe('bodyNotes', () => {
    it('includes blame info for each line of the stacktrace', () => {
      const notes = builder.bodyNotes;
      expect(notes).toContain(
        '`@xymw` modified ' +
          '`extensions/amp-delight-player/0.1/amp-delight-player.js:396-439` ' +
          'in #17939 (Nov 12, 2018)'
      );
      expect(notes).toContain(
        '`@rsimha` modified `src/event-helper-listen.js:57-59` in #12450 ' +
          '(Dec 13, 2017)'
      );
    });

    it('suggests possible assignees, if known', () => {
      builder.possibleAssignees = jest
        .fn()
        .mockReturnValue(['someone', 'someoneelse']);
      expect(builder.bodyNotes).toContain(
        '**Possible assignees:** `@someone`, `@someoneelse`'
      );
    });
  });

  describe('body', () => {
    it('generates the full issue body markdown', () => {
      expect(builder.body).toEqual(FULL_ISSUE_BODY);
    });
  });
});
