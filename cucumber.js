export default {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/step-definitions/**/*.js'],
    import: ['features/step-definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
  },
}
