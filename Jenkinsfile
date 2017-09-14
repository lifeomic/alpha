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
      sh 'yarn run deploy'
    }
  }
}
