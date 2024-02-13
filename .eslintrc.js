module.exports = {
  extends: ['plugin:@typescript-eslint/recommended'],
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'no-use-before-define': 'off',
    'no-unused-vars': 'warn',
    // disable the original no-unused-expressions use chai-friendly
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off'
  }
};
