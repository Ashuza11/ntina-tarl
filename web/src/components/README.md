# Components

One folder per component, following the convention from the project
scaffold:

```
components/ComponentName/
  ComponentName.jsx
  index.js          → export { default } from './ComponentName'
```

Import via the barrel: `import ComponentName from "./components/ComponentName"`.

Each new component gets a matching test file in `web/tests/components/`
(mirrors this folder, e.g. `components/RecordButton/` pairs with
`tests/components/RecordButton.test.jsx`).
