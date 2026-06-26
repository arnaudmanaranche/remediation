# Changelog

## [0.12.1](https://github.com/arnaudmanaranche/remediation/compare/remediation-v0.12.0...remediation-v0.12.1) (2026-06-26)


### Bug Fixes

* show files affected count in verbose summary ([d7d1cc3](https://github.com/arnaudmanaranche/remediation/commit/d7d1cc3f7f54b00feed52e1e34c45b07352c4b63))

## [0.12.0](https://github.com/arnaudmanaranche/remediation/compare/remediation-v0.11.0...remediation-v0.12.0) (2026-06-26)


### Features

* group default output by rule with top affected files ([1744a08](https://github.com/arnaudmanaranche/remediation/commit/1744a08b511260c248d901cec43398df2af153bd))


### Bug Fixes

* replace scrolling file counter with single-line progress bar ([57180fa](https://github.com/arnaudmanaranche/remediation/commit/57180fa93aead22527ce0661b9f0538d541da5e7))

## [0.11.0](https://github.com/arnaudmanaranche/remediation/compare/remediation-v0.10.1...remediation-v0.11.0) (2026-06-26)


### Features

* add --verbose and --output flags for v0.7 ([e63d8ca](https://github.com/arnaudmanaranche/remediation/commit/e63d8ca8dbaa5dcca9c9ad272355c88158e7a85d))
* add codemod to pipeline ([2628ba0](https://github.com/arnaudmanaranche/remediation/commit/2628ba04affe27d6e41d8ff9f850aadf3c83651d))
* add components/variant-split rule for v0.2 ([0e96ce7](https://github.com/arnaudmanaranche/remediation/commit/0e96ce769ef2a0c4401fbc9a397c13d17925f1fc))
* add config file support for v0.3 ([b627b76](https://github.com/arnaudmanaranche/remediation/commit/b627b769a87aecc0fc60d76df1d8a8e64fa2162f))
* add design system analysis pipeline ([831e8e2](https://github.com/arnaudmanaranche/remediation/commit/831e8e2ff63c9b8357086732d0037adde406efc6))
* add radius and shadows token rules for v0.5 ([fe0a720](https://github.com/arnaudmanaranche/remediation/commit/fe0a7201ed3f29722de7abd0eb6ee77209979e77))
* add scan progress indicator for v0.6 ([98e4c47](https://github.com/arnaudmanaranche/remediation/commit/98e4c4723bb9d160d494c6a8a4893dcf3b2ee4f8))
* improve terminal output for v0.4 ([8cd0d24](https://github.com/arnaudmanaranche/remediation/commit/8cd0d241d2ae8690c4a1299d573e41220ce34664))
* rebuild MVP with token-bypass and drift detection ([8564452](https://github.com/arnaudmanaranche/remediation/commit/8564452999d4fa068cf8beb09a42f661d762815b))
* remediation v0.1.2 — CLI tool for design system inconsistencies ([a62dcdf](https://github.com/arnaudmanaranche/remediation/commit/a62dcdf3a3119f4c33699ab22f93de89e149d8f0))
* replace regex scanning with AST-based style value extraction ([ef8eb76](https://github.com/arnaudmanaranche/remediation/commit/ef8eb765c9f50209cb7e9c44a84d6298181e480e))


### Bug Fixes

* add default ignore patterns for build output directories ([122e697](https://github.com/arnaudmanaranche/remediation/commit/122e6973df48ace486d9a1e0f43428d2aedc86bb))
* clarify tokens command description and filter logic ([61cacfd](https://github.com/arnaudmanaranche/remediation/commit/61cacfdfae03e4641bfeed9d0578a4c5fe6c9971))
* filter comments and imports to reduce false positives ([1f27879](https://github.com/arnaudmanaranche/remediation/commit/1f2787956c210f84fb1d5ccf7f7814dc8533be29))
* improve drift detection with Jaccard name similarity and JSX structure hash ([265d514](https://github.com/arnaudmanaranche/remediation/commit/265d5141cade5a01f6a1a467a57bb467deecdf68))
* improve DX with relative paths, safe defaults, and better scoring ([a4292ba](https://github.com/arnaudmanaranche/remediation/commit/a4292ba0871968df3271bf66512b8f6aacd89890))
* invert health score to 100=clean, 0=critical ([661cefe](https://github.com/arnaudmanaranche/remediation/commit/661cefe1d5acb635726a2aa7aa5b2f6b95a188b9))
* read CLI version from package.json instead of hardcoding it ([456afee](https://github.com/arnaudmanaranche/remediation/commit/456afeefd8b73d04c6e418e6d56d2c9980a49162))
