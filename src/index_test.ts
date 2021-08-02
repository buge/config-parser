import {
  ParserConfigReturnType,
  isNumber,
  isString,
  optional,
  parserFromConfig,
} from '.';
import {expect} from 'chai';

/**
 * Example parser that boxes the value into an array, allowing us to
 * unobtrusively test below that the parser is called when it should be.
 */
function box<T>(x: T): T[] {
  return [x];
}

describe('typeParser', () => {
  it('returns the value when the type matches', () => {
    expect(isString('foo')).to.equal('foo');
  });

  it('throws an error when the type does not match', () => {
    expect(() => isNumber('foo')).to.throw(/Expected.*number but was string/);
  });

  it('throws an error when undefined', () => {
    expect(() => isNumber(undefined)).to.throw(
      /Expected.*number but was undefined/
    );
  });
});

describe('optional', () => {
  it('calls the parser for non-falsy values', () => {
    expect(optional(box)(42)).to.deep.equal([42]);
  });

  it('returns undefined for undefined', () => {
    expect(optional(box)(undefined)).to.be.undefined;
  });

  it('returns the default value when specified for undefined', () => {
    expect(optional(box, [42])(undefined)).to.deep.equal([42]);
  });

  it('returns undefined for the empty string', () => {
    expect(optional(box)('')).to.be.undefined;
  });

  it('returns the default value when specified for the empty string', () => {
    expect(optional(box, [42])('')).to.deep.equal([42]);
  });

  it('calls the parser when the value is false', () => {
    expect(optional(box)(false)).to.deep.equal([false]);
  });

  it('calls the parser when the value is 0', () => {
    expect(optional(box)(0)).to.deep.equal([0]);
  });

  it('can take a ParserConfig', () => {
    const parser = optional({foo: box});
    expect(parser({foo: 42})).to.deep.equal({foo: [42]});
  });
});

describe('objectParser', () => {
  it('retrieves the configured values', () => {
    const parser = parserFromConfig({
      foo: box,
      bar: box,
    });

    expect(parser({foo: 1, bar: 'a'})).to.deep.equal({foo: [1], bar: ['a']});
  });

  it('calls child parsers with `undefined` for missing values', () => {
    const parser = parserFromConfig({
      foo: box,
      bar: box,
    });

    expect(parser({foo: 1})).to.deep.equal({foo: [1], bar: [undefined]});
  });

  it('silently ignores unknown values', () => {
    const parser = parserFromConfig({foo: box});
    expect(parser({foo: 1, bar: 'a'})).to.deep.equal({foo: [1]});
  });

  it('transforms nested configs', () => {
    const parser = parserFromConfig({foo: {bar: box}});
    expect(parser({foo: {bar: 2}})).to.deep.equal({foo: {bar: [2]}});
  });

  it('parses the empty object', () => {
    // Unlike arrayParser we don't consider an empty object as “missing” since
    // the child parsers can still determine if they require any of the values
    // to be present or not.
    const parser = parserFromConfig({foo: box});
    expect(parser({})).to.deep.equal({foo: [undefined]});
  });

  it('throws an error when undefined', () => {
    const parser = parserFromConfig({foo: box});
    expect(() => parser(undefined)).to.throw(
      /Expected.*object but was undefined/
    );
  });

  it('throws an error when null', () => {
    const parser = parserFromConfig({foo: box});
    expect(() => parser(null)).to.throw(/Expected.*object but was null/);
  });

  it('throws an error when called on something other than an object', () => {
    const parser = parserFromConfig({foo: box});
    expect(() => parser(42)).to.throw(/Expected.*object but was number/);
  });

  it('provides context for child errors', () => {
    const parser = parserFromConfig({foo: {bar: isString}});
    expect(() => parser({foo: {bar: 42}})).to.throw(
      /At foo.bar: Expected.*string but was number/
    );
  });
});

describe('arrayParser', () => {
  it('maps values', () => {
    const parser = parserFromConfig([box]);
    expect(parser([1, 2, 3])).to.deep.equal([[1], [2], [3]]);
  });

  it('throws an error when undefined', () => {
    const parser = parserFromConfig([box]);
    expect(() => parser(undefined)).to.throw(
      /Expected.*an array but was undefined/
    );
  });

  it('transforms nested configs', () => {
    const parser = parserFromConfig([{foo: box}]);
    expect(parser([{foo: 1}, {foo: 2}])).to.deep.equal([
      {foo: [1]},
      {foo: [2]},
    ]);
  });

  it('throws error when no element', () => {
    expect(() => parserFromConfig([])).to.throw(/got 0 elements/);
  });

  it('throws error when more than one element', () => {
    expect(() => parserFromConfig([box, box])).to.throw(/got 2 elements/);
  });

  it('throws an error when null', () => {
    const parser = parserFromConfig([box]);
    expect(() => parser(null)).to.throw(/Expected.*an array but was null/);
  });

  it('throws an error for the empty array', () => {
    const parser = parserFromConfig([box]);
    expect(() => parser([])).to.throw(
      /Expected.*an array with at least one element but got 0/
    );
  });

  it('throws an error when called on something other than an array', () => {
    const parser = parserFromConfig([box]);
    expect(() => parser({})).to.throw(/Expected.*array but was object/);
  });

  it('provides context for child errors', () => {
    const parser = parserFromConfig([isNumber]);
    expect(() => parser([1, 'a', 2])).to.throw(
      /At \[1\]: Expected.*number but was string/
    );
  });

  it('uses correct notation of object child errors', () => {
    const parser = parserFromConfig({foo: [isNumber]});
    expect(() => parser({foo: [1, 'a', 2]})).to.throw(
      /At foo\[1\]: Expected.*number but was string/
    );
  });
});

describe('ParserConfigReturnType', () => {
  it('returns the correct type for a simple parser', () => {
    const parser = parserFromConfig(isNumber);
    type Expected = number;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an optional parser', () => {
    const parser = parserFromConfig(optional(isNumber));
    type Expected = number | undefined;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an optional argument with default value', () => {
    const parser = parserFromConfig(optional(isNumber, 42));
    type Expected = number;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for a simple object parser', () => {
    const parser = parserFromConfig({foo: isNumber});
    type Expected = {foo: number};

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for a nested object parser', () => {
    const parser = parserFromConfig({foo: {bar: isNumber}});
    type Expected = {foo: {bar: number}};

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for a nested object parser', () => {
    const parser = parserFromConfig({foo: {bar: isNumber}});
    type Expected = {foo: {bar: number}};

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an optional object parser', () => {
    const parser = parserFromConfig(optional({foo: isNumber}));
    type Expected = {foo: number} | undefined;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an object parser with an optional member', () => {
    const parser = parserFromConfig({foo: optional(isNumber)});
    type Expected = {foo?: number};

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an array parser', () => {
    const parser = parserFromConfig([isNumber]);
    type Expected = ReadonlyArray<number>;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an optional array parser', () => {
    const parser = parserFromConfig(optional([isNumber]));
    type Expected = ReadonlyArray<number> | undefined;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for an array parser with optional values', () => {
    const parser = parserFromConfig([optional(isNumber)]);
    type Expected = ReadonlyArray<number | undefined>;

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });

  it('returns the correct type for a composite object and array parser', () => {
    const parser = parserFromConfig({foo: [{bar: isNumber}]});
    type Expected = {foo: ReadonlyArray<{bar: number}>};

    type Actual = ParserConfigReturnType<typeof parser>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const r1: Actual extends Expected ? true : never = true;
    const r2: Expected extends Actual ? true : never = true;
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });
});
