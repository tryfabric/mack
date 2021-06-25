import * as md from '../src/markdown';
import * as slack from '../src/slack';
import {parseBlocks} from '../src/parser/internal';

describe('parser', () => {
  it('should parse basic markdown', () => {
    const node = md.root(
      md.paragraph(
        md.strong(md.text(' a '), md.strikethrough(md.text('b'))),
        md.text(' c'),
        md.link('https://example.com', md.emphasis(md.text('d')))
      )
    );

    const actual = parseBlocks(node);

    const expected = [slack.section('* a ~b~* c<https://example.com|_d_> ')];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse header', () => {
    const node = md.root(md.heading(1, md.strong(md.text('a'))));
    const actual = parseBlocks(node);

    const expected = [slack.header('a')];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse thematic break', () => {
    const node = md.root(md.thematicBreak());
    const actual = parseBlocks(node);

    const expected = [slack.divider()];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse lists', () => {
    const node = md.root(
      md.orderedList(
        md.listItem(md.paragraph(md.text('a'))),
        md.listItem(md.paragraph(md.text('b')))
      ),
      md.unorderedList(
        md.listItem(md.paragraph(md.text('c'))),
        md.listItem(md.paragraph(md.text('d')))
      ),
      md.unorderedList(
        md.checkedListItem(true, md.paragraph(md.text('e'))),
        md.checkedListItem(false, md.paragraph(md.text('f')))
      )
    );

    const actual = parseBlocks(node);

    const expected = [
      slack.section('1. a\n2. b'),
      slack.section('• c\n• d'),
      slack.section(
        ':ballot_box_with_check: e\n:negative_squared_cross_mark: f'
      ),
    ];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse blockquote', () => {
    const node = md.root(
      md.blockquote(
        md.paragraph(md.strong(md.text('a')), md.text(' b')),
        md.paragraph(md.text('c'))
      )
    );

    const actual = parseBlocks(node);

    const expected = [slack.section('> *a* b'), slack.section('> c')];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse images', () => {
    const node = md.root(
      md.paragraph(md.image('url', 'title')),
      md.paragraph(md.image('url2'))
    );

    const actual = parseBlocks(node);

    const expected = [
      slack.image('url', 'title', 'title'),
      slack.image('url2', 'url2'),
    ];

    expect(actual).toStrictEqual(expected);
  });
});
