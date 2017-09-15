#!groovy

nodejsBuilder {
  stage ('Git clone') {
    checkout scm
  }

  stage ('setup') {
    sh 'yarn install'
  }

  stage ('test') {
    sh 'yarn test'
  }

  if (env.BRANCH_NAME == "master") {
    stage('Publish') {
      // Yarn seems to fail to authenticate ???
      sh 'npm run deploy'
    }
  }
}
