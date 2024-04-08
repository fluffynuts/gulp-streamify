import { Transform } from "stream";
import * as vinyl from "vinyl";

const sink = require("lead");

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
  return sink(
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

