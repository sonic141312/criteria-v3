{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@engine/(.*)$": "<rootDir>/src/engine/$1"
  },
  "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts", "!src/main.ts"],
  "coverageDirectory": "coverage",
  "testEnvironment": "node",
  "moduleDirectories": ["node_modules", "src"]
}
