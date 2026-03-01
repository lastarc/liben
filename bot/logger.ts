import {
  configure,
  getConsoleSink,
  getAnsiColorFormatter,
  jsonLinesFormatter,
  type TextFormatter,
} from "@logtape/logtape";
import { getTimeRotatingFileSink } from "@logtape/file";
import { getPrettyFormatter } from "@logtape/pretty";

const consoleFormatter: TextFormatter = (() => {
  switch (process.env.LOG_FORMAT) {
    case "json":
      return jsonLinesFormatter;
    case "pretty":
      return getPrettyFormatter({ properties: true });
    default:
      return getAnsiColorFormatter({ timestamp: "date-time-tz" });
  }
})();

await configure({
  sinks: {
    console: getConsoleSink({ formatter: consoleFormatter }),
    file: getTimeRotatingFileSink({
      directory: process.env.LOG_DIR ?? "./logs",
      interval: "weekly",
      formatter: jsonLinesFormatter,
    }),
  },
  loggers: [
    {
      category: ["bot"],
      lowestLevel: (process.env.LOG_LEVEL as any) ?? "debug",
      sinks: ["console", "file"],
    },
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console", "file"],
    },
  ],
});

export { getLogger } from "@logtape/logtape";
