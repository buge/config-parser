/**
 * Declarative configuration definition and parsing.
 * See README.md for usage.
 */

/**
 * A parser parses an unknown object from a configuration file (e.g. some JSON
 * or TOML) and turns it into something useful or throws an error if the object
 * does not look as expected.
 */
export type Parser<V> = {
  (x: unknown): V;
};

/**
 * A declarative parser configuration.
 *
 * Examples:
 * ```
 *   // Parses an object consisting of a single, required string field `foo`
 *   {foo: isString}
 *
 *   // Parses a required array of numbers (fails if undefined or empty)
 *   [isNumber]
 *
 *   // Parses an object with a required field `foo` and an optional array (can
 *   // be missing or empty) `bar`:
 *   {foo: isString, bar: optional([isNumber])}
 * ```
 */
export type ParserConfig =
  | Parser<unknown>
  | ReadonlyArray<ParserConfig>
  | ObjectParserConfig;

export type ObjectParserConfig = {[key: string]: ParserConfig};

/**
 * Computes the type of the configuration returned by a parser configuration
 * of the given type.
 *
 * For example:
 * ```
 *   // Is the same as {foo: string, bar?: ReadonlyArray<number>}
 *   type Config = ParserConfigReturnType<{
 *     foo: isString,
 *     bar: optional([isNumber])
 *   }>;
 * ```
 */
export type ParserConfigReturnType<P> = P extends Parser<infer V>
  ? V
  : P extends ReadonlyArray<infer A>
  ? ReadonlyArray<ParserConfigReturnType<A>>
  : P extends ObjectParserConfig
  ? ObjectParserConfigReturnType<P>
  : never;

export type ObjectParserConfigReturnType<C extends ObjectParserConfig> =
  // Optional fields.
  {
    readonly [K in keyof C as undefined extends ParserConfigReturnType<C[K]>
      ? K
      : never]?: ParserConfigReturnType<C[K]>;
  } &
    // Required fields.
    {
      readonly [K in keyof C as undefined extends ParserConfigReturnType<C[K]>
        ? never
        : K]: ParserConfigReturnType<C[K]>;
    };

export const isString = typeParser<string>('string');
export const isNumber = typeParser<number>('number');
export const isBoolean = typeParser<boolean>('boolean');

export const optionalString = optional(isString);
export const optionalNumber = optional(isNumber);
export const optionalBoolean = optional(isBoolean);

/**
 * Returns a parser that returns `undefined` if the value being parsed is
 * `undefined`, `null`, `[]` or `{}`. Calls the parser on the value otherwise.
 */
export function optional<C extends ParserConfig>(
  config: C
): Parser<ParserConfigReturnType<C> | undefined> {
  const childParser = parserFromConfig(config);

  return (x: unknown) => {
    if (isUndefined(x)) {
      return undefined;
    }
    return childParser(x);
  };
}

/**
 * Creates a configuration parser from the given declerative definition.
 *
 * See `ParserConfig` for some simple examples and accompanying `README.md` for
 * more comprehensive documentation.
 */
export function parserFromConfig<C extends ParserConfig>(
  config: C
): Parser<ParserConfigReturnType<C>> {
  if (typeof config === 'function') {
    return config as Parser<ParserConfigReturnType<C>>;
  }

  if (Array.isArray(config)) {
    if (config.length !== 1) {
      throw new Error(
        `Expected array literal parser config to have one array element of ` +
          `type Parser or ParserConfig but got ${config.length} elements`
      );
    }

    const elementParser = parserFromConfig(config[0]);
    return arrayParser(elementParser) as Parser<ParserConfigReturnType<C>>;
  }

  return objectParser(config as ObjectParserConfig) as Parser<
    ParserConfigReturnType<C>
  >;
}

function isUndefined<T>(x: T | undefined | null): x is T {
  if (typeof x === 'boolean' || typeof x === 'number') {
    return false;
  }
  return !x;
}

function typeParser<T>(type: string): Parser<T> {
  return (x: unknown) => {
    if (typeof x !== type) {
      throw new Error(
        `Expected value to be of type ${type} but was ${typeof x}`
      );
    }
    return x as T;
  };
}

function objectParser<C extends ObjectParserConfig>(
  config: C
): Parser<ObjectParserConfigReturnType<C>> {
  const parsers: {[key: string]: Parser<unknown>} = {};
  for (const [key, parser] of Object.entries(config)) {
    parsers[key] = parserFromConfig(parser);
  }

  return (x: unknown) => {
    if (x === null) {
      throw Error('Expected value to be an object but was null');
    }

    if (typeof x !== 'object') {
      throw Error(`Expected value to be an object but was ${typeof x}`);
    }

    const ret: {[key: string]: unknown} = {};
    for (const [key, parser] of Object.entries(parsers)) {
      ret[key] = parser((x as {[key: string]: unknown})[key]);
    }
    return ret as ObjectParserConfigReturnType<C>;
  };
}

function arrayParser<T>(parser: Parser<T>): Parser<ReadonlyArray<T>> {
  return (x: unknown) => {
    if (x === null) {
      throw Error('Expected value to be an array but was null');
    }

    if (!Array.isArray(x)) {
      throw Error(`Expected value to be an array but was ${typeof x}`);
    }

    if (x.length === 0) {
      throw Error(
        'Expected value to be an array with at least one element but got 0'
      );
    }

    return x.map(parser);
  };
}
