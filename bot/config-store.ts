import fs from "node:fs";

class ConfigStore {
  readonly fPath: string;
  config: Record<string, string>;

  constructor(fPath: string) {
    this.fPath = fPath;
    if (!fs.existsSync(this.fPath)) {
      fs.writeFileSync(this.fPath, "{}");
    }
    this.config = this.readFromFile();
  }

  readFromFile() {
    return JSON.parse(fs.readFileSync(this.fPath, "utf8"));
  }

  writeToFile() {
    fs.writeFileSync(this.fPath, JSON.stringify(this.config, null, 2));
  }

  list() {
    return Object.keys(this.config);
  }

  get(key: string) {
    return this.config[key];
  }

  getOr(key: string, defaultValue: string) {
    return this.config[key] || defaultValue;
  }

  set(key: string, value: string) {
    this.config[key] = value;
    this.writeToFile();
  }

  delete(key: string) {
    delete this.config[key];
    this.writeToFile();
  }
}

export default new ConfigStore("./config.json");
