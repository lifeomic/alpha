pipeline {
  agent { label 'ecs-builder-large-node14' }

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {
    stage('Build and unit test') {
      steps {
        initBuild()
        sh 'yarn install --pure-lockfile'
        sh 'yarn test'
        sh 'yarn coverage'
        sh 'yarn build'
      }
    }

    stage('publish prerelease') {
      when {
        beforeAgent true
        not { branch 'master' }
      }
      steps {
        publishPublicNpmPackagePreRelease()
      }
    }

    stage('publish') {
      when {
        beforeAgent true
        branch 'master'
      }
      steps {
        runSemanticReleasePublic()
      }
    }
  }
}
