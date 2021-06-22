# Declarative Configuration Validation and Parsing

`config-parser` is a package for parsing and validating configurations
using declarative descriptors.

Example usage:

```typescript
import TOML from '@iarna/toml';
import {
  ParserConfigReturnType,
  isString
  optional,
  parserFromConfig,
} from 'config-parser';
import {readFileSync} from 'fs';

// Sets up the parser by describing which fields the config is expected to have
// and what their types are.
const parse = parserFromConfig({
  authKey: isString,
  server: optional(isString),
});

// Retrieves the type from the parser. For the parser function above this is
// equivalent to writing:
//
//   type Config = {
//     authKey: string,
//     server?: string,
//   };
//
type Config = ParserConfigReturnType<typeof parse>;

const toml = TOML.parse(readFileSync('my_config.toml', {encoding: 'utf-8'}));

// `parse` will validate that all required fields are present and that the
// fields have the correct types as defined above.
const config: Config = parse(toml);
```

## Installation

TODO(bunge): Write this section

## Parser Configurations

TODO(bunge): Write this section

## Custom Parser Validators

TODO(bunge): Write this section
