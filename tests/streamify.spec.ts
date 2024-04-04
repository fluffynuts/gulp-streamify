import "expect-even-more-jest";
import * as through from "through2";

const sink = require("lead");

const { Sandbox } = require("filesystem-sandbox");
import * as vinyl from "vinyl";
import * as gulp from "gulp";
import { streamify_original, streamify_perdocs, streamify_perdocs_sync } from "../src/streamify";

describe(`streamify-async-function`, () => {
  interface FooOpts {
    target: string;
    flag?: boolean;
  }

  const captured = {} as any;

  async function foo(opts: FooOpts): Promise<void> {
    captured.opts = opts;
  }

  function foo_sync(opts: FooOpts): void {
    captured.opts = opts;
  }

  describe(`lead`, () => {
    it(`should work as per the readme example`, async () => {
      // Arrange
      const { Readable, Transform } = require("streamx");
      const sink = require("lead");
      let calls = 0;
      // Act
      const maybeThrough = new Transform({
        transform(chunk: any, cb: any) {
          calls++;
          cb(null, chunk);
        }
      });

      // Assert
      // this is the example as at https://github.com/gulpjs/lead
      Readable.from(['hello', 'world'])
        // Sink it to behave like a Writeable
        .pipe(sink(maybeThrough));
      await sleep(100); // stream should be done by then
      expect(calls)
        .toEqual(2);

      // now, what if we do the same thing, but with gulp.src
      // as the source?
      const
        sandbox = await Sandbox.create();

      await sandbox.writeFile("first.txt", "first");
      await sandbox.writeFile("second.txt", "second");
      await sandbox.writeFile("third.txt", "third");
      gulp.src(`${sandbox.path}/*`)
        .pipe(sink(maybeThrough));
      await new Promise(resolve => setTimeout(resolve, 100));
      // this _will_ fail, because the transform _wasn't_ called.
      expect(calls)
        .toEqual(5);
    });
  });

  async function sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  describe(`discovery`, () => {
    it(`should complete`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await new Promise<void>(resolve => {

        gulp.src(`${ sandbox.path }/*`)
          .pipe(
            through.obj(function (chunk, enc, cb) {
                console.log("-- going through the pipe ---");
                cb();
                resolve();
              }
            )
          );

      });
    });
  });

  describe(`original function`, () => {
    it(`should provide a new function taking the same arguments, which can be streamed`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      const txtFile = await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await new Promise<void>(resolve => {
        gulp.src(`${ sandbox.path }/**/*.txt`)
          .pipe(
            sink(
              streamify_original(
                foo,
                (f: vinyl.BufferFile) => {
                  return {
                    target: f.path,
                    flag: true
                  }
                },
                "test plugin",
                "foo"
              )
            )
          )
          .pipe(
            through.obj(function () {
                resolve();
              }
            )
          ).pipe(gulp.dest(sandbox.path));
      });
      // Assert
      expect(captured.opts.target)
        .toEqual(txtFile)
    });
  });

  describe(`modified example function`, () => {
    it(`should provide a new function taking the same arguments, which can be streamed`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      const txtFile = await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await new Promise<void>(resolve => {
        gulp.src(`${ sandbox.path }/**/*.txt`)
          .pipe(streamify_perdocs(
              foo,
              (f: vinyl.BufferFile) => {
                return {
                  target: f.path,
                  flag: true
                }
              },
              "test plugin",
              "foo"
            )
          ).pipe(
          through.obj(function () {
              resolve();
            }
          )
        );
      });
      // Assert
      expect(captured.opts.target)
        .toEqual(txtFile)
    });
  });

  describe(`modified example function (sync)`, () => {
    it(`should provide a new function taking the same arguments, which can be streamed`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      const txtFile = await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await new Promise<void>(resolve => {
        gulp.src(`${ sandbox.path }/**/*.txt`)
          .pipe(streamify_perdocs_sync(
              foo_sync,
              (f: vinyl.BufferFile) => {
                return {
                  target: f.path,
                  flag: true
                }
              },
              "test plugin",
              "foo"
            )
          ).pipe(
          through.obj(function () {
              resolve();
            }
          )
        );
      });
      // Assert
      expect(captured.opts.target)
        .toEqual(txtFile)
    });
  });

  beforeEach(() => {
    for (const k of Object.keys(captured)) {
      delete captured[k];
    }
  });
  afterEach(async () => {
    await Sandbox.destroyAll();
  });
});
