# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.1] - 2017-12-19
### Changed
- Upgraded dependencies to pickup security fixes

## [0.8.0] - 2017-12-19
### Added
- The ability to execute a qualified Lambda call with a URL like lambda://function-name:3/some/path
### Changed
- The port number in the lambda protocol used to be ignored, but now it is treated as the qualifier for the lambda invocation	
