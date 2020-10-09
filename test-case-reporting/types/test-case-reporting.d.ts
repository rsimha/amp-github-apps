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

declare module 'test-case-reporting' {
  /**
   * Travis job types for which test results may be reported.
   */
  export type TestSuiteType = 'unit' | 'integration' | 'e2e';

  export type TestStatus = 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';

  /** A build on Travis. */
  export interface Build {
    commitSha: string;

    // Despite being a *Number, buildNumber is of type string for parity with
    // jobNumber
    buildNumber: string;
    url?: string;
    startedAt: Date;
  }

  /** A job within a Travis build. */
  export interface Job {
    build: Build;

    // Despite being a *Number, this is of type string because it includes periods.
    // For the 456th job in the 123rd build,
    // this looks like `123.456`
    jobNumber: string;
    url?: string;
    testSuiteType: TestSuiteType;
  }

  /** A single kind of test case, one `it` or `test` block. */
  export interface TestCase {
    // MD5 hash of the test case name
    id: string;
    name: string;
    createdAt: Date;
    stats?: TestCaseStats;
  }

  export interface TestCaseStats {
    sampleSize: number;
    pass: number;
    fail: number;
    skip: number;
    error: number;
  }

  /** An instance of a test being run, with results. */
  export interface TestRun {
    job: Job;
    testCase: TestCase;
    status: TestStatus;
    timestamp: Date;
    durationMs: number;
  }

  /** Fields for the size and offset of a database query. Used for pagination. */
  export interface PageInfo {
    limit: number;
    offset: number;
  }

  // Types in the DB namespace interface with the database which
  // uses snake_case instead of camelCase.
  /* eslint @typescript-eslint/camelcase: "off" */
  // Nullable fields in this namespace are nullable because they are not set when uploading.
  // They are not nullable columns in the database.
  namespace DB {
    export interface Build {
      id?: number;
      commit_sha: string;

      // Despite being a *_number, build_number is of type string for parity with
      // job_number
      build_number: string;
      started_at?: number;
    }

    export interface Job {
      id?: number;
      build_id: number;

      // Despite being a *_number, job_number is of type string because it includes periods.
      // For the 456th job in the 123rd build,
      // this looks like `123.456`
      job_number: string;
      test_suite_type: TestSuiteType;
      started_at?: number;
    }

    export interface TestCase {
      // MD5 hash of the test case name
      id: string;
      name: string;
      // Defaults to now on the database
      created_at?: number;
    }

    export interface TestRun {
      id?: number;
      job_id: number;
      test_case_id: string;
      status: TestStatus;
      timestamp?: number;
      duration_ms: number;
    }

    export interface TestRunWithJobAndBuild
      extends Build,
        Job,
        TestCase,
        TestRun {
      build_started_at: number;
    }

    export interface TestCaseStats {
      id?: number;
      test_case_id: string;
      sample_size: number;
      pass: number;
      fail: number;
      skip: number;
      error: number;
      dirty?: boolean;
    }
  }
  /* eslint @typescript-eslint/camelcase: "error" */

  // Types for the JSON reports generated by Karma
  // Supposed to match the reports exactly; that's why time
  // isn't timeMs, for example.
  namespace KarmaReporter {
    export interface TestResultReport {
      browsers: Array<BrowserResult>;
    }

    export interface BrowserResult {
      results: Array<TestResult>;
    }

    export interface TestResult {
      description: string;
      suite: Array<string>;
      success: boolean;
      skipped: boolean;
      time: number; // in milliseconds
    }
  }

  // Types for the JSON reports POSTed by Travis
  // Supposed to match the reports exactly.
  namespace Travis {
    export interface Report {
      job: Travis.Job;
      build: Travis.Build;
      results: KarmaReporter.TestResultReport;
    }
    export interface Build {
      buildNumber: string;
      commitSha: string;
      url: string;
    }
    export interface Job {
      jobNumber: string;
      testSuiteType: TestSuiteType;
      url: string;
    }
  }
}
