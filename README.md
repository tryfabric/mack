# Mack: Markdown to Slack Message Blocks

> Convert Markdown and GitHub Flavoured Markdown to Slack BlockKit Blocks

[![Node.js CI](https://github.com/rr-codes/mack/actions/workflows/ci.yml/badge.svg)](https://github.com/rr-codes/mack/actions/workflows/ci.yml)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

Mack is a Markdown parser to convert any Markdown content to Slack BlockKit block objects.

Text is truncated to fit within the Slack API's limits.

### Supported Markdown Elements

- All inline elements (italics, bold, strikethrough, inline code, hyperlinks)
- Lists (ordered, unordered, checkboxes)
- All headers
- Code blocks
- Block quotes (with some limitations)
- Images
- Thematic Breaks / Dividers
- Tables (alignment not preserved)

### Not Yet Supported Markdown Elements

- Block quotes (limited functionality; does not support lists, headings, or images within the block quote)

## Installation

```
npm install @tryfabric/mack
```

## Usage

```ts
import {markdownToBlocks} from '@tryfabric/mack';

const blocks = markdownToBlocks(`
# Hello world

* bulleted item 1
* bulleted item 2

abc _123_

![cat](https://images.unsplash.com/photo-1574158622682-e40e69881006)
`);
```

The `blocks` object now results in [this](https://app.slack.com/block-kit-builder/T01BFUV9UPJ#%7B%22blocks%22:%5B%7B%22text%22:%7B%22text%22:%22Hello%20world%22,%22type%22:%22plain_text%22%7D,%22type%22:%22header%22%7D,%7B%22text%22:%7B%22text%22:%22•%20bulleted%20item%201%5Cn•%20bulleted%20item%202%22,%22type%22:%22mrkdwn%22%7D,%22type%22:%22section%22%7D,%7B%22text%22:%7B%22text%22:%22abc%20_123_%22,%22type%22:%22mrkdwn%22%7D,%22type%22:%22section%22%7D,%7B%22alt_text%22:%22cat%22,%22image_url%22:%22https://images.unsplash.com/photo-1574158622682-e40e69881006?w=640%22,%22type%22:%22image%22%7D%5D%7D) payload.

## API

`function markdownToBlocks(text: string, options: ParsingOptions): KnownBlock[]`

- `text`: the content to parse
- `options`: the options to use when parsing.

### Parsing Options

```ts
interface ParsingOptions {
  // Configure how lists are displayed
  lists?: ListOptions;
}

interface ListOptions {
  // Configure how checkbox list items are displayed. By default, they are prefixed with '* '
  checkboxPrefix?: (checked: boolean) => string;
}
```
