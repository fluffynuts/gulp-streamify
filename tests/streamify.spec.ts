import "expect-even-more-jest";
import * as through from "through2";

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

  describe(`original function`, () => {
    it(`should provide a new function taking the same arguments, which can be streamed`, async () => {
      // Arrange
      const sandbox = await Sandbox.create();
      const txtFile = await sandbox.writeFile("foo.txt", "moo-cow");
      // Act
      await new Promise<void>(resolve => {
        gulp.src(`${ sandbox.path }/**/*.txt`)
          .pipe(streamify_original(
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
