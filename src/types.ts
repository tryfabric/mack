export interface ParsingOptions {
  // Configure how lists are displayed
  lists?: ListOptions;
}

export interface ListOptions {
  // Configure how checkbox list items are displayed. By default, they are prefixed with '* '
  checkboxPrefix?: (checked: boolean) => string;
}
