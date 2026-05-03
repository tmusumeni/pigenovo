/// <reference types="react" />
/// <reference types="react-dom" />

// Temporary type declarations to resolve missing React types
declare module 'react' {
  export = React;
  export as namespace React;
}

declare module 'react-dom' {
  export = ReactDOM;
  export as namespace ReactDOM;
}