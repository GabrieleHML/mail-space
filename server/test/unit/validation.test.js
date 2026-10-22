const validate = require('../../src/utils/validation');
const HttpError = require('../../src/utils/httpError');

const expectBadRequest = (fn) => {
  expect(fn).toThrow(HttpError);
  try {
    fn();
  } catch (error) {
    expect(error.status).toBe(400);
  }
};

describe('validate.id', () => {
  it('accepts positive integers, also as strings (route params)', () => {
    expect(validate.id(7)).toBe(7);
    expect(validate.id('42')).toBe(42);
  });

  it.each([0, -1, 1.5, 'abc', '1; DROP TABLE emails', null, undefined])('rejects %p', (value) => {
    expectBadRequest(() => validate.id(value));
  });
});

describe('validate.idList', () => {
  it('returns the ids as numbers', () => {
    expect(validate.idList([1, '2'])).toEqual([1, 2]);
  });

  it.each([[[]], ['1,2'], [[1, 'x']], [undefined]])('rejects %p', (value) => {
    expectBadRequest(() => validate.idList(value));
  });
});

describe('validate.text', () => {
  it('returns an empty string for missing optional values', () => {
    expect(validate.text(undefined, 'q')).toBe('');
  });

  it('rejects missing or blank required values', () => {
    expectBadRequest(() => validate.text(undefined, 'body', { required: true }));
    expectBadRequest(() => validate.text('   ', 'body', { required: true }));
  });

  it('rejects non-strings and values longer than maxLength', () => {
    expectBadRequest(() => validate.text(['a'], 'q'));
    expectBadRequest(() => validate.text('abcdef', 'q', { maxLength: 5 }));
  });
});

describe('validate.labels', () => {
  it('trims, de-duplicates and accepts a single value (query string)', () => {
    expect(validate.labels([' Viaggi ', 'Viaggi', 'Lavoro'])).toEqual(['Viaggi', 'Lavoro']);
    expect(validate.labels('Viaggi')).toEqual(['Viaggi']);
    expect(validate.labels(undefined)).toEqual([]);
  });

  it('rejects empty, too long or too many labels', () => {
    expectBadRequest(() => validate.labels(['']));
    expectBadRequest(() => validate.labels(['x'.repeat(51)]));
    expectBadRequest(() => validate.labels(Array.from({ length: 51 }, (_, i) => `l${i}`)));
    expectBadRequest(() => validate.labels([42]));
  });
});
