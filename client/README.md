# Pharmacy Client (React + TypeScript + Vite)

This client powers the Pharmacy Management UI (inventory, POS, reporting). It extends the basic Vite + React + TypeScript template.

## Recent Changes

### Bulk Upload Loader
An overlay spinner now appears on the medicines table while an Excel file is uploading & server-side parsing (`UploadExcel.tsx`). This uses Ant Design `Spin` with a short artificial delay (300ms) so users see feedback even for fast uploads.

### POS Schema Alignment
The POS screen (`POS.tsx`) was updated to align with the new backend medicine schema:

- Uses `productName` instead of legacy `name`.
- Uses `_id` as the medicine identifier.
- Batch selection lists each batch with remaining quantity; disabled when `quantity <= 0`.
- Payment method (`cash | card | other`) selectable before checkout.
- Improved cart merging (adding same medicine & batch increments quantity).
- Better error messages surfaced from backend (stock/validation issues).

### Sale Item Snapshots
Backend now snapshots `productName` & `brand` inside each sale item for consistent receipt rendering even if medicine data changes later.

## Running

Development:
```powershell
cd client
npm install
npm run dev
```

Build:
```powershell
cd client
npm run build
```

## POS Checkout Flow
1. Search by product name.
2. Pick a batch (disabled if out of stock).
3. Adjust quantity, price, and optional discount (flat or percent).
4. Select payment method.
5. Checkout (receipt modal appears on success).

## Bulk Upload Template
Download template from the Bulk Upload page. Required headers (case-insensitive):
`Type, Group, Brand, Product Name, Print Name, Purchase Price, Sale Price, Purchase Date, Expiry Date, Batch No, Quantity`.

## Troubleshooting
- If sale fails with "Insufficient stock" ensure the batch still has quantity (may have been sold concurrently).
- If upload silently skips rows, verify all required columns are present and numeric fields contain valid numbers.

---
Original Vite template notes follow.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
