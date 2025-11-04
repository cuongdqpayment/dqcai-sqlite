// ./test/logger.ts

import {
  LoggerConfigBuilder,
  CommonModules,
  CommonLoggerConfig,
  createModuleLogger,
} from "@dqcai/logger";

const APPModules = {
  ...CommonModules,
  TEST_ORM: "Test-ORM",
  TEST_DAO: "Test-DAO",
};

const config = new LoggerConfigBuilder()
  .setEnabled(true)
  .setDefaultLevel("trace")
  .build();

CommonLoggerConfig.updateConfiguration(config);
export { createModuleLogger, APPModules };
