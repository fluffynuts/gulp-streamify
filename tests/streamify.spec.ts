import "expect-even-more-jest";
import * as through from "through2";

const sink = require("lead");

const { Sandbox } = require("filesystem-sandbox");
import * as vinyl from "vinyl";
import * as gulp from "gulp";
import { streamify_original } from "../src/streamify";

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

  describe(`discovery: example plugin code`, () => {
    it(`should complete`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await sandbox.run(async () => {
        await new Promise<void>(resolve => {
          gulp.src(`*`)
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
  });

  describe(`original function`, () => {
    it(`should provide a new function taking the same arguments, which can be streamed`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      const txtFile = await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await sandbox.run(async () => {
        await new Promise<void>(resolve => {
          gulp.src(`**/*.txt`)
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
            ).pipe(gulp.dest("_build"));
        });
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
