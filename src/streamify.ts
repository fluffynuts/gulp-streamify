import { Transform } from "stream";
import * as vinyl from "vinyl";

const lead = require("lead");

const through = require("through2");
const PluginError = require("plugin-error");
type AsyncTVoid<T> = (arg: T) => Promise<void>;
type OptionsFactory<T> = (file: vinyl.BufferFile) => T | Promise<T>;
type SyncOptionsFactory<T> = (file: vinyl.BufferFile) => T;

interface PluginError
  extends Error {
  new(pluginName: string, err: string | Error): void;

  verbosity?: string;
}

export function streamify_original<T>(
  fn: AsyncTVoid<T>,
  optionsFactory: OptionsFactory<T>,
  pluginName: string,
  operation: string
): Transform {
  return lead(
    through.obj(async function (
      this: Transform,
      file: vinyl.BufferFile,
      enc: string,
      cb: (err: PluginError | null, file: vinyl.BufferFile) => void
    ) {
      try {
        const options = await optionsFactory(file);
        await fn(options);
        cb(null, file);
      } catch (e: unknown) {
        const pluginError = new PluginError(
          pluginName,
          `${ operation } failed: ${ (e as Error).message || e }`
        );
        this.emit("error", pluginError);
        cb(pluginError, file);
      }
    })
  );
}

export function streamify_perdocs<T>(
  fn: AsyncTVoid<T>,
  optionsFactory: OptionsFactory<T>,
  pluginName: string,
  operation: string
): Transform {
  // Monkey patch Transform or create your own subclass,
  // implementing `_transform()` and optionally `_flush()`
  var transformStream = new Transform({ objectMode: true });
  /**
   * @param {Buffer|string} file
   * @param {string=} encoding - ignored if file contains a Buffer
   * @param {function(Error, object)} callback - Call this function (optionally with an
   *          error argument and data) when you are done processing the supplied chunk.
   */
  transformStream._transform = async function (file, encoding, callback) {
    const
      error = null,
      options = await optionsFactory(file),
      output = await fn(options);
    callback(error, output);
  };

  return lead(transformStream);
}

export function streamify_perdocs_sync<T>(
  fn: (arg: T) => void,
  optionsFactory: SyncOptionsFactory<T>,
  pluginName: string,
  operation: string
): Transform {
  // Monkey patch Transform or create your own subclass,
  // implementing `_transform()` and optionally `_flush()`
  var transformStream = new Transform({ objectMode: true });
  /**
   * @param {Buffer|string} file
   * @param {string=} encoding - ignored if file contains a Buffer
   * @param {function(Error, object)} callback - Call this function (optionally with an
   *          error argument and data) when you are done processing the supplied chunk.
   */
  transformStream._transform = function (file, encoding, callback) {
    const
      error = null,
      options = optionsFactory(file),
      output = fn(options);
    callback(error, output);
  };

  return lead(transformStream);
}
