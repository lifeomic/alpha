# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2020-02-18
### Fixed
- Fixed a url parsing bug exposed by the newest url-parse module which caused
the URL passed to the lambda to be missing a leading forward slash.

## [1.3.1] - 2020-11-12
### Fixed
- Move away from module declarations due to limitations (cannot export types
in addition to a default export).

## [1.3.0] - 2020-11-11
### Added
- Exposed `AlphaInstance`, `AlphaOptions` so that consuming projects don't have
juggle different versions of `axios` (`AxiosInstance`).

## [1.2.3] - 2020-10-07
### Fixed
- Fixed issue with asynchronously invoked callbacks when using the "Lambda Handler Targets".

## [1.2.1] - 2020-07-31
### Fixed
- Upgraded `axios` to fix bug that caused default query params to get ignored

[1.3.1]: https://github.com/lifeomic/alpha/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/lifeomic/alpha/compare/v1.2.3...v1.3.0
[1.2.3]: https://github.com/lifeomic/alpha/compare/v1.2.2...v1.2.3
[1.2.1]: https://github.com/lifeomic/alpha/compare/v1.2.0...v1.2.1
