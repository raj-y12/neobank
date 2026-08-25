import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";

const config = [
  globalIgnores([".next/**", ".remember/**", "node_modules/**"]),
  ...nextVitals,
  ...nextTypescript,
  {
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
];

export default config;
