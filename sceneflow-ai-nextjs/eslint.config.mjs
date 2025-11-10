import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "src/services/**",
      "src/components/**",
      "src/app/dashboard/**",
      "src/app/share/**",
      "src/app/test-**",
      "src/app/api/**",
      "src/app/components/**",
      "src/app/c/**",
      "src/app/(dashboard)/**",
      "src/app/admin/**",
      "src/app/collaborate/**",
      "src/app/setup-database/**",
      "src/lib/**",
      "src/models/**",
      "src/hooks/**",
      "src/store/**",
      "src/scripts/**",
      "src/examples/**",
      "src/workflow/**",
      "src/types/**",
      "src/service-stubs/**",
      "src/remotion/**",
      "src/middleware.ts",
      "src/app/layout.tsx",
      "src/config/**",
      "src/domain/**"
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
