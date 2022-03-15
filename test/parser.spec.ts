import * as slack from '../src/slack';
import {parseBlocks} from '../src/parser/internal';
import {marked} from 'marked';

describe('parser', () => {
  it('should parse basic markdown', () => {
    const tokens = marked.lexer('**a ~b~** c[*d*](https://example.com)');
    const actual = parseBlocks(tokens);

    const expected = [slack.section('*a ~b~* c<https://example.com|_d_> ')];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse header', () => {
    const tokens = marked.lexer('# a');
    const actual = parseBlocks(tokens);

    const expected = [slack.header('a')];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse thematic break', () => {
    const tokens = marked.lexer('---');
    const actual = parseBlocks(tokens);

    const expected = [slack.divider()];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse lists', () => {
    const tokens = marked.lexer(
      `
    1. a
    2. b
    - c
    - d
    * e
    * f
    `
        .trim()
        .split('\n')
        .map(s => s.trim())
        .join('\n')
    );
    const actual = parseBlocks(tokens);

    const expected = [
      slack.section('1. a\n2. b'),
      slack.section('• c\n• d'),
      slack.section('• e\n• f'),
    ];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse images', () => {
    const tokens = marked.lexer('![alt](url "title")![](url)');
    const actual = parseBlocks(tokens);

    const expected = [
      slack.image('url', 'alt', 'title'),
      slack.image('url', 'url'),
    ];

    expect(actual).toStrictEqual(expected);
  });
});

it('should truncate basic markdown', () => {
  const a4000 = new Array(4000).fill('a').join('');
  const a3000 = new Array(3000).fill('a').join('');

  const tokens = marked.lexer(a4000);
  const actual = parseBlocks(tokens);

  const expected = [slack.section(a3000)];

  expect(actual.length).toStrictEqual(expected.length);
});

it('should truncate header', () => {
  const a200 = new Array(200).fill('a').join('');
  const a150 = new Array(150).fill('a').join('');

  const tokens = marked.lexer(`# ${a200}`);
  const actual = parseBlocks(tokens);

  const expected = [slack.header(a150)];

  expect(actual.length).toStrictEqual(expected.length);
});

it('should truncate image title', () => {
  const a3000 = new Array(3000).fill('a').join('');
  const a2000 = new Array(2000).fill('a').join('');

  const tokens = marked.lexer(`![${a3000}](url)`);
  const actual = parseBlocks(tokens);

  const expected = [slack.image('url', a2000)];

  expect(actual.length).toStrictEqual(expected.length);
});
